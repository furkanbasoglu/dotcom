# LaTeX Derleyici — Gereksinim Belgesi (PRD taslağı)

> Amaç: Overleaf benzeri, web tabanlı, çok kullanıcılı bir LaTeX derleme platformu.
> Bu belge **ne yapılacağını** tanımlar (özellik/kabiliyet listesi), **nasıl** değil.
> Özellikler/işlevler taklit edilebilir; Overleaf'in kodu, görsel tasarımı, logosu ve
> marka assetleri taklit EDİLMEZ. Tasarım ve kod özgün olacak.

Durum etiketleri: ✅ yapıldı · 🟡 kısmen · ⬜ planlı

---

## 1. Fonksiyonel gereksinimler

### 1.1 Kimlik & hesap
- ✅ Clerk ile giriş / kayıt / çıkış.
- ✅ Kullanıcı profilini D1'de tutma (id, e-posta, tier, oluşturulma).
- ✅ Tier sistemi tanımlı: Free (sınırlı), Pro (sınırsız tek proje), Unlimited (sınırsız proje).
- ✅ Clerk → D1 senkronu (Yol B: ilk korumalı istekte lazy upsert; webhook'a gerek kalmadı).

### 1.2 Proje yönetimi
- ✅ Proje oluştur / listele / aç / sil (API: projects.ts + projects/[id].ts).
- ✅ Proje başına meta: ad, son düzenleme, ana dosya, engine tercihi (D1.projects).
- ✅ Tier'a göre proje sayısı limiti (Free: 1 → 403; Unlimited: N) — backend'de enforced.
- 🟡 Yeniden adlandır (PUT name destekli) / kopyala (duplicate) — UI henüz yok.
- ✅ Şablondan proje oluşturma (boş / makale / mektup / Beamer sunum).

### 1.3 Dosya yönetimi
- ✅ Çok dosyalı proje (birden çok .tex, .bib, görsel).
- ✅ Dosya ekle / sil / yeniden adlandır.
- ✅ "Ana dosya" (entry) seçimi.
- ✅ Görsel/binary yükleme (base64), editörde önizleme.
- ✅ Sürükle-bırak ile dosya ekleme (uzantı kontrollü).
- ✅ Kalıcı depolama: dosya içerikleri R2'de, meta D1'de (tam senkron kaydet/aç).
- ⬜ Klasör (alt dizin) ağacı ve taşıma.
- ⬜ Dosya indirme (tek dosya / tüm proje .zip).

### 1.4 Editör
- ✅ Sözdizimi vurgulama (Monaco, latex).
- ✅ Dosya başına ayrı model (sekme/geçiş, undo geçmişi korunur).
- ✅ Otomatik tamamlama + snippet'ler (~35 LaTeX snippet: section, begin, frac, figure, table, vs.).
- ⬜ Ara-değiştir (proje genelinde arama).
- ✅ Dosya taslağı / outline (\section/subsection/chapter ağacı, tıklayınca satıra git).
- ⬜ Biçim düğmeleri (kalın, italik, liste, tablo, matematik) — opsiyonel toolbar.
- ✅ Otomatik kaydetme (2 sn debounced PUT) + "kaydedilmemiş değişiklik" göstergesi (•).

### 1.5 Derleme
- ✅ İzole Docker sandbox'ta latexmk (güvenli).
- ✅ Engine seçimi backend'de: pdflatex / xelatex / lualatex.
- ✅ Eşzamanlılık kuyruğu + tier önceliği + per-user limit.
- ✅ Bibliyografya (latexmk biber/bibtex'i otomatik çağırır).
- ✅ Hata/log gösterimi (ham log + tıklanabilir tanılar — error ve LaTeX Warning).
- 🟡 UI'dan engine seçimi (topbar dropdown, per-project D1'de kalıcı) — derleme ayarları paneli henüz yok.
- ✅ Log parse → tıklanınca editörde ilgili satıra gitme.
- ⬜ Derlemeyi iptal etme (cancel).
- ⬜ SyncTeX: PDF ↔ kaynak çift yönlü atlama.
- ⬜ Derleme önbelleği (değişmeyen projeyi yeniden derlememe).

### 1.6 PDF görüntüleme
- ✅ PDF.js ile sayfa render.
- ✅ PDF indirme.
- ✅ Yakınlaştır/uzaklaştır + genişliğe sığdır + sayfaya sığdır.
- ✅ Sayfa gezinme (önceki / sonraki / N/Toplam, sayı kutusu Enter ile git).
- ✅ PDF içinde metin arama (TextLayer overlay + sarı highlight; aktif eşleşme turuncu, prev/next, scroll).

### 1.7 İşbirliği & paylaşım (ileri faz)
- ⬜ Salt-okunur paylaşım linki.
- ⬜ Davet ile ortak düzenleme.
- ⬜ Yorum / inceleme modu.
- ⬜ Gerçek zamanlı eş-düzenleme (CRDT) — büyük iş, en sona.

### 1.8 Versiyon & geçmiş (ileri faz)
- ⬜ Derleme / kayıt geçmişi.
- ⬜ Sürüm karşılaştırma, geri alma.

### 1.9 Hesap & Plan / Ödeme
- ✅ Plan karşılaştırma sayfası (`/yukselt`): Free / Pro / Unlimited kartları,
  özellikler ve fiyatlar (₺99/ay Pro, ₺249/ay Unlimited). Global "ödeme aktif değil" bilgi.
- ✅ Ödeme önizleme sayfası (`/yukselt/odeme?plan=...`): mock form, submit disabled,
  üstte global uyarı banner'ı.
- ✅ Topbar'da "Yükselt" butonu (giriş yapmış kullanıcı, /latex iframe'inden parent'a yönlendirir).
- ✅ Kamu Header'da "Yükselt" linki.
- ⬜ Resmi ticari sicil + ödeme sağlayıcı entegrasyonu (Stripe / iyzico).
- ⬜ Plan değişiminin D1 `users.tier`'a yazılması (webhook).
- ⬜ Otomatik faturalama, fatura/dekont gönderimi.
- ⬜ İptal akışı (kalan dönem sonunda Free'ye düşür).
- ⬜ KVKK / GDPR uyumlu kullanım şartları + gizlilik politikası.

---

## 2. Fonksiyonel olmayan gereksinimler

### 2.1 Güvenlik  (mevcut durum güçlü)
- ✅ Derleme tamamen izole KVM VM'de; host kişisel verisine erişemez.
- ✅ Container: --network=none, --read-only, --user 1000, --pids-limit, -no-shell-escape.
- ✅ Dış erişim yalnız Cloudflare Tunnel; router port-forward yok.
- ✅ Backend yalnız Cloudflare Access service-token ile erişilebilir (token'sız 403).
- ✅ Path-traversal koruması (dosya adları temizleniyor).
- ⬜ Secret rotasyonu ve sızıntı kontrolü (token'lar repo dışında, .gitignore).
- ⬜ Kullanıcı başına kaynak kotaları (CPU saniyesi, derleme/gün).

### 2.2 Ölçeklenme & dayanıklılık
- ✅ Kuyruk + eşzamanlılık limiti (Pi donanımına göre 2 paralel).
- ✅ Servisler systemd ile kalıcı + otomatik yeniden başlama.
- ✅ Kalıcı depolama: R2 (dosya içerikleri) + D1 (meta) — kuruldu ve bağlandı.
- ⬜ Kalıcı kuyruk (BullMQ/Redis) — çoklu worker gerekince.
- ⬜ Yatay ölçek: birden çok compile-VM, yük dağıtımı.

### 2.3 Performans
- ⬜ Tipik küçük doküman < 3 sn (mevcut ~1.7 sn).
- ⬜ Derleme önbelleği ile tekrar derlemeleri hızlandırma.
- ⬜ Editör 50+ dosyalı projede akıcı kalmalı.

### 2.4 Kullanılabilirlik & erişilebilirlik
- ✅ Boyutlandırılabilir paneller (sürüklenebilir ayraçlar).
- ⬜ Klavye kısayolları (derle, kaydet, dosya aç).
- ⬜ Açık/koyu tema.
- ⬜ Mobil/responsive akıcı deneyim.
- ⬜ Erişilebilirlik (ARIA, klavyeyle gezinme).

### 2.5 Gözlemlenebilirlik
- ✅ UI log konsolu.
- ⬜ Backend metrikleri (kuyruk derinliği, derleme süresi, hata oranı).
- ⬜ Hata izleme / uyarı.

### 2.6 Maliyet & sınırlar
- ⬜ Free tier limitleri net (örn. günde N derleme, tek proje, X MB).
- ⬜ Pi kapasitesinin üzerine çıkınca davranış (kuyruk dolunca 503 — mevcut).

### 2.7 Yasal / IP
- ⬜ Özgün marka, logo, tasarım dili (Overleaf assetleri kullanılmaz).
- ⬜ Gizlilik politikası + kullanım şartları (kullanıcı dosyaları, saklama süresi).
- ⬜ Açık kaynak bileşenlerin lisans uyumu (Monaco MIT, PDF.js Apache, TeX Live).

---

## 3. Tier matrisi (taslak)

| Özellik | Free | Pro | Unlimited |
|---|---|---|---|
| Proje sayısı | 1 | 1 (sınırsız boyut) | Sınırsız |
| Derleme/gün | sınırlı | sınırsız | sınırsız |
| Kuyruk önceliği | düşük | orta | yüksek |
| Maks proje boyutu | küçük | büyük | büyük |
| Paylaşım/işbirliği | — | sınırlı | tam |

---

## 4. Yol haritası (öncelik sırası)

**MVP (tamamlandı):** izole VM + güvenli derleme + tunnel + Access + kuyruk +
çok dosya/binary + dosya ağacı + sürükle-bırak + boyutlandırılabilir paneller.

**v1 — Kalıcılık & temel UX:**
1. ✅ C: R2 + D1 + Clerk→D1 senkron + proje CRUD (kalıcı projeler) — backend bitti.
2. ✅ Tier sisteminin uçtan uca bağlanması (projects API D1'den okur; compile.ts D1'den okur, binary boyut limite dahil).
3. 🟡 Frontend "Projelerim" ekranı + kaydet/yükle akışı (yapım aşamasında).
4. 🟡 Log parse ✅ (tıklanabilir hatalar/uyarılar) + derleme iptali ⬜.
5. ✅ PDF zoom + sayfa gezinme (sayfaya sığdır ve metin arama hariç).
6. 🟡 Engine seçimi UI'da (dropdown ✅, kapsamlı compiler settings paneli ⬜).

**v2 — Verimlilik:**
6. ✅ Otomatik tamamlama + snippet + outline.
7. 🟡 Otomatik kaydetme ✅; sürüm geçmişi ⬜.
8. ✅ Şablonlar (boş/makale/mektup/Beamer).
9. ⬜ SyncTeX (VM tarafında synctex üretimi gerek; ayrı oturumda).

**v3 — İşbirliği:** paylaşım linki → ortak düzenleme → gerçek zamanlı.

**Altyapı (paralel iş):** IaC reposu — tek SSH ile her şeyi yeniden ayağa kaldıran
idempotent script'ler; secret'lar repo dışında.

---

## 5. Mevcut durum özeti (snapshot)

Çalışan uçtan uca zincir:
tarayıcı (Monaco + dosya ağacı) → Pages Function `compile.ts` (Clerk + tier + rate limit)
→ Cloudflare Tunnel + Access (service-token) → VM `latex-api` (kuyruk + güvenli Docker)
→ PDF → tarayıcıda PDF.js render.

Kalıcılık zinciri (yeni):
tarayıcı → Pages Function `projects.ts` / `projects/[id].ts` (Clerk JWT + lazy D1 upsert)
→ D1 `latex-db` (users/projects/files meta) + R2 `latex-projects` (dosya içerikleri).
Tüm kullanıcı verisi Cloudflare edge'de; Raspberry Pi'da sıfır yer kaplar.

Kalan tek büyük parça: frontend "Projelerim" ekranı + kaydet/yükle akışının bu API'lere bağlanması.

