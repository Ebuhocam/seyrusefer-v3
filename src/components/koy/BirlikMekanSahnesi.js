"use client";
import { useState } from "react";

/**
 * Birlik binalarının 2D iç mekânı: boyalı resim, üzerinde tıklanır noktalar ve yürüyen karakter.
 * Bir noktaya tıklanınca karakter oraya yürür, ardından sayfa ilgili bölüme kayar.
 */
export default function BirlikMekanSahnesi({ resim, baslik, altBaslik, noktalar = [], oyun, children }) {
  const karakter = oyun?.karakter;
  const [konum, setKonum] = useState({ x: 50, y: 82 });

  const noktayaGit = (n) => {
    setKonum(n.yuru ?? { x: n.x, y: Math.min(88, n.y + 18) });
    if (n.onTikla) {
      window.setTimeout(() => n.onTikla(), 600);
      return;
    }
    window.setTimeout(() => {
      document.getElementById(n.hedef)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 650);
  };

  return (
    <div className="space-y-4">
      <div className="tezhip overflow-hidden rounded-3xl p-2 sm:p-3">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 px-2 pt-1">
          <h3 className="font-display text-lg text-amber-100 sm:text-xl">{baslik}</h3>
          {altBaslik ? <p className="text-xs text-amber-200/80">{altBaslik}</p> : null}
        </div>
        <div
          className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl ring-1 ring-amber-500/40"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const x = Math.min(90, Math.max(10, ((e.clientX - r.left) / r.width) * 100));
            const y = Math.min(92, Math.max(60, ((e.clientY - r.top) / r.height) * 100));
            setKonum({ x: Math.round(x), y: Math.round(y) });
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resim} alt={baslik} draggable={false} className="absolute inset-0 h-full w-full object-cover select-none" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-950/45 via-transparent to-transparent" />

          {noktalar.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                noktayaGit(n);
              }}
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
              className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 transition hover:scale-110"
            >
              <span
                className={`flex flex-col items-center rounded-2xl px-2.5 py-1 shadow-xl ring-2 sm:px-3 sm:py-1.5 ${
                  n.vurgu ? "motion-safe:animate-pulse bg-amber-500 text-stone-950 ring-amber-200" : "bg-stone-900/90 text-amber-100 ring-amber-400/80"
                }`}
              >
                <span className="text-lg sm:text-2xl" aria-hidden="true">{n.ikon}</span>
                <span className="text-[10px] font-black whitespace-nowrap sm:text-xs">{n.etiket}</span>
              </span>
            </button>
          ))}

          <div
            style={{ left: `${konum.x}%`, top: `${konum.y}%` }}
            className="pointer-events-none absolute z-30 flex -translate-x-1/2 -translate-y-[82%] flex-col items-center transition-all duration-500 ease-out"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={karakter?.gorsel ?? "/assets/karakterler/ahmet.webp"}
              alt={karakter?.ad ?? "Karakter"}
              draggable={false}
              className="h-16 w-auto object-contain drop-shadow-[0_10px_12px_rgba(0,0,0,0.6)] sm:h-24"
            />
            <span className="-mt-1 rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-black whitespace-nowrap text-stone-950 shadow">
              {oyun?.kullanici?.ad ?? "Sen"}
            </span>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
