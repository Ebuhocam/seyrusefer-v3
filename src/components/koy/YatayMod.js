"use client";
import { useEffect, useState } from "react";

const ANAHTAR = "seyrusefer-dikey-devam";

/**
 * Telefonlarda dikey durumdayken "telefonu yan çevir" çağrısı.
 * Masaüstünde (ince işaretçi / geniş ekran) hiç görünmez; yatay olunca kendiliğinden kapanır.
 */
export default function YatayMod() {
  const [goster, setGoster] = useState(false);
  const [mesaj, setMesaj] = useState("");

  useEffect(() => {
    let atla = false;
    try {
      atla = localStorage.getItem(ANAHTAR) === "1";
    } catch {}
    const mm = window.matchMedia("(pointer: coarse) and (orientation: portrait) and (max-width: 820px)");
    const guncelle = () => setGoster(!atla && mm.matches);
    guncelle();
    mm.addEventListener("change", guncelle);
    return () => mm.removeEventListener("change", guncelle);
  }, []);

  if (!goster) return null;

  const tamEkranYatay = async () => {
    let basari = false;
    try {
      await document.documentElement.requestFullscreen?.();
      basari = true;
    } catch {}
    try {
      await screen.orientation?.lock?.("landscape");
      basari = true;
    } catch {}
    if (!basari || window.matchMedia("(orientation: portrait)").matches) {
      setMesaj("Telefonunu yan çevir; oyun yatay daha güzel görünür.");
    }
  };

  const dikeyDevam = () => {
    try {
      localStorage.setItem(ANAHTAR, "1");
    } catch {}
    setGoster(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Telefonu yan çevir"
      className="fixed inset-0 z-[900] flex items-center justify-center bg-stone-950/92 p-4 backdrop-blur-sm"
    >
      <div className="tezhip levha-ac w-full max-w-sm space-y-4 rounded-[1.75rem] p-6 text-center text-amber-50">
        <svg viewBox="0 0 120 120" className="mx-auto h-28 w-28" aria-hidden="true">
          <g style={{ transformOrigin: "60px 60px", animation: "yatayDon 2.8s ease-in-out infinite" }}>
            <rect x="38" y="14" width="44" height="92" rx="9" fill="#111b31" stroke="#e7b93b" strokeWidth="3" />
            <rect x="43" y="24" width="34" height="68" rx="3" fill="#1f6f66" />
            <circle cx="60" cy="99" r="3" fill="#e7b93b" />
            <path d="M52 58 l8 -10 l8 10 z M52 66 l8 10 l8 -10 z" fill="#f8e39a" opacity="0.9" />
          </g>
        </svg>
        <style>{`@keyframes yatayDon{0%,20%{transform:rotate(0)}55%,80%{transform:rotate(-90deg)}100%{transform:rotate(0)}}@media (prefers-reduced-motion:reduce){svg g{animation:none!important}}`}</style>
        <h2 className="font-display text-2xl font-black text-amber-100">Telefonunu yan çevir</h2>
        <p className="text-sm leading-relaxed text-amber-200/90">
          Köyünü geniş görmek için oyunu yatay oyna. Harita ve oyunlar çok daha rahat görünür.
        </p>
        {mesaj && <p className="text-xs font-bold text-emerald-300">{mesaj}</p>}
        <button type="button" onClick={tamEkranYatay} className="varak-dugme min-h-12 w-full rounded-2xl px-4 py-3 text-base">
          Tam ekran yatay oyna
        </button>
        <button
          type="button"
          onClick={dikeyDevam}
          className="min-h-11 w-full rounded-2xl px-4 py-2 text-sm font-bold text-amber-200/90 ring-1 ring-amber-400/40 hover:bg-white/5"
        >
          Dikey devam et
        </button>
      </div>
    </div>
  );
}
