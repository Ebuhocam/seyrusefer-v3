"use client";
import { useState } from "react";
import Link from "next/link";
import {
  KAYNAKLAR,
  KARAKTERLER,
  BIRLIK_ACILIS_LEVEL,
  ALAN_MUCADELESI_LEVEL,
  toplamKonutKapasitesi,
} from "@/lib/oyun/sabitler";
import { kaynakAcikMi } from "@/lib/oyun/kurallar";
import { sesAcikMi, sesAyarla } from "./ses";

export default function UstBar({ oyun, katman = "koy", onKatmanSec, onLevelTikla, rehberAcik, onRehberAcKapat }) {
  const { durum, level, kullanici, karakter } = oyun;
  const [karakterModalAcik, setKarakterModalAcik] = useState(false);
  const birlikAcik = durum.level >= BIRLIK_ACILIS_LEVEL;
  const genelHaritaAcik = durum.level >= ALAN_MUCADELESI_LEVEL;
  const yoneticiMi = kullanici?.rol === "admin";
  const mutluluk = durum.mutluluk ?? 60;
  const konutKapasite = toplamKonutKapasitesi(durum.binalar);
  const mutlulukRenk =
    mutluluk >= 70
      ? "text-emerald-300 ring-emerald-500/40"
      : mutluluk >= 40
      ? "text-amber-200 ring-amber-500/40"
      : "text-red-300 ring-red-500/50";
  const mutlulukIkon = mutluluk >= 70 ? "😊" : mutluluk >= 40 ? "🙂" : "😟";

  const erkekKarakterler = Object.values(KARAKTERLER).filter((k) => k.cinsiyet === "erkek");
  const kizKarakterler = Object.values(KARAKTERLER).filter((k) => k.cinsiyet === "kiz");

  const KATMANLAR = [
    { id: "koy", ikon: "🏡", ad: "Köyüm", acik: true },
    { id: "birlik", ikon: "🏕️", ad: "Birlik Alanı", acik: birlikAcik, kilit: `Level ${BIRLIK_ACILIS_LEVEL}'te açılır` },
    { id: "harita", ikon: "🗺️", ad: "Genel Harita", acik: genelHaritaAcik, kilit: `Level ${ALAN_MUCADELESI_LEVEL}'da açılır` },
  ];

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-[250] flex flex-wrap items-start justify-between gap-1.5 p-2 sm:p-3 kisa:flex-nowrap kisa:gap-1 kisa:p-1!">
      <div className="pointer-events-auto flex min-w-0 flex-wrap items-center gap-1.5 kisa:flex-nowrap kisa:gap-1">
        {/* Level mührü + gündem */}
        <button
          type="button"
          onClick={onLevelTikla}
          title="Görev Panosu"
          className="ust-levha flex min-w-0 shrink items-center gap-2 rounded-2xl py-1 pr-3 pl-1 text-left kisa:pr-1!"
        >
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg font-black text-amber-950 sm:h-11 sm:w-11 sm:text-xl kisa:h-8! kisa:w-8! kisa:text-base!"
            style={{
              fontFamily: "var(--font-display)",
              background: "radial-gradient(circle at 35% 30%, #fbeaa6, #e7b93b 55%, #946511)",
              boxShadow: "0 0 0 2px #0d1628, 0 0 0 3px rgba(231,185,59,.55)",
            }}
          >
            {durum.level}
          </span>
          <span className="min-w-0 leading-tight kisa:hidden">
            <span className="block truncate text-[11px] font-semibold text-amber-300/85">
              {kullanici ? kullanici.ad : `Level ${durum.level}`}
            </span>
            <span className="font-display block truncate text-sm font-bold text-amber-50 sm:text-base">{level.gundem}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setKarakterModalAcik(true)}
          title="Oyun karakterini değiştir"
          aria-label="Oyun karakterini değiştir"
          className="ust-levha grid h-11 w-11 place-items-center rounded-2xl p-0.5 sm:h-[3.25rem] sm:w-[3.25rem] kisa:h-10! kisa:w-10!"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={karakter?.gorsel ?? "/assets/karakterler/ahmet.webp"}
            alt=""
            className="h-full w-full rounded-xl object-contain"
          />
        </button>

        {/* 3 katmanlı harita geçişi */}
        <nav aria-label="Harita katmanı" className="ust-levha flex items-center gap-0.5 rounded-2xl p-1">
          {KATMANLAR.map((k) => {
            const secili = katman === k.id;
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => onKatmanSec?.(k.id)}
                title={k.acik ? k.ad : k.kilit}
                aria-pressed={secili}
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-black transition ${
                  secili
                    ? "varak-dugme"
                    : k.acik
                    ? "text-amber-100 hover:bg-white/5"
                    : "text-stone-400/80"
                }`}
              >
                <span aria-hidden="true">{k.acik ? k.ikon : "🔒"}</span>
                <span className="hidden md:inline kisa:hidden!">{k.ad}</span>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={onRehberAcKapat}
          title="Bilge Rehber"
          aria-pressed={!!rehberAcik}
          className={`flex items-center gap-1 rounded-2xl px-2.5 py-2 text-xs font-black transition ${
            rehberAcik ? "varak-dugme" : "ust-levha text-amber-200"
          }`}
        >
          <span aria-hidden="true">🧭</span>
          <span className="hidden sm:inline kisa:hidden!">Rehber</span>
        </button>

        {yoneticiMi && (
          <Link
            href="/admin"
            title="Öğretmen Yönetim Merkezi"
            className="ust-levha flex items-center gap-1 rounded-2xl px-2.5 py-2 text-xs font-black text-emerald-200"
          >
            <span aria-hidden="true">⚙️</span>
            <span className="hidden sm:inline kisa:hidden!">Yönetim</span>
          </Link>
        )}
      </div>

      {/* Mutluluk + kaynaklar */}
      <div className="ust-levha pointer-events-auto flex shrink-0 items-center gap-0.5 rounded-2xl p-0.5 sm:gap-1 kisa:p-0.5!">
        <div
          className={`flex items-center gap-1 rounded-xl px-1.5 py-1 ring-1 sm:px-2 ${mutlulukRenk}`}
          title="Köy mutluluğu: Meydan'daki davaları hikmetle çözdükçe artar, Kıraathane'ye gelen yolcuların köyde kalma ihtimalini belirler."
        >
          <span aria-hidden="true">{mutlulukIkon}</span>
          <Sayi deger={`%${mutluluk}`} />
        </div>

        {Object.entries(KAYNAKLAR).map(([k, t]) => {
          const acik = kaynakAcikMi(k, durum.level);
          const deger = k === "insan" ? `${durum.envanter.insan ?? 5}/${konutKapasite}` : durum.envanter[k] ?? 0;
          return (
            <div
              key={k}
              className={`flex items-center gap-1 rounded-xl px-1.5 py-1 sm:px-2 ${acik ? "" : "opacity-40"}`}
              title={
                k === "insan"
                  ? `Köy nüfusu: ${durum.envanter.insan ?? 5} kişi / evlerde ${konutKapasite} kişilik yer`
                  : acik
                  ? t.ad
                  : `${t.ad}: Level ${t.acilisLevel}'de açılır`
              }
            >
              <span aria-hidden="true">{t.ikon}</span>
              {acik ? <Sayi deger={deger} /> : <span className="text-xs">🔒</span>}
            </div>
          );
        })}

        <SesDugmesi />

        {oyun.cikis && (
          <button
            type="button"
            onClick={oyun.cikis}
            title="Çıkış yap"
            aria-label="Çıkış yap"
            className="rounded-xl px-2 py-1 text-xs font-bold text-stone-300 hover:bg-white/5 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 3v8" />
              <path d="M6.3 6.8a8 8 0 1 0 11.4 0" />
            </svg>
          </button>
        )}
      </div>

      {/* Karakter Seçim / Değiştirme Penceresi (5 Erkek + 5 Kız Özgün Ortaokul Karakteri) */}
      {karakterModalAcik && (
        <div className="pointer-events-auto fixed inset-0 z-[500] flex items-center justify-center bg-stone-950/85 p-3 backdrop-blur-sm sm:p-5">
          <div className="tezhip levha-ac max-h-[88dvh] w-full max-w-3xl space-y-4 overflow-y-auto rounded-[1.75rem] p-4 text-amber-50 sm:p-6">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-xl font-black text-amber-100 sm:text-2xl">
                  Karakterini seç
                </h3>
                <p className="text-xs text-amber-200/75">
                  Şeffaf arka planlı karakterin tüm iç sahnelerde, köy meydanında ve Çınar Altı paylaşımlarında seni temsil eder.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setKarakterModalAcik(false)}
                className="shrink-0 rounded-xl bg-stone-800 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-stone-700"
              >
                ✕ Kapat
              </button>
            </div>

            {/* 5 ERKEK ÖĞRENCİ KARAKTERİ */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-amber-300">
                  Erkek karakterler
                </h4>
                <span className="text-[11px] text-stone-400">Takke · Börk · İlim Talebesi · Seyyah</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                {erkekKarakterler.map((k) => {
                  const aktif = karakter?.id === k.id;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      disabled={oyun.bekliyor}
                      onClick={async () => {
                        await oyun.karakterSec(k.id, k.cinsiyet);
                        setKarakterModalAcik(false);
                      }}
                      className={`group flex flex-col items-center rounded-2xl p-2.5 text-center ring-2 transition ${
                        aktif
                          ? "bg-gradient-to-b from-amber-500/30 to-amber-600/15 text-amber-100 ring-amber-400 shadow-lg"
                          : "bg-stone-950/85 text-stone-300 ring-stone-800 hover:bg-stone-800 hover:ring-amber-500/40"
                      }`}
                    >
                      <div className="flex h-24 w-full items-end justify-center rounded-xl bg-gradient-to-b from-stone-800/70 to-stone-950/90 p-1 ring-1 ring-amber-400/20">
                        <img
                          src={k.gorsel}
                          alt={k.ad}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.7)] transition-transform group-hover:scale-105"
                        />
                      </div>
                      <span className="mt-2 text-xs font-black text-amber-100 sm:text-sm">
                        {k.ikon} {k.ad}
                      </span>
                      <span className="mt-0.5 line-clamp-2 min-h-[1.75rem] text-[10px] leading-tight text-amber-300/85">
                        {k.unvan}
                      </span>
                      {aktif && (
                        <span className="mt-1.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-stone-950">
                          ✅ Seçili
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5 KIZ ÖĞRENCİ KARAKTERİ (3 BAŞÖRTÜLÜ + 2 BAŞÖRTÜSÜZ) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-amber-300">
                  Kız karakterler
                </h4>
                <span className="text-[11px] text-stone-400">3 Başörtülü · 2 Açık Saçlı</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                {kizKarakterler.map((k) => {
                  const aktif = karakter?.id === k.id;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      disabled={oyun.bekliyor}
                      onClick={async () => {
                        await oyun.karakterSec(k.id, k.cinsiyet);
                        setKarakterModalAcik(false);
                      }}
                      className={`group flex flex-col items-center rounded-2xl p-2.5 text-center ring-2 transition ${
                        aktif
                          ? "bg-gradient-to-b from-amber-500/30 to-amber-600/15 text-amber-100 ring-amber-400 shadow-lg"
                          : "bg-stone-950/85 text-stone-300 ring-stone-800 hover:bg-stone-800 hover:ring-amber-500/40"
                      }`}
                    >
                      <div className="flex h-24 w-full items-end justify-center rounded-xl bg-gradient-to-b from-stone-800/70 to-stone-950/90 p-1 ring-1 ring-amber-400/20">
                        <img
                          src={k.gorsel}
                          alt={k.ad}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.7)] transition-transform group-hover:scale-105"
                        />
                      </div>
                      <span className="mt-2 text-xs font-black text-amber-100 sm:text-sm">
                        {k.ikon} {k.ad}
                      </span>
                      <span className="mt-0.5 line-clamp-2 min-h-[1.75rem] text-[10px] leading-tight text-amber-300/85">
                        {k.unvan}
                      </span>
                      {aktif && (
                        <span className="mt-1.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-stone-950">
                          ✅ Seçili
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/** Değeri değişince kısa bir an parlayan sayı */
function Sayi({ deger }) {
  const [onceki, setOnceki] = useState(deger);
  const [zipla, setZipla] = useState(0);
  if (onceki !== deger) {
    setOnceki(deger);
    setZipla((z) => z + 1);
  }
  return (
    <span
      key={zipla}
      className={`inline-block text-xs font-black tabular-nums text-amber-50 sm:text-sm ${zipla ? "sayi-zipla" : ""}`}
    >
      {deger}
    </span>
  );
}

function SesDugmesi() {
  const [acik, setAcik] = useState(() => (typeof window === "undefined" ? true : sesAcikMi()));
  return (
    <button
      type="button"
      onClick={() => {
        sesAyarla(!acik);
        setAcik(!acik);
      }}
      title={acik ? "Sesleri kapat" : "Sesleri aç"}
      aria-label={acik ? "Sesleri kapat" : "Sesleri aç"}
      className="rounded-xl px-1.5 py-1 text-sm hover:bg-white/5"
      suppressHydrationWarning
    >
      {acik ? "🔔" : "🔕"}
    </button>
  );
}
