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

## Son Tamamlanan Güncellemeler (Oyun Motoru & 3D Sahne Mimarisi)
1. **Canlı Köy Haritası (`CanliKoySahnesi.js`, `KoyHaritasi.js`):**
   - PixiJS denemesi kaldırılarak orijinal yüksek çözünürlüklü `.webp` harita ve bina katmanlarına dönüldü; SSR/Client hydration uyumsuzluğu tamamen giderildi.
   - Kuzey sınırında gerçek zamanlı **WebGL GLSL su akışı shader'ı (`NehirShaderKatmani`)** ile kıvrımlı akan nehir, su parıltıları ve kıyı köpüğü çalışır.
   - Rüzgârda hafifçe salınan ağaçlar (`KOY_AGACLARI`), yaprak/polen partikülleri ve taş patika ağı (`PATIKA_DUGUMLERI`) üzerinde çok yavaş yürüyüp etrafta oyalanan **2 küçük köylü** (`zIndex = Math.round(y * 2)` derinlik sıralamasıyla binaların önünden/arkasından geçer).
   - **Haberci (`haberci`):** Yarışçı at emojisi kaldırılıp projenin kendi atlı ulak görseli (`/assets/binalar/seyyaherkek.webp`) köy giriş yoluna yerleştirildi.
   - **Geliştirici Sıfırla Butonu (`GelistiriciPaneli.js`, `/api/oyun`):** Tarayıcı iframe engeline takılan `confirm()` yerine satır içi iki adımlı onay (`Evet, Sıfırla` / `Vazgeç`) ve tam sunucu veritabanı temizliği eklendi.
2. **3D Birinci Şahıs (Kendi Gözünden) Köy Meydanı (`KoyMeydani3DSahnesi.js`, `MekanSahnesi.js`):**
   - **Three.js 3D Anadolu Köy Meydanı:** Selçuklu yıldız motifli taş meydan, su damlaları akan taş şadırvan, Ulu Çınar & kilimli sohbet sediri, duyuru kürsüsü, cumbalı köy evleri ve meydan ortasında bekleyen 3D misafir karakterler.
   - **Kendi Gözünden (FPS) Kontroller:** Göz hizası kamerası (`1.65m`), sol altta dokunmatik **mobil sanal joystick**, ekranı sürükleyerek 360° etrafa bakış ve zemine/karakterlere dokununca yanlarına yürüyüp otomatik konuşma başlatma (`Raycaster` tap-to-walk).
3. **Three.js 3D Üretim Mini Oyunları (`UretimOyunlari3D.js`):**
   - **Taş Ocağı:** 6 bağımsız 3D kaya kütlesi, kazma darbeleriyle çatlama ve taş bloklarına parçalanma.
   - **Orman:** İşçi başına günlük 2 keşif seferi hakkı ve kurumuş ağaç çıkarsa 3D baltayla devirme.
   - **Tarla:** 6 bağımsız sebze/meyve parseli, birinci şahıs bakır su ibriğiyle sulama ve elle hasat.
4. **Ortaokul Seviyesinde 10 Özgün Şeffaf Karakter (`public/assets/karakterler/*.webp`, `GirisFormu.js`, `UstBar.js`):**
   - 11–14 yaş seviyesinde şeffaf arka planlı **5 erkek** (`ahmet`, `alp`, `omer`, `yusuf`, `kerem`) ve **5 kız** (3 başörtülü: `elif`, `zeynep`, `meryem`; 2 başörtüsüz: `bala`, `defne`) karakter.

## Çalıştırma ve Yayınlama
- Yerel geliştirme: `npm run dev` (yerel SQLite veritabanı otomatik bağlanır)
- Üretim derlemesi: `npm run build`

