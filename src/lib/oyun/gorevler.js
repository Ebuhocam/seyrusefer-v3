// =============================================================
// SEYRÜSEFER v3 — LEVEL GÖREVLERİ VE EĞİTSEL İÇERİKLER (Faz 4)
// Görevler kaynak VERMEZ; bina yükseltme izni ve level ilerlemesi sağlar.
// Faz 5'te Admin Level Tasarım Merkezi ile veritabanından düzenlenebilecek.
// =============================================================

export const NAMAZ_VAKITLERI = [
  { kod: "sabah", ad: "Sabah", ikon: "🌅" },
  { kod: "ogle", ad: "Öğle", ikon: "☀️" },
  { kod: "ikindi", ad: "İkindi", ikon: "🌤️" },
  { kod: "aksam", ad: "Akşam", ikon: "🌇" },
  { kod: "yatsi", ad: "Yatsı", ikon: "🌙" },
];

export const GOREV_TURLERI = {
  hadis: { ad: "Günlük Hadis", ikon: "📖", yer: "Mektep / Medrese" },
  video: { ad: "Gündem Videosu", ikon: "🎬", yer: "Mektep / Medrese" },
  aile: { ad: "Haberci Aile Mektubu", ikon: "✉️", yer: "Haberci" },
  namaz: { ad: "Namaz Çetelesi", ikon: "🕌", yer: "Ulu Cami / Pano" },
  sinav: { ad: "İlim Sınavı", ikon: "✍️", yer: "Mektep / Medrese" },
  turku: { ad: "Ozan Dede Türküsü", ikon: "🎵", yer: "Kıraathane" },
  dava: { ad: "Köy Meydanı Halk Davası", ikon: "⚖️", yer: "Köy Meydanı" },
  meydan_paylasim: { ad: "Meydan Paylaşımı", ikon: "💬", yer: "Köy Meydanı" },
  meydan_yorum: { ad: "Kardeş Yorumu", ikon: "🤝", yer: "Köy Meydanı" },
  seyyah: { ad: "Haberci İyilik Görevi", ikon: "📜", yer: "Haberci" },
  onay: { ad: "Özel Görev / Etkinlik", ikon: "✨", yer: "Görev Panosu" },
};

// Her level için görev listesi ve hangi bina hedefinin anahtarı olduğu
export const LEVEL_GOREVLERI = {
  1: [
    { kod: "hadis", tur: "hadis", ad: "Mektep'te 3 Günlük Hadis Oku", hedef: 3, gunluk: true, bina: "mektep" },
    {
      kod: "video",
      tur: "video",
      ad: "Niyet ve İhlas Videosunu İzle",
      hedef: 1,
      gunluk: false,
      bina: "mektep",
      // Video, 2. günün hadisiyle birlikte açılır
      onKosul: { kod: "hadis", enAz: 2, metin: "Bu video, Mektep'te 2. günün hadisini okuyunca açılır." },
    },
    { kod: "aile", tur: "aile", ad: "Haberci'nin Aile Mektuplarını 3 Gün Oku", hedef: 3, gunluk: true, binaIcinEnAz: 1, bina: "kiraathane" },
    { kod: "turku", tur: "turku", ad: "Kıraathane'de Ozan Dede'yi Dinle", hedef: 1, gunluk: false, bina: null },
  ],
  2: [
    { kod: "namaz", tur: "namaz", ad: "5 Gün Boyunca En Az Bir Vakit Namaz Kıl", hedef: 5, gunluk: true, bina: "sosyalmeydan" },
    { kod: "hadis", tur: "hadis", ad: "Mektep'te 5 Günlük Hadis Oku", hedef: 5, gunluk: true, bina: "sosyalmeydan" },
    { kod: "dava", tur: "dava", ad: "Köy Meydanı'nda 1 Halk Sorununu Hikmetle Çöz", hedef: 1, gunluk: false, bina: "sosyalmeydan" },
    { kod: "aile", tur: "aile", ad: "Haberci'nin Mektuplarını 3 Gün Ailece Oku", hedef: 3, gunluk: true, binaIcinEnAz: 1, bina: "sosyalmeydan" },
  ],
  3: [
    { kod: "sinav", tur: "sinav", ad: "Mektep Hadis ve İlim Sınavı", hedef: 1, gunluk: false, bina: "otag" },
    { kod: "meydan_paylasim", tur: "meydan_paylasim", ad: "Birlik Meydanı'nda (Çınar Altı) İlk Paylaşımını Yap", hedef: 1, gunluk: false, bina: "otag" },
    { kod: "dava", tur: "dava", ad: "Köy Meydanı'nda Halkın 1 Davasını Çöz", hedef: 1, gunluk: false, bina: "otag" },
    { kod: "hadis", tur: "hadis", ad: "3 Günlük Hadis Oku", hedef: 3, gunluk: true, bina: "otag" },
  ],
  4: [
    { kod: "namaz", tur: "namaz", ad: "5 Gün Boyunca En Az Bir Vakit Namaz Kıl", hedef: 5, gunluk: true, bina: "mektep" },
    { kod: "meydan_paylasim", tur: "meydan_paylasim", ad: "Kardeşlik Gündemine Paylaşım Yap", hedef: 1, gunluk: false, bina: "mektep" },
    { kod: "seyyah", tur: "seyyah", ad: "Haberci'nin 2 İyilik Görevini Yap", hedef: 2, gunluk: true, bina: "mektep" },
    { kod: "turku", tur: "turku", ad: "Ozan Dede'den Kardeşlik Türküsünü Dinle", hedef: 1, gunluk: false, bina: "mektep" },
  ],
  5: [
    { kod: "seyyah", tur: "seyyah", ad: "Haberci'nin 3 İyilik Görevini Yap", hedef: 3, gunluk: true, bina: "kiraathane" },
    { kod: "hadis", tur: "hadis", ad: "5 Günlük Hadis Oku", hedef: 5, gunluk: true, bina: "kiraathane" },
    { kod: "sinav", tur: "sinav", ad: "Dürüstlük ve Ahlak Sınavı", hedef: 1, gunluk: false, bina: "sosyalmeydan" },
    { kod: "meydan_yorum", tur: "meydan_yorum", ad: "Çınar Altı'nda 3 Paylaşıma Yorum Yap", hedef: 3, gunluk: false, bina: "sosyalmeydan" },
    { kod: "dava", tur: "dava", ad: "Köy Meydanı'nda Dürüstlük Davasını Çöz", hedef: 1, gunluk: false, bina: "kiraathane" },
  ],
  6: [
    { kod: "seyyah", tur: "seyyah", ad: "Haberci'nin 3 Yardım Görevini Yap", hedef: 3, gunluk: true, bina: "mektep" },
    { kod: "namaz", tur: "namaz", ad: "5 Gün Boyunca En Az Bir Vakit Namaz Kıl", hedef: 5, gunluk: true, bina: "mektep" },
    { kod: "video", tur: "video", ad: "İnfak ve Yardımseverlik Videosu", hedef: 1, gunluk: false, bina: "otag" },
    { kod: "aile", tur: "aile", ad: "Haberci Mektupları: Paylaşmanın Bereketi (3 Gün)", hedef: 3, gunluk: true, binaIcinEnAz: 1, bina: "otag" },
  ],
  7: [
    { kod: "hadis", tur: "hadis", ad: "5 Günlük Hadis Oku", hedef: 5, gunluk: true, bina: "kiraathane" },
    { kod: "turku", tur: "turku", ad: "Ozan Dede Sıla-i Rahim Türküsü", hedef: 1, gunluk: false, bina: "kiraathane" },
    { kod: "aile", tur: "aile", ad: "Aile Büyükleriyle 3 Gün Mektup Okuma", hedef: 3, gunluk: true, binaIcinEnAz: 1, bina: "sosyalmeydan" },
    { kod: "meydan_paylasim", tur: "meydan_paylasim", ad: "Aile Gündemine Paylaşım Yap", hedef: 1, gunluk: false, bina: "sosyalmeydan" },
  ],
  8: [
    { kod: "namaz", tur: "namaz", ad: "7 Gün Boyunca En Az Bir Vakit Namaz Kıl", hedef: 7, gunluk: true, bina: "mektep" },
    { kod: "hadis", tur: "hadis", ad: "5 Günlük Hadis Oku", hedef: 5, gunluk: true, bina: "mektep" },
    { kod: "dava", tur: "dava", ad: "Köy Meydanı'nda Sabır ve Kanaat Davasını Çöz", hedef: 1, gunluk: false, bina: "mektep" },
    { kod: "aile", tur: "aile", ad: "Haberci Mektupları: Sabır ve Şükür (3 Gün)", hedef: 3, gunluk: true, binaIcinEnAz: 1, bina: "mektep" },
  ],
  9: [
    { kod: "sinav", tur: "sinav", ad: "Adalet ve Emanet İlim Sınavı", hedef: 1, gunluk: false, bina: "kiraathane" },
    { kod: "hadis", tur: "hadis", ad: "5 Günlük Hadis Oku", hedef: 5, gunluk: true, bina: "kiraathane" },
    { kod: "meydan_paylasim", tur: "meydan_paylasim", ad: "Adalet Gündemine Paylaşım Yap", hedef: 1, gunluk: false, bina: "sosyalmeydan" },
    { kod: "meydan_yorum", tur: "meydan_yorum", ad: "3 Kardeşinin Paylaşımına Yorum Yap", hedef: 3, gunluk: false, bina: "sosyalmeydan" },
  ],
  10: [
    { kod: "namaz", tur: "namaz", ad: "7 Gün Boyunca En Az Bir Vakit Namaz Kıl", hedef: 7, gunluk: true, bina: "otag" },
    { kod: "hadis", tur: "hadis", ad: "5 Günlük Hadis Oku", hedef: 5, gunluk: true, bina: "otag" },
    { kod: "sinav", tur: "sinav", ad: "Büyük İhsan ve Mezuniyet Sınavı", hedef: 1, gunluk: false, bina: "otag" },
    { kod: "aile", tur: "aile", ad: "Haberci Mektupları: İhsan ve Ahit (3 Gün)", hedef: 3, gunluk: true, binaIcinEnAz: 1, bina: "otag" },
    { kod: "meydan_paylasim", tur: "meydan_paylasim", ad: "Mezuniyet Tefekkürünü Paylaş", hedef: 1, gunluk: false, bina: "otag" },
  ],
};

// Her level için sahih hadisler, video özeti, aile mektubu, meydan sorusu ve sınav soruları
export const LEVEL_ICERIKLERI = {
  1: {
    hadisler: [
      { metin: "Ameller niyetlere göredir. Herkese ancak niyet ettiği şey vardır.", kaynak: "Buhârî, Bed'ü'l-Vahy, 1" },
      { metin: "Allah sizin dış görünüşlerinize ve mallarınıza bakmaz; ancak kalplerinize ve amellerinize bakar.", kaynak: "Müslim, Birr, 34" },
      { metin: "Nerede olursan ol, Allah'a karşı sorumluluğunun bilincinde ol! Kötülüğün peşinden iyi bir şey yap ki onu yok etsin.", kaynak: "Tirmizî, Birr, 55" },
    ],
    video: {
      baslik: "Niyet: Her Yolculuğun İlk Adımı",
      ozet: "Yapılan küçük bir iyiliği büyük kılan şey halis niyettir. Köyümüzü kurarken niyetimizi Allah rızası ve güzel ahlak üzere yeniliyoruz.",
      sureSn: 15,
    },
    aile: {
      baslik: "Ev Halkımızla Okuma Mektubu: Niyet ve İhlas",
      metin:
        "Sevgili büyüklerim ve ev halkımız, bugün Seyrüsefer yolculuğuna başladım. Peygamber Efendimiz (s.a.v.) 'Ameller niyetlere göredir' buyuruyor. Yaptığımız her güzel işi birbirimize sevgiyle ve Allah'ın rızasını kazanmak niyetiyle yapmaya söz verelim.",
      soru: "Yanındaki büyüklerinle veya sevdiklerinle konuş: Günlük hayatta sıradan bir işi (sofra kurmak, ders çalışmak, selam vermek) güzel bir niyetle ibadete nasıl dönüştürebiliriz?",
    },
    gundemSorusu:
      "Beğendiğin güzel bir sözü, kısa bir hikâyeyi, bir duayı veya bugün öğrendiğin bir iyiliği paylaşır mısın?",
    sinav: [],
  },
  2: {
    hadisler: [
      { metin: "Cennetin anahtarı namaz, namazın anahtarı ise abdesttir.", kaynak: "Tirmizî, Tahâret, 1" },
      { metin: "Kulun kıyamet gününde hesaba çekileceği ilk ameli namazdır.", kaynak: "Tirmizî, Mevâkît, 188" },
      { metin: "Birinizin kapısının önünden bir nehir aksa ve onda günde beş defa yıkansa kirinden eser kalır mı? İşte beş vakit namaz da böyledir.", kaynak: "Buhârî, Mevâkît, 6" },
      { metin: "Bizi sevindiren ve gözümüzün nuru kılınan şey namazdır.", kaynak: "Nesâî, İşretü'n-Nisâ, 1" },
      { metin: "Allah'a en sevimli gelen amel, vaktinde kılınan namazdır.", kaynak: "Buhârî, Mevâkît, 5" },
    ],
    video: {
      baslik: "Günde Beş Vakit Huzur Durağı",
      ozet: "Namaz, günün telaşı içinde Rabbimizle buluşma ve kalbimizi dinlendirme vaktidir.",
      sureSn: 15,
    },
    aile: {
      baslik: "Ailene Mektup: Evimizin Huzuru Namaz",
      metin:
        "Peygamberimiz (s.a.v.) beş vakit namazı kapımızın önünden akan tertemiz bir nehre benzetiyor. Bu hafta ailece en az bir vakit namazı birlikte cemaatle kılmaya veya birbirimize namaz vakitlerini tatlı dille hatırlatmaya ne dersiniz?",
      soru: "Evde namazları vaktinde kılmak için birbirimize nasıl destek olabiliriz?",
    },
    gundemSorusu: "Namaz kıldıktan sonra kalbinde hissettiğin huzuru nasıl tarif edersin?",
    sinav: [],
  },
  3: {
    hadisler: [
      { metin: "Kim ilim öğrenmek için bir yola çıkarsa, Allah ona cennet yolunu kolaylaştırır.", kaynak: "Müslim, Zikir, 39" },
      { metin: "Hikmet müminin yitiğidir; onu nerede bulursa alır.", kaynak: "Tirmizî, İlim, 19" },
      { metin: "Ya öğreten, ya öğrenen, ya dinleyen ya da ilmi seven ol; beşincisi olma, helak olursun.", kaynak: "Dârimî, Mukaddime, 26" },
    ],
    video: {
      baslik: "Faydalı İlim ve Hikmet",
      ozet: "Öğrendiklerimiz davranışa dönüştüğünde hikmet olur.",
      sureSn: 15,
    },
    aile: {
      baslik: "Ailene Mektup: İlim Meclisi",
      metin:
        "Bu hafta Otağımızda küçük bir ilim halkası kuralım. Peygamberimiz (s.a.v.) 'Kim ilim için yola çıkarsa Allah ona cennet yolunu kolaylaştırır' buyuruyor.",
      soru: "Aile büyüklerine sor: Çocukluklarında öğrendikleri ve hayat boyu unutmadıkları en güzel öğüt nedir?",
    },
    gundemSorusu: "Bu zamana kadar okuduğun hadislerden seni en çok etkileyen hangisi oldu ve neden?",
    sinav: [
      {
        soru: "'Ameller niyetlere göredir' hadis-i şerifi bize öncelikle neyi öğretir?",
        secenekler: [
          "İbadet ve iyiliklerin değerinin kalpteki samimi niyete bağlı olduğunu",
          "Sadece büyük işlerin önemli olduğunu",
          "Niyetin hiç önemli olmadığını",
          "İyilikleri herkesin görmesi gerektiğini",
        ],
        dogru: 0,
      },
      {
        soru: "Peygamberimiz (s.a.v.) günde beş vakit namazı neye benzetmiştir?",
        secenekler: [
          "Yüksek bir dağa",
          "Kapının önünden akan ve insanı temizleyen bir nehre",
          "Uzun bir çöl yolculuğuna",
          "Büyük bir saraya",
        ],
        dogru: 1,
      },
      {
        soru: "İlim öğrenmek için yola çıkan kimseye Allah neyi kolaylaştırır?",
        secenekler: ["Zengin olmayı", "Cennet yolunu", "Ünlü olmayı", "Ticaret yapmayı"],
        dogru: 1,
      },
    ],
  },
  4: {
    hadisler: [
      { metin: "Mümin, müminin aynasıdır ve mümin, müminin kardeşidir.", kaynak: "Ebû Dâvûd, Edeb, 49" },
      { metin: "Allah katında arkadaşların en hayırlısı, arkadaşına karşı hayırlı davranandır.", kaynak: "Tirmizî, Birr, 28" },
      { metin: "İman etmedikçe cennete giremezsiniz, birbirinizi sevmedikçe de iman etmiş olmazsınız.", kaynak: "Müslim, Îmân, 93" },
    ],
    video: { baslik: "Kardeşlik ve Birlik Ruhu", ozet: "Müminler birbirini tamamlayan bir binanın taşları gibidir.", sureSn: 15 },
    aile: {
      baslik: "Ailene Mektup: Dostluk ve Kardeşlik",
      metin: "Mümin cana yakındır. Peygamberimiz aramızda selamı yaymamızı ve birbirimizi Allah için sevmemizi öğütlüyor.",
      soru: "Ailemizde ve arkadaş çevremizde kırgınlıkları önlemek için nelere dikkat etmeliyiz?",
    },
    gundemSorusu: "Gerçek bir dostta bulunması gereken en önemli özellik sence nedir?",
    sinav: [],
  },
  5: {
    hadisler: [
      { metin: "Doğruluktan ayrılmayın! Çünkü doğruluk iyiliğe, iyilik de cennete götürür.", kaynak: "Buhârî, Edeb, 69" },
      { metin: "Müslüman, dilinden ve elinden insanların selâmette olduğu kişidir.", kaynak: "Nesâî, İman, 8" },
      { metin: "Bizi aldatan bizden değildir.", kaynak: "Müslim, Îmân, 164" },
      { metin: "Kardeşinle tartışmaya girme, kırıcı şakalaşma ve yerine getiremeyeceğin sözü verme.", kaynak: "Tirmizî, Birr, 58" },
      { metin: "Güvenilir ve dürüst tüccar; peygamberler, sıddıklar ve şehitlerle beraberdir.", kaynak: "Tirmizî, Büyû', 4" },
    ],
    video: { baslik: "Muhammedü'l-Emin'in İzinde Dürüstlük", ozet: "Sözümüzün ve özümüzün bir olması en büyük sermayemizdir.", sureSn: 15 },
    aile: {
      baslik: "Ailene Mektup: Doğruluk Emanettir",
      metin: "Peygamber Efendimiz daha peygamber olmadan önce bile 'El-Emin' (en güvenilir insan) olarak tanınırdı.",
      soru: "Zor durumda kalsak bile doğruyu söylemenin bize kazandırdığı huzuru konuşalım.",
    },
    gundemSorusu: "Dürüstlüğün toplumda güveni nasıl inşa ettiğine dair bir örnek paylaşır mısın?",
    sinav: [
      {
        soru: "Peygamber Efendimize (s.a.v.) dürüstlüğü ve güvenilirliği sebebiyle verilen lakap nedir?",
        secenekler: ["El-Emin", "El-Faruk", "Zinnureyn", "Esedullah"],
        dogru: 0,
      },
      {
        soru: "'Müslüman, dilinden ve elinden insanların ........ olduğu kişidir.' boşluğuna ne gelmelidir?",
        secenekler: ["Korktuğu", "Çekindiği", "Selâmette (güvende)", "Uzak"],
        dogru: 2,
      },
    ],
  },
  6: {
    hadisler: [
      { metin: "Kim bir Müslümanın dünya sıkıntılarından bir sıkıntıyı giderirse, Allah da onun kıyamet günündeki sıkıntılarından birini giderir.", kaynak: "Ebû Dâvûd, Edeb, 60" },
      { metin: "Veren el, alan elden üstündür. Tebessüm sadakadır.", kaynak: "Buhârî, Zekât, 18" },
      { metin: "İnsanların en hayırlısı, insanlara en faydalı olandır.", kaynak: "Taberânî, el-Mu'cemü'l-Evsat" },
    ],
    video: { baslik: "Yardımseverlik ve İyilik Yarışı", ozet: "Paylaştıkça çoğalan tek hazine iyiliktir.", sureSn: 15 },
    aile: {
      baslik: "Ailene Mektup: Paylaşmanın Bereketi",
      metin: "Kul kardeşinin yardımında olduğu sürece Allah da onun yardımcısı olur. Bu hafta ailece bir ihtiyaç sahibini veya komşumuzu sevindirelim.",
      soru: "Evimizden paylaşabileceğimiz bir ikram veya yapabileceğimiz ortak bir iyilik belirleyelim.",
    },
    gundemSorusu: "Hiç beklemediğin bir anda gördüğün bir iyiliği veya yardımı anlatır mısın?",
    sinav: [],
  },
  7: {
    hadisler: [
      { metin: "Rızkının genişlemesini ve ömrünün bereketlenmesini isteyen kimse akrabasını gözetip ziyaret etsin.", kaynak: "Buhârî, Edeb, 12" },
      { metin: "Rabbin rızası anne babanın rızasında, öfkesi de anne babanın öfkesindedir.", kaynak: "Tirmizî, Birr, 3" },
      { metin: "Küçüklerimize merhamet etmeyen, büyüklerimize saygı göstermeyen bizden değildir.", kaynak: "Tirmizî, Birr, 15" },
      { metin: "Sizin en hayırlınız, ailesine karşı en hayırlı olanınızdır.", kaynak: "Tirmizî, Menâkıb, 63" },
      { metin: "Teyze, anne makamındadır; amca da baba makamındadır.", kaynak: "Buhârî, Sulh, 6" },
    ],
    video: { baslik: "Aile ve Sıla-i Rahim", ozet: "Akraba ve büyüklerimizi arayıp sormak gönül köprülerini yaşatır.", sureSn: 15 },
    aile: {
      baslik: "Ailene Mektup: Büyüklerimizin Hayır Duası",
      metin: "Bu hafta dedemizi, ninemizi veya uzaktaki bir akrabamızı ailece arayıp halini hatırını soralım, hayır dualarını alalım.",
      soru: "Hangi aile büyüğümüzü ziyaret edeceğiz veya telefonla arayıp sevindireceğiz?",
    },
    gundemSorusu: "Aile büyüklerinden duyduğun bir hatırayı veya dua cümlesini bizimle paylaşır mısın?",
    sinav: [],
  },
  8: {
    hadisler: [
      { metin: "Müminin durumu ne hoştur! Her hali kendisi için hayırlıdır: Sevindirici bir şey gelirse şükreder, sıkıntı gelirse sabreder.", kaynak: "Müslim, Zühd, 64" },
      { metin: "İnsanlara teşekkür etmeyen, Allah'a da şükretmiş olmaz.", kaynak: "Tirmizî, Birr, 35" },
      { metin: "Gerçek sabır, musibetin ilk anında gösterilendir.", kaynak: "Buhârî, Cenâiz, 32" },
      { metin: "Sabır aydınlıktır.", kaynak: "Müslim, Tahâret, 1" },
      { metin: "Kim sabretmek isterse Allah ona sabır verir. Hiç kimseye sabırdan daha hayırlı ve geniş bir nimet verilmemiştir.", kaynak: "Buhârî, Zekât, 50" },
    ],
    video: { baslik: "Sabır ve Şükür İki Kanat", ozet: "Nimetlere şükür, zorluklara sabır müminin iki kanadıdır.", sureSn: 15 },
    aile: {
      baslik: "Ailene Mektup: Şükür Sofrası",
      metin: "İnsanlara teşekkür etmeyen Allah'a şükretmiş olmaz. Bugün ailemizdeki herkese bizim için yaptıkları iyilikler için tek tek teşekkür edelim.",
      soru: "Hayatımızda şükretmemiz gereken ama bazen unuttuğumuz üç büyük nimeti sayalım.",
    },
    gundemSorusu: "Bugün seni şükretmeye sevk eden üç güzel nimeti yazar mısın?",
    sinav: [],
  },
  9: {
    hadisler: [
      { metin: "Hepiniz çobansınız ve hepiniz güttüğünüz sürüden sorumlusunuz.", kaynak: "Buhârî, Cuma, 11" },
      { metin: "Adaletli davrananlar, Allah katında nurdan minberler üzerindedir.", kaynak: "Müslim, İmâre, 18" },
      { metin: "Sana emanet bırakan kimseye emanetini tastamam geri ver.", kaynak: "Ebû Dâvûd, Büyû', 79" },
      { metin: "Zulümden sakının; çünkü zulüm kıyamet gününde karanlıklardır.", kaynak: "Müslim, Birr, 56" },
      { metin: "İnsanlara merhamet etmeyene Allah da merhamet etmez.", kaynak: "Buhârî, Tevhîd, 2" },
    ],
    video: { baslik: "Adalet ve Emanet Bilinci", ozet: "Bedenimiz, zamanımız ve çevremiz bize verilmiş birer emanettir.", sureSn: 15 },
    aile: {
      baslik: "Ailene Mektup: Emanet Bilinci",
      metin: "Sözümüz, eşyalarımız ve birbirimizin kalbi bize emanettir.",
      soru: "Okulda ve evde bize verilen emanetleri nasıl daha iyi koruyabiliriz?",
    },
    gundemSorusu: "Günlük hayatta adaleti ve hakkı gözetmek sence neden önemlidir?",
    sinav: [
      {
        soru: "Bir kimsenin bize bıraktığı eşyayı veya sırrı korumaya ne ad verilir?",
        secenekler: ["Emanet", "Ganimet", "Şöhret", "Rekabet"],
        dogru: 0,
      },
      {
        soru: "Müminin sevindiğinde şükretmesi, sıkıntı anında sabretmesi onun için nasıl sonuçlanır?",
        secenekler: ["Her iki hali de kendisi için hayır olur", "Sadece sevindiğinde kazanır", "Hiçbir faydası olmaz", "Zaman kaybı olur"],
        dogru: 0,
      },
    ],
  },
  10: {
    hadisler: [
      { metin: "İhsan, Allah'ı görüyormuşsun gibi O'na kulluk etmendir; çünkü sen O'nu görmesen de O seni görmektedir.", kaynak: "Buhârî, Îmân, 37" },
      { metin: "Allah, birinizin yaptığı işi en güzel ve sağlam şekilde yapmasından hoşnut olur.", kaynak: "Taberânî, el-Mu'cemü'l-Evsat" },
      { metin: "Allah'a en sevimli gelen amel, az da olsa devamlı olanıdır.", kaynak: "Buhârî, Rikâk, 18" },
      { metin: "Kolaylaştırınız, zorlaştırmayınız; müjdeleyiniz, nefret ettirmeyiniz.", kaynak: "Buhârî, İlim, 11" },
      { metin: "Ben güzel ahlakı tamamlamak için gönderildim.", kaynak: "Muvatta', Hüsnü'l-Huluk, 8" },
    ],
    video: { baslik: "İhsan: Her An Allah'ın Huzurunda", ozet: "Yaptığımız her işi en güzel şekilde yapmak ihsan makamıdır.", sureSn: 15 },
    aile: {
      baslik: "Ailene Mektup: İhsan ve Mezuniyet Ahdi",
      metin: "Seyrüsefer yolculuğunun 10. durağına ulaştık. 'Allah'a en sevimli amel az da olsa devamlı olanıdır.' Kazandığımız bu güzel alışkanlıkları hayat boyu sürdürmeye ailece söz verelim.",
      soru: "Bu 10 level boyunca ailemizde ve hayatımızda en çok hangi güzel alışkanlık kök saldı?",
    },
    gundemSorusu: "Seyrüsefer yolculuğu sana neler kattı? Arkadaşlarına bırakmak istediğin mezuniyet mesajın nedir?",
    sinav: [
      {
        soru: "'Allah'ı görüyormuşçasına O'na kulluk etmek' hangi kavramla ifade edilir?",
        secenekler: ["İhsan", "İsraf", "İnad", "İhmalkârlık"],
        dogru: 0,
      },
      {
        soru: "Hadis-i şerife göre Allah'a en sevimli gelen amel hangisidir?",
        secenekler: [
          "Sadece yılda bir kez yapılan",
          "Az da olsa devamlı (sürekli) yapılan",
          "Gösteriş için yapılan",
          "İnsanları yoran amel",
        ],
        dogru: 1,
      },
      {
        soru: "Peygamber Efendimiz (s.a.v.) gönderiliş gayesini nasıl özetlemiştir?",
        secenekler: [
          "Güzel ahlakı tamamlamak için",
          "Büyük binalar yapmak için",
          "Servet biriktirmek için",
          "Sadece savaşmak için",
        ],
        dogru: 0,
      },
    ],
  },
};

export const SEYYAH_GOREVLERI = [
  "Bugün evdeki büyüklerine veya sevdiklerine hiç beklemedikleri bir anda 'İyi ki varsınız' de ve bir işe yardım et.",
  "Bugün okulda veya mahallede uzun zamandır konuşmadığın bir arkadaşına güler yüzle selam verip halini hatırını sor.",
  "Bugün sokaktaki bir kedi veya kuş için bir kap su ve yiyecek bırak.",
  "Bugün yemekten sonra sofrayı toplamaya gönüllü olarak yardım et ve yemeği hazırlayana teşekkür et.",
  "Bugün bir arkadaşının güzel bir özelliğini fark edip onu samimiyetle takdir et.",
  "Bugün odanı ve çalışma masanı kimse söylemeden tertemiz düzenle.",
  "Bugün bir aile büyüğünü (dede, nine, amca, teyze) telefonla arayıp hayır duasını al.",
];

/** Oyun saatine (ms) göre Türkiye saatiyle (UTC+3) YYYY-AA-GG gün dizgesi. Günlük görevler TSİ gece yarısı yenilenir. */
export const oyunGunu = (simdiMs) => new Date(simdiMs + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** Görevin ön koşulu (ör. "önce 2 gün hadis oku") sağlanmadıysa { kilitli: true, kilitNotu } döner */
export function onKosulDurumu(tanim, ilerlemeHaritasi = {}, gorevlerTamamBayragi = false) {
  const k = tanim?.onKosul;
  if (!k || gorevlerTamamBayragi) return { kilitli: false };
  const ilerleme = Number(ilerlemeHaritasi?.[k.kod]?.ilerleme ?? 0);
  return ilerleme >= (Number(k.enAz) || 1) ? { kilitli: false } : { kilitli: true, kilitNotu: k.metin ?? "Bu görev henüz açılmadı." };
}

/** Öğrencinin kendi beyanıyla (tek dokunuşla) ilerletebileceği görev türleri. Diğerleri sunucuda kendi eylemiyle ilerler. */
export const BEYAN_GOREV_TURLERI = ["hadis", "video", "aile", "turku", "seyyah", "onay"];

/** Bir levelın aktif görev tanımlarını döner (yönetici panelinden özelleştirilmişse onu kullanır) */
export function levelGorevTanimlari(level, ayarlar = null) {
  const ozel = ayarlar?.levellar?.[level]?.gorevler;
  return Array.isArray(ozel) ? ozel : LEVEL_GOREVLERI[level] ?? [];
}

/** Bir levelın aktif eğitsel içeriğini döner (yönetici panelinden özelleştirilmişse onu kullanır) */
export function levelIcerigi(level, ayarlar = null) {
  const varsayilan = LEVEL_ICERIKLERI[level] ?? LEVEL_ICERIKLERI[1];
  const ozel = ayarlar?.levellar?.[level]?.icerik;
  if (!ozel) return varsayilan;
  return {
    hadisler: Array.isArray(ozel.hadisler) ? ozel.hadisler : varsayilan.hadisler,
    video: ozel.video ? { ...varsayilan.video, ...ozel.video } : varsayilan.video,
    aile: ozel.aile ? { ...varsayilan.aile, ...ozel.aile } : varsayilan.aile,
    gundemSorusu: ozel.gundemSorusu ?? varsayilan.gundemSorusu,
    sinav: Array.isArray(ozel.sinav) ? ozel.sinav : varsayilan.sinav,
  };
}

/** Oyun gününe göre deterministik Seyyah görevi seçer */
export function gununSeyyahGorevi(simdiMs, ayarlar = null) {
  const havuz =
    Array.isArray(ayarlar?.seyyahGorevleri) && ayarlar.seyyahGorevleri.length > 0
      ? ayarlar.seyyahGorevleri
      : SEYYAH_GOREVLERI;
  const gun = oyunGunu(simdiMs);
  let toplam = 0;
  for (let i = 0; i < gun.length; i++) toplam = (toplam * 31 + gun.charCodeAt(i)) >>> 0;
  return havuz[toplam % havuz.length];
}

/**
 * Bir levelın görev listesini oyuncunun ilerlemesiyle birleştirir.
 */
export function levelGorevListesi(
  level,
  ilerlemeHaritasi = {},
  gorevlerTamamBayragi = false,
  simdiMs = Date.now(),
  ayarlar = null
) {
  const tanimlar = levelGorevTanimlari(level, ayarlar);
  const bugun = oyunGunu(simdiMs);
  return tanimlar.map((t) => {
    const kayit = ilerlemeHaritasi[t.kod];
    const yapilan = gorevlerTamamBayragi ? t.hedef : Math.min(t.hedef, kayit?.ilerleme ?? 0);
    const tamam = yapilan >= t.hedef;
    const bugunYapildi = !gorevlerTamamBayragi && t.gunluk && kayit?.sonGun === bugun;
    return { ...t, yapilan, tamam, bugunYapildi, ...onKosulDurumu(t, ilerlemeHaritasi, gorevlerTamamBayragi) };
  });
}

/**
 * Bir binanın o leveldaki yükseltmesi için gereken görevlerin tamamlanıp tamamlanmadığını döner.
 */
export function binaGorevleriTamamMi(
  level,
  binaId,
  ilerlemeHaritasi = {},
  gorevlerTamamBayragi = false,
  ayarlar = null
) {
  if (gorevlerTamamBayragi) return true;
  const liste = levelGorevListesi(level, ilerlemeHaritasi, false, Date.now(), ayarlar);
  const binaGorevleri = liste.filter((g) => g.bina === binaId);
  const kontrol = binaGorevleri.length > 0 ? binaGorevleri : liste;
  // Çok günlük bir görev (ör. 3 gün aile mektubu) bina şartı olarak "binaIcinEnAz" kez yapılınca yeterli sayılır
  return kontrol.every((g) => binaSartiTamamMi(g));
}

/** Bir görev, bağlı olduğu binanın inşa / yükseltme şartı olarak karşılandı mı? */
export function binaSartiTamamMi(g) {
  if (g.tamam) return true;
  return g.binaIcinEnAz != null && (g.yapilan ?? 0) >= g.binaIcinEnAz;
}

/** Leveldaki tüm görevler tamamlandı mı? */
export function tumLevelGorevleriTamamMi(level, ilerlemeHaritasi = {}, gorevlerTamamBayragi = false, ayarlar = null) {
  if (gorevlerTamamBayragi) return true;
  return levelGorevListesi(level, ilerlemeHaritasi, false, Date.now(), ayarlar).every((g) => g.tamam);
}

// =============================================================
// GÜNÜN MEKTUBU — Haberci her gün yeni bir mektup getirir.
// Bir levelın ilk mektubu o levelın kendi aile mektubudur (admin panelinden düzenlenir);
// sonraki günlerde bu havuzdan sırayla gelir. Her mektupta ailece konuşulacak bir soru vardır.
// =============================================================
export const GUNLUK_MEKTUPLAR = [
  {
    baslik: "Günün Mektubu: Sofradaki Bereket",
    metin:
      "Sevgili ev halkım, bugün sofraya hep birlikte oturalım. Yemeğe besmeleyle başlayıp şükürle kalkmak, ekmeğin kırıntısını bile israf etmemek sofrayı bereketlendirir. Sofrayı kuran ve toplayan eller ne güzel ellerdir.",
    soru: "Bu akşam sofrayı kurarken ve toplarken kim hangi işi üstlenebilir?",
  },
  {
    baslik: "Günün Mektubu: Güler Yüz",
    metin:
      "Güler yüz, hiç para harcamadan verilebilen en güzel hediyedir. Kapıda karşılanan bir misafire, yorgun gelen bir babaya, işten dönen bir anneye gülümsemek evin havasını değiştirir.",
    soru: "Bugün evde kimin yüzünü güldürdünüz? Yarın kimi sevindirmek istersiniz?",
  },
  {
    baslik: "Günün Mektubu: Büyüklerimizin Hatıraları",
    metin:
      "Dedelerimizin ve ninelerimizin çocukluğu nasıldı? Hangi oyunları oynarlardı, bayramları nasıl geçerdi? Büyüklerimizin hatıraları ailemizin hazinesidir; dinledikçe çoğalır.",
    soru: "Evin büyüklerinden biri, çocukluğundan bir bayram hatırasını anlatabilir mi?",
  },
  {
    baslik: "Günün Mektubu: Komşu Hakkı",
    metin:
      "Atalarımız 'Ev alma, komşu al' demiş. Komşumuzun derdine ortak olmak, sevincini paylaşmak, kapısını çalıp hâlini sormak köyümüzü de mahallemizi de güzelleştirir.",
    soru: "Bu hafta bir komşumuzu sevindirmek için ailece ne yapabiliriz?",
  },
  {
    baslik: "Günün Mektubu: Teşekkür Etmek",
    metin:
      "Bize iyilik edene teşekkür etmek, iyiliği büyütür. Evde yemeği yapana, çamaşırı katlayana, ödevimize yardım edene 'Elinize sağlık, Allah razı olsun' demek kalpleri birbirine bağlar.",
    soru: "Bugün evde kime, hangi iyiliği için teşekkür etmeyi unuttuk?",
  },
  {
    baslik: "Günün Mektubu: Sözünde Durmak",
    metin:
      "Verdiğimiz sözü tutmak güvenin temelidir. 'Yarın yaparım' dediğimiz bir işi yapmak, küçük bir söz bile olsa, karakterimizi güçlendirir.",
    soru: "Ailece birbirimize bu hafta tutacağımız küçük bir söz verelim mi?",
  },
  {
    baslik: "Günün Mektubu: Temizlik",
    metin:
      "Temiz bir oda, temiz bir beden ve temiz bir kalp birbirine yakışır. Odamızı toplamak, ortak alanları temiz tutmak evdeki herkese saygıdır.",
    soru: "Evde herkesin birlikte yapabileceği küçük bir temizlik işi seçelim: hangisi olsun?",
  },
  {
    baslik: "Günün Mektubu: Kardeşlik",
    metin:
      "Kardeş, zor günde ilk koşan kişidir. Paylaşmayı, beklemeyi ve affetmeyi en çok kardeşlerimizle öğreniriz. Küslük üç günü geçmemeli, bir tatlı sözle bitmelidir.",
    soru: "Kardeşlerinle (ya da kuzenlerinle) en son birlikte güldüğünüz anı hatırlıyor musunuz?",
  },
  {
    baslik: "Günün Mektubu: Kitap Saati",
    metin:
      "Bir kitabın sayfaları arasında başka diyarlara yolculuk yapılır. Ailece okunan bir sayfa, tek başına okunan bir kitaptan daha çok hatırlanır.",
    soru: "Bu akşam ailece 10 dakika kitap okumaya ne dersiniz? Hangi kitapla başlayalım?",
  },
  {
    baslik: "Günün Mektubu: Dua",
    metin:
      "Dua, kalbimizin Rabbimizle konuşmasıdır. Sevdiklerimiz için, hastalar için, yolda olanlar için dua etmek bizi birbirimize de yaklaştırır.",
    soru: "Bugün ailece kimler için dua etmek istersiniz?",
  },
  {
    baslik: "Günün Mektubu: Emek ve Sabır",
    metin:
      "Tarlaya ekilen tohum bir günde yetişmez; sulanır, beklenir, emek verilir. Derslerimiz, hayallerimiz ve dostluklarımız da böyledir: sabırla büyür.",
    soru: "Şu sıralar sabırla emek verdiğin bir şey var mı? Ailen sana nasıl destek olabilir?",
  },
  {
    baslik: "Günün Mektubu: Hayvanlara Merhamet",
    metin:
      "Sokaktaki bir kedinin suyunu, bir kuşun yemini düşünmek merhametin işaretidir. Allah, yarattıklarına merhamet edenlere merhamet eder.",
    soru: "Yaşadığımız yerdeki hayvanlar için ailece yapabileceğimiz küçük bir iyilik ne olabilir?",
  },
];

/** Bu levelda kaçıncı mektup okunuyorsa ona göre mektubu verir (0: levelın kendi mektubu) */
export function gununMektubu(level, mektupNo, levelAileMektubu) {
  const no = Math.max(0, Number(mektupNo) || 0);
  if (no === 0 && levelAileMektubu?.metin) return levelAileMektubu;
  const sira = (Number(level) * 5 + no - 1 + GUNLUK_MEKTUPLAR.length * 4) % GUNLUK_MEKTUPLAR.length;
  return GUNLUK_MEKTUPLAR[sira];
}
