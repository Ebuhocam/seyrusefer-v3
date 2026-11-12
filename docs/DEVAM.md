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

### Faz 2 + Faz 3 — Veritabanı, giriş, kaynak üretimi ve inşaat
- `@opennextjs/cloudflare` + `wrangler.jsonc` + `open-next.config.ts` kuruldu (`next.config.mjs` içinde `initOpenNextCloudflareForDev()`).
- Yeni D1 veritabanı: `seyrusefer-v3-db` (`e23293e1-7e9a-4ce1-b319-6fe0eec32a45`), `migrations/0001_ilk_sema.sql` hem yerel hem uzak D1'e uygulandı.
- `src/lib/sunucu/` — `db.js`, `sifre.js` (PBKDF2-SHA256), `oturum.js` (HTTP-only çerez), `oyunDeposu.js`, `api.js`.
- API uçları: `/api/auth/kayit`, `/api/auth/giris`, `/api/auth/cikis`, `/api/oyun`.
- `/giris` sayfası ve `src/lib/oyun/useOyun.js` sunucu hook'u.

### Faz 4 — Görevler ve level sistemi
- `migrations/0002_gorevler.sql` — `gorev_ilerlemesi.son_gun`, `namaz_cetelesi`, `meydan_paylasimlari`, `meydan_yorumlar` tabloları (yerel + uzak D1).
- `src/lib/oyun/gorevler.js` — 10 levelın görev tanımları (`LEVEL_GOREVLERI`), sahih hadisleri, video özetleri, aile okuması mektupları, sınav soruları (`LEVEL_ICERIKLERI`), Seyyah iyilik görevleri (`SEYYAH_GOREVLERI`) ve bina/level görev kontrol fonksiyonları.
- `src/components/koy/GorevlerEkrani.js` ve güncellenen `Panel.js`:
  - Görev Panosu: aktif levelın görev listesi, bina anahtarı eşleşmesi, tek tıkla göreve gitme.
  - Bina içi ekranlar (`🚪 İçeri Gir`): Cami (5 vakit namaz çetelesi), Medrese (Hadis, ileri sarma engelli Video, İlim Sınavı), Otağ (Aile Okuması ve Level 10 Mezuniyet Beratı), Sosyal Meydan (Gündem paylaşımı ve kardeş yorumları, `/api/meydan`), Seyyah (günlük iyilik görevi).
  - Bina yükseltme ve level atlama gerçek görev ilerlemesine bağlandı (geliştirici panelindeki `Görev şartları tamam` kutucuğu test override olarak korundu).

## Sıradaki: Faz 5 — Admin Level Tasarım Merkezi
1. `/admin` sayfası (sadece `rol === 'admin'` veya yerel geliştirici için açık)
2. 10 levelın gündem başlığı, hadisleri, video bağlantısı/süresi, aile okuma metni, meydan sorusu, görev hedefleri ve bina kaynak bedellerini D1 üzerinden kod yazmadan düzenleme
3. Kullanıcı listesi ve rol/ilerleme yönetimi

## Notlar
- `AGENTS.md`: Bu Next.js sürümü farklı; kod yazmadan önce `node_modules/next/dist/docs/` okunmalı.
- Windows 10 emoji desteği sınırlı: 🪵 🪨 gibi yeni emojiler kullanılmamalı.
- Windows sertifika doğrulaması için npm/wrangler komutlarında gerekirse `$env:NODE_OPTIONS="--use-system-ca"` kullanılabilir.
