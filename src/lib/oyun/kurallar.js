// =============================================================
// SEYRÜSEFER v3 — OYUN KURALLARI (saf fonksiyonlar)
// Arayüzden ve ileride sunucudan (API) aynı şekilde kullanılır.
// =============================================================
import { KAYNAKLAR, DEPO_SAAT, BINALAR, LEVELLAR } from "./sabitler";

const SAAT_MS = 60 * 60 * 1000;

/** Bir kaynağın saatlik üretimi */
export const saatlikUretim = (kaynak) => KAYNAKLAR[kaynak].gunluk / 24;

/** Otağ seviyesine göre bir kaynağın depo kapasitesi */
export function depoKapasitesi(kaynak, otagSeviye) {
  return Math.floor(saatlikUretim(kaynak) * (DEPO_SAAT[otagSeviye] ?? 24));
}

/** Üretim alanı açık mı? */
export const kaynakAcikMi = (kaynak, oyuncuLevel) => oyuncuLevel >= KAYNAKLAR[kaynak].acilisLevel;

/** Son toplamadan bu yana alanda biriken (henüz toplanmamış) miktar */
export function biriken(kaynak, sonToplama, simdi, otagSeviye) {
  const saat = Math.max(0, (simdi - sonToplama) / SAAT_MS);
  return Math.min(depoKapasitesi(kaynak, otagSeviye), Math.floor(saat * saatlikUretim(kaynak)));
}

/** Kaynak bedeli karşılanıyor mu? Eksik olanları da döner. */
export function bedelKontrol(bedel, envanter) {
  const eksik = {};
  for (const [k, miktar] of Object.entries(bedel)) {
    const fark = miktar - (envanter[k] ?? 0);
    if (fark > 0) eksik[k] = fark;
  }
  return { yeterli: Object.keys(eksik).length === 0, eksik };
}

/**
 * Bir binanın yükseltme durumunu hesaplar.
 * İki anahtar kuralı: görev şartı + kaynak bedeli (+ oyuncu level şartı)
 *
 * @param {string} binaId
 * @param {{ level:number, binalar:Record<string,number>, envanter:Record<string,number>,
 *           gorevlerTamam:(binaId:string, hedefSeviye:number)=>boolean }} durum
 */
export function binaDurumu(binaId, durum) {
  const tanim = BINALAR[binaId];
  const seviye = durum.binalar[binaId] ?? 0;
  const hedef = seviye + 1;

  if (seviye >= tanim.maksSeviye) {
    return { binaId, seviye, maks: true };
  }

  const gerekenLevel = tanim.acilis[hedef];
  const levelYeterli = durum.level >= gerekenLevel;
  const bedel = tanim.bedel[hedef];
  const kaynak = bedelKontrol(bedel, durum.envanter);
  const gorevTamam = levelYeterli && durum.gorevlerTamam(binaId, hedef);

  return {
    binaId,
    seviye,
    hedef,
    maks: false,
    gerekenLevel,
    levelYeterli,
    gorevTamam,
    bedel,
    kaynakYeterli: kaynak.yeterli,
    eksik: kaynak.eksik,
    yapilabilir: levelYeterli && gorevTamam && kaynak.yeterli,
  };
}

/** Oyuncu levelının bina hedefleri ve ilerlemesi */
export function levelDurumu(level, binalar) {
  const tanim = LEVELLAR.find((l) => l.no === level);
  if (!tanim) return null;
  const hedefler = Object.entries(tanim.hedefler).map(([binaId, seviye]) => ({
    binaId,
    seviye,
    tamam: (binalar[binaId] ?? 0) >= seviye,
  }));
  return { ...tanim, hedefler, binalarTamam: hedefler.every((h) => h.tamam) };
}
