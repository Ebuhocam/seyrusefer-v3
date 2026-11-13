// =============================================================
// SEYRÜSEFER v3 — KÖY DAVALARI (OBA) & KIRAATHANE TÜRKÜ HİKÂYELERİ
// Oyuncu köyün yöneticisidir: Oba'da halkın arasındaki meseleleri çözer,
// verdiği kararlara göre köyün Mutluluk (Huzur) puanı (+4 / +2 / negatif) değişir.
// Kıraathane'de ise Ozan Dede türkülerin tarihini anlatır ve köye uğrayan
// yolculara ev kurma teklif edilerek İnsan (Ahali) kazanılır.
// =============================================================

export const KOY_DAVALARI = [
  {
    id: "dava_1_kuyu",
    level: 1,
    baslik: "Yeni Kuyunun İsim Meselesi",
    kisi: "Taşçı Rüstem Usta ile İhtiyar Heyeti",
    hikaye:
      "Köyün meydanına açılan su kuyusu için Rüstem Usta çok emek verdi ancak parasını bütün mahalle topladı. Rüstem Usta 'Kuyuya sadece benim adım yazılsın, yoksa hakkımı helal etmem' diyor; mahalleli ise buna kırgın.",
    secenekler: [
      {
        metin: "Rüstem Usta'yı Oba'da ağırla, emeğini herkesin önünde öv ama 'Hayır Allah rızası içindir, kuyuya Sebil Kuyusu adını verelim, taşının kenarına da ustamızın adını dua ile nakşedelim' de.",
        mutluluk: 4,
        sonuc: "Hem Rüstem Usta'nın gönlü alındı ve niyeti halisleşti, hem de mahalleli adaletten çok memnun kaldı.",
      },
      {
        metin: "Tartışma uzamasın diye kuyuya doğrudan Rüstem Usta'nın adını ver.",
        mutluluk: 2,
        sonuc: "Rüstem Usta sevindi ama katkı veren komşuların gönlü biraz buruk kaldı.",
      },
      {
        metin: "Rüstem Usta'yı azarlayıp 'Paranı aldın, ne karışıyorsun kuyu ismine!' diyerek gönder.",
        mutluluk: -4,
        sonuc: "Rüstem Usta küstü, köy halkı yöneticinin bu sert tavrından huzursuz oldu.",
      },
    ],
  },
  {
    id: "dava_2_komsu_agaci",
    level: 1,
    baslik: "Komşu Bahçeye Uzanan İncir Dalı",
    kisi: "Bahçıvan Halil ile Komşusu Arif",
    hikaye:
      "Halil Ağa'nın incir ağacının dalları Arif'in avlusuna uzanıyor. Arif 'Yaprakları avlumu kirletiyor, dalı kökünden keseceğim' diyor; Halil Ağa ise 'Meyveli dal kesilmez' diye itiraz ediyor.",
    secenekler: [
      {
        metin: "İkisini uzlaştır: 'Halil Ağa o dalın meyvelerinin yarısını Arif'in çocuklarına ikram etsin, sonbaharda da yaprakları birlikte süpürsünler' diye hüküm ver.",
        mutluluk: 4,
        sonuc: "İki komşu kucaklaştı; meyveler paylaşıldıkça aradaki muhabbet arttı.",
      },
      {
        metin: "Sadece sınırı geçen uç dalların biraz budanmasına karar ver.",
        mutluluk: 2,
        sonuc: "Sorun geçici olarak çözüldü, komşular sessizce evlerine döndü.",
      },
      {
        metin: "Ağacı tamamen kestir ki bir daha şikâyet gelmesin.",
        mutluluk: -5,
        sonuc: "Yıllık meyve ağacının kesilmesi tüm köyde üzüntüye yol açtı.",
      },
    ],
  },
  {
    id: "dava_3_terazi",
    level: 2,
    baslik: "Pazardaki Eksik Tartı Şüphesi",
    kisi: "aktar Kasım Efendi ile Müşterisi Zeynep Nine",
    hikaye:
      "Zeynep Nine pazardan aldığı buğdayın evde daha hafif geldiğini söylüyor. Kasım Efendi ise 'Ben bilerek eksik tartmam, belki çuval delinmiştir' diyor.",
    secenekler: [
      {
        metin: "Kimseyi suçlamadan teraziyi kontrol ettir; terazinin yayının eskidiği anlaşılınca yeni terazi ver ve Zeynep Nine'nin eksikliğini fazlasıyla tamamlat.",
        mutluluk: 4,
        sonuc: "Hem esnafın itibarı korundu hem de yaşlı ninenin hakkı teslim edildi.",
      },
      {
        metin: "Tahkik etmeden Kasım Efendi'ye bir miktar buğday daha vermesini söyle.",
        mutluluk: 2,
        sonuc: "Zeynep Nine memnun oldu ama terazideki asıl arıza biraz geç fark edildi.",
      },
      {
        metin: "'Bir avuç buğday için Oba'yı meşgul etmeyin' diyerek ikisini de geri çevir.",
        mutluluk: -4,
        sonuc: "Köyde 'küçüklerin ve yaşlıların hakkı gözetilmiyor' düşüncesi yayıldı.",
      },
    ],
  },
  {
    id: "dava_4_gece_gurultusu",
    level: 2,
    baslik: "Demirci Dükkânının Vakti",
    kisi: "Demirci Davut ile Mahalle Sakinleri",
    hikaye:
      "Demirci Davut siparişleri yetiştirmek için yatsı namazından sonra da geç saatlere kadar örs dövüyor. Komşular çocukların ve hastaların uyuyamadığından şikâyetçi.",
    secenekler: [
      {
        metin: "Akşam ezanıyla ağır çekiç işlerinin bitmesine, Davut Usta'ya yetişmeyen işler için gündüz bir çırak verilmesine karar ver.",
        mutluluk: 4,
        sonuc: "Geceler huzura kavuştu, üstelik köydeki bir genç de meslek öğrenmeye başladı.",
      },
      {
        metin: "Sadece haftanın üç günü geç saate kadar çalışmasına izin ver.",
        mutluluk: 2,
        sonuc: "Şikâyetler azaldı ama bazı geceler yorgunluk devam etti.",
      },
      {
        metin: "Demirci dükkânını derhal mühürlet.",
        mutluluk: -4,
        sonuc: "Köyün saban ve nal işleri aksadı, halk mağdur oldu.",
      },
    ],
  },
  {
    id: "dava_5_mektep_kitabi",
    level: 3,
    baslik: "Islanan Yazma Kitap Emaneti",
    kisi: "Mektep Hocası Salih Efendi ile Talebe Ömer",
    hikaye:
      "Küçük Ömer, hocasından ödünç aldığı kıymetli kitabı eve götürürken yağmura yakalanmış, kitabın kenarları ıslanmış. Korkusundan üç gündür Mektep'e gelemiyor.",
    secenekler: [
      {
        metin: "Ömer'i tatlı dille çağır; doğruyu söylediği için onu tebrik et ve hocasıyla birlikte sayfaları kurutup ciltlemelerini sağla.",
        mutluluk: 4,
        sonuc: "Ömer hem emanet bilincini hem de cilt sanatını öğrendi, Mektep'e sevgiyle döndü.",
      },
      {
        metin: "Kitabın zararını Oba bütçesinden karşıla ve konuyu kapat.",
        mutluluk: 2,
        sonuc: "Sorun çözüldü ancak Ömer sorumluluk dersini tam alamadı.",
      },
      {
        metin: "Ömer'e bir daha kitap ödünç verilmemesini emret.",
        mutluluk: -3,
        sonuc: "Çocukların kitap okumaya olan cesareti kırıldı.",
      },
    ],
  },
  {
    id: "dava_6_yolcu_misafir",
    level: 4,
    baslik: "Yağmurlu Gecede Gelen Kervan",
    kisi: "Kervancıbaşı İlyas ile Köy Bekçisi",
    hikaye:
      "Akşam vakti bastıran sağanakta üç yolcu köye sığınmak istiyor. Bekçi 'Tanımadığımız kimselerdir, köyün dışındaki sundurmada beklesinler' diyor.",
    secenekler: [
      {
        metin: "'Misafir bereketiyle gelir' diyerek yolcuları Kıraathane'nin misafir odasına aldır, sıcak çorba ikram ettir ve tedbiri de elden bırakma.",
        mutluluk: 4,
        sonuc: "Misafirler köyün cömertliğine hayran kaldı, gittikleri her yerde köyün güzel ahlakını anlattılar.",
      },
      {
        metin: "Yiyecek gönder ama köy kapısının yanındaki nöbetçi kulübesinde kalmalarını söyle.",
        mutluluk: 2,
        sonuc: "Yolcular yağmurdan korundu fakat gönülleri tam ısınmadı.",
      },
      {
        metin: "Kapıları açtırma, yağmur altında yola devam etsinler.",
        mutluluk: -5,
        sonuc: "Misafire kapı kapatılması köy halkının vicdanını çok yaraladı.",
      },
    ],
  },
  {
    id: "dava_7_ortak_tarla",
    level: 5,
    baslik: "İki Kardeşin Hasat Paylaşımı",
    kisi: "Çiftçi Selim ile Kardeşi Kerim",
    hikaye:
      "İki kardeş babalarından kalan tarlayı birlikte ekti. Selim 'Ben daha çok çalıştım, mahsulün üçte ikisi benim olmalı' diyor; Kerim ise 'Tohumu ben aldım, eşit bölüşelim' diyor.",
    secenekler: [
      {
        metin: "Önce tohum masrafını mahsulden ayırıp Kerim'e ver, kalan bereketi de fazla emeği için Selim'e biraz ikram payı ekleyerek kardeşçe bölüştür.",
        mutluluk: 4,
        sonuc: "Adaletli hesap iki kardeşin arasındaki kırgınlığı bitirdi, birbirlerine sarıldılar.",
      },
      {
        metin: "Hiç detaya girmeden tam ortadan ikiye böl.",
        mutluluk: 2,
        sonuc: "Kavga bitti ama Selim'in içinde biraz sitem kaldı.",
      },
      {
        metin: "Anlaşamadıkları için mahsulün yarısına Oba adına el koy.",
        mutluluk: -5,
        sonuc: "Köyde zulüm yapıldığı konuşulmaya başlandı, huzur düştü.",
      },
    ],
  },
  {
    id: "dava_8_kayip_kese",
    level: 6,
    baslik: "Köy Meydanında Bulunan Altın Kese",
    kisi: "Çoban Yunus ile Tüccar Murat",
    hikaye:
      "Çoban Yunus meydanda içinde 20 altın olan bir kese bulup sahibine teslim etti. Tüccar Murat ise keseyi alınca 'Bunun içinde 25 altın vardı, 5'ini çoban almış!' diye iftira atmaya kalktı.",
    secenekler: [
      {
        metin: "Hikmetle hükmet: 'Murat Efendi, senin kaybettiğin kese 25 altınlıkmış; demek ki bu 20 altınlık kese senin değil! Sahibi çıkana kadar dürüst Yunus'ta emanet dursun' de.",
        mutluluk: 4,
        sonuc: "Tüccar Murat utancından hatasını itiraf edip Yunus'tan helallik istedi; tüm köy bu hikmetli karara hayran kaldı!",
      },
      {
        metin: "Keseyi Murat'a ver ama Yunus'a Oba kasasından ödül ver.",
        mutluluk: 2,
        sonuc: "Yunus sevindi ama Murat'ın haksız sözü yanına kâr kaldı.",
      },
      {
        metin: "Dürüst çobanı suçlayıp ondan 5 altın daha talep et.",
        mutluluk: -5,
        sonuc: "Doğruluğun cezalandırılması köyde büyük üzüntü oluşturdu.",
      },
    ],
  },
  {
    id: "dava_9_kuraklik_suyu",
    level: 7,
    baslik: "Sulama Arkının Sırası",
    kisi: "Yukarı Bağ Sahipleri ile Aşağı Tarla Sahipleri",
    hikaye:
      "Yaz sıcaklarında dere suyu azaldı. Yukarıdaki bağ sahipleri suyu bütün gün kendi bahçelerine çevirince aşağıdaki sebze tarlaları kurumaya yüz tuttu.",
    secenekler: [
      {
        metin: "Adil nöbet çizelgesi kur: Gündüz sıcağında sebze tarlaları, akşam serinliğinde bağlar sulansın; su arkını da imeceyle temizlet.",
        mutluluk: 4,
        sonuc: "Su bereketlendi, hem bağlar hem tarlalar yemyeşil kaldı.",
      },
      {
        metin: "Bir gün yukarı mahalle, bir gün aşağı mahalle kullansın de.",
        mutluluk: 2,
        sonuc: "Paylaşım sağlandı, mahsul kurtuldu.",
      },
      {
        metin: "'Suya yakın olan önceliklidir' diyerek yukarı mahalleyi haklı bul.",
        mutluluk: -4,
        sonuc: "Aşağı mahallenin ekinleri zarar gördü, komşuluk bağları zedelendi.",
      },
    ],
  },
  {
    id: "dava_10_ihsan_vakfi",
    level: 8,
    baslik: "Kış Öncesi Yetim ve Yaşlıların Odunu",
    kisi: "Ormancı Bekir ile Köy İhtiyarları",
    hikaye:
      "Kış yaklaşıyor. Köyde kendi odununu kıramayacak üç yaşlı aile ve iki yetim evi var. Herkes kendi kışlık hazırlığıyla meşgul.",
    secenekler: [
      {
        metin: "Cumartesi gününü 'İhsan ve İmece Günü' ilan et; en önde kendin balta alıp gençlerle birlikte önce o beş hanenin odununu hazırlat.",
        mutluluk: 4,
        sonuc: "Köyde muazzam bir kardeşlik rüzgârı esti; dualar arşa yükseldi.",
      },
      {
        metin: "Sadece Oba deposundan biraz odun gönder.",
        mutluluk: 2,
        sonuc: "İhtiyaç görüldü ama halkın ortak yardımlaşma heyecanı eksik kaldı.",
      },
      {
        metin: "'Herkes kendi başının çaresine baksın' diyerek ilgilenme.",
        mutluluk: -5,
        sonuc: "Köyün bereketi ve neşesi kaçtı.",
      },
    ],
  },
];

// ---------- KIRAATHANE: TÜRKÜ VE HİKMET HİKÂYELERİ (OZAN DEDE) ----------
export const TURKU_HIKAYELERI = [
  {
    id: "turku_1",
    level: 1,
    baslik: "Veysel Dede ve Sadık Yâr Kara Toprak",
    turkuAdi: "Benim Sadık Yârim Kara Topraktır",
    anlatim:
      "Hoş geldin evladım, sedire buyur! Âşık Veysel gözleriyle değil gönül gözüyle gören büyük bir bilgeydi. İnsanlara kızıp küsmek yerine toprağa baktı: 'İşkence yaptıkça bana gülerdi, bunda yalan yoktur herkes gördü, bir çekirdek verdim dört bostan verdi!' dedi. Yani insan da toprak gibi olmalı: kendisine taş atılsa bile gül ve meyve vermeli, niyetini hep temiz tutmalı.",
    sesUrl: "",
    odev: "Bugün tıpkı bereketli toprak gibi, sana ters bir söz söyleyene bile tebessümle ve iyilikle karşılık ver.",
  },
  {
    id: "turku_2",
    level: 2,
    baslik: "Yunus Emre ve 'Gelin Tanış Olalım'",
    turkuAdi: "Gelin Tanış Olalım, İşi Kolay Kılalım",
    anlatim:
      "Evladım, Anadolu'nun mayasını yoğuran Yunus Emre dergâha kırk yıl tek bir eğri odun bile taşımadı; 'Bu kapıdan eğri girmez' dedi. Sonra sazı sözüyle seslendi: 'Gelin tanış olalım, işi kolay kılalım, sevelim sevilelim, dünya kimseye kalmaz!' Gönül kırmak Kâbe yıkmak gibidir, gönül yapmak ise en büyük imandır.",
    sesUrl: "",
    odev: "Bugün çevrende selamlaşmadığın veya az konuştuğun birine ilk selamı sen ver, halini hatırını sor.",
  },
  {
    id: "turku_3",
    level: 4,
    baslik: "Yemen Türküsü ve Kardeşlik Vefası",
    turkuAdi: "Havada Bulut Yok Bu Ne Dumandır",
    anlatim:
      "Dinle bak, bu türkü sadece bir ezgi değil, binlerce kilometre ötedeki kardeşinin derdiyle dertlenen anaların, yiğitlerin vefa destanıdır. Eskiler 'Komşusu açken tok yatan bizden değildir' buyruğunu öyle yaşadılar ki, Yemen'deki kardeşinin acısını Anadolu'daki ocağında hissettiler.",
    sesUrl: "",
    odev: "Birliğindeki bir arkadaşının bugün görevini yapmasına yardımcı ol veya ona güzel bir dua mesajı gönder.",
  },
  {
    id: "turku_4",
    level: 6,
    baslik: "Çanakkale Türküsü ve Fedakârlık Ruhu",
    turkuAdi: "Çanakkale İçinde Aynalı Çarşı",
    anlatim:
      "Genç yönetici! Çanakkale'de on beşliler kendi rahatları için değil, arkalarından gelecek nesiller huzurla ezan dinlesin, ilim öğrensin diye yürüdüler. Yaralı düşman askerine bile matarasındaki son suyu içiren o merhamet ve ihsan ruhu bizim asıl hazinemizdir.",
    sesUrl: "",
    odev: "Bugün kendi hakkından veya zamanından fedakârlık ederek ailendeki ya da birliğindeki birine iyilik yap.",
  },
];

// ---------- KIRAATHANE'YE GELEN YOLCULAR / GÖÇERLER ----------
export const GOCMEN_ADAYLARI = [
  { id: "goc_1", ad: "Marangoz Selim Usta ve Çırağı", kisiSayisi: 2, meslek: "Ahşap Ustası", soz: "Köyünüzün adını duyduk, huzurlu bir oba arıyoruz." },
  { id: "goc_2", ad: "Çiftçi İbrahim Ailesi", kisiSayisi: 3, meslek: "Rençber", soz: "Toprağı bereketli, yöneticisi adil bir köyde ev kurmak isteriz." },
  { id: "goc_3", ad: "Taş Ustası Koca Yusuf", kisiSayisi: 1, meslek: "Duvarcı", soz: "Gönüllerin bir olduğu yerde taş üstüne taş koymaya geldim." },
  { id: "goc_4", ad: "Hattat Mehmet Efendi ve Oğlu", kisiSayisi: 2, meslek: "Kâtip", soz: "Mektebinizde ilim okunduğunu işittik, komşu olmaya geldik." },
  { id: "goc_5", ad: "Çoban İlyas ve Kardeşi", kisiSayisi: 2, meslek: "Çoban", soz: "Adaletin olduğu köyde sürüler de insanlar da emniyettedir." },
  { id: "goc_6", ad: "Demirci Hasan ve Ailesi", kisiSayisi: 3, meslek: "Demirci", soz: "Ocağımızı hayırlı ve güler yüzlü komşuların yanında tüttürmek isteriz." },
];

export const GOCMEN_BEKLEME_SURESI_MS = 2 * 60 * 60 * 1000; // 2 saat

/** Yönetici panelinden özelleştirilmiş veya varsayılan köy davaları */
export function koyDavalariListesi(ayarlar = null) {
  return Array.isArray(ayarlar?.davalar) && ayarlar.davalar.length > 0 ? ayarlar.davalar : KOY_DAVALARI;
}

/** Yönetici panelinden özelleştirilmiş veya varsayılan Ozan Dede türkü hikâyeleri */
export function turkuHikayeleriListesi(ayarlar = null) {
  return Array.isArray(ayarlar?.turkuler) && ayarlar.turkuler.length > 0 ? ayarlar.turkuler : TURKU_HIKAYELERI;
}

/** Kıraathane'de şu an bekleyen yolcu/göçer adayını ve kalan süreyi döner */
export function gocmenDurumu(simdiMs, sonGocmenKontrol = 0) {
  const gecen = simdiMs - (sonGocmenKontrol || 0);
  const hazir = !sonGocmenKontrol || gecen >= GOCMEN_BEKLEME_SURESI_MS;
  const kalanDakika = hazir ? 0 : Math.max(1, Math.ceil((GOCMEN_BEKLEME_SURESI_MS - gecen) / 60000));
  const pencere = Math.floor(simdiMs / GOCMEN_BEKLEME_SURESI_MS);
  const aday = GOCMEN_ADAYLARI[Math.abs(pencere) % GOCMEN_ADAYLARI.length];
  return { hazir, kalanDakika, aday };
}
