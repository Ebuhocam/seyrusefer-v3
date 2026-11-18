"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const S = 40; // hex yarıçapı
const SQ3 = Math.sqrt(3);
const SORU_GECIS_MS = 400;
const HARF = ["A", "B", "C", "D"];

function hexMerkez(q, r) {
  return { x: S * SQ3 * (q + r / 2), y: S * 1.5 * r };
}

function hexNoktalari() {
  const p = [];
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 180) * (60 * k - 30);
    p.push(`${(S * Math.cos(a)).toFixed(2)},${(S * Math.sin(a)).toFixed(2)}`);
  }
  return p.join(" ");
}
const HEX_PTS = hexNoktalari();

async function api(yontem, govde) {
  try {
    const res = await fetch("/api/birlik/talim", {
      method: yontem,
      cache: "no-store",
      headers: govde ? { "Content-Type": "application/json" } : undefined,
      body: govde ? JSON.stringify(govde) : undefined,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

function hedefHesapla(h, benim) {
  if (!h) return 0;
  if (h.sahip && benim && h.sahip.birlikId === benim.id) return 4;
  const ek = h.sahip && h.sahip.takviye === 1 ? 1 : 0;
  return Math.min(5, h.hedef + ek);
}

export default function SancakTalimi({ oyun }) {
  const [harita, setHarita] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yuklemeHata, setYuklemeHata] = useState(false);
  const [yenile, setYenile] = useState(0);
  const [secili, setSecili] = useState(null);
  const [kuralAcik, setKuralAcik] = useState(false);

  // düello
  const [hazirlaniyor, setHazirlaniyor] = useState(false);
  const [duello, setDuello] = useState(null);
  const [idx, setIdx] = useState(0);
  const [secilenSecenek, setSecilenSecenek] = useState(null);
  const [kilit, setKilit] = useState(false);
  const [bitisZamani, setBitisZamani] = useState(0);
  const [kalanMs, setKalanMs] = useState(0);
  const [asama, setAsama] = useState("soru"); // soru | gonder | sonuc
  const [gonderHata, setGonderHata] = useState(false);
  const [sonuc, setSonuc] = useState(null);

  const cevapRef = useRef([]);
  const gonderiyorRef = useRef(false);
  const zamanlayiciRef = useRef(null);
  const oyunRef = useRef(oyun);

  useEffect(() => {
    oyunRef.current = oyun;
  }, [oyun]);

  const mesaj = useCallback((tur, metin) => {
    const o = oyunRef.current;
    if (o && typeof o.setMesaj === "function") o.setMesaj({ tur, metin });
  }, []);

  // Haritayı yükle
  useEffect(() => {
    let iptal = false;
    (async () => {
      const r = await api("GET");
      if (iptal) return;
      if (r.ok && r.data && Array.isArray(r.data.hucreler)) {
        setHarita(r.data);
        setYuklemeHata(false);
      } else {
        setYuklemeHata(true);
      }
      setYukleniyor(false);
    })();
    return () => {
      iptal = true;
    };
  }, [yenile]);

  // Unmount temizliği
  useEffect(() => {
    return () => {
      if (zamanlayiciRef.current) clearTimeout(zamanlayiciRef.current);
    };
  }, []);

  const benim = harita?.benimBirlik || null;
  const haklar = harita?.haklar;
  const kalanHak = haklar?.kalan ?? 0;
  const toplamHak = haklar?.toplam ?? 0;
  const soruSn = duello?.soruSureSn || harita?.kurallar?.soruSureSn || 15;
  const soruSayisi = duello?.sorular?.length || harita?.kurallar?.soruSayisi || 5;

  const seciliHucre = useMemo(
    () => harita?.hucreler?.find((h) => h.id === secili) || null,
    [harita, secili]
  );

  const yerlesim = useMemo(() => {
    if (!harita?.hucreler?.length) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    const liste = harita.hucreler.map((h) => {
      const c = hexMerkez(h.q, h.r);
      minX = Math.min(minX, c.x - S * SQ3 * 0.5);
      maxX = Math.max(maxX, c.x + S * SQ3 * 0.5);
      minY = Math.min(minY, c.y - S);
      maxY = Math.max(maxY, c.y + S);
      return { h, ...c };
    });
    const pad = 14;
    return {
      liste,
      vx: minX - pad,
      vy: minY - pad,
      vw: maxX - minX + pad * 2,
      vh: maxY - minY + pad * 2,
      minX,
      maxX,
      minY,
      maxY,
    };
  }, [harita]);

  const bitir = useCallback(
    async (cevaplar) => {
      if (gonderiyorRef.current) return;
      gonderiyorRef.current = true;
      setAsama("gonder");
      setGonderHata(false);
      const r = await api("POST", { islem: "bitir", cevaplar });
      gonderiyorRef.current = false;
      if (r.ok && r.data && r.data.sonuc) {
        const h = { ...r.data };
        delete h.sonuc;
        delete h.duello;
        if (Array.isArray(h.hucreler)) setHarita(h);
        setSonuc(r.data.sonuc);
        setAsama("sonuc");
        const t = r.data.sonuc.tur;
        if (t === "kaybetti") mesaj("bilgi", "Bu sefer olmadı. Bir dahaki sefere!");
        else mesaj("tamam", "Talim tamamlandı!");
      } else {
        setGonderHata(true);
        mesaj("hata", r.data?.hata || "Sonuç gönderilemedi. Tekrar dene.");
      }
    },
    [mesaj]
  );

  const cevapla = useCallback(
    (secenek) => {
      if (kilit || !duello || asama !== "soru") return;
      setKilit(true);
      setSecilenSecenek(secenek);
      cevapRef.current = [...cevapRef.current, secenek];
      const sonSoru = idx >= duello.sorular.length - 1;
      if (zamanlayiciRef.current) clearTimeout(zamanlayiciRef.current);
      zamanlayiciRef.current = setTimeout(() => {
        zamanlayiciRef.current = null;
        if (sonSoru) {
          bitir(cevapRef.current);
        } else {
          setIdx((i) => i + 1);
          setSecilenSecenek(null);
          setBitisZamani(Date.now() + soruSn * 1000);
          setKalanMs(soruSn * 1000);
          setKilit(false);
        }
      }, SORU_GECIS_MS);
    },
    [kilit, duello, asama, idx, soruSn, bitir]
  );

  // Geri sayım
  useEffect(() => {
    if (!duello || asama !== "soru" || kilit) return undefined;
    const id = setInterval(() => {
      const kalan = bitisZamani - Date.now();
      if (kalan <= 0) {
        setKalanMs(0);
        clearInterval(id);
        cevapla(-1);
      } else {
        setKalanMs(kalan);
      }
    }, 100);
    return () => clearInterval(id);
  }, [duello, asama, kilit, bitisZamani, cevapla]);

  const baslat = useCallback(
    async (hucre) => {
      if (hazirlaniyor || !hucre) return;
      setHazirlaniyor(true);
      const r = await api("POST", { islem: "basla", hucre: hucre.id });
      setHazirlaniyor(false);
      if (r.ok && r.data?.duello?.sorular?.length) {
        const h = { ...r.data };
        delete h.duello;
        if (Array.isArray(h.hucreler)) setHarita(h);
        cevapRef.current = [];
        gonderiyorRef.current = false;
        const sn = r.data.duello.soruSureSn || 15;
        setDuello(r.data.duello);
        setIdx(0);
        setSecilenSecenek(null);
        setKilit(false);
        setSonuc(null);
        setGonderHata(false);
        setAsama("soru");
        setBitisZamani(Date.now() + sn * 1000);
        setKalanMs(sn * 1000);
      } else if (r.status === 429) {
        mesaj("bilgi", r.data?.hata || "Bugünkü talim hakkın bitti. Yarın tekrar gel!");
        setYenile((n) => n + 1);
      } else {
        mesaj("hata", r.data?.hata || "Talim başlatılamadı. Biraz sonra tekrar dene.");
      }
    },
    [hazirlaniyor, mesaj]
  );

  const haritayaDon = () => {
    if (zamanlayiciRef.current) clearTimeout(zamanlayiciRef.current);
    setDuello(null);
    setSonuc(null);
    setAsama("soru");
    setSecilenSecenek(null);
    setKilit(false);
  };

  // ---------- Render parçaları ----------
  const kaynaklar = haklar?.kaynaklar || {};
  const ipuclari = [
    { k: "gorev", t: "+1 Görev yap" },
    { k: "namaz", t: "+1 Namazını işaretle" },
    { k: "ders", t: "+1 Ders köşesinde 30 dk çalış" },
  ];

  const seciliBenim = !!(seciliHucre?.sahip && benim && seciliHucre.sahip.birlikId === benim.id);
  const seciliTakviyeli = seciliHucre?.sahip?.takviye === 1;
  const seciliHedef = hedefHesapla(seciliHucre, benim);
  const meydanKapali = !benim || kalanHak <= 0 || hazirlaniyor;
  const takviyeKapali = seciliBenim && seciliTakviyeli;
  const araziAd = (a) => harita?.kurallar?.araziler?.[a]?.ad || { ova: "Ova", tepe: "Tepe", kale: "Kale" }[a] || a;
  const araziIkon = (a) => harita?.kurallar?.araziler?.[a]?.ikon || { ova: "🌾", tepe: "⛰️", kale: "🏰" }[a] || "";
  const araziRenk = (a) =>
    harita?.kurallar?.araziler?.[a]?.renk || { ova: "#84a95b", tepe: "#a68a64", kale: "#8a8fa8" }[a] || "#a8a29e";

  const soru = duello?.sorular?.[idx];
  const kalanOran = Math.max(0, Math.min(1, kalanMs / (soruSn * 1000)));
  const kalanSn = Math.ceil(kalanMs / 1000);

  return (
    <section id="sancak-talimi" className="scroll-mt-24 space-y-4">
      {/* Başlık kartı */}
      <div className="tezhip rounded-3xl p-4 sm:p-5">
        <h2 className="font-display text-2xl text-amber-100">🚩 Sancak Talimi</h2>
        {harita ? (
          <p className="mt-1 text-sm text-amber-200/90">
            Bu hafta {harita.kalanGun} gün kaldı · Harita her pazartesi sıfırlanır
          </p>
        ) : (
          <p className="mt-1 text-sm text-amber-200/90">Harita her pazartesi sıfırlanır</p>
        )}

        {haklar && (
          <div className="mt-3 rounded-2xl bg-stone-900/80 p-3 ring-1 ring-stone-700">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-sm font-semibold text-amber-100">
                Bugünkü talim hakkın: {kalanHak}/{toplamHak}
              </span>
              <span className="flex gap-1" aria-hidden="true">
                {Array.from({ length: Math.max(toplamHak, 0) }).map((_, i) => (
                  <span
                    key={i}
                    className={i < kalanHak ? "text-lg" : "text-lg opacity-25 grayscale"}
                  >
                    🚩
                  </span>
                ))}
              </span>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-amber-200/90">
              {ipuclari.map((p) => {
                const tamam = kaynaklar[p.k] === 1;
                return (
                  <li key={p.k} className="flex items-center gap-2">
                    <span
                      className={
                        tamam
                          ? "flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/80 text-[10px] text-stone-950"
                          : "flex h-4 w-4 items-center justify-center rounded-full ring-1 ring-stone-600"
                      }
                    >
                      {tamam ? "✓" : ""}
                    </span>
                    <span className={tamam ? "text-amber-100/60 line-through" : ""}>{p.t}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {harita && !benim && (
          <p className="mt-3 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-100 ring-1 ring-amber-500/40">
            Bölge almak için önce bir birliğe katıl (Birlik Otağı). Haritayı yine de inceleyebilirsin.
          </p>
        )}
      </div>

      {/* Harita */}
      <div className="rounded-2xl bg-stone-900/80 p-2 ring-1 ring-stone-700 sm:p-3">
        {yukleniyor && (
          <p className="p-6 text-center text-sm text-amber-200 motion-safe:animate-pulse">
            Harita hazırlanıyor…
          </p>
        )}
        {!yukleniyor && yuklemeHata && !harita && (
          <div className="p-6 text-center">
            <p className="text-sm text-amber-200">Harita yüklenemedi.</p>
            <button
              type="button"
              onClick={() => {
                setYukleniyor(true);
                setYenile((n) => n + 1);
              }}
              className="varak-dugme varak-isilti mt-3 rounded-xl px-4 py-2 text-sm"
            >
              Tekrar Dene
            </button>
          </div>
        )}
        {yerlesim && (
          <div className="mx-auto w-full max-w-xl overflow-hidden rounded-xl" style={{ background: "#f3e7c9" }}>
            <svg
              viewBox={`${yerlesim.vx} ${yerlesim.vy} ${yerlesim.vw} ${yerlesim.vh}`}
              className="block h-auto w-full select-none"
              role="group"
              aria-label="Sancak Talimi haritası"
            >
              <rect x={yerlesim.vx} y={yerlesim.vy} width={yerlesim.vw} height={yerlesim.vh} fill="#f3e7c9" />
              {/* Nehir */}
              <path
                d={`M ${yerlesim.vx} ${yerlesim.minY + (yerlesim.maxY - yerlesim.minY) * 0.62}
                    C ${yerlesim.vx + yerlesim.vw * 0.25} ${yerlesim.minY + (yerlesim.maxY - yerlesim.minY) * 0.2},
                      ${yerlesim.vx + yerlesim.vw * 0.55} ${yerlesim.minY + (yerlesim.maxY - yerlesim.minY) * 0.95},
                      ${yerlesim.vx + yerlesim.vw} ${yerlesim.minY + (yerlesim.maxY - yerlesim.minY) * 0.4}`}
                fill="none"
                stroke="#7fb4d6"
                strokeOpacity="0.55"
                strokeWidth="22"
                strokeLinecap="round"
              />
              {[...yerlesim.liste]
                .sort((a, b) => (a.h.id === secili ? 1 : 0) - (b.h.id === secili ? 1 : 0))
                .map(({ h, x, y }) => {
                  const sec = h.id === secili;
                  const sahip = h.sahip;
                  const benimki = !!(sahip && benim && sahip.birlikId === benim.id);
                  const dolgu = sahip ? sahip.renk : araziRenk(h.arazi);
                  return (
                    <g
                      key={h.id}
                      transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}
                      role="button"
                      tabIndex={0}
                      aria-label={`${h.ad}, ${araziAd(h.arazi)}${sahip ? `, sahibi ${sahip.ad}` : ", sahipsiz"}`}
                      aria-pressed={sec}
                      onClick={() => setSecili(h.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSecili(h.id);
                        }
                      }}
                      className="cursor-pointer outline-none"
                    >
                      <g
                        style={{
                          transform: sec ? "scale(1.08)" : "scale(1)",
                          transition: "transform 150ms",
                        }}
                      >
                        <polygon
                          points={HEX_PTS}
                          fill={dolgu}
                          fillOpacity={sahip ? 0.85 : 0.55}
                          stroke={sec ? "#f59e0b" : benimki ? "#fbbf24" : "#78350f"}
                          strokeOpacity={sec || benimki ? 1 : 0.35}
                          strokeWidth={sec ? 4 : benimki ? 2.5 : 1}
                          strokeLinejoin="round"
                        />
                        <text
                          x="0"
                          y="6"
                          textAnchor="middle"
                          fontSize="16"
                          style={{ pointerEvents: "none" }}
                        >
                          {araziIkon(h.arazi)}
                        </text>
                        {sahip && (
                          <g style={{ pointerEvents: "none" }}>
                            <line x1="-17" y1="-20" x2="-17" y2="-6" stroke="#44200a" strokeWidth="1.5" />
                            <path d="M -17 -20 L -6 -16 L -17 -12 Z" fill={sahip.renk} stroke="#fffbeb" strokeWidth="1" />
                          </g>
                        )}
                        {sahip && sahip.takviye === 1 && (
                          <text
                            x="14"
                            y="-10"
                            textAnchor="middle"
                            fontSize="10"
                            style={{ pointerEvents: "none" }}
                          >
                            🛡
                          </text>
                        )}
                      </g>
                    </g>
                  );
                })}
            </svg>
          </div>
        )}
        {harita && (
          <p className="mt-2 text-center text-xs text-amber-200/70">Bir bölgeye dokun ve bilgisini gör.</p>
        )}
      </div>

      {/* Seçili bölge paneli */}
      {harita && (
        <div className="rounded-2xl bg-stone-900/80 p-4 ring-1 ring-stone-700">
          {!seciliHucre ? (
            <p className="text-sm text-amber-200/80">Haritadan bir bölge seç.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">
                  {araziIkon(seciliHucre.arazi)}
                </span>
                <div>
                  <h3 className="font-display text-lg text-amber-100">{seciliHucre.ad}</h3>
                  <p className="text-xs text-amber-200/80">{araziAd(seciliHucre.arazi)}</p>
                </div>
              </div>
              <p className="text-sm text-amber-100">
                {seciliBenim
                  ? "Takviye etmek için 4/5 doğru"
                  : `Kazanmak için ${seciliHedef}/5 doğru`}
              </p>
              <p className="text-sm text-amber-200/90">
                {seciliHucre.sahip ? (
                  <>
                    Sahibi:{" "}
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: seciliHucre.sahip.renk }}
                      />
                      {seciliHucre.sahip.ad}
                    </span>
                    {seciliHucre.sahip.alan ? ` · ${seciliHucre.sahip.alan} aldı` : ""}
                    {seciliTakviyeli ? " · 🛡 Takviyeli" : ""}
                  </>
                ) : (
                  "Sahibi: Henüz kimsenin değil"
                )}
              </p>
              <button
                type="button"
                disabled={meydanKapali || takviyeKapali}
                onClick={() => baslat(seciliHucre)}
                className="varak-dugme varak-isilti w-full rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {hazirlaniyor
                  ? "Hazırlanıyor…"
                  : seciliBenim
                    ? takviyeKapali
                      ? "🛡 Zaten Takviyeli"
                      : "🛡 Takviye Et"
                    : "⚔️ Meydan Oku"}
              </button>
              {!benim && <p className="text-xs text-amber-200/70">Meydan okumak için bir birliğe katılmalısın.</p>}
              {benim && kalanHak <= 0 && (
                <p className="text-xs text-amber-200/70">Bugünkü talim hakkın bitti. Yarın tekrar gel!</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sıralama */}
      {harita && (
        <div className="rounded-2xl bg-stone-900/80 p-4 ring-1 ring-stone-700">
          <h3 className="font-display text-lg text-amber-100">Bu Haftanın Sıralaması</h3>
          {harita.siralama?.length ? (
            <ol className="mt-2 space-y-1.5">
              {harita.siralama.slice(0, 5).map((b, i) => {
                const benimBirlikMi = benim && b.birlikId === benim.id;
                return (
                  <li
                    key={b.birlikId}
                    className={
                      "flex items-center gap-2 rounded-xl px-3 py-2 text-sm " +
                      (benimBirlikMi
                        ? "bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/60"
                        : "bg-stone-800/60 text-amber-200")
                    }
                  >
                    <span className="w-4 text-xs text-amber-200/70">{i + 1}.</span>
                    <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: b.renk }} />
                    <span className="min-w-0 flex-1 truncate">{b.ad}</span>
                    <span className="font-semibold">{b.sayi} bölge</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-amber-200/80">Bu hafta henüz bölge alınmadı. İlk sancağı sen dik!</p>
          )}
          {harita.gecenHaftaSancaktari && (
            <p className="mt-3 flex items-center gap-2 text-sm text-amber-100">
              <span>🏆 Geçen haftanın sancaktarı:</span>
              <span className="inline-flex items-center gap-1 font-semibold">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: harita.gecenHaftaSancaktari.renk }}
                />
                {harita.gecenHaftaSancaktari.ad}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Kurallar */}
      <div className="rounded-2xl bg-stone-900/80 ring-1 ring-stone-700">
        <button
          type="button"
          onClick={() => setKuralAcik((a) => !a)}
          aria-expanded={kuralAcik}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-amber-100"
        >
          <span className="font-display text-lg">Nasıl oynanır?</span>
          <span aria-hidden="true" className={"transition-transform " + (kuralAcik ? "rotate-180" : "")}>
            ▾
          </span>
        </button>
        {kuralAcik && (
          <ul className="space-y-1.5 px-4 pb-4 text-sm text-amber-200/90">
            <li>🌾 Ova 3/5, ⛰️ Tepe 4/5, 🏰 Kale 5/5 doğru ister.</li>
            <li>🛡 Takviye edilmiş bölge 1 doğru fazla ister.</li>
            <li>🕌 Sorular yarı yarıya Din Kültürü, yarı yarıya genel kültürdür.</li>
            <li>⭐ Her bölge kazanımı birliğine katkı puanı getirir.</li>
            <li>📅 Harita her hafta sıfırlanır.</li>
          </ul>
        )}
      </div>

      {/* Düello */}
      {duello && (
        <div
          className="fixed inset-0 z-[500] overflow-y-auto bg-stone-950/90"
          role="dialog"
          aria-modal="true"
          aria-label="Sancak Talimi düellosu"
        >
          <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center p-4">
            {asama !== "sonuc" && soru && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg text-amber-100">
                    Soru {Math.min(idx + 1, soruSayisi)}/{soruSayisi}
                  </span>
                  <span className="rounded-full bg-stone-800 px-3 py-1 text-xs text-amber-200 ring-1 ring-stone-600">
                    {soru.kategori === "din" ? "🕌 Din Kültürü" : "🌍 Genel Kültür"}
                  </span>
                </div>

                <div
                  className="h-2.5 w-full overflow-hidden rounded-full bg-stone-800 ring-1 ring-stone-700"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={soruSn}
                  aria-valuenow={Math.max(0, kalanSn)}
                  aria-label="Kalan süre"
                >
                  <div
                    className={
                      "h-full rounded-full " + (kalanSn <= 5 ? "bg-red-500" : "bg-amber-400")
                    }
                    style={{ width: `${kalanOran * 100}%` }}
                  />
                </div>
                <p className="text-right text-xs text-amber-200/70">{Math.max(0, kalanSn)} sn</p>

                <div className="rounded-2xl bg-stone-900/80 p-4 ring-1 ring-stone-700">
                  {soru.konu && <p className="mb-1 text-xs text-amber-200/70">{soru.konu}</p>}
                  <p className="text-lg font-semibold leading-snug text-amber-100 sm:text-xl">{soru.soru}</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {soru.secenekler.map((s, i) => {
                    const secildi = secilenSecenek === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={kilit || asama !== "soru"}
                        onClick={() => cevapla(i)}
                        className={
                          "flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3 text-left text-base ring-1 transition-colors motion-safe:active:scale-[0.98] " +
                          (secildi
                            ? "bg-amber-500/30 text-amber-50 ring-amber-300"
                            : "bg-stone-900/80 text-amber-100 ring-stone-700 hover:bg-stone-800")
                        }
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-800 text-xs text-amber-200 ring-1 ring-stone-600">
                          {HARF[i]}
                        </span>
                        <span>{s}</span>
                      </button>
                    );
                  })}
                </div>

                {asama === "gonder" && (
                  <div className="text-center">
                    {gonderHata ? (
                      <button
                        type="button"
                        onClick={() => bitir(cevapRef.current)}
                        className="varak-dugme varak-isilti rounded-xl px-4 py-2 text-sm"
                      >
                        Sonucu Tekrar Gönder
                      </button>
                    ) : (
                      <p className="text-sm text-amber-200 motion-safe:animate-pulse">Sonuç hesaplanıyor…</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {asama === "sonuc" && sonuc && (
              <div className="space-y-4 py-4">
                <div className="tezhip rounded-3xl p-5 text-center">
                  <div className="text-6xl motion-safe:animate-bounce" aria-hidden="true">
                    {{ fethetti: "🚩", geri_aldi: "⚔️", takviye: "🛡", kaybetti: "📚" }[sonuc.tur] || "🚩"}
                  </div>
                  <h3 className="mt-2 font-display text-2xl text-amber-100">
                    {{
                      fethetti: "🚩 Bölge senin birliğinin!",
                      geri_aldi: "⚔️ Bölgeyi geri aldın!",
                      takviye: "🛡 Bölge takviye edildi!",
                      kaybetti: "Bu sefer olmadı, ama çok şey öğrendin!",
                    }[sonuc.tur] || "Talim bitti"}
                  </h3>
                  <p className="mt-1 text-base text-amber-200">
                    {sonuc.dogruSayisi}/{sonuc.soruSayisi} doğru (hedef {sonuc.hedef})
                  </p>
                  {sonuc.sureAsildi && <p className="mt-1 text-sm text-amber-200/80">Süre aşıldı</p>}
                </div>

                <ol className="space-y-3">
                  {duello.sorular.map((q, qi) => {
                    const a =
                      sonuc.anahtar?.find((x) => x.id === q.id) || sonuc.anahtar?.[qi] || null;
                    return (
                      <li key={q.id ?? qi} className="rounded-2xl bg-stone-900/80 p-3 ring-1 ring-stone-700">
                        <p className="text-sm font-semibold text-amber-100">
                          {qi + 1}. {q.soru}
                        </p>
                        <ul className="mt-2 space-y-1">
                          {q.secenekler.map((s, si) => {
                            const dogru = a && a.dogru === si;
                            const yanlis = a && a.verilen === si && !a.dogruMu;
                            return (
                              <li
                                key={si}
                                className={
                                  "rounded-lg px-2.5 py-1.5 text-sm " +
                                  (dogru
                                    ? "bg-emerald-600/30 text-emerald-100 ring-1 ring-emerald-400"
                                    : yanlis
                                      ? "bg-red-600/30 text-red-100 ring-1 ring-red-400"
                                      : "text-amber-200/70")
                                }
                              >
                                {HARF[si]}) {s}
                                {dogru ? " ✓" : ""}
                                {yanlis ? " ✗" : ""}
                              </li>
                            );
                          })}
                        </ul>
                        {a && a.verilen === -1 && (
                          <p className="mt-1 text-xs text-amber-200/70">Cevap verilmedi</p>
                        )}
                      </li>
                    );
                  })}
                </ol>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={haritayaDon}
                    className="varak-dugme varak-isilti rounded-xl px-4 py-2 text-sm"
                  >
                    Haritaya Dön
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
