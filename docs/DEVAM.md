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

## Tamamlanan Fazlar (Faz 0 – Faz 6)
### Faz 0 — Kurulum
- Orijinal PNG'ler `_kaynak-gorseller/` (gitignore'da). `npm run gorseller` → `public/assets/binalar/*.webp`, `public/assets/harita/koy.webp`.
- Git yedeği: commit `v2 prototip yedegi (v3 oncesi)`.

### Faz 1 — Köy haritası prototipi
- `src/lib/oyun/sabitler.js` — kaynaklar, depo süreleri, binalar (açılış/bedel), arsa ve nokta koordinatları, levellar, bölgeler
- `src/lib/oyun/kurallar.js` — saf oyun kuralları (üretim, depo, bina durumu, level durumu)
- `src/components/koy/` — `KoyHaritasi`, `UstBar`, `Panel`, `GelistiriciPaneli` (🛠: zaman ileri sarma, level, görev şartı, koordinat modu)

### Faz 2 + Faz 3 — Veritabanı, giriş, kaynak üretimi ve inşaat
- `@opennextjs/cloudflare` + `wrangler.jsonc` + `open-next.config.ts` kuruldu (`next.config.mjs` içinde `initOpenNextCloudflareForDev()`).
- Yeni D1 veritabanı: `seyrusefer-v3-db` (`e23293e1-7e9a-4ce1-b319-6fe0eec32a45`), `migrations/0001_ilk_sema.sql` hem yerel hem uzak D1'e uygulandı.
- İlk kayıt olan kullanıcı otomatik olarak `admin` rolü alır.
- `src/lib/sunucu/` — `db.js`, `sifre.js` (PBKDF2-SHA256), `oturum.js` (HTTP-only çerez), `oyunDeposu.js`, `ayarlarDeposu.js`, `api.js`.
- API uçları: `/api/auth/kayit`, `/api/auth/giris`, `/api/auth/cikis`, `/api/oyun`.
- `/giris` sayfası ve `src/lib/oyun/useOyun.js` sunucu hook'u.

### Faz 4 — Görevler ve level sistemi
- `migrations/0002_gorevler.sql` — `gorev_ilerlemesi.son_gun`, `namaz_cetelesi`, `meydan_paylasimlari`, `meydan_yorumlar` tabloları (yerel + uzak D1).
- `src/lib/oyun/gorevler.js` — 10 levelın görev tanımları (`LEVEL_GOREVLERI`), sahih hadisleri, video özetleri, aile okuması mektupları, sınav soruları (`LEVEL_ICERIKLERI`), Seyyah iyilik görevleri (`SEYYAH_GOREVLERI`) ve serbest metinli özel görev (`onay`) desteği.
- `src/components/koy/GorevlerEkrani.js` ve `Panel.js`:
  - Görev Panosu: aktif levelın görev listesi, bina anahtarı eşleşmesi, tek tıkla göreve gitme.
  - Bina içi ekranlar (`🚪 İçeri Gir`): Cami (5 vakit namaz çetelesi), Medrese (Hadis, ileri sarma engelli Video, İlim Sınavı), Otağ (Aile Okuması ve Level 10 Mezuniyet Beratı), Sosyal Meydan (Gündem paylaşımı ve kardeş yorumları, `/api/meydan`), Seyyah (günlük iyilik görevi).

### Faz 5 — Admin Level Tasarım Merkezi (`/admin`)
- `migrations/0003_admin_ve_birlik.sql` içinde `oyun_ayarlari` tablosu (yerel + uzak D1).
- `/admin` sayfası (`src/app/admin/AdminPaneli.js`) ve `/api/admin` uç noktası:
  - 10 levelın gündem başlığını, evresini, hedef gün süresini ve bina hedeflerini düzenleme
  - Her levela sınırsız görev ekleme/düzenleme/silme (Hadis, Video, Aile Okuması, Namaz Çetelesi, Sınav, Meydan Paylaşımı, Yorum, Seyyah veya **Özel Görev / Serbest Etkinlik**), hedef sayısını, günlük sınırını ve hangi binanın anahtarı olduğunu seçme
  - Her levelın hadislerini, videosunu (başlık, açıklama, URL, süre), aile okumasını, meydan gündem sorusunu ve çoktan seçmeli sınav sorularını düzenleme
  - Tüm binaların açılış levelı ve kaynak bedellerini (Erzak/Kereste/Taş) ile Seyyah görev havuzunu düzenleme
  - Kayıtlı öğrencileri görüntüleme, rol (`ogrenci` | `rehber` | `admin`) ve level güncelleme

### Faz 6 — Birlik ve Alan Mücadelesi (Level 4+ ve Level 6+)
- `migrations/0003_admin_ve_birlik.sql` içinde `birlikler`, `birlik_uyeleri`, `birlik_tesvikler`, `bolge_hamleleri` tabloları (yerel + uzak D1).
- `/api/birlik` uç noktası ve `src/components/koy/BirlikVeFetihEkrani.js`:
  - Birlik kurma / katılma / ayrılma (Level 4+), Takas Merkezi ve üst bardaki `🤝 Birlik` butonundan erişim
  - Birlik Kasası: üyelerin kendi kaynaklarından bağış yapması ve katkı puanı kazanması
  - Kardeşlik Teşviki (`"Haydi Kardeşim!"`): bugün henüz görev yapmamış birlik arkadaşına bildirim gönderme; teşvik edilen arkadaş görev yaptığında her ikisine de +10 birlik katkı puanı
  - Alan Mücadelesi (Level 6+, Oyun Çadırı / Birlik paneli): 6 stratejik bölgede Birlik Kasası kaynakları ve birliğin günlük görev disiplini çarpanıyla (`temelGuc * disiplinCarpani`) fetih hamlesi yapma ve bölge liderliği sıralaması.

## Çalıştırma ve Yayınlama
- Yerel geliştirme: `npm run dev` (yerel D1 otomatik bağlanır)
- Cloudflare önizleme: `npm run preview`
- Cloudflare yayınlama: `npm run deploy`
