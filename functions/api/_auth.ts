/**
 * functions/api/_auth.ts
 *
 * Pages Functions için ortak kimlik + tier modülü.
 *  - Clerk session JWT doğrulama (compile.ts ile AYNI, kanıtlanmış mantık)
 *  - Yol B (lazy upsert): kullanıcı ilk korumalı istekte D1'e yazılır
 *  - Tier D1'den okunur
 *
 * "_" önekli olduğu için bu dosya bir ROUTE DEĞİLDİR; yalnızca import edilir.
 *
 * Gerekli binding'ler (Pages → Settings → Bindings):
 *   - DB  (D1 database → latex-db)
 * Gerekli env:
 *   - CLERK_PUBLISHABLE_KEY  (veya PUBLIC_CLERK_PUBLISHABLE_KEY)
 */

export type TierName = 'free' | 'pro' | 'unlimited';

// ── Minimal D1 tipleri (global @cloudflare/workers-types'a bağımlı kalmamak için)
interface D1Result<T = unknown> { results?: T[]; success: boolean; }
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
}
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface AuthEnv {
  CLERK_PUBLISHABLE_KEY?: string;
  PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  DB: D1Database;
}

export const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

export function json(body: object, status = 200, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...jsonHeaders, ...(extra || {}) },
  });
}

// ──────────────────────────────────────────────────────────────────
// Clerk JWT verify (compile.ts'ten birebir)
// ──────────────────────────────────────────────────────────────────
interface JwtPayload {
  sub?: string;
  email?: string;
  iss?: string;
  exp?: number;
}

function decodeClerkFrontendApi(publishableKey: string): string | null {
  const parts = publishableKey.split('_');
  if (parts.length < 3) return null;
  const b64 = parts.slice(2).join('_');
  try {
    const decoded = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
    return decoded.replace(/\$$/, '');
  } catch {
    return null;
  }
}

function b64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binStr = atob(padded);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
  return bytes;
}

async function verifyClerkJwt(token: string, frontendApi: string): Promise<JwtPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;

  let header: any;
  let payload: JwtPayload;
  try {
    header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
    payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }

  if (!header.kid || header.alg !== 'RS256') return null;
  if (!payload.exp || payload.exp * 1000 < Date.now()) return null;

  const expectedIss = `https://${frontendApi}`;
  if (payload.iss && payload.iss !== expectedIss) return null;

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

// ──────────────────────────────────────────────────────────────────
// authenticate(): JWT doğrula → D1 upsert (Yol B) → tier döndür
// ──────────────────────────────────────────────────────────────────
export interface AuthResult {
  userId: string;
  email: string | null;
  tier: TierName;
}

export async function authenticate(
  request: Request,
  env: AuthEnv,
): Promise<{ auth: AuthResult } | { error: Response }> {
  if (!env.DB) return { error: json({ error: 'Sunucu yapılandırılmamış (DB binding yok).' }, 500) };

  const authz = request.headers.get('Authorization') || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
  if (!token) return { error: json({ error: 'Yetkisiz: giriş gerekli.' }, 401) };

  const publishableKey = env.CLERK_PUBLISHABLE_KEY || env.PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) return { error: json({ error: 'Sunucu yapılandırılmamış (Clerk).' }, 500) };

  const frontendApi = decodeClerkFrontendApi(publishableKey);
  if (!frontendApi) return { error: json({ error: 'Clerk publishable key geçersiz.' }, 500) };

  const claims = await verifyClerkJwt(token, frontendApi);
  if (!claims || !claims.sub) return { error: json({ error: 'Yetkisiz: token geçersiz.' }, 401) };

  const userId = claims.sub;
  const email = claims.email || null;
  const now = Date.now();

  try {
    // Lazy upsert: yoksa oluştur, varsa e-posta/zaman güncelle
    await env.DB.prepare(
      `INSERT INTO users (id, email, tier, created_at, updated_at)
       VALUES (?1, ?2, 'free', ?3, ?3)
       ON CONFLICT(id) DO UPDATE SET email = COALESCE(?2, users.email), updated_at = ?3;`,
    ).bind(userId, email, now).run();

    const row = await env.DB.prepare(`SELECT tier FROM users WHERE id = ?1;`)
      .bind(userId)
      .first<{ tier: string }>();

    let tier: TierName = 'free';
    if (row && (row.tier === 'pro' || row.tier === 'unlimited')) tier = row.tier;

    return { auth: { userId, email, tier } };
  } catch (e: any) {
    return { error: json({ error: 'Veritabanı hatası (auth).', detail: String(e?.message || e) }, 500) };
  }
}
