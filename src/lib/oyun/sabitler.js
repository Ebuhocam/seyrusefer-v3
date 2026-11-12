// =============================================================
// SEYRÜSEFER v3 — OYUN SABİTLERİ
// Tasarım dokümanındaki tabloların tek kaynağı.
// İleride admin panelinden düzenlenebilir hale gelecek (Faz 5).
// =============================================================

// ---------- KAYNAKLAR ----------
// Görevler kaynak VERMEZ. Kaynaklar sadece üretim alanlarından zamanla birikir.
export const KAYNAKLAR = {
  erzak: { ad: "Erzak", ikon: "🌾", alan: "tarla", gunluk: 100, acilisLevel: 1 },
  kereste: { ad: "Kereste", ikon: "🌲", alan: "orman", gunluk: 80, acilisLevel: 1 },
  tas: { ad: "Taş", ikon: "🧱", alan: "maden", gunluk: 60, acilisLevel: 2 },
};

// Depo kapasitesi: Otağ seviyesine göre kaç saatlik üretim birikebilir
export const DEPO_SAAT = { 1: 24, 2: 36, 3: 48, 4: 48 };

// ---------- BİNALAR ----------
// bedel[seviye] = o seviyeye çıkmak (veya inşa etmek) için gereken kaynak
// acilis[seviye] = o seviyeye çıkılabilmesi için gereken oyuncu leveli
export const BINALAR = {
  otag: {
    ad: "Otağ",
    gorsel: (s) => `/assets/binalar/otag${s}.webp`,
    maksSeviye: 4,
    baslangicSeviye: 1, // oyuna hazır başlar
    acilis: { 2: 3, 3: 6, 4: 10 },
    bedel: {
      2: { erzak: 250, kereste: 200, tas: 150 },
      3: { erzak: 250, kereste: 200, tas: 150 },
      4: { erzak: 1200, kereste: 1000, tas: 800 },
    },
  },
  cami: {
    ad: "Cami",
    gorsel: (s) => `/assets/binalar/cami${s}.webp`,
    maksSeviye: 4,
    acilis: { 1: 1, 2: 4, 3: 6, 4: 8 },
    bedel: {
      1: { erzak: 400, kereste: 300 },
      2: { erzak: 550, kereste: 450, tas: 300 },
      3: { erzak: 700, kereste: 550, tas: 400 },
      4: { erzak: 1000, kereste: 800, tas: 600 },
    },
  },
  medrese: {
    ad: "Medrese",
    gorsel: (s) => `/assets/binalar/medrese${s}.webp`,
    maksSeviye: 4,
    acilis: { 1: 2, 2: 5, 3: 7, 4: 9 },
    bedel: {
      1: { erzak: 350, kereste: 300, tas: 200 },
      2: { erzak: 250, kereste: 200, tas: 150 },
      3: { erzak: 450, kereste: 350, tas: 250 },
      4: { erzak: 500, kereste: 400, tas: 300 },
    },
  },
  sosyalmeydan: {
    ad: "Sosyal Meydan",
    gorsel: (s) => `/assets/binalar/sosyalmeydan${s}.webp`,
    maksSeviye: 4,
    acilis: { 1: 3, 2: 5, 3: 7, 4: 9 },
    bedel: {
      1: { erzak: 200, kereste: 150, tas: 100 },
      2: { erzak: 150, kereste: 100, tas: 100 },
      3: { erzak: 400, kereste: 300, tas: 250 },
      4: { erzak: 400, kereste: 350, tas: 250 },
    },
  },
  takasmerkezi: {
    ad: "Takas Merkezi",
    gorsel: () => `/assets/binalar/takasmerkezi.webp`,
    maksSeviye: 1,
    acilis: { 1: 5 },
    bedel: { 1: { erzak: 150, kereste: 150, tas: 100 } },
  },
  oyuncadiri: {
    ad: "Oyun Çadırı",
    gorsel: () => `/assets/binalar/oyuncadiri.webp`,
    maksSeviye: 1,
    acilis: { 1: 6 },
    bedel: { 1: { erzak: 200, kereste: 150, tas: 100 } },
  },
};

// ---------- HARİTA YERLEŞİMİ ----------
// Koordinatlar arka plan görselinin (1710x920) yüzdesi cinsinden.
// x/y = arsanın zemin merkezi, genislik = bina görselinin harita genişliğine oranı.
// Faz 1'de ekranda ince ayar yapılacak.
export const ARSALAR = {
  otag: { x: 56.1, y: 77.5, genislik: 15 },
  cami: { x: 41.2, y: 64, genislik: 12 },
  medrese: { x: 67.8, y: 35, genislik: 11 },
  sosyalmeydan: { x: 55.6, y: 49, genislik: 9 },
  takasmerkezi: { x: 77.2, y: 50.5, genislik: 11 },
  oyuncadiri: { x: 69, y: 63.5, genislik: 10 },
};

// Haritada sabit duran etkileşim noktaları
export const NOKTALAR = {
  pano: { ad: "Görev Panosu", ikon: "📜", x: 54.3, y: 23 },
  tarla: { ad: "Tarla", ikon: "🌾", x: 10.5, y: 54, kaynak: "erzak" },
  orman: { ad: "Orman", ikon: "🌲", x: 8, y: 22, kaynak: "kereste" },
  maden: { ad: "Maden", ikon: "⛏️", x: 93, y: 60, kaynak: "tas" },
  seyyah: { ad: "Seyyah", ikon: "🏇", x: 49.7, y: 89, acilisLevel: 4 },
};

// ---------- LEVELLAR ----------
export const BIRLIK_ACILIS_LEVEL = 4;
export const ALAN_MUCADELESI_LEVEL = 6;

// hedefler: level atlamak için ulaşılması gereken bina seviyeleri
export const LEVELLAR = [
  { no: 1, gundem: "Niyet ve İhlas", evre: "bireysel", hedefGun: 5, hedefler: { cami: 1 } },
  { no: 2, gundem: "Namaz", evre: "bireysel", hedefGun: 5, hedefler: { medrese: 1 } },
  { no: 3, gundem: "İlim ve Hikmet", evre: "bireysel", hedefGun: 5, hedefler: { sosyalmeydan: 1, otag: 2 } },
  { no: 4, gundem: "Dostluk ve Kardeşlik", evre: "birlik", hedefGun: 7, hedefler: { cami: 2 } },
  { no: 5, gundem: "Dürüstlük", evre: "birlik", hedefGun: 7, hedefler: { takasmerkezi: 1, medrese: 2, sosyalmeydan: 2 } },
  { no: 6, gundem: "Yardımseverlik", evre: "birlik", hedefGun: 7, hedefler: { oyuncadiri: 1, cami: 3, otag: 3 } },
  { no: 7, gundem: "Aile ve Sıla-i Rahim", evre: "meydan", hedefGun: 10, hedefler: { medrese: 3, sosyalmeydan: 3 } },
  { no: 8, gundem: "Sabır ve Şükür", evre: "meydan", hedefGun: 10, hedefler: { cami: 4 } },
  { no: 9, gundem: "Adalet ve Emanet", evre: "meydan", hedefGun: 10, hedefler: { medrese: 4, sosyalmeydan: 4 } },
  { no: 10, gundem: "İhsan", evre: "meydan", hedefGun: 10, hedefler: { otag: 4 } },
];
