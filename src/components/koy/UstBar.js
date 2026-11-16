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

export default function UstBar({ oyun, katman = "koy", onKatmanSec, onLevelTikla, rehberAcik, onRehberAcKapat }) {
  const { durum, level, kullanici, karakter } = oyun;
  const [karakterModalAcik, setKarakterModalAcik] = useState(false);
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

  const erkekKarakterler = Object.values(KARAKTERLER).filter((k) => k.cinsiyet === "erkek");
  const kizKarakterler = Object.values(KARAKTERLER).filter((k) => k.cinsiyet === "kiz");

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-[250] flex flex-wrap items-start justify-between gap-1.5 p-2 sm:p-3">
      <div className="pointer-events-auto flex min-w-0 flex-wrap items-center gap-1.5">
        <button
          onClick={onLevelTikla}
          className="flex min-w-0 shrink items-center gap-1.5 rounded-2xl bg-stone-900/95 py-1 pl-1 pr-2.5 text-left shadow-xl ring-1 ring-amber-500/50 sm:gap-2 sm:py-1.5 sm:pl-1.5 sm:pr-3"
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

        <button
          type="button"
          onClick={() => setKarakterModalAcik(true)}
          title="Oyun Karakterini Değiştir (10 Özgün Karakter)"
          className="flex items-center gap-1.5 rounded-2xl bg-stone-900/95 py-1 pl-1 pr-2.5 text-xs font-black text-amber-100 shadow-xl ring-1 ring-amber-500/50 hover:bg-stone-800"
        >
          <img
            src={karakter?.gorsel ?? "/assets/karakterler/ahmet.webp"}
            alt={karakter?.ad ?? "Karakter"}
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-xl bg-stone-800 p-0.5 object-contain ring-1 ring-amber-400 sm:h-9 sm:w-9"
          />
          <span className="hidden lg:inline">{karakter?.ad ?? "Karakterim"}</span>
        </button>

        {/* 3 Katmanlı Harita Geçiş Barı */}
        <div className="flex items-center gap-1 rounded-2xl bg-stone-900/95 p-1 shadow-xl ring-1 ring-amber-500/50">
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
          className={`flex items-center gap-1 rounded-2xl px-2.5 py-2 text-xs font-black shadow-xl ring-1 transition ${
            rehberAcik
              ? "bg-amber-400 text-stone-950 ring-amber-200"
              : "bg-stone-900/95 text-amber-200 ring-amber-500/50 hover:bg-stone-800"
          }`}
        >
          <span>🧭</span>
          <span className="hidden sm:inline">Rehber</span>
        </button>

        {yoneticiMi && (
          <Link
            href="/admin"
            title="Admin Level Tasarım Merkezi"
            className="flex items-center gap-1 rounded-2xl bg-stone-900/95 px-2.5 py-2 text-xs font-black text-lime-300 shadow-xl ring-1 ring-lime-500/50 hover:bg-stone-800"
          >
            <span>⚙️</span>
            <span className="hidden sm:inline">Yönetim</span>
          </Link>
        )}
      </div>

      {/* Mutluluk + 4 Kaynak (Mahsul, Tahta, Taş, İnsan) */}
      <div className="pointer-events-auto flex shrink-0 items-center gap-1 rounded-2xl bg-stone-900/95 p-1 shadow-xl ring-1 ring-amber-500/50 sm:gap-1.5 sm:p-1.5">
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

      {/* Karakter Seçim / Değiştirme Penceresi (5 Erkek + 5 Kız Özgün Ortaokul Karakteri) */}
      {karakterModalAcik && (
        <div className="pointer-events-auto fixed inset-0 z-[500] flex items-center justify-center bg-black/85 p-3 sm:p-5">
          <div className="max-h-[88dvh] w-full max-w-3xl space-y-4 overflow-y-auto rounded-3xl bg-stone-900 p-4 text-amber-50 shadow-2xl ring-2 ring-amber-400 sm:p-6">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-base font-black text-amber-100 sm:text-lg">
                  👤 Oyun Karakterini Seç (10 Özgün Ortaokul Karakteri)
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
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                  👦 Erkek Öğrenci Karakterleri (5 Özgün Karakter)
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
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                  👧 Kız Öğrenci Karakterleri (5 Özgün Karakter)
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
