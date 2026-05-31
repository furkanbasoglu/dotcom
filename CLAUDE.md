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
→ edge Pages Function `functions/api/compile.ts` (kimlik + tier + rate limit + boyut)
→ outbound tünel (yalnız edge'den erişilebilen, service-token ile korumalı)
→ izole derleme ortamı (sandbox container'da güvenli LaTeX engine)
→ PDF → tarayıcıda PDF.js ile render.

Mimari ilkeleri ve sertleştirme katmanları için `SECURITY.md`.

### 2.2 Kalıcılık zinciri
tarayıcı
→ `functions/api/projects.ts` (GET listele / POST oluştur)
→ `functions/api/projects/[id].ts` (GET aç / PUT kaydet / DELETE sil)
→ ortak `functions/api/_auth.ts` (JWT doğrula + lazy D1 upsert + tier)
→ edge KV/D1/R2 binding'leri (rate limit sayaçları + metadata + dosya içerikleri).

Tüm kullanıcı verisi edge'de yaşar; derleme ortamında sıfır kalıcı depolama.

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

## 4. Edge binding'leri ve env

Edge platformu Pages projesinde tanımlı binding'ler (KV / D1 / R2) ve env değişkenleri
**dashboard üzerinden yönetilir**; repoda `wrangler.toml` ya da yapılandırma listesi yok.
Kod tarafında binding ve env ada erişim kod içindeki interface'lerden görünür; isimler
ve değerler bu dosyada tekrarlanmaz.

Yönetim:
- D1 sorgu/şema değişikliği: lokal `wrangler` ile, **`--remote`** zorunlu.
- R2 obje işlemleri: aynı şekilde `wrangler`.
- Hangi proje/db/bucket adının kullanıldığı dashboard ve özel notlardadır.

API sözleşmesi (dosya gösterimi): metin → JSON string; binary → `{ encoding:'base64', data }`.

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

- **Bu repo yalnızca website + edge function'lardır.** Derleme ve depolama altyapısının
  operasyonel ayrıntıları (host, ağ topolojisi, hostname, IP, port, yol, dosya isimleri,
  sürüm bilgileri) bu repoda **bilerek yoktur**. Mimari ilke düzeyinde `SECURITY.md`.
- **Hiçbir secret veya kimlik bilgisi commit'lenmez.** Token, anahtar, sertifika, hesap
  e-postası, kullanıcı kimliği, kaynak adı, fiyatlandırma içeren özel notlar — hepsi
  repo dışında. `.gitignore` `.env*`, `*.key`, `*.pem`, `secrets/`, kişisel `NOTES`,
  `SETUP`, `STATE`, `TODO`, `.private.md` dosyalarını dışarıda tutar.
- Hangi env değişkenlerinin tanımlı olması gerektiği kod içinde TypeScript interface
  olarak ifade edilir (runtime erişim için zorunlu); **bu dosyada inventory tekrarı YOK**.
- Sahiplik kontrolü: proje API'lerinde her işlemde `owner_id == userId` doğrulanır (404 aksi halde).
- Dosya adlarında path-traversal koruması (`..`, baştaki `/`, `\` yasak).
- Hassas bilgi sızıntısı şüphesinde: ilgili commit'ler revert edilmez (zaten git geçmişinde),
  bunun yerine **sızan kimlikler rotate** edilir + bundan sonraki commit'lerde tekrarlanmaz.

---

## 7. Geliştirme akışı

- **Yerel geliştirme**: `npm install` → `npm run dev` (Astro dev sunucu).
  Üretim build'i: `npm run build` (çıktı `dist/`). Önizleme: `npm run preview`.
  Node ≥ 22.12 gerekli (package.json `engines`).
- **Test paketi YOK**: bu repoda otomatik test yok; doğrulama tarayıcıda yapılır.
- **Deploy**: `git push` → edge platformu otomatik build/deploy.
- **D1 sorgu/şema**: lokal `wrangler d1 execute ... --remote ...` (proje adı/db adı
  özel notlarda; bu dosyaya yazılmaz). `--remote` ŞART.
- **R2**: aynı şekilde `wrangler r2 object` komutları, bucket adı özel notlarda.
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
PDF viewer zoom (−/+/fit-width/fit-page) + sayfa gezinme + PDF metin arama in-page
vurgu (TextLayer overlay, sarı/turuncu highlight, prev/next);
engine seçimi UI (topbar dropdown, per-project D1'de kalıcı);
otomatik kaydetme (debounced 2 sn) + şablonlar (boş/makale/mektup/Beamer) +
outline paneli (\section ağacı, tıklayınca satıra git) + ~35 LaTeX snippet (Monaco);
plan/yükseltme sayfası `/yukselt` + ödeme önizleme `/yukselt/odeme` (mock — banner: "henüz aktif değil").

**Kalan / sıradaki:**
1. **VM oturumu** (kullanıcı kendisi yapacak, tek seferde):
   - Derleme iptal (frontend AbortController + Pages disconnect → tunnel abort → latex-api SIGTERM).
   - SyncTeX (latexmk -synctex=1 + .synctex.gz parse + PDF↔kaynak jump).
2. Kapsamlı compiler settings paneli (latexmk flag'leri, output dir, vb.).
3. Proje genelinde ara-değiştir; biçim toolbar; sürüm geçmişi.
4. Proje yeniden adlandır / kopyala UI.
5. Resmi ticari sicil + ödeme sağlayıcı entegrasyonu (Stripe/iyzico) +
   plan değişikliğini D1 `users.tier`'a yazan webhook + iptal/iade akışı.
6. **IaC**: tek SSH ile Pi+VM kurulumunu yeniden ayağa kaldıran idempotent script'ler
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
