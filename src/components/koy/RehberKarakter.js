"use client";
import { useEffect, useState } from "react";

export const REHBER_ADIMLARI = [
  {
    kod: "mektep_insa",
    baslik: "1. Adım: İlk Binamız Mektep'i Kuralım",
    metin:
      "Selamün aleyküm genç yönetici! Ben Bilge Rehber. Köyümüzde görevlere başlamadan önce ilim yuvamız olan Mektep'i kurmalıyız. Haritada parlayan Mektep arsasına tıkla ve başlangıç kaynaklarınla 1. Seviyesini hemen inşa et!",
    hedef: { tur: "bina", id: "mektep", etiket: "🏛️ Mektep Arsını Aç" },
    tamamMi: (durum) => (durum.binalar?.mektep ?? 0) >= 1,
  },
  {
    kod: "ilk_gorev",
    baslik: "2. Adım: Mektep'e Gir ve İlk Görevini Yap",
    metin:
      "Maşallah, Mektebimiz kuruldu! Artık görevlerin kilidi açıldı. Şimdi Mektep binasına tıklayıp içerideki Günlük Hadis-i Şerifi oku ve Niyet videosunu izleyerek ilk ilim görevlerini tamamla!",
    hedef: { tur: "bina", id: "mektep", etiket: "📖 Mektep İçine Gir" },
    tamamMi: (_durum, gorevler) => gorevler.some((g) => g.yapilan > 0),
  },
  {
    kod: "uretim_topla",
    baslik: "3. Adım: Tarla, Orman ve Taş Ocağı",
    metin:
      "Köyümüzü büyütmek için Mahsul, Tahta ve Taş üretmeliyiz! Haritanın solundaki Tarla ve Orman'a tıklayarak üretim alanlarına gidebilir, biriken kaynakları toplayıp köylülerini görevlendirebilirsin.",
    hedef: { tur: "nokta", id: "tarla", etiket: "🌾 Tarla Alanına Git" },
    tamamMi: (durum) => (durum.binalar?.mektep ?? 0) >= 1 && (durum.envanter?.erzak ?? 0) >= 60,
  },
  {
    kod: "konut_kapasite",
    baslik: "4. Adım: 5+1 Ev Mahallesi ve Barınma Yeri",
    metin:
      "Köyümüze yeni insanların yerleşmesi için barınma yeri şart! Mahallemizde Kendi Evimiz ve 5 Köylü Evi arsası (5+1 konut) var. Evler 3 kata kadar çıkar ve her kat +5 👥 Kişi kapasite sağlar. Boş yatak olmadan yeni insan toplayamayız!",
    hedef: { tur: "bina", id: "ev1", etiket: "🏠 Köy Evi 1 Arsasına Bak" },
    tamamMi: (durum) => (durum.binalar?.ev1 ?? 0) >= 1 || (durum.binalar?.kendi_evim ?? 1) >= 2,
  },
  {
    kod: "kiraathane_ziyaret",
    baslik: "5. Adım: Kıraathane, Ozan Dede ve Yolcular",
    metin:
      "Evlerimizde boş yer açtığımıza göre Kıraathane'yi kurabiliriz! Kıraathane'de Ozan Dede ağzı oynayarak türkülerimizin hikâyesini anlatır; ayrıca köye uğrayan yolculara ev teklif ederek 👥 İnsan kaynağını artırabilirsin.",
    hedef: { tur: "bina", id: "kiraathane", etiket: "🍵 Kıraathane'yi Aç" },
    tamamMi: (durum) => (durum.binalar?.kiraathane ?? 0) >= 1,
  },
  {
    kod: "meydan_dava",
    baslik: "6. Adım: Köy Meydanı'nda Halkın Davaları",
    metin:
      "İyi bir yönetici halkının dertlerini dinler! Köy Meydanı'na gittiğinde meydanda bekleyen köylünün davasını tek tek dinleyip çözebilirsin. Hikmetli kararlar köyün 😊 Mutluluğunu artırır!",
    hedef: { tur: "bina", id: "sosyalmeydan", etiket: "⚖️ Köy Meydanı'na Git" },
    tamamMi: (durum) => (durum.cozulenDavalar?.length ?? 0) >= 1,
  },
];

export function ilkEksikRehberAdimi(durum, gorevler = []) {
  const idx = REHBER_ADIMLARI.findIndex((a) => !a.tamamMi(durum, gorevler));
  return idx === -1 ? 0 : idx;
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

  // Adım değiştiğinde veya rehber açıldığında daktiloyu baştan başlat
  useEffect(() => {
    if (!acik) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHarfSayisi(0);
    setAgizAcik(false);
  }, [adimIndeks, acik, tamMetin]);

  // Daktilo harf harf yazma efekti
  useEffect(() => {
    if (!acik || harfSayisi >= tamMetin.length) return;
    const t = setInterval(() => {
      setHarfSayisi((s) => Math.min(tamMetin.length, s + 1));
    }, 26);
    return () => clearInterval(t);
  }, [acik, harfSayisi, tamMetin.length]);

  // Konuşurken ağız aç-kapa animasyonu
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

  const buAdimTamam = adim.tamamMi(durum, gorevler);
  const gosterilenMetin = tamMetin.slice(0, harfSayisi);

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
      <div className="pointer-events-auto flex w-full max-w-2xl flex-col gap-3 rounded-3xl bg-gradient-to-b from-stone-900/95 to-stone-950/95 p-3.5 text-amber-50 shadow-2xl ring-2 ring-amber-400/80 backdrop-blur sm:flex-row sm:items-center sm:p-4">
        {/* Karakter Portresi + Adım Rozeti */}
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
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              Adım {adimIndeks + 1} / {REHBER_ADIMLARI.length}
            </span>
            <h3 className="text-sm font-black text-amber-100">{adim.baslik}</h3>
          </div>
        </div>

        {/* Daktilo Konuşma Balonu */}
        <div className="flex-1 space-y-2.5">
          <div className="hidden items-center justify-between sm:flex">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-black text-amber-300 ring-1 ring-amber-400/40">
                Adım {adimIndeks + 1} / {REHBER_ADIMLARI.length}
              </span>
              <h3 className="text-sm font-black text-amber-100 sm:text-base">{adim.baslik}</h3>
            </div>
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

          {/* Alt Kontrol Butonları */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={adimIndeks === 0}
                onClick={() => setAdimIndeks(Math.max(0, adimIndeks - 1))}
                className="rounded-xl bg-stone-800 px-2.5 py-1.5 text-xs font-bold text-stone-300 hover:bg-stone-700 disabled:opacity-40"
              >
                ← Önceki
              </button>

              {adim.hedef && (
                <button
                  type="button"
                  onClick={() => onHedefSec?.(adim.hedef)}
                  className="rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 px-3 py-1.5 text-xs font-black text-white shadow ring-1 ring-emerald-300/50 hover:brightness-110"
                >
                  {adim.hedef.etiket}
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={ileriTikla}
                className="rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 px-3.5 py-1.5 text-xs font-black text-stone-950 shadow hover:brightness-110"
              >
                {yaziliyor
                  ? "⏩ Yazıyı Tamamla"
                  : adimIndeks < REHBER_ADIMLARI.length - 1
                  ? "Sonraki Adım →"
                  : "✅ Rehberi Bitir"}
              </button>

              <button
                type="button"
                onClick={onKapat}
                className="rounded-xl bg-stone-800 px-2.5 py-1.5 text-xs font-bold text-stone-300 hover:bg-stone-700 hover:text-white"
              >
                Atla ⏭
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
