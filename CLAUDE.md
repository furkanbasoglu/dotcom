# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# CLAUDE.md — Proje Bağlamı

Bu dosya, bu repoda çalışan herhangi bir Claude (özellikle Claude Code) için
projenin mimarisini, kararlarını ve kurallarını özetler. Önce bunu oku.

İletişim dili: **Türkçe**. Çalışma tarzı: **adım adım, tek seferde küçük ve test
edilebilir değişiklik**. Her değişiklikten sonra doğrula.

---

## 1. Proje nedir

Furkan'ın kişisel sitesi (`furkanbasoglu.com`, Astro + Cloudflare Pages) ve onun
altındaki **Overleaf-benzeri online LaTeX derleyici** (`/latex`). Kullanıcılar
tarayıcıda LaTeX yazar, "Derle" der, PDF'i görür; projelerini kaydedip sonra
açabilir. Tier sistemi: Free / Pro / Unlimited.

---

## 2. Mimari

### 2.1 Derleme zinciri
tarayıcı (Monaco editör + dosya ağacı)
→ Pages Function `functions/api/compile.ts` (Clerk JWT doğrula + tier + rate limit)
→ Cloudflare Tunnel + Access (service-token ile korumalı)
→ Raspberry Pi üzerindeki **izole KVM VM**'de `latex-api` (kuyruk + güvenli Docker/TeXLive)
→ PDF → tarayıcıda PDF.js ile render.

### 2.2 Kalıcılık zinciri
tarayıcı
→ `functions/api/projects.ts` (GET listele / POST oluştur)
→ `functions/api/projects/[id].ts` (GET aç / PUT kaydet / DELETE sil)
→ ortak `functions/api/_auth.ts` (Clerk JWT + lazy D1 upsert + tier)
→ **D1** `latex-db` (metadata: users/projects/files) + **R2** `latex-projects` (dosya içerikleri).

Tüm kullanıcı verisi Cloudflare edge'de yaşar; **Raspberry Pi'da sıfır yer kaplar**.

---

## 3. Repo yapısı (önemli yerler)

- `src/pages/`                   — Astro public site (home/about/blog/contact/projects)
- `public/veri_atlasi/`          — bağımsız offline CSV görselleştirme aracı (server'sız)
- `functions/api/compile.ts`     — derleme endpoint'i (Clerk + tier + rate limit + tunnel forward)
- `functions/api/report.ts`      — iletişim/şikayet formu (Resend + Turnstile)
- `functions/api/_auth.ts`       — ORTAK kimlik modülü (route DEĞİL). JWT verify + D1 upsert + tier.
- `functions/api/projects.ts`    — GET listele / POST oluştur
- `functions/api/projects/[id].ts` — GET aç / PUT kaydet (tam senkron) / DELETE sil
- `public/_latex/index.html`     — LaTeX editör + dashboard markup
- `public/_latex/app.js`         — tüm frontend mantığı (Clerk, Monaco, dosya ağacı, dashboard, projects API client)
- `public/_latex/styles.css`     — editör + dashboard + modal stilleri
- `db/schema.sql`                — D1 şeması (users, projects, files)
- `docs/REQUIREMENTS.md`         — gereksinim belgesi (✅/🟡/⬜ durumlu)
- `docs/SECURITY.md`             — güvenlik mimarisi (ilke düzeyinde; operasyonel detay yok)

`/latex` sayfası içeriği bir **iframe** içinde çalışır; Clerk publishable key iframe'e
`?clerk_pk=...` query param'ı ile geçer. DevTools'ta test ederken console context'ini
`top` değil **`_latex/` iframe'i** seç (yoksa `window.Clerk` görünmez).

---

## 4. Cloudflare kaynakları ve binding'ler

Pages projesi adı: **dotcom** (panelden yönetiliyor; repoda `wrangler.toml` YOK).
Bindings/env panelden tanımlı (Settings → Bindings / Variables):

- KV  `RATE_LIMIT`        — rate limit sayaçları
- D1  `DB` → `latex-db`   — metadata
- R2  `PROJECTS_BUCKET` → `latex-projects` — dosya içerikleri
- env: `CLERK_SECRET_KEY`, `PUBLIC_CLERK_PUBLISHABLE_KEY` (pk_live...), `COMPILE_TUNNEL_URL`,
  `COMPILE_SERVICE_TOKEN_ID`, `COMPILE_SERVICE_TOKEN_SECRET`, `MAIL_FROM`, `MAIL_TO`,
  `RESEND_API_KEY`, `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`

Resource ID'leri (D1 id, account id vb.) gerektiğinde `wrangler` ile alınır; bu dosyaya
yazılmaz. **wrangler komutları repo kökünde, `npx wrangler ...` ile** çalışır (giriş yapılmış).

R2 anahtar düzeni: `<owner_id>/<project_id>/<dosya_adı>`.
D1 dosya gösterimi ↔ API sözleşmesi: metin → JSON string; binary → `{ encoding:'base64', data }`.

---

## 5. Verilmiş kararlar (NEDEN böyle — bozma)

- **compile.ts'e dokunma** (çalışıyor). Yeni özellikler ayrı dosyalarda.
  (`resolveTier()` artık D1'den okuyor; kullanıcı yoksa veya D1 hatasında güvenli
  varsayılan olarak `'free'` döner. Binary dosyalar da boyut limitine sayılır.)
- **Kimlik senkronu = Yol B (lazy upsert)**: webhook YOK. Kullanıcı ilk korumalı istekte
  `_auth.ts` içinde D1'e upsert edilir.
- **Depolama = R2 + D1**, GitHub DEĞİL. (GitHub API rate limit + izolasyon + gizlilik
  sorunları nedeniyle reddedildi. R2/D1 ücretsiz katmanı fazlasıyla yeterli.)
- **Kaydetme = tam senkron**: PUT gönderilen dosya seti nihaidir; eksik dosyalar R2+D1'den
  silinir. (Diff/patch değil — basitlik tercih edildi.)
- **Docker güvenliği**: `--network=none --read-only --tmpfs /tmp --memory --cpus --pids-limit
  --user 1000 -no-shell-escape`. Container İÇİNDE `timeout` ile sarmalama YAPMA (exit 125
  veriyordu); zaman aşımı `execFile` timeout'u ile yönetilir.
- **Ağ**: dışarıya yalnız Cloudflare Tunnel; router port forward YOK. Backend yalnız
  Access service-token ile erişilebilir.
- **app.js bootstrap sırası hassas**: Clerk (UI bundle → clerk-js) ÖNCE, Monaco AMD loader
  SONRA yüklenir (define/AMD çakışması). Bu sırayı bozma.

---

## 6. Güvenlik kuralları (KRİTİK)

- **Host ve VM'e DOKUNMA.** Raspberry Pi host'unda kişisel veri var (e-posta hesapları vb.).
  Bu repo yalnızca *website*'tir. Derleme izole KVM VM'de döner; kullanıcı verisi Pi'a hiç değmez.
- **Secret'ları repoya KOYMA.** Clerk/Resend/Cloudflare token'ları, cloudflared `*.json` /
  `cert.pem`, Access service-token secret'ı → hepsi Cloudflare panelinde / VM'de; repoda asla.
  `.gitignore` bunları dışlamalı. CLAUDE.md dahil hiçbir commit'lenen dosyaya secret yazma.
- **Açık iş**: Access service-token secret'ı bir ara transcript'te açığa çıktı; **rotate
  edilmeli** (Zero Trust'ta sil → yeniden oluştur → iki Pages secret'ını güncelle → redeploy).
- Sahiplik kontrolü: proje API'lerinde her işlemde `owner_id == userId` doğrulanır (404 aksi halde).
- Dosya adlarında path-traversal koruması (`..`, baştaki `/`, `\` yasak).

---

## 7. Geliştirme akışı

- **Yerel geliştirme**: `npm install` → `npm run dev` (Astro dev sunucu).
  Üretim build'i: `npm run build` (çıktı `dist/`). Önizleme: `npm run preview`.
  Node ≥ 22.12 gerekli (package.json `engines`).
- **Test paketi YOK**: bu repoda otomatik test yok; doğrulama tarayıcıda yapılır.
- **Deploy**: `git push` → Cloudflare Pages otomatik build/deploy (proje "dotcom").
  Ayrı build komutu gerekmez.
- **D1 sorgu/şema**: `npx wrangler d1 execute latex-db --remote --command "..."`
  veya `--file db/schema.sql`. `--remote` ŞART (yoksa yerel test db'ye gider).
- **R2**: `npx wrangler r2 object get|put|delete latex-projects/<key>`.
- **Test yöntemi**: deploy sonrası `/latex`'te, DevTools console'da `_latex/` iframe context'i
  seçip `await window.Clerk.session.getToken()` ile token alıp `fetch('/api/...')` çağrısı.
  Frontend testleri için hard refresh (Ctrl+Shift+R).
- **Rollback**: `git revert HEAD && git push`.

---

## 8. Mevcut durum ve kalan işler

**Bitti (✅):** izole VM + güvenli derleme + tunnel + Access + kuyruk; çok dosya/binary;
dosya ağacı + sürükle-bırak + boyutlandırılabilir paneller; D1+R2+KV; Clerk→D1 lazy upsert;
proje listele/oluştur/aç/kaydet/sil + tier limiti; "Projelerim" dashboard; özel modal;
compile.ts tier'ı D1'den okur + binary boyutu limite dahil;
log parse → tıklanabilir hata/uyarı tanıları → editörde ilgili satıra atlama;
PDF viewer zoom (−/+/fit-width) + sayfa gezinme (◀/▶/sayı kutusu, scroll senkron);
engine seçimi UI (topbar dropdown, per-project D1'de kalıcı).

**Kalan / sıradaki:**
1. Derleme iptal (cancel) — frontend AbortController + Pages function abort + tunnel/VM
   process kill. VM koduna dokunmak gerektiğinden ayrı plan; bu repo tek başına bitiremez.
2. PDF içinde metin arama + "sayfaya sığdır" modu.
3. Kapsamlı compiler settings paneli (latexmk flag'leri, output dir, vb.).
4. Otomatik tamamlama / snippet / outline; otomatik kaydetme; şablonlar; SyncTeX.
5. **IaC**: tek SSH ile Pi+VM kurulumunu yeniden ayağa kaldıran idempotent script'ler
   (`infra/` veya ayrı repo). Detay `docs/REQUIREMENTS.md`.

Ayrıntılı liste ve öncelik: `docs/REQUIREMENTS.md`.

---

## 9. Claude Code için kurallar

- Türkçe konuş, küçük adımlarla ilerle, her adımı doğrula.
- Çalışan kodu (özellikle `compile.ts`, auth/JWT mantığı, bootstrap sırası) gereksiz yere
  değiştirme. Değiştireceksen önce nedenini söyle.
- Secret sızdırma; host/VM'e müdahale etme.
- Büyük bir değişiklikten önce planı kısaca anlat, onay al.
- Belirsizlik varsa `docs/REQUIREMENTS.md` ve `docs/SECURITY.md`'yi oku.
