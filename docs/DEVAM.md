# Seyrüsefer v3 — Devam Notu (Handoff)

Son güncelleme: 13 Kasım 2026

## Referans dokümanlar
- [oyun_tasarim_dokumani.md](./oyun_tasarim_dokumani.md) — oyun kuralları, kaynak ekonomisi, 10 level, bedeller (ONAYLANDI)
- [yol_haritasi.md](./yol_haritasi.md) — teknoloji ve fazlar (ONAYLANDI)

## Temel kararlar ve 3 Katmanlı Dünya Mimarisi
- **3 Katmanlı Harita (`🏡 Köyüm`, `🏕️ Birlik Alanı`, `🗺️ Genel Harita`):**
  1. **1. Katman — Kendi Köyüm (Level 1+):**
     - **Oba (`otag`):** Köy yöneticisinin divanı. Oyuncu köylüler arasındaki anlaşmazlıkları (`KOY_DAVALARI`) hikmetle çözer; seçtiği karara göre köyün **😊 Mutluluk (`%0–%100`)** puanı `+4`, `+2` veya negatif (`-3`..`-5`) değişir.
     - **Kıraathane (`kiraathane`):**
       - **🎵 Ozan Dede:** Türkülerin tarihini ve hikmetli kıssalarını (`TURKU_HIKAYELERI`) sesli olarak ve ağzı oynayarak (`ozan_kapali.webp` ↔ `ozan_acik.webp` lip-sync) anlatır, öğrenciye gönül ödevi verir.
       - **👥 Yolcular (İnsan Topla):** Belirli aralıklarla Kıraathane'ye uğrayan yolcu/zanaatkâr ailelere (`GOCMEN_ADAYLARI`) köyde ev kurma teklif edilir. Köyün **Mutluluk** oranına göre teklifi kabul edip köye yerleşirler ve **👥 İnsan (`insan`)** kaynağı artar.
     - **Mektep (`mektep`):** Köyün ilim yuvası (Hadis okuma, ileri sarma korumalı Video dersi ve İlim Sınavı).
     - **Köy Meydanı (`sosyalmeydan`):** Gündem paylaşımları ve kardeş yorumları.
     - **Haberci (`haberci`):** Köye aile okuma mektuplarını (`aile`) ve günlük sürpriz iyilik görevlerini (`seyyah`) getirir.
     - **Üretim Alanları:** Tarla (`🌾 Mahsul`), Orman (`🌲 Tahta`), Maden (`🧱 Taş`).
  2. **2. Katman — Birlik Alanı / Külliye (Level 4+, `/assets/harita/birlik_alani.webp`):**
     - **Birlik Otağı (`otag`):** Birliğin mesajlaşma/istişare odası (`birlik_mesajlari`) ve ortak vergi/kasa merkezi (`kasa`).
     - **Ulu Cami (`cami`):** Birlik kardeşlerinin ortak 5 vakit namaz çetelesi ve maneviyat merkezi.
     - **Birlik Medresesi (`medrese`)**, **Vergi & Takas Merkezi (`takasmerkezi`)**, **Cenk & Yarışma Çadırı (`oyuncadiri`)**.
     - Birlik üyeleri ortak kasadaki kaynaklarla külliye binalarını (`birlik_binalari`) yükseltebilir.
  3. **3. Katman — Genel Sancak Haritası (Level 6+, `/assets/harita/genel_harita.webp`):**
     - 6 stratejik sancak bölgesi (`BOLGELER`: İhlas Vadisi, Hikmet Tepesi, Kardeşlik Ovası, Emanet Kalesi, Sabır Limanı, İhsan Sancağı). Birlikler ortak kasa kaynakları ve günlük görev/namaz disiplini çarpanıyla bölge liderliği için hamle yapar.
- **4 Temel Kaynak + Mutluluk:**
  - `🌾 Mahsul` (`erzak`), `🌲 Tahta` (`kereste`), `🧱 Taş` (`tas`), `👥 İnsan` (`insan`) + `😊 Mutluluk` (`%0–%100`).
- **Teknoloji:** Next.js 16 (App Router, JS) + Tailwind 4 → Cloudflare (OpenNext) + D1 (`seyrusefer-v3-db`, `e23293e1-7e9a-4ce1-b319-6fe0eec32a45`).
- Canlı eski sisteme (`Desktop\seyrusefer\seyrusefer-app`, `seyrusefer.org`) **dokunulmaz**.

## Tamamlanan Fazlar (Faz 0 – Faz 6 + 3 Katmanlı Yeniden Tasarım)
- **Migrationlar (`0001` – `0004`):** Hem yerel hem uzak D1 veritabanına (`seyrusefer-v3-db`) uygulandı.
- **Yeni Görseller (`public/assets/`):**
  - `public/assets/binalar/kiraathane.webp`, `public/assets/binalar/mektep.webp`
  - `public/assets/binalar/ozan_kapali.webp`, `public/assets/binalar/ozan_acik.webp`
  - `public/assets/harita/birlik_alani.webp`, `public/assets/harita/genel_harita.webp`
- **Admin Level Tasarım Merkezi (`/admin`):**
  - 10 levelın gündem, bina hedefleri, görevleri (`hadis`, `video`, `aile`, `namaz`, `sinav`, `turku`, `dava`, `meydan_paylasim`, `meydan_yorum`, `seyyah`, `onay`), bina 4 kaynak bedelleri (`Mahsul`, `Tahta`, `Taş`, `İnsan`), **Ozan Dede türkü hikâyeleri + MP3 ses URL'si** ve **Haberci görev havuzu** yönetim panelinden düzenlenebilir.

## Çalıştırma ve Yayınlama
- Yerel geliştirme: `npm run dev` (yerel D1 otomatik bağlanır)
- Cloudflare önizleme: `npm run preview`
- Cloudflare yayınlama: `npm run deploy`
