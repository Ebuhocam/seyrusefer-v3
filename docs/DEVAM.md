# Seyrüsefer v3 — Devam Notu (Handoff)

Son güncelleme: 15 Kasım 2026

## Referans dokümanlar
- [kademeli_gelistirme_plani.md](./kademeli_gelistirme_plani.md) — **15 Kasım 2026: Sisli Harita, 24 Saatlik Dolum & 3 Aşamalı Tarla Görselleri, Cinsiyet/Karakter Seçimi, Meydan Diyalog Sistemi ve Çınar Altı Sosyal Medya Planı (TAMAMLANDI ✅)**
- [oyun_tasarim_dokumani.md](./oyun_tasarim_dokumani.md) — oyun kuralları, kaynak ekonomisi, 10 level, bedeller (ONAYLANDI)
- [yol_haritasi.md](./yol_haritasi.md) — teknoloji ve fazlar (ONAYLANDI)

## Temel kararlar ve 3 Katmanlı Dünya Mimarisi
- **3 Katmanlı Harita (`🏡 Köyüm`, `🏕️ Birlik Alanı`, `🗺️ Genel Harita`):**
  1. **1. Katman — Kendi Köyüm (Level 1+):**
     - **Oba (`otag`):** Köy yöneticisinin divanı ve bereket özeti.
     - **Kıraathane (`kiraathane`):**
       - **🎵 Ozan Dede:** Türkülerin tarihini ve hikmetli kıssalarını (`TURKU_HIKAYELERI`) sesli olarak ve ağzı oynayarak (`ozan_kapali.webp` ↔ `ozan_acik.webp` lip-sync) anlatır, öğrenciye gönül ödevi verir.
       - **👥 Yolcular (İnsan Topla):** Belirli aralıklarla Kıraathane'ye ve Köy Meydanı'na uğrayan yolcu/zanaatkâr ailelere (`GOCMEN_ADAYLARI`) köyde ev kurma teklif edilir. Köyün **Huzur (`mutluluk`)** oranına göre teklifi kabul edip köye yerleşirler ve **👥 İnsan (`insan`)** kaynağı artar.
     - **Mektep (`mektep`):** Köyün ilim yuvası (Hadis okuma, ileri sarma korumalı Video dersi ve İlim Sınavı).
     - **Köy Meydanı (`sosyalmeydan`):**
       - Sabit bekleyen NPC'lerle yürüyerek konuşma (baş üstü konuşma balonu + altta daktilo diyalog kutusu), tam ekran karar sonucu kartı ve **24 saatte 1 yeni meydan olayı** (bir gün **⚖️ Köylü Davası**, bir sonraki gün **🏡 Köye Yeni İnsan Daveti**).
       - **🌳 Çınar Altı Sohbeti (Tam Sayfa Sosyal Medya):** Gündem İçi (`+3 😊 Huzur`) ve Gündem Harici (`+1 😊 Huzur`) paylaşımlar, söz/hikâye/dua/hatıra kategorileri, YouTube & Instagram video gömme (`iframe`), **❤️ Beğen (`+1 😊 Huzur`)**, **💬 Yorum Yap**, **🚩 Yöneticiye Şikayet Et** ve **👤 Öğrenci Profili**.
     - **Haberci (`haberci`):** Köye ev içi okuma mektuplarını (`aile`) ve günlük sürpriz iyilik görevlerini (`seyyah`) getirir.
     - **Üretim Alanları (24 Saatte 15 Birim Dolum):** Tarla (`🌾 Mahsul`, 3 aşamalı görsel: `tarla_bos.webp`, `tarla_yari.webp`, `tarla_dolu.webp`), Orman (`🌲 Tahta`), Taş Ocağı (`🧱 Taş`).
  2. **2. Katman — Birlik Alanı / Külliye (Level 4+, `/assets/harita/birlik_alani.webp`):**
     - **Birlik Otağı (`otag`):** Birliğin mesajlaşma/istişare odası (`birlik_mesajlari`) ve ortak vergi/kasa merkezi (`kasa`).
     - **Ulu Cami (`cami`):** Birlik kardeşlerinin ortak 5 vakit namaz çetelesi ve maneviyat merkezi.
     - **Birlik Medresesi (`medrese`)**, **Vergi & Takas Merkezi (`takasmerkezi`)**, **Cenk & Yarışma Çadırı (`oyuncadiri`)**.
  3. **3. Katman — Genel Sancak Haritası (Level 6+, `/assets/harita/genel_harita.webp`):**
     - 6 stratejik sancak bölgesi (`BOLGELER`).
- **4 Temel Kaynak + Dinamik Köy Huzuru (`mutluluk`):**
  - `🌾 Mahsul` (`erzak`), `🌲 Tahta` (`kereste`), `🧱 Taş` (`tas`), `👥 İnsan` (`insan`) + `😊 Huzur` (`%0–%100`).
  - Köy Huzuru her 12 saatte `-2` kendiliğinden azalır (`25` tabanına kadar); dava çözerek (`+4`), Çınar Altı'nda gündem paylaşımı yaparak (`+3`), beğeni alarak (`+1`) ve günlük görev yaparak (`+2`) artırılır.
- **Teknoloji:** Next.js 16 (App Router, JS) + Tailwind 4 → Cloudflare (OpenNext) + D1 (`seyrusefer-v3-db`, `e23293e1-7e9a-4ce1-b319-6fe0eec32a45`).
- Canlı eski sisteme (`Desktop\seyrusefer\seyrusefer-app`, `seyrusefer.org`) **dokunulmaz**.

## Son Tamamlanan Güncellemeler (15 Kasım 2026)
1. **Harita Etrafına Sisli Keşif Alanı & Bilge Rehber Tanıtım Modu (`KoyHaritasi.js`, `RehberKarakter.js`):**
   - Harita etrafına sisli çerçeve (`px-[18vw] py-[28dvh]`) eklendi; en alttaki **Haberci** rehber açıkken bile rahatça yukarı kaydırılıp görülüyor.
   - Rehberin `tanitim` bölümünde `"👇 Buraya Tıkla!"` oku ve `"Binaya Git"` butonu kaldırıldı; kamera ilgili alanı yatay+dikey ortalar ve sadece **"İlerle →"** butonuyla tanıtım yapılır.
2. **Ev İçi Yetim/Öksüz Çocuk Hassasiyeti (`MekanSahnesi.js`):**
   - Ev İçi sahnesinde anne/baba/kardeş NPC'leri gelmez; **"📣 Yanıma Çağır"** butonuna basınca **"✅ Çağırdım"** butonu çıkar ve doğrudan mektup okuma ekranı açılır.
3. **Kayıtta Cinsiyet & Karakter Seçimi + Oyun İçi Karakter Değiştirme (`GirisFormu.js`, `UstBar.js`, `sabitler.js`):**
   - Kayıtta kız/erkek seçimi ve karakter kartları (`alp`, `celebi`, `bala`, `elif`) eklendi; üst bardan oyun içinde de her zaman değiştirilebilir.
4. **24 Saatte 15 Birim Kaynak Dolumu, Harita Dolum Çubuğu, 3 Aşamalı Tarla Görseli ve Hover Efekti (`kurallar.js`, `eylemler.js`, `KoyHaritasi.js`, `MekanSahnesi.js`):**
   - 15 kaynak 24 saate bölündü (1 işçiyle 96 dakikada 1 birim). `0/15` iken toplama yapılamaz; hem haritada hem sahnede `%Doluluk (X/15)` görünür.
   - Tarla doluluğuna göre `tarla_bos.webp`, `tarla_yari.webp`, `tarla_dolu.webp` görselleri gösterilir; Tarla, Orman ve Taş Ocağı üzerine mouse gelince diğer binalar gibi öne gelir (`hover:-translate-y-1.5 hover:scale-110`).
5. **Köy Meydanı Sabit Karakterler, Yürüyerek Diyalog, Tam Ekran Sonuç ve Günde 1 Olay (`MekanSahnesi.js`, `GorevlerEkrani.js`):**
   - Meydandaki karakterler sabit bekler; yanlarına yürüyünce konuşma balonu + altta daktilo diyalog kutusu açılır, konuşma bitince karar ekranına geçilir ve karar sonrası tam ekran sonuç kartı (`"✅ Tamam"`) gösterilir.
   - Olay çözülünce karakterler kaybolur ve 24 saat sonra yeni olay gelir (bir gün **⚖️ Dava**, bir gün **🏡 Köye Yeni İnsan Daveti**).
6. **Tam Sayfa Çınar Altı Sosyal Medya (`GorevlerEkrani.js`, `/api/meydan/route.js`):**
   - Pop-up yerine tam sayfa sosyal medya düzeni; Gündem İçi (`+3 😊 Huzur`) ve Serbest (`+1 😊 Huzur`) paylaşım, söz/hikâye/dua/hatıra/YouTube & Instagram video paylaşımı, beğeni (`+1 😊 Huzur`), yorum, yöneticiye şikayet ve öğrenci profili.

## Çalıştırma ve Yayınlama
- Yerel geliştirme: `npm run dev` (yerel D1 otomatik bağlanır)
- Cloudflare önizleme: `npm run preview`
- Cloudflare yayınlama: `npm run deploy`
