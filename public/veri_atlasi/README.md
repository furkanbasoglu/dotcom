# Veri Atlası

CSV dosyalarını yerelde görselleştir.

## Nasıl Açılır

`index.html` dosyasına **çift tıkla**. Varsayılan tarayıcında açılır.

İnternet bağlantısı gerekmiyor — tüm kütüphaneler ve fontlar `lib/` klasörü
içinde gömülü.

## Klasör İçeriği

- `index.html` — açacağın tek dosya
- `app.js` — uygulama mantığı (transpile edilmiş React)
- `styles.css` — derlenmiş Tailwind (sadece kullanılan sınıflar, ~13 KB)
- `lib/`
  - React, ReactDOM, Chart.js, Papa Parse
  - `fonts/` — Fraunces, Manrope, JetBrains Mono (variable woff2)

## Notlar

- Klasörü taşıyabilirsin; `index.html` ile diğer dosyalar aynı dizinde olduğu
  sürece çalışır.
- "Örnek veriyi dene" butonu hemen denemek için iki dahili CSV yükler
  (İstanbul ve Ankara 2024 aylık iklim verisi).
- Grafikler PNG ve JPEG olarak indirilebilir.
