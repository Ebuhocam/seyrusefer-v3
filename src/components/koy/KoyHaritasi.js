"use client";
import { useEffect, useRef, useState } from "react";
import {
  ARSALAR,
  NOKTALAR,
  BINALAR,
  BIRLIK_BINALARI,
  BOLGELER,
  KAYNAKLAR,
  BIRLIK_ACILIS_LEVEL,
  ALAN_MUCADELESI_LEVEL,
  toplamKonutKapasitesi,
} from "@/lib/oyun/sabitler";
import { kaynakAcikMi } from "@/lib/oyun/kurallar";
import { useOyun } from "@/lib/oyun/useOyun";
import UstBar from "./UstBar";
import Panel from "./Panel";
import GelistiriciPaneli from "./GelistiriciPaneli";
import RehberKarakter, { REHBER_ADIMLARI, ilkEksikRehberAdimi } from "./RehberKarakter";
import CanliKoySahnesi from "./CanliKoySahnesi";

const HARITA_ORAN = 1710 / 920;

/**
 * Bir köy binasında şu an oyuncunun yapabileceği görev veya hazır inşa/yükseltme sayısını döner.
 * Kırmızı yuvarlak bildirim rozeti (1, 2...) için kullanılır.
 */
function binaBildirimSayisi(id, oyun) {
  const { durum, gorevler, aktifIcerik } = oyun;
  const seviye = durum.binalar?.[id] ?? 0;
  const bilgi = oyun.binaBilgisi(id);
  const mektepKurulu = (durum.binalar?.mektep ?? 0) >= 1;

  // Köy Meydanı Level 1'den itibaren açıktır; Mektep kurulduktan sonra günlük dava / paylaşım görevi varsa "1" rozeti göster
  if (id === "sosyalmeydan" && mektepKurulu) {
    let meydanSayi = 0;
    const sonOlay = durum.sonMeydanOlayZamani ?? 0;
    const gunlukDavaAcik = sonOlay <= 0 || oyun.simdi - sonOlay >= 24 * 60 * 60 * 1000;
    for (const g of gorevler) {
      if (g.tamam) continue;
      if (g.tur === "dava" && gunlukDavaAcik) {
        meydanSayi += 1;
      } else if (g.tur === "meydan_paylasim" || g.tur === "meydan_yorum") {
        meydanSayi += 1;
      }
    }
    if (bilgi.yapilabilir) meydanSayi += 1;
    return meydanSayi;
  }

  // Henüz inşa edilmemiş arsa: Tüm inşa şartları ve kaynakları hazırsa kırmızı "1" göster!
  if (seviye === 0) {
    if (BINALAR[id]?.konut) {
      // Ek konutlarda sadece köyde hiç boş yatak kalmadıysa ilk uygun konutu işaretle
      const bosYatak = toplamKonutKapasitesi(durum.binalar) - (durum.envanter?.insan ?? 5);
      if (bosYatak > 0) return 0;
      const ilkBosEv = ["ev1", "ev2", "ev3", "ev4", "ev5"].find((e) => (durum.binalar?.[e] ?? 0) === 0);
      return id === ilkBosEv && bilgi.yapilabilir ? 1 : 0;
    }
    return bilgi.yapilabilir ? 1 : 0;
  }

  let sayi = 0;

  if (id === "mektep") {
    for (const g of gorevler) {
      if (g.tamam) continue;
      if (g.tur === "hadis" && !g.bugunYapildi) sayi += 1;
      else if (g.tur === "video") sayi += 1;
      else if (g.tur === "sinav" && (aktifIcerik?.sinav?.length ?? 0) > 0) sayi += 1;
    }
    if (bilgi.yapilabilir) sayi += 1;
    return sayi;
  }

  if (id === "kiraathane" && mektepKurulu) {
    for (const g of gorevler) {
      if (!g.tamam && g.tur === "turku") sayi += 1;
    }
    if (bilgi.yapilabilir) sayi += 1;
    return sayi;
  }

  if (id === "kendi_evim" && mektepKurulu) {
    const aileEksik = gorevler.some((g) => g.tur === "aile" && !g.tamam);
    const mektupEvde = (durum.mektupAlindi ?? 0) >= durum.level;
    if (aileEksik && mektupEvde) sayi += 1;
    return sayi;
  }

  if (id === "otag") {
    return bilgi.yapilabilir ? 1 : 0;
  }

  return 0;
}

/**
 * Sabit harita noktaları (Haberci, Pano) için sayısal görev rozeti (1, 2...).
 */
function noktaGorevSayisi(id, oyun) {
  const { durum, gorevler } = oyun;
  const mektepKurulu = (durum.binalar?.mektep ?? 0) >= 1;

  if (id === "pano") {
    const onayGorevi = mektepKurulu ? gorevler.filter((g) => g.tur === "onay" && !g.tamam && !g.bugunYapildi).length : 0;
    return (oyun.levelAtlanabilir ? 1 : 0) + onayGorevi;
  }

  if (id === "haberci") {
    let sayi = 0;
    const aileGoreviVar = gorevler.some((g) => g.tur === "aile" && !g.tamam);
    if (aileGoreviVar && (durum.mektupAlindi ?? 0) < durum.level) {
      sayi += 1;
    }
    if (mektepKurulu) {
      const seyyahHazir = gorevler.some((g) => g.tur === "seyyah" && !g.tamam && !g.bugunYapildi);
      if (seyyahHazir) sayi += 1;
    }
    return sayi;
  }

  return 0;
}

export default function KoyHaritasi({ baslangic }) {
  const oyun = useOyun(baslangic);
  const kaydirRef = useRef(null);
  const suruklemeRef = useRef({
    aktif: false,
    hareketEtti: false,
    basX: 0,
    basY: 0,
    sol: 0,
    ust: 0,
  });
  const [surukleniyor, setSurukleniyor] = useState(false);
  const [katman, setKatman] = useState("koy"); // 'koy' | 'birlik' | 'harita'
  const [secim, setSecim] = useState(null); // { tur: 'bina'|'nokta'|'birlikBina'|'bolge'|'birlik', id }
  const [birlikOzeti, setBirlikOzeti] = useState(null);
  const [duzenle, setDuzenle] = useState(false);
  const [koordinat, setKoordinat] = useState(null);
  const [rehberAcik, setRehberAcik] = useState(
    () => (baslangic?.durum?.binalar?.mektep ?? 0) === 0 || (baslangic?.durum?.level ?? 1) === 1
  );
  const [rehberAdimIndeks, setRehberAdimIndeks] = useState(() =>
    ilkEksikRehberAdimi(
      baslangic?.durum ?? {},
      [],
      (baslangic?.durum?.binalar?.mektep ?? 0) === 0
    )
  );

  const aktifRehberAdimi = REHBER_ADIMLARI[rehberAdimIndeks] ?? REHBER_ADIMLARI[0];

  // Bina inşa edildiğinde (ör. Mektep kurulduğunda) veya görev/level ilerlediğinde rehber açıksa sıradaki adıma otomatik geçsin
  useEffect(() => {
    if (!oyun.hazir || !rehberAcik) return;
    const adim = REHBER_ADIMLARI[rehberAdimIndeks];
    if (adim?.bolum === "gorev" && adim.tamamMi?.(oyun.durum, oyun.gorevler)) {
      const yeniIndeks = ilkEksikRehberAdimi(oyun.durum, oyun.gorevler, false);
      if (yeniIndeks !== rehberAdimIndeks) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRehberAdimIndeks(yeniIndeks);
      }
    }
  }, [oyun.hazir, oyun.durum, oyun.gorevler, rehberAcik, rehberAdimIndeks]);

  const rehberKameraHedefleri = rehberAcik && katman === "koy" ? aktifRehberAdimi?.hedefler ?? [] : [];
  const rehberHedefleri =
    rehberAcik && katman === "koy" && aktifRehberAdimi?.bolum === "gorev"
      ? aktifRehberAdimi?.hedefler ?? []
      : [];
  const ilkRehberHedefi = rehberKameraHedefleri[0] ?? null;

  // Harita açılışta veya rehber adımı değiştiğinde hedefe yumuşakça yaklaşır
  useEffect(() => {
    const el = kaydirRef.current;
    const haritaEl = el?.querySelector("[data-harita-tuval]");
    if (!el || !haritaEl || !oyun.hazir) return;
    let hedefX = ARSALAR.otag.x;
    let hedefY = ARSALAR.otag.y;
    if (ilkRehberHedefi) {
      const k =
        ilkRehberHedefi.tur === "bina"
          ? ARSALAR[ilkRehberHedefi.id]
          : NOKTALAR[ilkRehberHedefi.id];
      if (k) {
        hedefX = k.x;
        hedefY = k.y;
      }
    }
    const haritaSol = haritaEl.offsetLeft + (hedefX / 100) * haritaEl.clientWidth;
    const haritaUst = haritaEl.offsetTop + (hedefY / 100) * haritaEl.clientHeight;
    const dikeyOfset = rehberAcik ? el.clientHeight * 0.35 : el.clientHeight * 0.5;
    el.scrollTo({
      left: Math.max(0, haritaSol - el.clientWidth / 2),
      top: Math.max(0, haritaUst - dikeyOfset),
      behavior: "smooth",
    });
  }, [oyun.hazir, katman, ilkRehberHedefi, rehberAcik]);

  // 2. veya 3. katmana geçildiğinde birlik binaları ve bölge liderlerini çek
  useEffect(() => {
    if (katman === "koy") return;
    let iptal = false;
    fetch("/api/birlik")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!iptal && j) setBirlikOzeti(j);
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, [katman, secim]);

  if (!oyun.hazir) {
    return <main className="fixed inset-0 grid place-items-center bg-[#1f3315] text-amber-100">Köy yükleniyor…</main>;
  }

  const { durum } = oyun;

  const katmanDegistir = (yeniKatman) => {
    if (yeniKatman === "birlik" && durum.level < BIRLIK_ACILIS_LEVEL) {
      oyun.setMesaj({
        tur: "hata",
        metin: `🏕️ Birlik Alanı Level ${BIRLIK_ACILIS_LEVEL}'te açılır!`,
      });
      setSecim({ tur: "birlik", sekme: "birlik" });
      return;
    }
    if (yeniKatman === "harita" && durum.level < ALAN_MUCADELESI_LEVEL) {
      oyun.setMesaj({
        tur: "hata",
        metin: `🗺️ Genel Sancak Haritası Level ${ALAN_MUCADELESI_LEVEL}'da açılır!`,
      });
      setSecim({ tur: "birlik", sekme: "fetih" });
      return;
    }
    setSecim(null);
    setKatman(yeniKatman);
  };

  // Web'de fareyle basılı tutarak haritayı sürükleme
  const fareBas = (e) => {
    if (e.button !== 0) return;
    const el = kaydirRef.current;
    if (!el) return;
    suruklemeRef.current = {
      aktif: true,
      hareketEtti: false,
      basX: e.clientX,
      basY: e.clientY,
      sol: el.scrollLeft,
      ust: el.scrollTop,
    };
  };

  const fareHareket = (e) => {
    const s = suruklemeRef.current;
    const el = kaydirRef.current;
    if (!s.aktif || !el) return;
    const dx = e.clientX - s.basX;
    const dy = e.clientY - s.basY;
    if (!s.hareketEtti && Math.hypot(dx, dy) > 6) {
      s.hareketEtti = true;
      setSurukleniyor(true);
    }
    if (s.hareketEtti) {
      e.preventDefault();
      el.scrollLeft = s.sol - dx;
      el.scrollTop = s.ust - dy;
    }
  };

  const fareBirak = () => {
    if (!suruklemeRef.current.aktif) return;
    suruklemeRef.current.aktif = false;
    setSurukleniyor(false);
  };

  const suruklemeTikEngelle = (e) => {
    if (suruklemeRef.current.hareketEtti) {
      e.stopPropagation();
      e.preventDefault();
      suruklemeRef.current.hareketEtti = false;
    }
  };

  const haritaTikla = (e) => {
    if (suruklemeRef.current.hareketEtti) return;
    if (!duzenle) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (((e.clientX - r.left) / r.width) * 100).toFixed(1);
    const y = (((e.clientY - r.top) / r.height) * 100).toFixed(1);
    setKoordinat({ x, y });
  };

  const bolgeVerileri = birlikOzeti?.bolgeler ?? BOLGELER;
  const birlikBinalari = birlikOzeti?.birlik?.binalar ?? {};
  const tarlaDolumOzeti = oyun.dolum("erzak");
  const tarlaGorseli =
    tarlaDolumOzeti?.evre === "dolu"
      ? "/assets/binalar/tarla_dolu.webp"
      : tarlaDolumOzeti?.evre === "yari"
      ? "/assets/binalar/tarla_yari.webp"
      : "/assets/binalar/tarla_bos.webp";

  const arkaPlanHarita =
    katman === "birlik"
      ? "/assets/harita/birlik_alani.webp"
      : katman === "harita"
      ? "/assets/harita/genel_harita.webp"
      : "/assets/harita/koy.webp";

  const mektupBekliyor = (durum.mektupAlindi ?? 0) < durum.level;

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#162413] select-none">
      <div
        ref={kaydirRef}
        onMouseDown={fareBas}
        onMouseMove={fareHareket}
        onMouseUp={fareBirak}
        onMouseLeave={fareBirak}
        onClickCapture={suruklemeTikEngelle}
        className={`absolute inset-0 overflow-auto overscroll-none ${
          surukleniyor ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div
          className="relative flex items-center justify-center px-[18vw] py-[28dvh]"
          style={{
            minWidth: `calc(max(100vw, calc(100dvh * ${HARITA_ORAN})) + 36vw)`,
            minHeight: "156dvh",
            background:
              "radial-gradient(circle at center, rgba(35,58,28,0.95) 0%, rgba(18,30,16,0.98) 70%, rgba(10,16,10,1) 100%)",
          }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(ellipse_at_top,_rgba(214,211,209,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(214,211,209,0.22),_transparent_55%)]" />

          <div
            data-harita-tuval="true"
            className="relative overflow-hidden rounded-[2.75rem] shadow-[0_0_90px_rgba(0,0,0,0.85)] ring-4 ring-stone-800/80"
            style={{ width: `max(100vw, calc(100dvh * ${HARITA_ORAN}))`, aspectRatio: "1710 / 920" }}
            onClick={haritaTikla}
          >
            {/* Orijinal Tam Çözünürlüklü Harita Zemini */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={arkaPlanHarita}
              alt="Seyrüsefer Haritası"
              draggable={false}
              className="pointer-events-none block h-full w-full object-cover select-none"
            />

            {/* Akan Göksu Nehri (GLSL Shader), Salınan Ağaçlar ve 2 Yavaş Köylü (Y-Derinlik Sıralamalı) */}
            <CanliKoySahnesi
              katman={katman}
              insanSayisi={durum.envanter?.insan ?? 5}
              aktif={!secim}
            />

            {/* Harita Kenarları Yumuşak Sis Geçişi */}
            <div
              className="pointer-events-none absolute inset-0 z-[190]"
              style={{
                boxShadow: "inset 0 0 65px 28px rgba(22, 36, 19, 0.82)",
              }}
            />

            {/* ================= 1. KATMAN: KENDİ KÖYÜM ================= */}
            {katman === "koy" && (
              <>
                {/* Köy Binaları (Y-Derinliği: zIndex = Math.round(a.y * 2) -> Köylüler arkadan/önden doğru geçer) */}
                {Object.entries(ARSALAR).map(([id, a]) => {
                  const seviye = durum.binalar[id] ?? 0;
                  const bilgi = oyun.binaBilgisi(id);
                  const bildirimSayisi = binaBildirimSayisi(id, oyun);
                  const rehberVurgulu = rehberHedefleri.some((h) => h.tur === "bina" && h.id === id);
                  const kameraOdakli = rehberKameraHedefleri.some((h) => h.tur === "bina" && h.id === id);
                  return seviye > 0 ? (
                    <button
                      key={id}
                      type="button"
                      aria-label={BINALAR[id].ad}
                      onClick={() => setSecim({ tur: "bina", id })}
                      className="group absolute transition-transform duration-200 hover:scale-[1.04]"
                      style={{
                        left: `${a.x}%`,
                        top: `${a.y}%`,
                        width: `${a.genislik}%`,
                        transform: "translate(-50%, -78%)",
                        zIndex: rehberVurgulu || kameraOdakli ? 240 : Math.round(a.y * 2),
                      }}
                    >
                      {rehberVurgulu && (
                        <span className="pointer-events-none absolute -top-9 left-1/2 z-30 -translate-x-1/2 animate-bounce whitespace-nowrap rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-stone-950 shadow-xl ring-2 ring-white">
                          👇 Buraya Tıkla!
                        </span>
                      )}
                      {bildirimSayisi > 0 && (
                        <span
                          title={`${bildirimSayisi} yapılacak görev`}
                          className="pointer-events-none absolute top-1 right-1 z-30 grid h-6 min-w-6 place-items-center rounded-full bg-red-600 px-1.5 text-xs font-black text-white shadow-[0_4px_12px_rgba(220,38,38,0.85)] ring-2 ring-white"
                        >
                          {bildirimSayisi}
                        </span>
                      )}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={BINALAR[id].gorsel(seviye)}
                        alt={BINALAR[id].ad}
                        draggable={false}
                        className={`block h-auto w-full drop-shadow-[0_10px_10px_rgba(0,0,0,0.45)] select-none ${
                          rehberVurgulu || kameraOdakli ? "brightness-110" : ""
                        }`}
                      />
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-stone-900/92 px-2.5 py-0.5 text-[11px] font-bold text-amber-100 shadow-md ring-1 ring-amber-500/60 transition-transform duration-150 group-hover:scale-105 group-hover:ring-amber-300">
                        {BINALAR[id].ad} · {BINALAR[id].konut ? `${seviye}. Kat` : `Lv.${seviye}`}
                        {bilgi.yapilabilir && <span className="ml-1 text-emerald-300">▲</span>}
                      </span>
                    </button>
                  ) : (
                    <BosArsa
                      key={id}
                      id={id}
                      a={a}
                      bilgi={bilgi}
                      bildirimSayisi={bildirimSayisi}
                      rehberVurgulu={rehberVurgulu}
                      kameraOdakli={kameraOdakli}
                      onClick={() => setSecim({ tur: "bina", id })}
                    />
                  );
                })}

                {/* Sabit Noktalar: Pano, Tarla, Orman, Taş Ocağı ve Atlı Haberci Görseli */}
                {Object.entries(NOKTALAR).map(([id, n]) => {
                  const acik = n.kaynak ? kaynakAcikMi(n.kaynak, durum.level) : (n.acilisLevel ?? 1) <= durum.level;
                  const dBilgi = n.kaynak ? oyun.dolum(n.kaynak) : null;
                  const bekleyen = dBilgi?.biriken ?? 0;
                  const dolumOrani = dBilgi?.dolumOrani ?? 0;
                  const kapasite = dBilgi?.kapasite ?? 24;
                  const dolu = n.kaynak && acik && bekleyen >= kapasite;
                  const uretimUnlem = Boolean(n.kaynak && acik && (dBilgi?.hazirAdet ?? 0) > 0);
                  const noktaSayi = noktaGorevSayisi(id, oyun);
                  const rehberVurgulu = rehberHedefleri.some((h) => h.tur === "nokta" && h.id === id);
                  const kameraOdakli = rehberKameraHedefleri.some((h) => h.tur === "nokta" && h.id === id);

                  // Haberci: taş kaideden arındırılmış kendi atlı haberci görseli (seyyaherkek.webp)
                  if (id === "haberci") {
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-label={n.ad}
                        onClick={() => setSecim({ tur: "nokta", id })}
                        className="group absolute flex flex-col items-center transition-transform duration-200 hover:-translate-y-1 hover:scale-105"
                        style={{
                          left: `${n.x}%`,
                          top: `${n.y}%`,
                          width: "5.2%",
                          minWidth: "62px",
                          transform: "translate(-50%, -84%)",
                          zIndex: rehberVurgulu || kameraOdakli ? 245 : Math.round(n.y * 2),
                        }}
                      >
                        {rehberVurgulu ? (
                          <span className="mb-1 animate-bounce whitespace-nowrap rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-stone-950 shadow-xl ring-2 ring-white">
                            👇 Buraya Tıkla!
                          </span>
                        ) : (
                          mektupBekliyor && (
                            <span className="mb-0.5 whitespace-nowrap rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black text-stone-950 shadow-lg ring-1 ring-white">
                              ✉️ Mektup Var
                            </span>
                          )
                        )}
                        <div className="relative w-full">
                          {noktaSayi > 0 && (
                            <span
                              title={`${noktaSayi} yapılacak görev`}
                              className="pointer-events-none absolute -top-1 -right-1 z-30 grid h-6 min-w-6 place-items-center rounded-full bg-red-600 px-1.5 text-xs font-black text-white shadow-[0_4px_12px_rgba(220,38,38,0.85)] ring-2 ring-white"
                            >
                              {noktaSayi}
                            </span>
                          )}
                          {/* Toynak altı doğal toprak gölgesi */}
                          <span className="pointer-events-none absolute bottom-1 left-1/2 h-3.5 w-4/5 -translate-x-1/2 rounded-full bg-stone-950/45 blur-[2px]" />
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={n.gorsel || "/assets/binalar/seyyaherkek.webp"}
                            alt="Köy Habercisi"
                            draggable={false}
                            style={{
                              animation: "haberciNefes 3.4s ease-in-out infinite",
                              transformOrigin: "50% 92%",
                            }}
                            className="relative z-10 block h-auto w-full drop-shadow-[0_6px_8px_rgba(0,0,0,0.45)] select-none"
                          />
                        </div>
                        <span className="-mt-0.5 whitespace-nowrap rounded-full bg-stone-900/95 px-2.5 py-0.5 text-[11px] font-black text-amber-100 shadow ring-1 ring-amber-500/60">
                          {n.ad}
                        </span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={id}
                      type="button"
                      aria-label={n.ad}
                      onClick={() => setSecim({ tur: "nokta", id })}
                      className="group absolute flex flex-col items-center transition-transform duration-150 hover:-translate-y-1"
                      style={{
                        left: `${n.x}%`,
                        top: `${n.y}%`,
                        transform: "translate(-50%, -50%)",
                        zIndex: rehberVurgulu || kameraOdakli ? 245 : Math.round(n.y * 2) + 8,
                      }}
                    >
                      {rehberVurgulu && (
                        <span className="mb-1 animate-bounce whitespace-nowrap rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-stone-950 shadow-xl ring-2 ring-white">
                          👇 Buraya Tıkla!
                        </span>
                      )}

                      {n.kaynak && acik && (
                        <div className="mb-1 flex flex-col items-center rounded-xl bg-stone-950/95 px-2.5 py-1 shadow-lg ring-1 ring-amber-400/50">
                          <span
                            className={`text-[10px] font-black tabular-nums ${
                              dolu
                                ? "text-emerald-300"
                                : bekleyen > 0
                                ? "text-amber-200"
                                : "text-stone-400"
                            }`}
                          >
                            {n.kaynak === "erzak"
                              ? `${KAYNAKLAR.erzak.ikon} ${dBilgi?.hazirAdet ?? 0}/${dBilgi?.toplamAdet ?? 3} Parsel`
                              : n.kaynak === "kereste"
                              ? `🧭 ${dBilgi?.hazirAdet ?? 0}/${dBilgi?.toplamAdet ?? 2} Sefer`
                              : `${KAYNAKLAR.tas.ikon} ${dBilgi?.hazirAdet ?? 0}/${dBilgi?.toplamAdet ?? 6} Kaya`}
                          </span>
                          <div className="mt-0.5 h-1.5 w-16 overflow-hidden rounded-full bg-stone-800">
                            <div
                              className={`h-full transition-all ${
                                dolu ? "bg-emerald-400" : bekleyen > 0 ? "bg-amber-400" : "bg-stone-600"
                              }`}
                              style={{ width: `${dolumOrani}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {id === "pano" && oyun.levelAtlanabilir && (
                        <span className="mb-1 animate-bounce rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-black text-white">
                          Level Atla!
                        </span>
                      )}

                      {id === "tarla" ? (
                        <div className="relative">
                          {uretimUnlem && (
                            <span
                              title="Hasat edilmeye hazır mahsul var!"
                              className="pointer-events-none absolute -top-2 -right-2 z-30 grid h-6 w-6 place-items-center rounded-full bg-red-600 text-xs font-black text-white shadow-[0_4px_12px_rgba(220,38,38,0.85)] ring-2 ring-white"
                            >
                              !
                            </span>
                          )}
                          <div
                            className={`relative h-16 w-24 overflow-hidden rounded-2xl shadow-xl ring-2 transition-transform duration-150 group-hover:scale-105 sm:h-20 sm:w-28 ${
                              rehberVurgulu || kameraOdakli ? "ring-4 ring-amber-300" : "ring-amber-400/70"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={tarlaGorseli}
                              alt="Tarla"
                              draggable={false}
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute right-1 bottom-1 rounded bg-stone-950/90 px-1.5 py-0.5 text-[9px] font-black text-amber-200">
                              {dBilgi?.evre === "dolu"
                                ? "🌾 Tam Dolu"
                                : dBilgi?.evre === "yari"
                                ? "🌱 Yeşeriyor"
                                : "🟫 Boş"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          {(uretimUnlem || noktaSayi > 0) && (
                            <span
                              title={uretimUnlem ? "Üretim alanında işlem hazır!" : `${noktaSayi} yapılacak görev`}
                              className="pointer-events-none absolute -top-2 -right-2 z-30 grid h-6 min-w-6 place-items-center rounded-full bg-red-600 px-1.5 text-xs font-black text-white shadow-[0_4px_12px_rgba(220,38,38,0.85)] ring-2 ring-white"
                            >
                              {uretimUnlem ? "!" : noktaSayi}
                            </span>
                          )}
                          <span
                            className={`grid h-11 w-11 place-items-center rounded-2xl text-xl shadow-[0_8px_12px_rgba(0,0,0,0.55)] ring-2 transition-transform duration-150 group-hover:scale-110 sm:h-12 sm:w-12 sm:text-2xl ${
                              rehberVurgulu || kameraOdakli
                                ? "scale-125 bg-amber-400 text-stone-950 ring-4 ring-white"
                                : acik
                                ? "bg-stone-900/90 ring-amber-400 group-hover:bg-stone-800"
                                : "bg-stone-700/80 ring-stone-500 grayscale"
                            }`}
                          >
                            {acik ? n.ikon : "🔒"}
                          </span>
                        </div>
                      )}

                      <span className="mt-1 rounded-full bg-stone-900/95 px-2.5 py-0.5 text-[11px] font-black text-amber-100 shadow ring-1 ring-amber-500/50">
                        {n.ad}
                      </span>
                    </button>
                  );
                })}
              </>
            )}

            {/* ================= 2. KATMAN: BİRLİK ALANI (KÜLLİYE) ================= */}
            {katman === "birlik" && (
              <>
                {Object.entries(BIRLIK_BINALARI).map(([id, b]) => {
                  const seviye = birlikBinalari[id] ?? 1;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-label={b.ad}
                      onClick={() => setSecim({ tur: "birlikBina", id })}
                      className="group absolute transition-transform duration-200 hover:scale-105"
                      style={{
                        left: `${b.x}%`,
                        top: `${b.y}%`,
                        width: `${b.genislik}%`,
                        transform: "translate(-50%, -65%)",
                        zIndex: Math.round(b.y * 2),
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={b.gorsel(seviye)}
                        alt={b.ad}
                        draggable={false}
                        className="block h-auto w-full drop-shadow-[0_10px_12px_rgba(0,0,0,0.5)] select-none"
                      />
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-stone-900/95 px-2.5 py-0.5 text-xs font-black text-amber-100 shadow-lg ring-1 ring-amber-400/70 transition-transform duration-150 group-hover:scale-105">
                        {b.ad} · Lv.{seviye}
                      </span>
                    </button>
                  );
                })}

                <div className="pointer-events-none absolute bottom-4 left-1/2 z-[210] -translate-x-1/2 rounded-2xl bg-stone-950/90 px-4 py-2 text-center text-xs text-amber-100 shadow-xl ring-1 ring-amber-500/50">
                  {birlikOzeti?.birlik ? (
                    <span>
                      🚩 <b>{birlikOzeti.birlik.ad}</b> Külliyesi · 🕌 Bugün{" "}
                      <b>{birlikOzeti.birlik.namazToplam ?? 0}</b> vakit namaz · ⚡ Disiplin{" "}
                      <b>%{birlikOzeti.birlik.disiplinOrani}</b>
                    </span>
                  ) : (
                    <span>
                      🏕️ Bir birliğe katılmak veya yeni birlik kurmak için ortadaki{" "}
                      <b>Birlik Otağı</b>&apos;na tıkla!
                    </span>
                  )}
                </div>
              </>
            )}

            {/* ================= 3. KATMAN: GENEL SANCAK HARİTASI ================= */}
            {katman === "harita" && (
              <>
                {bolgeVerileri.map((b) => {
                  const koordinatBilgisi = BOLGELER.find((x) => x.id === b.id) ?? b;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSecim({ tur: "bolge", id: b.id })}
                      className="group absolute flex flex-col items-center"
                      style={{
                        left: `${koordinatBilgisi.x}%`,
                        top: `${koordinatBilgisi.y}%`,
                        transform: "translate(-50%, -50%)",
                        zIndex: 210,
                      }}
                    >
                      {b.lider ? (
                        <span
                          className="mb-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-black text-white shadow-lg ring-1 ring-white/50"
                          style={{ backgroundColor: b.lider.renk }}
                        >
                          🚩 {b.lider.ad} ({b.lider.guc})
                        </span>
                      ) : (
                        <span className="mb-1 whitespace-nowrap rounded-full bg-stone-900/90 px-2 py-0.5 text-[10px] font-bold text-amber-200 ring-1 ring-amber-500/40">
                          ⚔️ Sahipsiz Sancak
                        </span>
                      )}

                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-900/90 text-2xl shadow-xl ring-2 ring-amber-400 transition-transform group-hover:scale-110">
                        {b.ikon}
                      </span>
                      <span className="mt-1 whitespace-nowrap rounded-lg bg-stone-950/90 px-2.5 py-0.5 text-xs font-black text-amber-100 shadow ring-1 ring-amber-500/50">
                        {b.ad}
                      </span>
                    </button>
                  );
                })}

                <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-2xl bg-stone-950/90 px-4 py-2 text-center text-xs text-amber-100 shadow-xl ring-1 ring-amber-500/50">
                  🗺️ <b>Genel Sancak Haritası:</b> Bir bölgeye tıklayarak birlik kasasındaki kaynaklar ve manevi disiplin gücünüzle hamle yapın!
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <UstBar
        oyun={oyun}
        katman={katman}
        onKatmanSec={katmanDegistir}
        onLevelTikla={() => setSecim({ tur: "nokta", id: "pano" })}
        rehberAcik={rehberAcik}
        onRehberAcKapat={() => {
          if (!rehberAcik) {
            setRehberAdimIndeks(ilkEksikRehberAdimi(durum, oyun.gorevler));
            setKatman("koy");
            setRehberAcik(true);
          } else {
            setRehberAcik(false);
          }
        }}
      />

      {!secim && katman === "koy" && (
        <RehberKarakter
          acik={rehberAcik}
          adimIndeks={rehberAdimIndeks}
          setAdimIndeks={setRehberAdimIndeks}
          onKapat={() => setRehberAcik(false)}
          onHedefSec={(hedef) => {
            if (hedef) setSecim({ tur: hedef.tur, id: hedef.id });
          }}
          durum={durum}
          gorevler={oyun.gorevler}
        />
      )}

      {oyun.mesaj && (
        <div
          className={`fixed top-16 left-1/2 z-[450] -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-bold shadow-xl ${
            oyun.mesaj.tur === "hata"
              ? "bg-red-700 text-white"
              : oyun.mesaj.tur === "bilgi"
              ? "bg-amber-500 text-stone-950 ring-2 ring-amber-200"
              : "bg-emerald-600 text-white"
          }`}
        >
          {oyun.mesaj.metin}
        </div>
      )}

      {secim && (
        <Panel
          secim={secim}
          oyun={oyun}
          onSecimDegistir={setSecim}
          kapat={() => {
            setSecim(null);
            if (rehberAcik) {
              setRehberAdimIndeks(ilkEksikRehberAdimi(oyun.durum, oyun.gorevler, false));
            }
          }}
        />
      )}

      {oyun.gelistirici && (
        <GelistiriciPaneli
          oyun={oyun}
          duzenle={duzenle}
          setDuzenle={setDuzenle}
          onSifirlandi={() => {
            setSecim(null);
            setKatman("koy");
            setRehberAcik(true);
            setRehberAdimIndeks(0);
          }}
        />
      )}

      {duzenle && koordinat && (
        <div className="fixed bottom-4 left-1/2 z-[300] -translate-x-1/2 rounded-lg bg-black/85 px-4 py-2 font-mono text-sm text-lime-300">
          x: {koordinat.x}% · y: {koordinat.y}%
        </div>
      )}
    </main>
  );
}

function BosArsa({ id, a, bilgi, bildirimSayisi = 0, rehberVurgulu = false, kameraOdakli = false, onClick }) {
  const meydanMi = id === "sosyalmeydan";
  const insaEdilebilir = bilgi.levelYeterli || meydanMi;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group absolute flex flex-col items-center transition-transform duration-200 hover:-translate-y-1 hover:scale-110"
      style={{
        left: `${a.x}%`,
        top: `${a.y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: rehberVurgulu || kameraOdakli ? 245 : Math.round(a.y * 2),
      }}
    >
      {rehberVurgulu && (
        <span className="mb-1.5 animate-bounce whitespace-nowrap rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-stone-950 shadow-xl ring-2 ring-white">
          👇 Buraya Tıkla!
        </span>
      )}
      <div className="relative">
        {bildirimSayisi > 0 && (
          <span
            title={meydanMi ? `${bildirimSayisi} yapılacak görev` : "İnşa edilmeye hazır!"}
            className="pointer-events-none absolute -top-2 -right-2 z-30 grid h-6 min-w-6 place-items-center rounded-full bg-red-600 px-1.5 text-xs font-black text-white shadow-[0_4px_12px_rgba(220,38,38,0.85)] ring-2 ring-white"
          >
            {bildirimSayisi}
          </span>
        )}
        <span
          className={`grid h-10 w-10 place-items-center rounded-full text-lg shadow-lg ring-2 ${
            rehberVurgulu || kameraOdakli
              ? "scale-125 bg-emerald-500 ring-4 ring-amber-300"
              : bilgi.yapilabilir
              ? "animate-pulse bg-emerald-600 ring-emerald-200"
              : meydanMi
              ? "bg-stone-900/90 ring-amber-400 group-hover:bg-stone-800"
              : insaEdilebilir
              ? "bg-amber-600/90 ring-amber-200"
              : "bg-stone-800/70 ring-stone-400"
          }`}
        >
          {meydanMi ? "⚖️" : insaEdilebilir ? "🔨" : "🔒"}
        </span>
      </div>
      <span className="mt-0.5 whitespace-nowrap rounded bg-stone-900/90 px-2 py-0.5 text-[10px] font-bold text-amber-100 ring-1 ring-amber-500/40">
        {BINALAR[id].ad}
        {!insaEdilebilir && ` · Lv.${bilgi.gerekenLevel}`}
      </span>
    </button>
  );
}
