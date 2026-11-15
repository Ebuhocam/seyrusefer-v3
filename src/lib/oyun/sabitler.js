// =============================================================
// SEYRÜSEFER v3 — OYUN SABİTLERİ (3 Katmanlı Dünya)
// 1. Katman: Kendi Köyüm (Oba, Mektep, Kıraathane, Köy Meydanı, Haberci, Tarla/Orman/Maden)
// 2. Katman: Birlik Alanı (Büyük Otağ, Ulu Cami, Medrese, Takas Merkezi, Oyun Çadırı)
// 3. Katman: Genel Harita (6 Stratejik Sancak Bölgesi)
// =============================================================

// ---------- 4 TEMEL KAYNAK ----------
// Mahsul, Tahta, Taş üretim alanlarından saatlik birikir.
// İnsan (Ahali) ise Kıraathane'ye gelen yolculara ev kurma teklif edilerek (Mutluluk oranına göre) kazanılır.
export const KAYNAKLAR = {
  erzak: { ad: "Mahsul", ikon: "🌾", alan: "tarla", gunluk: 100, acilisLevel: 1, uretim: true },
  kereste: { ad: "Tahta", ikon: "🌲", alan: "orman", gunluk: 80, acilisLevel: 1, uretim: true },
  tas: { ad: "Taş", ikon: "🧱", alan: "maden", gunluk: 60, acilisLevel: 2, uretim: true },
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
      1: { erzak: 120, kereste: 140 },
      2: { erzak: 220, kereste: 240, tas: 120 },
      3: { erzak: 380, kereste: 400, tas: 250 },
    },
  };
}

export const EV_IDLERI = ["kendi_evim", "ev1", "ev2", "ev3", "ev4", "ev5"];

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
      2: { erzak: 250, kereste: 200, tas: 150, insan: 6 },
      3: { erzak: 350, kereste: 300, tas: 200, insan: 10 },
      4: { erzak: 1000, kereste: 800, tas: 600, insan: 18 },
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
      2: { erzak: 450, kereste: 350, tas: 250, insan: 7 },
      3: { erzak: 650, kereste: 500, tas: 350, insan: 11 },
      4: { erzak: 900, kereste: 700, tas: 500, insan: 15 },
    },
  },
  kiraathane: {
    ad: "Kıraathane",
    aciklama: "Ozan Dede burada türkülerin hikâyesini anlatır; köye gelen yolculara burada ev teklif edilir.",
    gorsel: () => `/assets/binalar/kiraathane.webp`,
    maksSeviye: 4,
    acilis: { 1: 1, 2: 5, 3: 7, 4: 9 },
    bedel: {
      1: { erzak: 200, kereste: 180, insan: 3 },
      2: { erzak: 300, kereste: 250, tas: 150, insan: 6 },
      3: { erzak: 450, kereste: 350, tas: 250, insan: 9 },
      4: { erzak: 600, kereste: 450, tas: 350, insan: 14 },
    },
  },
  sosyalmeydan: {
    ad: "Köy Meydanı",
    aciklama: "Ahali ile hasbihal, gündem paylaşımları ve halkın davalarının dinlendiği meydan.",
    gorsel: (s) => `/assets/binalar/sosyalmeydan${s}.webp`,
    maksSeviye: 4,
    acilis: { 1: 2, 2: 5, 3: 7, 4: 9 },
    bedel: {
      1: { erzak: 250, kereste: 200, tas: 100, insan: 5 },
      2: { erzak: 300, kereste: 250, tas: 150, insan: 8 },
      3: { erzak: 450, kereste: 350, tas: 250, insan: 12 },
      4: { erzak: 600, kereste: 450, tas: 350, insan: 16 },
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
  haberci: { ad: "Haberci", ikon: "🏇", x: 51.8, y: 88.5, acilisLevel: 1 },
};

// ---------- 2. KATMAN: BİRLİK ALANI BİNALARI (Level 4+) ----------
export const BIRLIK_BINALARI = {
  otag: {
    ad: "Birlik Otağı",
    aciklama: "Birliğin mesajlaşma (istişare) odası ve ortak vergi/kasa toplama merkezi.",
    gorsel: (s) => `/assets/binalar/otag${Math.min(4, Math.max(1, s || 4))}.webp`,
    x: 47.5,
    y: 27,
    genislik: 15,
    maksSeviye: 4,
    bedel: {
      2: { erzak: 500, kereste: 400, tas: 300 },
      3: { erzak: 900, kereste: 700, tas: 500 },
      4: { erzak: 1500, kereste: 1200, tas: 900 },
    },
  },
  cami: {
    ad: "Ulu Cami",
    aciklama: "Birlik kardeşlerinin ortak namaz çetelesi ve maneviyat merkezi.",
    gorsel: (s) => `/assets/binalar/cami${Math.min(4, Math.max(1, s || 1))}.webp`,
    x: 18,
    y: 50,
    genislik: 14,
    maksSeviye: 4,
    bedel: {
      2: { erzak: 600, kereste: 500, tas: 350 },
      3: { erzak: 1000, kereste: 800, tas: 600 },
      4: { erzak: 1600, kereste: 1300, tas: 1000 },
    },
  },
  medrese: {
    ad: "Birlik Medresesi",
    aciklama: "Birliğin ortak ilim, metin okuma, video ve sınav külliyesi.",
    gorsel: (s) => `/assets/binalar/medrese${Math.min(4, Math.max(1, s || 2))}.webp`,
    x: 73,
    y: 38,
    genislik: 14,
    maksSeviye: 4,
    bedel: {
      2: { erzak: 500, kereste: 450, tas: 300 },
      3: { erzak: 850, kereste: 700, tas: 500 },
      4: { erzak: 1400, kereste: 1100, tas: 850 },
    },
  },
  takasmerkezi: {
    ad: "Vergi & Takas Merkezi",
    aciklama: "Üyelerin ortak vergi katkıları ve kardeş teşvik noktası.",
    gorsel: () => `/assets/binalar/takasmerkezi.webp`,
    x: 56,
    y: 84,
    genislik: 12,
    maksSeviye: 2,
    bedel: {
      2: { erzak: 400, kereste: 350, tas: 250 },
    },
  },
  oyuncadiri: {
    ad: "Cenk & Yarışma Çadırı",
    aciklama: "Genel Harita mücadelelerine hazırlık ve istişare çadırı.",
    gorsel: () => `/assets/binalar/oyuncadiri.webp`,
    x: 84,
    y: 65,
    genislik: 12,
    maksSeviye: 2,
    bedel: {
      2: { erzak: 400, kereste: 350, tas: 250 },
    },
  },
};

// ---------- LEVELLAR ----------
export const BIRLIK_ACILIS_LEVEL = 4;
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
  { id: "ihlas_vadisi", ad: "İhlas Vadisi", ikon: "🏞️", x: 45, y: 78, bedel: { erzak: 200, kereste: 150, tas: 100 }, temelGuc: 100 },
  { id: "hikmet_tepesi", ad: "Hikmet Tepesi", ikon: "⛰️", x: 40, y: 26, bedel: { erzak: 250, kereste: 200, tas: 150 }, temelGuc: 140 },
  { id: "kardeslik_ovasi", ad: "Kardeşlik Ovası", ikon: "🌾", x: 16, y: 52, bedel: { erzak: 300, kereste: 250, tas: 200 }, temelGuc: 180 },
  { id: "emanet_kalesi", ad: "Emanet Kalesi", ikon: "🏰", x: 66, y: 58, bedel: { erzak: 400, kereste: 350, tas: 250 }, temelGuc: 240 },
  { id: "sabir_limani", ad: "Sabır Limanı", ikon: "⚓", x: 88, y: 66, bedel: { erzak: 450, kereste: 400, tas: 300 }, temelGuc: 300 },
  { id: "ihsan_sancagi", ad: "İhsan Sancağı", ikon: "🚩", x: 82, y: 24, bedel: { erzak: 600, kereste: 500, tas: 400 }, temelGuc: 400 },
];
