/**
 * POST /api/report
 *
 * Accepts contact / bug-report form submissions, validates the input,
 * applies CAPTCHA verification and rate limiting, then forwards the
 * message to the operator via a transactional email provider.
 *
 * Required Pages environment bindings:
 *   - RESEND_API_KEY        — transactional email provider API key (encrypted)
 *   - TURNSTILE_SECRET_KEY  — CAPTCHA verification secret (encrypted)
 *   - MAIL_FROM             — verified sender address
 *   - MAIL_TO               — operator's destination address
 *   - RATE_LIMIT (KV)       — namespace for rate limit counters
 *
 * The frontend additionally reads PUBLIC_TURNSTILE_SITE_KEY at build time
 * to render the CAPTCHA widget.
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
const RATE_LIMIT_WINDOW = 60 * 60;        // 1 hour (seconds)
const RATE_LIMIT_MAX = 10;                // requests per window

// CORS — same-origin only by default
const corsHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
};

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function basicEmailValid(email: string): boolean {
  // Pragmatic check, not full RFC 5322
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200;
}

/**
 * Verify a Cloudflare Turnstile token. If the secret is unset, verification
 * is skipped (intended for local development only — production must set it).
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
 * Per-IP and per-email rate limiting via KV with hourly buckets.
 */
async function checkRateLimit(kv: KVNamespace, ip: string, email: string): Promise<{ ok: boolean; reason?: string }> {
  const bucket = Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW);

  if (ip) {
    const ipKey = `rl:ip:${ip}:${bucket}`;
    const ipCount = parseInt((await kv.get(ipKey)) || '0', 10);
    if (ipCount >= RATE_LIMIT_MAX) {
      return { ok: false, reason: 'ip' };
    }
    await kv.put(ipKey, String(ipCount + 1), { expirationTtl: RATE_LIMIT_WINDOW + 60 });
  }

  const emailKey = `rl:email:${email}:${bucket}`;
  const emailCount = parseInt((await kv.get(emailKey)) || '0', 10);
  if (emailCount >= RATE_LIMIT_MAX) {
    return { ok: false, reason: 'email' };
  }
  await kv.put(emailKey, String(emailCount + 1), { expirationTtl: RATE_LIMIT_WINDOW + 60 });

  return { ok: true };
}

/**
 * HTML-escape user-supplied strings for inclusion in mail body.
 */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendMail(
  env: Env,
  name: string,
  email: string,
  message: string,
  file: { name: string; bytes: Uint8Array } | null,
  ip: string,
): Promise<{ ok: boolean; error?: string }> {
  const bodyText = [
    `Name: ${name}`,
    `Email: ${email}`,
    `IP: ${ip || 'n/a'}`,
    '',
    'Message:',
    message,
  ].join('\n');

  const bodyHtml = `<div style="font-family:system-ui,sans-serif;font-size:14px;color:#222;">
<p><strong>Name:</strong> ${esc(name)}</p>
<p><strong>Email:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></p>
<p><strong>IP:</strong> ${esc(ip || 'n/a')}</p>
<hr style="border:none;border-top:1px solid #ddd;margin:1em 0;">
<p style="white-space:pre-wrap;">${esc(message)}</p>
${file ?
`<p style="color:#666;font-size:12px;">Attachment: <code>${esc(file.name)}</code> (${file.bytes.length} bytes)</p>` : ''}
</div>`;

  const payload: any = {
    from: env.MAIL_FROM,
    to: [env.MAIL_TO],
    reply_to: email,
    subject: `[Site report] ${name} — ${message.slice(0, 60).replace(/\s+/g, ' ')}${message.length > 60 ? '…' : ''}`,
    text: bodyText,
    html: bodyHtml,
  };

  if (file) {
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
    return { ok: false, error: `Mail provider ${res.status}: ${errText.slice(0, 200)}` };
  }
  return { ok: true };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // ── Env sanity check
  if (!env.RESEND_API_KEY || !env.MAIL_FROM || !env.MAIL_TO) {
    return jsonResponse({ error: 'Server misconfigured (missing environment).' }, 500);
  }
  if (!env.RATE_LIMIT) {
    return jsonResponse({ error: 'Server misconfigured (no rate limit binding).' }, 500);
  }

  // ── Form data parse
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

  // ── Honeypot triggered → silent reject
  if (honeypot.length > 0) {
    return jsonResponse({ error: 'Bot tespit edildi.' }, 400);
  }

  // ── Field validation
  if (!name || name.length > 100) {
    return jsonResponse({ error: 'Ad alanı zorunlu (max 100 karakter).' }, 400);
  }
  if (!email || !basicEmailValid(email)) {
    return jsonResponse({ error: 'Geçerli bir e-posta adresi girin.' }, 400);
  }
  if (!message || message.length < 10 || message.length > 5000) {
    return jsonResponse({ error: 'Mesaj 10–5000 karakter arasında olmalı.' }, 400);
  }

  // ── CAPTCHA
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (env.TURNSTILE_SECRET_KEY) {
    const turnstileOk = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
    if (!turnstileOk) {
      return jsonResponse({ error: 'CAPTCHA doğrulanamadı.' }, 400);
    }
  }

  // ── Rate limit
  const rl = await checkRateLimit(env.RATE_LIMIT, ip, email);
  if (!rl.ok) {
    return jsonResponse({ error: 'Çok fazla istek. Lütfen bir saat sonra tekrar deneyin.' }, 429);
  }

  // ── Optional attachment
  let file: { name: string; bytes: Uint8Array } | null = null;
  if (fileFromForm instanceof File && fileFromForm.size > 0) {
    if (fileFromForm.size > MAX_FILE_BYTES) {
      return jsonResponse({ error: `Dosya çok büyük (max ${MAX_FILE_BYTES / 1024 / 1024} MB).` }, 413);
    }
    const buf = await fileFromForm.arrayBuffer();
    file = { name: fileFromForm.name || 'attachment', bytes: new Uint8Array(buf) };
  }

  // ── Send mail
  const sendRes = await sendMail(env, name, email, message, file, ip);
  if (!sendRes.ok) {
    return jsonResponse({ error: 'Mail gönderilemedi.', detail: sendRes.error }, 502);
  }

  return jsonResponse({ ok: true });
};
