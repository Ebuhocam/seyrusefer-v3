# Seyrüsefer v3 — Yeni Köy Düzeni, Rehber ve Tam Ekran Mekanlar Planı

Son güncelleme: 15 Kasım 2026

Bu doküman, oyuncunun oyuna ilk adım attığı andan itibaren yaşayacağı deneyimi, yeni köy yerleşimini, konut/nüfus sistemini, işçi görevlendirmeyi ve tam ekran bina/üretim sahnelerini **6 sıralı kademeye** böler. Her kademe tek tek onaylanıp tamamlanarak ilerlenecektir.

---

## 📌 Temel Tasarım Kararları Özeti

1. **Köy Haritası ve Konut Mahallesi (5+1 Ev):**
   - Oba'nın haritadaki yeri daha heybetli ve merkezi/hakim bir konuma alınacak.
   - Köye yeni insanların yerleşebilmesi için **barınma kapasitesi (Ev)** şart olacak. Barınma yeri yoksa Kıraathane'den yeni insan toplanamayacak.
   - Köyde **1 adet Kendi Evimiz (Yönetici Konağı / Oba)** + **5 adet Köylü Evi Arsası (`ev1`..`ev5`)** olmak üzere **5+1 konut** bulunacak.
   - Evler **maksimum 3 katlı (Seviye 1: 5 kişi, Seviye 2: 10 kişi, Seviye 3: 15 kişi — Seçenek A onaylandı)** olabilecek; her kat çıkıldığında eve **+5 kişi** kapasite eklenecek (toplam 6 konut × 15 = 90 kişiye kadar nüfus kapasitesi).
2. **Mektep İlk Kurulum Kuralı:**
   - Oyuncu oyuna başladığında **Mektep još kurulmadan görev yapamaz**.
   - Bu yüzden **Mektep Seviye 1**, herhangi bir görev şartı aranmadan (başlangıç kaynaklarıyla) oyuncunun **ilk inşa edeceği bina** olacak. Mektep kurulduktan sonra içindeki eğitim görevleri açılacak.
3. **Adım Adım Oyun Rehberi (Daktilo Efektli Karakter):**
   - Oyuna yeni giren çocuğa ne yapacağını ve nereye tıklayacağını gösteren bir **Rehber Karakter** eklenecek.
   - Konuşma metni karakterin yanında **daktilo gibi harf harf** yazılacak, **"İleri"** ve **"Atla ⏭"** butonları bulunacak.
   - Haritada tıklanması gereken bina veya alan **parlayan ok/halka (spotlight)** ile işaretlenecek.
4. **Tam Ekran Mekan Sayfaları (Pop-up Yerine Sahne):**
   - Binalara ve üretim alanlarına tıklandığında küçük bir pop-up yerine **o mekana özel tam ekran sayfa/sahne** açılacak.
5. **Üretim Alanlarında İşçi Görevlendirme & Mini Etkileşimler:**
   - **Tarla, Orman ve Maden/Taş Ocağı**'nda üretim yapılması için köydeki **👥 İnsan** kaynağından işçi görevlendirilmesi gerekecek.
   - Ayrıca her üretim sahnesinde çocuğun sıkılmadan vakit geçireceği mini etkileşimler yer alacak:
     - **🌾 Tarla:** Parselleri sulama ve ekin bakımı yapma
     - **🌲 Orman:** Yaş ağaçları koruyup **kurumuş ağaçları bulup toplama**
     - **⛏️ Maden / Taş Ocağı:** İşaretli kaya damarlarını kırma
6. **Davaların Köy Meydanı'nda Tek Tek Görülmesi:**
   - Halkın davaları tüm liste halinde görünmeyecek.
   - Köylüler sorunlarını **Köy Meydanı**'na getirecek; oyuncu meydana girdiğinde o an bekleyen **tek bir güncel davayı** dinleyip çözecek.

---

## 🚀 Kademeli Uygulama Planı (Adım Adım)

### Kademe 1 — Köy Haritası Görseli, Yeni Oba Yeri ve 5+1 Ev Görselleri ✅ TAMAMLANDI
> **Hedef:** Önce görsel altyapıyı ve harita yerleşimini oturtmak.
- [x] **1.1. Köy Haritası Görselinin (`koy.webp`) Yenilenmesi:**
  - Oba'nın yeri haritanın üst-merkez / hakim taş terasına (`x: 55.2, y: 27.5`) taşındı.
  - Köy içine **5+1 Konut Mahallesi** (`kendi_evim` + `ev1`..`ev5`) için 6 düzenli taş bordürlü parsel alanı açıldı.
  - Mektep (`x: 36.8, y: 46.5`), Kıraathane (`x: 74.2, y: 47.0`), Köy Meydanı (`x: 55.2, y: 54.0`), Görev Panosu, Haberci ve 3 üretim alanı (Tarla, Orman, Maden/Taş Ocağı) net ve tıklanabilir konumlara yerleştirildi.
- [x] **1.2. 3 Katlı Ev Görsellerinin Üretilmesi:**
  - `ev1.webp` (1 Katlı Ahşap/Taş Köy Evi)
  - `ev2.webp` (2 Katlı Cumbalı Köy Evi)
  - `ev3.webp` (3 Katlı Geniş Anadolu Konağı)
- [x] **1.3. Rehber Karakter Görselinin Üretilmesi:**
  - Daktilo balonunun yanında duracak **Bilge Rehber** portresi (`rehber_kapali.webp` / `rehber_acik.webp`).

---

### Kademe 2 — Konut (5+1 Ev) & Barınma Kapasitesi ve Mektep İlk Kurulum Kuralı ✅ TAMAMLANDI
> **Hedef:** Köy ekonomisinin temelini (Ev kapasitesi → İnsan toplama → Mektep kurma) kurallara bağlamak.
- [x] **2.1. Başlangıç Durumu ve Mektep Seviye 1 Kurulumu:**
  - Yeni oyuncu oyuna **Kendi Evim (`kendi_evim: 1`, 5 kişilik başlangıç kapasitesi ve 5 👥 İnsan)** ve **Mektep 1. Seviyeyi hemen kurabilecek başlangıç kaynağı (`150 Mahsul, 150 Tahta`)** ile başlar.
  - **Mektep Seviye 1** için görev şartı kaldırıldı (`ilkKurulumGorevsiz: true`). Mektep 1 kurulmadan eğitim görevleri kilitlidir; kurulduğu anda Level 1 görevleri açılır.
- [x] **2.2. 5+1 Ev ve Nüfus Kapasitesi Sistemi (Seçenek A):**
  - `kendi_evim` + `ev1`, `ev2`, `ev3`, `ev4`, `ev5` arsaları tanımlandı.
  - Her ev Seviye 1'den Seviye 3'e (3 kata) kadar yükseltilebilir ve her kat **+5 👥 İnsan** barınma kapasitesi sağlar (1. Kat: 5, 2. Kat: 10, 3. Kat: 15 → toplam 90 kapasite).
  - **Kapasite Kuralı:** Boş barınma yeri (yatak kapasitesi) olmadan Kıraathane'deki yolculara ev teklif edilemez (`Mevcut İnsan < Toplam Ev Kapasitesi` şartı).

---

### Kademe 3 — Daktilo Efektli Adım Adım Oyun Rehberi (Onboarding)
> **Hedef:** Çocuğun oyuna girdiğinde hiç bocalamadan adım adım oyunu öğrenmesi.
- [ ] **3.1. Rehber Karakter ve Daktilo Konuşma Balonu Bileşeni:**
  - Ekranın alt kısmında Rehber Karakter görünür, metin daktilo sesi/efektiyle harf harf akar.
  - **"Yazıyı Tamamla / İleri →"** ve **"Rehberi Atla ⏭"** butonları bulunur.
- [ ] **3.2. Adım Adım Görevlendirici Ok ve Vurgu (Spotlight):**
  1. **Adım 1:** *"Hoş geldin! Önce köyümüzün ilim yuvası olan **Mektep** arsasını seçip 1. seviyesini inşa edelim."* (Mektep arsası parlar)
  2. **Adım 2:** *"Şimdi **Tarla** ve **Orman**'a gidip köylülerimizi çalışmaya görevlendirelim."* (Tarla ve Orman parlar)
  3. **Adım 3:** *"Mektebimiz hazır! İçine girip ilk hadisimizi okuyalım."* (Mektep parlar)
  4. **Adım 4:** *"Yeni insanlar toplamak için **Ev** inşa etmeyi ve **Kıraathane**'ye uğramayı, halkın davalarını dinlemek için **Köy Meydanı**'na bakmayı unutma!"*

---

### Kademe 4 — Binalar İçin Tam Ekran Sahne / Sayfa Görünümü ve Köy Meydanı Davaları
> **Hedef:** Basit pop-up yerine her binanın kendi atmosferine sahip tam ekran sayfasına girilmesi.
- [ ] **4.1. Tam Ekran Mekan Görünümü (`MekanSahnesi`):**
  - Bir binaya (Mektep, Kıraathane, Köy Meydanı, Oba, Evler) tıklandığında küçük pencere yerine tam ekran iç mekan sayfası açılır. Üstte **"← Köy Haritasına Dön"** butonu yer alır.
- [ ] **4.2. Davaların Köy Meydanı'na Taşınması (Tek Tek Gösterim):**
  - Köy Meydanı sayfasında **"🗣️ Meydan Sohbeti (Gündem Paylaşımı)"** ve **"⚖️ Halkın Davası"** bölümleri yer alır.
  - Davaların tüm listesi görünmez; meydanda o an sadece **sıradaki tek bir köylü ve davası** bekler. Çözüldüğünde köylü teşekkür edip ayrılır, yeni dava sonraki günde/adımda gelir.

---

### Kademe 5 — İşçi Görevlendirme Sistemi (Tarla, Orman, Maden/Taş Ocağı)
> **Hedef:** Köydeki 👥 İnsan kaynağını üretim alanlarında aktif olarak değerlendirmek.
- [ ] **5.1. İşçi Atama Mekanizması:**
  - Köydeki toplam 👥 İnsan nüfusunun bir kısmı **Tarla (Çiftçi)**, **Orman (Oduncu)** ve **Maden/Taş Ocağı (Taş Ustası)** alanlarına `+` / `-` butonlarıyla görevlendirilir.
  - Boşta kalan insanlar yeni inşaatlarda çalışabilir; üretim alanlarında ise **görevlendirilen işçi sayısına göre** saatlik üretim miktarı artar (işçi atanmamış alanda üretim olmaz veya çok az olur).

---

### Kademe 6 — Üretim Alanı İç Mekanları ve Mini Etkileşimler (Sulama, Kurumuş Ağaç, Taş Kırma)
> **Hedef:** Tarla, Orman ve Maden sayfalarını interaktif hale getirmek.
- [ ] **6.1. 🌾 Tarla Sayfası — Sulama Etkileşimi:**
  - Tam ekran tarla görünümünde ekin parselleri yer alır. Kuruyan parsellere tıklayarak **sulama kovasıyla sulama** yapılır; sulanan tarla ekstra mahsul bereketi verir.
- [ ] **6.2. 🌲 Orman Sayfası — Kurumuş Ağaç Bulma Etkileşimi:**
  - Orman sahnesinde yemyeşil ağaçların arasında **kurumuş/devrilmiş ağaçlar** yer alır. Oyuncu yaş ağaçlara dokunmadan kurumuş ağaçları bulup tıklayarak ekstra tahta toplar (yaş ağaca tıklarsa *"Yaş kesen baş keser, sadece kurumuş dalları toplayalım!"* uyarısı çıkar).
- [ ] **6.3. ⛏️ Maden / Taş Ocağı Sayfası — Kaya Kırma Etkileşimi:**
  - Taş ocağı sahnesinde parlayan kaya damarlarına tıklayarak kazma ile taş çıkarma mini etkileşimi yapılır.
