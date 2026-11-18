// =============================================================
// SEYRÜSEFER v3 — OYUN EYLEMLERİ (saf fonksiyonlar)
// Bir oyun durumunu alıp yeni durumu döner. Sunucu (API) bunları kullanır;
// istemci sadece sonucu gösterir. Geçersiz eylemde { hata } döner.
// =============================================================
import {
  KAYNAKLAR,
  BINALAR,
  LEVELLAR,
  KARAKTERLER,
  ORMAN_KESIF_BOLGELERI,
  SART_KAYNAKLARI,
  oyuncuKarakteriBul,
  toplamKonutKapasitesi,
  TAS_AVI_ORAN,
  KOMSU_EV_IDLERI,
  KOMSU_ODALARI,
  KOMSU_ODA_MAKS,
  KOMSU_ODA_BEDEL,
  KOMSU_MAMUR_HUZUR,
} from "./sabitler";
import {
  biriken,
  binaDurumu,
  kaynakAcikMi,
  levelDurumu,
  sahaNoktalariDurumu,
  ormanSeferBilgisi,
  meydanOlayDurumu,
  trGunNo,
  madenOyunModu,
  mektupBugunAlindi,
} from "./kurallar";
import {
  NAMAZ_VAKITLERI,
  oyunGunu,
  levelGorevTanimlari,
  levelIcerigi,
  binaGorevleriTamamMi,
  tumLevelGorevleriTamamMi,
  BEYAN_GOREV_TURLERI,
  onKosulDurumu,
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
    sahaDurumu: { tarla: {}, maden: {} },
    ormanSefer: {
      gun: trGunNo(simdi),
      kullanilan: 0,
      maske: 0,
      sonSonuc: 0,
      aktifBolge: -1,
    },
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

/** Level'a göre açılmış ama henüz başlamamış üretim alanlarını başlatır */
export function uretimiBaslat(d, simdi) {
  const sonToplama = { ...d.sonToplama };
  const isciler = { ...(d.isciler ?? { erzak: 1, kereste: 1, tas: 0 }) };
  for (const [k, tanim] of Object.entries(KAYNAKLAR)) {
    if (tanim.uretim !== false && kaynakAcikMi(k, d.level) && sonToplama[k] == null) {
      sonToplama[k] = simdi - 5 * SAAT_MS;
      if (k === "tas" && (isciler.tas ?? 0) === 0 && (d.envanter?.insan ?? 5) > (isciler.erzak ?? 1) + (isciler.kereste ?? 1)) {
        isciler.tas = 1;
      }
    }
  }
  return {
    ...d,
    sonToplama,
    isciler,
    sahaDurumu: d.sahaDurumu ?? { tarla: {}, maden: {} },
  };
}

export const gorevKontrol = (d, ayarlar = null) => ({
  ...d,
  gorevlerTamam: (binaId) => binaGorevleriTamamMi(d.level, binaId, d.gorevIlerlemesi, d.gorevlerTamam, ayarlar),
});

export function topla(d, kaynak, simdi) {
  if (!KAYNAKLAR[kaynak] || KAYNAKLAR[kaynak].uretim === false) return { hata: "Bu kaynak üretim alanından toplanmaz" };
  if (!kaynakAcikMi(kaynak, d.level) || d.sonToplama[kaynak] == null) return { hata: "Bu alan henüz açılmadı" };
  if (kaynak === "erzak" || kaynak === "tas") {
    return {
      hata:
        kaynak === "erzak"
          ? "Tarladaki mahsulleri toplamak için parsellere tıklayıp su ibriğiyle sula ve elle hasat et!"
          : "Taş ocağındaki kayalara tıklayıp kazmayla parçalayarak taşları çıkar!",
    };
  }
  if (kaynak === "kereste") {
    return { hata: "Orman keşif haritasında bölge arayıp kurumuş ağaçları baltayla devirerek odun kazan!" };
  }
  const isciSayisi = d.isciler?.[kaynak] ?? 1;
  const miktar = biriken(kaynak, d.sonToplama[kaynak], simdi, d.binalar.otag ?? 1, isciSayisi);
  if (!miktar) {
    return {
      hata: "Henüz toplanacak kaynak birikmedi!",
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
 * Üretim alanlarına (Tarla, Orman, Taş Ocağı) köydeki 👥 İnsan nüfusundan kalıcı işçi görevlendirir (+1).
 * Bir kişi bir yerde görevlendirildiyse oradan kesinlikle çıkarılamaz!
 */
export function isciAta(d, kaynak, degisim, simdi) {
  if (!["erzak", "kereste", "tas"].includes(kaynak)) return { hata: "Geçersiz üretim alanı" };
  if (!kaynakAcikMi(kaynak, d.level)) return { hata: "Bu üretim alanı henüz açılmadı" };

  if (Number(degisim) <= 0) {
    return {
      hata: "Bir üretim alanında görevlendirilen işçi kalıcıdır, oradan geri çıkarılamaz! Başka alanlar için köye yeni insanlar davet etmelisin.",
    };
  }

  const isciler = { erzak: 1, kereste: 1, tas: 0, ...(d.isciler ?? {}) };
  const mevcut = isciler[kaynak] ?? 0;
  const yeniSayi = mevcut + 1;

  const digerToplam = Object.entries(isciler)
    .filter(([k]) => k !== kaynak)
    .reduce((t, [, v]) => t + (Number(v) || 0), 0);
  const toplamInsan = d.envanter?.insan ?? 5;

  if (digerToplam + yeniSayi > toplamInsan) {
    return {
      hata: `Köydeki tüm insanlar (${toplamInsan} 👥) zaten görevde! Daha fazla işçi görevlendirmek için Kıraathane veya Köy Meydanı'ndan yeni insan davet edebilirsin.`,
    };
  }

  return {
    durum: {
      ...d,
      sonToplama: {
        ...d.sonToplama,
        [kaynak]: d.sonToplama?.[kaynak] ?? simdi,
      },
      isciler: {
        ...isciler,
        [kaynak]: yeniSayi,
      },
    },
    sonuc: {
      kaynak,
      yeniSayi,
      mesaj:
        kaynak === "kereste"
          ? `👷 Ormana yeni kalıcı oduncu görevlendirildi! Günlük keşif seferi hakkın ${yeniSayi * 2} sefere yükseldi!`
          : `👷 ${KAYNAKLAR[kaynak].ad} sahasına yeni kalıcı çalışan görevlendirildi!`,
    },
  };
}

/**
 * Tarla (3 ayrı sebze/meyve parseli) ve Taş Ocağı (6 ayrı 3D kaya) için BAĞIMSIZ nokta hasadı.
 * Sadece ilgili noktaId'yi sıfırlar; diğer parseller/kayalar kilitlenmez!
 */
export function sahaHasat(d, kaynak, noktaId, simdi) {
  if (!["erzak", "tas"].includes(kaynak)) return { hata: "Geçersiz üretim sahası" };
  if (!kaynakAcikMi(kaynak, d.level)) return { hata: "Bu saha henüz açılmadı" };

  const isci = d.isciler?.[kaynak] ?? (kaynak === "tas" ? 0 : 1);
  if (isci <= 0) {
    return { hata: "Bu sahada henüz görevli çalışan yok! Önce yukarıdan +1 kalıcı işçi görevlendir." };
  }

  if (kaynak === "tas" && madenOyunModu(d, simdi) !== "kirma") {
    return { hata: "Bugün Taş Ocağı'nda kırma değil, Taş Avı günü! Kancayla taşları yakala." };
  }
  const noktalar = sahaNoktalariDurumu(kaynak, d, simdi);
  const secilen = noktalar.find((n) => n.id === Number(noktaId)) ?? noktalar.find((n) => n.hazir);
  if (!secilen) return { hata: "Geçersiz parsel veya kaya seçimi" };
  if (!secilen.hazir) {
    return {
      hata: `${secilen.ad} henüz yeniden yetişmedi (~${secilen.kalanDakika} dk kaldı). Diğer hazır noktalardan devam edebilirsin!`,
    };
  }

  const sahaAnahtari = kaynak === "erzak" ? "tarla" : "maden";
  const mevcutSaha = d.sahaDurumu ?? { tarla: {}, maden: {} };
  const guncelHarita = { ...(mevcutSaha[sahaAnahtari] ?? {}), [secilen.id]: simdi };
  // Yeniden ekilen noktanın, bugünkü işçi sayısıyla yetişeceğini kaydet
  const isciAnahtari = `${sahaAnahtari}Isci`;
  const guncelIsci = { ...(mevcutSaha[isciAnahtari] ?? {}), [secilen.id]: isci };
  const miktar = secilen.miktar;

  const mesaj =
    kaynak === "erzak"
      ? `🌾 ${secilen.ad} sulandı ve elle toplandı! +${miktar} Mahsul (${secilen.mahsulAd}) sepete eklendi!`
      : `⛏️ ${secilen.ad} kazmayla parçalandı! +${miktar} Taş envantere eklendi!`;

  return {
    durum: {
      ...d,
      envanter: {
        ...d.envanter,
        [kaynak]: (d.envanter[kaynak] ?? 0) + miktar,
      },
      sahaDurumu: {
        ...mevcutSaha,
        [sahaAnahtari]: guncelHarita,
        [isciAnahtari]: guncelIsci,
      },
      madenMod: kaynak === "tas" ? { gun: trGunNo(simdi), mod: "kirma" } : d.madenMod,
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
      noktaId: secilen.id,
      miktar,
      mesaj,
    },
  };
}

/**
 * Tarla veya Taş Ocağı'ndaki TÜM hazır parsel/kayaları tek tıkla toplar ("Hepsini Topla").
 */
export function sahaHepsiniTopla(d, kaynak, simdi) {
  if (!["erzak", "tas"].includes(kaynak)) return { hata: "Geçersiz üretim sahası" };
  if (!kaynakAcikMi(kaynak, d.level)) return { hata: "Bu saha henüz açılmadı" };

  const isci = d.isciler?.[kaynak] ?? (kaynak === "tas" ? 0 : 1);
  if (isci <= 0) {
    return { hata: "Bu sahada henüz görevli çalışan yok! Önce yukarıdan +1 kalıcı işçi görevlendir." };
  }

  if (kaynak === "tas" && madenOyunModu(d, simdi) !== "kirma") {
    return { hata: "Bugün Taş Ocağı'nda kırma değil, Taş Avı günü! Kancayla taşları yakala." };
  }
  const noktalar = sahaNoktalariDurumu(kaynak, d, simdi);
  const hazirlar = noktalar.filter((n) => n.hazir);
  if (hazirlar.length === 0) {
    return { hata: "Şu anda toplanmaya hazır parsel veya kaya bulunmuyor!" };
  }

  const sahaAnahtari = kaynak === "erzak" ? "tarla" : "maden";
  const mevcutSaha = d.sahaDurumu ?? { tarla: {}, maden: {} };
  const guncelHarita = { ...(mevcutSaha[sahaAnahtari] ?? {}) };
  const isciAnahtari = `${sahaAnahtari}Isci`;
  const guncelIsci = { ...(mevcutSaha[isciAnahtari] ?? {}) };
  let toplamMiktar = 0;
  for (const h of hazirlar) {
    guncelHarita[h.id] = simdi;
    guncelIsci[h.id] = isci;
    toplamMiktar += h.miktar;
  }

  const mesaj =
    kaynak === "erzak"
      ? `🌾 Hazır olan ${hazirlar.length} parselin tamamı sulanıp hasat edildi! +${toplamMiktar} Mahsul depoya eklendi!`
      : `⛏️ Hazır olan ${hazirlar.length} kayanın tamamı çıkarıldı! +${toplamMiktar} Taş depoya eklendi!`;

  return {
    durum: {
      ...d,
      envanter: {
        ...d.envanter,
        [kaynak]: (d.envanter[kaynak] ?? 0) + toplamMiktar,
      },
      sahaDurumu: {
        ...mevcutSaha,
        [sahaAnahtari]: guncelHarita,
        [isciAnahtari]: guncelIsci,
      },
      madenMod: kaynak === "tas" ? { gun: trGunNo(simdi), mod: "kirma" } : d.madenMod,
      sonToplama: {
        ...d.sonToplama,
        [kaynak]: simdi,
      },
      sonEtkilesim: {
        ...(d.sonEtkilesim ?? {}),
        [kaynak]: simdi,
      },
    },
    miktar: toplamMiktar,
    sonuc: {
      kaynak,
      adet: hazirlar.length,
      miktar: toplamMiktar,
      mesaj,
    },
  };
}

/**
 * Orman Keşif Haritası: İşçi başına 2 sefer hakkı (`işçiSayısı * 2`).
 * Seçilen bölgeyi keşfeder: Şansa göre Kurumuş Ağaç veya Yaş Ağaç çıkar.
 */
export function ormanKesifYap(d, bolgeId, simdi) {
  if (!kaynakAcikMi("kereste", d.level)) return { hata: "Orman henüz açılmadı" };
  const sefer = ormanSeferBilgisi(d, simdi);
  if (sefer.isci <= 0) {
    return { hata: "Ormanda görevli oduncu yok! Önce +1 kalıcı işçi görevlendir." };
  }
  if (sefer.aktifBolge >= 0) {
    return { hata: "Önce bulduğun kurumuş ağacı baltayla kesip devirmelisin!" };
  }
  if (sefer.kalanSefer <= 0) {
    return {
      hata: `Bugünkü tüm keşif seferlerini (${sefer.maksSefer}/${sefer.maksSefer}) kullandın! Yeni işçi görevlendirerek (+2 sefer) veya ertesi gün devam edebilirsin.`,
    };
  }

  const bId = Number(bolgeId);
  const bolge = ORMAN_KESIF_BOLGELERI.find((b) => b.id === bId);
  if (!bolge) return { hata: "Geçersiz keşif bölgesi" };
  if ((sefer.maske & (1 << bId)) !== 0) {
    return { hata: "Bu bölgeyi bugün zaten aradın! Haritadan başka bir bölge seç." };
  }

  // Adil şans sistemi: Önceki sefer yaş ağaç çıktıysa bu sefer yüksek ihtimalle kurumuş ağaç çıkar (~%62 kurumuş)
  const kurumusIhtimali = sefer.sonSonuc === 2 ? 0.85 : 0.6;
  const kurumusCikti = Math.random() < kurumusIhtimali;

  const yeniMaske = sefer.maske | (1 << bId);
  const yeniKullanilan = sefer.kullanilan + 1;

  return {
    durum: {
      ...d,
      ormanSefer: {
        gun: sefer.gun,
        kullanilan: yeniKullanilan,
        maske: yeniMaske,
        sonSonuc: kurumusCikti ? 1 : 2,
        aktifBolge: kurumusCikti ? bId : -1,
      },
      sonEtkilesim: {
        ...(d.sonEtkilesim ?? {}),
        kereste: simdi,
      },
    },
    sonuc: {
      bolgeId: bId,
      bolgeAd: bolge.ad,
      agacTuru: kurumusCikti ? "kurumus" : "yas",
      kalanSefer: Math.max(0, sefer.maksSefer - yeniKullanilan),
      maksSefer: sefer.maksSefer,
      mesaj: kurumusCikti
        ? `🪓 ${bolge.ad} bölgesinde kurumuş bir ağaç buldun! Baltayla vurup devirerek odunları topla!`
        : `🌲 ${bolge.ad} bölgesinde yemyeşil yaş ağaçlar çıktı! Yaş ağaca balta vurulmaz; kalan seferinle başka bölge ara.`,
    },
  };
}

/**
 * Ormanda keşfedilen kurumuş ağacı 3D sahnede baltayla devirdikten sonra odunu envantere ekler.
 */
export function ormanAgacKes(d, simdi) {
  if (!kaynakAcikMi("kereste", d.level)) return { hata: "Orman henüz açılmadı" };
  const sefer = ormanSeferBilgisi(d, simdi);
  if (sefer.aktifBolge < 0) {
    return { hata: "Kesilecek aktif bir kurumuş ağaç bulunmuyor. Önce keşif haritasından arama yap!" };
  }

  const bolge = ORMAN_KESIF_BOLGELERI.find((b) => b.id === sefer.aktifBolge);
  const miktar = sefer.agacOdulu;

  return {
    durum: {
      ...d,
      envanter: {
        ...d.envanter,
        kereste: (d.envanter.kereste ?? 0) + miktar,
      },
      ormanSefer: {
        gun: sefer.gun,
        kullanilan: sefer.kullanilan,
        maske: sefer.maske,
        sonSonuc: 1,
        aktifBolge: -1,
      },
      sonToplama: {
        ...d.sonToplama,
        kereste: simdi,
      },
      sonEtkilesim: {
        ...(d.sonEtkilesim ?? {}),
        kereste: simdi,
      },
    },
    miktar,
    sonuc: {
      kaynak: "kereste",
      miktar,
      bolgeId: sefer.aktifBolge,
      mesaj: `🌲 ${bolge?.ad ?? "Orman"} bölgesindeki kurumuş ağacı devirdin! +${miktar} Odun kazandın!`,
    },
  };
}

/**
 * Taş Avı (yakalama günü): öğrenci kancayla küçük/orta/büyük taşları yakalar.
 * Kazanç sunucuda sınırlanır: hazır kayaların toplam verimi × başarı oranı (%50–%130).
 * Oyun bitince bütün hazır kayalar kullanılmış sayılır ve 20 saat sonra yeniden dolar.
 */
export function tasAvi(d, oran, simdi) {
  if (!kaynakAcikMi("tas", d.level)) return { hata: "Taş Ocağı henüz açılmadı" };
  const isci = d.isciler?.tas ?? 0;
  if (isci <= 0) return { hata: "Taş Ocağı'nda görevli işçi yok! Önce +1 kalıcı işçi görevlendir." };
  if (madenOyunModu(d, simdi) !== "yakalama") return { hata: "Bugün Taş Avı değil, kaya kırma günü!" };
  const hazirlar = sahaNoktalariDurumu("tas", d, simdi).filter((n) => n.hazir);
  if (hazirlar.length === 0) return { hata: "Taş Ocağı dinleniyor; yeni taşlar yarın hazır olacak." };
  const o = Math.min(TAS_AVI_ORAN.cok, Math.max(TAS_AVI_ORAN.en, Number(oran) || 0));
  const temel = hazirlar.reduce((t, h) => t + h.miktar, 0);
  const miktar = Math.max(1, Math.round(temel * o));
  const mevcutSaha = d.sahaDurumu ?? { tarla: {}, maden: {} };
  const maden = { ...(mevcutSaha.maden ?? {}) };
  const madenIsci = { ...(mevcutSaha.madenIsci ?? {}) };
  for (const h of hazirlar) {
    maden[h.id] = simdi;
    madenIsci[h.id] = isci;
  }
  return {
    durum: {
      ...d,
      envanter: { ...d.envanter, tas: (d.envanter.tas ?? 0) + miktar },
      sahaDurumu: { ...mevcutSaha, maden, madenIsci },
      madenMod: { gun: trGunNo(simdi), mod: "yakalama" },
      sonToplama: { ...d.sonToplama, tas: simdi },
      sonEtkilesim: { ...(d.sonEtkilesim ?? {}), tas: simdi },
    },
    miktar,
    sonuc: {
      kaynak: "tas",
      miktar,
      mesaj: `🪝 Taş Avı bitti! Kancanla +${miktar} Taş yakaladın${o >= 1 ? ", maşallah usta avcı!" : "."}`,
    },
  };
}

/**
 * Komşu evinin bir odasını bir seviye güzelleştirir (odun, taş, mahsul harcar; köye Huzur getirir).
 */
export function komsuEviGuzellestir(d, evId, oda) {
  if (!KOMSU_EV_IDLERI.includes(evId)) return { hata: "Geçersiz ev" };
  if (!KOMSU_ODALARI[oda]) return { hata: "Geçersiz oda" };
  if ((d.binalar?.[evId] ?? 0) < 1) return { hata: "Bu ev henüz kurulmadı; önce evi inşa et." };
  const evler = d.komsuEvleri ?? {};
  const ev = { yatak: 0, mutfak: 0, banyo: 0, ...(evler[evId] ?? {}) };
  const mevcut = ev[oda] ?? 0;
  if (mevcut >= KOMSU_ODA_MAKS) return { hata: `${KOMSU_ODALARI[oda].ad} zaten en güzel hâlinde!` };
  const hedef = mevcut + 1;
  const bedel = KOMSU_ODA_BEDEL[hedef];
  const ad = { erzak: "Mahsul", kereste: "Odun", tas: "Taş" };
  const eksik = Object.entries(bedel).filter(([k, m]) => (d.envanter?.[k] ?? 0) < m);
  if (eksik.length) {
    return { hata: `Yetersiz kaynak: ${eksik.map(([k, m]) => `${m - (d.envanter?.[k] ?? 0)} ${ad[k]}`).join(", ")} daha gerekiyor.` };
  }
  const envanter = { ...d.envanter };
  for (const [k, m] of Object.entries(bedel)) envanter[k] = (envanter[k] ?? 0) - m;
  const yeniEv = { ...ev, [oda]: hedef };
  const mamur = Object.keys(KOMSU_ODALARI).every((o) => (yeniEv[o] ?? 0) >= KOMSU_ODA_MAKS);
  const huzur = 1 + (mamur ? KOMSU_MAMUR_HUZUR : 0);
  const yeniMutluluk = Math.min(100, (d.mutluluk ?? 60) + huzur);
  const seviyeAdi = KOMSU_ODALARI[oda].seviyeler[hedef];
  return {
    durum: { ...d, envanter, mutluluk: yeniMutluluk, komsuEvleri: { ...evler, [evId]: yeniEv } },
    sonuc: {
      evId,
      oda,
      seviye: hedef,
      huzur,
      mamur,
      mesaj: mamur
        ? `🏡 Maşallah! Komşunun evi baştan sona mamur oldu! +${huzur} 😊 Huzur`
        : `✨ ${KOMSU_ODALARI[oda].ad}: ${seviyeAdi}. Komşun çok sevindi! +1 😊 Huzur`,
    },
  };
}

/** Geriye dönük uyumluluk için uretimEtkilesim yönlendiricisi */
export function uretimEtkilesim(d, kaynak, simdi, noktaId = null) {
  if (kaynak === "erzak" || kaynak === "tas") {
    return sahaHasat(d, kaynak, noktaId, simdi);
  }
  if (kaynak === "kereste") {
    return ormanAgacKes(d, simdi);
  }
  return { hata: "Geçersiz üretim alanı" };
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
export function mektupTeslimAl(d, simdi = Date.now()) {
  if (mektupBugunAlindi(d, simdi)) {
    return { hata: "Bugünün mektubunu zaten aldın. Haberci yarın yeni bir mektupla gelecek!" };
  }
  return {
    durum: {
      ...d,
      mektupAlindi: d.level,
      mektupGunu: simdi,
      // Bu levelda daha önce okunan mektup sayısı: hangi mektubun geleceğini belirler
      mektupNo: Number(d.gorevIlerlemesi?.aile?.ilerleme ?? 0),
    },
    sonuc: {
      mesaj: "📬 Aile Mektubunu Haberci'den teslim aldın! Şimdi Kendi Evim'e gir ve ailenle bir araya gelip mektubu birlikte oku.",
    },
  };
}

export function yukselt(d, binaId, ayarlar = null) {
  if (!BINALAR[binaId]) return { hata: "Bilinmeyen bina" };
  const b = binaDurumu(binaId, gorevKontrol(d, ayarlar), ayarlar?.binalar);
  if (b.maks) return { hata: "Bina zaten en üst seviyede" };
  if (!b.levelYeterli) return { hata: `Level ${b.gerekenLevel} gerekli` };
  if (!b.gorevTamam) return { hata: "Bu binanın görev şartları henüz tamamlanmadı" };
  if (!b.kaynakYeterli) {
    return {
      hata: b.eksik?.insan
        ? `Bu bina için köyde en az ${b.nufusSarti} kişi yaşamalı. Kıraathane'ye uğrayan yolcuları köye davet et!`
        : "Kaynak yetersiz",
    };
  }
  const envanter = { ...d.envanter };
  // 👥 İnsan harcanmaz (nüfus şartıdır); yalnızca mahsul / odun / taş düşülür
  for (const [k, m] of Object.entries(b.bedel)) {
    if (SART_KAYNAKLARI.includes(k)) continue;
    envanter[k] = Math.max(0, (envanter[k] ?? 0) - (Number(m) || 0));
  }
  return { durum: { ...d, envanter, binalar: { ...d.binalar, [binaId]: b.hedef } } };
}

export function levelAtlanabilirMi(d, ayarlar = null) {
  const l = levelDurumu(d.level, d.binalar, ayarlar?.levellar);
  const gorevTamam = tumLevelGorevleriTamamMi(d.level, d.gorevIlerlemesi, d.gorevlerTamam, ayarlar);
  return !!l && l.binalarTamam && gorevTamam && d.level < LEVELLAR.length;
}

export function levelAtla(d, simdi, ayarlar = null) {
  if (!levelAtlanabilirMi(d, ayarlar)) return { hata: "Level hedefleri tamamlanmadı" };
  const yeniLevel = d.level + 1;
  // Bu levelda yeni açılan üretim alanı (ör. Taş Ocağı) için köye kendi ustası gelir.
  // Böylece önceki levelda bütün insanlarını kalıcı işçi yapmış öğrenci yeni alanda tıkanmaz.
  const isciler = { ...(d.isciler ?? {}) };
  const envanter = { ...d.envanter };
  const gelenUstalar = [];
  for (const [k, t] of Object.entries(KAYNAKLAR)) {
    if (!t.uretim || t.acilisLevel !== yeniLevel) continue;
    if ((isciler[k] ?? 0) > 0) continue;
    isciler[k] = 1;
    envanter.insan = (envanter.insan ?? 0) + 1;
    gelenUstalar.push(k);
  }
  return {
    durum: uretimiBaslat(
      { ...d, level: yeniLevel, gorevlerTamam: false, gorevIlerlemesi: {}, isciler, envanter },
      simdi
    ),
    gelenUstalar,
  };
}

/**
 * Bir görevi 1 adım ilerletir (kod veya tür ile eşleşir).
 */
export function gorevIlerlet(d, gorevKodu, simdi, ayarlar = null, beyan = false) {
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
  const kosul = onKosulDurumu(tanim, d.gorevIlerlemesi, d.gorevlerTamam);
  if (kosul.kilitli) return { hata: kosul.kilitNotu };
  // Sınav, dava, namaz ve meydan görevleri yalnızca kendi eylemleriyle ilerler; doğrudan "yaptım" denemez
  if (beyan && !BEYAN_GOREV_TURLERI.includes(tanim.tur)) {
    return { hata: "Bu görev, ilgili mekânda yapılınca kendiliğinden işaretlenir." };
  }
  if (beyan && tanim.tur === "aile" && !mektupBugunAlindi(d, simdi)) {
    return { hata: "Önce Haberci'den aile mektubunu teslim almalısın!" };
  }
  if (tanim.tur === "turku" && (d.binalar?.kiraathane ?? 0) < 1) {
    return { hata: "Ozan Dede'yi dinlemek için önce Kıraathane binasını inşa etmelisin!" };
  }

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
 * O gün en az bir vakit işaretlendiğinde o leveldaki namaz görevi o gün için 1 ilerler.
 */
export function namazGuncelle(d, vakit, deger, simdi, ayarlar = null) {
  if (!NAMAZ_VAKITLERI.some((v) => v.kod === vakit)) return { hata: "Geçersiz namaz vakti" };
  const bugunNamaz = { ...(d.bugunNamaz ?? BOS_NAMAZ), [vakit]: deger ? 1 : 0 };
  const kilinanSayisi = Object.values(bugunNamaz).reduce((a, b) => a + (b ? 1 : 0), 0);

  let yeniDurum = { ...d, bugunNamaz };
  const tanimlar = levelGorevTanimlari(d.level, ayarlar);
  const namazGorevi = tanimlar.find((g) => g.tur === "namaz" || g.kod === "namaz");
  const bugun = oyunGunu(simdi);

  if (namazGorevi && kilinanSayisi >= 1) {
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
  const olay = meydanOlayDurumu(d, simdi);
  if (!olay.hazir) {
    return { hata: `Bugünkü meydan olayını zaten yaşadın. Yeni olay yaklaşık ${olay.kalanSaat} saat sonra (gece yarısı) gelir.` };
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

  if (meydandanMi) {
    const olay = meydanOlayDurumu(d, simdi);
    if (!olay.hazir) {
      return { hata: `Bugünkü meydan olayını zaten yaşadın. Yeni misafirler yaklaşık ${olay.kalanSaat} saat sonra gelir.` };
    }
  } else if ((d.binalar?.kiraathane ?? 0) < 1) {
    return { hata: "Yolcuları ağırlamak için önce Kıraathane'yi kurmalısın!" };
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
    ...(meydandanMi ? {} : { sonGocmenKontrol: simdi }),
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
  sifirla: (d, _p, simdi) => baslangicDurumu(simdi, d.cinsiyet, d.karakter),
};
