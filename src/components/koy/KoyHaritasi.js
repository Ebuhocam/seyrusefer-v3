"use client";
import { useEffect, useRef, useState } from "react";
import {
  ARSALAR,
  NOKTALAR,
  BINALAR,
  BIRLIK_BINALARI,
  BOLGELER,
  KAYNAKLAR,
  BIRLIK_ACILIS_LEVEL,
  ALAN_MUCADELESI_LEVEL,
} from "@/lib/oyun/sabitler";
import { depoKapasitesi, kaynakAcikMi } from "@/lib/oyun/kurallar";
import { useOyun } from "@/lib/oyun/useOyun";
import UstBar from "./UstBar";
import Panel from "./Panel";
import GelistiriciPaneli from "./GelistiriciPaneli";
import RehberKarakter, { REHBER_ADIMLARI, ilkEksikRehberAdimi } from "./RehberKarakter";

const HARITA_ORAN = 1710 / 920;

export default function KoyHaritasi({ baslangic }) {
  const oyun = useOyun(baslangic);
  const kaydirRef = useRef(null);
  const [katman, setKatman] = useState("koy"); // 'koy' | 'birlik' | 'harita'
  const [secim, setSecim] = useState(null); // { tur: 'bina'|'nokta'|'birlikBina'|'bolge'|'birlik', id }
  const [birlikOzeti, setBirlikOzeti] = useState(null);
  const [duzenle, setDuzenle] = useState(false);
  const [koordinat, setKoordinat] = useState(null);
  const [rehberAcik, setRehberAcik] = useState(
    () => (baslangic?.durum?.binalar?.mektep ?? 0) === 0 || (baslangic?.durum?.level ?? 1) === 1
  );
  const [rehberAdimIndeks, setRehberAdimIndeks] = useState(() =>
    ilkEksikRehberAdimi(
      baslangic?.durum ?? {},
      [],
      (baslangic?.durum?.binalar?.mektep ?? 0) === 0
    )
  );

  const aktifRehberAdimi = REHBER_ADIMLARI[rehberAdimIndeks] ?? REHBER_ADIMLARI[0];
  const rehberKameraHedefleri = rehberAcik && katman === "koy" ? aktifRehberAdimi?.hedefler ?? [] : [];
  // Tanıtım turunda "Buraya Tıkla" oku çıkmaz; sadece 2. Bölüm (Yapılacak İşler) adımında çıkar
  const rehberHedefleri =
    rehberAcik && katman === "koy" && aktifRehberAdimi?.bolum === "gorev"
      ? aktifRehberAdimi?.hedefler ?? []
      : [];
  const ilkRehberHedefi = rehberKameraHedefleri[0] ?? null;

  // Harita açılışta veya rehber adımı değiştiğinde hedefe hem yatay hem dikey olarak yumuşakça yaklaşır
  useEffect(() => {
    const el = kaydirRef.current;
    const haritaEl = el?.querySelector("[data-harita-tuval]");
    if (!el || !haritaEl || !oyun.hazir) return;
    let hedefX = ARSALAR.otag.x;
    let hedefY = ARSALAR.otag.y;
    if (ilkRehberHedefi) {
      const k =
        ilkRehberHedefi.tur === "bina"
          ? ARSALAR[ilkRehberHedefi.id]
          : NOKTALAR[ilkRehberHedefi.id];
      if (k) {
        hedefX = k.x;
        hedefY = k.y;
      }
    }
    const haritaSol = haritaEl.offsetLeft + (hedefX / 100) * haritaEl.clientWidth;
    const haritaUst = haritaEl.offsetTop + (hedefY / 100) * haritaEl.clientHeight;
    // Altta rehber açıkken hedef ekranın üst-orta kısmında kalsın ki rehber kutusunun altında kalmasın
    const dikeyOfset = rehberAcik ? el.clientHeight * 0.35 : el.clientHeight * 0.5;
    el.scrollTo({
      left: Math.max(0, haritaSol - el.clientWidth / 2),
      top: Math.max(0, haritaUst - dikeyOfset),
      behavior: "smooth",
    });
  }, [oyun.hazir, katman, ilkRehberHedefi, rehberAcik]);

  // 2. veya 3. katmana geçildiğinde birlik binaları ve bölge liderlerini çek
  useEffect(() => {
    if (katman === "koy") return;
    let iptal = false;
    fetch("/api/birlik")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!iptal && j) setBirlikOzeti(j);
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, [katman, secim]);

  if (!oyun.hazir) {
    return <main className="fixed inset-0 grid place-items-center bg-[#1f3315] text-amber-100">Köy yükleniyor…</main>;
  }

  const { durum } = oyun;

  const katmanDegistir = (yeniKatman) => {
    if (yeniKatman === "birlik" && durum.level < BIRLIK_ACILIS_LEVEL) {
      oyun.setMesaj({
        tur: "hata",
        metin: `🏕️ Birlik Alanı Level ${BIRLIK_ACILIS_LEVEL}'te açılır!`,
      });
      setSecim({ tur: "birlik", sekme: "birlik" });
      return;
    }
    if (yeniKatman === "harita" && durum.level < ALAN_MUCADELESI_LEVEL) {
      oyun.setMesaj({
        tur: "hata",
        metin: `🗺️ Genel Sancak Haritası Level ${ALAN_MUCADELESI_LEVEL}'da açılır!`,
      });
      setSecim({ tur: "birlik", sekme: "fetih" });
      return;
    }
    setSecim(null);
    setKatman(yeniKatman);
  };

  // Düzenleme modu: haritaya tıklanan noktanın % koordinatını göster
  const haritaTikla = (e) => {
    if (!duzenle) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (((e.clientX - r.left) / r.width) * 100).toFixed(1);
    const y = (((e.clientY - r.top) / r.height) * 100).toFixed(1);
    setKoordinat({ x, y });
  };

  const arkaPlanGorseli =
    katman === "birlik"
      ? "/assets/harita/birlik_alani.webp"
      : katman === "harita"
      ? "/assets/harita/genel_harita.webp"
      : "/assets/harita/koy.webp";

  const bolgeVerileri = birlikOzeti?.bolgeler ?? BOLGELER;
  const birlikBinalari = birlikOzeti?.birlik?.binalar ?? {};

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#162413] select-none">
      <div ref={kaydirRef} className="absolute inset-0 overflow-auto overscroll-none">
        {/* Sisli Çerçeve Alanı: Haritanın etrafında sisli keşif boşluğu bırakır, en alttaki Haberci rahatça yukarı kaydırılır */}
        <div
          className="relative flex items-center justify-center px-[18vw] py-[28dvh]"
          style={{
            minWidth: `calc(max(100vw, calc(100dvh * ${HARITA_ORAN})) + 36vw)`,
            minHeight: "156dvh",
            background:
              "radial-gradient(circle at center, rgba(35,58,28,0.95) 0%, rgba(18,30,16,0.98) 70%, rgba(10,16,10,1) 100%)",
          }}
        >
          {/* Harita Dışı Sis Bulutları Dokusu */}
          <div className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(ellipse_at_top,_rgba(214,211,209,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(214,211,209,0.22),_transparent_55%)]" />

          <div
            data-harita-tuval="true"
            className="relative overflow-hidden rounded-[2.75rem] shadow-[0_0_90px_rgba(0,0,0,0.85)] ring-4 ring-stone-800/80"
            style={{ width: `max(100vw, calc(100dvh * ${HARITA_ORAN}))`, aspectRatio: "1710 / 920" }}
            onClick={haritaTikla}
          >
            <img
              src={arkaPlanGorseli}
              alt={katman === "birlik" ? "Birlik Alanı" : katman === "harita" ? "Genel Harita" : "Köy"}
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />

            {/* Harita Kenarları Yumuşak Sis Geçişi (Fog of War Vignette) */}
            <div
              className="pointer-events-none absolute inset-0 z-[190]"
              style={{
                boxShadow: "inset 0 0 65px 28px rgba(22, 36, 19, 0.82)",
              }}
            />

          {/* ================= 1. KATMAN: KENDİ KÖYÜM ================= */}
          {katman === "koy" && (
            <>
              {/* Köy Binaları / Boş Arsalar */}
              {Object.entries(ARSALAR).map(([id, a]) => {
                const seviye = durum.binalar[id] ?? 0;
                const bilgi = oyun.binaBilgisi(id);
                const rehberVurgulu = rehberHedefleri.some((h) => h.tur === "bina" && h.id === id);
                const kameraOdakli = rehberKameraHedefleri.some((h) => h.tur === "bina" && h.id === id);
                return seviye > 0 ? (
                  <button
                    key={id}
                    onClick={() => setSecim({ tur: "bina", id })}
                    className={`group absolute ${rehberVurgulu || kameraOdakli ? "z-[240]" : ""}`}
                    style={{
                      left: `${a.x}%`,
                      top: `${a.y}%`,
                      width: `${a.genislik}%`,
                      transform: "translate(-50%, -80%)",
                      zIndex: rehberVurgulu || kameraOdakli ? 240 : Math.round(a.y),
                    }}
                  >
                    {rehberVurgulu && (
                      <span className="pointer-events-none absolute -top-11 left-1/2 z-30 -translate-x-1/2 animate-bounce whitespace-nowrap rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-stone-950 shadow-xl ring-2 ring-white">
                        👇 Buraya Tıkla!
                      </span>
                    )}
                    <img
                      src={BINALAR[id].gorsel(seviye)}
                      alt={BINALAR[id].ad}
                      className={`w-full drop-shadow-[0_8px_8px_rgba(0,0,0,0.45)] transition-transform duration-200 group-hover:-translate-y-1 group-hover:scale-110 ${
                        rehberVurgulu || kameraOdakli ? "rounded-3xl ring-4 ring-amber-300" : ""
                      }`}
                      draggable={false}
                    />
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-stone-900/90 px-2 py-0.5 text-[11px] font-bold text-amber-100 ring-1 ring-amber-500/60">
                      {BINALAR[id].ad} · {BINALAR[id].konut ? `${seviye}. Kat` : `Lv.${seviye}`}
                      {bilgi.yapilabilir && <span className="ml-1 text-emerald-300">▲</span>}
                    </span>
                  </button>
                ) : (
                  <BosArsa
                    key={id}
                    id={id}
                    a={a}
                    bilgi={bilgi}
                    rehberVurgulu={rehberVurgulu}
                    kameraOdakli={kameraOdakli}
                    onClick={() => setSecim({ tur: "bina", id })}
                  />
                );
              })}

              {/* Sabit Noktalar: Pano, Tarla (3 Görsel Evreli), Orman, Maden, Haberci */}
              {Object.entries(NOKTALAR).map(([id, n]) => {
                const acik = n.kaynak ? kaynakAcikMi(n.kaynak, durum.level) : (n.acilisLevel ?? 1) <= durum.level;
                const dBilgi = n.kaynak ? oyun.dolum(n.kaynak) : null;
                const bekleyen = dBilgi?.biriken ?? 0;
                const dolumOrani = dBilgi?.dolumOrani ?? 0;
                const kapasite = dBilgi?.kapasite ?? 15;
                const dolu = n.kaynak && acik && bekleyen >= kapasite;
                const rehberVurgulu = rehberHedefleri.some((h) => h.tur === "nokta" && h.id === id);
                const kameraOdakli = rehberKameraHedefleri.some((h) => h.tur === "nokta" && h.id === id);

                const tarlaGorseli =
                  id === "tarla"
                    ? dBilgi?.evre === "dolu"
                      ? "/assets/binalar/tarla_dolu.webp"
                      : dBilgi?.evre === "yari"
                      ? "/assets/binalar/tarla_yari.webp"
                      : "/assets/binalar/tarla_bos.webp"
                    : null;

                return (
                  <button
                    key={id}
                    onClick={() => setSecim({ tur: "nokta", id })}
                    className="group absolute flex flex-col items-center transition-transform duration-200 hover:-translate-y-1.5 hover:scale-110"
                    style={{
                      left: `${n.x}%`,
                      top: `${n.y}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: rehberVurgulu || kameraOdakli ? 245 : 205,
                    }}
                  >
                    {rehberVurgulu && (
                      <span className="mb-1 animate-bounce whitespace-nowrap rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-stone-950 shadow-xl ring-2 ring-white">
                        👇 Buraya Tıkla!
                      </span>
                    )}

                    {/* Üretim Alanı Canlı Dolum Oranı Rozeti */}
                    {n.kaynak && acik && (
                      <div className="mb-1 flex flex-col items-center rounded-xl bg-stone-950/90 px-2 py-1 shadow-lg ring-1 ring-amber-400/50">
                        <span
                          className={`text-[10px] font-black tabular-nums ${
                            dolu
                              ? "animate-pulse text-red-400"
                              : bekleyen > 0
                              ? "text-emerald-300"
                              : "text-amber-200/80"
                          }`}
                        >
                          {KAYNAKLAR[n.kaynak].ikon} {bekleyen}/{kapasite} · %{dolumOrani}
                        </span>
                        <div className="mt-0.5 h-1.5 w-16 overflow-hidden rounded-full bg-stone-800">
                          <div
                            className={`h-full transition-all ${
                              dolu ? "bg-red-500" : bekleyen > 0 ? "bg-emerald-400" : "bg-amber-400"
                            }`}
                            style={{ width: `${dolumOrani}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {id === "pano" && oyun.levelAtlanabilir && (
                      <span className="mb-1 animate-bounce rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-black text-white">
                        Level Atla!
                      </span>
                    )}

                    {/* Tarla için Boş / Yarı Dolu / Tam Dolu Görsel; Orman ve Diğerleri İçin Öne Gelme Efektli Görsel/Rozet */}
                    {tarlaGorseli ? (
                      <div
                        className={`relative h-16 w-24 overflow-hidden rounded-2xl border-2 bg-stone-900 shadow-[0_10px_14px_rgba(0,0,0,0.6)] transition-transform duration-200 group-hover:scale-105 sm:h-20 sm:w-28 ${
                          rehberVurgulu || kameraOdakli ? "border-amber-300 ring-4 ring-amber-300" : "border-amber-500/80"
                        }`}
                      >
                        <img
                          src={tarlaGorseli}
                          alt="Tarla Durumu"
                          draggable={false}
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute right-1 bottom-1 rounded bg-stone-950/85 px-1.5 py-0.5 text-[9px] font-black text-amber-200">
                          {dBilgi?.evre === "dolu" ? "🌾 Tam Dolu" : dBilgi?.evre === "yari" ? "🌱 Yeşeriyor" : "🟫 Boş"}
                        </span>
                      </div>
                    ) : (
                      <span
                        className={`grid h-11 w-11 place-items-center rounded-2xl text-xl shadow-[0_8px_12px_rgba(0,0,0,0.55)] ring-2 transition-transform duration-200 group-hover:scale-110 sm:h-12 sm:w-12 sm:text-2xl ${
                          rehberVurgulu || kameraOdakli
                            ? "scale-125 bg-amber-400 text-stone-950 ring-4 ring-white"
                            : acik
                            ? "bg-stone-900/90 ring-amber-400 group-hover:bg-stone-800"
                            : "bg-stone-700/80 ring-stone-500 grayscale"
                        }`}
                      >
                        {acik ? n.ikon : "🔒"}
                      </span>
                    )}

                    <span className="mt-1 rounded-full bg-stone-900/95 px-2.5 py-0.5 text-[11px] font-black text-amber-100 shadow ring-1 ring-amber-500/50">
                      {n.ad}
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {/* ================= 2. KATMAN: BİRLİK ALANI (KÜLLİYE) ================= */}
          {katman === "birlik" && (
            <>
              {Object.entries(BIRLIK_BINALARI).map(([id, b]) => {
                const seviye = birlikBinalari[id] ?? 1;
                return (
                  <button
                    key={id}
                    onClick={() => setSecim({ tur: "birlikBina", id })}
                    className="group absolute"
                    style={{
                      left: `${b.x}%`,
                      top: `${b.y}%`,
                      width: `${b.genislik}%`,
                      transform: "translate(-50%, -65%)",
                      zIndex: Math.round(b.y),
                    }}
                  >
                    <img
                      src={b.gorsel(seviye)}
                      alt={b.ad}
                      className="w-full drop-shadow-[0_10px_10px_rgba(0,0,0,0.55)] transition-transform group-hover:scale-105"
                      draggable={false}
                    />
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-stone-900/95 px-2.5 py-0.5 text-xs font-black text-amber-100 shadow-lg ring-1 ring-amber-400/70">
                      {b.ad} · Lv.{seviye}
                    </span>
                  </button>
                );
              })}

              {/* Birlik Külliye Bilgi Rozeti */}
              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-2xl bg-stone-950/90 px-4 py-2 text-center text-xs text-amber-100 shadow-xl ring-1 ring-amber-500/50">
                {birlikOzeti?.birlik ? (
                  <span>
                    🚩 <b>{birlikOzeti.birlik.ad}</b> Külliyesi · 🕌 Bugün <b>{birlikOzeti.birlik.namazToplam ?? 0}</b> vakit namaz · ⚡ Disiplin{" "}
                    <b>%{birlikOzeti.birlik.disiplinOrani}</b>
                  </span>
                ) : (
                  <span>🏕️ Bir birliğe katılmak veya yeni birlik kurmak için ortadaki <b>Birlik Otağı</b>&apos;na tıkla!</span>
                )}
              </div>
            </>
          )}

          {/* ================= 3. KATMAN: GENEL SANCAK HARİTASI ================= */}
          {katman === "harita" && (
            <>
              {bolgeVerileri.map((b) => {
                const koordinatBilgisi = BOLGELER.find((x) => x.id === b.id) ?? b;
                return (
                  <button
                    key={b.id}
                    onClick={() => setSecim({ tur: "bolge", id: b.id })}
                    className="group absolute flex flex-col items-center"
                    style={{
                      left: `${koordinatBilgisi.x}%`,
                      top: `${koordinatBilgisi.y}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: 210,
                    }}
                  >
                    {b.lider ? (
                      <span
                        className="mb-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-black text-white shadow-lg ring-1 ring-white/50"
                        style={{ backgroundColor: b.lider.renk }}
                      >
                        🚩 {b.lider.ad} ({b.lider.guc})
                      </span>
                    ) : (
                      <span className="mb-1 whitespace-nowrap rounded-full bg-stone-900/90 px-2 py-0.5 text-[10px] font-bold text-amber-200 ring-1 ring-amber-500/40">
                        ⚔️ Sahipsiz Sancak
                      </span>
                    )}

                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-900/90 text-2xl shadow-xl ring-2 ring-amber-400 transition-transform group-hover:scale-110">
                      {b.ikon}
                    </span>
                    <span className="mt-1 whitespace-nowrap rounded-lg bg-stone-950/90 px-2.5 py-0.5 text-xs font-black text-amber-100 shadow ring-1 ring-amber-500/50">
                      {b.ad}
                    </span>
                  </button>
                );
              })}

              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-2xl bg-stone-950/90 px-4 py-2 text-center text-xs text-amber-100 shadow-xl ring-1 ring-amber-500/50">
                🗺️ <b>Genel Sancak Haritası:</b> Bir bölgeye tıklayarak birlik kasasındaki kaynaklar ve manevi disiplin gücünüzle hamle yapın!
              </div>
            </>
          )}
          </div>
        </div>
      </div>

      <UstBar
        oyun={oyun}
        katman={katman}
        onKatmanSec={katmanDegistir}
        onLevelTikla={() => setSecim({ tur: "nokta", id: "pano" })}
        rehberAcik={rehberAcik}
        onRehberAcKapat={() => {
          if (!rehberAcik) {
            setRehberAdimIndeks(ilkEksikRehberAdimi(durum, oyun.gorevler));
            setKatman("koy");
            setRehberAcik(true);
          } else {
            setRehberAcik(false);
          }
        }}
      />

      {!secim && katman === "koy" && (
        <RehberKarakter
          acik={rehberAcik}
          adimIndeks={rehberAdimIndeks}
          setAdimIndeks={setRehberAdimIndeks}
          onKapat={() => setRehberAcik(false)}
          onHedefSec={(hedef) => {
            if (hedef) setSecim({ tur: hedef.tur, id: hedef.id });
          }}
          durum={durum}
          gorevler={oyun.gorevler}
        />
      )}

      {oyun.mesaj && (
        <div
          className={`fixed top-16 left-1/2 z-[450] -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-bold shadow-xl ${
            oyun.mesaj.tur === "hata" ? "bg-red-700 text-white" : "bg-emerald-600 text-white"
          }`}
        >
          {oyun.mesaj.metin}
        </div>
      )}

      {secim && (
        <Panel
          secim={secim}
          oyun={oyun}
          onSecimDegistir={setSecim}
          kapat={() => {
            setSecim(null);
            if (rehberAcik) {
              setRehberAdimIndeks(ilkEksikRehberAdimi(oyun.durum, oyun.gorevler, false));
            }
          }}
        />
      )}

      {oyun.gelistirici && <GelistiriciPaneli oyun={oyun} duzenle={duzenle} setDuzenle={setDuzenle} />}

      {duzenle && koordinat && (
        <div className="fixed bottom-4 left-1/2 z-[300] -translate-x-1/2 rounded-lg bg-black/85 px-4 py-2 font-mono text-sm text-lime-300">
          x: {koordinat.x}% · y: {koordinat.y}%
        </div>
      )}
    </main>
  );
}

function BosArsa({ id, a, bilgi, rehberVurgulu = false, kameraOdakli = false, onClick }) {
  const insaEdilebilir = bilgi.levelYeterli;
  return (
    <button
      onClick={onClick}
      className="group absolute flex flex-col items-center transition-transform duration-200 hover:-translate-y-1 hover:scale-110"
      style={{
        left: `${a.x}%`,
        top: `${a.y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: rehberVurgulu || kameraOdakli ? 245 : Math.round(a.y),
      }}
    >
      {rehberVurgulu && (
        <span className="mb-1.5 animate-bounce whitespace-nowrap rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-stone-950 shadow-xl ring-2 ring-white">
          👇 Buraya Tıkla!
        </span>
      )}
      <span
        className={`grid h-10 w-10 place-items-center rounded-full text-lg shadow-lg ring-2 ${
          rehberVurgulu || kameraOdakli
            ? "scale-125 bg-emerald-500 ring-4 ring-amber-300"
            : bilgi.yapilabilir
            ? "animate-pulse bg-emerald-600 ring-emerald-200"
            : insaEdilebilir
            ? "bg-amber-600/90 ring-amber-200"
            : "bg-stone-800/70 ring-stone-400"
        }`}
      >
        {insaEdilebilir ? "🔨" : "🔒"}
      </span>
      <span className="mt-0.5 whitespace-nowrap rounded bg-stone-900/80 px-1.5 text-[10px] font-bold text-amber-100">
        {BINALAR[id].ad}
        {!insaEdilebilir && ` · Lv.${bilgi.gerekenLevel}`}
      </span>
    </button>
  );
}
