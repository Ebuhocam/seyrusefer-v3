"use client";
// "Site hazırlanıyor" sayfası. Köşedeki küçük kilit, ön izleme şifresi kutusunu açar.
import { useState } from "react";

export default function Hazirlaniyor() {
  const [acik, setAcik] = useState(false);
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState(null);
  const [bekliyor, setBekliyor] = useState(false);

  const gonder = async (e) => {
    e.preventDefault();
    setBekliyor(true);
    setHata(null);
    try {
      const r = await fetch("/api/onizleme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sifre }),
      });
      if (r.ok) {
        window.location.reload();
        return;
      }
      setHata("Şifre yanlış.");
    } catch {
      setHata("Bağlantı kurulamadı.");
    }
    setBekliyor(false);
  };

  return (
    <main className="fixed inset-0 grid place-items-center overflow-hidden bg-stone-950 p-6 text-amber-50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/harita/koy.webp"
        alt=""
        className="giris-harita pointer-events-none fixed inset-0 h-full w-full object-cover opacity-40"
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(13,22,40,0.4), rgba(13,22,40,0.95) 75%)" }}
      />
      <div className="tezhip levha-ac relative w-full max-w-md rounded-[1.75rem] px-6 py-10 text-center">
        <h1 className="giris-baslik text-5xl leading-none font-black sm:text-6xl">Seyrüsefer</h1>
        <div className="cetvel mx-auto my-4 w-3/4" />
        <p className="font-display text-xl text-amber-100">Köyümüz hazırlanıyor…</p>
        <p className="mt-2 text-sm text-amber-200/80">
          Taşlar diziliyor, tarlalar sürülüyor. Çok yakında kapılarımızı açıyoruz.
        </p>
      </div>

      <div className="fixed right-4 bottom-4">
        {!acik ? (
          <button
            type="button"
            onClick={() => setAcik(true)}
            aria-label="Ön izleme girişi"
            className="grid h-9 w-9 place-items-center rounded-full text-sm opacity-30 transition hover:opacity-80"
          >
            🔒
          </button>
        ) : (
          <form onSubmit={gonder} className="ust-levha flex items-center gap-2 rounded-2xl p-2">
            <input
              type="password"
              autoFocus
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              placeholder="Ön izleme şifresi"
              aria-label="Ön izleme şifresi"
              className="w-40 rounded-xl bg-stone-950 px-3 py-2 text-sm text-amber-50 ring-1 ring-amber-500/30"
            />
            <button type="submit" disabled={bekliyor || !sifre} className="varak-dugme rounded-xl px-3 py-2 text-sm">
              Gir
            </button>
          </form>
        )}
        {hata && <p className="mt-1 text-right text-xs font-bold text-red-400">{hata}</p>}
      </div>
    </main>
  );
}
