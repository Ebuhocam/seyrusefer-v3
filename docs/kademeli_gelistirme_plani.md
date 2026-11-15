# Seyrüsefer v3 — Sisli Harita, 24 Saatlik Dolum & Tarla Görselleri, Cinsiyet/Karakter Seçimi, Meydan Diyalog Sistemi ve Çınar Altı Sosyal Medya Planı

Son güncelleme: 15 Kasım 2026 (TAMAMLANDI ✅)

Bu doküman; kullanıcının istediği tüm yeni mekanikleri 6 sıralı adıma böler ve tamamlanan durumu özetler:

---

## 🚀 Sıralı Uygulama Planı (Tamamlandı)

### Adım 1 — Harita Etrafına Sisli Alan (Overscroll) & Bilge Rehber Tanıtım Turu Düzenlemesi
- [x] **1.1. Harita Etrafında Sisli Keşif Alanı (`KoyHaritasi.js`):**
  - Harita tuvalinin dört bir yanına (`px-[18vw] py-[28dvh]`) sisli orman ve bulut dokusu eklendi; oyuncu haritayı kenarlara doğru biraz daha kaydırabiliyor.
  - Bu sayede altta **Bilge Rehber** penceresi açıkken bile en alttaki **Haberci (`y: 88.5%`)** rahatça yukarı kaydırılıp tam görünüyor.
- [x] **1.2. Bilge Rehber Tanıtım Kısmı Sadeleştirmesi (`RehberKarakter.js`, `KoyHaritasi.js`):**
  - Rehberin **1. Bölüm: Köy Tanıtım Turu (`bolum === "tanitim"`)** adımlarında haritada **"👇 Buraya Tıkla!"** oku gösterilmez ve rehber kutusunda **"🚪 Binaya Git / Görevi Aç"** butonu çıkmaz.
  - Tanıtım turunda sadece kamera ilgili alana yumuşakça odaklanır (`scrollTo` ile hem yatay hem dikey ortalar) ve oyuncu yalnızca **"İlerle →"** (veya **Geri / Atla**) butonuyla köyü tanır.
  - **"👇 Buraya Tıkla!"** oku ve **"Mekana Git"** butonu yalnızca **2. Bölüm: Yapılacak İşler (`bolum === "gorev"`)** kısmında devreye girer.

---

### Adım 2 — Ev İçi Aile Çağırma Hassasiyeti (Yetim/Öksüz Çocuk Hassasiyeti)
- [x] **2.1. Ev İçinde Karakter Gelmemesi ve "Çağırdım" Butonu (`MekanSahnesi.js`):**
  - Anne veya babası olmayan çocukların üzülmemesi için Ev İçi sahnesinde kapıdan Baba/Anne/Kardeş karakterleri **yürümez ve görünmez**.
  - Mektup Haberci'den alındıktan sonra Ev İçi sahnesinde önce **"📣 Yanıma Çağır"** butonu yer alır; buna tıklanınca **"✅ Çağırdım"** butonu açılır ve tıklanınca doğrudan mektup okuma penceresine geçilir.

---

### Adım 3 — Kayıtta Cinsiyet & Karakter Seçimi ve Oyun İçi Karakter Değiştirme
- [x] **3.1. Kız ve Erkek Öğrenci Karakterleri (`sabitler.js`, `public/assets/karakterler/`):**
  - **Kız Öğrenci Karakterleri:**
    1. `bala` — **Bala Hatun** (`/assets/karakterler/kiz_bala.webp`)
    2. `elif` — **Elif Bacı (İlim Talebesi)** (`/assets/karakterler/kiz_elif.webp`)
  - **Erkek Öğrenci Karakterleri:**
    1. `alp` — **Genç Alp** (`/assets/karakterler/erkek_alp.webp`)
    2. `celebi` — **Genç Çelebi (İlim Talebesi)** (`/assets/karakterler/erkek_celebi.webp`)
- [x] **3.2. Kayıt Ekranında Cinsiyet ve Karakter Seçimi (`GirisFormu.js`, `/api/auth/kayit`):**
  - Yeni köy kurarken öğrenciye **Cinsiyet (`Erkek Öğrenci` / `Kız Öğrenci`)** sorulur ve seçtiği cinsiyete uygun karakter kartlarından istediğini seçer.
- [x] **3.3. Oyun İçinde Karakter Değiştirme (`UstBar.js`, `MekanSahnesi.js`):**
  - Üst bardaki oyuncu karakter rozetine tıklandığında açılan **Karakter Seçim Penceresi** ile öğrenci dilediği zaman karakterini değiştirebilir.
  - Tüm 2D sahnelerde (Ev İçi, Köy Meydanı, Tarla, Orman, Taş Ocağı) ve Çınar Altı sosyal medyada öğrencinin seçtiği karakter görseli yer alır.

---

### Adım 4 — 24 Saatlik Kaynak Dolumu (15 Birim / 24 Saat), Doluluk Oranı ve 3 Aşamalı Tarla Görseli
- [x] **4.1. 24 Saatte 15 Birim Dolum Kurgusu (`kurallar.js`, `eylemler.js`, `MekanSahnesi.js`):**
  - Saha üretimi (Tarla, Orman, Taş Ocağı) 10 dakika yerine **24 saatte 15 birim (`15/15`, yani 1 işçiyle her 96 dakikada `1` birim)** dolacak şekilde çalışır (işçi çarpanıyla hızlanır).
  - Eğer henüz hiç kaynak birikmemişse (`0 / 15`, `%0`), oyuncu hiçbir şey toplayamaz / sulayamaz; ekranda **anlık dolum yüzdesi (`%0..%100`)** ve bir sonraki birime kalan dakika görünür.
  - Eğer örneğin `1/15` veya `5/15` birikmişse, oyuncu sahada tam o kadar birimi sulayıp/kesip toplayabilir!
- [x] **4.2. Köy Haritasında Dolum Oranı, 3 Aşamalı Tarla Görseli ve Orman/Tarla Hover Efekti (`KoyHaritasi.js`, `public/assets/binalar/`):**
  - Köy haritasında Tarla, Orman ve Taş Ocağı üzerinde **dolum oranı çubuğu (`%Doluluk` ve `X/15`)** sürekli görünür.
  - **Tarla Görselleri:**
    - Tamamen boşken (`0/15`): `tarla_bos.webp` (Sürülmüş boş toprak)
    - Birazı doluyken (`1..14/15`): `tarla_yari.webp` (Yeşil filizli yarı dolu tarla)
    - Tamamı doluyken (`15/15`): `tarla_dolu.webp` (Altın başaklı tam dolu tarla)
  - Tarla, Orman ve Taş Ocağı da diğer binalar gibi üzerine fare (mouse) getirildiğinde **hafif öne gelme / büyüme (`hover:-translate-y-1.5 hover:scale-110`)** efektine sahiptir.

---

### Adım 5 — Köy Meydanı: Sabit Bekleyen Karakterler, Diyalog Kutusu, Tam Ekran Karar Sonucu ve Günlük Olay (Dava veya Yeni İnsan Daveti)
- [x] **5.1. Sabit Bekleme ve Yanlarına Gidince Konuşma (`KoyMeydaniSahnesi`):**
  - Meydandaki karakterler sağa sola yürümez; sabit noktalarında beklerler.
  - Oyuncu karakterini onların yanına götürdüğünde (veya onlara tıkladığında), karakter yanlarına yürür ve **başlarının üstünde konuşma balonu + altta Rehber gibi daktilo diyalog kutusu** açılır!
  - Konuşma tamamlandığında **"⚖️ Karar Ekranına Geç"** veya **"🏡 Ev Teklifi Ekranına Geç"** butonuyla seçim ekranı açılır.
- [x] **5.2. Tam Ekran Karar Sonucu Ekranı:**
  - Karar verildiğinde üstteki küçük bildirim yerine **karar ekranı büyüklüğünde geniş, detaylı bir Sonuç Ekranı** açılır (Huzur değişimi, köylülerin tepkisi, hikmetli ders) ve **"✅ Tamam"** butonuna basınca kapanır.
- [x] **5.3. Günde 1 Meydan Olayı (Bitince Kaybolma + Bazen Dava, Bazen Yeni İnsan Daveti):**
  - Meydandaki olay (dava veya göçmen daveti) çözüldüğünde karakterler meydandan ayrılır/kaybolur! Hemen peşinden yenisi gelmez; **bir sonraki oyun günü (24 saat sonra)** yeni olay gelir (`sonMeydanOlayZamani`).
  - Meydana her gün sadece dava gelmez; sırayla bir gün anlaşmazlığı olan köylüler (**⚖️ Köylü Davası**), bir sonraki gün ise köye yerleşmek isteyen yeni aileler (**🏡 Köye Yeni İnsan Daveti**) meydanda bekler!

---

### Adım 6 — Çınar Altı Sohbeti: Tam Sayfa Sosyal Medya Düzeni ve Dinamik Köy Huzuru Mekaniği
- [x] **6.1. Pop-up Yerine Tam Sayfa Sosyal Medya (`GorevlerEkrani.js`, `MekanSahnesi.js`):**
  - Köy Meydanı'nda **Çınar Altı Sohbeti**'ne tıklandığında küçük modal yerine **tam ekran sosyal medya sayfası** açılır (`← Köy Meydanı'na Dön`).
- [x] **6.2. Gündem İçi ve Gündem Harici Paylaşım + Söz/Hikâye/YouTube/Instagram Video:**
  - İlk levelın gündem konusu küçük çocukların da kolayca katılabileceği şekilde (*"Beğendiğin güzel bir sözü, kısa bir hikâyeyi, bir duayı veya bir iyilik fikrini kardeşlerinle paylaş"*) olarak güncellendi ve tek tıkla ilham şablonları eklendi.
  - Öğrenciler paylaşım yaparken tür ve kategori seçebilir:
    - **📌 Gündem İçi Paylaşım** → Paylaşıldığında **Köy Huzuru `+3 😊`** artar!
    - **💬 Gündem Harici (Serbest Paylaşım)** → Paylaşıldığında **Köy Huzuru `+1 😊`** artar (`✨ Güzel Söz`, `📖 Kısa Hikâye / Kıssa`, `🤲 Dua & Dilek`, `💭 Hatıra`, `🎬 Video Paylaşımı`).
    - **🎬 Video Paylaşımı (YouTube veya Instagram Linki)** → Paylaşılan YouTube ve Instagram videoları akış içinde gömülü (`iframe`) olarak izlenebilir.
- [x] **6.3. Beğeni (+Huzur), Yorum, Yöneticiye Şikayet ve Öğrenci Profili (`/api/meydan`):**
  - **❤️ Beğen:** Her beğeni paylaşımı yapan öğrencinin **Köy Huzurunu `+1 😊`** artırır!
  - **💬 Yorum Yap:** Paylaşımların altına yorum yazma.
  - **🚩 Yöneticiye Şikayet Et:** Uygunsuz paylaşımları sebep seçerek yöneticiye bildirme (`meydan_sikayetler`).
  - **👤 Profile Git:** Paylaşım yapan öğrencinin adına/karakterine tıklanınca o öğrencinin **Köy Seviyesi, Seçtiği Karakter, Toplam Beğenisi ve Tüm Paylaşımlarını** gösteren profil sayfası açılır.
- [x] **6.4. Dinamik Köy Huzuru (Mutluluk) Mekaniği:**
  - Köy Huzuru zamanla (her 12 saatte `-2`, en az `25`'e kadar) kendiliğinden hafifçe azalır; yüksek tutmak için meydanda dava çözmek (`+4`), gündem paylaşımı yapmak (`+3`), beğeni almak (`+1`) ve günlük görev yapmak (`+2`) gerekir.
