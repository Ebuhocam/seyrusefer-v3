"use client";
import { useEffect, useState } from "react";
import { BINALAR, BIRLIK_ACILIS_LEVEL, KAYNAKLAR, NOKTALAR, toplamKonutKapasitesi } from "@/lib/oyun/sabitler";
import { kaynakAcikMi, saatlikUretim, meydanOlayDurumu, mektupBugunAlindi, madenOyunModu } from "@/lib/oyun/kurallar";
import { koyDavalariListesi, gocmenDurumu } from "@/lib/oyun/hikayeler";
import { AileOkumasiKutusu, NamazCetelesiKutusu, ObaDavaKutusu, SosyalMeydanKutusu } from "./GorevlerEkrani";
import {
  TasOcagi3DSahnesi,
  OrmanKesifVeKesimSahnesi,
  TarlaFPS3DSahnesi,
} from "./UretimOyunlari3D";
import KoyMeydani3DSahnesi from "./KoyMeydani3DSahnesi";
import TasAviOyunu from "./TasAviOyunu";
import AileOyunlari from "./AileOyunlari";
import DersCalismaKosesi from "./DersCalismaKosesi";


// =============================================================
// 1. EV İÇİ 2D ODA SAHNESİ (Haberci Mektup Kontrolü + "Ailemle Birlikteyim" Butonu)
// Not: Anne/babası olmayan çocukların üzülmemesi için odaya NPC aile
// karakterleri gelmez; sadece "Ailemle Birlikteyim" butonu ile okuma başlatılır.
// =============================================================
export function EvIciSahnesi({ binaId, oyun, onSecimDegistir, onYukseltmeAc }) {
  const { durum, karakter } = oyun;
  const kat = durum.binalar[binaId] ?? 1;
  const kendiEvimMi = binaId === "kendi_evim";

  const aileGorevi = oyun.gorevler.find((g) => g.tur === "aile" || g.kod === "aile");
  // Haberci her gün yeni mektup getirir: bugünün mektubu alındı mı, bugün okundu mu?
  const mektupAlindiMi = mektupBugunAlindi(durum, oyun.simdi);
  const bugunOkundu = Boolean(aileGorevi?.bugunYapildi);

  // Oyuncunun oda içindeki konumu
  const [oyuncuKonum, setOyuncuKonum] = useState({ x: 42, y: 72 });
  // 1. aşama: "Ailemin yanına gidiyorum" tıklandı mı?
  const [cagriBasladi, setCagriBasladi] = useState(bugunOkundu);
  // 2. aşama: "Ailemle birlikteyim" butonuna tıklandı mı?
  const [cagrildiOnay, setCagrildiOnay] = useState(bugunOkundu);
  const [mektupAcik, setMektupAcik] = useState(false);

  const zemineTikla = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(82, Math.max(18, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(86, Math.max(52, ((e.clientY - rect.top) / rect.height) * 100));
    setOyuncuKonum({ x: Math.round(x), y: Math.round(y) });
  };

  return (
    <div className="space-y-4">
      {/* Üst Bilgi ve Durum Çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-stone-950/85 p-4 ring-1 ring-amber-500/30">
        <div className="flex items-center gap-3">
          <img
            src={karakter?.gorsel ?? "/assets/karakterler/ahmet.webp"}
            alt={karakter?.ad ?? "Karakter"}
            className="h-14 w-14 rounded-2xl bg-stone-900/95 p-1 object-contain ring-2 ring-amber-400"
          />
          <div>
            <h3 className="text-sm font-black text-amber-100 sm:text-base">
              {BINALAR[binaId]?.ad ?? "Ev"} · 2D Oda İçi Sahnesi ({kat}. Kat · 👥 {kat * 5} Kişilik Hane)
            </h3>
            <p className="text-xs text-amber-200/80">
              Oda içinde istediğin yere tıklayarak yürüyebilir, Haberci&apos;den aldığın okuma mektubunu burada okuyabilirsin.
            </p>
          </div>
        </div>

        {onYukseltmeAc && (
          <button
            type="button"
            onClick={onYukseltmeAc}
            className="rounded-2xl bg-stone-800 px-3.5 py-2 text-xs font-black text-amber-200 ring-1 ring-amber-400/30 hover:bg-stone-700"
          >
            🔨 Kat Çık / Bina Detayı ({kat}/3 Kat)
          </button>
        )}
      </div>

      {/* İNTERAKTİF EV İÇİ ODA SAHNESİ (Tüm çağrı ve mektup pencereleri oyun ekranı içinde açılır) */}
      <div
        onClick={zemineTikla}
        className="relative min-h-[430px] kisa:min-h-0 kisa:aspect-auto kisa:h-[calc(100dvh-4.5rem)] w-full cursor-pointer overflow-hidden rounded-3xl bg-stone-950 shadow-2xl ring-2 ring-amber-500/40 select-none sm:aspect-[16/9] kisa:aspect-auto"
      >
        <img
          src="/assets/mekanlar/ev_ici.webp"
          alt="Ev İçi Oda Sahnesi"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover select-none"
        />

        {/* Pencere Gün Işığı Hüzmesi */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 28% 24%, rgba(254,243,199,0.22) 0%, rgba(251,191,36,0.08) 38%, transparent 70%)",
          }}
        />

        {/* OYUN EKRANI İÇİ ÜST DURUM & ÇAĞRI BARI */}
        {kendiEvimMi && !mektupAcik && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute inset-x-3 top-3 z-30 mx-auto max-w-2xl rounded-2xl p-3 shadow-2xl ring-2 backdrop-blur-md transition sm:p-3.5 ${
              !mektupAlindiMi
                ? "bg-stone-950/90 text-amber-50 ring-amber-400"
                : !cagrildiOnay
                ? "bg-sky-950/90 text-sky-100 ring-sky-400"
                : "bg-emerald-950/90 text-emerald-100 ring-emerald-400/80"
            }`}
          >
            {!mektupAlindiMi ? (
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <div className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-stone-950">
                    📬 Haberci Hatırlatması
                  </div>
                  <h4 className="text-xs font-black text-amber-200 sm:text-sm">
                    Haberci&apos;nin Mektubunu Henüz Teslim Almadın!
                  </h4>
                  <p className="text-[11px] leading-snug text-amber-100/90">
                    Mektubu burada okuyabilmek için önce köy kapısındaki Haberci&apos;den zarfı teslim almalısın.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  {onSecimDegistir && (
                    <button
                      type="button"
                      onClick={() => onSecimDegistir({ tur: "nokta", id: "haberci" })}
                      className="rounded-xl varak-dugme px-3 py-2 text-xs font-black text-stone-950 shadow-lg hover:brightness-110"
                    >
                      📜 Haberci&apos;ye Git →
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={oyun.bekliyor}
                    onClick={() => oyun.mektupAl()}
                    className="rounded-xl bg-stone-900 px-3 py-2 text-xs font-bold text-amber-200 ring-1 ring-amber-400/40 hover:bg-stone-800"
                  >
                    📬 Kapıdan Al
                  </button>
                </div>
              </div>
            ) : !cagriBasladi ? (
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <div className="inline-flex items-center gap-1 rounded-full bg-sky-400 px-2 py-0.5 text-[10px] font-black text-stone-950">
                    ✉️ Mektup Rahlede Hazır!
                  </div>
                  <h4 className="text-xs font-black text-sky-100 sm:text-sm">
                    Ailenle Bir Araya Gel
                  </h4>
                  <p className="text-[11px] leading-snug text-sky-100/85">
                    Haberci&apos;den aldığın mektubu birlikte okumak için önce ailenin ya da büyüklerinin yanına git; hep beraber oturun.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCagriBasladi(true)}
                  className="shrink-0 animate-bounce rounded-xl varak-dugme px-4 py-2.5 text-xs font-black text-stone-950 shadow-xl ring-2 ring-amber-200 hover:brightness-110"
                >
                  🤝 Ailemin Yanına Gidiyorum
                </button>
              </div>
            ) : !cagrildiOnay ? (
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <div className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-stone-950">
                    🏠 Okumaya Hazırlık
                  </div>
                  <h4 className="text-xs font-black text-amber-100 sm:text-sm">
                    Ailenle Bir Aradaysanız Mektubu Açalım!
                  </h4>
                  <p className="text-[11px] leading-snug text-amber-100/90">
                    Hazır olduğunda <b>&ldquo;✅ Ailemle Birlikteyim&rdquo;</b> butonuna basarak mektubu oyun ekranında açabilirsin.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCagrildiOnay(true);
                    setMektupAcik(true);
                  }}
                  className="shrink-0 animate-bounce rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 py-2.5 text-xs font-black text-stone-950 shadow-xl ring-2 ring-emerald-200 hover:brightness-110 sm:text-sm"
                >
                  ✅ Ailemle Birlikteyim (Mektubu Aç)
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <div className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-black text-stone-950">
                    📖 Aile Mektubu Hazır
                  </div>
                  <h4 className="text-xs font-black text-emerald-100 sm:text-sm">
                    {bugunOkundu ? "Bugünün Mektubu Okundu!" : "Rahlenin Üzerindeki Mektubu Açıp Oku"}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setMektupAcik(true)}
                  className="shrink-0 rounded-xl varak-dugme px-4 py-2 text-xs font-black text-stone-950 shadow-xl ring-2 ring-amber-200 hover:brightness-110"
                >
                  📖 Mektubu Aç ve Oku
                </button>
              </div>
            )}
          </div>
        )}

        {/* Orta Rahle ve Mektup Objesi */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!mektupAlindiMi) {
              oyun.setMesaj({
                tur: "hata",
                metin: "Önce Haberci'den okuma mektubunu teslim almalısın!",
              });
              return;
            }
            if (!cagriBasladi) {
              setCagriBasladi(true);
              return;
            }
            if (!cagrildiOnay) {
              setCagrildiOnay(true);
            }
            setMektupAcik(true);
          }}
          style={{ left: "49%", top: "63%" }}
          className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 transition hover:scale-110"
        >
          <div
            className={`flex flex-col items-center rounded-2xl px-3 py-1.5 shadow-xl ring-2 ${
              !mektupAlindiMi
                ? "bg-stone-900/90 text-stone-300 ring-stone-600"
                : !cagrildiOnay
                ? "animate-pulse bg-amber-500 text-stone-950 ring-amber-200"
                : "bg-emerald-500 text-stone-950 ring-emerald-200"
            }`}
          >
            <span className="text-xl sm:text-2xl">
              {!mektupAlindiMi ? "📭" : bugunOkundu ? "📖" : "✉️"}
            </span>
            <span className="text-[10px] font-black whitespace-nowrap sm:text-xs">
              {!mektupAlindiMi
                ? "Mektup Yok (Haberci'de)"
                : !cagriBasladi
                ? "Ailemin Yanına Git"
                : !cagrildiOnay
                ? "✅ Ailemle Birlikteyim"
                : "Mektubu Oku"}
            </span>
          </div>
        </button>

        {/* Aile Oyunları: karakter sedire yürür, ardından sayfa aşağıdaki oyunlara kayar */}
        {kendiEvimMi && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOyuncuKonum({ x: 30, y: 60 });
              window.setTimeout(() => {
                document.getElementById("aile-oyunlari")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 650);
            }}
            style={{ left: "27%", top: "41%" }}
            className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 transition hover:scale-110"
          >
            <div className="flex flex-col items-center rounded-2xl bg-stone-900/90 px-3 py-1.5 text-amber-100 shadow-xl ring-2 ring-amber-400/80">
              <span className="text-2xl sm:text-3xl" aria-hidden="true">🏮</span>
              <span className="text-[10px] font-black whitespace-nowrap sm:text-xs">Aile Oyunları</span>
            </div>
          </button>
        )}

        {/* Ders Çalışma Köşesi: karakter evin sağındaki çalışma masasına yürür, sayfa en alttaki köşeye kayar */}
        {kendiEvimMi && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOyuncuKonum({ x: 72, y: 60 });
              window.setTimeout(() => {
                document.getElementById("ders-calisma")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 650);
            }}
            style={{ left: "76%", top: "41%" }}
            className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 transition hover:scale-110"
          >
            <div className="flex flex-col items-center rounded-2xl bg-stone-900/90 px-3 py-1.5 text-amber-100 shadow-xl ring-2 ring-sky-400/80">
              <span className="text-2xl sm:text-3xl" aria-hidden="true">📚</span>
              <span className="text-[10px] font-black whitespace-nowrap sm:text-xs">Ders Köşem</span>
            </div>
          </button>
        )}

        {/* Oda İçinde Yürüyen Karakter ve İsim Etiketi */}
        <div
          style={{ left: `${oyuncuKonum.x}%`, top: `${oyuncuKonum.y}%` }}
          className="pointer-events-none absolute z-30 flex -translate-x-1/2 -translate-y-[82%] flex-col items-center transition-all duration-500 ease-out"
        >
          <img
            src={karakter?.gorsel ?? "/assets/karakterler/ahmet.webp"}
            alt={karakter?.ad ?? "Genç Yönetici"}
            draggable={false}
            className="h-24 w-auto object-contain drop-shadow-[0_10px_12px_rgba(0,0,0,0.6)] sm:h-28"
          />
          <span className="-mt-1 rounded-full bg-emerald-400 px-2.5 py-0.5 text-[10px] font-black text-stone-950 shadow ring-1 ring-stone-950/30 whitespace-nowrap">
            {oyun.kullanici?.ad ?? karakter?.ad ?? "Genç Yönetici"}
          </span>
        </div>

        {/* Alt Oda İpucu */}
        <div className="pointer-events-none absolute inset-x-3 bottom-2.5 flex items-center justify-between text-[11px] font-bold text-amber-100/90">
          <span className="rounded-xl bg-stone-950/80 px-3 py-1 ring-1 ring-stone-700">
            👣 Halının üzerine tıklayarak odada yürüyebilirsin
          </span>
          <span className="rounded-xl bg-stone-950/80 px-3 py-1 ring-1 ring-stone-700">
            🏠 Hane Kapasitesi: +{kat * 5} 👥 İnsan
          </span>
        </div>

        {/* OYUN EKRANI İÇİNDE AÇILAN MEKTUP POP-UP PENCERESİ */}
        {mektupAcik && mektupAlindiMi && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 z-40 flex items-center justify-center bg-stone-950/80 p-3 backdrop-blur-xs sm:p-5"
          >
            <div className="relative max-h-full w-full max-w-2xl overflow-y-auto rounded-3xl bg-stone-900/98 p-4 shadow-2xl ring-2 ring-amber-400 sm:p-6">
              <div className="mb-3 flex items-center justify-between border-b border-stone-800 pb-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-300 sm:text-sm">
                  ✉️ Haberci&apos;nin Mektubu · Aile İçi Okuma
                </span>
                <button
                  type="button"
                  onClick={() => setMektupAcik(false)}
                  className="rounded-xl bg-stone-800 px-3 py-1.5 text-xs font-black text-amber-200 ring-1 ring-stone-700 hover:bg-stone-700"
                >
                  ✕ Odaya Dön
                </button>
              </div>
              <AileOkumasiKutusu oyun={oyun} />
            </div>
          </div>
        )}
      </div>

      {/* Ailecek oyunlar yalnızca öğrencinin kendi evinde */}
      {kendiEvimMi && <AileOyunlari />}
      {/* Ders Çalışma Köşesi sayfanın en altında */}
      {kendiEvimMi && <DersCalismaKosesi oyun={oyun} />}
    </div>
  );
}

// =============================================================
// 2. KÖY MEYDANI 3D BİRİNCİ ŞAHIS (KENDİ GÖZÜNDEN) SAHNESİ
// - Three.js 3D Anadolu Köy Meydanı: Taş Şadırvan, Ulu Çınar & Sohbet Sediri,
//   cumbalı köy evleri ve ortada bekleyen günlük misafirler.
// - Birinci şahıs (FPS) kamerası: Mobil sanal joystick ile yürüme, ekranı
//   sürükleyerek 360° etrafa bakma ve dokununca (tap-to-walk) yanlarına gitme.
// - Tüm konuşmalar ve dava/göçmen karar pencereleri 3D oyun ekranı içinde pop-up olarak açılır!
// =============================================================
export function KoyMeydaniSahnesi({ oyun }) {
  const { durum, ayarlar, simdi } = oyun;
  const davalar = koyDavalariListesi(ayarlar);
  const cozulenler = Array.isArray(durum.cozulenDavalar) ? durum.cozulenDavalar : [];
  const siradakiDava = davalar.find((d) => !cozulenler.includes(d.id)) ?? null;
  const gocmen = gocmenDurumu(simdi, 0);

  // Görünüm modu: "meydan" | "cinar_sohbet" | "karar_ekrani"
  const [gorunum, setGorunum] = useState("meydan");

  // Günde 1 Meydan Olayı Kontrolü: Son olaydan bu yana 24 saat geçmediyse meydanda kimse beklemez
  const { hazir: gunlukOlayHazir, kalanSaat } = meydanOlayDurumu(durum, simdi);
  // Köy meydanında ilk görev kesinlikle Dava çözmek olur; ilk dava çözüldükten sonra sırayla köye yerleşmek isteyen yeni insanlar (2+ kişi) gelir!
  const davaGoreviEksik = oyun.gorevler.some((g) => g.tur === "dava" && !g.tamam);
  const ilkDavaZorunlu = (cozulenler.length === 0 || davaGoreviEksik) && Boolean(siradakiDava);
  const varsayilanOlayTuru =
    ilkDavaZorunlu
      ? "dava"
      : !siradakiDava
      ? "gocmen"
      : cozulenler.length % 2 === 1
      ? "gocmen"
      : "dava";

  const [seciliOlayTuru, setSeciliOlayTuru] = useState(null);
  const aktifOlayTuru = ilkDavaZorunlu ? "dava" : seciliOlayTuru ?? varsayilanOlayTuru;

  // Oyuncu meydandaki misafirlerin yanına gitti mi? (Diyalog kutusu açık mı?)
  const [diyalogAcik, setDiyalogAcik] = useState(false);
  const [harfSayisi, setHarfSayisi] = useState(0);
  // Göçmen daveti tam ekran sonucu
  const [gocmenSonuc, setGocmenSonuc] = useState(null);
  // Karar ekranı açıldığı andaki olay türü sabitlenir: dava çözülünce durum değişse bile
  // ekran misafir davetine atlamaz, öğrenci önce kararının sonucunu görür
  const [kararTuru, setKararTuru] = useState(null);
  const kararEkraniniAc = () => {
    setKararTuru(aktifOlayTuru);
    setGorunum("karar_ekrani");
  };
  const ekranOlayTuru = gorunum === "karar_ekrani" && kararTuru ? kararTuru : aktifOlayTuru;

  const diyalogMetni =
    aktifOlayTuru === "dava" && siradakiDava
      ? `${siradakiDava.kisi}: “${siradakiDava.hikaye}”`
      : `Köye Yeni Gelen ${gocmen.aday.ad} (${gocmen.aday.meslek} · +${gocmen.aday.kisiSayisi} 👥 İnsan): “${gocmen.aday.soz} Köyünüzde boş eviniz varsa yerleşmek isteriz!”`;

  useEffect(() => {
    if (!diyalogAcik) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHarfSayisi(0);
  }, [diyalogAcik, diyalogMetni]);

  useEffect(() => {
    if (!diyalogAcik || harfSayisi >= diyalogMetni.length) return;
    const t = setInterval(() => {
      setHarfSayisi((s) => Math.min(diyalogMetni.length, s + 1));
    }, 22);
    return () => clearInterval(t);
  }, [diyalogAcik, harfSayisi, diyalogMetni.length]);

  // KÖY CAMİİ: meydanın kenarındaki camide günün namazları işaretlenir
  if (gorunum === "cami") {
    return (
      <div className="space-y-4">
        <div className="tezhip overflow-hidden rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setGorunum("meydan")}
              className="rounded-xl bg-stone-800 px-3 py-1.5 text-xs font-black text-amber-200 ring-1 ring-amber-400/40 hover:bg-stone-700"
            >
              ← Meydana Dön
            </button>
            <span className="text-xs font-bold text-emerald-300">Köy Meydanı · Köy Camii</span>
          </div>
          <CamiCizimi />
          <p className="mx-auto max-w-xl text-center text-sm leading-relaxed text-amber-100/90">
            Ezan sesi meydana yayılıyor. Bugün kıldığın vakitleri işaretle; her gün en az bir vakit namaz, görevini bir gün
            ilerletir. Hedefimiz beş vakti de kılabilmek!
          </p>
        </div>
        <div className="rounded-3xl bg-stone-950/85 p-4 ring-1 ring-emerald-500/30 sm:p-5">
          <NamazCetelesiKutusu oyun={oyun} />
        </div>
      </div>
    );
  }

  // ÇINAR ALTI SOSYAL MEDYA GÖRÜNÜMÜ
  if (gorunum === "cinar_sohbet") {
    return <SosyalMeydanKutusu oyun={oyun} onGeriDon={() => setGorunum("meydan")} />;
  }

  const kapasite = toplamKonutKapasitesi(durum.binalar);
  const mevcutInsan = durum.envanter?.insan ?? 5;
  const bosYer = Math.max(0, kapasite - mevcutInsan);
  const mutluluk = durum.mutluluk ?? 60;
  const olasilik = Math.min(95, Math.max(15, mutluluk));

  const yaziliyor = diyalogAcik && harfSayisi < diyalogMetni.length;

  const misafirBaslik =
    aktifOlayTuru === "dava" && siradakiDava
      ? "⚖️ “Beyim bir anlaşmazlığımız var, yanımıza gelir misin?”"
      : "🏡 “Selamünaleyküm! Köyünüze yerleşmek isteriz, yanımıza gel!”";

  const misafirAltYazi =
    aktifOlayTuru === "dava" && siradakiDava
      ? siradakiDava.kisi
      : `Yeni İnsanlar: ${gocmen.aday.ad}`;

  return (
    <div className="space-y-4">
      {/* Üst Meydan Durum Çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-stone-950/85 p-4 ring-1 ring-amber-500/30">
        <div>
          <h3 className="text-sm font-black text-amber-100 sm:text-base">
            ⚖️ 3D Köy Meydanı (Kendi Gözünden · Birinci Şahıs)
          </h3>
          <p className="text-xs text-amber-200/80">
            Mobil joystick ile meydanda gez, ekranı sürükleyip etrafa bak veya karakterlere dokunarak yanlarına yürü!
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {gunlukOlayHazir && siradakiDava && !ilkDavaZorunlu && (
            <button
              type="button"
              onClick={() => {
                setSeciliOlayTuru(aktifOlayTuru === "dava" ? "gocmen" : "dava");
                setDiyalogAcik(false);
                setGorunum("meydan");
              }}
              className="rounded-2xl bg-stone-800 px-3 py-2 text-xs font-bold text-amber-200 ring-1 ring-stone-700 hover:bg-stone-700"
            >
              🔄 {aktifOlayTuru === "dava" ? "Yeni İnsan Davetine Bak" : "Köylü Davasına Bak"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setGorunum("cami")}
            className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black text-emerald-50 shadow-lg ring-1 ring-emerald-300/60 hover:bg-emerald-500"
          >
            🕌 Köy Camii (Namaz Çetelesi)
          </button>

        </div>
      </div>

      {/* THREE.JS 3D BİRİNCİ ŞAHIS KÖY MEYDANI (Tüm konuşmalar ve karar ekranları bu 3D ekranın içinde pop-up olarak açılır) */}
      <KoyMeydani3DSahnesi
        gunlukOlayHazir={gunlukOlayHazir}
        aktifOlayTuru={aktifOlayTuru}
        misafirBaslik={misafirBaslik}
        misafirAltYazi={misafirAltYazi}
        kalanSaat={kalanSaat}
        diyalogAcik={diyalogAcik || gorunum === "karar_ekrani"}
        onMisafirEtkilesim={() => setDiyalogAcik(true)}
        onCinarSohbetAc={() =>
          oyun.setMesaj({
            tur: "bilgi",
            metin: `🌳 Çınar Altı sohbeti Birlik Meydanı'nda! Level ${BIRLIK_ACILIS_LEVEL}'te üstteki Birlik Alanı düğmesinden git.`,
          })
        }
        onBilgiMesaji={(metin) => oyun.setMesaj({ tur: "bilgi", metin })}
      >
        {/* 1. 3D EKRAN İÇİ KONUŞMA POP-UP KUTUSU */}
        {diyalogAcik && gunlukOlayHazir && gorunum !== "karar_ekrani" && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto absolute inset-x-2 bottom-2 z-40 mx-auto max-w-2xl rounded-2xl bg-stone-950/92 p-2.5 shadow-2xl ring-1 ring-amber-400/80 backdrop-blur-md sm:bottom-4 sm:p-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-2xl ring-2 ring-amber-400 sm:flex">
                {aktifOlayTuru === "dava" ? "⚖️" : "🏡"}
              </div>

              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-black text-amber-300">
                    {aktifOlayTuru === "dava" && siradakiDava
                      ? `📢 Köylülerin Anlaşmazlığı: ${siradakiDava.baslik}`
                      : `📢 Köye Yerleşmek İsteyen Misafirler: ${gocmen.aday.ad}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDiyalogAcik(false)}
                    aria-label="Konuşmayı kapat"
                    className="shrink-0 rounded-lg bg-stone-800 px-2 py-0.5 text-xs font-bold text-stone-300 hover:bg-stone-700 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div
                  onClick={() => setHarfSayisi(diyalogMetni.length)}
                  className="max-h-[5.4rem] cursor-pointer overflow-y-auto rounded-xl bg-stone-900/95 px-3 py-2 text-[13px] leading-relaxed text-amber-50 ring-1 ring-stone-700 sm:max-h-32 sm:text-sm"
                >
                  {diyalogMetni.slice(0, harfSayisi)}
                  {yaziliyor && (
                    <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-amber-400 align-middle" />
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  {yaziliyor ? (
                    <button
                      type="button"
                      onClick={() => setHarfSayisi(diyalogMetni.length)}
                      className="rounded-xl bg-stone-800 px-3 py-1.5 text-xs font-black text-amber-200 hover:bg-stone-700"
                    >
                      ⏩ Tamamla
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => kararEkraniniAc()}
                      className="varak-dugme varak-isilti rounded-xl px-4 py-2 text-xs sm:text-sm"
                    >
                      {aktifOlayTuru === "dava" ? "⚖️ Karar ver →" : "🏡 Davet kararını ver →"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. 3D EKRAN İÇİ KARAR VERME VE SONUÇ POP-UP PENCERESİ */}
        {gorunum === "karar_ekrani" && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-3 backdrop-blur-xs sm:p-5"
          >
            <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-3xl bg-stone-950/98 p-4 shadow-2xl ring-2 ring-amber-400 sm:p-5">
              <div className="mb-3 flex items-center justify-between border-b border-stone-800 pb-2.5">
                <span className="text-xs font-black text-amber-300 sm:text-sm">
                  {ekranOlayTuru === "dava" ? "⚖️ Köy Meydanı · Adalet ve Hüküm" : "🏡 Köy Meydanı · Misafir Daveti"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setGocmenSonuc(null);
                    setGorunum("meydan");
                  }}
                  className="rounded-xl bg-stone-800 px-3 py-1.5 text-xs font-black text-amber-200 ring-1 ring-amber-400/40 hover:bg-stone-700"
                >
                  ✕ 3D Meydana Dön
                </button>
              </div>

              {ekranOlayTuru === "dava" ? (
                <ObaDavaKutusu
                  oyun={oyun}
                  onTamamKapat={() => {
                    setDiyalogAcik(false);
                    setGorunum("meydan");
                  }}
                />
              ) : gocmenSonuc ? (
                <div
                  className={`space-y-4 rounded-3xl p-5 text-center shadow-2xl ring-2 sm:p-6 ${
                    gocmenSonuc.kabul
                      ? "bg-gradient-to-b from-emerald-950/95 to-stone-950 text-emerald-50 ring-emerald-400"
                      : "bg-gradient-to-b from-amber-950/95 to-stone-950 text-amber-50 ring-amber-400"
                  }`}
                >
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-stone-900/90 text-4xl shadow-xl ring-2 ring-amber-400">
                    {gocmenSonuc.kabul ? "🏡" : "🐪"}
                  </div>
                  <span
                    className={`inline-block rounded-full px-4 py-1 text-xs font-black shadow sm:text-sm ${
                      gocmenSonuc.kabul ? "bg-emerald-400 text-stone-950" : "bg-amber-400 text-stone-950"
                    }`}
                  >
                    {gocmenSonuc.kabul
                      ? `+${gocmenSonuc.kazanilanInsan} 👥 Yeni İnsan Köyümüze Yerleşti!`
                      : "Misafirler Şimdilik Yola Devam Etti"}
                  </span>
                  <h3 className="text-lg font-black text-amber-100 sm:text-xl">
                    {gocmenSonuc.kabul ? `${gocmenSonuc.aday} Köyümüze Hoş Geldi!` : `${gocmenSonuc.aday} Teşekkür Ederek Ayrıldı`}
                  </h3>
                  <div className="mx-auto max-w-xl rounded-2xl bg-stone-900/90 p-4 text-xs leading-relaxed text-amber-50 ring-1 ring-stone-700 sm:text-sm">
                    “{gocmenSonuc.mesaj}”
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setGocmenSonuc(null);
                      setDiyalogAcik(false);
                      setGorunum("meydan");
                    }}
                    className="w-full max-w-md rounded-2xl varak-dugme py-3.5 text-sm font-black text-stone-950 shadow-xl ring-2 ring-amber-200 transition hover:brightness-110"
                  >
                    ✅ Tamam
                  </button>
                </div>
              ) : (
                <div className="space-y-4 rounded-2xl bg-stone-900/90 p-4 ring-1 ring-stone-800">
                  <span className="inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-300 ring-1 ring-emerald-400/40">
                    🏡 Köye Yerleşmek İsteyen Yeni İnsanlar
                  </span>
                  <h3 className="text-lg font-black text-amber-100">
                    {gocmen.aday.ad} ({gocmen.aday.meslek} · +{gocmen.aday.kisiSayisi} 👥 İnsan)
                  </h3>
                  <p className="rounded-2xl bg-stone-950 p-3.5 text-xs leading-relaxed text-amber-50 ring-1 ring-stone-800 sm:text-sm">
                    “{gocmen.aday.soz}”
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-stone-950/90 p-3 text-xs ring-1 ring-stone-800">
                      <span className="font-bold text-amber-300">🏠 Köy Evlerinde Boş Yatak:</span>
                      <div className="mt-1 text-sm font-black text-amber-100">
                        {bosYer} Kişilik Boş Yer ({mevcutInsan}/{kapasite} 👥)
                      </div>
                    </div>
                    <div className="rounded-2xl bg-stone-950/90 p-3 text-xs ring-1 ring-stone-800">
                      <span className="font-bold text-amber-300">😊 Köy Huzuruna Göre Kabul Şansı:</span>
                      <div className="mt-1 text-sm font-black text-emerald-300">%{olasilik}</div>
                    </div>
                  </div>

                  {bosYer <= 0 && (
                    <div className="rounded-2xl bg-red-950/80 p-3 text-xs text-red-100 ring-1 ring-red-400/50">
                      ⚠️ Köydeki evlerde boş yatak kalmadı ({mevcutInsan}/{kapasite})! Yeni insanları davet edebilmek için önce 5+1 Konut Mahallesinde yeni ev inşa etmeli veya kat çıkmalısın.
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={oyun.bekliyor || bosYer <= 0}
                    onClick={async () => {
                      const sonuc = await oyun.gocmenTeklifEt(true);
                      if (sonuc) setGocmenSonuc(sonuc);
                    }}
                    className="w-full rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 py-3.5 text-sm font-black text-stone-950 shadow-xl ring-2 ring-emerald-200 disabled:from-stone-800 disabled:to-stone-800 disabled:text-stone-500"
                  >
                    {bosYer <= 0
                      ? "🔒 Önce Köyde Yeni Ev Kur veya Kat Çık"
                      : `🏡 Köyümüzde Ev Kurmaya Davet Et (+${Math.min(gocmen.aday.kisiSayisi, bosYer)} 👥 İnsan)`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </KoyMeydani3DSahnesi>
    </div>
  );
}

// =============================================================
// 3. ÜRETİM ALANLARI 3D & İNTERAKTİF MİNİ OYUN SAHNELERİ
// - Tarla: 6 Bağımsız Sebze/Meyve Parseli + Birinci Şahıs (FPS) Bakır İbrikle Sulama & Elle Toplama
// - Orman: Keşif Haritası (İşçi Sayısı × 2 Sefer Hakkı) + Kurumuş Ağaç Çıkarsa 3D Baltayla Devirme
// - Taş Ocağı: 6 Bağımsız 3D Kaya Kütlesi + Kazma Darbeleriyle Çatlama & Taş Bloklarına Parçalanma
// - Kalıcı İşçi Kuralı: Bir üretim alanına atanan işçi oradan geri çıkarılamaz.
// =============================================================
export function UretimSahnesi({ id, oyun }) {
  const n = NOKTALAR[id];
  const k = n.kaynak; // "erzak" | "kereste" | "tas"
  const t = KAYNAKLAR[k];
  const { durum } = oyun;
  const acik = kaynakAcikMi(k, durum.level);
  const dBilgi = oyun.dolum(k);

  // Kalıcı işçi görevlendirme hesapları
  const isciler = durum.isciler ?? { erzak: 1, kereste: 1, tas: 0 };
  const buradakiIsci = isciler[k] ?? 0;
  const toplamAtanan = (isciler.erzak ?? 0) + (isciler.kereste ?? 0) + (isciler.tas ?? 0);
  const toplamInsan = durum.envanter.insan ?? 5;
  const bostakiInsan = Math.max(0, toplamInsan - toplamAtanan);
  const gunlukHiz = Math.round(saatlikUretim(k, buradakiIsci) * 24);

  const tarlaDurumGorseli =
    dBilgi.evre === "dolu"
      ? "/assets/binalar/tarla_dolu.webp"
      : dBilgi.evre === "yari"
      ? "/assets/binalar/tarla_yari.webp"
      : "/assets/binalar/tarla_bos.webp";

  if (!acik) {
    return (
      <div className="rounded-3xl bg-stone-950/90 p-6 text-center ring-1 ring-amber-500/30">
        <div className="text-4xl">🔒</div>
        <h3 className="mt-2 text-lg font-black text-amber-100">
          {n.ikon} {n.ad} · Level {t.acilisLevel}&apos;de Açılır
        </h3>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ÜST PANEL: KALICI İŞÇİ GÖREVLENDİRME VE SAHA DURUM ÖZETİ */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Sol Kutu: Kalıcı İşçi Görevlendirme */}
        <div className="flex flex-col justify-between rounded-3xl bg-stone-950/90 p-4 ring-1 ring-amber-500/35">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-amber-300">
                👷 Kalıcı İşçi Görevlendirme
              </span>
              <h3 className="text-base font-black text-amber-100">
                {k === "erzak"
                  ? "🌾 Tarla Çiftçileri"
                  : k === "kereste"
                  ? "🌲 Orman Kâşif & Oduncuları"
                  : "⛏️ Taş Ocağı Ustaları"}
              </h3>
            </div>
            <span className="rounded-xl bg-emerald-500/20 px-2.5 py-1 text-xs font-black text-emerald-300 ring-1 ring-emerald-500/40">
              {k === "kereste"
                ? `Günlük ${buradakiIsci * 2} Keşif Seferi`
                : `Her dolumda +${dBilgi.kapasite ?? gunlukHiz} ${t.ikon}`}
            </span>
          </div>

          <p className="my-2 text-xs leading-relaxed text-amber-200/80">
            {buradakiIsci === 0
              ? "⚠️ Burada hiç görevli işçi yok! Üretimi ve saha hazırlığını başlatmak için en az 1 kalıcı işçi görevlendir."
              : k === "kereste"
              ? `🔒 Görevlendirilen işçi buradan geri çıkarılamaz. Ormandaki her işçi sana günlük 2 keşif seferi hakkı (${buradakiIsci} × 2 = ${buradakiIsci * 2} hak) kazandırır!`
              : "🔒 Görevlendirilen işçi buradan geri çıkarılamaz (başka alana kaydırılamaz). Her yeni işçi, bir sonraki ekimden itibaren parsel ve kaya başına %25 daha fazla ürün getirir. (Hazır bekleyen ürün eski verimle toplanır.)"}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-stone-900 p-2.5 ring-1 ring-stone-800">
            <div className="text-xs">
              <div className="font-black text-amber-100">Kalıcı Görevli İşçi: {buradakiIsci} 👥</div>
              <div className="text-[11px] text-amber-300/80">Köyde Boştaki İnsan: {bostakiInsan} 👥</div>
            </div>

            <div className="flex items-center gap-2">
              <span
                title="Görevlendirilen işçi kalıcıdır, geri çıkarılamaz"
                className="rounded-xl bg-stone-800 px-2.5 py-1.5 text-xs font-black tabular-nums text-amber-200 ring-1 ring-stone-700"
              >
                🔒 {buradakiIsci} Kalıcı İşçi
              </span>
              <button
                type="button"
                disabled={oyun.bekliyor || bostakiInsan <= 0}
                onClick={() => oyun.isciAta(k, 1)}
                className="varak-dugme rounded-xl px-3.5 py-2 text-xs"
              >
                + Kalıcı İşçi Ata
              </button>
            </div>
          </div>
        </div>

        {/* Sağ Kutu: Bağımsız Saha Durumu Özeti */}
        <div className="flex flex-col justify-between rounded-3xl bg-stone-950/90 p-4 ring-1 ring-amber-500/35">
          <div className="flex items-center gap-3">
            {id === "tarla" && (
              <img
                src={tarlaDurumGorseli}
                alt="Tarla Görseli"
                className="h-16 w-24 shrink-0 rounded-2xl object-cover ring-2 ring-amber-400/60"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-amber-300">
                  {id === "tarla"
                    ? "🌱 3 Bağımsız Sebze/Meyve Parseli"
                    : id === "orman"
                    ? "🧭 Günlük Orman Keşif Seferleri"
                    : madenOyunModu(oyun.durum, oyun.simdi) === "yakalama"
                    ? "🪝 Bugün Taş Avı Günü"
                    : "⛏️ Bugün Kaya Kırma Günü"}
                </span>
                <span className="tabular-nums text-sm font-black text-emerald-300">
                  {id === "tarla"
                    ? `${dBilgi.hazirAdet ?? 0}/${dBilgi.toplamAdet ?? 3} Parsel Hazır`
                    : id === "orman"
                    ? `${dBilgi.hazirAdet ?? 0}/${dBilgi.toplamAdet ?? 0} Sefer Hakkı`
                    : `${dBilgi.hazirAdet ?? 0}/${dBilgi.toplamAdet ?? 3} Kaya Hazır`}
                </span>
              </div>

              <div className="mt-2 h-3 overflow-hidden rounded-full bg-stone-900 ring-1 ring-stone-800">
                <div
                  className={`h-full transition-all ${
                    dBilgi.dolumOrani >= 100
                      ? "bg-emerald-400"
                      : (dBilgi.hazirAdet ?? 0) > 0
                      ? "bg-amber-400"
                      : "bg-sky-500"
                  }`}
                  style={{ width: `${Math.max(4, dBilgi.dolumOrani ?? 0)}%` }}
                />
              </div>

              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                <p className="flex-1 text-xs leading-relaxed text-amber-200/80">
                  {id === "tarla"
                    ? "Her parsel bağımsız çalışır! Tek tek 3D sahnede sulayıp toplayabilir veya hazır parsellerin hepsini tek tıkla hasat edebilirsin."
                    : id === "orman"
                    ? "Haritadan keşfedilmemiş bir bölgeye tıkla: şansına kurumuş ağaç çıkarsa 3D baltayla devirip odun kazanırsın!"
                    : madenOyunModu(oyun.durum, oyun.simdi) === "yakalama"
                    ? "Taş Ocağı'nda oyun her gün değişir: dün kaya kırdın, bugün kancayla taş avlıyorsun! Büyük taş daha çok taş kazandırır ama yavaş çekilir. Yarın yine kazma günü."
                    : "Taş Ocağı'nda oyun her gün değişir: bugün 3D kayalara tıklayıp kazmayla parçala ya da hazır kayaları tek tıkla topla. Yarın kancayla Taş Avı günü!"}
                </p>

                {id !== "orman" &&
                  (dBilgi.hazirAdet ?? 0) > 0 &&
                  !(id === "maden" && madenOyunModu(oyun.durum, oyun.simdi) === "yakalama") && (
                  <button
                    type="button"
                    disabled={oyun.bekliyor}
                    onClick={() => oyun.sahaHepsiniTopla(k)}
                    className="shrink-0 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-black text-stone-950 shadow ring-1 ring-emerald-200 hover:bg-emerald-400 disabled:opacity-40"
                  >
                    {t.ikon} Hepsini Topla (+{dBilgi.biriken ?? 0})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* THREE.JS 3D ÜRETİM MİNİ OYUN SAHNESİ */}
      {/* Telefonda oyunun kendisi en üstte; işçi ve saha bilgisi altında kalır */}
      <div className="order-first [@media(min-width:768px)_and_(min-height:521px)]:order-none">
        {id === "tarla" && <TarlaFPS3DSahnesi oyun={oyun} />}
        {id === "orman" && <OrmanKesifVeKesimSahnesi oyun={oyun} />}
        {id === "maden" &&
          (madenOyunModu(oyun.durum, oyun.simdi) === "yakalama" ? (
            <TasAviOyunu oyun={oyun} />
          ) : (
            <TasOcagi3DSahnesi oyun={oyun} />
          ))}
      </div>
    </div>
  );
}


/** Köy Camii: kubbe, iki minare ve akşam göğü (sade SVG çizim) */
function CamiCizimi() {
  return (
    <svg viewBox="0 0 400 190" className="mx-auto my-3 h-40 w-full max-w-lg sm:h-48" role="img" aria-label="Köy Camii">
      <defs>
        <linearGradient id="camiGok" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#7c4a2a" />
        </linearGradient>
        <linearGradient id="camiKubbe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="400" height="190" rx="18" fill="url(#camiGok)" />
      <circle cx="330" cy="38" r="14" fill="#fde68a" opacity="0.9" />
      <circle cx="336" cy="34" r="12" fill="#1e1b4b" />
      {[[40, 30], [90, 18], [150, 40], [250, 22], [370, 70]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="#fef3c7" />
      ))}
      {/* Minareler */}
      {[92, 308].map((x) => (
        <g key={x}>
          <rect x={x - 6} y="52" width="12" height="118" fill="#e7e5e4" />
          <rect x={x - 9} y="88" width="18" height="5" fill="#d6d3d1" />
          <polygon points={`${x - 7},52 ${x + 7},52 ${x},22`} fill="url(#camiKubbe)" />
          <line x1={x} y1="22" x2={x} y2="14" stroke="#fbbf24" strokeWidth="2" />
        </g>
      ))}
      {/* Ana gövde ve kubbe */}
      <path d="M140 118 Q200 40 260 118 Z" fill="url(#camiKubbe)" />
      <line x1="200" y1="62" x2="200" y2="50" stroke="#fbbf24" strokeWidth="2.5" />
      <circle cx="200" cy="47" r="3" fill="#fbbf24" />
      <path d="M112 118 Q130 96 148 118 Z M252 118 Q270 96 288 118 Z" fill="#14b8a6" />
      <rect x="110" y="118" width="180" height="52" fill="#f5f5f4" />
      <rect x="110" y="118" width="180" height="6" fill="#d6d3d1" />
      {[132, 160, 240, 268].map((x) => (
        <path key={x} d={`M${x - 7} 160 V140 Q${x} 130 ${x + 7} 140 V160 Z`} fill="#fbbf24" opacity="0.85" />
      ))}
      <path d="M186 170 V142 Q200 126 214 142 V170 Z" fill="#78350f" />
      <rect x="0" y="168" width="400" height="22" fill="#57534e" />
    </svg>
  );
}
