"use client";
import Link from "next/link";
import { KAYNAKLAR, BIRLIK_ACILIS_LEVEL, ALAN_MUCADELESI_LEVEL, toplamKonutKapasitesi } from "@/lib/oyun/sabitler";
import { kaynakAcikMi } from "@/lib/oyun/kurallar";

export default function UstBar({ oyun, katman = "koy", onKatmanSec, onLevelTikla, rehberAcik, onRehberAcKapat }) {
  const { durum, level, kullanici } = oyun;
  const birlikAcik = durum.level >= BIRLIK_ACILIS_LEVEL;
  const genelHaritaAcik = durum.level >= ALAN_MUCADELESI_LEVEL;
  const yoneticiMi = !!oyun.gelistirici || kullanici?.rol === "admin";
  const mutluluk = durum.mutluluk ?? 60;
  const konutKapasite = toplamKonutKapasitesi(durum.binalar);
  const mutlulukRenk =
    mutluluk >= 70
      ? "text-emerald-300 ring-emerald-500/40"
      : mutluluk >= 40
      ? "text-amber-200 ring-amber-500/40"
      : "text-red-300 ring-red-500/50";
  const mutlulukIkon = mutluluk >= 70 ? "😊" : mutluluk >= 40 ? "🙂" : "😟";

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-[250] flex flex-wrap items-start justify-between gap-1.5 p-2 sm:p-3">
      <div className="pointer-events-auto flex min-w-0 flex-wrap items-center gap-1.5">
        <button
          onClick={onLevelTikla}
          className="flex min-w-0 shrink items-center gap-1.5 rounded-2xl bg-stone-900/90 py-1 pl-1 pr-2.5 text-left shadow-xl ring-1 ring-amber-500/50 backdrop-blur sm:gap-2 sm:py-1.5 sm:pl-1.5 sm:pr-3"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 font-black text-stone-900 sm:h-10 sm:w-10 sm:text-lg">
            {durum.level}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[9px] uppercase tracking-wider text-amber-300/80 sm:text-[10px]">
              {kullanici ? `${kullanici.ad} · Lv.${durum.level}` : `Level ${durum.level} Gündemi`}
            </span>
            <span className="block truncate text-xs font-bold text-amber-50 sm:text-sm">{level.gundem}</span>
          </span>
        </button>

        {/* 3 Katmanlı Harita Geçiş Barı */}
        <div className="flex items-center gap-1 rounded-2xl bg-stone-900/90 p-1 shadow-xl ring-1 ring-amber-500/50 backdrop-blur">
          <button
            type="button"
            onClick={() => onKatmanSec?.("koy")}
            className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-black transition ${
              katman === "koy" ? "bg-amber-500 text-stone-950 shadow" : "text-amber-100 hover:bg-stone-800"
            }`}
          >
            <span>🏡</span>
            <span className="hidden md:inline">Köyüm</span>
          </button>
          <button
            type="button"
            onClick={() => onKatmanSec?.("birlik")}
            title={birlikAcik ? "Birlik Alanı (Külliye)" : `Level ${BIRLIK_ACILIS_LEVEL}'te açılır`}
            className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-black transition ${
              katman === "birlik"
                ? "bg-amber-500 text-stone-950 shadow"
                : birlikAcik
                ? "text-amber-100 hover:bg-stone-800"
                : "text-stone-400 opacity-75"
            }`}
          >
            <span>{birlikAcik ? "🏕️" : "🔒"}</span>
            <span className="hidden md:inline">Birlik Alanı</span>
          </button>
          <button
            type="button"
            onClick={() => onKatmanSec?.("harita")}
            title={genelHaritaAcik ? "Genel Sancak Haritası" : `Level ${ALAN_MUCADELESI_LEVEL}'da açılır`}
            className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-black transition ${
              katman === "harita"
                ? "bg-amber-500 text-stone-950 shadow"
                : genelHaritaAcik
                ? "text-amber-100 hover:bg-stone-800"
                : "text-stone-400 opacity-75"
            }`}
          >
            <span>{genelHaritaAcik ? "🗺️" : "🔒"}</span>
            <span className="hidden md:inline">Genel Harita</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onRehberAcKapat}
          title="Adım Adım Oyun Rehberi (Bilge Rehber)"
          className={`flex items-center gap-1 rounded-2xl px-2.5 py-2 text-xs font-black shadow-xl ring-1 backdrop-blur transition ${
            rehberAcik
              ? "bg-amber-400 text-stone-950 ring-amber-200"
              : "bg-stone-900/90 text-amber-200 ring-amber-500/50 hover:bg-stone-800"
          }`}
        >
          <span>🧭</span>
          <span className="hidden sm:inline">Rehber</span>
        </button>

        {yoneticiMi && (
          <Link
            href="/admin"
            title="Admin Level Tasarım Merkezi"
            className="flex items-center gap-1 rounded-2xl bg-stone-900/90 px-2.5 py-2 text-xs font-black text-lime-300 shadow-xl ring-1 ring-lime-500/50 backdrop-blur hover:bg-stone-800"
          >
            <span>⚙️</span>
            <span className="hidden sm:inline">Yönetim</span>
          </Link>
        )}
      </div>

      {/* Mutluluk + 4 Kaynak (Mahsul, Tahta, Taş, İnsan) */}
      <div className="pointer-events-auto flex shrink-0 items-center gap-1 rounded-2xl bg-stone-900/90 p-1 shadow-xl ring-1 ring-amber-500/50 backdrop-blur sm:gap-1.5 sm:p-1.5">
        <div
          className={`flex items-center gap-0.5 rounded-xl bg-stone-800 px-1.5 py-1 text-sm ring-1 sm:gap-1 sm:px-2 ${mutlulukRenk}`}
          title="Köy Mutluluğu (Oba'da davaları hikmetle çözerek artar, Kıraathane'de köye yeni insanların yerleşme ihtimalini belirler)"
        >
          <span>{mutlulukIkon}</span>
          <span className="text-xs font-black tabular-nums sm:text-sm">%{mutluluk}</span>
        </div>

        {Object.entries(KAYNAKLAR).map(([k, t]) => {
          const acik = kaynakAcikMi(k, durum.level);
          const deger =
            k === "insan" ? `${durum.envanter.insan ?? 5}/${konutKapasite}` : durum.envanter[k] ?? 0;
          return (
            <div
              key={k}
              className={`flex items-center gap-0.5 rounded-xl bg-stone-800 px-1.5 py-1 text-sm sm:gap-1 sm:px-2 ${
                acik ? "" : "opacity-40"
              }`}
              title={
                k === "insan"
                  ? `İnsan (Ahali): ${durum.envanter.insan ?? 5} / ${konutKapasite} Ev Kapasitesi`
                  : t.ad
              }
            >
              <span>{t.ikon}</span>
              <span className="text-xs font-black tabular-nums text-amber-50 sm:text-sm">
                {acik ? deger : "🔒"}
              </span>
            </div>
          );
        })}
        {oyun.cikis && (
          <button
            onClick={oyun.cikis}
            title="Çıkış yap"
            className="rounded-xl bg-stone-800 px-2 py-1 text-xs font-bold text-stone-300 hover:bg-stone-700 hover:text-white"
          >
            ⏻
          </button>
        )}
      </div>
    </header>
  );
}
