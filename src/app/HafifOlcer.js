"use client";
import { useEffect, useState } from "react";
import { hafifAyarla, hafifKaydiOku } from "@/lib/hafifMod";

// Cihazın gerçek akıcılığını bir kez ölçer: ekran saniyede ~30 kareden azını çizebiliyorsa
// hafif moda kendiliğinden geçer ve kısa bir not gösterir. Kullanıcı ⚡ düğmesiyle seçim yaptıysa ölçmez.
const YENIDEN_OLC_MS = 7 * 24 * 60 * 60 * 1000;
const OLCUM_MS = 4000;
const YAVAS_KARE_MS = 30; // ortanca kare süresi bundan uzunsa (≈33 kare/sn altı) yavaş say

function olcmeliMi() {
  const v = hafifKaydiOku();
  if (v === "1" || v === "0" || v === "oto1") return false;
  if (v && v.startsWith("oto0:")) return Date.now() - Number(v.slice(5)) > YENIDEN_OLC_MS;
  return true;
}

export default function HafifOlcer() {
  const [not, setNot] = useState(false);

  useEffect(() => {
    if (!olcmeliMi()) return undefined;
    let iptal = false;
    let raf = 0;
    let zaman = 0;

    const olc = () => {
      if (iptal) return;
      if (document.hidden) {
        // Arka plandaki sekmede kareler durur; görünür olunca ölç
        zaman = window.setTimeout(olc, 2000);
        return;
      }
      const sureler = [];
      let onceki = 0;
      let bas = 0;
      const adim = (t) => {
        if (iptal) return;
        if (document.hidden) {
          zaman = window.setTimeout(olc, 2000); // ölçüm bozuldu, sonra baştan
          return;
        }
        if (!bas) bas = t;
        if (onceki) sureler.push(t - onceki);
        onceki = t;
        if (t - bas < OLCUM_MS) {
          raf = requestAnimationFrame(adim);
          return;
        }
        if (sureler.length < 10) {
          hafifAyarla(true, "oto");
          setNot(true);
          return;
        }
        const sirali = [...sureler].sort((a, b) => a - b);
        const ortanca = sirali[Math.floor(sirali.length / 2)];
        if (ortanca > YAVAS_KARE_MS) {
          hafifAyarla(true, "oto");
          setNot(true);
        } else {
          hafifAyarla(false, "oto");
        }
      };
      raf = requestAnimationFrame(adim);
    };

    // Sayfa ve görseller yüklenirken ölçme; yükleme takılmaları yanıltmasın
    zaman = window.setTimeout(olc, 3500);
    return () => {
      iptal = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(zaman);
    };
  }, []);

  useEffect(() => {
    if (!not) return undefined;
    const t = window.setTimeout(() => setNot(false), 9000);
    return () => window.clearTimeout(t);
  }, [not]);

  if (!not) return null;
  return (
    <div
      role="status"
      className="fixed top-3 left-1/2 z-[700] w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl border border-amber-500/50 bg-stone-950/95 px-4 py-3 text-xs text-amber-100 shadow-xl"
    >
      <b className="text-amber-300">⚡ Hafif moda geçildi.</b> Bu cihazda oyun daha akıcı çalışsın diye süslemeleri azalttık.
      Üst çubuktaki ⚡ düğmesinden kapatabilirsin.
      <button type="button" onClick={() => setNot(false)} className="ml-2 font-bold text-amber-300 underline">
        Tamam
      </button>
    </div>
  );
}
