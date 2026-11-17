"use client";
// =============================================================
// KUTLAMA KATMANI
// Oyun durumunu izler; level atlandığında "ferman" açar, bina kurulduğunda /
// yükseltildiğinde ve bir görev tamamlandığında kısa bir kutlama gösterir.
// Kendi başına çalışır: KoyHaritasi yalnızca <Kutlama oyun={oyun} /> yerleştirir.
// =============================================================
import { useEffect, useRef, useState } from "react";
import {
  BINALAR,
  KAYNAKLAR,
  LEVELLAR,
  BIRLIK_ACILIS_LEVEL,
  ALAN_MUCADELESI_LEVEL,
} from "@/lib/oyun/sabitler";
import { sesCal } from "./ses";

const KONFETI_RENKLERI = ["#e7b93b", "#f5df8f", "#34b2a3", "#f6eed8", "#c9463b"];

function Konfeti({ adet = 46 }) {
  // Parçalar yalnızca istemcide, bir kez üretilir (her çizimde yeniden hesaplanmaz)
  const [parcalar] = useState(() =>
    Array.from({ length: adet }, (_, i) => ({
      id: i,
      sol: Math.random() * 100,
      gecikme: Math.random() * 0.5,
      sure: 1.8 + Math.random() * 1.6,
      kayma: `${(Math.random() - 0.5) * 30}vw`,
      renk: KONFETI_RENKLERI[i % KONFETI_RENKLERI.length],
      yildiz: i % 4 === 0,
      boy: 6 + Math.random() * 7,
    }))
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {parcalar.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.sol}%`,
            width: p.boy,
            height: p.yildiz ? p.boy : p.boy * 0.45,
            background: p.yildiz ? "var(--yildiz) center / contain no-repeat" : p.renk,
            borderRadius: p.yildiz ? 0 : 1,
            "--kayma": p.kayma,
            animation: `konfeti-dus ${p.sure}s ${p.gecikme}s cubic-bezier(0.3, 0.6, 0.6, 1) both`,
          }}
        />
      ))}
    </div>
  );
}

/** Bu levela geçince açılan yenilikler (öğrenciye ne kazandığını söyler) */
function levelYenilikleri(level) {
  const liste = [];
  for (const t of Object.values(KAYNAKLAR)) {
    if (t.uretim && t.acilisLevel === level) {
      liste.push({ ikon: t.ikon, metin: `${t.ad} üretimi başladı: köye bir usta geldi ve işe koyuldu (+1 👥)` });
    }
  }
  for (const [, b] of Object.entries(BINALAR)) {
    for (const [sv, lv] of Object.entries(b.acilis ?? {})) {
      if (Number(lv) !== level) continue;
      liste.push({
        ikon: b.konut ? "🏠" : "🔨",
        metin: Number(sv) === 1 ? `${b.ad} kurulabilir` : `${b.ad} ${b.konut ? `${sv}. kata` : `${sv}. seviyeye`} çıkarılabilir`,
      });
    }
  }
  if (level === BIRLIK_ACILIS_LEVEL) liste.unshift({ ikon: "🏕️", metin: "Birlik Alanı açıldı: bir birliğe katıl ya da kendi birliğini kur" });
  if (level === ALAN_MUCADELESI_LEVEL) liste.unshift({ ikon: "🗺️", metin: "Genel Harita açıldı: birliğinle sancak bölgelerine hamle yap" });
  return liste.slice(0, 5);
}

export default function Kutlama({ oyun }) {
  const { durum, gorevler } = oyun;
  const onceki = useRef(null);
  const [ferman, setFerman] = useState(null); // { level }
  const [bina, setBina] = useState(null); // { id, seviye }
  const [gorev, setGorev] = useState(null); // { ad }

  useEffect(() => {
    const simdiki = {
      level: durum.level,
      binalar: durum.binalar,
      tamamlar: Object.fromEntries(gorevler.map((g) => [g.kod, g.tamam])),
    };
    const once = onceki.current;
    onceki.current = simdiki;
    if (!once) return;

    /* eslint-disable react-hooks/set-state-in-effect */
    if (simdiki.level > once.level) {
      setBina(null);
      setGorev(null);
      setFerman({ level: simdiki.level });
      sesCal("level");
      return;
    }
    if (simdiki.level < once.level) return; // geliştirici sıfırlaması

    const yukselen = Object.keys(simdiki.binalar).find((id) => (simdiki.binalar[id] ?? 0) > (once.binalar[id] ?? 0));
    if (yukselen && BINALAR[yukselen]) {
      setBina({ id: yukselen, seviye: simdiki.binalar[yukselen] });
      sesCal("insa");
      return;
    }
    const biten = gorevler.find((g) => g.tamam && once.tamamlar[g.kod] === false);
    if (biten) {
      setGorev({ ad: biten.ad });
      sesCal("gorev");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [durum.level, durum.binalar, gorevler]);

  useEffect(() => {
    if (!bina) return;
    const t = setTimeout(() => setBina(null), 3200);
    return () => clearTimeout(t);
  }, [bina]);

  useEffect(() => {
    if (!gorev) return;
    const t = setTimeout(() => setGorev(null), 3000);
    return () => clearTimeout(t);
  }, [gorev]);

  if (ferman) {
    const tanim = LEVELLAR.find((l) => l.no === ferman.level);
    const yenilikler = levelYenilikleri(ferman.level);
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Level ${ferman.level}`}
        className="fixed inset-0 z-[700] grid place-items-center overflow-hidden bg-stone-950/90 p-4 backdrop-blur-sm"
      >
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 h-[160vmax] w-[160vmax] opacity-40"
          style={{
            background:
              "repeating-conic-gradient(from 0deg, rgba(231,185,59,0.22) 0deg 6deg, transparent 6deg 18deg)",
            maskImage: "radial-gradient(circle, black 0%, transparent 55%)",
            WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 55%)",
            transform: "translate(-50%, -50%)",
            animation: "kutlama-isin 40s linear infinite",
          }}
        />
        <Konfeti adet={60} />
        <div className="tezhip muhurlu levha-ac relative w-full max-w-md rounded-[1.75rem] px-6 pt-12 pb-6 text-center text-amber-50">
          <div
            className="absolute -top-10 left-1/2 grid h-20 w-20 -translate-x-1/2 place-items-center rounded-full text-3xl font-black text-amber-950"
            style={{
              fontFamily: "var(--font-display)",
              background: "radial-gradient(circle at 35% 30%, #fbeaa6, #e7b93b 55%, #946511)",
              boxShadow: "0 0 0 4px #0d1628, 0 0 0 6px rgba(231,185,59,.6), 0 12px 30px rgba(231,185,59,.45)",
              animation: "kutlama-muhur 0.7s 0.15s cubic-bezier(0.2, 0.9, 0.3, 1.2) both",
            }}
          >
            {ferman.level}
          </div>
          <p className="text-sm font-bold text-amber-300">Yeni gündemin</p>
          <h2 className="mt-1 text-3xl leading-tight font-black text-amber-100">{tanim?.gundem ?? `Level ${ferman.level}`}</h2>
          <div className="cetvel mx-auto my-4 w-4/5" />
          {yenilikler.length > 0 && (
            <ul className="mx-auto max-w-xs space-y-1.5 text-left text-sm font-semibold text-amber-50/90">
              {yenilikler.map((y, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="shrink-0">{y.ikon}</span>
                  <span>{y.metin}</span>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            autoFocus
            onClick={() => setFerman(null)}
            className="varak-dugme mt-6 w-full rounded-2xl py-3.5 text-base"
          >
            Yola devam et
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {bina && (
        <button
          type="button"
          onClick={() => setBina(null)}
          aria-label="Kutlamayı kapat"
          className="fixed inset-0 z-[650] grid cursor-default place-items-center overflow-hidden bg-stone-950/55"
        >
          <Konfeti adet={36} />
          <span className="tezhip levha-ac relative block w-[min(20rem,86vw)] rounded-[1.5rem] px-5 pt-4 pb-5 text-center text-amber-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BINALAR[bina.id].gorsel(bina.seviye)}
              alt=""
              className="mx-auto h-40 w-auto object-contain drop-shadow-[0_14px_18px_rgba(0,0,0,0.6)]"
              style={{ animation: "kutlama-muhur 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.2) both" }}
            />
            <span className="mt-1 block text-2xl font-black text-amber-100" style={{ fontFamily: "var(--font-display)" }}>
              {BINALAR[bina.id].ad}
            </span>
            <span className="mt-0.5 block text-sm font-bold text-emerald-300">
              {bina.seviye === 1 && !BINALAR[bina.id].baslangicSeviye
                ? "Köyüne kuruldu"
                : BINALAR[bina.id].konut
                ? `${bina.seviye}. kat çıkıldı (+5 kişilik yer)`
                : `${bina.seviye}. seviyeye yükseldi`}
            </span>
          </span>
        </button>
      )}
      {gorev && !bina && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[640] flex justify-center px-4">
          <div className="tezhip levha-ac flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-amber-50">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg text-amber-950"
              style={{ background: "radial-gradient(circle at 35% 30%, #fbeaa6, #e7b93b 60%, #946511)" }}
            >
              ✓
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold text-emerald-300">Görev tamamlandı</span>
              <span className="block truncate text-sm font-black">{gorev.ad}</span>
            </span>
          </div>
        </div>
      )}
    </>
  );
}
