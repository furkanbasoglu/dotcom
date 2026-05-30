/**
 * POST /api/compile
 *
 * LaTeX derleme isteklerini kabul eder. Sıralama:
 *   1) Clerk JWT doğrula (Authorization: Bearer <token>)
 *   2) Tier'ı D1 users.tier'dan oku (yoksa free fallback)
 *   3) Rate limit (KV, kullanıcı + tier bazlı)
 *   4) Body validation (entry, files, engine, size limits — binary dosyalar da sayılır)
 *   5) Compile servisine forward (Cloudflare Tunnel → Pi VM)
 *
 * Tunnel + VM API henüz hazır değilken bu endpoint **503 Service Unavailable**
 * döner ve frontend kullanıcıya "servis hazırlanıyor" mesajı gösterir.
 *
 * Cloudflare Pages env (Settings → Environment Variables):
 *   - CLERK_SECRET_KEY              Clerk backend secret
 *   - CLERK_PUBLISHABLE_KEY         Clerk publishable key (also accepted: PUBLIC_CLERK_PUBLISHABLE_KEY)
 *   - COMPILE_TUNNEL_URL            Tunnel endpoint for the compile backend
 *   - COMPILE_SERVICE_TOKEN_ID      Access service token client id
 *   - COMPILE_SERVICE_TOKEN_SECRET  Access service token secret
 *
 * Cloudflare Pages bindings:
 *   - RATE_LIMIT (KV)               counters for per-user rate limiting
 *   - DB (D1 → latex-db)            users.tier lookup (optional; eksikse free fallback)
 *
 * Tier limits:
 *   - Free:      single project, 10 MB, 30s timeout, low priority
 *   - Pro:       single project unlimited compiles, 100 MB, 120s
 *   - Unlimited: unlimited projects, 500 MB, 300s
 */

interface Env {
  CLERK_SECRET_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
  PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  COMPILE_TUNNEL_URL?: string;
  COMPILE_SERVICE_TOKEN_ID?: string;
  COMPILE_SERVICE_TOKEN_SECRET?: string;
  RATE_LIMIT: KVNamespace;
  DB?: D1Database;
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

interface D1Result<T = unknown> { results?: T[]; success: boolean; }
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

type BinaryFile = { encoding: 'base64'; data: string };
type CompileFile = string | BinaryFile;

interface CompileBody {
  files?: Record<string, CompileFile>;
  entry?: string;
  engine?: 'pdflatex' | 'xelatex' | 'lualatex';
}

// Tier limitleri
const TIERS = {
  free:      { rate: 20,  windowSec: 3600, maxBytes:  10 * 1024 * 1024, timeoutMs:  30_000 },
  pro:       { rate: 200, windowSec: 3600, maxBytes: 100 * 1024 * 1024, timeoutMs: 120_000 },
  unlimited: { rate: 1000, windowSec: 3600, maxBytes: 500 * 1024 * 1024, timeoutMs: 300_000 },
} as const;
type TierName = keyof typeof TIERS;

const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

function json(body: object, status = 200, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...jsonHeaders, ...(extra || {}) },
  });
}

// ──────────────────────────────────────────────────────────────────
// Clerk JWT verify
//
// Clerk session JWT'lerini doğrulamak için Frontend API'sinin JWKS endpoint'inden
// public key'leri çekip imzayı doğrularız. Cache'leme yapmıyoruz (Cloudflare zaten
// caching yapıyor); production'da KV cache ile hızlandırılabilir.
//
// Publishable key formatı: pk_test_<base64-encoded-frontend-api-url>
// Decode edince frontend-api host'unu buluyoruz, /.well-known/jwks.json çekiyoruz.
// ──────────────────────────────────────────────────────────────────
function decodeClerkFrontendApi(publishableKey: string): string | null {
  // pk_test_xxx ya da pk_live_xxx
  const parts = publishableKey.split('_');
  if (parts.length < 3) return null;
  const b64 = parts.slice(2).join('_');
  try {
    // Base64 decode (Node yok, atob var)
    const decoded = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
    // Sondaki "$" ayraç olabilir
    return decoded.replace(/\$$/, '');
  } catch {
    return null;
  }
}

interface JwtPayload {
  sub?: string;      // user id (Clerk: user_xxx)
  sid?: string;      // session id
  iss?: string;      // issuer
  exp?: number;
  iat?: number;
  azp?: string;      // authorized party (origin)
}

/**
 * Minimum JWT verify: header + payload decode + exp check + signature verify
 * Web Crypto API (Cloudflare Workers runtime'da var) ile RSA-SHA256.
 */
async function verifyClerkJwt(token: string, frontendApi: string): Promise<JwtPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;

  let header: any, payload: JwtPayload;
  try {
    header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
    payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }

  if (!header.kid || header.alg !== 'RS256') return null;
  if (!payload.exp || payload.exp * 1000 < Date.now()) return null;

  // Issuer kontrolü (frontend api ile eşleşmeli)
  const expectedIss = `https://${frontendApi}`;
  if (payload.iss && payload.iss !== expectedIss) return null;

  // JWKS çek
  let jwks: any;
  try {
    const res = await fetch(`https://${frontendApi}/.well-known/jwks.json`);
    if (!res.ok) return null;
    jwks = await res.json();
  } catch {
    return null;
  }

  const key = jwks.keys?.find((k: any) => k.kid === header.kid);
  if (!key) return null;

  // RSA public key import
  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      'jwk',
      { kty: key.kty, n: key.n, e: key.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
  } catch {
    return null;
  }

  // İmzayı doğrula
  const sig = b64urlToBytes(sigB64);
  const signed = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  let ok = false;
  try {
    ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, sig, signed);
  } catch {
    return null;
  }
  return ok ? payload : null;
}

function b64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binStr = atob(padded);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
  return bytes;
}

// ──────────────────────────────────────────────────────────────────
// Rate limit (kullanıcı id bazlı)
// ──────────────────────────────────────────────────────────────────
async function checkRateLimit(kv: KVNamespace, userId: string, tier: TierName): Promise<{ ok: boolean; remaining: number }> {
  const t = TIERS[tier];
  const bucket = Math.floor(Date.now() / 1000 / t.windowSec);
  const key = `rl:cmp:${userId}:${bucket}`;
  const raw = await kv.get(key);
  const count = parseInt(raw || '0', 10);
  if (count >= t.rate) return { ok: false, remaining: 0 };
  await kv.put(key, String(count + 1), { expirationTtl: t.windowSec + 60 });
  return { ok: true, remaining: t.rate - count - 1 };
}

// ──────────────────────────────────────────────────────────────────
// Tier resolver — D1'den oku. Kullanıcı D1'de yoksa veya hata varsa
// güvenli varsayılan olarak 'free' döner (derlemeyi tier hatasıyla kırmıyoruz).
// Kullanıcı kaydı projects API ilk çağrıldığında lazy upsert ile oluşur (_auth.ts).
// ──────────────────────────────────────────────────────────────────
async function resolveTier(db: D1Database | undefined, userId: string): Promise<TierName> {
  if (!db) return 'free';
  try {
    const row = await db.prepare('SELECT tier FROM users WHERE id = ?1')
      .bind(userId)
      .first<{ tier: string }>();
    if (row?.tier === 'pro' || row?.tier === 'unlimited') return row.tier;
  } catch {
    // D1 hatası — sessizce 'free'e düş
  }
  return 'free';
}

// Toplam byte boyutu: metin dosyaları string uzunluğu, binary dosyalar base64 decode boyutu
function calcTotalBytes(files: Record<string, CompileFile>): number {
  let total = 0;
  for (const v of Object.values(files)) {
    if (typeof v === 'string') {
      total += v.length;
    } else if (v && typeof v === 'object' && (v as BinaryFile).encoding === 'base64') {
      const b64len = ((v as BinaryFile).data || '').length;
      total += Math.floor(b64len * 0.75); // base64 → ham bayt
    }
  }
  return total;
}

// ──────────────────────────────────────────────────────────────────
// Main handler
// ──────────────────────────────────────────────────────────────────
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // ── Env sanity
  if (!env.RATE_LIMIT) {
    return json({ error: 'Sunucu yapılandırılmamış (KV).' }, 500);
  }
  if (!env.CLERK_PUBLISHABLE_KEY && !env.PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return json({ error: 'Sunucu yapılandırılmamış (Clerk).' }, 500);
  }

  // ── Auth
  const authz = request.headers.get('Authorization') || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
  if (!token) {
    return json({ error: 'Yetkisiz: giriş gerekli.' }, 401);
  }
  // Hem PUBLIC_ prefix'li hem prefix'siz versiyonu destekle
  const publishableKey = env.CLERK_PUBLISHABLE_KEY || env.PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return json({ error: 'Sunucu yapılandırılmamış (Clerk).' }, 500);
  }
  const frontendApi = decodeClerkFrontendApi(publishableKey);
  if (!frontendApi) {
    return json({ error: 'Clerk publishable key geçersiz.' }, 500);
  }
  const claims = await verifyClerkJwt(token, frontendApi);
  if (!claims || !claims.sub) {
    return json({ error: 'Yetkisiz: token geçersiz.' }, 401);
  }
  const userId = claims.sub;

  // ── Tier + rate limit
  const tier = await resolveTier(env.DB, userId);
  const tierCfg = TIERS[tier];
  const rl = await checkRateLimit(env.RATE_LIMIT, userId, tier);
  if (!rl.ok) {
    return json(
      { error: 'Kota doldu. Saatlik limit aşıldı.', tier },
      429,
      { 'X-RateLimit-Remaining': '0' },
    );
  }

  // ── Body parse + validate
  let body: CompileBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Geçersiz JSON.' }, 400);
  }

  if (!body.files || typeof body.files !== 'object') {
    return json({ error: 'files alanı zorunlu.' }, 400);
  }
  const entry = body.entry || 'main.tex';
  if (!body.files[entry]) {
    return json({ error: `Entry dosyası bulunamadı: ${entry}` }, 400);
  }
  const totalBytes = calcTotalBytes(body.files);
  if (totalBytes > tierCfg.maxBytes) {
    return json({ error: `Toplam boyut tier sınırını aşıyor (${tier}: ${tierCfg.maxBytes} byte).`, tier }, 413);
  }

  const engine = body.engine || 'pdflatex';
  if (!['pdflatex', 'xelatex', 'lualatex'].includes(engine)) {
    return json({ error: 'Geçersiz engine.' }, 400);
  }

  // ── Compile servisi (Tunnel) henüz hazır mı?
  if (!env.COMPILE_TUNNEL_URL || !env.COMPILE_SERVICE_TOKEN_ID || !env.COMPILE_SERVICE_TOKEN_SECRET) {
    return json(
      {
        error: 'Service Unavailable',
        detail: 'Derleme motoru henüz bu sayfaya bağlanmadı. Birkaç gün içinde aktif olacak.',
        tier,
        remaining: rl.remaining,
      },
      503,
      { 'Retry-After': '3600' },
    );
  }

  // ── Tunnel'a forward (gelecek aşama)
  try {
    const upstream = await fetch(`${env.COMPILE_TUNNEL_URL}/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Access-Client-Id': env.COMPILE_SERVICE_TOKEN_ID,
        'CF-Access-Client-Secret': env.COMPILE_SERVICE_TOKEN_SECRET,
        'X-User-Id': userId,
        'X-Tier': tier,
      },
      body: JSON.stringify({
        entry,
        engine,
        files: body.files,
        timeoutMs: tierCfg.timeoutMs,
      }),
      signal: AbortSignal.timeout(tierCfg.timeoutMs + 5000),
    });

    if (upstream.status === 504 || upstream.status === 502) {
      return json({ error: 'Derleme zaman aşımına uğradı.', tier }, 504);
    }
    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      return json({ error: 'Derleme hatası.', log: errText.slice(0, 5000), tier }, upstream.status);
    }

    // Başarılı → PDF'i passthrough et
    const ct = upstream.headers.get('Content-Type') || 'application/pdf';
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'X-Tier': tier,
        'X-RateLimit-Remaining': String(rl.remaining),
      },
    });
  } catch (err: any) {
    return json({ error: 'Tunnel\'a ulaşılamadı.', detail: err?.message || '' }, 502);
  }
};

// CORS preflight (same-origin için gereksiz ama defansif)
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
