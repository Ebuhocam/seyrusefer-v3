import "server-only";

// Sonradan eklenen tablolar: göç (migration) çalıştırılmamış olsa da ilk istekte kurulur.
const SQL = [
  `CREATE TABLE IF NOT EXISTS ders_calisma (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kullanici_id INTEGER NOT NULL,
    gun INTEGER NOT NULL,
    tur TEXT NOT NULL,
    hedef_dakika INTEGER NOT NULL,
    dakika INTEGER NOT NULL DEFAULT 0,
    baslangic INTEGER NOT NULL,
    bitis INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS ders_calisma_kullanici_gun ON ders_calisma (kullanici_id, gun)`,
  `CREATE TABLE IF NOT EXISTS takas_teklifleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    birlik_id INTEGER NOT NULL,
    veren_id INTEGER NOT NULL,
    ver_kaynak TEXT NOT NULL,
    ver_miktar INTEGER NOT NULL,
    al_kaynak TEXT NOT NULL,
    al_miktar INTEGER NOT NULL,
    durum TEXT NOT NULL DEFAULT 'acik',
    alan_id INTEGER,
    olusturma INTEGER NOT NULL,
    kapanis INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS takas_birlik_durum ON takas_teklifleri (birlik_id, durum, olusturma DESC)`,
  `CREATE TABLE IF NOT EXISTS talim_bolgeleri (
    hafta INTEGER NOT NULL,
    hucre TEXT NOT NULL,
    birlik_id INTEGER NOT NULL,
    kullanici_id INTEGER NOT NULL,
    takviye INTEGER NOT NULL DEFAULT 0,
    guncelleme INTEGER NOT NULL,
    PRIMARY KEY (hafta, hucre)
  )`,
  `CREATE TABLE IF NOT EXISTS talim_kullanim (
    kullanici_id INTEGER NOT NULL,
    gun INTEGER NOT NULL,
    kullanilan INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (kullanici_id, gun)
  )`,
  `CREATE TABLE IF NOT EXISTS talim_duello (
    kullanici_id INTEGER PRIMARY KEY,
    hucre TEXT NOT NULL,
    hafta INTEGER NOT NULL,
    sorular TEXT NOT NULL,
    baslangic INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS birlik_mesaj_sikayet (
    mesaj_id INTEGER NOT NULL,
    kullanici_id INTEGER NOT NULL,
    olusturma INTEGER NOT NULL,
    PRIMARY KEY (mesaj_id, kullanici_id)
  )`,
];

export async function ekTablolariHazirla(d) {
  if (globalThis.__ekTablolarHazir) return;
  for (const s of SQL) await d.prepare(s).run();
  globalThis.__ekTablolarHazir = true;
}

/** Öğrencinin üyesi olduğu birlik (yoksa null) */
export async function uyelikBul(d, kullaniciId) {
  return d
    .prepare(
      `SELECT u.birlik_id, b.ad, b.renk, b.lider_id
         FROM birlik_uyeleri u JOIN birlikler b ON b.id = u.birlik_id
        WHERE u.kullanici_id = ?`
    )
    .bind(kullaniciId)
    .first();
}

// Çocuk sohbeti için temel kötü söz filtresi: harfler sadeleştirilip (ı→i, ş→s, 0→o …) kök aranır.
// Tam kelime olarak aranır (başka kelimelerin içinde geçebildiği için: "sıkıcı", "götürmek" engellenmesin)
const KOTU_TAM = ["amk", "aq", "sg", "piç", "pic", "sik", "göt", "got", "salak", "aptal", "hıyar", "hiyar", "mal"];
// Kelime başında ya da bitişik yazımda aranan belirgin kökler
const KOTU_KOKLER = [
  "orospu", "yarrak", "pezevenk", "kahpe", "kaltak", "ibne", "puşt", "pust", "gavat", "şerefsiz", "serefsiz",
  "haysiyetsiz", "gerizekalı", "gerizekali", "dangalak", "ananı", "anani", "bacını", "bacini", "siktir",
];
function sadelestir(metin) {
  return String(metin)
    .toLocaleLowerCase("tr")
    .replace(/[ıİ]/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/[^a-z\s]/g, "")
    .replace(/(.)\1{2,}/g, "$1");
}
const SADE_TAM = new Set(KOTU_TAM.map(sadelestir));
const SADE_KOKLER = [...new Set(KOTU_KOKLER.map(sadelestir))];
export function kotuSozVarMi(metin) {
  const sade = sadelestir(metin);
  const kelimeler = sade.split(/\s+/).filter(Boolean);
  const bitisik = sade.replace(/\s+/g, "");
  if (kelimeler.some((w) => SADE_TAM.has(w))) return true;
  return SADE_KOKLER.some((k) => kelimeler.some((w) => w.startsWith(k)) || (k.length >= 6 && bitisik.includes(k)));
}
