// =============================================================
// SEYRÜSEFER v3 — OYUN EYLEMLERİ (saf fonksiyonlar)
// Bir oyun durumunu alıp yeni durumu döner. Sunucu (API) bunları kullanır;
// istemci sadece sonucu gösterir. Geçersiz eylemde { hata } döner.
// =============================================================
import { KAYNAKLAR, BINALAR, LEVELLAR } from "./sabitler";
import { biriken, binaDurumu, kaynakAcikMi, levelDurumu } from "./kurallar";
import {
  NAMAZ_VAKITLERI,
  oyunGunu,
  levelGorevTanimlari,
  levelIcerigi,
  binaGorevleriTamamMi,
  tumLevelGorevleriTamamMi,
} from "./gorevler";
import { koyDavalariListesi, gocmenDurumu } from "./hikayeler";

const SAAT_MS = 60 * 60 * 1000;
const BOS_NAMAZ = { sabah: 0, ogle: 0, ikindi: 0, aksam: 0, yatsi: 0 };

/** Yeni oyuncunun başlangıç durumu */
export function baslangicDurumu(simdi) {
  const binalar = {};
  for (const [id, t] of Object.entries(BINALAR)) if (t.baslangicSeviye) binalar[id] = t.baslangicSeviye;
  const envanter = Object.fromEntries(Object.keys(KAYNAKLAR).map((k) => [k, k === "insan" ? 5 : 0]));
  const d = {
    level: 1,
    binalar,
    envanter,
    sonToplama: Object.fromEntries(Object.keys(KAYNAKLAR).map((k) => [k, null])),
    mutluluk: 60,
    cozulenDavalar: [],
    sonGocmenKontrol: 0,
    gorevlerTamam: false,
    gorevIlerlemesi: {},
    bugunNamaz: { ...BOS_NAMAZ },
    zamanKaydirma: 0,
  };
  return uretimiBaslat(d, simdi);
}

/** Level'a göre açılmış ama henüz başlamamış üretim alanlarını şimdi başlatır */
export function uretimiBaslat(d, simdi) {
  const sonToplama = { ...d.sonToplama };
  for (const [k, tanim] of Object.entries(KAYNAKLAR)) {
    if (tanim.uretim !== false && kaynakAcikMi(k, d.level) && sonToplama[k] == null) {
      sonToplama[k] = simdi;
    }
  }
  return { ...d, sonToplama };
}

export const gorevKontrol = (d, ayarlar = null) => ({
  ...d,
  gorevlerTamam: (binaId) => binaGorevleriTamamMi(d.level, binaId, d.gorevIlerlemesi, d.gorevlerTamam, ayarlar),
});

export function topla(d, kaynak, simdi) {
  if (!KAYNAKLAR[kaynak] || KAYNAKLAR[kaynak].uretim === false) return { hata: "Bu kaynak üretim alanından toplanmaz" };
  if (!kaynakAcikMi(kaynak, d.level) || d.sonToplama[kaynak] == null) return { hata: "Bu alan henüz açılmadı" };
  const miktar = biriken(kaynak, d.sonToplama[kaynak], simdi, d.binalar.otag ?? 1);
  if (!miktar) return { hata: "Henüz birikmedi" };
  return {
    durum: {
      ...d,
      envanter: { ...d.envanter, [kaynak]: (d.envanter[kaynak] ?? 0) + miktar },
      sonToplama: { ...d.sonToplama, [kaynak]: simdi },
    },
    miktar,
  };
}

export function yukselt(d, binaId, ayarlar = null) {
  if (!BINALAR[binaId]) return { hata: "Bilinmeyen bina" };
  const b = binaDurumu(binaId, gorevKontrol(d, ayarlar), ayarlar?.binalar);
  if (b.maks) return { hata: "Bina zaten en üst seviyede" };
  if (!b.levelYeterli) return { hata: `Level ${b.gerekenLevel} gerekli` };
  if (!b.gorevTamam) return { hata: "Bu binanın görev şartları henüz tamamlanmadı" };
  if (!b.kaynakYeterli) return { hata: "Kaynak yetersiz" };
  const envanter = { ...d.envanter };
  for (const [k, m] of Object.entries(b.bedel)) envanter[k] -= Number(m) || 0;
  return { durum: { ...d, envanter, binalar: { ...d.binalar, [binaId]: b.hedef } } };
}

export function levelAtlanabilirMi(d, ayarlar = null) {
  const l = levelDurumu(d.level, d.binalar, ayarlar?.levellar);
  const gorevTamam = tumLevelGorevleriTamamMi(d.level, d.gorevIlerlemesi, d.gorevlerTamam, ayarlar);
  return !!l && l.binalarTamam && gorevTamam && d.level < LEVELLAR.length;
}

export function levelAtla(d, simdi, ayarlar = null) {
  if (!levelAtlanabilirMi(d, ayarlar)) return { hata: "Level hedefleri tamamlanmadı" };
  return {
    durum: uretimiBaslat(
      { ...d, level: d.level + 1, gorevlerTamam: false, gorevIlerlemesi: {} },
      simdi
    ),
  };
}

/**
 * Bir görevi 1 adım ilerletir (kod veya tür ile eşleşir).
 */
export function gorevIlerlet(d, gorevKodu, simdi, ayarlar = null) {
  const tanimlar = levelGorevTanimlari(d.level, ayarlar);
  let tanim = tanimlar.find((g) => g.kod === gorevKodu);
  if (!tanim) {
    // Tür üzerinden henüz tamamlanmamış ilk görevi bul (örn. meydan_paylasim, hadis)
    tanim =
      tanimlar.find((g) => g.tur === gorevKodu && (d.gorevIlerlemesi?.[g.kod]?.ilerleme ?? 0) < g.hedef) ??
      tanimlar.find((g) => g.tur === gorevKodu);
  }
  if (!tanim) return { hata: "Bu levelda böyle bir görev yok" };

  const mevcut = d.gorevIlerlemesi?.[tanim.kod] ?? { ilerleme: 0, sonGun: null };
  if (mevcut.ilerleme >= tanim.hedef) return { hata: "Bu görev zaten tamamlandı" };

  const bugun = oyunGunu(simdi);
  if (tanim.gunluk && mevcut.sonGun === bugun) {
    return { hata: "Bu günlük görevi bugün zaten yaptın. Yarın devam edebilirsin!" };
  }

  const yeni = { ilerleme: mevcut.ilerleme + 1, sonGun: bugun };
  return {
    durum: {
      ...d,
      gorevIlerlemesi: { ...d.gorevIlerlemesi, [tanim.kod]: yeni },
    },
    gorev: tanim,
  };
}

/**
 * Günlük namaz çetelesini günceller.
 * 5 vakit tamamlandığında o leveldaki namaz görevlerini otomatik 1 gün ilerletir.
 */
export function namazGuncelle(d, vakit, deger, simdi, ayarlar = null) {
  if (!NAMAZ_VAKITLERI.some((v) => v.kod === vakit)) return { hata: "Geçersiz namaz vakti" };
  const bugunNamaz = { ...(d.bugunNamaz ?? BOS_NAMAZ), [vakit]: deger ? 1 : 0 };
  const kilinanSayisi = Object.values(bugunNamaz).reduce((a, b) => a + (b ? 1 : 0), 0);

  let yeniDurum = { ...d, bugunNamaz };
  const tanimlar = levelGorevTanimlari(d.level, ayarlar);
  const namazGorevi = tanimlar.find((g) => g.tur === "namaz" || g.kod === "namaz");
  const bugun = oyunGunu(simdi);

  if (namazGorevi && kilinanSayisi === 5) {
    const mevcut = d.gorevIlerlemesi?.[namazGorevi.kod] ?? { ilerleme: 0, sonGun: null };
    if (mevcut.ilerleme < namazGorevi.hedef && mevcut.sonGun !== bugun) {
      yeniDurum = {
        ...yeniDurum,
        gorevIlerlemesi: {
          ...d.gorevIlerlemesi,
          [namazGorevi.kod]: { ilerleme: mevcut.ilerleme + 1, sonGun: bugun },
        },
      };
    }
  }

  return { durum: yeniDurum, kilinanSayisi };
}

/**
 * Medrese sınavını değerlendirir; tüm sorular doğruysa 'sinav' görevini tamamlar.
 */
export function sinavDegerlendir(d, cevaplar, simdi, ayarlar = null) {
  const sorular = levelIcerigi(d.level, ayarlar)?.sinav ?? [];
  if (!sorular.length) return { hata: "Bu levelda sınav bulunmuyor" };
  if (!Array.isArray(cevaplar) || cevaplar.length !== sorular.length) {
    return { hata: "Lütfen tüm soruları cevapla" };
  }
  const yanlisIndeks = sorular.findIndex((s, i) => Number(cevaplar[i]) !== Number(s.dogru));
  if (yanlisIndeks !== -1) {
    return { hata: `${yanlisIndeks + 1}. sorunun cevabı hatalı. Tekrar dene!` };
  }
  return gorevIlerlet(d, "sinav", simdi, ayarlar);
}

/**
 * Oba'da halkın arasındaki bir davayı (sorunu) çözer.
 * Seçilen karara göre köyün mutluluğu (+4 / +2 / negatif) değişir.
 */
export function davaCoz(d, davaId, secenekIndeks, simdi, ayarlar = null) {
  const davalar = koyDavalariListesi(ayarlar);
  const dava = davalar.find((x) => x.id === davaId);
  if (!dava) return { hata: "Böyle bir dava bulunamadı" };
  const cozulenler = Array.isArray(d.cozulenDavalar) ? d.cozulenDavalar : [];
  if (cozulenler.includes(davaId)) {
    return { hata: "Bu meseleyi daha önce karara bağladın" };
  }
  const secenek = dava.secenekler?.[Number(secenekIndeks)];
  if (!secenek) return { hata: "Lütfen bir çözüm yolu seç" };

  const degisim = Number(secenek.mutluluk) || 0;
  const yeniMutluluk = Math.min(100, Math.max(0, (d.mutluluk ?? 60) + degisim));
  let yeniDurum = {
    ...d,
    mutluluk: yeniMutluluk,
    cozulenDavalar: [...cozulenler, davaId],
  };

  // Eğer olumlu bir çözüm seçildiyse o leveldaki "dava" görevini de otomatik ilerlet
  if (degisim > 0) {
    const gSonuc = gorevIlerlet(yeniDurum, "dava", simdi, ayarlar);
    if (!gSonuc.hata && gSonuc.durum) yeniDurum = gSonuc.durum;
  }

  return {
    durum: yeniDurum,
    sonuc: {
      davaId,
      mutlulukDegisimi: degisim,
      yeniMutluluk,
      aciklama: secenek.sonuc,
    },
  };
}

/**
 * Kıraathane'ye uğrayan yolculara köyde ev kurmayı teklif eder.
 * Kabul edilme ihtimali köyün mutluluk (huzur) oranına bağlıdır.
 */
export function gocmenTeklifEt(d, simdi) {
  const { hazir, kalanDakika, aday } = gocmenDurumu(simdi, d.sonGocmenKontrol);
  if (!hazir) {
    return {
      hata: `Kıraathane'ye henüz yeni yolcu uğramadı. Yaklaşık ${kalanDakika} dakika sonra tekrar uğra!`,
    };
  }

  const mutluluk = d.mutluluk ?? 60;
  const olasilik = Math.min(95, Math.max(15, mutluluk));
  const zar = Math.random() * 100;
  const kabul = zar < olasilik;

  const yeniInsan = (d.envanter?.insan ?? 5) + (kabul ? aday.kisiSayisi : 0);
  const yeniDurum = {
    ...d,
    sonGocmenKontrol: simdi,
    envanter: {
      ...d.envanter,
      insan: yeniInsan,
    },
  };

  return {
    durum: yeniDurum,
    sonuc: {
      kabul,
      aday: aday.ad,
      kazanilanInsan: kabul ? aday.kisiSayisi : 0,
      olasilik,
      mesaj: kabul
        ? `${aday.ad} köyündeki huzur ve adaletten çok etkilendi! Köyüne yerleşmeyi kabul ettiler (+${aday.kisiSayisi} 👥 İnsan).`
        : `${aday.ad} şimdilik yola devam etmeye karar verdi. Oba'da halkın sorunlarını hikmetle çözüp köy mutluluğunu (%${mutluluk}) artırarak şansını yükseltebilirsin!`,
    },
  };
}

// ---------- Geliştirici araçları (sadece geliştirme ortamı / admin) ----------
export const gelistiriciEylemleri = {
  zamanIlerlet: (d, { saat }) => ({ ...d, zamanKaydirma: d.zamanKaydirma + Number(saat) * SAAT_MS }),
  levelAyarla: (d, { level }, simdi) =>
    uretimiBaslat(
      {
        ...d,
        level: Math.min(LEVELLAR.length, Math.max(1, Math.floor(Number(level)) || 1)),
        gorevIlerlemesi: {},
      },
      simdi
    ),
  gorevleriIsaretle: (d, { deger }) => ({ ...d, gorevlerTamam: !!deger }),
  kaynakEkle: (d, { miktar }) => ({
    ...d,
    envanter: Object.fromEntries(
      Object.keys(KAYNAKLAR).map((k) => [
        k,
        Math.max(0, (d.envanter?.[k] ?? 0) + (k === "insan" ? Math.max(1, Math.round(Number(miktar) / 25)) : Number(miktar))),
      ])
    ),
  }),
  sifirla: (_d, _p, simdi) => baslangicDurumu(simdi),
};
