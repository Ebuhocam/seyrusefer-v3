"use client";
import { useEffect, useState } from "react";

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
    hedefler: [{ tur: "bina", id: "mektep", etiket: "🏛️ Mektep Arsını Aç ve Kur" }],
    tamamMi: (durum) => (durum.binalar?.mektep ?? 0) >= 1,
  },
  {
    kod: "gorev_mektep_oku",
    bolum: "gorev",
    baslik: "2. Yapılacak İş: Mektep'te Günün Hadisini Oku!",
    metin:
      "Harika, Mektep binamızı kurduk! Şimdi kurduğun Mektep binasına tıklayıp içeri gir. Günün Hadis-i Şerifini oku ve Niyet videosunu izleyerek ilim görevlerini tamamla!",
    hedefler: [{ tur: "bina", id: "mektep", etiket: "📖 Mektep İçine Gir" }],
    tamamMi: (_durum, gorevler) => gorevler.some((g) => g.tur === "hadis" && g.yapilan > 0),
  },
  {
    kod: "gorev_tarla_orman",
    bolum: "gorev",
    baslik: "3. Yapılacak İş: Tarlada Sula & Ormanda Ağaç Kes!",
    metin:
      "Şimdi haritada parlayan Tarla ve Orman'a tıkla! İçeride işçilerini görevlendir, Tarlada kuruyan parselleri sula ve Ormanda yaş ağaçlara dokunmadan kurumuş ağaçları kes!",
    hedefler: [
      { tur: "nokta", id: "tarla", etiket: "🌾 Tarlaya Git (Sula)" },
      { tur: "nokta", id: "orman", etiket: "🌲 Ormana Git (Ağaç Kes)" },
    ],
    tamamMi: (durum) =>
      (durum.sonEtkilesim?.erzak ?? 0) > 0 || (durum.sonEtkilesim?.kereste ?? 0) > 0,
  },
  {
    kod: "gorev_haberci_ev",
    bolum: "gorev",
    baslik: "4. Yapılacak İş: Haberci'den Mektubu Al ve Evinde Oku!",
    metin:
      "Güney yolundaki Haberci'ye tıklayıp mühürlü Aile Mektubunu teslim al! Ardından Kendi Evim binasına tıklayarak Ev İçi odasına gir, aileni/büyüklerini yanına çağır ve mektubu açıp birlikte okuyun!",
    hedefler: [
      { tur: "nokta", id: "haberci", etiket: "📜 1. Haberci'den Mektubu Al" },
      { tur: "bina", id: "kendi_evim", etiket: "🏡 2. Kendi Evime Gir" },
    ],
    tamamMi: (_durum, gorevler) => gorevler.some((g) => g.tur === "aile" && g.tamam),
  },
  {
    kod: "gorev_meydan_dava",
    bolum: "gorev",
    baslik: "5. Yapılacak İş: Köy Meydanı'nda İlk Davayı Çöz!",
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
      ((durum.envanter?.erzak ?? 0) >= 80 && (durum.envanter?.kereste ?? 0) >= 75),
  },
  {
    kod: "gorev_kiraathane_insa",
    bolum: "gorev",
    baslik: "6. Yapılacak İş (2. Gün Hedefi): Kıraathane'yi İnşa Et!",
    metin:
      "Kaynaklarımız (80 Mahsul ve 75 Tahta) tamamlandı! Şimdi meydanın sağındaki Kıraathane arsasına tıkla ve köyümüzün Kıraathane binasını inşa et!",
    hedefler: [{ tur: "bina", id: "kiraathane", etiket: "🍵 Kıraathane Arsasına Git ve Kur" }],
    tamamMi: (durum) => (durum.binalar?.kiraathane ?? 0) >= 1,
  },
  {
    kod: "gorev_ozan_dinle",
    bolum: "gorev",
    baslik: "7. Yapılacak İş: Kıraathane'de Ozan Dede'yi Dinle!",
    metin:
      "Harika, Kıraathane'mizi inşa ettik! Şimdi Kıraathane'nin içine girerek Ozan Dede'den türkümüzün hikâyesini dinle; dilersen içeride bekleyen yolcuları da köyümüze davet et!",
    hedefler: [{ tur: "bina", id: "kiraathane", etiket: "🎵 Kıraathane İçine Gir (Ozan Dede)" }],
    tamamMi: (_durum, gorevler) => gorevler.some((g) => g.tur === "turku" && g.tamam),
  },
];

export const ILK_GOREV_ADIM_INDEKSI = REHBER_ADIMLARI.findIndex((a) => a.bolum === "gorev");

export function ilkEksikRehberAdimi(durum, gorevler = [], tanitimdanBasla = false) {
  if (tanitimdanBasla) return 0;
  const idx = REHBER_ADIMLARI.findIndex(
    (a, i) => i >= ILK_GOREV_ADIM_INDEKSI && a.tamamMi && !a.tamamMi(durum, gorevler)
  );
  return idx === -1 ? ILK_GOREV_ADIM_INDEKSI : idx;
}

export default function RehberKarakter({
  acik,
  adimIndeks,
  setAdimIndeks,
  onKapat,
  onHedefSec,
  durum,
  gorevler,
}) {
  const adim = REHBER_ADIMLARI[adimIndeks] ?? REHBER_ADIMLARI[0];
  const tamMetin = adim.metin;

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

  const buAdimTamam = adim.tamamMi ? adim.tamamMi(durum, gorevler) : false;
  const gosterilenMetin = tamMetin.slice(0, harfSayisi);
  const butonluHedefler =
    adim.bolum === "gorev" ? (adim.hedefler ?? []).filter((h) => h.etiket) : [];

  const ileriTikla = () => {
    if (yaziliyor) {
      setHarfSayisi(tamMetin.length);
      setAgizAcik(false);
      return;
    }
    if (adimIndeks < REHBER_ADIMLARI.length - 1) {
      setAdimIndeks(adimIndeks + 1);
    } else {
      onKapat();
    }
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-2 z-[320] flex justify-center px-2 sm:bottom-4 sm:px-4">
      <div className="pointer-events-auto flex w-full max-w-2xl flex-col gap-2.5 rounded-3xl bg-gradient-to-b from-stone-900/95 to-stone-950/95 p-3.5 text-amber-50 shadow-2xl ring-2 ring-amber-400/80 backdrop-blur sm:p-4">
        {/* Üst Mod Seçici: 1. Köy Tanıtım Turu <-> 2. Şimdi Yapacaklarımız */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2">
          <div className="flex gap-1.5 rounded-xl bg-stone-950 p-1 text-xs font-black ring-1 ring-stone-800">
            <button
              type="button"
              onClick={() => setAdimIndeks(0)}
              className={`rounded-lg px-2.5 py-1 transition ${
                adim.bolum === "tanitim"
                  ? "bg-amber-400 text-stone-950 shadow"
                  : "text-amber-200/70 hover:text-amber-100"
              }`}
            >
              🗺️ 1. Köy Tanıtım Turu
            </button>
            <button
              type="button"
              onClick={() => setAdimIndeks(ilkEksikRehberAdimi(durum, gorevler, false))}
              className={`rounded-lg px-2.5 py-1 transition ${
                adim.bolum === "gorev"
                  ? "bg-emerald-500 text-stone-950 shadow"
                  : "text-amber-200/70 hover:text-amber-100"
              }`}
            >
              🎯 2. Yapılacak İşler
            </button>
          </div>

          <button
            type="button"
            onClick={onKapat}
            className="rounded-xl bg-stone-800 px-2.5 py-1 text-xs font-bold text-stone-300 hover:bg-stone-700 hover:text-white"
          >
            Rehberi Atla ⏭
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Karakter Portresi */}
          <div className="flex items-center gap-3 sm:flex-col sm:gap-1.5">
            <div className="relative shrink-0">
              <img
                src={
                  yaziliyor && agizAcik
                    ? "/assets/binalar/rehber_acik.webp"
                    : "/assets/binalar/rehber_kapali.webp"
                }
                alt="Bilge Rehber"
                className={`h-16 w-16 rounded-2xl object-cover ring-2 sm:h-24 sm:w-24 ${
                  yaziliyor ? "ring-amber-400 shadow-lg shadow-amber-500/30" : "ring-amber-500/50"
                }`}
                draggable={false}
              />
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-stone-950 shadow">
                🧭 Bilge Rehber
              </span>
            </div>

            <div className="flex flex-col sm:hidden">
              <h3 className="text-sm font-black text-amber-100">{adim.baslik}</h3>
            </div>
          </div>

          {/* Daktilo Konuşma Balonu */}
          <div className="flex-1 space-y-2.5">
            <div className="hidden items-center justify-between sm:flex">
              <h3 className="text-sm font-black text-amber-100 sm:text-base">{adim.baslik}</h3>
              {buAdimTamam && (
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-500/40">
                  ✅ Tamamlandı
                </span>
              )}
            </div>

            <div
              onClick={() => {
                if (yaziliyor) {
                  setHarfSayisi(tamMetin.length);
                  setAgizAcik(false);
                }
              }}
              className="min-h-[3.75rem] cursor-pointer rounded-2xl bg-stone-900/90 p-3 text-xs leading-relaxed font-medium text-amber-50 ring-1 ring-amber-500/25 sm:text-sm"
            >
              {gosterilenMetin}
              {yaziliyor && (
                <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-amber-400 align-middle" />
              )}
            </div>

            {/* Alt Kontrol ve Hedef Butonları */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={adimIndeks === 0}
                  onClick={() => setAdimIndeks(Math.max(0, adimIndeks - 1))}
                  className="rounded-xl bg-stone-800 px-2.5 py-1.5 text-xs font-bold text-stone-300 hover:bg-stone-700 disabled:opacity-40"
                >
                  ← Önceki
                </button>

                {butonluHedefler.map((h) => (
                  <button
                    key={`${h.tur}_${h.id}`}
                    type="button"
                    onClick={() => onHedefSec?.(h)}
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
                    onClick={() => setAdimIndeks(ilkEksikRehberAdimi(durum, gorevler, false))}
                    className="rounded-xl bg-stone-800 px-2.5 py-1.5 text-xs font-bold text-amber-300 ring-1 ring-amber-500/30 hover:bg-stone-700"
                  >
                    Tanıtımı Geç → İşlere Başla
                  </button>
                )}

                <button
                  type="button"
                  onClick={ileriTikla}
                  className="rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 px-3.5 py-1.5 text-xs font-black text-stone-950 shadow hover:brightness-110"
                >
                  {yaziliyor
                    ? "⏩ Yazıyı Tamamla"
                    : adimIndeks < REHBER_ADIMLARI.length - 1
                    ? "İlerle →"
                    : "✅ Rehberi Bitir"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
