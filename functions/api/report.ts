/**
 * POST /api/report
 *
 * Bildirim / bug-report formundan gelen veriyi alır, doğrular, rate-limit'ler
 * ve furkanaselint@gmail.com adresine Resend API üzerinden e-posta gönderir.
 *
 * Gerekli ortam değişkenleri (Cloudflare Pages → Settings → Environment):
 *   - RESEND_API_KEY       Resend API key
 *   - TURNSTILE_SECRET_KEY Cloudflare Turnstile secret (CAPTCHA doğrulama)
 *   - MAIL_FROM            Gönderen adres (örn. "Bildirim <bildirim@furkanbasoglu.com>")
 *                          Resend'de domain doğrulanmış olmalı.
 *                          Test için "onboarding@resend.dev" da kullanılabilir.
 *   - MAIL_TO              Hedef adres (örn. "furkanaselint@gmail.com")
 *
 * Gerekli KV binding (Cloudflare Pages → Settings → Functions → KV namespace bindings):
 *   - RATE_LIMIT           Bir KV namespace, "RATE_LIMIT" adıyla bağlı
 *
 * NOT: PUBLIC_TURNSTILE_SITE_KEY ayrıca env'a eklenmeli (Astro build-time'da kullanır).
 */

interface Env {
  RESEND_API_KEY: string;
  TURNSTILE_SECRET_KEY?: string;
  MAIL_FROM: string;
  MAIL_TO: string;
  RATE_LIMIT: KVNamespace;
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const RATE_LIMIT_WINDOW = 60 * 60;        // 1 saat (saniye)
const RATE_LIMIT_MAX = 10;                // saat başına izin verilen istek

// CORS — same-origin için strict, gerekirse açılır
const corsHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
};

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function basicEmailValid(email: string): boolean {
  // RFC 5322 değil, pratik kontrol
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200;
}

/**
 * Cloudflare Turnstile token doğrulama. Eğer secret tanımlı değilse atlanır
 * (development modu). Production'da TURNSTILE_SECRET_KEY MUTLAKA ayarlanmalı.
 */
async function verifyTurnstile(token: string | null, secret: string, ip: string): Promise<boolean> {
  if (!token) return false;
  try {
    const form = new FormData();
    form.append('secret', secret);
    form.append('response', token);
    if (ip) form.append('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const data: any = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}

/**
 * Hem IP hem email bazlı rate limit. Saat içinde 10 istek limiti.
 * KV ile saatlik bucket — basit ve etkili.
 */
async function checkRateLimit(kv: KVNamespace, ip: string, email: string): Promise<{ ok: boolean; reason?: string }> {
  const hour = Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW);
  const ipKey = `rl:ip:${ip}:${hour}`;
  const emailKey = `rl:em:${email.toLowerCase()}:${hour}`;

  const [ipRaw, emailRaw] = await Promise.all([kv.get(ipKey), kv.get(emailKey)]);
  const ipCount = parseInt(ipRaw || '0', 10);
  const emailCount = parseInt(emailRaw || '0', 10);

  if (ipCount >= RATE_LIMIT_MAX) return { ok: false, reason: 'ip' };
  if (emailCount >= RATE_LIMIT_MAX) return { ok: false, reason: 'email' };

  // İki sayacı da +1 (TTL ile otomatik temizlenir)
  await Promise.all([
    kv.put(ipKey, String(ipCount + 1), { expirationTtl: RATE_LIMIT_WINDOW + 60 }),
    kv.put(emailKey, String(emailCount + 1), { expirationTtl: RATE_LIMIT_WINDOW + 60 }),
  ]);
  return { ok: true };
}

/**
 * Resend API üzerinden mail gönder. Attachment varsa base64 encode et.
 * Dokümantasyon: https://resend.com/docs/api-reference/emails/send-email
 */
async function sendMail(env: Env, args: {
  name: string;
  email: string;
  message: string;
  ip: string;
  userAgent: string;
  file?: { name: string; type: string; bytes: Uint8Array } | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { name, email, message, ip, userAgent, file } = args;

  // Plain-text body — HTML escape gerektirmez
  const bodyText = `Yeni bildirim alındı.

Gönderen: ${name} <${email}>
IP: ${ip}
User-Agent: ${userAgent}
Tarih: ${new Date().toISOString()}

────────────────────────────────────
${message}
────────────────────────────────────
${file ? `\nEk: ${file.name} (${file.bytes.length} bayt, ${file.type || 'application/octet-stream'})` : ''}
`;

  // HTML body — basit escape (sadece &, <, >)
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const bodyHtml = `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.55;color:#222;">
<p><strong>Yeni bildirim alındı.</strong></p>
<table style="border-collapse:collapse;margin:8px 0;">
<tr><td style="padding:2px 8px;color:#666;">Gönderen</td><td style="padding:2px 8px;"><strong>${esc(name)}</strong> &lt;${esc(email)}&gt;</td></tr>
<tr><td style="padding:2px 8px;color:#666;">IP</td><td style="padding:2px 8px;font-family:monospace;">${esc(ip)}</td></tr>
<tr><td style="padding:2px 8px;color:#666;">User-Agent</td><td style="padding:2px 8px;font-family:monospace;font-size:12px;">${esc(userAgent)}</td></tr>
<tr><td style="padding:2px 8px;color:#666;">Tarih</td><td style="padding:2px 8px;">${new Date().toISOString()}</td></tr>
</table>
<hr style="border:none;border-top:1px solid #ddd;margin:16px 0;" />
<pre style="white-space:pre-wrap;font-family:inherit;background:#f6f6f6;padding:12px;border-radius:4px;">${esc(message)}</pre>
${file ? `<p style="color:#666;font-size:12px;">Ek: <code>${esc(file.name)}</code> (${file.bytes.length} bayt)</p>` : ''}
</div>`;

  const payload: any = {
    from: env.MAIL_FROM,
    to: [env.MAIL_TO],
    reply_to: email,
    subject: `[Site bildirim] ${name} — ${message.slice(0, 60).replace(/\s+/g, ' ')}${message.length > 60 ? '…' : ''}`,
    text: bodyText,
    html: bodyHtml,
  };

  if (file) {
    // Resend base64 attachment
    let binStr = '';
    const chunk = 0x8000;
    for (let i = 0; i < file.bytes.length; i += chunk) {
      binStr += String.fromCharCode(...file.bytes.subarray(i, Math.min(i + chunk, file.bytes.length)));
    }
    const b64 = btoa(binStr);
    payload.attachments = [
      { filename: file.name, content: b64 },
    ];
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return { ok: false, error: `Resend API ${res.status}: ${errText.slice(0, 200)}` };
  }
  return { ok: true };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // ───── Env sanity check
  if (!env.RESEND_API_KEY || !env.MAIL_FROM || !env.MAIL_TO) {
    return jsonResponse({ error: 'Sunucu yapılandırılmamış (env eksik).' }, 500);
  }
  if (!env.RATE_LIMIT) {
    return jsonResponse({ error: 'Sunucu yapılandırılmamış (KV bağlanmamış).' }, 500);
  }

  // ───── Form data parse
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ error: 'Geçersiz form verisi.' }, 400);
  }

  const name = String(form.get('name') || '').trim();
  const email = String(form.get('email') || '').trim();
  const message = String(form.get('message') || '').trim();
  const honeypot = String(form.get('website') || '').trim();
  const turnstileToken = String(form.get('cf-turnstile-response') || '');
  const fileFromForm = form.get('file');

  // ───── Honeypot — bot doldurmuş
  if (honeypot.length > 0) {
    return jsonResponse({ error: 'Bot tespit edildi.' }, 400);
  }

  // ───── Field validation
  if (!name || name.length > 100) {
    return jsonResponse({ error: 'Ad alanı zorunlu (max 100 karakter).' }, 400);
  }
  if (!email || !basicEmailValid(email)) {
    return jsonResponse({ error: 'Geçerli bir e-posta adresi girin.' }, 400);
  }
  if (!message || message.length < 10 || message.length > 5000) {
    return jsonResponse({ error: 'Mesaj 10–5000 karakter arasında olmalı.' }, 400);
  }

  // ───── Turnstile (varsa)
  if (env.TURNSTILE_SECRET_KEY) {
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const turnstileOk = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
    if (!turnstileOk) {
      return jsonResponse({ error: 'CAPTCHA doğrulanamadı.' }, 400);
    }
  }

  // ───── Rate limit
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rl = await checkRateLimit(env.RATE_LIMIT, ip, email);
  if (!rl.ok) {
    return jsonResponse({ error: 'Çok fazla istek. Bir saat sonra deneyin.' }, 429);
  }

  // ───── File handling
  let file: { name: string; type: string; bytes: Uint8Array } | null = null;
  if (fileFromForm && fileFromForm instanceof File && fileFromForm.size > 0) {
    if (fileFromForm.size > MAX_FILE_BYTES) {
      return jsonResponse({ error: 'Dosya 10 MB sınırını aşıyor.' }, 413);
    }
    const buf = await fileFromForm.arrayBuffer();
    file = {
      name: fileFromForm.name || 'attachment',
      type: fileFromForm.type || 'application/octet-stream',
      bytes: new Uint8Array(buf),
    };
  }

  // ───── Send mail
  const userAgent = request.headers.get('User-Agent') || '';
  const result = await sendMail(env, { name, email, message, ip, userAgent, file });
  if (!result.ok) {
    return jsonResponse({ error: 'Mail gönderilemedi.', detail: result.error }, 502);
  }

  return jsonResponse({ ok: true });
};

// OPTIONS preflight (same-origin için aslen gereksiz, defansif)
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
