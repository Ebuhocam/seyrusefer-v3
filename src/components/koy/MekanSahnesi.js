"use client";
import { useEffect, useState } from "react";
import { BINALAR, KAYNAKLAR, NOKTALAR, toplamKonutKapasitesi } from "@/lib/oyun/sabitler";
import { kaynakAcikMi, saatlikUretim } from "@/lib/oyun/kurallar";
import { koyDavalariListesi, gocmenDurumu } from "@/lib/oyun/hikayeler";
import { AileOkumasiKutusu, ObaDavaKutusu, SosyalMeydanKutusu } from "./GorevlerEkrani";

const YIRMI_DORT_SAAT_MS = 24 * 60 * 60 * 1000;

// =============================================================
// 1. EV İÇİ 2D ODA SAHNESİ (Haberci Mektup Kontrolü + "Çağırdım" Butonu)
// Not: Anne/babası olmayan çocukların üzülmemesi için odaya NPC aile
// karakterleri gelmez; sadece "Çağırdım" butonu ile okuma başlatılır.
// =============================================================
export function EvIciSahnesi({ binaId, oyun, onSecimDegistir, onYukseltmeAc }) {
  const { durum, karakter } = oyun;
  const kat = durum.binalar[binaId] ?? 1;
  const kendiEvimMi = binaId === "kendi_evim";

  const aileGorevi = oyun.gorevler.find((g) => g.tur === "aile" || g.kod === "aile");
  const mektupAlindiMi = (durum.mektupAlindi ?? 0) >= durum.level || Boolean(aileGorevi?.tamam);

  // Oyuncunun oda içindeki konumu
  const [oyuncuKonum, setOyuncuKonum] = useState({ x: 42, y: 72 });
  //1. aşama: "Ev halkını / büyüklerimi çağır" tıklandı mı?
  const [cagriBasladi, setCagriBasladi] = useState(Boolean(aileGorevi?.tamam));
  // 2. aşama: "Çağırdım" butonuna tıklandı mı?
  const [cagrildiOnay, setCagrildiOnay] = useState(Boolean(aileGorevi?.tamam));
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
            src={karakter?.gorsel ?? "/assets/karakterler/erkek_alp.webp"}
            alt={karakter?.ad ?? "Karakter"}
            className="h-12 w-12 rounded-2xl object-cover ring-2 ring-amber-400"
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

      {/* Haberci Mektup Hatırlatma ve "Çağırdım" Akışı */}
      {kendiEvimMi && (
        <div
          className={`rounded-3xl p-4 ring-2 transition ${
            !mektupAlindiMi
              ? "bg-amber-500/20 text-amber-50 ring-amber-400"
              : !cagrildiOnay
              ? "bg-sky-950/85 text-sky-100 ring-sky-400"
              : "bg-emerald-950/85 text-emerald-100 ring-emerald-400/60"
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
                  Köy kapısında bekleyen <b>Haberci</b> bu level için yeni bir okuma mektubu getirdi. Okumaya başlamadan önce Haberci&apos;ye uğrayıp mektubu teslim almalısın.
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
          ) : !cagriBasladi ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-400 px-2.5 py-0.5 text-[11px] font-black text-stone-950">
                  ✉️ Mektup Rahlede Hazır!
                </div>
                <h4 className="text-sm font-black text-sky-100 sm:text-base">
                  Ev Halkını veya Sevdiklerini Yanına Davet Et
                </h4>
                <p className="text-xs leading-relaxed text-sky-100/85">
                  Haberci&apos;den aldığın mektup orta rahlede hazır. Mektubu birlikte okumak için yanına evdeki büyüklerini veya sevdiklerini çağırabilirsin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCagriBasladi(true)}
                className="shrink-0 animate-bounce rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 px-5 py-3 text-xs font-black text-stone-950 shadow-xl ring-2 ring-amber-200 hover:brightness-110 sm:text-sm"
              >
                📣 Yanıma Çağır
              </button>
            </div>
          ) : !cagrildiOnay ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-2.5 py-0.5 text-[11px] font-black text-stone-950">
                  🏠 Okumaya Hazırlık
                </div>
                <h4 className="text-sm font-black text-amber-100 sm:text-base">
                  Yanına Çağırdıysan Okumaya Başlayalım!
                </h4>
                <p className="text-xs leading-relaxed text-amber-100/90">
                  Hazır olduğunda aşağıdaki <b>&ldquo;✅ Çağırdım&rdquo;</b> butonuna tıklayarak Haberci&apos;nin mektubunu açabilirsin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCagrildiOnay(true);
                  setMektupAcik(true);
                }}
                className="shrink-0 animate-bounce rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-6 py-3 text-sm font-black text-stone-950 shadow-xl ring-2 ring-emerald-200 hover:brightness-110"
              >
                ✅ Çağırdım
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400 px-2.5 py-0.5 text-[11px] font-black text-stone-950">
                  📖 Mektup Okumaya Hazır
                </div>
                <h4 className="text-sm font-black text-emerald-100 sm:text-base">
                  {aileGorevi?.tamam ? "Bu Levelin Okuma Mektubu Tamamlandı!" : "Mektubu Açıp Okuyabilirsin"}
                </h4>
                <p className="text-xs leading-relaxed text-emerald-100/85">
                  Rahlenin üzerindeki <b>✉️ Mektup</b> simgesine veya yanındaki butona tıklayarak metni oku.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMektupAcik((a) => !a)}
                className="shrink-0 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 px-5 py-3 text-xs font-black text-stone-950 shadow-xl ring-2 ring-amber-200 hover:brightness-110 sm:text-sm"
              >
                📖 {mektupAcik ? "Mektubu Gizle" : "Mektubu Aç ve Oku"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Açık Mektup Okuma Kartı */}
      {mektupAcik && mektupAlindiMi && (
        <div className="rounded-3xl bg-stone-900/95 p-5 shadow-2xl ring-2 ring-amber-400">
          <AileOkumasiKutusu oyun={oyun} />
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
              {!mektupAlindiMi ? "📭" : aileGorevi?.tamam ? "📖" : "✉️"}
            </span>
            <span className="text-[10px] font-black whitespace-nowrap sm:text-xs">
              {!mektupAlindiMi
                ? "Mektup Yok (Haberci'de)"
                : !cagriBasladi
                ? "Yanıma Çağır"
                : !cagrildiOnay
                ? "✅ Çağırdım (Tıkla)"
                : "Mektubu Oku"}
            </span>
          </div>
        </button>

        {/* Öğrencinin Seçtiği Karakter (Oda İçinde Yürüyebilen) */}
        <div
          style={{ left: `${oyuncuKonum.x}%`, top: `${oyuncuKonum.y}%` }}
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
        >
          <div className="flex flex-col items-center">
            <img
              src={karakter?.gorsel ?? "/assets/karakterler/erkek_alp.webp"}
              alt={karakter?.ad ?? "Oyuncu"}
              className="h-14 w-14 rounded-full object-cover shadow-2xl ring-3 ring-emerald-300 sm:h-16 sm:w-16"
            />
            <span className="mt-1 rounded-full bg-emerald-400 px-2.5 py-0.5 text-[10px] font-black text-stone-950 shadow">
              {oyun.kullanici?.ad ?? karakter?.ad ?? "Genç Yönetici"}
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
    </div>
  );
}

// =============================================================
// 2. KÖY MEYDANI 2D SAHNESİ
// - Karakterler kötü yürümez, sabit beklerler.
// - Oyuncu karakterini yanlarına götürünce konuşma balonu + altta Rehber gibi
//   daktilo diyalog kutusu açılır; konuşma bitince karar verme ekranı gelir.
// - Bir olay (Dava veya Yeni İnsan Daveti) bitince karakterler kaybolur;
//   1 gün (24 saat) sonra yeni olay gelir.
// - Çınar Altı Sohbeti'ne tıklanınca pop-up yerine tam sayfa sosyal medya açılır!
// =============================================================
export function KoyMeydaniSahnesi({ oyun }) {
  const { durum, ayarlar, simdi, karakter } = oyun;
  const davalar = koyDavalariListesi(ayarlar);
  const cozulenler = Array.isArray(durum.cozulenDavalar) ? durum.cozulenDavalar : [];
  const siradakiDava = davalar.find((d) => !cozulenler.includes(d.id)) ?? null;
  const gocmen = gocmenDurumu(simdi, 0);

  // Görünüm modu: "meydan" | "cinar_sohbet" | "karar_ekrani"
  const [gorunum, setGorunum] = useState("meydan");

  // Günde 1 Meydan Olayı Kontrolü: Son olaydan bu yana 24 saat geçmediyse meydanda kimse beklemez
  const sonOlayZamani = durum.sonMeydanOlayZamani ?? 0;
  const gecenMs = sonOlayZamani > 0 ? Math.max(0, simdi - sonOlayZamani) : YIRMI_DORT_SAAT_MS;
  const gunlukOlayHazir = gecenMs >= YIRMI_DORT_SAAT_MS;
  const kalanSaat = gunlukOlayHazir ? 0 : Math.max(1, Math.ceil((YIRMI_DORT_SAAT_MS - gecenMs) / (60 * 60 * 1000)));

  // Her zaman dava için gelmezler: Bazen Dava, bazen Köye Yerleşmek İsteyen Yeni İnsanlar!
  const davaGoreviEksik = oyun.gorevler.some((g) => g.tur === "dava" && !g.tamam);
  const varsayilanOlayTuru =
    !siradakiDava
      ? "gocmen"
      : davaGoreviEksik
      ? "dava"
      : (cozulenler.length + (durum.envanter?.insan ?? 5)) % 2 === 1
      ? "gocmen"
      : "dava";

  const [seciliOlayTuru, setSeciliOlayTuru] = useState( null );
  const aktifOlayTuru = seciliOlayTuru ?? varsayilanOlayTuru;

  // Oyuncunun meydandaki konumu
  const [oyuncu, setOyuncu] = useState({ x: 28, y: 78 });
  // Oyuncu meydandaki misafirlerin yanına gitti mi? (Diyalog kutusu açık mı?)
  const [diyalogAcik, setDiyalogAcik] = useState(false);
  const [harfSayisi, setHarfSayisi] = useState(0);
  // Göçmen daveti tam ekran sonucu
  const [gocmenSonuc, setGocmenSonuc] = useState(null);

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

  // 1. TAM SAYFA ÇINAR ALTI SOSYAL MEDYA GÖRÜNÜMÜ
  if (gorunum === "cinar_sohbet") {
    return <SosyalMeydanKutusu oyun={oyun} onGeriDon={() => setGorunum("meydan")} />;
  }

  // 2. TAM SAYFA KARAR VERME VE TAM EKRAN SONUÇ GÖRÜNÜMÜ
  if (gorunum === "karar_ekrani") {
    const kapasite = toplamKonutKapasitesi(durum.binalar);
    const mevcutInsan = durum.envanter?.insan ?? 5;
    const bosYer = Math.max(0, kapasite - mevcutInsan);
    const mutluluk = durum.mutluluk ?? 60;
    const olasilik = Math.min(95, Math.max(15, mutluluk));

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            setGocmenSonuc(null);
            setGorunum("meydan");
          }}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-stone-800 px-4 py-2 text-xs font-black text-amber-200 ring-1 ring-amber-400/40 hover:bg-stone-700"
        >
          ← Köy Meydanı Sahnesine Dön
        </button>

        {aktifOlayTuru === "dava" && siradakiDava ? (
          <ObaDavaKutusu
            oyun={oyun}
            onTamamKapat={() => {
              setDiyalogAcik(false);
              setGorunum("meydan");
            }}
          />
        ) : gocmenSonuc ? (
          /* YENİ İNSAN DAVETİ TAM EKRAN KARAR SONUCU */
          <div
            className={`space-y-5 rounded-3xl p-6 text-center shadow-2xl ring-2 sm:p-8 ${
              gocmenSonuc.kabul
                ? "bg-gradient-to-b from-emerald-950/95 to-stone-950 text-emerald-50 ring-emerald-400"
                : "bg-gradient-to-b from-amber-950/95 to-stone-950 text-amber-50 ring-amber-400"
            }`}
          >
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-stone-900/90 text-5xl shadow-xl ring-2 ring-amber-400">
              {gocmenSonuc.kabul ? "🏡" : "🐪"}
            </div>
            <span
              className={`inline-block rounded-full px-4 py-1 text-sm font-black shadow ${
                gocmenSonuc.kabul ? "bg-emerald-400 text-stone-950" : "bg-amber-400 text-stone-950"
              }`}
            >
              {gocmenSonuc.kabul
                ? `+${gocmenSonuc.kazanilanInsan} 👥 Yeni İnsan Köyümüze Yerleşti!`
                : "Misafirler Şimdilik Yola Devam Etti"}
            </span>
            <h3 className="text-xl font-black text-amber-100 sm:text-2xl">
              {gocmenSonuc.kabul ? `${gocmenSonuc.aday} Köyümüze Hoş Geldi!` : `${gocmenSonuc.aday} Teşekkür Ederek Ayrıldı`}
            </h3>
            <div className="mx-auto max-w-xl rounded-2xl bg-stone-900/90 p-5 text-sm leading-relaxed text-amber-50 ring-1 ring-stone-700 sm:text-base">
              “{gocmenSonuc.mesaj}”
            </div>
            <button
              type="button"
              onClick={() => {
                setGocmenSonuc(null);
                setDiyalogAcik(false);
                setGorunum("meydan");
              }}
              className="w-full max-w-md rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 py-4 text-base font-black text-stone-950 shadow-xl ring-2 ring-amber-200 transition hover:brightness-110"
            >
              ✅ Tamam
            </button>
          </div>
        ) : (
          /* YENİ İNSANLARI KÖYE DAVET ETME KARAR EKRANI */
          <div className="space-y-4 rounded-3xl bg-stone-950/90 p-6 shadow-xl ring-2 ring-amber-400/60">
            <span className="inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-300 ring-1 ring-emerald-400/40">
              🏡 Köye Yerleşmek İsteyen Yeni İnsanlar
            </span>
            <h3 className="text-xl font-black text-amber-100">
              {gocmen.aday.ad} ({gocmen.aday.meslek} · +{gocmen.aday.kisiSayisi} 👥 İnsan)
            </h3>
            <p className="rounded-2xl bg-stone-900 p-4 text-sm leading-relaxed text-amber-50 ring-1 ring-stone-800">
              “{gocmen.aday.soz}”
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-stone-900/90 p-3.5 text-xs ring-1 ring-stone-800">
                <span className="text-amber-300 font-bold">🏠 Köy Evlerinde Boş Yatak:</span>
                <div className="mt-1 text-base font-black text-amber-100">
                  {bosYer} Kişilik Boş Yer ({mevcutInsan}/{kapasite} 👥)
                </div>
              </div>
              <div className="rounded-2xl bg-stone-900/90 p-3.5 text-xs ring-1 ring-stone-800">
                <span className="text-amber-300 font-bold">😊 Köy Huzuruna Göre Kabul Şansı:</span>
                <div className="mt-1 text-base font-black text-emerald-300">%{olasilik}</div>
              </div>
            </div>

            {bosYer <= 0 && (
              <div className="rounded-2xl bg-red-950/80 p-3.5 text-xs text-red-100 ring-1 ring-red-400/50">
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
              className="w-full rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 py-4 text-sm font-black text-stone-950 shadow-xl ring-2 ring-emerald-200 disabled:from-stone-800 disabled:to-stone-800 disabled:text-stone-500 sm:text-base"
            >
              {bosYer <= 0
                ? "🔒 Önce Köyde Yeni Ev Kur veya Kat Çık"
                : `🏡 Köyümüzde Ev Kurmaya Davet Et (+${Math.min(gocmen.aday.kisiSayisi, bosYer)} 👥 İnsan)`}
            </button>
          </div>
        )}
      </div>
    );
  }

  const meydanaTikla = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(84, Math.max(16, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(86, Math.max(56, ((e.clientY - rect.top) / rect.height) * 100));
    setOyuncu({ x: Math.round(x), y: Math.round(y) });

    // Eğer oyuncu meydanın ortasında bekleyen karakterlerin yakınına yürüdüyse konuşmayı başlat
    if (gunlukOlayHazir && Math.abs(x - 50) < 13 && Math.abs(y - 66) < 13) {
      setTimeout(() => setDiyalogAcik(true), 400);
    }
  };

  const misafirlerinYaninaGit = (e) => {
    if (e) e.stopPropagation();
    setOyuncu({ x: 41, y: 68 });
    setTimeout(() => setDiyalogAcik(true), 450);
  };

  const yaziliyor = diyalogAcik && harfSayisi < diyalogMetni.length;

  return (
    <div className="space-y-4">
      {/* Üst Meydan Durum Çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-stone-950/85 p-4 ring-1 ring-amber-500/30">
        <div>
          <h3 className="text-sm font-black text-amber-100 sm:text-base">
            ⚖️ 2D Köy Meydanı · Meydan Misafirleri & Çınar Altı Sohbeti
          </h3>
          <p className="text-xs text-amber-200/80">
            Karakterini meydanda bekleyenlerin yanına götürdüğünde seninle konuşurlar; konuşma bitince karar ekranı açılır!
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {gunlukOlayHazir && siradakiDava && (
            <button
              type="button"
              onClick={() => {
                setSeciliOlayTuru(aktifOlayTuru === "dava" ? "gocmen" : "dava");
                setDiyalogAcik(false);
              }}
              className="rounded-2xl bg-stone-800 px-3 py-2 text-xs font-bold text-amber-200 ring-1 ring-stone-700 hover:bg-stone-700"
            >
              🔄 {aktifOlayTuru === "dava" ? "Yeni İnsan Davetine Bak" : "Köylü Davasına Bak"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setGorunum("cinar_sohbet")}
            className="rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 px-4 py-2 text-xs font-black text-stone-950 shadow-lg hover:brightness-110"
          >
            🌳 Çınar Altı Sohbeti (Sosyal Medya Sayfası) →
          </button>
        </div>
      </div>

      {/* 2D KÖY MEYDANI SAHNESİ */}
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

        {/* Sol Taş Çeşme */}
        <div
          style={{ left: "20%", top: "54%" }}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
        >
          <span className="rounded-full bg-stone-950/85 px-2.5 py-1 text-[10px] font-bold text-sky-200 ring-1 ring-sky-400/40">
            ⛲ Meydan Çeşmesi
          </span>
        </div>

        {/* Sağ Çınar Ağacı (Tam Sayfa Sosyal Medyayı Açar) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setGorunum("cinar_sohbet");
          }}
          style={{ left: "80%", top: "54%" }}
          className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-stone-950/90 px-3.5 py-2 text-xs font-black text-amber-200 shadow-xl ring-2 ring-amber-400 transition hover:scale-110"
        >
          🌳 Çınar Altı Sohbeti (Tam Sayfa Aç)
        </button>

        {/* MEYDANDA SABİT BEKLEYEN GÜNLÜK MİSAFİRLER (Dava veya Yeni İnsan Daveti) */}
        {gunlukOlayHazir ? (
          <button
            type="button"
            onClick={misafirlerinYaninaGit}
            style={{ left: "50%", top: "65%" }}
            className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-105"
          >
            <div className="flex flex-col items-center">
              {/* Başlarının Üstündeki Konuşma Balonu */}
              <div className="mb-1.5 max-w-[230px] rounded-2xl bg-stone-950/95 px-3 py-1.5 text-center text-[11px] font-bold text-amber-100 shadow-2xl ring-2 ring-amber-400">
                {diyalogAcik ? (
                  <span>💬 “{diyalogMetni.slice(0, 75)}…”</span>
                ) : aktifOlayTuru === "dava" && siradakiDava ? (
                  <span className="animate-pulse text-amber-300">
                    ⚖️ “Beyim bir anlaşmazlığımız var, yanımıza gelir misin?”
                  </span>
                ) : (
                  <span className="animate-pulse text-emerald-300">
                    🏡 “Selamünaleyküm! Köyünüze yerleşmek isteriz, yanımıza gel!”
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 rounded-full bg-amber-950/95 px-3.5 py-2 text-2xl shadow-2xl ring-2 ring-amber-400">
                {aktifOlayTuru === "dava" ? (
                  <>
                    <span>🧔</span>
                    <span className="text-base">⚖️</span>
                    <span>👴</span>
                  </>
                ) : (
                  <>
                    <span>🧳</span>
                    <span>🧔</span>
                    <span>🧕</span>
                  </>
                )}
              </div>

              <span className="mt-1 rounded-full bg-stone-950/95 px-3 py-0.5 text-[10px] font-black text-amber-200 ring-1 ring-amber-400/50">
                {aktifOlayTuru === "dava" && siradakiDava
                  ? `${siradakiDava.kisi} (Yanlarına Yürü)`
                  : `Yeni İnsanlar: ${gocmen.aday.ad} (Yanlarına Yürü)`}
              </span>
            </div>
          </button>
        ) : (
          /* Olay Çözüldüğünde Karakterler Kaybolur, 1 Gün Sonra Yenisi Gelir */
          <div
            style={{ left: "50%", top: "64%" }}
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="max-w-xs rounded-2xl bg-stone-950/90 px-4 py-2.5 text-center text-xs font-bold text-emerald-200 shadow-xl ring-1 ring-emerald-400/50">
              🌿 Bugünkü meydan meselesi çözüldü, köylüler evlerine döndü.
              <span className="mt-1 block text-[11px] text-amber-300">
                ⏳ Yeni dava veya yeni insanlar {kalanSaat} saat sonra (yarın) meydana gelecek!
              </span>
            </div>
          </div>
        )}

        {/* Öğrencinin Seçtiği Karakter */}
        <div
          style={{ left: `${oyuncu.x}%`, top: `${oyuncu.y}%` }}
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
        >
          <div className="flex flex-col items-center">
            <img
              src={karakter?.gorsel ?? "/assets/karakterler/erkek_alp.webp"}
              alt={karakter?.ad ?? "Oyuncu"}
              className="h-14 w-14 rounded-full object-cover shadow-2xl ring-3 ring-emerald-300 sm:h-16 sm:w-16"
            />
            <span className="mt-1 rounded-full bg-emerald-400 px-2.5 py-0.5 text-[10px] font-black text-stone-950 shadow">
              {oyun.kullanici?.ad ?? karakter?.ad ?? "Sen"}
            </span>
          </div>
        </div>
      </div>

      {/* REHBER TARZI ALT DİYALOG KUTUSU (Karakterlerin Yanına Gidince Açılır) */}
      {diyalogAcik && gunlukOlayHazir && (
        <div className="rounded-3xl bg-gradient-to-b from-stone-900 to-stone-950 p-4 shadow-2xl ring-2 ring-amber-400 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-3xl ring-2 ring-amber-400">
              {aktifOlayTuru === "dava" ? "⚖️" : "🏡"}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                  {aktifOlayTuru === "dava" && siradakiDava
                    ? `📢 Köylülerin Anlaşmazlığı: ${siradakiDava.baslik}`
                    : `📢 Köye Yerleşmek İsteyen Misafirler: ${gocmen.aday.ad}`}
                </span>
                <button
                  type="button"
                  onClick={() => setDiyalogAcik(false)}
                  className="text-xs font-bold text-stone-400 hover:text-white"
                >
                  ✕ Kapat
                </button>
              </div>

              <div
                onClick={() => setHarfSayisi(diyalogMetni.length)}
                className="min-h-[3.5rem] cursor-pointer rounded-2xl bg-stone-950/90 p-3.5 text-xs leading-relaxed text-amber-50 ring-1 ring-stone-800 sm:text-sm"
              >
                {diyalogMetni.slice(0, harfSayisi)}
                {yaziliyor && (
                  <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-amber-400 align-middle" />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                {yaziliyor ? (
                  <button
                    type="button"
                    onClick={() => setHarfSayisi(diyalogMetni.length)}
                    className="rounded-xl bg-stone-800 px-4 py-2 text-xs font-black text-amber-200 hover:bg-stone-700"
                  >
                    ⏩ Konuşmayı Tamamla
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setGorunum("karar_ekrani")}
                    className="animate-bounce rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 px-5 py-2.5 text-xs font-black text-stone-950 shadow-xl ring-2 ring-amber-200 hover:brightness-110 sm:text-sm"
                  >
                    {aktifOlayTuru === "dava"
                      ? "⚖️ Konuşma Bitti → Karar Verme Ekranına Geç"
                      : "🏡 Konuşma Bitti → Köye Davet Ekranına Geç"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================
// 3. TARLA (SULAMA), ORMAN (KURUMUŞ AĞAÇ KESME) VE TAŞ OCAĞI 2D SAHNESİ
// - 24 saatte 15 birim (her 96 dakikada 1 birim) dolar.
// - Eğer 0/15 ise (henüz hiç birikmemişse) sulama/toplama yapılamaz; dolum oranı görünür.
// - Tarla boş/yarı/tam dolu görsel durumunu da gösterir.
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
  const { durum, karakter } = oyun;
  const acik = kaynakAcikMi(k, durum.level);
  const dBilgi = oyun.dolum(k);
  const bekleyen = dBilgi.biriken;
  const kap = dBilgi.kapasite;
  const doluluk = dBilgi.dolumOrani;

  // İşçi görevlendirme hesapları
  const isciler = durum.isciler ?? { erzak: 1, kereste: 1, tas: 0 };
  const buradakiIsci = isciler[k] ?? 0;
  const toplamAtanan = (isciler.erzak ?? 0) + (isciler.kereste ?? 0) + (isciler.tas ?? 0);
  const toplamInsan = durum.envanter.insan ?? 5;
  const bostakiInsan = Math.max(0, toplamInsan - toplamAtanan);
  const gunlukHiz = Math.round(saatlikUretim(k, buradakiIsci) * 24);

  const [oyuncu, setOyuncu] = useState({ x: 24, y: 70 });
  const [sulananlar, setSulananlar] = useState({});
  const [agacVurus, setAgacVurus] = useState({});
  const [kayaVurus, setKayaVurus] = useState({});
  const [sahneBildirim, setSahneBildirim] = useState(null);

  const tarlaDurumGorseli =
    dBilgi.evre === "dolu"
      ? "/assets/binalar/tarla_dolu.webp"
      : dBilgi.evre === "yari"
      ? "/assets/binalar/tarla_yari.webp"
      : "/assets/binalar/tarla_bos.webp";

  const sahneyeTikla = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(86, Math.max(14, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(86, Math.max(30, ((e.clientY - rect.top) / rect.height) * 100));
    setOyuncu({ x: Math.round(x), y: Math.round(y) });
  };

  // TARLA: Ekin sulama ve biriken kaynağı toplama
  const ekinSula = async (ekin, e) => {
    e.stopPropagation();
    setOyuncu({ x: Math.max(16, ekin.x - 6), y: ekin.y + 4 });

    if (bekleyen <= 0) {
      setSahneBildirim(
        `⏳ Tarla henüz boş (0/${kap} · Dolum: %${doluluk}). 24 saatte 15 birim dolar; ilk 1 birimin hazır olmasına yaklaşık ${dBilgi.sonrakiBirimDakika ?? 96} dakika kaldı!`
      );
      return;
    }

    const yeni = { ...sulananlar, [ekin.id]: true };
    setSulananlar(yeni);
    const sonuc = await oyun.uretimEtkilesim("erzak");
    if (sonuc?.mesaj) {
      setSahneBildirim(sonuc.mesaj);
      setSulananlar({});
    }
  };

  // ORMAN: Kurumuş ağaç kesme ve biriken kaynağı toplama
  const agacaTikla = async (agac, e) => {
    e.stopPropagation();
    setOyuncu({ x: Math.max(16, agac.x - 6), y: agac.y + 6 });

    if (!agac.kurumus) {
      setSahneBildirim(
        "🌱 Yaş kesen baş keser! Yeşil ağaçlara dokunmayalım, sadece kurumuş kahverengi ağaçları bulup keselim."
      );
      return;
    }

    if (bekleyen <= 0) {
      setSahneBildirim(
        `⏳ Ormanda henüz kesilecek yeni odun birikmedi (0/${kap} · Dolum: %${doluluk}). 1 birim birikmesi için yaklaşık ${dBilgi.sonrakiBirimDakika ?? 96} dakika kaldı!`
      );
      return;
    }

    const mevcut = agacVurus[agac.id] ?? 0;
    if (mevcut === 0) {
      setAgacVurus({ ...agacVurus, [agac.id]: 1 });
      setSahneBildirim(`🪓 ${agac.ad} gövdesine ilk balta vuruşu! Kesip toplamak için 1 kez daha vur.`);
      return;
    }

    const sonuc = await oyun.uretimEtkilesim("kereste");
    setAgacVurus({});
    if (sonuc?.mesaj) {
      setSahneBildirim(sonuc.mesaj);
    }
  };

  // MADEN: Kaya kırma
  const kayayaTikla = async (kaya, e) => {
    e.stopPropagation();
    setOyuncu({ x: Math.max(16, kaya.x - 6), y: kaya.y + 6 });

    if (bekleyen <= 0) {
      setSahneBildirim(
        `⏳ Taş ocağında henüz çıkarılacak taş birikmedi (0/${kap} · Dolum: %${doluluk}). 1 birim birikmesi için yaklaşık ${dBilgi.sonrakiBirimDakika ?? 96} dakika kaldı!`
      );
      return;
    }

    const mevcut = kayaVurus[kaya.id] ?? 0;
    if (mevcut === 0) {
      setKayaVurus({ ...kayaVurus, [kaya.id]: 1 });
      setSahneBildirim(`⛏️ ${kaya.ad} çatladı! Kırıp toplamak için 1 kez daha kazma vur.`);
      return;
    }

    const sonuc = await oyun.uretimEtkilesim("tas");
    setKayaVurus({});
    if (sonuc?.mesaj) {
      setSahneBildirim(sonuc.mesaj);
    }
  };

  if (!acik) {
    return (
      <div className="rounded-3xl bg-stone-950/85 p-6 text-center ring-1 ring-amber-500/30">
        <div className="text-4xl">🔒</div>
        <h3 className="mt-2 text-lg font-black text-amber-100">
          {n.ikon} {n.ad} · Level {t.acilisLevel}&apos;de Açılır
        </h3>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ÜST PANEL: İŞÇİ GÖREVLENDİRME VE 24 SAATLİK DOLUM ORANI */}
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
              24 Saatte +{gunlukHiz} {t.ikon}
            </span>
          </div>

          <p className="my-2 text-xs text-amber-200/75">
            {buradakiIsci === 0
              ? "⚠️ Burada hiç çalışan yok! Dolum durmuş durumda, hemen en az 1 köylü görevlendir."
              : `1 işçi ile 24 saatte 15 birim (her 96 dakikada 1 birim) dolar. Ek işçiler dolumu hızlandırır.`}
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

        {/* Sağ Kutu: 24 Saatlik Dolum Oranı ve Görsel Evre */}
        <div className="flex flex-col justify-between rounded-3xl bg-stone-950/85 p-4 ring-1 ring-amber-500/30">
          <div className="flex items-center gap-3">
            {id === "tarla" && (
              <img
                src={tarlaDurumGorseli}
                alt="Tarla Doluluk Görseli"
                className="h-16 w-24 shrink-0 rounded-2xl object-cover ring-2 ring-amber-400/60"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="uppercase tracking-wider text-amber-300">⏳ 24 Saatlik Dolum Oranı</span>
                <span className="tabular-nums text-sm font-black text-amber-100">
                  %{doluluk} · ({bekleyen} / {kap} {t.ikon})
                </span>
              </div>
              <div className="mt-2 h-3.5 overflow-hidden rounded-full bg-stone-900 ring-1 ring-stone-800">
                <div
                  className={`h-full transition-all ${
                    doluluk >= 100 ? "bg-emerald-400" : bekleyen > 0 ? "bg-amber-400" : "bg-sky-500"
                  }`}
                  style={{ width: `${Math.max(doluluk, dBilgi.birimYuzdesi > 0 ? 4 : 0)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-amber-200/80">
                {bekleyen <= 0
                  ? `Henüz 1 birim bile dolmadı (Sıradaki 1 birim için %${dBilgi.birimYuzdesi} doldu · ~${dBilgi.sonrakiBirimDakika ?? 96} dk kaldı).`
                  : bekleyen >= kap
                  ? `🌟 Tamamen doldu (${kap}/${kap})! Sahadan sulayıp/kesip hemen toplayabilirsin.`
                  : `Şu an toplanabilir ${bekleyen} ${t.ad} hazır! Sonraki +1 birim için ~${dBilgi.sonrakiBirimDakika} dk kaldı.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={bekleyen <= 0 || oyun.bekliyor}
            onClick={() => oyun.topla(k)}
            className="mt-3 w-full rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 py-2.5 text-xs font-black text-stone-950 shadow-lg hover:brightness-110 disabled:from-stone-800 disabled:to-stone-800 disabled:text-stone-500 sm:text-sm"
          >
            {bekleyen > 0
              ? `${t.ikon} Biriken +${bekleyen} ${t.ad} Topla (Dolum: %${doluluk})`
              : `⏳ Henüz Birikmedi (Dolum: %${doluluk} · 0/${kap})`}
          </button>
        </div>
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

        {/* Görevlendirilmiş Köylü İşçiler */}
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

        {/* 1. TARLA: BOŞ / YARI DOLU / TAM DOLU DURUMUNA GÖRE EKİNLER */}
        {id === "tarla" &&
          TARLA_EKINLERI.map((ekin) => (
            <button
              key={ekin.id}
              type="button"
              onClick={(e) => ekinSula(ekin, e)}
              style={{ left: `${ekin.x}%`, top: `${ekin.y}%` }}
              className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 transition hover:scale-110"
            >
              <div
                className={`flex flex-col items-center rounded-2xl px-3 py-1.5 shadow-xl ring-2 ${
                  bekleyen <= 0
                    ? "bg-stone-900/85 text-stone-400 ring-stone-700"
                    : dBilgi.evre === "dolu"
                    ? "animate-bounce bg-emerald-950/95 text-emerald-200 ring-emerald-400"
                    : "animate-pulse bg-amber-950/95 text-amber-100 ring-amber-400"
                }`}
              >
                <span className="text-xl sm:text-2xl">
                  {bekleyen <= 0 ? "🟫⏳" : dBilgi.evre === "dolu" ? "🌾✨" : "🌱💧"}
                </span>
                <span className="text-[10px] font-black whitespace-nowrap">
                  {bekleyen <= 0
                    ? `Boş (%${doluluk})`
                    : `Sula & +${bekleyen} Mahsul Al`}
                </span>
              </div>
            </button>
          ))}

        {/* 2. ORMAN: KURUMUŞ KAHVERENGİ AĞAÇLAR VE CANLI YEŞİL AĞAÇLAR */}
        {id === "orman" &&
          ORMAN_AGACLARI.map((agac) => {
            const vurus = agacVurus[agac.id] ?? 0;
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
                      : bekleyen <= 0
                      ? "bg-stone-900/85 text-stone-400 ring-stone-700"
                      : "animate-pulse bg-amber-950/95 text-amber-100 ring-amber-400"
                  }`}
                >
                  <span className="text-2xl sm:text-3xl">
                    {!agac.kurumus ? "🌲" : vurus === 1 ? "🪓🍂" : "🍂"}
                  </span>
                  <span className="text-[10px] font-black whitespace-nowrap">
                    {!agac.kurumus
                      ? "Yaş Ağaç (Kesme)"
                      : bekleyen <= 0
                      ? `Bekliyor (%${doluluk})`
                      : vurus === 1
                      ? `1 Kez Daha Vur (+${bekleyen})`
                      : `Kurumuş Ağaç (Kes 🪓)`}
                  </span>
                </div>
              </button>
            );
          })}

        {/* 3. TAŞ OCAĞI: KAYA DAMARLARI */}
        {id === "maden" &&
          MADEN_KAYALARI.map((kaya) => {
            const vurus = kayaVurus[kaya.id] ?? 0;
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
                    bekleyen <= 0
                      ? "bg-stone-900/85 text-stone-400 ring-stone-700"
                      : "animate-pulse bg-stone-900/95 text-amber-100 ring-amber-400"
                  }`}
                >
                  <span className="text-2xl sm:text-3xl">⛰️⛏️</span>
                  <span className="text-[10px] font-black whitespace-nowrap">
                    {bekleyen <= 0
                      ? `Bekliyor (%${doluluk})`
                      : vurus === 1
                      ? `1 Kez Daha Vur (+${bekleyen})`
                      : `${kaya.ad} (Kır ⛏️)`}
                  </span>
                </div>
              </button>
            );
          })}

        {/* Öğrencinin Seçtiği Karakter */}
        <div
          style={{ left: `${oyuncu.x}%`, top: `${oyuncu.y}%` }}
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
        >
          <div className="flex flex-col items-center">
            <img
              src={karakter?.gorsel ?? "/assets/karakterler/erkek_alp.webp"}
              alt={karakter?.ad ?? "Oyuncu"}
              className="h-14 w-14 rounded-full object-cover shadow-2xl ring-3 ring-emerald-300 sm:h-16 sm:w-16"
            />
            <span className="mt-1 rounded-full bg-emerald-400 px-2.5 py-0.5 text-[10px] font-black text-stone-950 shadow">
              {oyun.kullanici?.ad ?? karakter?.ad ?? "Sen"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
