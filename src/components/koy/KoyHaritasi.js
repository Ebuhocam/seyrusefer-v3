"use client";
import { useEffect, useRef, useState } from "react";
import { ARSALAR, NOKTALAR, BINALAR, KAYNAKLAR } from "@/lib/oyun/sabitler";
import { depoKapasitesi, kaynakAcikMi } from "@/lib/oyun/kurallar";
import { useOyun } from "@/lib/oyun/useOyun";
import UstBar from "./UstBar";
import Panel from "./Panel";
import GelistiriciPaneli from "./GelistiriciPaneli";

const HARITA_ORAN = 1710 / 920;

export default function KoyHaritasi({ baslangic }) {
  const oyun = useOyun(baslangic);
  const kaydirRef = useRef(null);
  const [secim, setSecim] = useState(null); // { tur: 'bina'|'nokta', id }
  const [duzenle, setDuzenle] = useState(false);
  const [koordinat, setKoordinat] = useState(null);

  // Telefonda harita yatayda taşar: açılışta Otağ'ı ortala
  useEffect(() => {
    const el = kaydirRef.current;
    if (el && oyun.hazir) el.scrollLeft = (ARSALAR.otag.x / 100) * el.scrollWidth - el.clientWidth / 2;
  }, [oyun.hazir]);

  if (!oyun.hazir) {
    return <main className="fixed inset-0 grid place-items-center bg-[#1f3315] text-amber-100">Köy yükleniyor…</main>;
  }

  const { durum } = oyun;

  // Düzenleme modu: haritaya tıklanan noktanın % koordinatını göster
  const haritaTikla = (e) => {
    if (!duzenle) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (((e.clientX - r.left) / r.width) * 100).toFixed(1);
    const y = (((e.clientY - r.top) / r.height) * 100).toFixed(1);
    setKoordinat({ x, y });
  };

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#1f3315] select-none">
      <div ref={kaydirRef} className="absolute inset-0 overflow-auto overscroll-none">
        <div
          className="relative"
          style={{ width: `max(100vw, calc(100dvh * ${HARITA_ORAN}))`, aspectRatio: "1710 / 920" }}
          onClick={haritaTikla}
        >
          <img src="/assets/harita/koy.webp" alt="Köy" className="absolute inset-0 w-full h-full" draggable={false} />

          {/* ---- Binalar / boş arsalar ---- */}
          {Object.entries(ARSALAR).map(([id, a]) => {
            const seviye = durum.binalar[id] ?? 0;
            const bilgi = oyun.binaBilgisi(id);
            return seviye > 0 ? (
              <button
                key={id}
                onClick={() => setSecim({ tur: "bina", id })}
                className="absolute group"
                style={{ left: `${a.x}%`, top: `${a.y}%`, width: `${a.genislik}%`, transform: "translate(-50%, -80%)", zIndex: Math.round(a.y) }}
              >
                <img src={BINALAR[id].gorsel(seviye)} alt={BINALAR[id].ad} className="w-full drop-shadow-[0_8px_8px_rgba(0,0,0,0.45)] transition-transform group-hover:scale-105" draggable={false} />
                <span className="absolute left-1/2 -translate-x-1/2 -bottom-1 whitespace-nowrap rounded-full bg-stone-900/85 px-2 py-0.5 text-[11px] font-bold text-amber-100 ring-1 ring-amber-500/60">
                  {BINALAR[id].ad} · Lv.{seviye}
                  {bilgi.yapilabilir && <span className="ml-1 text-emerald-300">▲</span>}
                </span>
              </button>
            ) : (
              <BosArsa key={id} id={id} a={a} bilgi={bilgi} onClick={() => setSecim({ tur: "bina", id })} />
            );
          })}

          {/* ---- Sabit noktalar: pano, tarla, orman, maden, seyyah ---- */}
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
                  <span className={`mb-1 rounded-full px-2 py-0.5 text-xs font-black shadow-lg ${dolu ? "bg-red-600 text-white animate-bounce" : "bg-amber-300 text-stone-900"}`}>
                    {KAYNAKLAR[n.kaynak].ikon} +{bekleyen}
                  </span>
                )}
                {id === "pano" && oyun.levelAtlanabilir && (
                  <span className="mb-1 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-black text-white animate-bounce">Level Atla!</span>
                )}
                <span className={`grid h-9 w-9 place-items-center rounded-full text-lg shadow-lg ring-2 ${acik ? "bg-stone-900/80 ring-amber-400" : "bg-stone-700/80 ring-stone-500 grayscale"}`}>
                  {acik ? n.ikon : "🔒"}
                </span>
                <span className="mt-0.5 rounded bg-stone-900/80 px-1.5 text-[10px] font-bold text-amber-100">{n.ad}</span>
              </button>
            );
          })}
        </div>
      </div>

      <UstBar oyun={oyun} onLevelTikla={() => setSecim({ tur: "nokta", id: "pano" })} />

      {oyun.mesaj && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-[450] rounded-full px-4 py-1.5 text-xs font-bold shadow-xl ${
            oyun.mesaj.tur === "hata" ? "bg-red-700 text-white" : "bg-emerald-600 text-white"
          }`}
        >
          {oyun.mesaj.metin}
        </div>
      )}

      {secim && <Panel secim={secim} oyun={oyun} kapat={() => setSecim(null)} />}

      {oyun.gelistirici && <GelistiriciPaneli oyun={oyun} duzenle={duzenle} setDuzenle={setDuzenle} />}

      {duzenle && koordinat && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[300] rounded-lg bg-black/85 px-4 py-2 font-mono text-sm text-lime-300">
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
            ? "bg-emerald-600 ring-emerald-200 animate-pulse"
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
