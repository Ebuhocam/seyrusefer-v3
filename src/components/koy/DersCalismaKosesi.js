"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEPO_ANAHTARI = "seyrusefer_ders_odak";

const TURLER = [
  { id: "kitap", ad: "Kitap Okuma", simge: "📖", etiket: "📖 Kitap Okuma", renk: "bg-amber-400" },
  { id: "odev", ad: "Ödev", simge: "✏️", etiket: "✏️ Ödev", renk: "bg-emerald-400" },
  { id: "tekrar", ad: "Konu Tekrarı", simge: "🔁", etiket: "🔁 Konu Tekrarı", renk: "bg-sky-400" },
];

const MOTIVASYON = [
  "Harika gidiyorsun, odağını koru!",
  "Bir sayfa daha, bir soru daha…",
  "İlim, insanın en değerli hazinesidir.",
  "Küçük adımlar büyük başarılar getirir.",
  "Sabır ve istikrar, her kapıyı açar.",
  "Şimdi emek ver, sonra gururla hatırla.",
];

function turBul(id) {
  return TURLER.find((t) => t.id === id) || TURLER[0];
}

function sureYaz(d) {
  const dk = Math.max(0, Math.round(d || 0));
  if (dk < 60) return `${dk} dk`;
  return `${Math.floor(dk / 60)} sa ${dk % 60} dk`;
}

function gunTarihi(gun) {
  return new Date(gun * 86400000 - 3 * 3600000 + 12 * 3600000);
}

function saatYaz(ms) {
  try {
    return new Date(ms).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Istanbul",
    });
  } catch {
    return "";
  }
}

function sayac(ms) {
  const toplam = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(toplam / 60);
  const s = toplam % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function depoOku(baslangic) {
  try {
    const ham = window.localStorage.getItem(DEPO_ANAHTARI);
    if (!ham) return null;
    const v = JSON.parse(ham);
    if (v && v.oturumBaslangic === baslangic) {
      return {
        odakMs: Number(v.odakMs) || 0,
        kalkma: Number(v.kalkma) || 0,
      };
    }
  } catch {
    /* yok say */
  }
  return null;
}

function depoYaz(veri) {
  try {
    window.localStorage.setItem(DEPO_ANAHTARI, JSON.stringify(veri));
  } catch {
    /* yok say */
  }
}

function depoSil() {
  try {
    window.localStorage.removeItem(DEPO_ANAHTARI);
  } catch {
    /* yok say */
  }
}

async function istek(yontem, govde) {
  const secenek = {
    method: yontem,
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  };
  if (govde) secenek.body = JSON.stringify(govde);
  let yanit;
  try {
    yanit = await fetch("/api/ders", secenek);
  } catch {
    throw new Error("Bağlantı kurulamadı. Lütfen tekrar dene.");
  }
  let veri = null;
  try {
    veri = await yanit.json();
  } catch {
    /* gövde yok */
  }
  if (!yanit.ok) {
    throw new Error((veri && veri.hata) || "Bir şeyler ters gitti.");
  }
  return veri;
}

function hucreRengi(dk) {
  if (dk >= 60) return "bg-amber-500/70 text-amber-50";
  if (dk >= 30) return "bg-amber-500/40 text-amber-100";
  if (dk > 0) return "bg-amber-500/20 text-amber-100";
  return "bg-stone-900/60 text-stone-400";
}

export default function DersCalismaKosesi() {
  const [ozet, setOzet] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");
  const [mesgul, setMesgul] = useState(false);
  const [tur, setTur] = useState("kitap");
  const [hedef, setHedef] = useState(30);
  const [ay, setAy] = useState(false);
  const [bitti, setBitti] = useState(null);
  const [vazgecOnay, setVazgecOnay] = useState(false);
  const [odakGoster, setOdakGoster] = useState(0);
  const [kalkma, setKalkma] = useState(0);
  const [uyari, setUyari] = useState(false);

  const odakRef = useRef(0);
  const kalkmaRef = useRef(0);
  const sonTikRef = useRef(0);
  const gizlendiRef = useRef(false);
  const bitiriyorRef = useRef(false);
  const bitirRef = useRef(null);

  const acik = ozet ? ozet.acikOturum : null;
  const acikId = acik ? acik.id : null;
  const acikBaslangic = acik ? acik.baslangic : null;
  const acikHedefDk = acik ? acik.hedefDakika : 0;

  // İlk yükleme
  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const veri = await istek("GET");
        if (!iptal) setOzet(veri);
      } catch (e) {
        if (!iptal) setHata(e.message);
      } finally {
        if (!iptal) setYukleniyor(false);
      }
    })();
    return () => {
      iptal = true;
    };
  }, []);

  const bitir = useCallback(async (dakika, otomatik) => {
    if (bitiriyorRef.current) return;
    bitiriyorRef.current = true;
    setMesgul(true);
    setHata("");
    try {
      const veri = await istek("POST", { islem: "bitir", dakika });
      depoSil();
      setOzet(veri);
      setVazgecOnay(false);
      setUyari(false);
      setBitti({
        dakika: typeof veri.kaydedilenDakika === "number" ? veri.kaydedilenDakika : dakika,
        otomatik,
      });
    } catch (e) {
      setHata(e.message);
      bitiriyorRef.current = false;
    } finally {
      setMesgul(false);
    }
  }, []);

  useEffect(() => {
    bitirRef.current = bitir;
  }, [bitir]);

  // Odak sayacı
  useEffect(() => {
    if (!acikId) return undefined;
    const kayit = depoOku(acikBaslangic);
    odakRef.current = kayit ? kayit.odakMs : 0;
    kalkmaRef.current = kayit ? kayit.kalkma : 0;
    sonTikRef.current = Date.now();
    gizlendiRef.current = document.visibilityState !== "visible";
    bitiriyorRef.current = false;
    const hedefMs = acikHedefDk * 60000;

    const tik = () => {
      const simdi = Date.now();
      const fark = simdi - sonTikRef.current;
      sonTikRef.current = simdi;
      if (document.visibilityState === "visible") {
        odakRef.current = Math.min(hedefMs, odakRef.current + Math.min(fark, 2500));
      }
      depoYaz({
        oturumBaslangic: acikBaslangic,
        odakMs: odakRef.current,
        kalkma: kalkmaRef.current,
      });
      setOdakGoster(odakRef.current);
      setKalkma(kalkmaRef.current);
      if (odakRef.current >= hedefMs && !bitiriyorRef.current && bitirRef.current) {
        bitirRef.current(acikHedefDk, true);
      }
    };

    const gorunurluk = () => {
      if (document.visibilityState === "hidden") {
        gizlendiRef.current = true;
      } else if (gizlendiRef.current) {
        gizlendiRef.current = false;
        sonTikRef.current = Date.now();
        kalkmaRef.current += 1;
        setKalkma(kalkmaRef.current);
        setUyari(true);
      }
    };

    const ilk = setTimeout(tik, 0);
    const aralik = setInterval(tik, 1000);
    document.addEventListener("visibilitychange", gorunurluk);
    return () => {
      clearTimeout(ilk);
      clearInterval(aralik);
      document.removeEventListener("visibilitychange", gorunurluk);
    };
  }, [acikId, acikBaslangic, acikHedefDk]);

  async function basla() {
    setMesgul(true);
    setHata("");
    setBitti(null);
    try {
      const veri = await istek("POST", { islem: "basla", tur, hedefDakika: hedef });
      depoSil();
      setOdakGoster(0);
      setKalkma(0);
      setUyari(false);
      setVazgecOnay(false);
      setOzet(veri);
    } catch (e) {
      setHata(e.message);
    } finally {
      setMesgul(false);
    }
  }

  async function vazgec() {
    setMesgul(true);
    setHata("");
    try {
      const veri = await istek("POST", { islem: "vazgec" });
      depoSil();
      setVazgecOnay(false);
      setUyari(false);
      setOzet(veri);
    } catch (e) {
      setHata(e.message);
    } finally {
      setMesgul(false);
    }
  }

  const gunler = ozet && Array.isArray(ozet.gunler) ? ozet.gunler : [];
  const hafta = gunler.slice(-7);
  const bugunDk = gunler.length ? gunler[gunler.length - 1].dakika : 0;
  const haftaToplam = hafta.reduce((t, g) => t + (g.dakika || 0), 0);
  const haftaOrt = hafta.length ? Math.round(haftaToplam / hafta.length) : 0;
  const haftaMax = Math.max(60, ...hafta.map((g) => g.dakika || 0));
  const ayToplam = gunler.reduce((t, g) => t + (g.dakika || 0), 0);
  const enCok = gunler.reduce((m, g) => (!m || (g.dakika || 0) > (m.dakika || 0) ? g : m), null);
  const oturumlar = ozet && Array.isArray(ozet.bugunkuOturumlar) ? ozet.bugunkuOturumlar : [];
  const tamamlananlar = oturumlar.filter((o) => typeof o.dakika === "number");

  const hedefMs = acikHedefDk * 60000;
  const kalanMs = Math.max(0, hedefMs - odakGoster);
  const oran = hedefMs > 0 ? Math.min(1, odakGoster / hedefMs) : 0;
  const R = 90;
  const C = 2 * Math.PI * R;
  const motivasyon = MOTIVASYON[Math.floor(odakGoster / 300000) % MOTIVASYON.length];
  const acikTur = acik ? turBul(acik.tur) : null;

  return (
    <section id="ders-calisma" className="tezhip scroll-mt-24 rounded-3xl p-4 sm:p-5">
      <header className="mb-4">
        <h2 className="font-display text-xl text-amber-100 sm:text-2xl">📚 Ders Çalışma Köşem</h2>
        <p className="mt-1 text-sm text-amber-200/80">
          Masana otur, telefonu bırak, odaklan. Süre bitene kadar masadan kalkmak yok!
        </p>
      </header>

      {hata ? (
        <div role="alert" className="mb-3 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/40">
          {hata}
        </div>
      ) : null}

      {yukleniyor ? (
        <p className="animate-pulse py-6 text-center text-sm text-amber-200/70">Yükleniyor…</p>
      ) : !ozet ? null : (
        <div className="space-y-4">
          {/* Çalışma alanı */}
          {acik ? (
            <div className="rounded-2xl bg-stone-900/80 p-4 ring-1 ring-stone-700">
              <div className="flex flex-col items-center gap-3">
                <div className="relative h-56 w-56 sm:h-64 sm:w-64">
                  <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90" aria-hidden="true">
                    <circle cx="110" cy="110" r={R} fill="none" strokeWidth="12" className="stroke-stone-700" />
                    <circle
                      cx="110"
                      cy="110"
                      r={R}
                      fill="none"
                      strokeWidth="12"
                      strokeLinecap="round"
                      className="stroke-amber-400"
                      strokeDasharray={C}
                      strokeDashoffset={C * (1 - oran)}
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold tabular-nums text-amber-100 sm:text-5xl">{sayac(kalanMs)}</span>
                    <span className="mt-1 text-sm text-amber-200/80">
                      {acikTur.simge} {acikTur.ad}
                    </span>
                  </div>
                </div>
                <p className="text-center text-sm text-amber-200">{motivasyon}</p>
                <p className="text-xs tabular-nums text-stone-300">Masadan kalkma: {kalkma}</p>
                {uyari ? (
                  <div className="w-full rounded-xl bg-amber-500/15 px-3 py-2 text-center text-sm text-amber-200 ring-1 ring-amber-400/50">
                    ⚠️ Masadan kalktın! Uzakta geçen süre sayılmadı.
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={mesgul}
                    onClick={() => bitir(Math.floor(odakRef.current / 60000), false)}
                    className="rounded-xl bg-emerald-500/20 px-5 py-2.5 text-sm text-emerald-200 ring-1 ring-emerald-400/60 hover:bg-emerald-500/30 disabled:opacity-50"
                  >
                    ✅ Erken Bitir ve Kaydet
                  </button>
                  {vazgecOnay ? (
                    <span className="flex items-center gap-2 text-xs text-amber-200">
                      Emin misin? Bu çalışma kaydedilmez.
                      <button
                        type="button"
                        disabled={mesgul}
                        onClick={vazgec}
                        className="rounded-lg bg-red-500/20 px-3 py-1.5 text-red-300 ring-1 ring-red-500/50 disabled:opacity-50"
                      >
                        Evet, vazgeç
                      </button>
                      <button
                        type="button"
                        onClick={() => setVazgecOnay(false)}
                        className="rounded-lg px-2 py-1.5 text-stone-300 underline"
                      >
                        Hayır
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={mesgul}
                      onClick={() => setVazgecOnay(true)}
                      className="text-xs text-stone-300 underline hover:text-amber-200 disabled:opacity-50"
                    >
                      Vazgeç
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : bitti ? (
            <div className="rounded-2xl bg-emerald-500/15 p-5 text-center ring-1 ring-emerald-400/50">
              <div className="text-5xl">🎉</div>
              <p className="mt-2 font-display text-lg text-emerald-200 sm:text-xl">
                {bitti.dakika > 0
                  ? `Maşallah! ${bitti.dakika} dakika odaklandın.`
                  : "Bu sefer süre yetmedi, ama denemen güzeldi!"}
              </p>
              <button
                type="button"
                onClick={() => setBitti(null)}
                className="varak-dugme varak-isilti mt-4 rounded-xl px-5 py-2.5 text-sm"
              >
                Yeni Çalışma
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-stone-900/80 p-4 ring-1 ring-stone-700">
              <div className="grid grid-cols-3 gap-2">
                {TURLER.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={tur === t.id}
                    onClick={() => setTur(t.id)}
                    className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-bold text-amber-100 transition sm:text-sm ${
                      tur === t.id ? "ring-2 ring-amber-400 bg-amber-500/15" : "bg-stone-900/70 ring-1 ring-stone-700"
                    }`}
                  >
                    <span className="text-2xl" aria-hidden="true">{t.simge}</span>
                    {t.ad}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-center gap-4">
                <button
                  type="button"
                  disabled={hedef <= 5}
                  onClick={() => setHedef((h) => Math.max(5, h - 5))}
                  className="h-11 w-14 rounded-xl bg-stone-900/70 text-lg text-amber-100 ring-1 ring-stone-700 disabled:opacity-40"
                >
                  −5
                </button>
                <span className="min-w-24 text-center text-4xl font-bold tabular-nums text-amber-100">{hedef} dk</span>
                <button
                  type="button"
                  disabled={hedef >= 120}
                  onClick={() => setHedef((h) => Math.min(120, h + 5))}
                  className="h-11 w-14 rounded-xl bg-stone-900/70 text-lg text-amber-100 ring-1 ring-stone-700 disabled:opacity-40"
                >
                  +5
                </button>
              </div>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  disabled={mesgul}
                  onClick={basla}
                  className="varak-dugme varak-isilti rounded-xl px-5 py-2.5 text-sm"
                >
                  ⏱️ Çalışmaya Başla
                </button>
              </div>
            </div>
          )}

          {/* Bugün */}
          <div className="rounded-2xl bg-stone-900/80 p-4 ring-1 ring-stone-700">
            <h3 className="text-base font-semibold tabular-nums text-amber-100">Bugün toplam: {sureYaz(bugunDk)}</h3>
            {tamamlananlar.length === 0 ? (
              <p className="mt-2 text-sm text-stone-300">Bugün henüz çalışma yok. Haydi başlayalım!</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {tamamlananlar.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between rounded-lg bg-stone-900/60 px-3 py-1.5 text-sm text-amber-200"
                  >
                    <span>
                      {turBul(o.tur).simge} {turBul(o.tur).ad}
                    </span>
                    <span className="tabular-nums">
                      {o.dakika} dk · {saatYaz(o.baslangic)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Haftalık grafik */}
          <div className="rounded-2xl bg-stone-900/80 p-4 ring-1 ring-stone-700">
            <h3 className="text-base font-semibold text-amber-100">Bu hafta</h3>
            <div className="mt-3 flex h-40 items-end gap-1.5 sm:gap-3">
              {hafta.map((g) => {
                const toplam = g.dakika || 0;
                const yuksek = (toplam / haftaMax) * 100;
                const bugunMu = g.gun === ozet.bugun;
                return (
                  <div key={g.gun} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                    <span className="mb-1 text-[11px] tabular-nums text-amber-200">{toplam}</span>
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="flex w-full flex-col-reverse overflow-hidden rounded-t-md bg-stone-800/60"
                        style={{ height: `${yuksek}%`, minHeight: toplam > 0 ? 2 : 0 }}
                      >
                        {[
                          ["kitap", "bg-amber-400"],
                          ["odev", "bg-emerald-400"],
                          ["tekrar", "bg-sky-400"],
                        ].map(([k, renk]) =>
                          g[k] > 0 ? (
                            <div key={k} className={renk} style={{ height: `${(g[k] / (toplam || 1)) * 100}%` }} />
                          ) : null,
                        )}
                      </div>
                    </div>
                    <span
                      className={`mt-1 text-[11px] ${bugunMu ? "font-bold text-amber-100" : "text-stone-300"}`}
                    >
                      {gunTarihi(g.gun).toLocaleDateString("tr-TR", { weekday: "short", timeZone: "Europe/Istanbul" })}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-amber-200">
              {TURLER.map((t) => (
                <span key={t.id} className="flex items-center gap-1.5">
                  <span className={`inline-block h-2.5 w-2.5 rounded-sm ${t.renk}`} />
                  {t.ad}
                </span>
              ))}
            </div>
            <p className="mt-2 text-sm tabular-nums text-amber-200">
              Bu hafta: toplam {sureYaz(haftaToplam)} · Günlük ortalama {sureYaz(haftaOrt)}
            </p>
          </div>

          {/* Aylık görünüm */}
          <div>
            <button
              type="button"
              onClick={() => setAy((a) => !a)}
              className="rounded-xl bg-stone-900/70 px-4 py-2 text-sm text-amber-100 ring-1 ring-stone-700 hover:ring-amber-400"
            >
              {ay ? "📅 Son 30 Günü Gizle" : "📅 Son 30 Günü Göster"}
            </button>
            {ay ? (
              <div className="mt-3 rounded-2xl bg-stone-900/80 p-4 ring-1 ring-stone-700">
                <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
                  {gunler.map((g) => (
                    <div
                      key={g.gun}
                      className={`flex flex-col items-center rounded-lg px-1 py-1.5 text-center ${hucreRengi(g.dakika || 0)} ${
                        g.gun === ozet.bugun ? "ring-1 ring-amber-300" : ""
                      }`}
                    >
                      <span className="text-[10px] leading-tight">
                        {gunTarihi(g.gun).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "short",
                          timeZone: "Europe/Istanbul",
                        })}
                      </span>
                      <span className="text-xs font-semibold tabular-nums">{g.dakika || 0}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-sm tabular-nums text-amber-200">30 günlük toplam: {sureYaz(ayToplam)}</p>
                <p className="text-sm tabular-nums text-amber-200">
                  En çok çalıştığın gün:{" "}
                  {enCok && enCok.dakika > 0
                    ? `${gunTarihi(enCok.gun).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        timeZone: "Europe/Istanbul",
                      })} (${sureYaz(enCok.dakika)})`
                    : "—"}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
