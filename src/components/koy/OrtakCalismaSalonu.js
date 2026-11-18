"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TUR_BILGI = {
  kitap: { ikon: "📖", ad: "Kitap" },
  odev: { ikon: "✏️", ad: "Ödev" },
  tekrar: { ikon: "🔁", ad: "Tekrar" },
};

function sureYaz(dk) {
  const n = Math.max(0, Math.round(Number(dk) || 0));
  if (n < 60) return `${n} dk`;
  return `${Math.floor(n / 60)} sa ${n % 60} dk`;
}

const MADALYA = ["🥇", "🥈", "🥉"];

function Masa({ uye, simdi }) {
  const c = uye.calisiyor;
  const kalanDk = c ? Math.max(1, Math.ceil((c.bitis - simdi) / 60000)) : 0;
  const bilgi = c ? TUR_BILGI[c.tur] ?? TUR_BILGI.kitap : null;
  return (
    <div
      className={`flex flex-col items-center rounded-2xl bg-stone-900/80 p-3 ring-1 ${
        uye.ben ? "ring-2 ring-amber-400" : "ring-stone-700"
      }`}
    >
      <svg
        viewBox="0 0 120 90"
        className="h-20 w-full"
        role="img"
        aria-label={c ? "Dolu masa" : "Boş masa"}
      >
        {c && (
          <>
            <circle cx="92" cy="22" r="20" fill="#fbbf24" opacity="0.18" />
            <circle cx="92" cy="22" r="11" fill="#fbbf24" opacity="0.28" />
          </>
        )}
        {/* lamba */}
        <rect x="90" y="30" width="4" height="22" fill="#78716c" />
        <path
          d="M84 30 L100 30 L96 20 L88 20 Z"
          fill={c ? "#fbbf24" : "#57534e"}
        />
        {/* rahle (X ayak) */}
        <path d="M30 80 L60 48 M90 80 L60 48" stroke="#92400e" strokeWidth="6" strokeLinecap="round" />
        <path d="M38 72 L82 72" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
        {/* açık kitap */}
        <path
          d="M22 46 L60 52 L98 46 L98 40 L60 46 L22 40 Z"
          fill={c ? "#fef3c7" : "#a8a29e"}
          opacity={c ? 1 : 0.55}
        />
        <path d="M60 46 L60 52" stroke="#78350f" strokeWidth="1.5" />
        <path
          d="M22 40 L60 46 L98 40"
          stroke="#92400e"
          strokeWidth="2"
          fill="none"
        />
      </svg>
      <div className="mt-1 h-10 text-center">
        {c ? (
          <>
            <p className="text-lg leading-none">{bilgi.ikon}</p>
            <p className="mt-1 text-xs font-semibold text-amber-300">
              ~{kalanDk} dk
            </p>
          </>
        ) : (
          <p className="pt-3 text-xs text-amber-200/50">Boş masa</p>
        )}
      </div>
      <p className="mt-1 max-w-full truncate text-sm font-semibold text-amber-100">
        {uye.ad}
        {uye.ben ? " (sen)" : ""}
      </p>
      <p className="mt-0.5 text-center text-[11px] leading-snug text-amber-200/70">
        Bugün {sureYaz(uye.bugunDakika)} · Hafta {sureYaz(uye.haftaDakika)}
      </p>
    </div>
  );
}

export default function OrtakCalismaSalonu() {
  const [veri, setVeri] = useState(undefined);
  const [hata, setHata] = useState("");
  const [simdi, setSimdi] = useState(() => Date.now());
  const sapmaRef = useRef(0);

  const yukle = useCallback(() => {
    return fetch("/api/birlik/calisma", { cache: "no-store" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) {
          setHata(j?.hata ?? "Salon yüklenemedi.");
          return;
        }
        if (j?.sunucuZamani) sapmaRef.current = j.sunucuZamani - Date.now();
        setHata("");
        setVeri(j);
        setSimdi(Date.now() + sapmaRef.current);
      })
      .catch(() => setHata("Bağlantı kurulamadı."));
  }, []);

  useEffect(() => {
    yukle();
    const id = setInterval(yukle, 30000);
    return () => clearInterval(id);
  }, [yukle]);

  useEffect(() => {
    const id = setInterval(
      () => setSimdi(Date.now() + sapmaRef.current),
      15000,
    );
    return () => clearInterval(id);
  }, []);

  const kabuk =
    "scroll-mt-24 rounded-3xl bg-stone-950/85 p-4 ring-1 ring-amber-500/30 sm:p-5";

  if (veri === undefined) {
    return (
      <section id="calisma-salonu" className={kabuk}>
        <h2 className="font-display text-xl text-amber-100">
          📚 Ortak Çalışma Salonu
        </h2>
        <p className="mt-2 text-sm text-amber-200/70">
          {hata || "Salon hazırlanıyor…"}
        </p>
      </section>
    );
  }

  if (!veri.birlik) {
    return (
      <section id="calisma-salonu" className={kabuk}>
        <h2 className="font-display text-xl text-amber-100">
          📚 Ortak Çalışma Salonu
        </h2>
        <div className="mt-3 rounded-2xl bg-stone-900/80 p-4 ring-1 ring-stone-700">
          <p className="text-sm text-amber-100">
            Ortak salonu kullanmak için önce bir birliğe katıl (Birlik Otağı).
            Kendi çalışmanı aşağıdaki çalışma köşesinden başlatabilirsin.
          </p>
        </div>
      </section>
    );
  }

  const uyeler = veri.uyeler ?? [];
  const siralama = veri.siralama ?? [];
  const enCokUye = Math.max(1, ...uyeler.map((u) => u.haftaDakika || 0));
  const benimSiram = veri.benimSiram;
  const listedeMi = benimSiram
    ? siralama.some((s) => s.benim || s.sira === benimSiram.sira)
    : true;

  return (
    <section id="calisma-salonu" className={kabuk}>
      <h2 className="font-display text-xl text-amber-100">
        📚 Ortak Çalışma Salonu · {veri.birlik.ad}
      </h2>
      <p className="mt-1 flex items-center gap-2 text-sm text-amber-200">
        {veri.calisanSayisi > 0 && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
        )}
        Şu an {veri.calisanSayisi} kardeş çalışıyor
      </p>
      {hata && <p className="mt-2 text-xs text-red-300">{hata}</p>}

      <h3 className="mt-4 font-display text-lg text-amber-100">Masalar</h3>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {uyeler.map((u) => (
          <Masa key={u.id} uye={u} simdi={simdi} />
        ))}
      </div>

      <div className="mt-5 rounded-2xl bg-stone-900/80 p-3 ring-1 ring-stone-700">
        <h3 className="font-display text-lg text-amber-100">
          🏆 Birlik İçi Sıralama (son 7 gün)
        </h3>
        <ol className="mt-2 space-y-2">
          {uyeler.map((u, i) => (
            <li
              key={u.id}
              className={`rounded-xl p-2 ${
                u.ben ? "bg-amber-500/10 ring-1 ring-amber-400/60" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-sm text-amber-100">
                <span className="min-w-0 truncate">
                  <span className="inline-block w-7">
                    {MADALYA[i] ?? `${i + 1}.`}
                  </span>
                  {u.ad}
                  {u.ben ? " (sen)" : ""}
                </span>
                <span className="shrink-0 text-xs text-amber-200">
                  {sureYaz(u.haftaDakika)}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-800">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{
                    width: `${Math.round(((u.haftaDakika || 0) / enCokUye) * 100)}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div
        id="calisma-siralama"
        className="mt-4 scroll-mt-24 rounded-2xl bg-stone-900/80 p-3 ring-1 ring-stone-700"
      >
        <h3 className="font-display text-lg text-amber-100">
          🚩 Birlikler Arası Sıralama (son 7 gün)
        </h3>
        <ul className="mt-2 space-y-1.5">
          {siralama.map((s) => (
            <li
              key={s.id}
              className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-amber-100 ${
                s.benim ? "bg-amber-500/10 ring-1 ring-amber-400/60" : ""
              }`}
            >
              <span className="w-6 shrink-0 text-right font-semibold text-amber-300">
                {s.sira}
              </span>
              <span
                className="h-3 w-3 shrink-0 rounded-full ring-1 ring-white/30"
                style={{ backgroundColor: s.renk || "#f59e0b" }}
              />
              <span className="min-w-0 flex-1 truncate">{s.ad}</span>
              <span className="shrink-0 text-xs text-amber-200/70">
                {s.kisi} kişi
              </span>
              <span className="shrink-0 text-xs text-amber-200">
                {sureYaz(s.dakika)}
              </span>
            </li>
          ))}
        </ul>
        {benimSiram && !listedeMi && (
          <>
            <p className="py-1 text-center text-amber-200/60">…</p>
            <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-2 py-1.5 text-sm text-amber-100 ring-1 ring-amber-400/60">
              <span className="w-6 shrink-0 text-right font-semibold text-amber-300">
                {benimSiram.sira}
              </span>
              <span className="min-w-0 flex-1 truncate">{benimSiram.ad}</span>
              <span className="shrink-0 text-xs text-amber-200">
                {sureYaz(benimSiram.dakika)}
              </span>
            </div>
          </>
        )}
      </div>

      <p className="mt-4 rounded-2xl bg-emerald-950/40 p-3 text-center text-sm text-emerald-200 ring-1 ring-emerald-500/30">
        Birliğimiz bugün: {sureYaz(veri.birlikBugun)} · bu hafta:{" "}
        {sureYaz(veri.birlikHafta)}
      </p>
    </section>
  );
}
