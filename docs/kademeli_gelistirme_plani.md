# Seyrüsefer v3 — 4 Fazlı Yeni Geliştirme Planı (Canlı Harita, 3D Üretim Oyunları ve 10 Özgün Ortaokul Karakteri)

Son güncelleme: 15 Kasım 2026

Bu doküman; kullanıcının istediği tüm yeni mekanikleri 4 sıralı faza böler. **Faz 1 tamamlanmıştır**, sıradaki adım **Faz 2**'dir.

---

## ✅ FAZ 1 — Web Tut-Sürükle, İnşa Sonrası Haritaya Dönüş, Meydan İlk Görev Dava, Sabit İşçi ve Canlı Köy Haritası (TAMAMLANDI)

- [x] **1.1. Web'de Mouse ile Tutarak Sürükleme (Drag-to-Pan) (`KoyHaritasi.js`):**
  - Mobil dokunmatik sürüklemeye ek olarak, bilgisayarda (webde) sol tık basılı tutarak haritayı her yöne akıcı kaydırma (`onMouseDown`, `onMouseMove`, `onMouseUp`, `cursor-grab / cursor-grabbing`) eklendi.
  - Sürükleme sırasında (`> 6px`) yanlışlıkla bina açılmasını önleyen akıllı tıklama kilidi (`onClickCapture`) eklendi.
- [x] **1.2. Mektep İnşası ve Bina Yükseltmelerinde Otomatik Köy Haritasına Dönüş (`Panel.js`, `KoyHaritasi.js`, `RehberKarakter.js`):**
  - Mektep inşa edildiğinde veya herhangi bir bina/konut yükseltildiğinde (`oyun.yukselt(id)`), sayfa içinde kalmak yerine otomatik olarak **Köy Haritasına döner** (`kapat()`).
  - Haritaya dönüldüğünde **Bilge Rehber** otomatik olarak bir sonraki adıma geçer (ör. Mektep kurulunca hemen *"Şimdi Mektep'e girip Günün Hadisini oku!"* der).
- [x] **1.3. Köy Meydanında İlk Görevin Kesinlikle Dava Çözmek Olması (`MekanSahnesi.js`):**
  - Köy Meydanı'nda ilk görev (`cozulenler.length === 0` veya dava görevi tamamlanmamışken) zorunlu olarak **⚖️ Dava Çözmek** olarak sabitlendi.
  - İlk dava çözüldükten sonraki günlerde köye yerleşmek isteyen yeni insanlar (2+ kişi) gelir.
- [x] **1.4. Görevlendirilen İşçinin Oradan Çıkarılamaması (`eylemler.js`, `MekanSahnesi.js`):**
  - Bir köylü Tarla, Orman veya Taş Ocağı'na görevlendirildiğinde oradan geri çekilemez (`-` butonu kaldırıldı, sunucuda da engellendi).
  - Böylece aynı işçiyi önce tarlada kullanıp sonra ormana taşıma suistimali kapatıldı; yeni işçi atamak için köye yeni insan kazandırmak gerekir.
- [x] **1.5. Düz Görsel Yerine Canlı & Hareketli Köy Haritası (`CanliKoyAtmosferi` - `KoyHaritasi.js`):**
  - **En Üst Kısımda Akan Nehir:** Haritanın en üst şeridinde kıvrılarak akan Göksu Nehri, hareketli su akıntıları ve dönen su değirmeni çarkı.
  - **Sallanan Ağaçlar:** Köyün etrafında rüzgârla sağa-sola salınan ağaç kümeleri.
  - **Hafif Rüzgâr & Uçuşan Yapraklar:** Harita üzerinde esen hafif rüzgâr çizgileri ve süzülen yapraklar.
  - **Yürüyen İnsanlar:** Köy nüfusuna göre bina ve patikalar arasında yürüyen köylüler.

---

## ⏳ FAZ 2 — Taş Ocağı 3D Kaya Parçalama & Orman Keşif Haritası (İşçi Başına 2 Sefer Hakkı)

- [ ] **2.1. Bir Noktaya Vurunca Diğerlerinin Kilitlenmesi Sorununun Çözümü (`eylemler.js`, `MekanSahnesi.js`):**
  - Sahadaki 5-6 noktadan birine tıklayınca tüm noktaların birden kilitlenmesi kaldırılacak; her kaya damarı / her sebze parseli / her orman seferi bağımsız çalışacak.
- [ ] **2.2. Taş Ocağı 3D Kaya Kırma & Parçalanma Oyunu (`MekanSahnesi.js`):**
  - Taş ocağında 6 ayrı 3D kaya/cevher damarı yer alacak.
  - Oyuncu kayaya kazma/balyoz vurdukça kaya sarsılacak, üzerinde çatlaklar oluşacak ve 3. vuruşta kaya **parçalanarak taş bloklarına ayrılacak** (3D parçacık dağılma animasyonu).
- [ ] **2.3. Orman Keşif Haritası & İşçi Başına 2 Sefer Hakkı (`eylemler.js`, `MekanSahnesi.js`):**
  - Ormana girildiğinde bölgelere ayrılmış bir **Orman Keşif Haritası** açılacak.
  - Ormanda görevli **her işçi için günlük 2 sefer (arama) hakkı** olacak (`buradakiIsci * 2` hak).
  - Oyuncu haritada rastgele bir bölgeye tıklayıp şansını deneyecek:
    - Şansına **🍂 Kurumuş Ağaç** çıkarsa 3D ağaç kesme sahnesi açılacak; baltayla vurdukça gövde yarılacak, devrilecek ve tahta kazanılacak!
    - Şansına **🌲 Yaş Ağaç / Boş Çalılık** çıkarsa *"Buradaki ağaçlar yemyeşil, yaş ağaca balta vurulmaz!"* uyarısı çıkacak ve kalan sefer hakkıyla başka nokta arayacak.

---

## ⏳ FAZ 3 — Tarla 3D/FPS Sebze Alanı: Kol & İbrikle Sulama ve Meyve/Sebze Toplama Animasyonu

- [ ] **3.1. 6 Ayrı Sebze/Meyve Alanı (`MekanSahnesi.js`):**
  - Tarlada 6 ayrı sebze/meyve parseli olacak (🍅 Domates, 🌾 Buğday, 🥒 Salatalık, 🌶️ Biber, 🍉 Karpuz, 🌽 Mısır).
  - Bir sebze alanına tıklayınca o parselin **yakın çekim 3D/Birinci Şahıs (FPS) görünümü** açılacak ve sadece o parsel işlenecek (diğer 5 parsel kilitlenmeyecek).
- [ ] **3.2. Kol & İbrik Animasyonu (İbrik Aşağıda → İbrik Yukarıda Sulama) + Sebze Toplama Animasyonu:**
  - Yakın çekim sahnede sağ altta oyuncunun **kolu ve elindeki bakır su ibriği** görünecek:
    1. **"💧 Sula"** butonuna (veya fidelerin üzerine) basınca kol yükselir (**İbrik Aşağıda → İbrik Yukarıda eğilerek su dökme animasyonu**), su damlaları toprağa düşer.
    2. Toprak ıslanır ve fideler büyüyerek olgun meyve/sebzelere dönüşür.
    3. **"🧺 Sebzeyi/Meyveyi Topla"** aşamasında oyuncunun eli uzanıp olgunlaşan sebzeleri tek tek sepete toplar (sepete uçma animasyonu) ve mahsul envantere eklenir!

---

## ⏳ FAZ 4 — Ortaokul Seviyesinde 10 Özgün Karakter Görseli (5 Erkek + 5 Kız)

- [ ] **4.1. 5 Özgün Erkek Öğrenci Karakteri (Ortaokul Seviyesi, 11–14 Yaş, Birbirine Benzemeyen):**
  1. `ahmet` — **Ahmet (Takkeli İlim Talebesi):** Beyaz işlemeli takkeli, tebessümlü, mavi cepkenli ortaokul öğrencisi.
  2. `alp` — **Alp (Genç Okçu):** Kayı börklü, deri bileklikli, cesur bakışlı genç çocuk.
  3. `omer` — **Ömer (Genç Çelebi):** Keten gömlekli, kahverengi yelekli, elinde defter/kalem tutan zeki ortaokul öğrencisi.
  4. `yusuf` — **Yusuf (Takkeli Hafız Adayı):** Yeşil takkeli, nur yüzlü, krem cübbeli/yelekli ortaokul öğrencisi.
  5. `kerem` — **Kerem (Genç Zanaatkâr & Seyyah):** Keçe külahlı, kıvırcık saçlı, güler yüzlü, turuncu kuşaklı ortaokul öğrencisi.
- [ ] **4.2. 5 Özgün Kız Öğrenci Karakteri (Ortaokul Seviyesi, 3'ü Başörtülü + 2'si Başörtüsüz, Birbirine Benzemeyen):**
  1. `elif` — **Elif (Başörtülü - 1):** Krem ve turkuaz çiçek motifli başörtülü, tebessümlü ortaokul öğrencisi.
  2. `zeynep` — **Zeynep (Başörtülü - 2):** Bordo/altın nakışlı başörtülü, elinde kitap tutan ortaokul öğrencisi.
  3. `meryem` — **Meryem (Başörtülü - 3):** Zümrüt yeşili şallı, yuvarlak yüzlü, sevecen ortaokul öğrencisi.
  4. `bala` — **Bala (Başörtüsüz - 1):** İki yandan örgülü kahverengi saçlı, çiçek tokalı, geleneksel Anadolu yelekli ortaokul öğrencisi.
  5. `defne` — **Defne (Başörtüsüz - 2):** Dalgalı kestane saçlı, nakışlı mint/kehribar elbiseli, neşeli ortaokul öğrencisi.
- [ ] **4.3. Kayıt Ekranı ve Oyun İçi Karakter Seçicinin 5 Erkek + 5 Kız Karakterle Güncellenmesi (`sabitler.js`, `GirisFormu.js`, `UstBar.js`).**
