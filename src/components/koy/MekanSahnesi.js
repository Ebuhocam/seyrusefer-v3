"use client";
import { useEffect, useState } from "react";
import { BINALAR, DEPO_SAAT, KAYNAKLAR, NOKTALAR, toplamKonutKapasitesi } from "@/lib/oyun/sabitler";
import { depoKapasitesi, kaynakAcikMi, saatlikUretim } from "@/lib/oyun/kurallar";
import { koyDavalariListesi } from "@/lib/oyun/hikayeler";
import { AileOkumasiKutusu, ObaDavaKutusu, SosyalMeydanKutusu } from "./GorevlerEkrani";

// =============================================================
// 1. EV İÇİ 2D ODA SAHNESİ (Haberci Mektup Kontrolü + Aile Çağırma)
// =============================================================
const AILE_BIREYLERI = [
  {
    id: "baba",
    ad: "Baba",
    ikon: "🧔",
    kapiX: 15,
    kapiY: 56,
    minderX: 41,
    minderY: 57,
    soz: "Bismillah, Haberci'nin getirdiği mektubu birlikte okuyalım.",
  },
  {
    id: "anne",
    ad: "Anne",
    ikon: "🧕",
    kapiX: 14,
    kapiY: 61,
    minderX: 58,
    minderY: 58,
    soz: "Hoş geldin evladım, soframız ve gönlümüz şenlendi.",
  },
  {
    id: "kardes",
    ad: "Kardeş",
    ikon: "🧒",
    kapiX: 16,
    kapiY: 65,
    minderX: 57,
    minderY: 73,
    soz: "Ağabey! Haberci'nin mektubunda ne yazıyor çok merak ediyorum!",
  },
];

export function EvIciSahnesi({ binaId, oyun, onSecimDegistir, onYukseltmeAc }) {
  const { durum } = oyun;
  const kat = durum.binalar[binaId] ?? 1;
  const kendiEvimMi = binaId === "kendi_evim";

  const aileGorevi = oyun.gorevler.find((g) => g.tur === "aile" || g.kod === "aile");
  const mektupAlindiMi = (durum.mektupAlindi ?? 0) >= durum.level || Boolean(aileGorevi?.tamam);

  // Oyuncunun oda içindeki konumu (yürüyüş)
  const [oyuncuKonum, setOyuncuKonum] = useState({ x: 32, y: 72, yon: 1 });
  // Aile bireyleri çağrıldı mı?
  const [aileCagrildi, setAileCagrildi] = useState(Boolean(aileGorevi?.tamam));
  const [aileYerinde, setAileYerinde] = useState(Boolean(aileGorevi?.tamam));
  const [mektupModalAcik, setMektupModalAcik] = useState(false);

  useEffect(() => {
    if (!aileCagrildi || aileYerinde) return;
    const t = setTimeout(() => {
      setAileYerinde(true);
    }, 650);
    return () => clearTimeout(t);
  }, [aileCagrildi, aileYerinde]);

  const aileyiOdayaCagir = () => {
    setAileCagrildi(true);
    setOyuncuKonum({ x: 42, y: 72, yon: 1 });
  };

  const zemineTikla = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(82, Math.max(18, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(86, Math.max(52, ((e.clientY - rect.top) / rect.height) * 100));
    setOyuncuKonum((eski) => ({
      x: Math.round(x),
      y: Math.round(y),
      yon: x >= eski.x ? 1 : -1,
    }));
  };

  return (
    <div className="space-y-4">
      {/* Üst Bilgi ve Durum Çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-stone-950/85 p-4 ring-1 ring-amber-500/30">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500/20 text-2xl ring-1 ring-amber-400/40">
            🏡
          </span>
          <div>
            <h3 className="text-sm font-black text-amber-100 sm:text-base">
              {BINALAR[binaId]?.ad ?? "Ev"} · 2D Oda İçi Sahnesi ({kat}. Kat · 👥 {kat * 5} Kişilik Hane)
            </h3>
            <p className="text-xs text-amber-200/80">
              Oda içinde istediğin yere tıklayarak yürüyebilir, Haberci&apos;den aldığın mektubu ailenle birlikte rahlede okuyabilirsin.
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

      {/* Haberci Mektup Hatırlatma veya Aile Çağırma Rehber Kutusu */}
      {kendiEvimMi && (
        <div
          className={`rounded-3xl p-4 ring-2 transition ${
            !mektupAlindiMi
              ? "bg-amber-500/20 text-amber-50 ring-amber-400"
              : !aileCagrildi
              ? "bg-sky-950/80 text-sky-100 ring-sky-400"
              : "bg-emerald-950/80 text-emerald-100 ring-emerald-400/60"
          }`}
        >
          {!mektupAlindiMi ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-2.5 py-0.5 text-[11px] font-black text-stone-950">
                  📬 Haberci Hatırlatması
                </div>
                <h4 className="text-sm font-black text-amber-200 sm:text-base">
                  Haberci&apos;nin Mektubunu Henüz Teslim Almadın!
                </h4>
                <p className="text-xs leading-relaxed text-amber-100/90">
                  Köy kapısında bekleyen <b>Haberci</b> bu level için ailene yeni bir mektup getirdi. Evde aile bireylerini toplamadan önce Haberci&apos;ye uğrayıp mektubu teslim almalısın.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {onSecimDegistir && (
                  <button
                    type="button"
                    onClick={() => onSecimDegistir({ tur: "nokta", id: "haberci" })}
                    className="rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 px-4 py-2.5 text-xs font-black text-stone-950 shadow-lg hover:brightness-110"
                  >
                    🏇 Haberci&apos;ye Git ve Mektubu Al →
                  </button>
                )}
                <button
                  type="button"
                  disabled={oyun.bekliyor}
                  onClick={() => oyun.mektupAl()}
                  className="rounded-2xl bg-stone-900/90 px-3.5 py-2.5 text-xs font-bold text-amber-200 ring-1 ring-amber-400/40 hover:bg-stone-800"
                >
                  📬 Kapıdan Mektubu Teslim Al
                </button>
              </div>
            </div>
          ) : !aileCagrildi ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-400 px-2.5 py-0.5 text-[11px] font-black text-stone-950">
                  ✉️ Mektup Rahlede Hazır!
                </div>
                <h4 className="text-sm font-black text-sky-100 sm:text-base">
                  Şimdi Aile Bireylerini Odaya Çağır!
                </h4>
                <p className="text-xs leading-relaxed text-sky-100/85">
                  Haberci&apos;den aldığın mektubu orta rahleye koydun. Okumaya başlamak için anne, baba ve kardeşini minderlere davet et!
                </p>
              </div>
              <button
                type="button"
                onClick={aileyiOdayaCagir}
                className="shrink-0 animate-bounce rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 px-5 py-3 text-xs font-black text-stone-950 shadow-xl ring-2 ring-amber-200 hover:brightness-110 sm:text-sm"
              >
                👨‍👩‍👧‍👦 Aile Bireylerini Odaya Çağır
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400 px-2.5 py-0.5 text-[11px] font-black text-stone-950">
                  👨‍👩‍👧‍👦 Aile Meclisi Toplandı
                </div>
                <h4 className="text-sm font-black text-emerald-100 sm:text-base">
                  {aileGorevi?.tamam
                    ? "Bu Levelin Aile Okuması Tamamlandı!"
                    : "Ailen Rahlenin Etrafında Seni Bekliyor!"}
                </h4>
                <p className="text-xs leading-relaxed text-emerald-100/85">
                  Ortadaki rahlenin üzerindeki <b>✉️ Aile Mektubu</b>&apos;na veya aşağıdaki butona tıklayarak mektubu ailenle birlikte oku.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMektupModalAcik(true)}
                className="shrink-0 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 px-5 py-3 text-xs font-black text-stone-950 shadow-xl ring-2 ring-amber-200 hover:brightness-110 sm:text-sm"
              >
                📖 {aileGorevi?.tamam ? "Mektubu Tekrar Gör" : "Mektubu Aç ve Birlikte Oku"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2D İNTERAKTİF EV İÇİ SAHNESİ */}
      <div
        onClick={zemineTikla}
        className="relative aspect-[16/9] w-full cursor-pointer overflow-hidden rounded-3xl bg-stone-950 shadow-2xl ring-2 ring-amber-500/40 select-none"
      >
        <img
          src="/assets/mekanlar/ev_ici.webp"
          alt="Ev İçi Oda Sahnesi"
          draggable={false}
          className="h-full w-full object-cover"
        />

        {/* Sol Ahşap Kapı Etiketi */}
        <div
          style={{ left: "15%", top: "48%" }}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
        >
          <span className="rounded-full bg-stone-950/80 px-2.5 py-1 text-[10px] font-bold text-amber-200 ring-1 ring-amber-400/40">
            🚪 Oda Kapısı
          </span>
        </div>

        {/* Orta Rahle ve Mektup Objesi */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!mektupAlindiMi) {
              oyun.setMesaj({
                tur: "hata",
                metin: "Önce Haberci'den Aile Mektubunu teslim almalısın!",
              });
              return;
            }
            if (!aileCagrildi) {
              aileyiOdayaCagir();
              return;
            }
            setMektupModalAcik(true);
          }}
          style={{ left: "49%", top: "63%" }}
          className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 transition hover:scale-110"
        >
          <div
            className={`flex flex-col items-center rounded-2xl px-3 py-1.5 shadow-xl ring-2 ${
              !mektupAlindiMi
                ? "bg-stone-900/90 text-stone-300 ring-stone-600"
                : !aileCagrildi
                ? "animate-pulse bg-amber-500 text-stone-950 ring-amber-200"
                : "animate-bounce bg-emerald-500 text-stone-950 ring-emerald-200"
            }`}
          >
            <span className="text-xl sm:text-2xl">
              {!mektupAlindiMi ? "📭" : aileGorevi?.tamam ? "📖" : "✉️"}
            </span>
            <span className="text-[10px] font-black whitespace-nowrap sm:text-xs">
              {!mektupAlindiMi
                ? "Mektup Yok (Haberci'de)"
                : !aileCagrildi
                ? "Önce Aileni Çağır"
                : aileGorevi?.tamam
                ? "Aile Mektubu (Okundu)"
                : "Aile Mektubunu Oku!"}
            </span>
          </div>
        </button>

        {/* Aile Bireyleri (Kapıdan Minderlere Yürüyen Karakterler) */}
        {aileCagrildi &&
          AILE_BIREYLERI.map((birey) => {
            const x = aileYerinde ? birey.minderX : birey.kapiX;
            const y = aileYerinde ? birey.minderY : birey.kapiY;
            return (
              <div
                key={birey.id}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-out"
              >
                <div className="flex flex-col items-center">
                  {aileYerinde && (
                    <div className="mb-1 max-w-[150px] rounded-xl bg-stone-950/90 px-2 py-1 text-center text-[9px] font-semibold text-amber-100 shadow ring-1 ring-amber-400/40 sm:text-[10px]">
                      “{birey.soz}”
                    </div>
                  )}
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-amber-950/90 text-2xl shadow-lg ring-2 ring-amber-400 sm:h-13 sm:w-13 sm:text-3xl">
                    {birey.ikon}
                  </div>
                  <span className="mt-0.5 rounded-full bg-stone-950/90 px-2 py-0.5 text-[10px] font-black text-amber-300 ring-1 ring-amber-500/40">
                    {birey.ad}
                  </span>
                </div>
              </div>
            );
          })}

        {/* Oyuncu Karakteri (Oda İçinde Yürüyebilen) */}
        <div
          style={{ left: `${oyuncuKonum.x}%`, top: `${oyuncuKonum.y}%` }}
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
        >
          <div className="flex flex-col items-center">
            <div
              style={{ transform: `scaleX(${oyuncuKonum.yon})` }}
              className="grid h-12 w-12 place-items-center rounded-full bg-emerald-900/95 text-2xl shadow-xl ring-2 ring-emerald-300 sm:h-14 sm:w-14 sm:text-3xl"
            >
              🧑
            </div>
            <span className="mt-0.5 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-black text-stone-950 shadow">
              Sen ({oyun.kullanici?.ad ?? "Genç Bey"})
            </span>
          </div>
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
      </div>

      {/* Aile Mektubu Okuma Modalı */}
      {mektupModalAcik && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl space-y-4 rounded-3xl bg-stone-900 p-5 ring-2 ring-amber-400 sm:p-6">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👨‍👩‍👧‍👦</span>
                <div>
                  <h3 className="text-base font-black text-amber-100">Aile Meclisi Okuması</h3>
                  <p className="text-xs text-amber-300/80">
                    Baba, Anne ve Kardeşinle birlikte Haberci&apos;nin mektubunu okuyorsunuz
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMektupModalAcik(false)}
                className="rounded-xl bg-stone-800 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-stone-700"
              >
                ✕ Kapat
              </button>
            </div>

            <AileOkumasiKutusu oyun={oyun} />
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================
// 2. KÖY MEYDANI 2D SAHNESİ VE YÜRÜYÜŞ MOTORU
// =============================================================
const MEYDAN_SAKINLERI = [
  {
    id: "ahmet",
    ad: "Ahmet Ağa",
    ikon: "👳‍♂️",
    minX: 24,
    maxX: 46,
    y: 74,
    hiz: 0.35,
    soz: "Meydan çeşmesinin suyu buz gibi maşallah!",
  },
  {
    id: "ayse",
    ad: "Ayşe Nine",
    ikon: "👵",
    minX: 56,
    maxX: 78,
    y: 77,
    hiz: 0.28,
    soz: "Çınar gölgesinde komşularla sohbet ne güzel.",
  },
  {
    id: "yusuf",
    ad: "Çırak Yusuf",
    ikon: "👦",
    minX: 30,
    maxX: 72,
    y: 83,
    hiz: 0.52,
    soz: "Mektep dersime yetişiyorum!",
  },
];

export function KoyMeydaniSahnesi({ oyun }) {
  const { durum, ayarlar } = oyun;
  const davalar = koyDavalariListesi(ayarlar);
  const cozulenler = Array.isArray(durum.cozulenDavalar) ? durum.cozulenDavalar : [];
  const siradakiDava = davalar.find((d) => !cozulenler.includes(d.id)) ?? null;

  // Oyuncunun meydandaki konumu
  const [oyuncu, setOyuncu] = useState({ x: 35, y: 78, yon: 1 });
  // Yürüyen köylülerin anlık konumları (2D Yürüyüş Motoru)
  const [sakinler, setSakinler] = useState(() =>
    MEYDAN_SAKINLERI.map((s, i) => ({
      ...s,
      x: s.minX + (i * 7) % (s.maxX - s.minX),
      yon: i % 2 === 0 ? 1 : -1,
      adim: 0,
    }))
  );
  // Davacı köylülerin ileri geri yürüyüşü
  const [davaciX, setDavaciX] = useState({ x: 50, yon: 1 });
  // Açık pencere: null | "dava" | "sohbet"
  const [acikPencere, setAcikPencere] = useState(null);

  useEffect(() => {
    const t = setInterval(() => {
      setSakinler((onceki) =>
        onceki.map((s) => {
          let yeniX = s.x + s.hiz * s.yon;
          let yeniYon = s.yon;
          if (yeniX >= s.maxX) {
            yeniX = s.maxX;
            yeniYon = -1;
          } else if (yeniX <= s.minX) {
            yeniX = s.minX;
            yeniYon = 1;
          }
          return { ...s, x: yeniX, yon: yeniYon, adim: (s.adim + 1) % 20 };
        })
      );

      setDavaciX((d) => {
        let nx = d.x + 0.25 * d.yon;
        let ny = d.yon;
        if (nx >= 55) {
          nx = 55;
          ny = -1;
        } else if (nx <= 45) {
          nx = 45;
          ny = 1;
        }
        return { x: nx, yon: ny };
      });
    }, 60);
    return () => clearInterval(t);
  }, []);

  const meydanaTikla = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(84, Math.max(16, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(88, Math.max(58, ((e.clientY - rect.top) / rect.height) * 100));
    setOyuncu((eski) => ({
      x: Math.round(x),
      y: Math.round(y),
      yon: x >= eski.x ? 1 : -1,
    }));
  };

  const davacilaraYuruVeAc = (e) => {
    if (e) e.stopPropagation();
    setOyuncu({ x: Math.round(davaciX.x - 6), y: 69, yon: 1 });
    setTimeout(() => setAcikPencere("dava"), 350);
  };

  return (
    <div className="space-y-4">
      {/* Üst Meydan Durum Çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-stone-950/85 p-4 ring-1 ring-amber-500/30">
        <div>
          <h3 className="text-sm font-black text-amber-100 sm:text-base">
            ⚖️ 2D Canlı Köy Meydanı · Halk Divanı & Meydan Sohbeti
          </h3>
          <p className="text-xs text-amber-200/80">
            Taş zemine tıklayarak meydanda yürü! Meydanda ileri geri yürüyen davacı köylülere tıklayarak dertlerini dinle ve hüküm ver.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => davacilaraYuruVeAc()}
            className="rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 px-3.5 py-2 text-xs font-black text-stone-950 shadow hover:brightness-110"
          >
            ⚖️ {siradakiDava ? `Davayı Dinle (${siradakiDava.kisi})` : `Çözülen Davalar (${cozulenler.length}/${davalar.length})`}
          </button>
          <button
            type="button"
            onClick={() => setAcikPencere("sohbet")}
            className="rounded-2xl bg-stone-800 px-3.5 py-2 text-xs font-black text-amber-200 ring-1 ring-amber-400/40 hover:bg-stone-700"
          >
            🗣️ Meydan Sohbet Panosu
          </button>
        </div>
      </div>

      {/* 2D KÖY MEYDANI YÜRÜYÜŞ SAHNESİ */}
      <div
        onClick={meydanaTikla}
        className="relative aspect-[16/9] w-full cursor-pointer overflow-hidden rounded-3xl bg-stone-950 shadow-2xl ring-2 ring-amber-500/40 select-none"
      >
        <img
          src="/assets/mekanlar/meydan_sahne.webp"
          alt="Köy Meydanı 2D Sahnesi"
          draggable={false}
          className="h-full w-full object-cover"
        />

        {/* Sol Taş Çeşme Etiketi */}
        <div
          style={{ left: "20%", top: "54%" }}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
        >
          <span className="rounded-full bg-stone-950/80 px-2.5 py-1 text-[10px] font-bold text-sky-200 ring-1 ring-sky-400/40">
            ⛲ Meydan Çeşmesi
          </span>
        </div>

        {/* Sağ Çınar Ağacı Sohbet Noktası */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOyuncu({ x: 74, y: 70, yon: 1 });
            setTimeout(() => setAcikPencere("sohbet"), 300);
          }}
          style={{ left: "80%", top: "55%" }}
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-stone-950/90 px-3 py-1.5 text-xs font-black text-amber-200 shadow-lg ring-1 ring-amber-400/50 transition hover:scale-105"
        >
          🌳 Çınar Altı Sohbeti (Tıkla)
        </button>

        {/* MEYDANDA DAVASI OLAN VE İLERİ GERİ YÜRÜYEN KÖYLÜLER */}
        {siradakiDava ? (
          <button
            type="button"
            onClick={davacilaraYuruVeAc}
            style={{ left: `${davaciX.x}%`, top: "64%" }}
            className="group absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110"
          >
            <div className="flex flex-col items-center">
              <div className="mb-1 animate-bounce rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 px-3 py-1 text-[11px] font-black text-stone-950 shadow-xl ring-2 ring-white">
                ⚖️ Davamız Var Beyim! (Bize Tıkla)
              </div>
              <div className="flex items-center gap-1 rounded-full bg-amber-950/95 px-3 py-1.5 text-2xl shadow-2xl ring-2 ring-amber-400">
                <span style={{ transform: `scaleX(${davaciX.yon})` }} className="inline-block">
                  🧔
                </span>
                <span>⚡</span>
                <span style={{ transform: `scaleX(${-davaciX.yon})` }} className="inline-block">
                  👴
                </span>
              </div>
              <span className="mt-1 rounded-full bg-stone-950/90 px-2.5 py-0.5 text-[10px] font-black text-amber-200 ring-1 ring-amber-400/50">
                {siradakiDava.kisi} · {siradakiDava.baslik}
              </span>
            </div>
          </button>
        ) : (
          <div
            style={{ left: "50%", top: "63%" }}
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="rounded-2xl bg-emerald-950/90 px-3.5 py-1.5 text-center text-xs font-black text-emerald-200 shadow-lg ring-1 ring-emerald-400/50">
              🌿 Meydandaki Tüm Davalar Çözüldü (Huzur Hâkim)
            </div>
          </div>
        )}

        {/* Meydanda Yürüyen Diğer Köylüler (2D Yürüyüş Motoru) */}
        {sakinler.map((s) => (
          <div
            key={s.id}
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex flex-col items-center">
              {s.adim < 8 && (
                <div className="mb-0.5 max-w-[140px] rounded-xl bg-stone-950/85 px-2 py-0.5 text-center text-[9px] font-semibold text-amber-100 ring-1 ring-stone-700">
                  “{s.soz}”
                </div>
              )}
              <div
                style={{
                  transform: `scaleX(${s.yon}) translateY(${s.adim % 2 === 0 ? "-2px" : "0px"})`,
                }}
                className="grid h-10 w-10 place-items-center rounded-full bg-stone-900/90 text-xl shadow-md ring-1 ring-amber-300/50 sm:h-11 sm:w-11 sm:text-2xl"
              >
                {s.ikon}
              </div>
              <span className="mt-0.5 rounded-full bg-stone-950/85 px-2 py-0.5 text-[9px] font-bold text-amber-200/90">
                {s.ad}
              </span>
            </div>
          </div>
        ))}

        {/* Oyuncu Karakteri */}
        <div
          style={{ left: `${oyuncu.x}%`, top: `${oyuncu.y}%` }}
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
        >
          <div className="flex flex-col items-center">
            <div
              style={{ transform: `scaleX(${oyuncu.yon})` }}
              className="grid h-12 w-12 place-items-center rounded-full bg-emerald-900/95 text-2xl shadow-xl ring-2 ring-emerald-300 sm:h-14 sm:w-14 sm:text-3xl"
            >
              🧑
            </div>
            <span className="mt-0.5 rounded-full bg-emerald-400 px-2.5 py-0.5 text-[10px] font-black text-stone-950 shadow">
              Sen (Köy Yöneticisi)
            </span>
          </div>
        </div>

        {/* Alt Bilgi Çubuğu */}
        <div className="pointer-events-none absolute inset-x-3 bottom-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-amber-100">
          <span className="rounded-xl bg-stone-950/85 px-3 py-1 ring-1 ring-stone-700">
            👣 Meydan taşlarına tıklayarak karakterini yürüt
          </span>
          <span className="rounded-xl bg-stone-950/85 px-3 py-1 ring-1 ring-stone-700">
            😊 Köy Mutluluğu: %{durum.mutluluk ?? 60}
          </span>
        </div>
      </div>

      {/* Açık Dava veya Meydan Sohbeti Modalı */}
      {acikPencere && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-stone-900 p-5 ring-2 ring-amber-400 sm:p-6">
            <div className="mb-4 flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-base font-black text-amber-100">
                {acikPencere === "dava" ? "⚖️ Köy Meydanı Halk Divanı" : "🗣️ Köy Meydanı Sohbet Panosu"}
              </h3>
              <button
                type="button"
                onClick={() => setAcikPencere(null)}
                className="rounded-xl bg-stone-800 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-stone-700"
              >
                ✕ Meydana Dön
              </button>
            </div>

            {acikPencere === "dava" ? <ObaDavaKutusu oyun={oyun} /> : <SosyalMeydanKutusu oyun={oyun} />}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================
// 3. TARLA (SULAMA), ORMAN (KURUMUŞ AĞAÇ KESME) VE TAŞ OCAĞI 2D SAHNESİ
// =============================================================
const TARLA_EKINLERI = [
  { id: 1, ad: "1. Ekin Sırası", x: 40, y: 36 },
  { id: 2, ad: "2. Ekin Sırası", x: 54, y: 31 },
  { id: 3, ad: "3. Ekin Sırası", x: 76, y: 46 },
  { id: 4, ad: "4. Ekin Sırası", x: 60, y: 58 },
  { id: 5, ad: "5. Ekin Sırası", x: 77, y: 68 },
  { id: 6, ad: "6. Ekin Sırası", x: 46, y: 78 },
];

const ORMAN_AGACLARI = [
  { id: 1, ad: "Kurumuş Meşe", x: 38, y: 42, kurumus: true },
  { id: 2, ad: "Genç Çam Ağacı", x: 50, y: 36, kurumus: false },
  { id: 3, ad: "Kurumuş Gürgen", x: 64, y: 43, kurumus: true },
  { id: 4, ad: "Canlı Sedir Ağacı", x: 77, y: 39, kurumus: false },
  { id: 5, ad: "Kurumuş Kütük", x: 45, y: 64, kurumus: true },
  { id: 6, ad: "Yeşil Çınar", x: 58, y: 60, kurumus: false },
  { id: 7, ad: "Kurumuş Çam", x: 73, y: 67, kurumus: true },
  { id: 8, ad: "Fidanlık Ağacı", x: 32, y: 72, kurumus: false },
];

const MADEN_KAYALARI = [
  { id: 1, ad: "Kuzey Kaya Damarı", x: 35, y: 45 },
  { id: 2, ad: "Orta Mermer Kaya", x: 53, y: 40 },
  { id: 3, ad: "Doğu Granit Damarı", x: 72, y: 52 },
  { id: 4, ad: "Güney Taş Yatağı", x: 48, y: 70 },
];

export function UretimSahnesi({ id, oyun }) {
  const n = NOKTALAR[id];
  const k = n.kaynak; // "erzak" | "kereste" | "tas"
  const t = KAYNAKLAR[k];
  const { durum } = oyun;
  const acik = kaynakAcikMi(k, durum.level);
  const otagSeviye = durum.binalar.otag ?? 1;
  const kap = depoKapasitesi(k, otagSeviye);
  const bekleyen = oyun.bekleyen(k);
  const doluluk = Math.min(100, (bekleyen / kap) * 100);

  // İşçi görevlendirme hesapları
  const isciler = durum.isciler ?? { erzak: 1, kereste: 1, tas: 0 };
  const buradakiIsci = isciler[k] ?? 0;
  const toplamAtanan = (isciler.erzak ?? 0) + (isciler.kereste ?? 0) + (isciler.tas ?? 0);
  const toplamInsan = durum.envanter.insan ?? 5;
  const bostakiInsan = Math.max(0, toplamInsan - toplamAtanan);
  const saatlik = Math.round(saatlikUretim(k, buradakiIsci));

  // Oyuncunun sahne içindeki konumu
  const [oyuncu, setOyuncu] = useState({ x: 24, y: 70, yon: 1 });
  // Tarla sulama durumu: { [id]: true }
  const [sulananlar, setSulananlar] = useState({});
  // Orman ağaç kesme durumu: { [id]: vurusSayisi (2 olunca kesilir) }
  const [agacVurus, setAgacVurus] = useState({});
  // Maden kaya kırma durumu: { [id]: vurusSayisi (2 olunca kırılır) }
  const [kayaVurus, setKayaVurus] = useState({});
  const [sahneBildirim, setSahneBildirim] = useState(null);
  const [odulVerildi, setOdulVerildi] = useState(false);

  const sulananSayisi = Object.keys(sulananlar).length;
  const kesilenAgacSayisi = ORMAN_AGACLARI.filter((a) => a.kurumus && (agacVurus[a.id] ?? 0) >= 2).length;
  const kirilanKayaSayisi = MADEN_KAYALARI.filter((m) => (kayaVurus[m.id] ?? 0) >= 2).length;

  const sahneyeTikla = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(86, Math.max(14, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(86, Math.max(30, ((e.clientY - rect.top) / rect.height) * 100));
    setOyuncu((eski) => ({
      x: Math.round(x),
      y: Math.round(y),
      yon: x >= eski.x ? 1 : -1,
    }));
  };

  // TARLA: Ekin sulama işlemi
  const ekinSula = async (ekin, e) => {
    e.stopPropagation();
    setOyuncu({ x: Math.max(16, ekin.x - 6), y: ekin.y + 4, yon: 1 });
    if (sulananlar[ekin.id]) return;

    const yeni = { ...sulananlar, [ekin.id]: true };
    setSulananlar(yeni);
    const yeniSayi = Object.keys(yeni).length;
    setSahneBildirim(`💧 ${ekin.ad} sulandı! (${yeniSayi}/${TARLA_EKINLERI.length})`);

    if (yeniSayi === TARLA_EKINLERI.length && !odulVerildi) {
      setOdulVerildi(true);
      const sonuc = await oyun.uretimEtkilesim("erzak");
      if (sonuc?.mesaj) {
        setSahneBildirim(`🌾 Maşallah! Tüm tarlayı suladın: ${sonuc.mesaj}`);
      }
    }
  };

  // ORMAN: Kurumuş ağaç kesme işlemi
  const agacaTikla = async (agac, e) => {
    e.stopPropagation();
    setOyuncu({ x: Math.max(16, agac.x - 6), y: agac.y + 6, yon: 1 });

    if (!agac.kurumus) {
      setSahneBildirim("🌱 Yaş kesen baş keser! Yeşil ağaçlara dokunmayalım, sadece kurumuş kahverengi ağaçları bulup keselim.");
      return;
    }

    const mevcut = agacVurus[agac.id] ?? 0;
    if (mevcut >= 2) return;

    const yeniVurus = mevcut + 1;
    const yeniHarita = { ...agacVurus, [agac.id]: yeniVurus };
    setAgacVurus(yeniHarita);

    const yeniKesilen = ORMAN_AGACLARI.filter((a) => a.kurumus && (yeniHarita[a.id] ?? 0) >= 2).length;
    if (yeniVurus === 1) {
      setSahneBildirim(`🪓 ${agac.ad} gövdesine ilk balta vuruşu! Kesmek için 1 kez daha vur.`);
    } else {
      setSahneBildirim(`🌲 ${agac.ad} kesildi ve odun istiflendi! (${yeniKesilen}/4 Kurumuş Ağaç)`);
      if (yeniKesilen === 4 && !odulVerildi) {
        setOdulVerildi(true);
        const sonuc = await oyun.uretimEtkilesim("kereste");
        if (sonuc?.mesaj) {
          setSahneBildirim(`🪓 Ormandaki tüm kurumuş ağaçları temizledin: ${sonuc.mesaj}`);
        }
      }
    }
  };

  // MADEN: Kaya kırma işlemi
  const kayayaTikla = async (kaya, e) => {
    e.stopPropagation();
    setOyuncu({ x: Math.max(16, kaya.x - 6), y: kaya.y + 6, yon: 1 });

    const mevcut = kayaVurus[kaya.id] ?? 0;
    if (mevcut >= 2) return;

    const yeniVurus = mevcut + 1;
    const yeniHarita = { ...kayaVurus, [kaya.id]: yeniVurus };
    setKayaVurus(yeniHarita);

    const yeniKirilan = MADEN_KAYALARI.filter((m) => (yeniHarita[m.id] ?? 0) >= 2).length;
    if (yeniVurus === 1) {
      setSahneBildirim(`⛏️ ${kaya.ad} çatladı! Kırmak için 1 kez daha kazma vur.`);
    } else {
      setSahneBildirim(`🧱 ${kaya.ad} kırıldı! (${yeniKirilan}/4 Kaya Damarı)`);
      if (yeniKirilan === 4 && !odulVerildi) {
        setOdulVerildi(true);
        const sonuc = await oyun.uretimEtkilesim("tas");
        if (sonuc?.mesaj) {
          setSahneBildirim(`⛏️ Tüm kaya damarlarını işledin: ${sonuc.mesaj}`);
        }
      }
    }
  };

  const sahneyiSifirla = () => {
    setSulananlar({});
    setAgacVurus({});
    setKayaVurus({});
    setOdulVerildi(false);
    setSahneBildirim("🔄 Sahne yenilendi! Tekrar çalışabilirsin.");
  };

  if (!acik) {
    return (
      <div className="rounded-3xl bg-stone-950/85 p-6 text-center ring-1 ring-amber-500/30">
        <div className="text-4xl">🔒</div>
        <h3 className="mt-2 text-lg font-black text-amber-100">
          {n.ikon} {n.ad} · Level {t.acilisLevel}&apos;de Açılır
        </h3>
        <p className="mt-1 text-xs text-amber-200/75">
          Köyünü geliştirip Level {t.acilisLevel}&apos;e ulaştığında burada {t.ad} üretimi ve saha çalışması yapabilirsin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ÜST PANEL: İŞÇİ GÖREVLENDİRME VE DEPO TOPLAMA */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Sol Kutu: İşçi Görevlendirme */}
        <div className="flex flex-col justify-between rounded-3xl bg-stone-950/85 p-4 ring-1 ring-amber-500/30">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                👷 Köylü İşçi Görevlendirme
              </span>
              <h3 className="text-base font-black text-amber-100">
                {k === "erzak" ? "🌾 Tarla Çiftçileri" : k === "kereste" ? "🌲 Orman Oduncuları" : "⛏️ Taş Ocağı Ustaları"}
              </h3>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-black text-emerald-300 ring-1 ring-emerald-500/40">
              Saatlik +{saatlik} {t.ikon}
            </span>
          </div>

          <p className="my-2 text-xs text-amber-200/75">
            {buradakiIsci === 0
              ? "⚠️ Burada hiç çalışan yok! Saatlik üretim durmuş durumda, hemen en az 1 köylü görevlendir."
              : `Burada ${buradakiIsci} köylü çalışıyor. Her ek çalışan saatlik üretimi +%35 artırır.`}
          </p>

          <div className="flex items-center justify-between rounded-2xl bg-stone-900 p-2.5 ring-1 ring-stone-800">
            <div className="text-xs">
              <div className="font-black text-amber-100">Görevli Çalışan: {buradakiIsci} 👥</div>
              <div className="text-[11px] text-amber-300/80">Köyde Boştaki İnsan: {bostakiInsan} 👥</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={oyun.bekliyor || buradakiIsci <= 0}
                onClick={() => oyun.isciAta(k, -1)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-stone-800 text-base font-black text-amber-200 ring-1 ring-stone-700 hover:bg-stone-700 disabled:opacity-40"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-black tabular-nums text-amber-100">{buradakiIsci}</span>
              <button
                type="button"
                disabled={oyun.bekliyor || bostakiInsan <= 0}
                onClick={() => oyun.isciAta(k, 1)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-base font-black text-stone-950 shadow hover:bg-amber-400 disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Sağ Kutu: Biriken Üretim Deposu */}
        <div className="flex flex-col justify-between rounded-3xl bg-stone-950/85 p-4 ring-1 ring-amber-500/30">
          <div>
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="uppercase tracking-wider text-amber-300">📦 {n.ad} Üretim Deposu</span>
              <span className="tabular-nums text-sm font-black text-amber-100">
                {bekleyen} / {kap} {t.ikon}
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-stone-900 ring-1 ring-stone-800">
              <div
                className={`h-full transition-all ${doluluk >= 100 ? "bg-red-500" : "bg-amber-400"}`}
                style={{ width: `${doluluk}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-amber-200/75">
              Oba Seviye {otagSeviye} ile depo {DEPO_SAAT[otagSeviye]} saatlik üretimi saklar. Ayrıca aşağıdaki 2D sahada bizzat çalışarak anında <b>+{k === "tas" ? 12 : 15} {t.ikon} {t.ad}</b> kazanabilirsin!
            </p>
          </div>

          <button
            type="button"
            disabled={!bekleyen || oyun.bekliyor}
            onClick={() => oyun.topla(k)}
            className="mt-3 w-full rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 py-2.5 text-xs font-black text-stone-950 shadow-lg hover:brightness-110 disabled:from-stone-800 disabled:to-stone-800 disabled:text-stone-500 sm:text-sm"
          >
            {bekleyen ? `${t.ikon} Biriken +${bekleyen} ${t.ad} Topla` : "Henüz Depoda Birikmedi"}
          </button>
        </div>
      </div>

      {/* SAHNE GÖREV BARI */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-stone-900/95 px-4 py-2.5 text-xs ring-1 ring-amber-400/40">
        <div className="font-bold text-amber-100">
          {id === "tarla" && (
            <span>
              💧 <b>Tarla Sulama Görevi:</b> Susamış 6 ekin sırasına tıklayarak sula ({sulananSayisi}/6) →{" "}
              <b className="text-emerald-300">+15 🌾 Mahsul</b>
            </span>
          )}
          {id === "orman" && (
            <span>
              🪓 <b>Kurumuş Ağaç Kesme:</b> Yeşil ağaçlara dokunmadan 4 kurumuş kahverengi ağacı bulup 2 kez balta vur ({kesilenAgacSayisi}/4) →{" "}
              <b className="text-emerald-300">+15 🌲 Tahta</b>
            </span>
          )}
          {id === "maden" && (
            <span>
              ⛏️ <b>Kaya Damarı İşleme:</b> 4 kaya damarına ikişer kez kazma vurarak kır ({kirilanKayaSayisi}/4) →{" "}
              <b className="text-emerald-300">+12 🧱 Taş</b>
            </span>
          )}
        </div>

        {(sulananSayisi === 6 || kesilenAgacSayisi === 4 || kirilanKayaSayisi === 4) && (
          <button
            type="button"
            onClick={sahneyiSifirla}
            className="rounded-xl bg-amber-400 px-3 py-1 text-xs font-black text-stone-950 shadow"
          >
            🔄 Sahneyi Yenile
          </button>
        )}
      </div>

      {sahneBildirim && (
        <div className="rounded-2xl bg-amber-500/20 px-4 py-2.5 text-xs font-bold text-amber-100 ring-1 ring-amber-400">
          {sahneBildirim}
        </div>
      )}

      {/* 2D İNTERAKTİF ÜRETİM SAHNESİ */}
      <div
        onClick={sahneyeTikla}
        className="relative aspect-[16/9] w-full cursor-pointer overflow-hidden rounded-3xl bg-stone-950 shadow-2xl ring-2 ring-amber-500/40 select-none"
      >
        {id === "tarla" && (
          <img
            src="/assets/mekanlar/tarla_sahne.webp"
            alt="Tarla 2D Sulama Sahnesi"
            draggable={false}
            className="h-full w-full object-cover"
          />
        )}
        {id === "orman" && (
          <img
            src="/assets/mekanlar/orman_sahne.webp"
            alt="Orman 2D Ağaç Kesme Sahnesi"
            draggable={false}
            className="h-full w-full object-cover"
          />
        )}
        {id === "maden" && (
          <div className="h-full w-full bg-gradient-to-b from-stone-700 via-stone-800 to-stone-950">
            <img
              src="/assets/harita/koy.webp"
              alt="Taş Ocağı Sahnesi"
              draggable={false}
              className="h-full w-full scale-150 object-cover object-left-top opacity-65"
            />
          </div>
        )}

        {/* Görevlendirilmiş Köylü İşçiler Sahnede Görünür */}
        {Array.from({ length: Math.min(5, buradakiIsci) }).map((_, idx) => (
          <div
            key={idx}
            style={{ left: `${22 + idx * 14}%`, top: `${78 + (idx % 2) * 5}%` }}
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex flex-col items-center">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-stone-900/90 text-lg ring-1 ring-amber-400/60">
                {k === "erzak" ? "👨‍🌾" : k === "kereste" ? "👷" : "⛏️"}
              </div>
              <span className="mt-0.5 rounded-full bg-stone-950/85 px-2 py-0.5 text-[9px] font-bold text-amber-200">
                {idx + 1}. Çalışan
              </span>
            </div>
          </div>
        ))}

        {/* 1. TARLA: SU KUYUSU VE 6 EKİN SIRASI */}
        {id === "tarla" && (
          <>
            <div
              style={{ left: "19%", top: "42%" }}
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
            >
              <span className="rounded-full bg-sky-950/90 px-2.5 py-1 text-[10px] font-black text-sky-200 ring-1 ring-sky-400">
                🪣 Su Kuyusu & Kanalı
              </span>
            </div>

            {TARLA_EKINLERI.map((ekin) => {
              const sulandi = Boolean(sulananlar[ekin.id]);
              return (
                <button
                  key={ekin.id}
                  type="button"
                  onClick={(e) => ekinSula(ekin, e)}
                  style={{ left: `${ekin.x}%`, top: `${ekin.y}%` }}
                  className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 transition hover:scale-110"
                >
                  <div
                    className={`flex flex-col items-center rounded-2xl px-3 py-1.5 shadow-xl ring-2 ${
                      sulandi
                        ? "bg-emerald-950/90 text-emerald-200 ring-emerald-400"
                        : "animate-pulse bg-amber-950/90 text-amber-100 ring-amber-400 hover:bg-sky-900"
                    }`}
                  >
                    <span className="text-xl sm:text-2xl">{sulandi ? "🌾✨" : "🌱💧"}</span>
                    <span className="text-[10px] font-black whitespace-nowrap">
                      {sulandi ? "Sulandı ✅" : "Tıkla & Sula!"}
                    </span>
                  </div>
                </button>
              );
            })}
          </>
        )}

        {/* 2. ORMAN: KURUMUŞ KAHVERENGİ AĞAÇLAR VE CANLI YEŞİL AĞAÇLAR */}
        {id === "orman" &&
          ORMAN_AGACLARI.map((agac) => {
            const vurus = agacVurus[agac.id] ?? 0;
            const kesildi = vurus >= 2;
            return (
              <button
                key={agac.id}
                type="button"
                onClick={(e) => agacaTikla(agac, e)}
                style={{ left: `${agac.x}%`, top: `${agac.y}%` }}
                className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 transition hover:scale-110"
              >
                <div
                  className={`flex flex-col items-center rounded-2xl px-2.5 py-1.5 shadow-xl ring-2 ${
                    !agac.kurumus
                      ? "bg-emerald-950/85 text-emerald-200 ring-emerald-500/60"
                      : kesildi
                      ? "bg-stone-900/90 text-amber-300 ring-amber-400"
                      : "animate-pulse bg-amber-950/95 text-amber-100 ring-amber-400"
                  }`}
                >
                  <span className="text-2xl sm:text-3xl">
                    {!agac.kurumus ? "🌲" : kesildi ? "📦" : vurus === 1 ? "🪓🍂" : "🍂"}
                  </span>
                  <span className="text-[10px] font-black whitespace-nowrap">
                    {!agac.kurumus
                      ? "Yaş Ağaç (Kesme)"
                      : kesildi
                      ? "Odun Hazır ✅"
                      : vurus === 1
                      ? "1 Kez Daha Vur! (1/2)"
                      : "Kurumuş Ağaç (Kes 🪓)"}
                  </span>
                </div>
              </button>
            );
          })}

        {/* 3. TAŞ OCAĞI: KAYA DAMARLARI */}
        {id === "maden" &&
          MADEN_KAYALARI.map((kaya) => {
            const vurus = kayaVurus[kaya.id] ?? 0;
            const kirildi = vurus >= 2;
            return (
              <button
                key={kaya.id}
                type="button"
                onClick={(e) => kayayaTikla(kaya, e)}
                style={{ left: `${kaya.x}%`, top: `${kaya.y}%` }}
                className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 transition hover:scale-110"
              >
                <div
                  className={`flex flex-col items-center rounded-2xl px-3 py-2 shadow-xl ring-2 ${
                    kirildi
                      ? "bg-emerald-950/90 text-emerald-200 ring-emerald-400"
                      : "animate-pulse bg-stone-900/95 text-amber-100 ring-amber-400"
                  }`}
                >
                  <span className="text-2xl sm:text-3xl">{kirildi ? "🧱✨" : "⛰️⛏️"}</span>
                  <span className="text-[10px] font-black whitespace-nowrap">
                    {kirildi
                      ? "Taş Çıkarıldı ✅"
                      : vurus === 1
                      ? "1 Kez Daha Vur! (1/2)"
                      : `${kaya.ad} (Kır ⛏️)`}
                  </span>
                </div>
              </button>
            );
          })}

        {/* Oyuncu Karakteri */}
        <div
          style={{ left: `${oyuncu.x}%`, top: `${oyuncu.y}%` }}
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
        >
          <div className="flex flex-col items-center">
            <div
              style={{ transform: `scaleX(${oyuncu.yon})` }}
              className="grid h-12 w-12 place-items-center rounded-full bg-emerald-900/95 text-2xl shadow-xl ring-2 ring-emerald-300 sm:h-14 sm:w-14 sm:text-3xl"
            >
              🧑
            </div>
            <span className="mt-0.5 rounded-full bg-emerald-400 px-2.5 py-0.5 text-[10px] font-black text-stone-950 shadow">
              Sen ({id === "tarla" ? "💧 Sulama" : id === "orman" ? "🪓 Oduncu" : "⛏️ Madenci"})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
