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

const HARITA_ORAN = 1710 / 920;

export default function KoyHaritasi({ baslangic }) {
  const oyun = useOyun(baslangic);
  const kaydirRef = useRef(null);
  const [katman, setKatman] = useState("koy"); // 'koy' | 'birlik' | 'harita'
  const [secim, setSecim] = useState(null); // { tur: 'bina'|'nokta'|'birlikBina'|'bolge'|'birlik', id }
  const [birlikOzeti, setBirlikOzeti] = useState(null);
  const [duzenle, setDuzenle] = useState(false);
  const [koordinat, setKoordinat] = useState(null);

  // Telefonda harita yatayda taşar: açılışta Oba'yı ortala
  useEffect(() => {
    const el = kaydirRef.current;
    if (el && oyun.hazir) el.scrollLeft = (ARSALAR.otag.x / 100) * el.scrollWidth - el.clientWidth / 2;
  }, [oyun.hazir, katman]);

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
    <main className="fixed inset-0 overflow-hidden bg-[#1f3315] select-none">
      <div ref={kaydirRef} className="absolute inset-0 overflow-auto overscroll-none">
        <div
          className="relative"
          style={{ width: `max(100vw, calc(100dvh * ${HARITA_ORAN}))`, aspectRatio: "1710 / 920" }}
          onClick={haritaTikla}
        >
          <img
            src={arkaPlanGorseli}
            alt={katman === "birlik" ? "Birlik Alanı" : katman === "harita" ? "Genel Harita" : "Köy"}
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />

          {/* ================= 1. KATMAN: KENDİ KÖYÜM ================= */}
          {katman === "koy" && (
            <>
              {/* Köy Binaları / Boş Arsalar */}
              {Object.entries(ARSALAR).map(([id, a]) => {
                const seviye = durum.binalar[id] ?? 0;
                const bilgi = oyun.binaBilgisi(id);
                return seviye > 0 ? (
                  <button
                    key={id}
                    onClick={() => setSecim({ tur: "bina", id })}
                    className="group absolute"
                    style={{
                      left: `${a.x}%`,
                      top: `${a.y}%`,
                      width: `${a.genislik}%`,
                      transform: "translate(-50%, -80%)",
                      zIndex: Math.round(a.y),
                    }}
                  >
                    <img
                      src={BINALAR[id].gorsel(seviye)}
                      alt={BINALAR[id].ad}
                      className="w-full drop-shadow-[0_8px_8px_rgba(0,0,0,0.45)] transition-transform group-hover:scale-105"
                      draggable={false}
                    />
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-stone-900/90 px-2 py-0.5 text-[11px] font-bold text-amber-100 ring-1 ring-amber-500/60">
                      {BINALAR[id].ad} · Lv.{seviye}
                      {bilgi.yapilabilir && <span className="ml-1 text-emerald-300">▲</span>}
                    </span>
                  </button>
                ) : (
                  <BosArsa key={id} id={id} a={a} bilgi={bilgi} onClick={() => setSecim({ tur: "bina", id })} />
                );
              })}

              {/* Sabit Noktalar: Pano, Tarla, Orman, Maden, Haberci */}
              {Object.entries(NOKTALAR).map(([id, n]) => {
                const acik = n.kaynak ? kaynakAcikMi(n.kaynak, durum.level) : (n.acilisLevel ?? 1) <= durum.level;
                const bekleyen = n.kaynak ? oyun.bekleyen(n.kaynak) : 0;
                const dolu = n.kaynak && acik && bekleyen >= depoKapasitesi(n.kaynak, durum.binalar.otag);
                return (
                  <button
                    key={id}
                    onClick={() => setSecim({ tur: "nokta", id })}
                    className="absolute flex flex-col items-center"
                    style={{ left: `${n.x}%`, top: `${n.y}%`, transform: "translate(-50%, -50%)", zIndex: 200 }}
                  >
                    {n.kaynak && acik && bekleyen > 0 && (
                      <span
                        className={`mb-1 rounded-full px-2 py-0.5 text-xs font-black shadow-lg ${
                          dolu ? "animate-bounce bg-red-600 text-white" : "bg-amber-300 text-stone-900"
                        }`}
                      >
                        {KAYNAKLAR[n.kaynak].ikon} +{bekleyen}
                      </span>
                    )}
                    {id === "pano" && oyun.levelAtlanabilir && (
                      <span className="mb-1 animate-bounce rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-black text-white">
                        Level Atla!
                      </span>
                    )}
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-full text-lg shadow-lg ring-2 ${
                        acik ? "bg-stone-900/85 ring-amber-400" : "bg-stone-700/80 ring-stone-500 grayscale"
                      }`}
                    >
                      {acik ? n.ikon : "🔒"}
                    </span>
                    <span className="mt-0.5 rounded bg-stone-900/85 px-1.5 text-[10px] font-bold text-amber-100">
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

      <UstBar
        oyun={oyun}
        katman={katman}
        onKatmanSec={katmanDegistir}
        onLevelTikla={() => setSecim({ tur: "nokta", id: "pano" })}
      />

      {oyun.mesaj && (
        <div
          className={`fixed top-16 left-1/2 z-[450] -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-bold shadow-xl ${
            oyun.mesaj.tur === "hata" ? "bg-red-700 text-white" : "bg-emerald-600 text-white"
          }`}
        >
          {oyun.mesaj.metin}
        </div>
      )}

      {secim && <Panel secim={secim} oyun={oyun} kapat={() => setSecim(null)} />}

      {oyun.gelistirici && <GelistiriciPaneli oyun={oyun} duzenle={duzenle} setDuzenle={setDuzenle} />}

      {duzenle && koordinat && (
        <div className="fixed bottom-4 left-1/2 z-[300] -translate-x-1/2 rounded-lg bg-black/85 px-4 py-2 font-mono text-sm text-lime-300">
          x: {koordinat.x}% · y: {koordinat.y}%
        </div>
      )}
    </main>
  );
}

function BosArsa({ id, a, bilgi, onClick }) {
  const insaEdilebilir = bilgi.levelYeterli;
  return (
    <button
      onClick={onClick}
      className="absolute flex flex-col items-center"
      style={{ left: `${a.x}%`, top: `${a.y}%`, transform: "translate(-50%, -50%)", zIndex: Math.round(a.y) }}
    >
      <span
        className={`grid h-10 w-10 place-items-center rounded-full text-lg shadow-lg ring-2 ${
          bilgi.yapilabilir
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
