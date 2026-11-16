# Seyrüsefer v3 — 4 Fazlı Yeni Geliştirme Planı (Canlı Harita, 3D Üretim Oyunları ve 10 Özgün Ortaokul Karakteri)

Son güncelleme: 15 Kasım 2026

Bu dokümandaki **tüm 4 faz eksiksiz olarak tamamlanmıştır (✅)**.

---

## ✅ FAZ 1 — Canlı Köy Haritası (WebGL GLSL Nehir, Derinlik Sıralı Ağaçlar & Patika Köylüleri) (TAMAMLANDI)

- [x] **1.1. Web'de Mouse ile Tutarak Sürükleme (Drag-to-Pan) (`KoyHaritasi.js`):**
  - Sol tık basılı tutarak haritayı her yöne akıcı kaydırma ve sürükleme sırasında yanlış bina açılmasını önleyen akıllı tıklama kilidi.
- [x] **1.2. İnşa Sonrası Otomatik Haritaya Dönüş & Rehber Geçişi (`Panel.js`, `KoyHaritasi.js`, `RehberKarakter.js`):**
  - Bina inşası/yükseltmesi tamamlandığında otomatik olarak Köy Haritasına dönüş ve Bilge Rehber'in sıradaki adıma ilerlemesi.
- [x] **1.3. Canlı 2.5D / WebGL Köy Haritası (`CanliKoySahnesi.js`, `KoyHaritasi.js`):**
  - **WebGL GLSL Nehir Shader Katmanı:** Kuzey nehir yatağında özel GLSL fragment shader ile gerçek su akışı, köpük kıvrımları, güneş parıltısı (specular highlight) ve dönen ahşap su değirmeni çarkı.
  - **Derinlik Sıralı Sallanan Ağaçlar & Polen/Yaprak Partikülleri:** Rüzgâr fiziğiyle salınan katmanlı ağaçlar, esen rüzgâr çizgileri ve uçuşan yaprak/polen partikülleri.
  - **Taş Patika Rotalarında Yürüyen Eklemli Köylü Sprite'ları:** Şeffaf arka planlı, bacak-kol yürüme animasyonlu köylü figürleri yalnızca köyün taş patika düğüm grafı (`PATIKA_DUGUMLERI`) üzerinde yürür ve `y` koordinatına göre (`zIndex: Math.round(y)`) binaların ve ağaçların önünden/arkasından doğru derinlikle geçer.

---

## ✅ FAZ 2 — Taş Ocağı 3D Kaya Parçalama & Orman Keşif Haritası (İşçi × 2 Sefer Hakkı) (TAMAMLANDI)

- [x] **2.1. Bağımsız Saha Noktaları & Kalıcı İşçi Kuralı (`kurallar.js`, `eylemler.js`, `oyunDeposu.js`):**
  - Tek noktaya tıklayınca diğer noktaların kilitlenmesi kaldırıldı; 6 tarla parseli ve 6 taş ocağı kayası birbirinden bağımsız çalışır ve yenilenir.
  - Bir üretim alanına (Tarla, Orman, Taş Ocağı) görevlendirilen işçi kalıcıdır, geri çıkarılamaz.
- [x] **2.2. Taş Ocağı 3D Kaya Parçalama Oyunu (`TasOcagi3DSahnesi` — `UretimOyunlari3D.js`):**
  - Sahada 6 ayrı 3D çok-yüzlü kaya kütlesi ve cevher damarı yer alır.
  - 3D kazma darbeleriyle kaya sarsılır, üzerinde 3D çatlaklar büyür ve 3. darbede yerçekimi fiziğiyle taş bloklarına parçalanarak dağılır (`+Taş`).
- [x] **2.3. Orman Keşif Haritası & 3D Kurumuş Ağaç Kesimi (`OrmanKesifVeKesimSahnesi` — `UretimOyunlari3D.js`):**
  - Ormanda görevli her işçi için günlük **2 keşif seferi hakkı** (`işçiSayısı × 2`) tanımlandı.
  - 12 bölgeli keşif haritasında arama yapılır: şansa **🍂 Kurumuş Ağaç** çıkarsa 3D baltayla kesip devirme sahnesi açılır (`+Tahta`), **🌲 Yaş Ağaç** çıkarsa kesilmez.

---

## ✅ FAZ 3 — Tarla Birinci Şahıs (FPS / 3D) Bakır İbrikle Sulama ve Elle Toplama Oyunu (TAMAMLANDI)

- [x] **3.1. 6 Bağımsız Sebze/Meyve Parseli (`TARLA_PARSELLERI` — `sabitler.js`, `UretimOyunlari3D.js`):**
  - Domates, Buğday, Salatalık, Biber, Karpuz ve Mısır parsellerinin her biri bağımsız çalışır.
- [x] **3.2. Birinci Şahıs (FPS) 3D Kol, Bakır Su İbriği ve Elle Hasat (`TarlaFPS3DSahnesi` — `UretimOyunlari3D.js`):**
  - Parsel seçildiğinde 3D yakın çekim FPS sahnesi açılır; sağ önde oyuncunun 3D kolu ve elindeki Anadolu bakır su ibriği görünür.
  - **"İbrik Aşağıda → İbrik Yukarıda Eğilerek Su Dökme"** animasyonuyla 3D su damlaları kuru toprağı ıslatır, fideler büyüyüp olgun sebze/meyvelere dönüşür.
  - Ardından 3D el uzanarak olgunlaşan mahsulleri tek tek hasat sepetine toplar (`+Mahsul`).

---

## ✅ FAZ 4 — Ortaokul Seviyesinde 10 Özgün Karakter Görseli (5 Erkek + 5 Kız) (TAMAMLANDI)

- [x] **4.1. 5 Özgün Erkek Öğrenci Karakteri (`public/assets/karakterler/*.webp` — Şeffaf Arka Plan):**
  - `ahmet` (Takkeli İlim Talebesi), `alp` (Börklü Genç Okçu), `omer` (Kalem Ehli Genç Çelebi), `yusuf` (Yeşil Takkeli Hafız Adayı), `kerem` (Külahlı Genç Seyyah).
- [x] **4.2. 5 Özgün Kız Öğrenci Karakteri (`public/assets/karakterler/*.webp` — Şeffaf Arka Plan):**
  - 3 Başörtülü: `elif` (Hikmet Talebesi), `zeynep` (Kitap Dostu Talebe), `meryem` (Şefkatli İlim Yolcusu).
  - 2 Başörtüsüz: `bala` (Cesur Oba Kızı), `defne` (Genç Anadolu Zanaatkârı).
- [x] **4.3. Kayıt, Üst Bar ve Oyun İçi Sahnelere Entegrasyon (`GirisFormu.js`, `UstBar.js`, `MekanSahnesi.js`, `GorevlerEkrani.js`):**
  - Eski hazır erkek/kız görselleri kaldırıldı; 10 şeffaf karakter görseli kayıt ekranına, üst bardaki karakter değiştiriciye ve tüm oyun içi sahnelere entegre edildi.
