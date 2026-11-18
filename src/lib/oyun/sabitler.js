// =============================================================
// SEYRÜSEFER v3 — OYUN SABİTLERİ (3 Katmanlı Dünya)
// 1. Katman: Kendi Köyüm (Oba, Mektep, Kıraathane, Köy Meydanı, Haberci, Tarla/Orman/Maden)
// 2. Katman: Birlik Alanı (Büyük Otağ, Ulu Cami, Medrese, Takas Merkezi, Oyun Çadırı)
// 3. Katman: Genel Harita (6 Stratejik Sancak Bölgesi)
// =============================================================

// ---------- ORTAOKUL SEVİYESİ 10 ÖZGÜN ÖĞRENCİ KARAKTERİ (5 ERKEK + 5 KIZ) ----------
// Veritabanı geriye dönük indeks uyumluluğu için KARAKTER_KODLARI sırası sabittir.
export const KARAKTERLER = {
  ahmet: {
    id: "ahmet",
    ad: "Ahmet",
    cinsiyet: "erkek",
    unvan: "Takkeli İlim Talebesi",
    ikon: "👦",
    gorsel: "/assets/karakterler/ahmet.webp",
  },
  alp: {
    id: "alp",
    ad: "Alp",
    cinsiyet: "erkek",
    unvan: "Börklü Genç Okçu",
    ikon: "🏹",
    gorsel: "/assets/karakterler/alp.webp",
  },
  omer: {
    id: "omer",
    ad: "Ömer",
    cinsiyet: "erkek",
    unvan: "Kalem Ehli Genç Çelebi",
    ikon: "📖",
    gorsel: "/assets/karakterler/omer.webp",
  },
  yusuf: {
    id: "yusuf",
    ad: "Yusuf",
    cinsiyet: "erkek",
    unvan: "Yeşil Takkeli Hafız Adayı",
    ikon: "🌿",
    gorsel: "/assets/karakterler/yusuf.webp",
  },
  kerem: {
    id: "kerem",
    ad: "Kerem",
    cinsiyet: "erkek",
    unvan: "Külahlı Genç Seyyah",
    ikon: "🧭",
    gorsel: "/assets/karakterler/kerem.webp",
  },
  elif: {
    id: "elif",
    ad: "Elif",
    cinsiyet: "kiz",
    basortulu: true,
    unvan: "Hikmet Talebesi",
    ikon: "🧕",
    gorsel: "/assets/karakterler/elif.webp",
  },
  zeynep: {
    id: "zeynep",
    ad: "Zeynep",
    cinsiyet: "kiz",
    basortulu: true,
    unvan: "Kitap Dostu Talebe",
    ikon: "📚",
    gorsel: "/assets/karakterler/zeynep.webp",
  },
  meryem: {
    id: "meryem",
    ad: "Meryem",
    cinsiyet: "kiz",
    basortulu: true,
    unvan: "Şefkatli İlim Yolcusu",
    ikon: "🌿",
    gorsel: "/assets/karakterler/meryem.webp",
  },
  bala: {
    id: "bala",
    ad: "Bala",
    cinsiyet: "kiz",
    basortulu: false,
    unvan: "Cesur Oba Kızı",
    ikon: "👧",
    gorsel: "/assets/karakterler/bala.webp",
  },
  defne: {
    id: "defne",
    ad: "Defne",
    cinsiyet: "kiz",
    basortulu: false,
    unvan: "Genç Anadolu Zanaatkârı",
    ikon: "🌸",
    gorsel: "/assets/karakterler/defne.webp",
  },
};

// Eski 0..3 indeksleriyle ("alp", "celebi"->"omer", "bala", "elif") tam uyumlu dizilim
export const KARAKTER_KODLARI = [
  "alp",
  "omer",
  "bala",
  "elif",
  "ahmet",
  "yusuf",
  "kerem",
  "zeynep",
  "meryem",
  "defne",
];

export function oyuncuKarakteriBul(karakterId, cinsiyet = "erkek") {
  if (karakterId === "celebi") return KARAKTERLER.omer;
  if (karakterId && KARAKTERLER[karakterId]) return KARAKTERLER[karakterId];
  return cinsiyet === "kiz" ? KARAKTERLER.elif : KARAKTERLER.ahmet;
}

// ---------- ÜRETİM SAHALARI: BAĞIMSIZ PARSEL / KAYA / KEŞİF TANIMLARI ----------
export const TARLA_PARSELLERI = [
  { id: 1, tur: "domates", ad: "Domates Ocağı", mahsulAd: "Salkım Domates", temelMiktar: 8, renk: "#dc2626" },
  { id: 2, tur: "bugday", ad: "Buğday Karığı", mahsulAd: "Altın Başak", temelMiktar: 8, renk: "#eab308" },
  { id: 3, tur: "karpuz", ad: "Karpuz Bostanı", mahsulAd: "Çizgili Karpuz", temelMiktar: 8, renk: "#16a34a" },
];

export const MADEN_KAYALARI_TANIM = [
  { id: 1, ad: "Kuzey Granit Kayası", tur: "granit", temelMiktar: 8, renk: "#78716c", damarRenk: "#fbbf24" },
  { id: 2, ad: "Boz Mermer Kütle", tur: "mermer", temelMiktar: 8, renk: "#a8a29e", damarRenk: "#e7e5e4" },
  { id: 3, ad: "Bazalt Taş Yatağı", tur: "bazalt", temelMiktar: 8, renk: "#44403c", damarRenk: "#38bdf8" },
];

/** Taş Ocağı günlük oyun sırası: bir gün kaya kırma, ertesi gün taş avı (kancayla yakalama) */
export const MADEN_MODLARI = { kirma: 1, yakalama: 2 };
/** Taş avında başarı oranının sınırları (hazır kayaların toplam verimiyle çarpılır) */
export const TAS_AVI_ORAN = { en: 0.5, cok: 1.3 };

export const ORMAN_KESIF_BOLGELERI = [
  { id: 0, ad: "Kuzey Çamlığı", x: 18, y: 24 },
  { id: 1, ad: "Kuru Dere Sırtı", x: 38, y: 20 },
  { id: 2, ad: "Yosunlu Yamaç", x: 60, y: 22 },
  { id: 3, ad: "Kartal Kayası Altı", x: 81, y: 26 },
  { id: 4, ad: "Eski Değirmen Yolu", x: 15, y: 50 },
  { id: 5, ad: "Gürgen Korusu", x: 35, y: 46 },
  { id: 6, ad: "Doğu Meşeliği", x: 58, y: 48 },
  { id: 7, ad: "Gölge Vadisi", x: 80, y: 52 },
  { id: 8, ad: "Kızılağaç Tepesi", x: 22, y: 76 },
  { id: 9, ad: "Rüzgârlı Boğaz", x: 44, y: 73 },
  { id: 10, ad: "Güney Sedirliği", x: 66, y: 75 },
  { id: 11, ad: "Ulu Çınar Çevresi", x: 85, y: 78 },
];

// ---------- 4 TEMEL KAYNAK ----------
// Mahsul, Odun, Taş üretim alanları günde yaklaşık 24 birim verir (1 işçiyle).
// Bina bedelleri bu hıza göre, 10 level ≈ 11 haftada bitecek şekilde dengelenmiştir (bkz. scripts/denge-testi.mjs).
// 👥 İnsan bir "nüfus şartı"dır: bina kurarken HARCANMAZ, köyde en az o kadar kişi yaşaması yeterlidir.
// İnsan (Ahali) ise Köy Meydanı ve Kıraathane'ye gelen yolculara ev kurma teklif edilerek kazanılır.
export const SAHA_MAKS_BIRIM = 24;
/** Bina kurarken harcanmayan, yalnızca "en az şu kadar olmalı" diye aranan kaynaklar */
export const SART_KAYNAKLARI = ["insan"];

/** Sayıya yönelme eki ekler: 2 → "2'ye", 3 → "3'e", 6 → "6'ya", 10 → "10'a" */
export function sayiyaEk(n) {
  const son = { 0: "a", 1: "e", 2: "ye", 3: "e", 4: "e", 5: "e", 6: "ya", 7: "ye", 8: "e", 9: "a" };
  const x = Math.abs(Math.trunc(Number(n) || 0));
  const ek = x % 10 === 0 && x > 0 ? ({ 10: "a", 20: "ye", 30: "a", 40: "a", 50: "ye", 60: "a", 70: "e", 80: "e", 90: "a" }[x % 100] ?? "e") : son[x % 10];
  return `${n}'${ek}`;
}
/** Parsel / kaya yeniden dolma süresi (1 işçiyle). 24 değil 20 saat: öğrenci her gün biraz farklı saatte girse de hasadı kaçırmaz. */
export const NOKTA_DOLUM_SAAT = 20;
/** Ormanda devrilen bir kurumuş ağacın verdiği odun (1 işçiyle). Günde 2 seferde ortalama ≈ 24 odun eder. */
export const AGAC_TEMEL_ODUL = 18;
export const KAYNAKLAR = {
  erzak: { ad: "Mahsul", ikon: "🌾", alan: "tarla", gunluk: 24, acilisLevel: 1, uretim: true },
  kereste: { ad: "Odun", ikon: "🌲", alan: "orman", gunluk: 24, acilisLevel: 1, uretim: true },
  tas: { ad: "Taş", ikon: "🧱", alan: "maden", gunluk: 24, acilisLevel: 2, uretim: true },
  insan: { ad: "İnsan", ikon: "👥", alan: "kiraathane", gunluk: 0, acilisLevel: 1, uretim: false },
};

// Depo kapasitesi: Oba seviyesine göre kaç saatlik üretim birikebilir
export const DEPO_SAAT = { 1: 24, 2: 36, 3: 48, 4: 48 };

// ---------- 5+1 EV (KONUT) OLUŞTURUCU ----------
// Seçenek A: Her kat +5 kişi barınma kapasitesi sağlar (1. Kat: 5, 2. Kat: 10, 3. Kat: 15 kişi).
function evTanimi(ad, acilis1, baslangicSeviye = 0) {
  return {
    ad,
    konut: true,
    gorevSartsiz: true,
    katBasiKapasite: 5,
    aciklama: "Köylülerin barındığı konut. Her kat çıkıldığında +5 👥 İnsan kapasitesi sağlar (Maks. 3 Kat = 15 Kişi).",
    gorsel: (s) => `/assets/binalar/ev${Math.min(3, Math.max(1, s || 1))}.webp`,
    maksSeviye: 3,
    ...(baslangicSeviye ? { baslangicSeviye } : {}),
    acilis: { 1: acilis1, 2: Math.min(10, acilis1 + 2), 3: Math.min(10, acilis1 + 4) },
    bedel: {
      1: { erzak: 50, kereste: 60 },
      2: { erzak: 90, kereste: 100, tas: 50 },
      3: { erzak: 150, kereste: 160, tas: 100 },
    },
  };
}

export const EV_IDLERI = ["kendi_evim", "ev1", "ev2", "ev3", "ev4", "ev5"];

// ---------- KOMŞU EVLERİNİ GÜZELLEŞTİRME ----------
// Öğrenci köydeki komşu evlerinin odalarını döşer; her güzelleştirme köye +1 Huzur getirir,
// bir evin üç odası da en üst seviyeye gelince "Mamur Ev" ödülü olarak +2 Huzur daha gelir.
export const KOMSU_EV_IDLERI = ["ev1", "ev2", "ev3", "ev4", "ev5"];
export const KOMSU_ODA_MAKS = 3;
export const KOMSU_MAMUR_HUZUR = 2;
export const KOMSU_ODALARI = {
  yatak: {
    ad: "Yatak Odası",
    ikon: "🛏️",
    seviyeler: ["Hasır döşek", "Yün yatak ve yorgan", "Ahşap karyola ve kilim", "Oymalı karyola ve el işi örtüler"],
  },
  mutfak: {
    ad: "Mutfak",
    ikon: "🍲",
    seviyeler: ["Tek ocaklı köşe", "Raflı mutfak ve bakır tencereler", "Taş ocak ve geniş tezgâh", "Çini kaplı, ferah ve aydınlık mutfak"],
  },
  banyo: {
    ad: "Banyo ve Tuvalet",
    ikon: "🚿",
    seviyeler: ["Bahçede eski tulumba", "Temiz su ve ahşap gusülhane", "Taş zeminli banyo ve tuvalet", "Mermer kurna ve tertemiz tuvalet"],
  },
};
/** Bir odayı bir üst seviyeye çıkarmanın bedeli (hedef seviyeye göre). Pahalı değildir: günlük üretimin bir kısmı. */
export const KOMSU_ODA_BEDEL = {
  1: { kereste: 6, erzak: 4 },
  2: { kereste: 10, tas: 6, erzak: 6 },
  3: { kereste: 14, tas: 10, erzak: 8 },
};

/** Köydeki mevcut evlerin toplam insan (barınma) kapasitesini hesaplar */
export function toplamKonutKapasitesi(binalar = {}) {
  const kendiKat = binalar.kendi_evim ?? 1;
  let toplam = kendiKat * 5;
  for (const id of ["ev1", "ev2", "ev3", "ev4", "ev5"]) {
    toplam += (binalar[id] ?? 0) * 5;
  }
  return toplam;
}

// ---------- 1. KATMAN: KÖY BİNALARI ----------
// Not: Veritabanı uyumluluğu için Oba'nın teknik anahtarı "otag" olarak korunur, ekranda "Oba" görünür.
export const BINALAR = {
  otag: {
    ad: "Oba",
    aciklama: "Köy yöneticisinin divanı ve merkezi. Köyün genel idaresi ve depo bereketi buradan yönetilir.",
    gorsel: (s) => `/assets/binalar/otag${s}.webp`,
    maksSeviye: 4,
    baslangicSeviye: 1,
    acilis: { 2: 3, 3: 6, 4: 10 },
    bedel: {
      2: { erzak: 90, kereste: 80, tas: 70, insan: 6 },
      3: { erzak: 120, kereste: 100, tas: 90, insan: 10 },
      4: { erzak: 500, kereste: 430, tas: 370, insan: 18 },
    },
  },
  mektep: {
    ad: "Mektep",
    aciklama: "Köyün ilim yuvası. İlk okuma, hadis, video ve sınav görevleri burada yapılır.",
    gorsel: () => `/assets/binalar/mektep.webp`,
    maksSeviye: 4,
    ilkKurulumGorevsiz: true,
    acilis: { 1: 1, 2: 4, 3: 6, 4: 8 },
    bedel: {
      1: { erzak: 100, kereste: 100 },
      2: { erzak: 150, kereste: 130, tas: 110, insan: 7 },
      3: { erzak: 130, kereste: 110, tas: 90, insan: 11 },
      4: { erzak: 360, kereste: 310, tas: 260, insan: 15 },
    },
  },
  kiraathane: {
    ad: "Kıraathane",
    aciklama: "Ozan Dede burada türkülerin hikâyesini anlatır; köye gelen yolculara burada ev teklif edilir.",
    gorsel: () => `/assets/binalar/kiraathane.webp`,
    maksSeviye: 4,
    acilis: { 1: 1, 2: 5, 3: 7, 4: 9 },
    bedel: {
      1: { erzak: 80, kereste: 75, insan: 3 },
      2: { erzak: 90, kereste: 80, tas: 50, insan: 6 },
      3: { erzak: 200, kereste: 170, tas: 130, insan: 9 },
      4: { erzak: 220, kereste: 190, tas: 150, insan: 14 },
    },
  },
  sosyalmeydan: {
    ad: "Köy Meydanı",
    aciklama: "Ahali ile hasbihal, gündem paylaşımları ve halkın davalarının dinlendiği meydan.",
    gorsel: (s) => `/assets/binalar/sosyalmeydan${s}.webp`,
    maksSeviye: 4,
    acilis: { 1: 2, 2: 5, 3: 7, 4: 9 },
    bedel: {
      1: { erzak: 90, kereste: 80, tas: 40, insan: 5 },
      2: { erzak: 100, kereste: 90, tas: 60, insan: 8 },
      3: { erzak: 210, kereste: 180, tas: 140, insan: 12 },
      4: { erzak: 240, kereste: 200, tas: 170, insan: 16 },
    },
  },
  kendi_evim: evTanimi("Kendi Evim", 1, 1),
  ev1: evTanimi("Köy Evi 1", 1, 0),
  ev2: evTanimi("Köy Evi 2", 2, 0),
  ev3: evTanimi("Köy Evi 3", 3, 0),
  ev4: evTanimi("Köy Evi 4", 5, 0),
  ev5: evTanimi("Köy Evi 5", 7, 0),
};

// ---------- 1. KATMAN: KÖY HARİTASI YERLEŞİMİ ----------
export const ARSALAR = {
  otag: { x: 55.2, y: 20.5, genislik: 16.0 },
  mektep: { x: 36.8, y: 46.5, genislik: 12.5 },
  kiraathane: { x: 74.2, y: 47.0, genislik: 12.5 },
  sosyalmeydan: { x: 55.2, y: 54.0, genislik: 10.5 },
  kendi_evim: { x: 38.6, y: 63.2, genislik: 9.2 },
  ev1: { x: 67.5, y: 63.5, genislik: 9.2 },
  ev2: { x: 48.2, y: 70.5, genislik: 9.2 },
  ev3: { x: 29.2, y: 71.5, genislik: 9.2 },
  ev4: { x: 40.5, y: 79.5, genislik: 9.2 },
  ev5: { x: 63.8, y: 79.5, genislik: 9.2 },
};

// Köyde sabit duran etkileşim noktaları
export const NOKTALAR = {
  pano: { ad: "Görev Panosu", ikon: "📜", x: 55.2, y: 39.5 },
  tarla: { ad: "Tarla", ikon: "🌾", x: 12.5, y: 56.5, kaynak: "erzak" },
  orman: { ad: "Orman", ikon: "🌲", x: 21.0, y: 24.0, kaynak: "kereste" },
  maden: { ad: "Taş Ocağı", ikon: "⛏️", x: 88.5, y: 81.0, kaynak: "tas" },
  haberci: {
    ad: "Haberci",
    ikon: "📜",
    gorsel: "/assets/binalar/seyyaherkek.webp",
    x: 46.8,
    y: 88.8,
    acilisLevel: 1,
  },
};

// ---------- 2. KATMAN: BİRLİK ALANI BİNALARI (Level 3+) ----------
export const BIRLIK_BINALARI = {
  otag: {
    ad: "Birlik Otağı",
    aciklama: "Birliğin merkezi: birlik kurma, katılma, üyeler, ortak kasa ve teşvikler.",
    gorsel: (s) => `/assets/binalar/otag${Math.min(4, Math.max(1, s || 4))}.webp`,
    x: 40.3,
    y: 81,
    genislik: 14,
    maksSeviye: 4,
    bedel: {
      2: { erzak: 150, kereste: 120, tas: 90 },
      3: { erzak: 280, kereste: 220, tas: 160 },
      4: { erzak: 450, kereste: 360, tas: 270 },
    },
  },
  cami: {
    ad: "Ulu Cami",
    aciklama: "Birlik kardeşlerinin ortak namaz çetelesi ve maneviyat merkezi.",
    icMekan: "/assets/mekanlar/cami_ici.webp",
    gorsel: (s) => `/assets/binalar/cami${Math.min(4, Math.max(1, s || 1))}.webp`,
    x: 25,
    y: 40.5,
    genislik: 12.5,
    maksSeviye: 4,
    bedel: {
      2: { erzak: 180, kereste: 150, tas: 100 },
      3: { erzak: 300, kereste: 240, tas: 180 },
      4: { erzak: 480, kereste: 390, tas: 300 },
    },
  },
  medrese: {
    ad: "Medrese · Ortak Çalışma Salonu",
    aciklama: "Birlik kardeşleriyle aynı salonda ders çalış: kim çalışıyor, kaç saat çalıştı, birliğin sıralaması.",
    icMekan: "/assets/mekanlar/medrese_ici.webp",
    gorsel: (s) => `/assets/binalar/medrese${Math.min(4, Math.max(1, s || 2))}.webp`,
    x: 77.4,
    y: 42.5,
    genislik: 15,
    maksSeviye: 4,
    bedel: {
      2: { erzak: 150, kereste: 130, tas: 90 },
      3: { erzak: 260, kereste: 210, tas: 150 },
      4: { erzak: 420, kereste: 330, tas: 250 },
    },
  },
  takasmerkezi: {
    ad: "Takas Merkezi",
    aciklama: "Birlik kardeşlerinle odun, taş ve mahsul takası yap.",
    icMekan: "/assets/mekanlar/takas_ici.webp",
    gorsel: () => `/assets/binalar/takasmerkezi.webp`,
    x: 21.6,
    y: 63,
    genislik: 13.5,
    maksSeviye: 2,
    bedel: {
      2: { erzak: 120, kereste: 100, tas: 75 },
    },
  },
  oyuncadiri: {
    ad: "Talimhane",
    aciklama: "Sancak Talimi: bilgi düellosuyla bölge kazan, birliğinin sancağını dalgalandır.",
    icMekan: "/assets/mekanlar/talimhane_ici.webp",
    gorsel: () => `/assets/binalar/talimhane.webp`,
    x: 60,
    y: 81.5,
    genislik: 15,
    maksSeviye: 2,
    bedel: {
      2: { erzak: 120, kereste: 100, tas: 75 },
    },
  },  haberlesme: {
    ad: "Haberleşme Kulesi",
    aciklama: "Birlik kardeşlerinle grup sohbeti. Saygılı ve güzel sözler; kötü söz filtrelenir, şikâyet edilebilir.",
    gorsel: () => `/assets/binalar/haberlesme_kulesi.webp`,
    ikon: "🕊️",
    icMekan: "/assets/mekanlar/haberlesme_ici.webp",
    x: 80.7,
    y: 61.5,
    genislik: 6.8,
    maksSeviye: 1,
    bedel: {},
  },

};

// ---------- LEVELLAR ----------
/** Birlik Alanı ve Birlik Meydanı (Çınar Altı sosyal paylaşım) bu levelda açılır */
export const BIRLIK_ACILIS_LEVEL = 3;
/** Birlik Meydanı'nın ortasındaki Ulu Çınar (Çınar Altı sosyal paylaşım), herkese açık */
export const BIRLIK_MEYDANI_CINAR = { x: 37, y: 54 };
export const ALAN_MUCADELESI_LEVEL = 6;

export const LEVELLAR = [
  { no: 1, gundem: "Niyet ve İhlas", evre: "bireysel", hedefGun: 5, hedefler: { mektep: 1, kiraathane: 1 } },
  { no: 2, gundem: "Namaz ve Huzur", evre: "bireysel", hedefGun: 5, hedefler: { sosyalmeydan: 1 } },
  { no: 3, gundem: "İlim ve Hikmet", evre: "bireysel", hedefGun: 5, hedefler: { otag: 2 } },
  { no: 4, gundem: "Dostluk ve Kardeşlik", evre: "birlik", hedefGun: 7, hedefler: { mektep: 2 } },
  { no: 5, gundem: "Dürüstlük", evre: "birlik", hedefGun: 7, hedefler: { kiraathane: 2, sosyalmeydan: 2 } },
  { no: 6, gundem: "Yardımseverlik", evre: "birlik", hedefGun: 7, hedefler: { mektep: 3, otag: 3 } },
  { no: 7, gundem: "Aile ve Sıla-i Rahim", evre: "meydan", hedefGun: 10, hedefler: { kiraathane: 3, sosyalmeydan: 3 } },
  { no: 8, gundem: "Sabır ve Şükür", evre: "meydan", hedefGun: 10, hedefler: { mektep: 4 } },
  { no: 9, gundem: "Adalet ve Emanet", evre: "meydan", hedefGun: 10, hedefler: { kiraathane: 4, sosyalmeydan: 4 } },
  { no: 10, gundem: "İhsan", evre: "meydan", hedefGun: 10, hedefler: { otag: 4 } },
];

// ---------- 3. KATMAN: GENEL HARİTA BÖLGELERİ (Level 6+) ----------
export const BOLGELER = [
  { id: "ihlas_vadisi", ad: "İhlas Vadisi", ikon: "🏞️", x: 45, y: 78, bedel: { erzak: 60, kereste: 45, tas: 30 }, temelGuc: 100 },
  { id: "hikmet_tepesi", ad: "Hikmet Tepesi", ikon: "⛰️", x: 40, y: 26, bedel: { erzak: 75, kereste: 60, tas: 45 }, temelGuc: 140 },
  { id: "kardeslik_ovasi", ad: "Kardeşlik Ovası", ikon: "🌾", x: 16, y: 52, bedel: { erzak: 90, kereste: 75, tas: 60 }, temelGuc: 180 },
  { id: "emanet_kalesi", ad: "Emanet Kalesi", ikon: "🏰", x: 66, y: 58, bedel: { erzak: 120, kereste: 100, tas: 75 }, temelGuc: 240 },
  { id: "sabir_limani", ad: "Sabır Limanı", ikon: "⚓", x: 88, y: 66, bedel: { erzak: 135, kereste: 120, tas: 90 }, temelGuc: 300 },
  { id: "ihsan_sancagi", ad: "İhsan Sancağı", ikon: "🚩", x: 82, y: 24, bedel: { erzak: 180, kereste: 150, tas: 120 }, temelGuc: 400 },
];
