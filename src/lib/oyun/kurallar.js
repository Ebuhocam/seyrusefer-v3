// =============================================================
// SEYRÜSEFER v3 — OYUN KURALLARI (saf fonksiyonlar)
// Arayüzden ve sunucudan (API) aynı şekilde kullanılır.
// Admin panelinden özelleştirilen bina bedelleri ve level hedeflerini de destekler.
// =============================================================
import {
  KAYNAKLAR,
  DEPO_SAAT,
  BINALAR,
  LEVELLAR,
  TARLA_PARSELLERI,
  MADEN_KAYALARI_TANIM,
} from "./sabitler";

const SAAT_MS = 60 * 60 * 1000;
const GUN_MS = 24 * SAAT_MS;

/** Bir kaynağın saatlik üretimi (1 işçide 24 saatte 15 birim = her 96 dakikada 1 birim; 0 işçide üretim durur) */
export function saatlikUretim(kaynak, isciSayisi = 1) {
  const isci = Math.max(0, Number(isciSayisi ?? 1));
  if (isci <= 0) return 0;
  const temel = (KAYNAKLAR[kaynak]?.gunluk ?? 15) / 24;
  return temel * (1 + (isci - 1) * 0.25);
}

/** İşçi sayısına göre bir parsel/kaya noktasının yeniden dolma süresi (ms). 1 işçide 24 saat, işçi arttıkça hızlanır. */
export function noktaDolumSuresiMs(isciSayisi = 1) {
  const isci = Math.max(0, Number(isciSayisi ?? 1));
  if (isci <= 0) return Infinity;
  const carpan = 1 + (isci - 1) * 0.25;
  return Math.round(GUN_MS / carpan);
}

/**
 * Tarla (3 parsel) veya Taş Ocağı (6 kaya) içindeki her bir noktanın bağımsız dolum/hazır durumunu döner.
 * Bir noktayı toplamak diğer noktaları ASLA kilitlemez.
 */
export function sahaNoktalariDurumu(kaynak, durum, simdi) {
  const liste = kaynak === "erzak" ? TARLA_PARSELLERI : MADEN_KAYALARI_TANIM;
  const isci = durum?.isciler?.[kaynak] ?? (kaynak === "tas" ? 0 : 1);
  const sureMs = noktaDolumSuresiMs(isci);
  const kayitHaritasi =
    kaynak === "erzak" ? durum?.sahaDurumu?.tarla ?? {} : durum?.sahaDurumu?.maden ?? {};
  const isciHizCarpani = isci > 0 ? 1 + (isci - 1) * 0.25 : 0;

  return liste.map((oge) => {
    const sonHasat = Number(kayitHaritasi[oge.id] ?? 0);
    if (isci <= 0) {
      return {
        ...oge,
        hazir: false,
        oran: 0,
        kalanDakika: null,
        miktar: 0,
      };
    }
    const gecen = sonHasat > 0 ? Math.max(0, simdi - sonHasat) : sureMs;
    const hazir = sonHasat <= 0 || gecen >= sureMs;
    const oran = hazir ? 100 : Math.min(99, Math.floor((gecen / sureMs) * 100));
    const kalanDakika = hazir ? 0 : Math.max(1, Math.ceil((sureMs - gecen) / 60000));
    const miktar = Math.max(1, Math.round(oge.temelMiktar * isciHizCarpani));
    return {
      ...oge,
      hazir,
      oran,
      kalanDakika,
      miktar,
    };
  });
}

/**
 * Orman keşif haritasının işçi başına 2 sefer hakkını (`işçiSayısı * 2`) ve açılan bölgeleri döner.
 */
export function ormanSeferBilgisi(durum, simdi) {
  const isci = Math.max(0, Number(durum?.isciler?.kereste ?? 1));
  const maksSefer = isci * 2;
  const bugunKod = Math.floor((simdi + 3 * SAAT_MS) / GUN_MS); // UTC+3 gün kodu
  const ham = durum?.ormanSefer ?? { gun: bugunKod, kullanilan: 0, maske: 0, sonSonuc: 0, aktifBolge: -1 };
  const ayniGun = Number(ham.gun) === bugunKod;

  const kullanilan = ayniGun ? Math.max(0, Number(ham.kullanilan || 0)) : 0;
  const maske = ayniGun ? Number(ham.maske || 0) : 0;
  const aktifBolge = ayniGun && Number.isInteger(ham.aktifBolge) ? ham.aktifBolge : -1;
  const kalanSefer = Math.max(0, maksSefer - kullanilan);
  const agacOdulu = Math.max(8, Math.round(12 * (1 + Math.max(0, isci - 1) * 0.25)));

  return {
    gun: bugunKod,
    isci,
    maksSefer,
    kullanilan,
    kalanSefer,
    maske,
    aktifBolge,
    sonSonuc: ayniGun ? Number(ham.sonSonuc || 0) : 0,
    agacOdulu,
  };
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
export function dolumBilgisi(kaynak, sonToplama, simdi, otagSeviye = 1, isciSayisi = 1, durum = null) {
  if (durum && (kaynak === "erzak" || kaynak === "tas")) {
    const noktalar = sahaNoktalariDurumu(kaynak, durum, simdi);
    const hazirNoktalar = noktalar.filter((n) => n.hazir);
    const toplamHazirMiktar = hazirNoktalar.reduce((t, n) => t + n.miktar, 0);
    const tamKapasite = noktalar.reduce((t, n) => t + Math.max(1, n.miktar), 0) || 15;
    const ortOran = Math.round(noktalar.reduce((t, n) => t + n.oran, 0) / noktalar.length);
    const enYakinDakika = noktalar
      .filter((n) => !n.hazir && n.kalanDakika != null)
      .reduce((min, n) => (min == null || n.kalanDakika < min ? n.kalanDakika : min), null);
    const evre =
      hazirNoktalar.length <= 0
        ? "bos"
        : hazirNoktalar.length >= noktalar.length
        ? "dolu"
        : "yari";

    return {
      biriken: toplamHazirMiktar,
      kapasite: tamKapasite,
      hazirAdet: hazirNoktalar.length,
      toplamAdet: noktalar.length,
      dolumOrani: ortOran,
      birimYuzdesi: ortOran,
      sonrakiBirimDakika: enYakinDakika,
      evre,
    };
  }

  if (durum && kaynak === "kereste") {
    const sefer = ormanSeferBilgisi(durum, simdi);
    const hazirSefer = sefer.kalanSefer + (sefer.aktifBolge >= 0 ? 1 : 0);
    const oran = sefer.maksSefer > 0 ? Math.round((hazirSefer / sefer.maksSefer) * 100) : 0;
    return {
      biriken: hazirSefer,
      kapasite: sefer.maksSefer,
      hazirAdet: hazirSefer,
      toplamAdet: sefer.maksSefer,
      dolumOrani: oran,
      birimYuzdesi: oran,
      sonrakiBirimDakika: hazirSefer > 0 ? 0 : 60,
      evre: hazirSefer <= 0 ? "bos" : hazirSefer >= sefer.maksSefer ? "dolu" : "yari",
    };
  }

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
