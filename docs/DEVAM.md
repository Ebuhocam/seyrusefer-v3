# Seyrüsefer v3 — Devam Notu (Handoff)

Son güncelleme: 12 Kasım 2026

## Referans dokümanlar
- [oyun_tasarim_dokumani.md](./oyun_tasarim_dokumani.md) — oyun kuralları, kaynak ekonomisi, 10 level, bedeller (ONAYLANDI)
- [yol_haritasi.md](./yol_haritasi.md) — teknoloji ve fazlar (ONAYLANDI)

## Temel kararlar
- Görevler **kaynak vermez**. Kaynaklar (Erzak/Kereste/Taş) sadece Tarla/Orman/Maden'den zamanla birikir, depo dolunca üretim durur.
- Bina yükseltme = **görev şartı + kaynak bedeli** (+ oyuncu level şartı).
- 10 level, her levelın bir gündemi var. Birlik Level 4'te, alan mücadelesi Level 6'da açılır.
- Teknoloji: Next.js 16 (App Router, JS) + Tailwind 4 → Cloudflare (OpenNext) + D1 + R2.
- Canlı eski sisteme (`Desktop\seyrusefer\seyrusefer-app`, seyrusefer.org) **dokunulmaz**.
- Eski kullanıcılar taşınmaz (herkes sıfırdan); hadis/soru verileri eski D1'den taşınabilir.

## Tamamlananlar
### Faz 0 — Kurulum
- Orijinal PNG'ler `_kaynak-gorseller/` (gitignore'da). `npm run gorseller` → `public/assets/binalar/*.webp`, `public/assets/harita/koy.webp`.
- Git yedeği: commit `v2 prototip yedegi (v3 oncesi)`.

### Faz 1 — Köy haritası prototipi
- `src/lib/oyun/sabitler.js` — kaynaklar, depo süreleri, binalar (açılış/bedel), arsa ve nokta koordinatları, levellar
- `src/lib/oyun/kurallar.js` — saf oyun kuralları (üretim, depo, bina durumu, level durumu)
- `src/lib/oyun/useSahteOyun.js` — localStorage tabanlı geçici durum (Faz 2'de API ile değişecek)
- `src/components/koy/` — `KoyHaritasi`, `UstBar`, `Panel`, `GelistiriciPaneli` (🛠: zaman ileri sarma, level, görev şartı, koordinat modu)
- `npx next build` ve `npx eslint src` temiz.

## Sıradaki: Faz 2 — Veritabanı ve giriş
1. `@opennextjs/cloudflare` kurulumu, `wrangler.jsonc`
2. Yeni D1: `seyrusefer-v3-db`; tablolar: kullanıcılar, oyuncu_durumu, binalar, kaynak_toplama, görev ilerlemesi
3. Kayıt/giriş (oturum çerezi)
4. `useSahteOyun` → sunucu API'si (kurallar.js sunucuda da kullanılır; kaynak hesabı sunucu saatine göre)

## Notlar
- `AGENTS.md`: Bu Next.js sürümü farklı; kod yazmadan önce `node_modules/next/dist/docs/` okunmalı.
- Windows 10 emoji desteği sınırlı: 🪵 🪨 gibi yeni emojiler kullanılmamalı.
