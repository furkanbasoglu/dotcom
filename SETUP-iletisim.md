# İletişim/Bildirim Sayfası — Kurulum Rehberi

Bu sayfa **Cloudflare Pages Functions** üzerinde çalışan bir backend endpoint kullanır. Mail gönderme için **Resend**, spam koruması için **Cloudflare Turnstile**, rate limit için **Cloudflare KV** gerekir. Hepsi ücretsiz katmanda.

## 1. Dosyaları repo'ya ekle

```
website/
├── src/
│   ├── components/
│   │   └── Header.astro          ← güncellenmiş (İletişim linki eklendi)
│   └── pages/
│       └── iletisim.astro         ← YENİ
└── functions/
    └── api/
        └── report.ts              ← YENİ (Cloudflare Pages Function)
```

`functions/` klasörü repo kökünde olmalı (`src/` ile aynı seviyede). Cloudflare Pages bu klasörü otomatik bulup deploy eder.

## 2. Resend kurulumu

1. [resend.com](https://resend.com) → ücretsiz hesap aç (3000 mail/ay, attachment destekler).
2. **API Keys** sekmesinden bir key oluştur (örn. `re_xxxxxxxxxxxx`).
3. **Domains** sekmesinden `furkanbasoglu.com` ekle, DNS kayıtlarını (SPF, DKIM) Cloudflare DNS panel'inden ekle. Doğrulanınca `bildirim@furkanbasoglu.com` gibi adreslerden mail atabilirsin.
4. **Test için**: domain doğrulamadan önce `onboarding@resend.dev` adresinden mail atabilirsin, ama sadece kendi kayıtlı adresine.

## 3. Cloudflare Turnstile kurulumu

1. Cloudflare Dashboard → **Turnstile** → "Add site"
2. Domain: `furkanbasoglu.com`. Widget mode: **Managed** (otomatik).
3. **Site Key** (public) ve **Secret Key** (gizli) verir, ikisini de kopyala.

## 4. Cloudflare KV namespace oluştur

1. Cloudflare Dashboard → **Workers & Pages** → **KV** → "Create namespace"
2. Adı: `RATE_LIMIT` (veya istediğin bir şey, sadece binding adı bu olmalı — bkz. adım 5)
3. ID'sini bir yere not et (kullanmana gerek yok normalde, sadece referans için).

## 5. Pages projesi için environment variables + KV binding

Cloudflare Dashboard → **Pages** → projen (`furkanbasoglu-com` veya ne ad verdiysen) → **Settings**:

### Settings → Environment variables (Production & Preview)

| İsim | Değer |
|------|-------|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxx` (adım 2'de aldığın) |
| `TURNSTILE_SECRET_KEY` | adım 3'te aldığın secret |
| `PUBLIC_TURNSTILE_SITE_KEY` | adım 3'te aldığın **site** key (PUBLIC_ prefix önemli, Astro build-time inject eder) |
| `MAIL_FROM` | `Bildirim <bildirim@furkanbasoglu.com>` (domain doğrulanmadıysa `onboarding@resend.dev`) |
| `MAIL_TO` | `furkanaselint@gmail.com` |

> ⚠️ **Encrypt** seçeneğini Resend ve Turnstile secret'ları için işaretle (UI'da göstermez, build sonrası bundle'a sızmaz).

### Settings → Functions → KV namespace bindings

| Variable name | KV namespace |
|---------------|--------------|
| `RATE_LIMIT` | adım 4'te oluşturduğun namespace |

Binding adı **MUTLAKA** `RATE_LIMIT` olmalı; `functions/api/report.ts` kodu bu isimle bekliyor.

## 6. Deploy

```bash
git add functions/ src/pages/iletisim.astro src/components/Header.astro
git commit -m "Add contact/bug-report page with Cloudflare Pages Function"
git push
```

Cloudflare Pages otomatik deploy eder. Build log'larda `functions/api/report.ts` derleneceğini ve route'ladığını göreceksin. Site yayına alındıktan sonra `https://furkanbasoglu.com/iletisim` çalışır.

## 7. Test

1. `https://furkanbasoglu.com/iletisim` aç
2. Formu doldur (Turnstile widget otomatik gelir, "I'm a human" gibi tek tık)
3. Gönder → e-posta `furkanaselint@gmail.com`'a düşmeli
4. 10 MB üstü dosyayı browser hemen reddeder; 11x üst üste gönderirsen 11. seferde 429 alır (rate limit çalışıyor)

## Mimari özet

```
Tarayıcı                 Cloudflare Edge                    Resend
─────────                ───────────────                    ──────
POST /api/report  ──→    functions/api/report.ts  ──→       /v1/emails
(FormData)               │                                   ↓
                         ├─ honeypot check                  inbox → Gmail
                         ├─ field validation
                         ├─ Turnstile verify (CAPTCHA API)
                         ├─ KV rate limit (10/saat IP+email)
                         ├─ dosya base64
                         └─ Resend REST çağır
```

## Güvenlik katmanları

1. **Honeypot** — `<input name="website">` gizli alan, bot doldurursa istek reddedilir.
2. **Turnstile** — Cloudflare'in CAPTCHA'sı. JavaScript zorunlu, server-side doğrulama (`siteverify`).
3. **Rate limit** — IP başına 10/saat, email başına 10/saat. KV TTL ile otomatik temizlenir.
4. **Dosya boyutu** — hem client (10 MB üstünü hiç göndermez) hem server (413 döndürür) tarafında.
5. **Strict validation** — email regex, min/max mesaj uzunluğu, isim uzunluğu.
6. **Cloudflare WAF** — proxy'lediği için DDoS / bot trafiğini otomatik filtreler (ücretsiz katmanda da).

## İleride iyileştirme fikirleri

- **Reply-to**: gönderen email'i `Reply-To` header'a koyduk, mail'e gelip "Yanıtla" diyince doğrudan kullanıcıya gider.
- **Slack/Discord webhook**: Resend yerine veya yanında, bir webhook URL'e POST atılabilir.
- **Database**: KV yerine D1 (Cloudflare SQLite) kullanılarak gönderilmiş bildirimler arşivlenebilir.
- **Email-as-tickets**: Resend'in Inbound Email özelliği ile gelen yanıtlar otomatik takip edilebilir.
