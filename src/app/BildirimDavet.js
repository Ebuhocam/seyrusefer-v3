"use client";
import { useEffect, useState } from "react";
import { bildirimKodunuAl } from "@/lib/firebaseIstemci";

// Günlük hatırlatma bildirimi daveti.
// * Tarayıcı bildirimi destekliyor ve izin henüz sorulmamışsa nazik bir şerit gösterir
// * "Şimdi değil" → 14 gün, "Bir daha gösterme" → bir daha çıkmaz
// * İzin zaten verilmişse sessizce bu cihazı kaydeder (yeni giriş / yenilenen kod)
// * iPhone'da bildirim yalnızca ana ekrana eklenmiş uygulamada desteklenir; tarayıcıda PushManager
//   olmadığı için şerit orada çıkmaz (ana ekrana ekleme daveti o iş içindir)
const ANAHTAR = "seyrusefer_bildirim_davet";
const BEKLEME_MS = 14 * 24 * 60 * 60 * 1000;
const YENILEME_MS = 3 * 24 * 60 * 60 * 1000;
const GECIKME_MS = 40000;

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
    // depolama kapalıysa davet tekrar çıkabilir; zararsız
  }
}
const destekleniyor = () => "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;

async function sunucuyaKaydet(token) {
  const r = await fetch("/api/bildirim/kayit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return r.ok;
}

export default function BildirimDavet() {
  const [goster, setGoster] = useState(false);
  const [durum, setDurum] = useState(null); // null | 'bekle' | 'tamam' | 'hata'

  useEffect(() => {
    if (!destekleniyor()) return undefined;
    const kayit = oku();

    // İzin zaten var: bu cihazı birkaç günde bir sessizce kaydet
    if (Notification.permission === "granted") {
      if (!kayit.sonKayit || Date.now() - kayit.sonKayit > YENILEME_MS) {
        bildirimKodunuAl()
          .then(async (t) => {
            if (t && (await sunucuyaKaydet(t))) yaz({ ...oku(), sonKayit: Date.now() });
          })
          .catch(() => {});
      }
      return undefined;
    }
    if (Notification.permission !== "default") return undefined; // reddedildi: bir daha sorma
    if (kayit.hicGosterme) return undefined;
    if (kayit.sonRed && Date.now() - kayit.sonRed < BEKLEME_MS) return undefined;

    // Ana ekrana ekleme daveti açıkken bekle; üst üste binmesin
    let zaman = 0;
    const dene = () => {
      if (document.querySelector('[aria-label="Uygulamayı ana ekrana ekle"]')) {
        zaman = window.setTimeout(dene, 15000);
      } else {
        setGoster(true);
      }
    };
    zaman = window.setTimeout(dene, GECIKME_MS);
    return () => window.clearTimeout(zaman);
  }, []);

  if (!goster) return null;

  const simdiDegil = () => {
    yaz({ ...oku(), sonRed: Date.now() });
    setGoster(false);
  };
  const hicGosterme = () => {
    yaz({ ...oku(), hicGosterme: true });
    setGoster(false);
  };
  const ac = async () => {
    setDurum("bekle");
    try {
      const izin = await Notification.requestPermission();
      if (izin !== "granted") {
        yaz({ ...oku(), sonRed: Date.now() });
        setGoster(false);
        return;
      }
      const token = await bildirimKodunuAl();
      if (!token || !(await sunucuyaKaydet(token))) throw new Error("kayit");
      yaz({ ...oku(), sonKayit: Date.now() });
      setDurum("tamam");
      window.setTimeout(() => setGoster(false), 2500);
    } catch {
      setDurum("hata");
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Günlük hatırlatma bildirimi"
      className="tezhip levha-ac fixed inset-x-3 z-[600] mx-auto max-w-md rounded-2xl p-3.5 text-amber-50 shadow-2xl"
      style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      {durum === "tamam" ? (
        <p className="text-sm font-black text-emerald-300">🔔 Günlük hatırlatma açıldı. Köyün seni bekleyecek!</p>
      ) : (
        <>
          <p className="text-sm font-black text-amber-200">🔔 Günlük hatırlatma ister misin?</p>
          <p className="mt-0.5 text-[11px] leading-snug text-amber-100/85">
            Günde en fazla bir bildirim gelir; görevlerini unutmazsın. İstediğin zaman tarayıcı ayarlarından kapatabilirsin.
          </p>
          {durum === "hata" && (
            <p className="mt-1.5 rounded-lg bg-red-950/70 px-2.5 py-1.5 text-[11px] font-semibold text-red-200 ring-1 ring-red-500/40">
              Bildirim açılamadı. Biraz sonra tekrar dene.
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={ac}
              disabled={durum === "bekle"}
              className="varak-dugme rounded-xl px-4 py-2 text-xs font-black disabled:opacity-60"
            >
              {durum === "bekle" ? "Bekleyin…" : "🔔 Bildirimleri aç"}
            </button>
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
        </>
      )}
    </div>
  );
}
