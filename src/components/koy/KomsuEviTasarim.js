"use client";
import { useEffect, useRef, useState } from "react";
import { KOMSU_ODALARI, KOMSU_ODA_BEDEL, KOMSU_ODA_MAKS, KOMSU_MAMUR_HUZUR, BINALAR } from "@/lib/oyun/sabitler";

const ODA_SIRASI = ["yatak", "mutfak", "banyo"];
const KOMSU_ADLARI = [
  "Hasan Amca'nın Hanesi",
  "Ayşe Teyze'nin Hanesi",
  "Demirci Ali'nin Hanesi",
  "Fatma Nine'nin Hanesi",
  "Çoban Yusuf'un Hanesi",
];
const KAYNAK_ETIKET = { erzak: "🌾 Mahsul", kereste: "🌲 Odun", tas: "🧱 Taş" };
const KAYNAK_SIRASI = ["kereste", "tas", "erzak"];
const DUVAR_RENK = ["#8b8681", "#b9a68c", "#e2d2b0", "#fbf4e2"];
const ZEMIN_RENK = ["#5b4a3a", "#6e553b", "#7a5a38", "#8a6a44"];
const ODA_X = { yatak: 30, mutfak: 210, banyo: 390 };
const ODA_Y = 100;
const ODA_G = 180;
const ODA_Y_UZUN = 230;

function komsuAdi(binaId) {
  const i = ["ev1", "ev2", "ev3", "ev4", "ev5"].indexOf(binaId);
  if (i >= 0) return KOMSU_ADLARI[i];
  let h = 0;
  for (const c of String(binaId ?? "")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return KOMSU_ADLARI[h % KOMSU_ADLARI.length];
}

/* ---------- Oda çizimleri (yerel koordinat: 180 x 230) ---------- */

function YatakCizim({ s }) {
  return (
    <g>
      {s >= 3 && (
        <g>
          <rect x="62" y="38" width="56" height="52" rx="4" fill="#bfe3f2" stroke="#7a4b25" strokeWidth="4" />
          <path d="M58 34 Q70 70 60 100 L82 100 L82 34 Z" fill="#b5483a" />
          <path d="M122 34 Q110 70 120 100 L98 100 L98 34 Z" fill="#b5483a" />
        </g>
      )}
      {s === 0 && (
        <g>
          <rect x="28" y="190" width="124" height="14" rx="3" fill="#c9a85c" />
          {[40, 56, 72, 88, 104, 120, 136].map((x) => (
            <line key={x} x1={x} y1="190" x2={x} y2="204" stroke="#9c7f3c" strokeWidth="2" />
          ))}
        </g>
      )}
      {s === 1 && (
        <g>
          <rect x="26" y="168" width="128" height="24" rx="8" fill="#e4dcc8" />
          <rect x="66" y="162" width="88" height="30" rx="8" fill="#a8473a" />
          <path d="M72 170 H148 M72 178 H148" stroke="#d98a6a" strokeWidth="2" />
          <rect x="30" y="160" width="26" height="14" rx="6" fill="#f3ecd8" />
        </g>
      )}
      {s >= 2 && (
        <g>
          <rect x="16" y="196" width="148" height="22" rx="3" fill="#a8473a" />
          <rect x="16" y="196" width="148" height="22" rx="3" fill="none" stroke="#f0d9a0" strokeWidth="2" strokeDasharray="6 4" />
          {[40, 70, 100, 130].map((x) => (
            <path key={x} d={`M${x} 207 l8 -7 l8 7 l-8 7 z`} fill="#2f6f9f" />
          ))}
          <rect x="22" y="150" width="136" height={s === 3 ? 22 : 18} rx="4" fill="#7a4b25" />
          <rect x="26" y="168" width="10" height="28" fill="#5c3818" />
          <rect x="144" y="168" width="10" height="28" fill="#5c3818" />
          <rect x="22" y={s === 3 ? 112 : 128} width="12" height={s === 3 ? 60 : 44} rx="3" fill="#5c3818" />
          <rect x="30" y="140" width="116" height="14" rx="6" fill="#efe6cf" />
          <rect x="68" y="136" width="82" height="18" rx="6" fill={s === 3 ? "#2f6f9f" : "#b5483a"} />
        </g>
      )}
      {s === 3 && (
        <g>
          {[84, 100, 116, 132].map((x) => (
            <path key={x} d={`M${x} 145 l5 -5 l5 5 l-5 5 z`} fill="#f4d58a" />
          ))}
          <circle cx="28" cy="108" r="5" fill="#e9b84b" />
          <rect x="140" y="170" width="22" height="26" rx="2" fill="#5c3818" />
          <rect x="149" y="150" width="4" height="20" fill="#6b6b6b" />
          <path d="M141 150 L161 150 L156 134 L146 134 Z" fill="#f4d58a" />
          <circle cx="151" cy="142" r="14" fill="#ffe9a8" opacity="0.35" />
        </g>
      )}
    </g>
  );
}

function MutfakCizim({ s, pid }) {
  return (
    <g>
      {s === 3 && (
        <g>
          <rect x="0" y="86" width="180" height="104" fill={`url(#${pid})`} />
          <rect x="62" y="22" width="56" height="50" rx="4" fill="#bfe3f2" stroke="#2f6f9f" strokeWidth="4" />
          <path d="M90 22 V72 M62 47 H118" stroke="#2f6f9f" strokeWidth="3" />
        </g>
      )}
      {s >= 1 && (
        <g>
          <rect x="20" y="64" width="140" height="6" rx="2" fill="#7a4b25" />
          {[34, 64, 94, 124].map((x, i) => (
            <g key={x}>
              <ellipse cx={x + 8} cy="56" rx={9 - (i % 2)} ry="8" fill="#c0703a" />
              <rect x={x + 3} y="46" width="10" height="4" rx="2" fill="#a2582c" />
            </g>
          ))}
        </g>
      )}
      {s === 0 && (
        <g>
          <rect x="62" y="152" width="46" height="40" rx="4" fill="#3d3a38" />
          <rect x="76" y="110" width="8" height="44" fill="#55504c" />
          <path d="M72 152 q6 -14 12 0 q6 -12 10 0 z" fill="#f5a623" />
          <rect x="68" y="146" width="34" height="6" fill="#2a2827" />
        </g>
      )}
      {s === 1 && (
        <g>
          <rect x="30" y="150" width="52" height="42" rx="4" fill="#3d3a38" />
          <path d="M42 150 q6 -14 12 0 q6 -12 10 0 z" fill="#f5a623" />
          <rect x="98" y="168" width="58" height="24" rx="3" fill="#9a6a3a" />
        </g>
      )}
      {s >= 2 && (
        <g>
          <rect x="12" y="120" width="76" height="72" rx="4" fill="#8d8478" />
          {[[16, 124], [48, 124], [16, 148], [48, 148], [32, 172], [64, 172]].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="28" height="20" rx="3" fill="#a69c8c" stroke="#6f675c" strokeWidth="1.5" />
          ))}
          <path d="M26 192 V160 Q50 136 74 160 V192 Z" fill="#2a2523" />
          <path d="M40 192 q6 -16 10 0 q6 -12 10 0 z" fill="#f5a623" />
          <rect x="96" y="158" width="72" height="34" rx="3" fill="#9a6a3a" />
          <rect x="92" y="152" width="80" height="8" rx="2" fill="#c89a62" />
          <ellipse cx="116" cy="146" rx="10" ry="7" fill="#c0703a" />
          <ellipse cx="146" cy="147" rx="8" ry="6" fill="#d9a25a" />
        </g>
      )}
      {s === 3 && (
        <g>
          <rect x="140" y="124" width="14" height="22" rx="3" fill="#a2582c" />
          <path d="M147 124 q-10 -14 -4 -22 M147 124 q10 -12 6 -22 M147 124 q0 -16 0 -24" stroke="#4f8a3c" strokeWidth="4" fill="none" strokeLinecap="round" />
          <rect x="22" y="196" width="136" height="6" fill="#2f6f9f" opacity="0.7" />
        </g>
      )}
    </g>
  );
}

function BanyoCizim({ s, pid }) {
  return (
    <g>
      {s === 3 && <rect x="0" y="86" width="180" height="104" fill={`url(#${pid})`} />}
      {s === 0 && (
        <g>
          <ellipse cx="90" cy="198" rx="70" ry="10" fill="#6b4f33" />
          <rect x="82" y="112" width="12" height="84" fill="#5a5f66" />
          <path d="M82 114 H62 V124 H82 Z" fill="#6f757d" />
          <rect x="54" y="122" width="8" height="12" fill="#6f757d" />
          <rect x="104" y="108" width="30" height="8" rx="3" fill="#3c4046" transform="rotate(-18 104 112)" />
          <path d="M52 188 h18 l-3 -22 h-12 z" fill="#8a6a44" />
          <path d="M58 136 v26" stroke="#7cc3e6" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {s === 1 && (
        <g>
          <rect x="20" y="96" width="140" height="96" fill="#9a6a3a" />
          {[40, 62, 84, 106, 128].map((x) => (
            <line key={x} x1={x} y1="96" x2={x} y2="192" stroke="#6e4825" strokeWidth="2" />
          ))}
          <path d="M14 98 L90 74 L166 98 Z" fill="#7a4b25" />
          <ellipse cx="60" cy="176" rx="14" ry="16" fill="#b8683a" />
          <rect x="54" y="156" width="12" height="8" rx="2" fill="#a2582c" />
          <ellipse cx="110" cy="188" rx="22" ry="5" fill="#7cc3e6" />
          <rect x="88" y="176" width="44" height="12" rx="3" fill="#8a6a44" />
        </g>
      )}
      {s >= 2 && (
        <g>
          {[0, 1, 2, 3, 4].map((r) =>
            [0, 1, 2, 3, 4, 5].map((c) => (
              <rect key={`${r}-${c}`} x={c * 30} y={192 + r * 8 - 0} width="28" height="7" rx="1.5" fill="#a69c8c" />
            ))
          )}
          <path d="M112 150 V120 H132 V150 Z" fill="#f4f1ea" stroke="#c9c2b2" strokeWidth="2" />
          <ellipse cx="124" cy="174" rx="24" ry="16" fill="#f4f1ea" stroke="#c9c2b2" strokeWidth="2" />
          <ellipse cx="122" cy="166" rx="16" ry="7" fill={s === 3 ? "#d8eef7" : "#e6e1d4"} />
          <rect x="108" y="184" width="32" height="8" rx="3" fill="#e0dacb" />
        </g>
      )}
      {s === 3 && (
        <g>
          <path d="M20 190 V160 Q20 140 50 140 Q80 140 80 160 V190 Z" fill="#f7f5ef" stroke="#c7c3b8" strokeWidth="2" />
          <ellipse cx="50" cy="140" rx="30" ry="9" fill="#e9e5da" stroke="#c7c3b8" strokeWidth="2" />
          <ellipse cx="50" cy="141" rx="22" ry="5" fill="#a9d9ee" />
          <path d="M50 140 V122 Q50 114 58 114" stroke="#c9a14a" strokeWidth="4" fill="none" strokeLinecap="round" />
          <rect x="88" y="104" width="4" height="40" fill="#c9a14a" />
          <rect x="82" y="108" width="24" height="36" rx="3" fill="#b5483a" />
          <path d="M84 118 H104 M84 126 H104" stroke="#f0d9a0" strokeWidth="2" />
          <path d="M18 100 Q60 90 100 100" stroke="#2f6f9f" strokeWidth="4" fill="none" />
        </g>
      )}
    </g>
  );
}

function OdaGrubu({ kod, seviye, secili, parlayan, onSec, desenId }) {
  const x = ODA_X[kod];
  const duvar = DUVAR_RENK[seviye];
  const bilgi = KOMSU_ODALARI[kod];
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${bilgi.ad}, seviye ${seviye} / ${KOMSU_ODA_MAKS}`}
      aria-pressed={secili}
      onClick={() => onSec(kod)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSec(kod);
        }
      }}
      className="cursor-pointer outline-none transition-transform duration-500 motion-safe:[transform-box:fill-box] motion-safe:[transform-origin:center]"
      style={parlayan ? { transform: "scale(1.04)" } : undefined}
    >
      <g transform={`translate(${x} ${ODA_Y})`}>
        <clipPath id={`${desenId}-klip-${kod}`}>
          <rect width={ODA_G} height={ODA_Y_UZUN} rx="6" />
        </clipPath>
        <g clipPath={`url(#${desenId}-klip-${kod})`}>
          <rect width={ODA_G} height={ODA_Y_UZUN} fill={duvar} />
          {seviye === 0 && (
            <g stroke="#5f5a56" strokeWidth="2" fill="none" strokeLinecap="round">
              <path d="M30 0 L38 30 L28 52 L40 80" />
              <path d="M140 10 L132 40 L146 66" />
              <path d="M90 100 L100 124 L92 140" />
              <circle cx="150" cy="120" r="10" fill="#7a746f" stroke="none" />
            </g>
          )}
          {seviye === 3 && (
            <g>
              <rect x="0" y="0" width={ODA_G} height="10" fill="#2f6f9f" />
              <path d={Array.from({ length: 9 }, (_, i) => `M${i * 22 + 2} 10 l9 8 l9 -8`).join(" ")} stroke="#f0d9a0" strokeWidth="2" fill="none" />
            </g>
          )}
          {seviye === 2 && <rect x="0" y="0" width={ODA_G} height="6" fill="#c9a97a" />}
          <rect y="190" width={ODA_G} height="40" fill={ZEMIN_RENK[seviye]} />
          <rect y="188" width={ODA_G} height="4" fill="#00000030" />
          {kod === "yatak" && <YatakCizim s={seviye} />}
          {kod === "mutfak" && <MutfakCizim s={seviye} pid={`${desenId}-cini`} />}
          {kod === "banyo" && <BanyoCizim s={seviye} pid={`${desenId}-cini`} />}
          {parlayan && <rect width={ODA_G} height={ODA_Y_UZUN} fill="#fcd34d" opacity="0.35" className="motion-safe:animate-pulse" />}
        </g>
        <rect
          width={ODA_G}
          height={ODA_Y_UZUN}
          rx="6"
          fill="none"
          stroke={secili ? "#fbbf24" : "#4a3420"}
          strokeWidth={secili ? 5 : 3}
        />
        <rect x="0" y="206" width={ODA_G} height="24" fill="#1c1410" opacity="0.62" />
        <text x="90" y="223" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fde68a">
          {bilgi.ikon} {bilgi.ad}
        </text>
        {seviye >= KOMSU_ODA_MAKS && (
          <text x="160" y="28" textAnchor="middle" fontSize="22">
            ✨
          </text>
        )}
      </g>
    </g>
  );
}

function EvCizimi({ seviyeler, secili, onSec, parlayan, binaId }) {
  const desenId = `komsu-${binaId}`;
  return (
    <svg viewBox="0 0 600 360" className="h-auto w-full" role="group" aria-label="Komşu evinin kesit resmi">
      <defs>
        <pattern id={`${desenId}-cini`} width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="#f7f4ea" />
          <rect x="1" y="1" width="22" height="22" fill="none" stroke="#2f6f9f" strokeWidth="1.5" />
          <path d="M12 3 L21 12 L12 21 L3 12 Z" fill="#3b82b8" />
          <circle cx="12" cy="12" r="3" fill="#f7f4ea" />
        </pattern>
        <pattern id={`${desenId}-kiremit`} width="24" height="16" patternUnits="userSpaceOnUse">
          <rect width="24" height="16" fill="#b5503a" />
          <path d="M0 16 Q6 4 12 16 Q18 4 24 16" fill="#c9644b" stroke="#7c2f20" strokeWidth="1.5" />
        </pattern>
        <linearGradient id={`${desenId}-gok`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#3b3a7a" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" rx="18" fill={`url(#${desenId}-gok)`} />
      <circle cx="540" cy="40" r="16" fill="#fde68a" opacity="0.9" />
      <rect x="0" y="334" width="600" height="26" fill="#3a2c1c" />
      {/* çatı */}
      <path d="M14 100 L300 8 L586 100 Z" fill={`url(#${desenId}-kiremit)`} stroke="#5a1f14" strokeWidth="4" strokeLinejoin="round" />
      <rect x="440" y="18" width="30" height="46" fill="#8d8478" stroke="#4a3420" strokeWidth="3" />
      {/* duvar çerçevesi */}
      <rect x="22" y="94" width="556" height="244" rx="8" fill="#4a3420" />
      {ODA_SIRASI.map((kod) => (
        <OdaGrubu
          key={kod}
          kod={kod}
          seviye={seviyeler[kod]}
          secili={secili === kod}
          parlayan={parlayan === kod}
          onSec={onSec}
          desenId={desenId}
        />
      ))}
    </svg>
  );
}

/* ---------- Ana bileşen ---------- */

export default function KomsuEviTasarim({ binaId, oyun }) {
  const [secili, setSecili] = useState("yatak");
  const [parlayan, setParlayan] = useState(null);
  const [chip, setChip] = useState(null);
  const zamanlayicilar = useRef([]);
  const sayac = useRef(0);

  useEffect(() => {
    const liste = zamanlayicilar.current;
    return () => liste.forEach((t) => clearTimeout(t));
  }, []);

  const bina = BINALAR?.[binaId];
  const evAdi = bina?.ad ?? "Komşu Evi";
  const ham = oyun?.durum?.komsuEvleri?.[binaId] ?? {};
  const seviyeler = {};
  for (const k of ODA_SIRASI) {
    seviyeler[k] = Math.max(0, Math.min(KOMSU_ODA_MAKS, Number(ham[k]) || 0));
  }
  const toplam = ODA_SIRASI.reduce((t, k) => t + seviyeler[k], 0);
  const toplamMaks = ODA_SIRASI.length * KOMSU_ODA_MAKS;
  const mamur = toplam >= toplamMaks;
  const envanter = oyun?.durum?.envanter ?? {};
  const bekliyor = Boolean(oyun?.bekliyor);

  const planla = (fn, ms) => {
    zamanlayicilar.current.push(setTimeout(fn, ms));
  };

  const guzellestir = async (kod) => {
    setSecili(kod);
    const sonuc = await oyun.komsuEviGuzellestir(binaId, kod);
    if (!sonuc) return;
    setParlayan(kod);
    setChip({ n: sonuc.huzur ?? 1, mamur: Boolean(sonuc.mamur), id: ++sayac.current });
    planla(() => setParlayan(null), 1200);
    planla(() => setChip(null), 2200);
  };

  return (
    <section className="relative space-y-4">
      <div className="tezhip rounded-3xl p-4 sm:p-5">
        <h2 className="font-display text-xl text-amber-100 sm:text-2xl">🏘️ {evAdi} · Komşu Ziyareti</h2>
        <p className="mt-1 text-sm font-semibold text-amber-200">{komsuAdi(binaId)}</p>
        <p className="mt-2 text-sm leading-relaxed text-amber-100/90">
          Komşun evini güzelleştirmek için senden yardım istiyor. Her iyileştirme köye +1 😊 Huzur getirir; üç oda da
          tamamlanınca +{KOMSU_MAMUR_HUZUR} Huzur daha!
        </p>
        {typeof oyun?.durum?.mutluluk === "number" && (
          <p className="mt-2 text-xs text-amber-200/80">Köyün huzuru: %{Math.round(oyun.durum.mutluluk)} 😊</p>
        )}
      </div>

      <div className="tezhip relative rounded-3xl p-4 sm:p-5">
        {chip && (
          <div
            key={chip.id}
            className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-amber-300 px-4 py-1.5 text-sm font-bold text-stone-900 shadow-lg motion-safe:animate-bounce"
            role="status"
          >
            +{chip.n} 😊 Huzur{chip.mamur ? " · 🏡 Mamur Ev!" : ""}
          </div>
        )}
        <EvCizimi seviyeler={seviyeler} secili={secili} onSec={setSecili} parlayan={parlayan} binaId={binaId} />

        <div className="mt-4 rounded-2xl bg-stone-900/80 p-3 ring-1 ring-stone-700">
          <div className="flex items-center justify-between text-sm text-amber-100">
            <span className="font-display">Ev güzelliği: {toplam} / {toplamMaks}</span>
            <span aria-hidden="true">{mamur ? "🌟" : "🏠"}</span>
          </div>
          <div
            className="mt-2 h-3 overflow-hidden rounded-full bg-stone-800"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={toplamMaks}
            aria-valuenow={toplam}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-[width] duration-700"
              style={{ width: `${(toplam / toplamMaks) * 100}%` }}
            />
          </div>
        </div>
        {mamur && (
          <div className="mt-3 rounded-2xl bg-amber-300/15 p-3 text-center text-sm font-semibold text-amber-100 ring-1 ring-amber-300/60">
            🏡 Mamur Ev! Komşun sana dua ediyor.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {ODA_SIRASI.map((kod) => {
          const bilgi = KOMSU_ODALARI[kod];
          const sv = seviyeler[kod];
          const maks = sv >= KOMSU_ODA_MAKS;
          const bedel = maks ? null : KOMSU_ODA_BEDEL[sv + 1];
          const yeterli = bedel ? Object.entries(bedel).every(([r, n]) => (envanter[r] ?? 0) >= n) : true;
          const devreDisi = maks || bekliyor || !yeterli;
          return (
            <div
              key={kod}
              onClick={() => setSecili(kod)}
              className={`rounded-2xl bg-stone-900/80 p-4 ring-1 transition-shadow ${
                secili === kod ? "ring-2 ring-amber-300" : "ring-stone-700"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base text-amber-100">
                  <span aria-hidden="true">{bilgi.ikon}</span> {bilgi.ad}
                </h3>
                <span className="text-lg tracking-widest text-amber-300" aria-label={`Seviye ${sv} / ${KOMSU_ODA_MAKS}`}>
                  {Array.from({ length: KOMSU_ODA_MAKS }, (_, i) => (i < sv ? "●" : "○")).join("")}
                </span>
              </div>
              <p className="mt-2 text-sm text-amber-100">{bilgi.seviyeler[sv]}</p>
              {!maks && <p className="mt-1 text-xs text-amber-200/80">Sıradaki: {bilgi.seviyeler[sv + 1]}</p>}

              {bedel && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {KAYNAK_SIRASI.filter((r) => bedel[r]).map((r) => {
                    const var_ = envanter[r] ?? 0;
                    const yet = var_ >= bedel[r];
                    return (
                      <span
                        key={r}
                        className={`rounded-full px-2 py-1 text-xs ring-1 ${
                          yet ? "bg-stone-800 text-amber-100 ring-stone-600" : "bg-red-900/50 text-red-200 ring-red-500/60"
                        }`}
                      >
                        {KAYNAK_ETIKET[r]} {var_}/{bedel[r]}
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="mt-3">
                {maks ? (
                  <p className="text-sm font-semibold text-amber-300">🌟 Tamamlandı</p>
                ) : (
                  <>
                    <button
                      type="button"
                      className="varak-dugme varak-isilti rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={devreDisi}
                      onClick={(e) => {
                        e.stopPropagation();
                        guzellestir(kod);
                      }}
                    >
                      ✨ Güzelleştir (+1 😊)
                    </button>
                    {!yeterli && <p className="mt-1.5 text-xs text-red-300">Yetersiz kaynak</p>}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
