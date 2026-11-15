# Seyrüsefer v3 — 2D Canlı Mekan Sahneleri, Ev İçi, Meydan Yürüyüş Motoru ve Rehber Planı

Son güncelleme: 15 Kasım 2026

Bu doküman; binalara ve üretim alanlarına tıklandığında açılan **2D İnteraktif Oyun Sahnelerini** (Ev İçi, Köy Meydanı Yürüyüş Motoru, Tarlada Sulama, Ormanda Ağaç Kesme), **Haberci → Ev İçi Aile Okuması** akışını, **Oba'nın yeni harita konumunu** ve **Bilge Rehber'in önce köyü tanıtıp sonra görev yaptırma** sistemini sıralı adımlara böler.

---

## 🚀 Sıralı Uygulama Planı

### Adım 1 — Haritada Oba Konumu Düzeltmesi ve Bilge Rehber (Önce Tanıtım Turu → Sonra Görevler + Çoklu Ok + Haberci)
- [x] **1.1. Oba Konumunun Yukarı Taşınması (`sabitler.js`):**
  - Haritadaki Oba (`otag`), üstteki taş kale terasının tam ortasına oturacak şekilde daha yukarı (`x: 55.2, y: 20.5`) taşınır.
- [x] **1.2. Bilge Rehber'de Çoklu Hedef Vurgusu (`hedefler` dizisi):**
  - Rehber bir adımı anlatırken aynı anda birden fazla nokta (ör. **hem Tarla hem Orman hem Taş Ocağı**, veya **tüm 5+1 Evler**) üzerinde **"👇 Buraya Tıkla!"** oku gösterebilir.
- [x] **1.3. Bilge Rehber 2 Aşamalı Akış (Önce Köy Tanıtımı → Sonra Yapılacak Görevler):**
  - **Bölüm 1 — Köy Tanıtım Turu (7 Kısa Adım):**
    1. **Oba:** Hakim tepedeki yönetim ve depo merkezimiz.
    2. **Mektep:** İlim, hadis, video ve sınav yuvamız.
    3. **Kıraathane:** Ozan Dede'nin türkü anlattığı ve yolcuların geldiği mekan.
    4. **Köy Meydanı:** Köylülerin yürüdüğü, sohbet ettiği ve davalarını getirdiği meydan.
    5. **5+1 Ev Mahallesi:** Kendi Evimiz (ev içi aile okuması) ve yeni insanlar için 3 katlı konut arsaları.
    6. **Tarla, Orman ve Taş Ocağı:** İşçi görevlendirme, sulama, ağaç kesme ve taş çıkarma alanlarımız (**Tarla + Orman + Taş Ocağı birlikte vurgulanır**).
    7. **Haberci ve Görev Panosu:** Köy kapısına mektup getiren Haberci ve ortadaki Görev Panosu (**Haberci + Pano birlikte vurgulanır**).
  - **Bölüm 2 — Şimdi Yapacaklarımız (Adım Adım Görev Yönlendirmesi):**
    - Tanıtım bitince çocuğa sırasıyla ne yapacağını yaptırır:
      1. **Mektep 1. Seviyeyi İnşa Et**
      2. **Tarlada Ekin Sula & Ormanda Kurumuş Ağaç Kes (İşçi Görevlendir)**
      3. **Haberci'den Aile Mektubunu Al → Kendi Evine Girip Aile Bireylerini Odaya Çağır**
      4. **Mektep'te Günün Hadisini Oku**
      5. **Köy Meydanı'nda Yürüyen Köylülerin Davasını Çöz**

---

### Adım 2 — 2D Mekan İçi Görsellerinin Üretilmesi (`public/assets/mekanlar/`)
- [x] **2.1. `ev_ici.webp` (Anadolu Ev İçi Sahnesi):**
  - Sedirler, Anadolu kilimi, pencereden görünen köy manzarası, ortada rahle/sehpa ve aile bireylerinin oturacağı minderler.
- [x] **2.2. `meydan_sahne.webp` (Köy Meydanı 2D Sahnesi):**
  - Arnavut kaldırımlı geniş meydan zemini, taş çeşme, ulu çınar ağacı ve köylülerin ileri-geri yürüyebileceği sahne alanı.
- [x] **2.3. `tarla_sahne.webp` (Tarla 2D Sahnesi):**
  - Su kuyusu, sulama arkı ve üzerinde sulama yapılacak 6 ekin parseli alanı.
- [x] **2.4. `orman_sahne.webp` (Orman 2D Sahnesi):**
  - Yeşil çam/meşe ağaçları ve kesilecek kurumuş ağaçların yer aldığı orman açıklığı sahnesi.

---

### Adım 3 — 2D Canlı Sahne ve Yürüyüş Motoru (`Köy Meydanı` & Karakter Hareketi)
- [x] **3.1. 2D Sahne ve Yürüyüş Motoru (`src/components/koy/MekanSahnesi.js`):**
  - Oyuncu mekana girdiğinde **kendisini sahnenin içinde** görür; sahnede tıkladığı noktaya doğru oyuncu karakteri yürür!
  - Etrafında köylü karakterleri (`NPC`) kendi hızlarında ileri-geri yürür, bazen durup etrafa bakar ve konuşma balonları çıkarır.
- [x] **3.2. Köy Meydanı'nda Canlı Olay ve Dava Sahnesi:**
  - Köy Meydanı'na tıklandığında oyuncu kendisini meydanda bulur.
  - Meydanda bir dava/olay varsa, iki köylü başlarının üzerinde **"⚖️ Davamız Var! (Bize Tıkla)"** balonuyla ileri-geri yürür; oyuncu onlara tıkladığında yanlarına yürür ve tekil dava penceresi açılır!

---

### Adım 4 — Ev İçi Sahnesi (`Kendi Evim`), Haberci Mektup Hatırlatması ve Aile Bireylerini Çağırma
- [x] **4.1. Haberci'den Mektubu Teslim Alma (`mektupAlindi`):**
  - Haberci'ye tıklandığında oyuncu **"📬 Aile Mektubunu Haberci'den Teslim Al"** butonuna basarak mektubu alır ve *"Mektubu aldın! Şimdi Kendi Evine gidip aile bireylerini odaya çağırarak birlikte okuyabilirsiniz."* mesajı çıkar.
- [x] **4.2. 2D Ev İçi Sahnesi (`Kendi Evim` ve Konutlar):**
  - Evin içine girildiğinde `ev_ici.webp` sahnesi açılır; oyuncu karakteri odanın içindedir (üst sekmeden **🔨 Kat Çık / Yükselt** ekranına da geçilebilir).
  - **Hatırlatma Sistemi:** Eğer Haberci'de bekleyen bir mektup varsa ve oyuncu henüz Haberci'den teslim almadıysa, evin içinde uyarı balonu görünür: *"📬 Haberci köy kapısına yeni bir Aile Mektubu getirdi! Önce Haberci'ye gidip mektubu teslim almalısın."* (Tek tıkla Haberci'ye gitme butonuyla).
  - **Aile Bireylerini Çağırma:** Mektup alındıysa oyuncu odadaki **"👨‍👩‍👧‍👦 Aile Bireylerini Odaya Çağır"** butonuna tıklar → Anne, Baba ve Kardeş karakterleri kapıdan yürüyerek odaya girip sedirlere yerleşir! Ardından mektup açılır ve ailece okunup görev tamamlanır.

---

### Adım 5 — Tarlada Sulama, Ormanda Ağaç Kesme, Taş Ocağında Kaya Kırma ve İşçi Görevlendirme
- [x] **5.1. İşçi (👥 İnsan) Görevlendirme Sistemi (`eylemler.js`, `oyunDeposu.js`):**
  - Oyuncu köydeki `👥 İnsan` nüfusunu **Tarla (Çiftçi)**, **Orman (Oduncu)** ve **Taş Ocağı (Taş Ustası)** sahnelerinde `+` / `-` ile görevlendirir. Görevlendirilen işçi sayısı saatlik üretimi doğrudan artırır!
- [x] **5.2. 🌾 Tarla 2D Sahnesi — Ekin Sulama Oyunu:**
  - `tarla_sahne.webp` üzerinde **6 adet ekin parseli** ve çalışan çiftçiler görünür.
  - Kurumuş/susamış parsellere tıkladığında oyuncu karakteri parselin yanına yürür, **💧 Sulama Kovası** animasyonuyla sular, ekinler yeşerip başak verir ve tüm parseller sulandığında **anında `+15 🌾 Mahsul`** kazanılır!
- [x] **5.3. 🌲 Orman 2D Sahnesi — Kurumuş Ağaç Kesme Oyunu:**
  - `orman_sahne.webp` üzerinde çalışan oduncular, **canlı yeşil ağaçlar** ve **kurumuş kahverengi ağaçlar** yer alır.
  - Kurumuş ağaca tıkladığında oyuncu ağacın yanına yürür, **🪓 Balta** ile 3 vuruşta ağacı kesip **anında `+15 🌲 Tahta`** toplar! Yaş ağaca tıklarsa *"🌱 Yaş kesen baş keser! Sadece kurumuş ağaçları keselim."* uyarısı çıkar.
- [x] **5.4. ⛏️ Taş Ocağı 2D Sahnesi — Kaya Kırma Oyunu:**
  - Taş ocağı sahnesinde çalışan taş ustaları ve parlayan kaya damarları yer alır; tıklayarak **⛏️ Kazma** ile taş kırılır ve **`+12 🧱 Taş`** kazanılır.
