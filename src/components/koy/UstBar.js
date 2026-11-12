"use client";
import { KAYNAKLAR } from "@/lib/oyun/sabitler";
import { kaynakAcikMi } from "@/lib/oyun/kurallar";

export default function UstBar({ oyun, onLevelTikla }) {
  const { durum, level } = oyun;
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-[250] flex items-start justify-between gap-1.5 p-2 sm:p-3">
      <button
        onClick={onLevelTikla}
        className="pointer-events-auto flex min-w-0 shrink items-center gap-1.5 rounded-2xl bg-stone-900/85 py-1 pl-1 pr-2.5 text-left shadow-xl ring-1 ring-amber-500/50 backdrop-blur sm:gap-2 sm:py-1.5 sm:pl-1.5 sm:pr-3"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 font-black text-stone-900 sm:h-10 sm:w-10 sm:text-lg">
          {durum.level}
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block text-[9px] uppercase tracking-wider text-amber-300/80 sm:text-[10px]">Level {durum.level} Gündemi</span>
          <span className="block truncate text-xs font-bold text-amber-50 sm:text-sm">{level.gundem}</span>
        </span>
      </button>

      <div className="pointer-events-auto flex shrink-0 gap-1 rounded-2xl bg-stone-900/85 p-1 shadow-xl ring-1 ring-amber-500/50 backdrop-blur sm:gap-1.5 sm:p-1.5">
        {Object.entries(KAYNAKLAR).map(([k, t]) => {
          const acik = kaynakAcikMi(k, durum.level);
          return (
            <div key={k} className={`flex items-center gap-0.5 rounded-xl bg-stone-800 px-1.5 py-1 text-sm sm:gap-1 sm:px-2 ${acik ? "" : "opacity-40"}`} title={t.ad}>
              <span>{t.ikon}</span>
              <span className="text-xs font-black tabular-nums text-amber-50 sm:text-sm">{acik ? durum.envanter[k] : "🔒"}</span>
            </div>
          );
        })}
      </div>
    </header>
  );
}
