"use client";
import { useEffect, useState } from "react";
import { BINALAR } from "@/lib/oyun/sabitler";
import { trGunNo, mektupBugunAlindi } from "@/lib/oyun/kurallar";

const KIRAATHANE_BEDEL = BINALAR.kiraathane?.bedel?.[1] ?? {};

/** Bu levelda o türde görev yoksa adım geçilmiş sayılır; varsa koşula bakılır (üst levellarda rehber takılmasın) */
function gorevYoksaVeyaTamam(gorevler, tur, kosul) {
  const ilgili = gorevler.filter((g) => g.tur === tur);
  return ilgili.length === 0 || ilgili.some(kosul);
}

export const REHBER_ADIMLARI = [
  // ================= BÖLÜM 1: KÖY TANITIM TURU (7 ADIM — SADECE KAMERA YAKLAŞIR) =================
  {
    kod: "tanitim_oba",
    bolum: "tanitim",
    baslik: "Tanıtım 1/7: Oba (Yönetim Merkezi)",
    metin:
      "Selamün aleyküm genç yönetici! Ben Bilge Rehber. İşlere başlamadan önce gel köyümüzdeki alanları sırayla gezelim. En yukarıdaki taş kalenin üzerinde duran bu görkemli çadır senin Oba'n; köyün genel idaresi ve üretim depolarının bereketi buradan yönetilir.",
    hedefler: [{ tur: "bina", id: "otag" }],
  },
  {
    kod: "tanitim_mektep",
    bolum: "tanitim",
    baslik: "Tanıtım 2/7: Mektep (İlim Yuvası)",
    metin:
      "Meydanın solundaki bu taş teras Mektep alanımızdır. Köyümüzde görev yapabilmek için önce Mektep'in 1. Seviyesini kurmalıyız. Günlük hadis, video dersi ve ilim sınavlarımızı Mektep'in içinde yapacağız.",
    hedefler: [{ tur: "bina", id: "mektep" }],
  },
  {
    kod: "tanitim_meydan",
    bolum: "tanitim",
    baslik: "Tanıtım 3/7: Köy Meydanı & Çınar Altı Sohbeti",
    metin:
      "Tam ortadaki taş döşeli alan Köy Meydanı'dır! Meydanda bekleyen köylülerin yanına 3D birinci şahıs gözünden yürüyerek davalarını dinleyip hüküm verirsin; Çınar Altı Sohbeti'nde ise diğer öğrencilerle söz, hikâye ve video paylaşırsın.",
    hedefler: [{ tur: "bina", id: "sosyalmeydan" }],
  },
  {
    kod: "tanitim_kiraathane",
    bolum: "tanitim",
    baslik: "Tanıtım 4/7: Kıraathane (Ozan Dede & Yolcular)",
    metin:
      "Meydanın sağındaki teras Kıraathane alanımızdır. 2. günde yeterli Mahsul ve Tahta biriktiğinde Kıraathane'yi inşa edeceğiz; içeride Ozan Dede'den türkülerimizin hikâyesini dinleyip köye uğrayan yolcuları hanelerimize davet edeceğiz.",
    hedefler: [{ tur: "bina", id: "kiraathane" }],
  },
  {
    kod: "tanitim_evler",
    bolum: "tanitim",
    baslik: "Tanıtım 5/7: 5+1 Ev Mahallesi ve Ev İçi",
    metin:
      "Aşağıdaki 6 taş bordürlü parsel 5+1 Konut Mahallemizdir! Kendi Evim senin hanendir; diğer 5 arsaya da 3 kata kadar evler kurarak köye yeni insanlar için barınma yeri (+5 👥/kat) açarsın.",
    hedefler: [
      { tur: "bina", id: "kendi_evim" },
      { tur: "bina", id: "ev1" },
      { tur: "bina", id: "ev2" },
      { tur: "bina", id: "ev3" },
      { tur: "bina", id: "ev4" },
      { tur: "bina", id: "ev5" },
    ],
  },
  {
    kod: "tanitim_uretim",
    bolum: "tanitim",
    baslik: "Tanıtım 6/7: Tarla, Orman ve Taş Ocağı",
    metin:
      "Köyümüzün çevresindeki Tarla (3 parsel), Orman (keşif seferleri) ve Taş Ocağı (6 kaya) üretim alanlarımızdır! İçlerinde kalıcı işçi görevlendirebilir, tarlada fideleri sulayıp mahsul toplayabilir ve ormanda kurumuş ağaçları kesebilirsin.",
    hedefler: [
      { tur: "nokta", id: "tarla" },
      { tur: "nokta", id: "orman" },
      { tur: "nokta", id: "maden" },
    ],
  },
  {
    kod: "tanitim_haberci_pano",
    bolum: "tanitim",
    baslik: "Tanıtım 7/7: Haberci ve Görev Panosu",
    metin:
      "Güney yolundaki Haberci köye mühürlü aile okuma mektupları ve günlük iyilik görevleri getirir. Ortadaki Görev Panosu'ndan ise level hedeflerini takip edersin. Köyümüzü tanıdığımıza göre şimdi yapılacak işlere geçebiliriz!",
    hedefler: [
      { tur: "nokta", id: "haberci" },
      { tur: "nokta", id: "pano" },
    ],
  },

  // ================= BÖLÜM 2: ŞİMDİ YAPACAKLARIMIZ (GÖREV ADIMLARI) =================
  {
    kod: "gorev_mektep_insa",
    bolum: "gorev",
    baslik: "1. Yapılacak İş: Mektep 1. Seviyeyi Kur!",
    metin:
      "Köyümüzü tanıdık! Unutma, Mektep kurulmadan görev yapılamaz. Şimdi haritada parlayan Mektep arsasına tıkla ve başlangıç kaynaklarınla 1. Seviyesini hemen inşa et!",
    hedefler: [{ tur: "bina", id: "mektep", etiket: "🏛️ Mektep Arsasına Git ve Kur" }],
    tamamMi: (durum) => (durum.binalar?.mektep ?? 0) >= 1,
  },
  {
    kod: "gorev_mektep_oku",
    bolum: "gorev",
    baslik: "2. Yapılacak İş: Mektep'te Günün Hadisini Oku!",
    metin:
      "Mektep binasına tıklayıp içeri gir ve Günün Hadis-i Şerifini oku. Her gün yeni bir hadis seni bekliyor; 2. günün hadisini okuyunca Niyet videosu da açılır!",
    hedefler: [{ tur: "bina", id: "mektep", etiket: "📖 Mektep İçine Gir" }],
    tamamMi: (_durum, gorevler) => gorevYoksaVeyaTamam(gorevler, "hadis", (g) => g.tamam || g.bugunYapildi),
  },
  {
    kod: "gorev_tarla",
    bolum: "gorev",
    baslik: "3. Yapılacak İş: Tarladaki Parselleri Sula ve Topla!",
    metin:
      "Şimdi haritada parlayan Tarla'ya tıkla! Kuruyan parselleri bakır ibrikle sula, olgunlaşan mahsulü elinle topla. Boşta insanın varsa tarlaya kalıcı işçi de görevlendirebilirsin: yeni işçi, bir sonraki ekimden itibaren daha bol ürün getirir.",
    hedefler: [{ tur: "nokta", id: "tarla", etiket: "🌾 Tarlaya Git ve Sula" }],
    tamamMi: (durum) => (durum.sonEtkilesim?.erzak ?? 0) > 0,
  },
  {
    kod: "gorev_orman",
    bolum: "gorev",
    baslik: "4. Yapılacak İş: Ormana Keşfe Çık ve Ağaç Kes!",
    metin:
      "Tarla tamam! Şimdi de Orman'a tıkla. Haritada keşfedilmemiş bir bölge seç; şansına kurumuş bir ağaç çıkarsa baltanla devir ve tahtayı topla. Yaş ağaçlara dokunmuyoruz!",
    hedefler: [{ tur: "nokta", id: "orman", etiket: "🌲 Ormana Git" }],
    tamamMi: (durum) => (durum.sonEtkilesim?.kereste ?? 0) > 0,
  },
  {
    kod: "gorev_haberci",
    bolum: "gorev",
    baslik: "5. Yapılacak İş: Haberci'den Aile Mektubunu Al!",
    metin:
      "Güney yolunda atının yanında bekleyen Haberci'ye tıkla ve sana getirdiği mühürlü aile mektubunu teslim al!",
    hedefler: [{ tur: "nokta", id: "haberci", etiket: "📜 Haberci'ye Git" }],
    // Haberci her gün yeni mektup getirir: bugünün mektubu alındı mı (ya da bugün zaten okundu mu)?
    tamamMi: (durum, gorevler, simdi) =>
      gorevYoksaVeyaTamam(gorevler, "aile", (g) => g.tamam || g.bugunYapildi) ||
      (simdi ? mektupBugunAlindi(durum, simdi) : (durum.mektupAlindi ?? 0) >= (durum.level ?? 1)),
  },
  {
    kod: "gorev_ev_mektup",
    bolum: "gorev",
    baslik: "6. Yapılacak İş: Mektubu Evinde Ailenle Oku!",
    metin:
      "Mektup elinde! Şimdi Kendi Evim'e tıklayıp ev içine gir. Ailenin ya da büyüklerinin yanına git; hep beraber oturup mektubu birlikte açın ve okuyun.",
    hedefler: [{ tur: "bina", id: "kendi_evim", etiket: "🏡 Kendi Evime Gir" }],
    tamamMi: (_durum, gorevler) => gorevYoksaVeyaTamam(gorevler, "aile", (g) => g.tamam || g.bugunYapildi),
  },
  {
    kod: "gorev_meydan_dava",
    bolum: "gorev",
    baslik: "7. Yapılacak İş: Köy Meydanı'nda İlk Davayı Çöz!",
    metin:
      "Şimdi tam ortadaki Köy Meydanı'na tıkla! 3D meydanda bekleyen köylülerin yanına yürüyüp davalarını dinle ve hikmetle çözerek köyün Huzurunu artır!",
    hedefler: [{ tur: "bina", id: "sosyalmeydan", etiket: "⚖️ Köy Meydanı'na Gir" }],
    tamamMi: (durum) => (durum.cozulenDavalar?.length ?? 0) >= 1,
  },
  {
    kod: "gorev_bugunluk_tamam",
    bolum: "gorev",
    baslik: "🌙 Bugünlük Yapılacak Görevlerimiz Tamamlandı!",
    metin:
      "Maşallah genç yönetici! Bugün Mektep'i kurdun, hadisini okudun, tarla ve ormanda çalıştın, evinde aile mektubunu okudun ve Köy Meydanı'nda ilk davayı çözdün! Bugünlük yapılacak zorunlu görev kalmadı. İşçilerin yarına kadar Kıraathane için gereken Mahsul (80) ve Tahta'yı (75) biriktiriyor. Yarın kaynakların dolunca Kıraathane'yi inşa edeceğiz!",
    hedefler: [
      { tur: "bina", id: "sosyalmeydan", etiket: "🌳 Çınar Altı Sohbeti'ne Göz At" },
      { tur: "nokta", id: "pano", etiket: "📜 Görev Panosuna Bak" },
    ],
    tamamMi: (durum) =>
      (durum.binalar?.kiraathane ?? 0) >= 1 ||
      Object.entries(KIRAATHANE_BEDEL).every(([k, m]) => (durum.envanter?.[k] ?? 0) >= (Number(m) || 0)),
  },
  {
    kod: "gorev_kiraathane_insa",
    bolum: "gorev",
    baslik: "8. Yapılacak İş (2. Gün Hedefi): Kıraathane'yi İnşa Et!",
    metin:
      `Kaynaklarımız (${KIRAATHANE_BEDEL.erzak ?? 0} Mahsul ve ${KIRAATHANE_BEDEL.kereste ?? 0} Tahta) tamamlandı! Şimdi meydanın sağındaki Kıraathane arsasına tıkla ve köyümüzün Kıraathane binasını inşa et!`,
    hedefler: [{ tur: "bina", id: "kiraathane", etiket: "🍵 Kıraathane Arsasına Git ve Kur" }],
    tamamMi: (durum) => (durum.binalar?.kiraathane ?? 0) >= 1,
  },
  {
    kod: "gorev_ozan_dinle",
    bolum: "gorev",
    baslik: "9. Yapılacak İş: Kıraathane'de Ozan Dede'yi Dinle!",
    metin:
      "Harika, Kıraathane'mizi inşa ettik! Şimdi Kıraathane'nin içine girerek Ozan Dede'den türkümüzün hikâyesini dinle; dilersen içeride bekleyen yolcuları da köyümüze davet et!",
    hedefler: [{ tur: "bina", id: "kiraathane", etiket: "🎵 Kıraathane İçine Gir (Ozan Dede)" }],
    tamamMi: (_durum, gorevler) => gorevYoksaVeyaTamam(gorevler, "turku", (g) => g.tamam),
  },
  {
    // Leveldaki tüm görevler bitince rehber öğrenciyi Ferman'a (level atlamaya) götürür
    kod: "gorev_level_atla",
    bolum: "gorev",
    baslik: "🎉 Level Atlamaya Hazırsın!",
    metin:
      "Maşallah! Bu leveldaki bütün görevleri tamamladın. Görev Panosu'na git ve level atla; Padişah'ın Fermanı seni yeni binalar ve yeni görevlerle bekliyor!",
    hedefler: [{ tur: "nokta", id: "pano", etiket: "⭐ Görev Panosuna Git ve Level Atla" }],
    tamamMi: (_durum, gorevler) => gorevler.length === 0 || !gorevler.every((g) => g.tamam),
  },
  {
    // Tanıtım bitti: rehber artık başa dönmez, öğrenciyi günlük düzene ve Görev Panosu'na yönlendirir
    kod: "gorev_serbest",
    bolum: "gorev",
    baslik: "🧭 Artık Köyün Sana Emanet!",
    metin:
      "Tebrikler genç yönetici, köyün temellerini birlikte attık! Bundan sonra her gün: Haberci'nin mektubunu al ve ailenle oku, hadisini öğren, tarla ve ormanda işçilerini çalıştır, meydandaki davayı çöz. Level atlamak için Görev Panosu'ndaki işleri tamamla; hepsi bitince Ferman gelir ve yeni binalar açılır!",
    hedefler: [
      { tur: "nokta", id: "pano", etiket: "📜 Görev Panosuna Bak" },
      { tur: "nokta", id: "haberci", etiket: "✉️ Haberci'ye Uğra" },
    ],
    tamamMi: () => false,
  },
];

export const ILK_GOREV_ADIM_INDEKSI = REHBER_ADIMLARI.findIndex((a) => a.bolum === "gorev");

export function ilkEksikRehberAdimi(durum, gorevler = [], tanitimdanBasla = false, simdi = 0) {
  if (tanitimdanBasla) return 0;
  const idx = REHBER_ADIMLARI.findIndex(
    (a, i) => i >= ILK_GOREV_ADIM_INDEKSI && a.tamamMi && !a.tamamMi(durum, gorevler, simdi)
  );
  return idx === -1 ? REHBER_ADIMLARI.length - 1 : idx;
}

const SON_GUN_ANAHTARI = "seyrusefer_rehber_son_gun";
const BUGUNLUK_ANAHTARI = "seyrusefer_rehber_bugunluk_gun";

function cihazdanOku(anahtar) {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(anahtar);
    return v == null ? null : Number(v);
  } catch {
    return null;
  }
}

function cihazaYaz(anahtar, deger) {
  try {
    window.localStorage.setItem(anahtar, String(deger));
  } catch {
    // saklanamazsa yalnızca bu oturumda geçerli olur
  }
}

/** İkinci (ve sonraki) gün: "Bugünlük tamam" adımı yerine öğrenciyi yeniden üretime yönlendiren karşılama */
function yeniGunAdimi(adim, durum) {
  const env = durum?.envanter ?? {};
  const eksik = Object.entries(KIRAATHANE_BEDEL)
    .filter(([k]) => k === "erzak" || k === "kereste")
    .map(([k, m]) => ({ k, kalan: Math.max(0, (Number(m) || 0) - (env[k] ?? 0)) }));
  const ad = { erzak: "Mahsul", kereste: "Tahta" };
  const kalanMetin = eksik
    .filter((e) => e.kalan > 0)
    .map((e) => `${e.kalan} ${ad[e.k]}`)
    .join(" ve ");
  return {
    ...adim,
    baslik: "🌅 Tekrar Hoş Geldin! Yeni Bir Gün Başladı",
    metin: `Hayırlı sabahlar genç yönetici! Gece boyunca tarlan yeniden doldu, orman keşif seferlerin de yenilendi. Önce tarladaki hasadını topla, sonra ormana keşfe çık.${
      kalanMetin ? ` Kıraathane'yi kurmak için ${kalanMetin} daha biriktirmen gerekiyor.` : " Kıraathane için gereken her şey hazır!"
    }`,
    hedefler: [
      { tur: "nokta", id: "tarla", etiket: "🌾 Tarlaya Git" },
      { tur: "nokta", id: "orman", etiket: "🌲 Ormana Git" },
    ],
  };
}

export default function RehberKarakter({
  acik,
  adimIndeks,
  setAdimIndeks,
  onKapat,
  onHedefSec,
  durum,
  gorevler,
  simdi,
  onGorunenHedefler,
  onKucukDegisti,
}) {
  const [kucuk, setKucuk] = useState(false);
  const bugun = trGunNo(simdi ?? 0);
  // Öğrencinin bu cihazda rehberi en son hangi oyun gününde gördüğü (yeni günü fark etmek için)
  // Cihaz hafızası yalnızca tarayıcıda, sayfa açıldıktan sonra okunur (sunucu çizimiyle uyuşmazlık olmasın)
  const [sonGorulenGun, setSonGorulenGun] = useState(null);
  const [bugunlukGun, setBugunlukGun] = useState(null);
  const [hafizaOkundu, setHafizaOkundu] = useState(false);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setSonGorulenGun(cihazdanOku(SON_GUN_ANAHTARI));
    setBugunlukGun(cihazdanOku(BUGUNLUK_ANAHTARI));
    setHafizaOkundu(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  const yeniGun = !!simdi && sonGorulenGun != null && bugun > sonGorulenGun;
  useEffect(() => {
    if (hafizaOkundu && acik && simdi) cihazaYaz(SON_GUN_ANAHTARI, bugun);
  }, [hafizaOkundu, acik, bugun, simdi]);

  const hamAdim = REHBER_ADIMLARI[adimIndeks] ?? REHBER_ADIMLARI[0];
  // "Bugünlük tamam" adımına ilk ulaşılan gün; ertesi günden itibaren adım "Tekrar hoş geldin"e dönüşür
  useEffect(() => {
    if (!hafizaOkundu || !simdi || hamAdim.kod !== "gorev_bugunluk_tamam" || bugunlukGun != null) return;
    cihazaYaz(BUGUNLUK_ANAHTARI, bugun);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBugunlukGun(bugun);
  }, [hafizaOkundu, hamAdim.kod, bugunlukGun, bugun, simdi]);
  const adim =
    hamAdim.kod === "gorev_bugunluk_tamam" && !!simdi && bugunlukGun != null && bugun > bugunlukGun
      ? yeniGunAdimi(hamAdim, durum)
      : hamAdim;
  const tamMetin = adim.metin;
  const [oncekiKod, setOncekiKod] = useState(adim.kod);
  const degisikHedef = adim !== hamAdim;
  useEffect(() => {
    onGorunenHedefler?.(degisikHedef ? { kod: adim.kod, hedefler: adim.hedefler } : null);
    // adim nesnesi her çizimde yeniden üretilir; yalnızca kod ve değişiklik durumu izlenir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [degisikHedef, adim.kod]);

  const [harfSayisi, setHarfSayisi] = useState(0);
  const [agizAcik, setAgizAcik] = useState(false);

  const yaziliyor = acik && harfSayisi < tamMetin.length;

  useEffect(() => {
    if (!acik) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHarfSayisi(0);
    setAgizAcik(false);
  }, [adimIndeks, acik, tamMetin]);

  useEffect(() => {
    if (!acik || harfSayisi >= tamMetin.length) return;
    const t = setInterval(() => {
      setHarfSayisi((s) => Math.min(tamMetin.length, s + 1));
    }, 24);
    return () => clearInterval(t);
  }, [acik, harfSayisi, tamMetin.length]);

  useEffect(() => {
    if (!yaziliyor) return;
    const t = setInterval(() => {
      setAgizAcik((a) => !a);
    }, 160);
    return () => {
      clearInterval(t);
      setAgizAcik(false);
    };
  }, [yaziliyor]);

  if (!acik) return null;

  const buAdimTamam = adim.tamamMi ? adim.tamamMi(durum, gorevler, simdi) : false;
  const gosterilenMetin = tamMetin.slice(0, harfSayisi);
  const ileriKilitli = adim.bolum === "gorev" && !!adim.tamamMi && !buAdimTamam;
  const butonluHedefler =
    adim.bolum === "gorev" ? (adim.hedefler ?? []).filter((h) => h.etiket) : [];

  const ileriTikla = () => {
    if (yaziliyor) {
      setHarfSayisi(tamMetin.length);
      setAgizAcik(false);
      return;
    }
    // "Yapılacak İşler" bölümünde iş yapılmadan bir sonraki adıma geçilemez
    if (ileriKilitli) return;
    if (adimIndeks < REHBER_ADIMLARI.length - 1) {
      setAdimIndeks(adimIndeks + 1);
    } else {
      onKapat();
    }
  };

  // Küçültülmüş rehber: yalnızca alt şerit görünür, köy tamamen açıkta kalır.
  // Yeni bir adıma geçilince rehber kendiliğinden açılır (talimat kaçırılmasın).
  if (oncekiKod !== adim.kod) {
    setOncekiKod(adim.kod);
    if (kucuk) setKucuk(false);
  }
  const kucukAyarla = (deger) => {
    setKucuk(deger);
    onKucukDegisti?.(deger);
  };

  if (kucuk) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-2 z-[320] flex justify-center px-2 sm:bottom-4">
        <button
          type="button"
          onClick={() => kucukAyarla(false)}
          className="tezhip levha-ac pointer-events-auto flex max-w-xl min-w-0 items-center gap-2.5 rounded-full py-1.5 pr-4 pl-1.5 text-left text-amber-50"
          aria-label="Rehberi aç"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/binalar/rehber_kapali.webp"
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-amber-400/70"
            draggable={false}
          />
          <span className="min-w-0 flex-1 truncate text-xs font-bold sm:text-sm">{adim.baslik}</span>
          <span className="shrink-0 rounded-full bg-amber-400 px-2.5 py-0.5 text-[11px] font-black text-stone-950">Aç ▴</span>
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-2 z-[320] flex justify-center px-2 sm:bottom-4 sm:px-4 kisa:bottom-1! kisa:justify-start kisa:pr-14! kisa:pl-1!">
      <div className="tezhip levha-ac pointer-events-auto flex w-full max-w-2xl flex-col gap-2 rounded-3xl p-2.5 text-amber-50 sm:gap-2.5 sm:p-4 kisa:max-h-[54dvh] kisa:max-w-[44rem] kisa:gap-1.5 kisa:overflow-y-auto">
        {/* Üst satır: bölüm seçici + küçült + atla (ince) */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex gap-1 rounded-xl bg-stone-950 p-0.5 text-[11px] font-black ring-1 ring-stone-800 sm:text-xs">
            <button
              type="button"
              onClick={() => setAdimIndeks(0)}
              className={`rounded-lg px-2 py-1 transition ${
                adim.bolum === "tanitim" ? "varak-dugme" : "text-amber-200/70 hover:text-amber-100"
              }`}
            >
              🗺️ Tanıtım
            </button>
            <button
              type="button"
              onClick={() => setAdimIndeks(ilkEksikRehberAdimi(durum, gorevler, false, simdi))}
              className={`rounded-lg px-2 py-1 transition ${
                adim.bolum === "gorev" ? "bg-emerald-500 text-stone-950 shadow" : "text-amber-200/70 hover:text-amber-100"
              }`}
            >
              🎯 Yapılacak İşler
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => kucukAyarla(true)}
              aria-label="Rehberi küçült"
              title="Rehberi küçült, köyü gör"
              className="rounded-xl bg-stone-800 px-2.5 py-1 text-xs font-black text-amber-200 hover:bg-stone-700"
            >
              ▾ Küçült
            </button>
            <button
              type="button"
              onClick={onKapat}
              className="rounded-xl px-2 py-1 text-[11px] font-bold text-stone-400 hover:text-white"
            >
              Atla ⏭
            </button>
          </div>
        </div>

        {/* Avatar + başlık */}
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={yaziliyor && agizAcik ? "/assets/binalar/rehber_acik.webp" : "/assets/binalar/rehber_kapali.webp"}
            alt="Bilge Rehber"
            className={`h-11 w-11 shrink-0 rounded-xl object-cover ring-2 sm:h-14 sm:w-14 ${
              yaziliyor ? "ring-amber-400 shadow-lg shadow-amber-500/30" : "ring-amber-500/50"
            }`}
            draggable={false}
          />
          <div className="min-w-0 flex-1">
            {yeniGun && adim.kod !== "gorev_bugunluk_tamam" && (
              <p className="mb-0.5 truncate text-[11px] font-bold text-emerald-300">
                🌅 Tekrar hoş geldin! Tarlan doldu, orman seferlerin yenilendi.
              </p>
            )}
            <h3 className="text-sm leading-snug font-black text-amber-100 sm:text-base">{adim.baslik}</h3>
          </div>
          {buAdimTamam && (
            <span className="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-500/40">
              ✅
            </span>
          )}
        </div>

        {/* Konuşma: en fazla birkaç satır, fazlası kutunun içinde kayar */}
        <div
          onClick={() => {
            if (yaziliyor) {
              setHarfSayisi(tamMetin.length);
              setAgizAcik(false);
            }
          }}
          className="max-h-[5.6rem] cursor-pointer overflow-y-auto rounded-2xl bg-stone-900/90 px-3 py-2 text-[13px] leading-relaxed font-medium text-amber-50 ring-1 ring-amber-500/25 sm:max-h-32 sm:text-sm kisa:p-2!"
        >
          {gosterilenMetin}
          {yaziliyor && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-amber-400 align-middle" />}
        </div>

        {/* Alt kontrol ve hedef düğmeleri */}
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={adimIndeks === 0}
              onClick={() => setAdimIndeks(Math.max(0, adimIndeks - 1))}
              aria-label="Önceki adım"
              className="rounded-xl bg-stone-800 px-2.5 py-1.5 text-xs font-bold text-stone-300 hover:bg-stone-700 disabled:opacity-40"
            >
              ←
            </button>
            {butonluHedefler.map((h) => (
              <button
                key={`${h.tur}_${h.id}`}
                type="button"
                onClick={() => {
                  // Hedefe gidilirken rehber küçülür, köy görünür kalır
                  kucukAyarla(true);
                  onHedefSec?.(h);
                }}
                className="rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 px-3 py-1.5 text-xs font-black text-white shadow ring-1 ring-emerald-300/50 hover:brightness-110"
              >
                {h.etiket}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {adim.bolum === "tanitim" && (
              <button
                type="button"
                onClick={() => setAdimIndeks(ilkEksikRehberAdimi(durum, gorevler, false, simdi))}
                className="rounded-xl bg-stone-800 px-2.5 py-1.5 text-xs font-bold text-amber-300 ring-1 ring-amber-500/30 hover:bg-stone-700"
              >
                İşlere başla
              </button>
            )}
            <button
              type="button"
              onClick={ileriTikla}
              disabled={!yaziliyor && ileriKilitli}
              title={!yaziliyor && ileriKilitli ? "Bu iş tamamlanınca rehber kendiliğinden sıradakine geçer" : undefined}
              className="varak-dugme rounded-xl px-3.5 py-1.5 text-xs"
            >
              {yaziliyor
                ? "⏩ Tamamla"
                : ileriKilitli
                ? "🔒 Önce bu işi yap"
                : adimIndeks < REHBER_ADIMLARI.length - 1
                ? "İlerle →"
                : "✅ Bitir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
