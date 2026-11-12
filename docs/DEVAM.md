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
- `src/components/koy/` — `KoyHaritasi`, `UstBar`, `Panel`, `GelistiriciPaneli` (🛠: zaman ileri sarma, level, görev şartı, koordinat modu)

### Faz 2 + Faz 3 Çekirdeği — Veritabanı, giriş, kaynak üretimi ve inşaat
- `@opennextjs/cloudflare` + `wrangler.jsonc` + `open-next.config.ts` kuruldu (`next.config.mjs` içinde `initOpenNextCloudflareForDev()`).
- Yeni D1 veritabanı oluşturuldu: `seyrusefer-v3-db` (`e23293e1-7e9a-4ce1-b319-6fe0eec32a45`), `migrations/0001_ilk_sema.sql` hem yerel hem uzak D1'e uygulandı (`kullanicilar`, `oturumlar`, `oyuncu_durumu`, `binalar`, `kaynaklar`, `gorev_ilerlemesi`).
- `src/lib/oyun/eylemler.js` — saf sunucu eylemleri (`topla`, `yukselt`, `levelAtla`, `gelistiriciEylemleri`).
- `src/lib/sunucu/` — `db.js`, `sifre.js` (PBKDF2-SHA256), `oturum.js` (HTTP-only çerez `seyrusefer_oturum`), `oyunDeposu.js` (atomik D1 `batch` okuma/yazma), `api.js`.
- API uçları: `/api/auth/kayit`, `/api/auth/giris`, `/api/auth/cikis`, `/api/oyun` (GET/POST, sunucu saatine göre kaynak/depo/inşaat hesabı).
- `/giris` sayfası (`src/app/giris/`) ve `src/lib/oyun/useOyun.js` sunucu hook'u (`useSahteOyun.js` kaldırıldı).

## Sıradaki: Faz 4 — Görevler ve level sistemi
1. Görev şeması ve içerik tabloları (hadisler, videolar, aile okumaları, namaz çetelesi, meydan paylaşımları) — mevcut hadis/soru verilerinin eski D1'den aktarımı
2. Görev Panosu: aktif levelın görev listesi, ilerleme durumu, tamamlama akışı
3. Bina içi ekranlar: Cami (namaz çetelesi), Medrese (hadis/video/sınav), Otağ (aile okuması), Sosyal Meydan (gündem paylaşımı)
4. `binaDurumu` ve `levelAtla` içindeki `gorevlerTamam` kontrolünün gerçek görev ilerlemesine bağlanması

## Notlar
- `AGENTS.md`: Bu Next.js sürümü farklı; kod yazmadan önce `node_modules/next/dist/docs/` okunmalı.
- Windows 10 emoji desteği sınırlı: 🪵 🪨 gibi yeni emojiler kullanılmamalı.
- Windows sertifika doğrulaması için npm/wrangler komutlarında gerekirse `$env:NODE_OPTIONS="--use-system-ca"` kullanılabilir.
