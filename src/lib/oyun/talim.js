// ---------- SANCAK TALİMİ (Talimhane) ----------
// 37 altıgenlik bir bölge haritası (yarıçap 3). Birlikler bilgi düellosuyla altıgen kazanır.
// Harita her hafta (pazartesi) sıfırlanır; hafta sonunda en çok altıgen tutan birlik "Haftanın Sancaktarı" olur.

export const TALIM_YARICAP = 3;
export const TALIM_SORU_SAYISI = 5;
export const TALIM_SORU_SURE_SN = 15;
export const TALIM_GUNLUK_TEMEL_HAK = 1;

/** Arazi türleri: hedef = kazanmak için gereken en az doğru sayısı (5 sorudan) */
export const TALIM_ARAZILERI = {
  ova: { ad: "Ova", ikon: "🌾", hedef: 3, zorluklar: [1, 1, 1, 2, 2], renk: "#a3b86c" },
  tepe: { ad: "Tepe", ikon: "⛰️", hedef: 4, zorluklar: [1, 2, 2, 2, 3], renk: "#b08d57" },
  kale: { ad: "Kale", ikon: "🏰", hedef: 5, zorluklar: [2, 2, 3, 3, 3], renk: "#8f8a99" },
};

const ADLAR = [
  "Gök Sırtı", "Söğütlü Dere", "Pınarbaşı", "Ulu Tepe", "Kızılyar", "Akdere", "Kartal Kayası", "Değirmen Önü",
  "Ardıçlı Yayla", "Taşlıbayır", "Bademli", "Çamlıbel", "Sarıyurt", "Kavaklı Ova", "Demirkapı", "Yeşilyurt",
  "Ilgaz Yolu", "Ballıca", "Kocapınar", "Ak Kale", "Kemerli Köprü", "Sazlıdere", "Çınarlı", "Gümüşsu",
  "Bozkır", "Altınova", "Karaağaç", "Elmalı", "Şahin Tepe", "Dumanlı", "Seyrantepe", "Kuzey Gözcü",
  "Güney Gözcü", "Doğu Burcu", "Batı Burcu", "Fener Tepe", "Sancak Kalesi",
];

function araziBul(q, r) {
  const s = -q - r;
  const uzaklik = Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
  if (uzaklik === 0) return "kale"; // merkezdeki Sancak Kalesi
  // dış halkanın 6 köşesi kale
  if (uzaklik === TALIM_YARICAP && [q, r, s].filter((v) => Math.abs(v) === TALIM_YARICAP).length === 2) return "kale";
  if (uzaklik === 1) return "tepe";
  // ikinci halkada dönüşümlü tepe / ova
  if (uzaklik === 2) return (q + 2 * r + 9) % 3 === 0 ? "tepe" : "ova";
  return "ova";
}

/** Haritadaki bütün altıgenler (eksenel koordinat q, r) */
export const TALIM_HUCRELERI = (() => {
  const liste = [];
  for (let q = -TALIM_YARICAP; q <= TALIM_YARICAP; q++) {
    for (let r = -TALIM_YARICAP; r <= TALIM_YARICAP; r++) {
      const s = -q - r;
      if (Math.abs(s) > TALIM_YARICAP) continue;
      liste.push({ id: `${q},${r}`, q, r, arazi: araziBul(q, r) });
    }
  }
  // Merkeze olan uzaklığa göre sırala ki adlar düzenli dağılsın; merkez "Sancak Kalesi"
  liste.sort((a, b) => Math.max(Math.abs(a.q), Math.abs(a.r), Math.abs(a.q + a.r)) - Math.max(Math.abs(b.q), Math.abs(b.r), Math.abs(b.q + b.r)) || a.q - b.q || a.r - b.r);
  return liste.map((h, i) => ({ ...h, ad: i === 0 ? "Sancak Kalesi" : ADLAR[(i - 1) % (ADLAR.length - 1)] }));
})();

export const talimHucresi = (id) => TALIM_HUCRELERI.find((h) => h.id === id) ?? null;

/** Pazartesi başlayan hafta numarası (trGunNo: 1 Ocak 1970 Perşembe = 0) */
export const talimHaftasi = (gunNo) => Math.floor((gunNo + 3) / 7);
