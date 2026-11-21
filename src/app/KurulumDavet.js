"use client";
import { useEffect, useState } from "react";

// Ana ekrana ekleme daveti (PWA).
// * Android/Chrome: tek tuşla "Yükle" (beforeinstallprompt)
// * iPhone/iPad: Safari'de otomatik yükleme yok; paylaş menüsünden ekleme adımları gösterilir
// * Kurulu uygulamada (standalone) hiç görünmez
// * "Şimdi değil" → 14 gün sorulmaz, "Bir daha gösterme" → bir daha çıkmaz
const ANAHTAR = "seyrusefer_kurulum_davet";
const BEKLEME_MS = 14 * 24 * 60 * 60 * 1000;
const GECIKME_MS = 12000; // oyun açılır açılmaz değil, biraz oynadıktan sonra

function oku() {
  try {
    return JSON.parse(localStorage.getItem(ANAHTAR) || "{}");
  } catch {
    return {};
  }
}
function yaz(v) {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(v));
  } catch {
    // Depolama kapalıysa davet her açılışta çıkabilir; zararsız
  }
}

function kuruluMu() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}
function iosMu() {
  const ua = navigator.userAgent || "";
  const iPadOS = navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1;
  return /iPhone|iPad|iPod/i.test(ua) || iPadOS;
}

export default function KurulumDavet() {
  const [mod, setMod] = useState(null); // null | 'android' | 'ios'
  const [adimlar, setAdimlar] = useState(false);
  const [olay, setOlay] = useState(null);

  useEffect(() => {
    if (kuruluMu()) return undefined;
    const kayit = oku();
    if (kayit.hicGosterme) return undefined;
    if (kayit.sonRed && Date.now() - kayit.sonRed < BEKLEME_MS) return undefined;

    let zaman = 0;
    const goster = (m) => {
      window.clearTimeout(zaman);
      zaman = window.setTimeout(() => setMod(m), GECIKME_MS);
    };

    const onKurulum = (e) => {
      e.preventDefault(); // Tarayıcının kendi küçük çubuğu yerine bizim davetimiz
      setOlay(e);
      goster("android");
    };
    const kuruldu = () => {
      setMod(null);
      yaz({ ...oku(), hicGosterme: true });
    };
    window.addEventListener("beforeinstallprompt", onKurulum);
    window.addEventListener("appinstalled", kuruldu);
    if (iosMu()) goster("ios");

    return () => {
      window.clearTimeout(zaman);
      window.removeEventListener("beforeinstallprompt", onKurulum);
      window.removeEventListener("appinstalled", kuruldu);
    };
  }, []);

  if (!mod) return null;

  const simdiDegil = () => {
    yaz({ ...oku(), sonRed: Date.now() });
    setMod(null);
  };
  const hicGosterme = () => {
    yaz({ ...oku(), hicGosterme: true });
    setMod(null);
  };
  const yukle = async () => {
    if (!olay) return;
    olay.prompt();
    try {
      const { outcome } = await olay.userChoice;
      if (outcome === "dismissed") yaz({ ...oku(), sonRed: Date.now() });
    } catch {
      // kullanıcı seçimi okunamadıysa sessizce geç
    }
    setOlay(null);
    setMod(null);
  };

  return (
    <div
      role="dialog"
      aria-label="Uygulamayı ana ekrana ekle"
      className="tezhip levha-ac fixed inset-x-3 z-[600] mx-auto max-w-md rounded-2xl p-3.5 text-amber-50 shadow-2xl"
      style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl ring-1 ring-amber-400/50" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-amber-200">Seyrüsefer&apos;i ana ekrana ekle</p>
          <p className="text-[11px] leading-snug text-amber-100/85">
            Kendi simgesiyle, tam ekran açılır; her seferinde adres yazmana gerek kalmaz.
          </p>
        </div>
      </div>

      {mod === "ios" && adimlar && (
        <ol className="mt-3 list-decimal space-y-1 rounded-xl bg-stone-950/70 py-2.5 pr-3 pl-7 text-xs leading-snug text-amber-100">
          <li>
            Safari&apos;nin alt (veya üst) çubuğundaki <b>Paylaş</b> simgesine dokun (içinden yukarı ok çıkan kare).
          </li>
          <li>
            Açılan listeyi kaydırıp <b>&quot;Ana Ekrana Ekle&quot;</b>yi seç.
          </li>
          <li>
            Sağ üstteki <b>Ekle</b>ye dokun. Simge ana ekranına gelir.
          </li>
          <li className="list-none text-[11px] text-amber-300/85">
            Safari dışında bir tarayıcıdaysan (Instagram, WhatsApp vb.) önce adresi Safari&apos;de aç.
          </li>
        </ol>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {mod === "android" ? (
          <button type="button" onClick={yukle} className="varak-dugme rounded-xl px-4 py-2 text-xs font-black">
            📲 Yükle
          </button>
        ) : (
          !adimlar && (
            <button
              type="button"
              onClick={() => setAdimlar(true)}
              className="varak-dugme rounded-xl px-4 py-2 text-xs font-black"
            >
              📲 Nasıl eklenir?
            </button>
          )
        )}
        <button
          type="button"
          onClick={simdiDegil}
          className="rounded-xl bg-stone-950/70 px-3 py-2 text-xs font-bold text-amber-100 ring-1 ring-stone-700 hover:bg-stone-900"
        >
          Şimdi değil
        </button>
        <button
          type="button"
          onClick={hicGosterme}
          className="ml-auto px-1 py-2 text-[11px] font-semibold text-amber-200/70 underline hover:text-amber-100"
        >
          Bir daha gösterme
        </button>
      </div>
    </div>
  );
}
