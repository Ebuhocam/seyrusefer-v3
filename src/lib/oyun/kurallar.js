// =============================================================
// SEYRÜSEFER v3 — OYUN KURALLARI (saf fonksiyonlar)
// Arayüzden ve sunucudan (API) aynı şekilde kullanılır.
// Admin panelinden özelleştirilen bina bedelleri ve level hedeflerini de destekler.
// =============================================================
import { KAYNAKLAR, DEPO_SAAT, BINALAR, LEVELLAR } from "./sabitler";

const SAAT_MS = 60 * 60 * 1000;

/** Bir kaynağın saatlik üretimi (1 işçide 24 saatte 15 birim = her 96 dakikada 1 birim; 0 işçide üretim durur) */
export function saatlikUretim(kaynak, isciSayisi = 1) {
  const isci = Math.max(0, Number(isciSayisi ?? 1));
  if (isci <= 0) return 0;
  const temel = (KAYNAKLAR[kaynak]?.gunluk ?? 15) / 24;
  return temel * (1 + (isci - 1) * 0.25);
}

/** Oba seviyesine göre bir kaynağın depo kapasitesi (Lv.1'de 24 saat = 15 birim) */
export function depoKapasitesi(kaynak, otagSeviye = 1) {
  const temelSaatlik = (KAYNAKLAR[kaynak]?.gunluk ?? 15) / 24;
  return Math.max(15, Math.round(temelSaatlik * (DEPO_SAAT[otagSeviye] ?? 24)));
}

/** Üretim alanı açık mı? */
export const kaynakAcikMi = (kaynak, oyuncuLevel) => oyuncuLevel >= KAYNAKLAR[kaynak].acilisLevel;

/** Son toplamadan bu yana alanda biriken (henüz toplanmamış) tam sayı miktar */
export function biriken(kaynak, sonToplama, simdi, otagSeviye = 1, isciSayisi = 1) {
  if (sonToplama == null) return 0;
  const saat = Math.max(0, (simdi - sonToplama) / SAAT_MS);
  return Math.min(depoKapasitesi(kaynak, otagSeviye), Math.floor(saat * saatlikUretim(kaynak, isciSayisi)));
}

/**
 * Bir üretim alanının (Tarla, Orman, Taş Ocağı) anlık 24 saatlik dolum oranını,
 * toplanabilir birim sayısını, bir sonraki 1 birime kalan dakikayı ve görsel evresini döner.
 */
export function dolumBilgisi(kaynak, sonToplama, simdi, otagSeviye = 1, isciSayisi = 1) {
  const kapasite = depoKapasitesi(kaynak, otagSeviye);
  const saatlik = saatlikUretim(kaynak, isciSayisi);
  if (sonToplama == null || saatlik <= 0) {
    return {
      biriken: 0,
      kapasite,
      dolumOrani: 0,
      birimYuzdesi: 0,
      sonrakiBirimDakika: null,
      evre: "bos",
    };
  }
  const gecenSaat = Math.max(0, (simdi - sonToplama) / SAAT_MS);
  const hamMiktar = Math.min(kapasite, gecenSaat * saatlik);
  const tamBirim = Math.floor(hamMiktar);
  const dolumOrani = Math.min(100, Math.round((hamMiktar / kapasite) * 100));
  const birimYuzdesi = tamBirim >= kapasite ? 100 : Math.min(99, Math.round((hamMiktar - tamBirim) * 100));
  const sonrakiBirimDakika =
    tamBirim >= kapasite ? 0 : Math.max(1, Math.ceil(((tamBirim + 1 - hamMiktar) / saatlik) * 60));
  const evre = tamBirim <= 0 ? "bos" : tamBirim >= kapasite ? "dolu" : "yari";

  return {
    biriken: tamBirim,
    kapasite,
    dolumOrani,
    birimYuzdesi,
    sonrakiBirimDakika,
    evre,
  };
}

/** Kaynak bedeli karşılanıyor mu? Eksik olanları da döner. */
export function bedelKontrol(bedel, envanter) {
  const eksik = {};
  for (const [k, miktar] of Object.entries(bedel ?? {})) {
    const m = Number(miktar) || 0;
    if (m <= 0) continue;
    const fark = m - (envanter[k] ?? 0);
    if (fark > 0) eksik[k] = fark;
  }
  return { yeterli: Object.keys(eksik).length === 0, eksik };
}

/**
 * Bir binanın yükseltme durumunu hesaplar.
 * İki anahtar kuralı: görev şartı + kaynak bedeli (+ oyuncu level şartı)
 */
export function binaDurumu(binaId, durum, ozelBinalar = null) {
  const varsayilan = BINALAR[binaId];
  const ozel = ozelBinalar?.[binaId];
  const tanim = ozel
    ? {
        ...varsayilan,
        acilis: { ...varsayilan.acilis, ...ozel.acilis },
        bedel: { ...varsayilan.bedel, ...ozel.bedel },
      }
    : varsayilan;

  const seviye = durum.binalar[binaId] ?? 0;
  const hedef = seviye + 1;

  if (seviye >= tanim.maksSeviye) {
    return { binaId, seviye, maks: true };
  }

  const gerekenLevel = tanim.acilis[hedef];
  const levelYeterli = durum.level >= gerekenLevel;
  const bedel = tanim.bedel[hedef] ?? {};
  const kaynak = bedelKontrol(bedel, durum.envanter);
  const gorevGerekmez = !!tanim.gorevSartsiz || (!!tanim.ilkKurulumGorevsiz && hedef === 1);
  const gorevTamam = levelYeterli && (gorevGerekmez || durum.gorevlerTamam(binaId, hedef));

  return {
    binaId,
    seviye,
    hedef,
    maks: false,
    gerekenLevel,
    levelYeterli,
    gorevGerekmez,
    gorevTamam,
    bedel,
    kaynakYeterli: kaynak.yeterli,
    eksik: kaynak.eksik,
    yapilabilir: levelYeterli && gorevTamam && kaynak.yeterli,
  };
}

/** Oyuncu levelının bina hedefleri ve ilerlemesi */
export function levelDurumu(level, binalar, ozelLevellar = null) {
  const varsayilan = LEVELLAR.find((l) => l.no === level);
  if (!varsayilan) return null;
  const ozel = ozelLevellar?.[level];
  const tanim = ozel ? { ...varsayilan, ...ozel, hedefler: ozel.hedefler ?? varsayilan.hedefler } : varsayilan;

  const hedefler = Object.entries(tanim.hedefler ?? {}).map(([binaId, seviye]) => ({
    binaId,
    seviye: Number(seviye),
    tamam: (binalar[binaId] ?? 0) >= Number(seviye),
  }));
  return { ...tanim, hedefler, binalarTamam: hedefler.every((h) => h.tamam) };
}
