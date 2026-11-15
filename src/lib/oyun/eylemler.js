// =============================================================
// SEYRÜSEFER v3 — OYUN EYLEMLERİ (saf fonksiyonlar)
// Bir oyun durumunu alıp yeni durumu döner. Sunucu (API) bunları kullanır;
// istemci sadece sonucu gösterir. Geçersiz eylemde { hata } döner.
// =============================================================
import { KAYNAKLAR, BINALAR, LEVELLAR, KARAKTERLER, oyuncuKarakteriBul, toplamKonutKapasitesi } from "./sabitler";
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

/** Yeni oyuncunun başlangıç durumu (Mektep Lv.1'i hemen kurabilecek başlangıç kaynağı ve 1 katlı Kendi Evim ile başlar) */
export function baslangicDurumu(simdi, cinsiyet = "erkek", karakter = null) {
  const binalar = {};
  for (const [id, t] of Object.entries(BINALAR)) if (t.baslangicSeviye) binalar[id] = t.baslangicSeviye;
  const secilenKarakter = oyuncuKarakteriBul(karakter, cinsiyet);
  const envanter = {
    erzak: 150,
    kereste: 150,
    tas: 0,
    insan: 5,
  };
  const d = {
    level: 1,
    cinsiyet: secilenKarakter.cinsiyet,
    karakter: secilenKarakter.id,
    binalar,
    envanter,
    isciler: { erzak: 1, kereste: 1, tas: 0 },
    sonEtkilesim: { erzak: 0, kereste: 0, tas: 0 },
    mektupAlindi: 0,
    sonMeydanOlayZamani: 0,
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

/** Level'a göre açılmış ama henüz başlamamış üretim alanlarını başlatır (ilk açılışta 3 birim birikmiş olarak başlar) */
export function uretimiBaslat(d, simdi) {
  const sonToplama = { ...d.sonToplama };
  const isciler = { ...(d.isciler ?? { erzak: 1, kereste: 1, tas: 0 }) };
  for (const [k, tanim] of Object.entries(KAYNAKLAR)) {
    if (tanim.uretim !== false && kaynakAcikMi(k, d.level) && sonToplama[k] == null) {
      // İlk kez açıldığında 3 birim (yaklaşık 5 saatlik) hazır olsun ki öğrenci hemen sulama/kesme deneyebilsin, sonra sıfırlansın
      sonToplama[k] = simdi - 5 * SAAT_MS;
      if (k === "tas" && (isciler.tas ?? 0) === 0 && (d.envanter?.insan ?? 5) > (isciler.erzak ?? 1) + (isciler.kereste ?? 1)) {
        isciler.tas = 1;
      }
    }
  }
  return { ...d, sonToplama, isciler };
}

export const gorevKontrol = (d, ayarlar = null) => ({
  ...d,
  gorevlerTamam: (binaId) => binaGorevleriTamamMi(d.level, binaId, d.gorevIlerlemesi, d.gorevlerTamam, ayarlar),
});

export function topla(d, kaynak, simdi) {
  if (!KAYNAKLAR[kaynak] || KAYNAKLAR[kaynak].uretim === false) return { hata: "Bu kaynak üretim alanından toplanmaz" };
  if (!kaynakAcikMi(kaynak, d.level) || d.sonToplama[kaynak] == null) return { hata: "Bu alan henüz açılmadı" };
  const isciSayisi = d.isciler?.[kaynak] ?? 1;
  const miktar = biriken(kaynak, d.sonToplama[kaynak], simdi, d.binalar.otag ?? 1, isciSayisi);
  if (!miktar) {
    return {
      hata: "Henüz toplanacak kaynak birikmedi! 24 saatte 15 birim (her 96 dakikada 1 birim) dolar.",
    };
  }
  return {
    durum: {
      ...d,
      envanter: { ...d.envanter, [kaynak]: (d.envanter[kaynak] ?? 0) + miktar },
      sonToplama: { ...d.sonToplama, [kaynak]: simdi },
      sonEtkilesim: { ...(d.sonEtkilesim ?? {}), [kaynak]: simdi },
    },
    miktar,
    sonuc: {
      kaynak,
      miktar,
      mesaj: `${KAYNAKLAR[kaynak].ikon} +${miktar} ${KAYNAKLAR[kaynak].ad} toplandı!`,
    },
  };
}

/**
 * Üretim alanlarına (Tarla, Orman, Taş Ocağı) köydeki 👥 İnsan nüfusundan işçi görevlendirir (+1 / -1).
 */
export function isciAta(d, kaynak, degisim, simdi) {
  if (!["erzak", "kereste", "tas"].includes(kaynak)) return { hata: "Geçersiz üretim alanı" };
  if (!kaynakAcikMi(kaynak, d.level)) return { hata: "Bu üretim alanı henüz açılmadı" };

  const isciler = { erzak: 1, kereste: 1, tas: 0, ...(d.isciler ?? {}) };
  const mevcut = isciler[kaynak] ?? 0;
  const yeniSayi = mevcut + (Number(degisim) >= 0 ? 1 : -1);

  if (yeniSayi < 0) return { hata: "Bu alanda zaten hiç işçi çalışmıyor" };

  const digerToplam = Object.entries(isciler)
    .filter(([k]) => k !== kaynak)
    .reduce((t, [, v]) => t + (Number(v) || 0), 0);
  const toplamInsan = d.envanter?.insan ?? 5;

  if (digerToplam + yeniSayi > toplamInsan) {
    return {
      hata: `Köydeki tüm insanlar (${toplamInsan} 👥) zaten görevde! Daha fazla işçi görevlendirmek için Kıraathane'den yeni insan toplayabilirsin.`,
    };
  }

  // İşçi sayısı değişirken o ana kadar biriken üretimi envantere aktar
  const birikenMiktar =
    d.sonToplama?.[kaynak] != null
      ? biriken(kaynak, d.sonToplama[kaynak], simdi, d.binalar.otag ?? 1, mevcut)
      : 0;

  return {
    durum: {
      ...d,
      envanter: {
        ...d.envanter,
        [kaynak]: (d.envanter[kaynak] ?? 0) + birikenMiktar,
      },
      sonToplama: {
        ...d.sonToplama,
        [kaynak]: simdi,
      },
      isciler: {
        ...isciler,
        [kaynak]: yeniSayi,
      },
    },
    sonuc: {
      kaynak,
      yeniSayi,
      birikenMiktar,
    },
  };
}

/**
 * Tarlada sulama, Ormanda kurumuş ağaç kesme veya Taş Ocağında kaya kırma işlemi:
 * 24 saatte 15 birim (her 96 dakikada 1 birim) dolan birikmiş kaynağı toplar ve sayacı sıfırlar.
 * Eğer henüz hiç kaynak birikmemişse (0/15), toplamaya izin vermez.
 */
export function uretimEtkilesim(d, kaynak, simdi) {
  if (!["erzak", "kereste", "tas"].includes(kaynak)) return { hata: "Geçersiz üretim alanı" };
  if (!kaynakAcikMi(kaynak, d.level) || d.sonToplama?.[kaynak] == null) {
    return { hata: "Bu alan henüz açılmadı" };
  }

  const isciSayisi = d.isciler?.[kaynak] ?? 1;
  const miktar = biriken(kaynak, d.sonToplama[kaynak], simdi, d.binalar.otag ?? 1, isciSayisi);
  if (miktar <= 0) {
    return {
      hata: "Henüz toplanacak kaynak birikmedi! 24 saatte 15 birim (her 96 dakikada 1 birim) dolar.",
    };
  }

  const mesajlar = {
    erzak: `🌾 Tarladaki biriken ekinleri sulayıp hasat ettin! +${miktar} Mahsul kazandın!`,
    kereste: `🌲 Ormandaki kurumuş ağaçları kesip topladın! +${miktar} Tahta kazandın!`,
    tas: `⛏️ Taş ocağındaki kaya damarlarını işledin! +${miktar} Taş kazandın!`,
  };

  return {
    durum: {
      ...d,
      envanter: {
        ...d.envanter,
        [kaynak]: (d.envanter[kaynak] ?? 0) + miktar,
      },
      sonToplama: {
        ...d.sonToplama,
        [kaynak]: simdi,
      },
      sonEtkilesim: {
        ...(d.sonEtkilesim ?? {}),
        [kaynak]: simdi,
      },
    },
    miktar,
    sonuc: {
      kaynak,
      miktar,
      mesaj: mesajlar[kaynak],
    },
  };
}

/**
 * Öğrencinin oyun içi karakterini ve cinsiyetini günceller.
 */
export function karakterSec(d, karakterId, cinsiyet) {
  const secilen = KARAKTERLER[karakterId] ?? oyuncuKarakteriBul(karakterId, cinsiyet);
  return {
    durum: {
      ...d,
      cinsiyet: secilen.cinsiyet,
      karakter: secilen.id,
    },
    sonuc: {
      karakter: secilen.id,
      cinsiyet: secilen.cinsiyet,
      mesaj: `✨ Karakterin "${secilen.ad} (${secilen.unvan})" olarak güncellendi!`,
    },
  };
}

/**
 * Haberci'den mevcut levelın Aile Mektubunu teslim alır.
 * Mektup teslim alındıktan sonra Kendi Evim (Ev İçi) sahnesinde aile bireyleri çağrılarak okunabilir.
 */
export function mektupTeslimAl(d) {
  return {
    durum: {
      ...d,
      mektupAlindi: d.level,
    },
    sonuc: {
      mesaj: "📬 Aile Mektubunu Haberci'den teslim aldın! Şimdi Kendi Evim'in içine girip aile bireylerini odaya çağırabilirsin.",
    },
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
  if ((d.binalar?.mektep ?? 0) < 1) {
    return { hata: "Görevlere başlamadan önce köyüne Mektep (Seviye 1) inşa etmelisin!" };
  }
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
  // Görev tamamlamak köyün huzurunu +2 artırır
  const yeniMutluluk = Math.min(100, (d.mutluluk ?? 60) + 2);
  return {
    durum: {
      ...d,
      mutluluk: yeniMutluluk,
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
    sonMeydanOlayZamani: simdi,
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
export function gocmenTeklifEt(d, simdi, meydandanMi = false) {
  const kapasite = toplamKonutKapasitesi(d.binalar);
  const mevcutInsan = d.envanter?.insan ?? 5;
  const bosYer = Math.max(0, kapasite - mevcutInsan);

  if (bosYer <= 0) {
    return {
      hata: `Köydeki evlerde boş barınma yeri yok (${mevcutInsan}/${kapasite} 👥)! Yeni insanları kabul edebilmek için önce yeni bir Ev inşa etmeli veya mevcut evlerini 2. / 3. kata yükseltmelisin.`,
    };
  }

  const { hazir, kalanDakika, aday } = gocmenDurumu(simdi, meydandanMi ? 0 : d.sonGocmenKontrol);
  if (!hazir && !meydandanMi) {
    return {
      hata: `Kıraathane'ye henüz yeni yolcu uğramadı. Yaklaşık ${kalanDakika} dakika sonra tekrar uğra!`,
    };
  }

  const mutluluk = d.mutluluk ?? 60;
  const olasilik = Math.min(95, Math.max(15, mutluluk));
  const zar = Math.random() * 100;
  const kabul = zar < olasilik;

  const kazanilanInsan = kabul ? Math.min(aday.kisiSayisi, bosYer) : 0;
  const yeniInsan = mevcutInsan + kazanilanInsan;
  const yeniDurum = {
    ...d,
    sonGocmenKontrol: simdi,
    ...(meydandanMi ? { sonMeydanOlayZamani: simdi } : {}),
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
      kazanilanInsan,
      olasilik,
      mesaj: kabul
        ? `${aday.ad} köyündeki huzur ve adaletten çok etkilendi! Ev teklifini kabul edip köye yerleştiler (+${kazanilanInsan} 👥 İnsan · Kapasite: ${yeniInsan}/${kapasite}).`
        : `${aday.ad} şimdilik yola devam etmeye karar verdi. Köy mutluluğunu (%${mutluluk}) artırarak bir sonraki yolcuları ikna şansını yükseltebilirsin!`,
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
