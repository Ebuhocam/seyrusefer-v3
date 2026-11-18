"use client";
import KomsuEviTasarim from "./KomsuEviTasarim";
import { useState } from "react";
import {
  BINALAR,
  BIRLIK_BINALARI,
  EV_IDLERI,
  KAYNAKLAR,
  NOKTALAR,
  BIRLIK_ACILIS_LEVEL,
  LEVELLAR,
  toplamKonutKapasitesi,
  sayiyaEk,
} from "@/lib/oyun/sabitler";
import { kaynakAcikMi, mektupBugunAlindi } from "@/lib/oyun/kurallar";
import { GOREV_TURLERI, binaSartiTamamMi } from "@/lib/oyun/gorevler";
import {
  HadisKutusu,
  VideoKutusu,
  AileOkumasiKutusu,
  NamazCetelesiKutusu,
  SinavKutusu,
  SosyalMeydanKutusu,
  SeyyahKutusu,
  HaberciKutusu,
  ObaDavaKutusu,
  KiraathaneKutusu,
  OzelGorevKutusu,
  BinaIciGorunumu,
} from "./GorevlerEkrani";
import { EvIciSahnesi, KoyMeydaniSahnesi, UretimSahnesi } from "./MekanSahnesi";
import { BirlikPaneli } from "./BirlikVeFetihEkrani";

const MEKAN_IKONLARI = {
  otag: "🏕️",
  mektep: "🏛️",
  kiraathane: "🍵",
  sosyalmeydan: "⚖️",
  kendi_evim: "🏡",
  ev1: "🏠",
  ev2: "🏠",
  ev3: "🏠",
  ev4: "🏠",
  ev5: "🏠",
};

function mekanBasligi(secim, durum) {
  if (secim.tur === "bina") {
    const t = BINALAR[secim.id];
    const s = durum.binalar[secim.id] ?? 0;
    if (!t) return { ikon: "🏛️", baslik: "Bina", alt: "" };
    const alt = t.konut
      ? s > 0
        ? `${s}. Kat · 👥 ${s * 5} Kişilik Hane`
        : "Boş Konut Arsası"
      : s > 0
      ? `Seviye ${s} / ${t.maksSeviye}`
      : "Henüz İnşa Edilmedi";
    return { ikon: MEKAN_IKONLARI[secim.id] ?? "🏛️", baslik: t.ad, alt };
  }
  if (secim.tur === "nokta") {
    if (secim.id === "pano") {
      return { ikon: "📜", baslik: "Görev Panosu", alt: `Level ${durum.level} Hedefleri` };
    }
    if (secim.id === "haberci" || secim.id === "seyyah") {
      return {
        ikon: "📜",
        gorsel: "/assets/binalar/seyyaherkek.webp",
        baslik: "Köy Habercisi",
        alt: "Aile Mektubu & Günün İyiliği",
      };
    }
    const n = NOKTALAR[secim.id];
    if (n) {
      return { ikon: n.ikon, baslik: n.ad, alt: `${KAYNAKLAR[n.kaynak]?.ad ?? ""} Üretim Sahnesi` };
    }
  }
  if (secim.tur === "birlikBina") {
    const b = BIRLIK_BINALARI[secim.id];
    return { ikon: "🏕️", baslik: b?.ad ?? "Birlik Binası", alt: "Birlik Külliyesi" };
  }
  if (secim.tur === "bolge") {
    return { ikon: "🗺️", baslik: "Genel Sancak Haritası", alt: "Alan Mücadelesi" };
  }
  return { ikon: "🤝", baslik: "Birlik ve Alan Mücadelesi", alt: "Kardeşlik Külliyesi" };
}

export default function Panel({ secim, oyun, kapat, onSecimDegistir }) {
  const { durum } = oyun;
  const baslikBilgi = mekanBasligi(secim, durum);
  const mutluluk = durum.mutluluk ?? 60;
  const konutKapasite = toplamKonutKapasitesi(durum.binalar);

  return (
    <div className="fixed inset-0 z-[400] flex flex-col overflow-hidden bg-stone-950 text-amber-50" style={{ backgroundImage: "var(--orgu), radial-gradient(120% 70% at 50% 0%, rgba(52,178,163,0.10), transparent 60%), linear-gradient(180deg, #16223a, #0d1628)" }}>
      {/* Üst Tam Ekran Mekan Çubuğu */}
      <header className="relative flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/40 bg-stone-950/90 px-3 py-2.5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] backdrop-blur sm:px-6 sm:py-3 kisa:flex-nowrap kisa:px-2! kisa:py-1!">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={kapat}
            className="inline-flex items-center gap-1.5 rounded-2xl varak-dugme px-3.5 py-2 text-xs font-black text-stone-950 shadow-md transition hover:brightness-110 sm:text-sm kisa:px-2.5! kisa:py-1.5!"
          >
            <span>←</span>
            <span>Köy Haritasına Dön</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-stone-800 text-lg ring-1 ring-amber-500/40 sm:h-10 sm:w-10 sm:text-xl">
              {baslikBilgi.gorsel ? (
                <img src={baslikBilgi.gorsel} alt="" className="h-8 w-8 object-contain" />
              ) : (
                baslikBilgi.ikon
              )}
            </span>
            <div>
              <h1 className="text-lg leading-tight font-black text-amber-100 sm:text-xl kisa:text-base!">{baslikBilgi.baslik}</h1>
              {baslikBilgi.alt && (
                <p className="text-[11px] font-semibold text-amber-300/80 sm:text-xs kisa:hidden">{baslikBilgi.alt}</p>
              )}
            </div>
          </div>
        </div>

        {/* Sağ Üst Canlı Kaynak Özeti */}
        <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-stone-900/90 p-1 ring-1 ring-amber-500/30 sm:gap-1.5 sm:p-1.5">
          <div className="flex items-center gap-1 rounded-xl bg-stone-800 px-2 py-1 text-xs font-black text-emerald-300">
            <span>{mutluluk >= 70 ? "😊" : mutluluk >= 40 ? "🙂" : "😟"}</span>
            <span>%{mutluluk}</span>
          </div>
          {Object.entries(KAYNAKLAR).map(([k, t]) => {
            const acik = kaynakAcikMi(k, durum.level);
            const deger =
              k === "insan" ? `${durum.envanter.insan ?? 5}/${konutKapasite}` : durum.envanter[k] ?? 0;
            return (
              <div
                key={k}
                className={`flex items-center gap-1 rounded-xl bg-stone-800 px-2 py-1 text-xs font-black tabular-nums ${
                  acik ? "text-amber-50" : "opacity-40"
                }`}
              >
                <span>{t.ikon}</span>
                <span>{acik ? deger : "🔒"}</span>
              </div>
            );
          })}
        </div>
      </header>

      {/* Tam Ekran Mekan Gövdesi */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-5xl">
          {secim.tur === "bina" && (
            <BinaIcerik key={secim.id} id={secim.id} oyun={oyun} onSecimDegistir={onSecimDegistir} kapat={kapat} />
          )}
          {secim.tur === "nokta" && secim.id === "pano" && (
            <PanoIcerik oyun={oyun} kapat={kapat} onSecimDegistir={onSecimDegistir} />
          )}
          {secim.tur === "nokta" && NOKTALAR[secim.id]?.kaynak && (
            <UretimSahnesi key={secim.id} id={secim.id} oyun={oyun} />
          )}
          {secim.tur === "nokta" && (secim.id === "haberci" || secim.id === "seyyah") && (
            <div className="space-y-4">
              <div className="rounded-3xl bg-stone-950/75 p-4 ring-1 ring-amber-500/30 sm:p-5">
                <p className="text-xs text-amber-200/80">
                  Köy kapısına gelen <b>Haberci</b> sana ailenle birlikte okuyacağın mektupları ve günlük iyilik görevlerini ulaştırır.
                </p>
              </div>
              <HaberciKutusu oyun={oyun} onSecimDegistir={onSecimDegistir} />
            </div>
          )}
          {secim.tur === "birlikBina" && <BirlikBinaIcerik id={secim.id} oyun={oyun} />}
          {secim.tur === "bolge" && (
            <div className="space-y-4">
              <BirlikPaneli oyun={oyun} varsayilanSekme="fetih" seciliBolgeId={secim.id} />
            </div>
          )}
          {secim.tur === "birlik" && (
            <div className="space-y-4">
              <BirlikPaneli oyun={oyun} varsayilanSekme={secim.sekme ?? "birlik"} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BirlikBinaIcerik({ id, oyun }) {
  const tanim = BIRLIK_BINALARI[id];
  if (!tanim) return null;

  if (id === "cami") {
    return (
      <div className="space-y-4">
        <NamazCetelesiKutusu oyun={oyun} />
        <BirlikPaneli oyun={oyun} varsayilanSekme="birlik" binaId="cami" />
      </div>
    );
  }

  if (id === "medrese") {
    return (
      <div className="space-y-4">
        <BinaIciGorunumu binaId="medrese" oyun={oyun} />
        <BirlikPaneli oyun={oyun} varsayilanSekme="birlik" binaId="medrese" />
      </div>
    );
  }

  const varsayilanSekme = id === "otag" ? "sohbet" : id === "oyuncadiri" ? "fetih" : "birlik";
  return (
    <div className="space-y-4">
      <BirlikPaneli oyun={oyun} varsayilanSekme={varsayilanSekme} binaId={id} />
    </div>
  );
}

// ---------------------------------------------------------------
function Sart({ tamam, children, eylem }) {
  return (
    <li
      className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm ring-1 transition-colors ${
        tamam ? "bg-emerald-900/35 text-emerald-50 ring-emerald-400/25" : "bg-stone-950/55 ring-white/5"
      }`}
    >
      {tamam ? (
        <span
          aria-label="Tamamlandı"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black text-amber-950"
          style={{ background: "radial-gradient(circle at 35% 30%, #fbeaa6, #e7b93b 60%, #946511)" }}
        >
          ✓
        </span>
      ) : (
        <span aria-label="Yapılacak" className="h-6 w-6 shrink-0 rounded-full ring-2 ring-amber-400/45 ring-inset" />
      )}
      <span className="flex-1">{children}</span>
      {eylem}
    </li>
  );
}

function GorevEkrani({ gorevKodu, oyun, geri, onSecimDegistir }) {
  const gorev = oyun.gorevler.find((g) => g.kod === gorevKodu);
  const tur = gorev?.tur ?? gorevKodu;
  const mektupAlindiMi = mektupBugunAlindi(oyun.durum, oyun.simdi);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={geri}
        className="inline-flex items-center gap-1 rounded-xl bg-stone-800 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-stone-700"
      >
        ← Ekranına Geri Dön
      </button>
      {tur === "hadis" && <HadisKutusu oyun={oyun} gorevKodu={gorevKodu} />}
      {tur === "video" && <VideoKutusu oyun={oyun} gorevKodu={gorevKodu} />}
      {tur === "aile" && (
        <div className="space-y-4 rounded-3xl bg-stone-950/90 p-6 text-center shadow-xl ring-2 ring-amber-400/50">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-stone-900 text-4xl ring-1 ring-amber-500/40">
            {mektupAlindiMi ? "🏡" : "📜"}
          </div>
          <div className="space-y-2">
            <span className="inline-block rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-black text-amber-300 ring-1 ring-amber-400/40">
              {mektupAlindiMi ? "🏡 Kendi Evinde Ailenle Oku" : "📜 Önce Haberci'den Mektubu Al"}
            </span>
            <h3 className="text-lg font-black text-amber-100 sm:text-xl">
              {mektupAlindiMi
                ? "Mektubu Evinde Ailenle Bir Araya Gelerek Açabilirsin!"
                : "Önce Haberci'den Mühürlü Mektubu Teslim Almalısın!"}
            </h3>
            <p className="mx-auto max-w-lg text-xs leading-relaxed text-amber-100/85 sm:text-sm">
              {mektupAlindiMi
                ? "Haberci'nin mektubu sadece Kendi Evim odasında, ailenle bir araya geldikten (“🤝 Ailemin Yanına Gidiyorum” → “✅ Ailemle Birlikteyim”) sonra açılıp okunabilir."
                : "Güney yolunda bekleyen Köy Habercisi'ne gidip mühürlü aile mektubunu teslim al, ardından Kendi Evine geçerek ailenle birlikte oku!"}
            </p>
          </div>
          {onSecimDegistir && (
            <button
              type="button"
              onClick={() =>
                onSecimDegistir(
                  mektupAlindiMi
                    ? { tur: "bina", id: "kendi_evim" }
                    : { tur: "nokta", id: "haberci" }
                )
              }
              className="inline-flex items-center gap-2 rounded-2xl varak-dugme px-6 py-3 text-sm font-black text-stone-950 shadow-xl ring-2 ring-amber-200 transition hover:brightness-110"
            >
              {mektupAlindiMi
                ? "🏡 Kendi Evime Git ve Ailemle Oku →"
                : "📜 Haberci'ye Git ve Mektubu Al →"}
            </button>
          )}
        </div>
      )}
      {tur === "namaz" && <NamazCetelesiKutusu oyun={oyun} />}
      {tur === "sinav" && <SinavKutusu oyun={oyun} />}
      {tur === "turku" && (
        <KiraathaneKutusu
          oyun={oyun}
          varsayilanSekme="ozan"
          onKiraathaneAc={
            onSecimDegistir ? () => onSecimDegistir({ tur: "bina", id: "kiraathane" }) : null
          }
        />
      )}
      {tur === "dava" && <ObaDavaKutusu oyun={oyun} />}
      {(tur === "meydan_paylasim" || tur === "meydan_yorum") && <SosyalMeydanKutusu oyun={oyun} />}
      {tur === "seyyah" && <SeyyahKutusu oyun={oyun} gorevKodu={gorevKodu} />}
      {tur === "onay" && <OzelGorevKutusu gorev={gorev} oyun={oyun} />}
    </div>
  );
}

function BinaIcerik({ id, oyun, onSecimDegistir, kapat }) {
  const tanim = BINALAR[id];
  const b = oyun.binaBilgisi(id);
  const env = oyun.durum.envanter;
  const onizleme = tanim.gorsel(b.maks ? b.seviye : b.hedef);
  const aktifGorsel = tanim.gorsel(Math.max(1, b.seviye || 1));

  // Kurulu tüm binalarda (Kendi Evim ve kurulu konutlar dahil) ve Köy Meydanı'nda doğrudan iç mekan sahnesi açılır
  const icMekanAcik = b.seviye > 0 || id === "sosyalmeydan";
  const [gorunum, setGorunum] = useState(icMekanAcik ? "icerde" : "insa");
  const [acikGorev, setAcikGorev] = useState(null);

  const binaGorevleri = oyun.gorevler.filter((g) => g.bina === id);
  const gosterilenGorevler = binaGorevleri.length > 0 ? binaGorevleri : oyun.gorevler;

  if (acikGorev) {
    return (
      <div className="space-y-4">
        <GorevEkrani
          gorevKodu={acikGorev}
          oyun={oyun}
          geri={() => setAcikGorev(null)}
          onSecimDegistir={onSecimDegistir}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Üst Mekan Atmosfer Kartı + Sekme Seçici */}
      <div className="flex flex-col gap-4 rounded-3xl bg-stone-950/80 p-4 ring-1 ring-amber-500/30 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-2xl bg-stone-900/90 p-2 ring-1 ring-amber-500/30 sm:h-24 sm:w-28">
            <img
              src={b.seviye > 0 ? aktifGorsel : onizleme}
              alt={tanim.ad}
              className={`max-h-full object-contain ${b.seviye === 0 ? "opacity-65 grayscale" : ""}`}
            />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-amber-100 sm:text-xl">{tanim.ad}</h2>
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-black text-amber-300 ring-1 ring-amber-400/40">
                {tanim.konut
                  ? b.seviye
                    ? `${b.seviye}. Kat / 3 Kat`
                    : "Boş Konut Arsası"
                  : b.seviye
                  ? `Seviye ${b.seviye} / ${tanim.maksSeviye}`
                  : "İnşa Bekliyor"}
              </span>
            </div>
            {tanim.aciklama && <p className="text-xs leading-relaxed text-amber-200/80 sm:text-sm">{tanim.aciklama}</p>}
          </div>
        </div>

        {/* Kurulu tüm binalarda (Konutlar dahil) İç Mekan <-> Yükseltme Geçiş Sekmeleri */}
        {icMekanAcik && (
          <div className="flex shrink-0 gap-1.5 rounded-2xl bg-stone-900 p-1.5 ring-1 ring-stone-700">
            <button
              type="button"
              onClick={() => setGorunum("icerde")}
              className={`rounded-xl px-3.5 py-2 text-xs font-black transition ${
                gorunum === "icerde"
                  ? "varak-dugme"
                  : "text-amber-100 hover:bg-stone-800"
              }`}
            >
              {tanim.konut && id !== "kendi_evim" ? "🏘️ Komşuyu Ziyaret Et" : tanim.konut ? "🚪 2D Ev İçi" : `🚪 ${tanim.ad} İçi`}
            </button>
            <button
              type="button"
              onClick={() => setGorunum("insa")}
              className={`rounded-xl px-3.5 py-2 text-xs font-black transition ${
                gorunum === "insa"
                  ? "varak-dugme"
                  : "text-amber-100 hover:bg-stone-800"
              }`}
            >
              🔨{" "}
              {b.maks
                ? "Seviye Tamam"
                : tanim.konut
                ? `${b.hedef}. Katı Çık`
                : b.seviye
                ? `Yükselt (Lv.${b.hedef})`
                : "İnşa Et"}
              {b.yapilabilir && <span className="ml-1 text-emerald-300">▲</span>}
            </button>
          </div>
        )}
      </div>

      {/* 1. GÖRÜNÜM: MEKAN İÇİ 2D SAHNESİ VEYA ÇALIŞMA EKRANI */}
      {gorunum === "icerde" && icMekanAcik ? (
        tanim.konut && id !== "kendi_evim" ? (
          <KomsuEviTasarim binaId={id} oyun={oyun} />
        ) : tanim.konut ? (
          <EvIciSahnesi
            binaId={id}
            oyun={oyun}
            onSecimDegistir={onSecimDegistir}
            onYukseltmeAc={() => setGorunum("insa")}
          />
        ) : id === "sosyalmeydan" ? (
          <KoyMeydaniSahnesi oyun={oyun} />
        ) : (
          <BinaIciGorunumu binaId={id} oyun={oyun} />
        )
      ) : (
        /* 2. GÖRÜNÜM: KONUT VEYA BİNA İNŞA / YÜKSELTME SAHNESİ */
        <div className="grid gap-5 md:grid-cols-12">
          {/* Sol Sütun: Önizleme + Konut Kapasite Durumu */}
          <div className="space-y-4 md:col-span-5">
            <div className="relative flex h-52 items-center justify-center rounded-3xl bg-stone-950/75 p-4 ring-1 ring-amber-500/30">
              <img
                src={onizleme}
                alt={tanim.ad}
                className={`max-h-44 object-contain ${b.seviye === 0 ? "opacity-65 grayscale" : ""}`}
              />
              {!b.maks && (
                <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-stone-950 shadow">
                  {tanim.konut
                    ? b.seviye
                      ? `${b.hedef}. Kat Önizleme`
                      : "1. Kat Önizleme"
                    : b.seviye
                    ? `Seviye ${b.hedef} Önizleme`
                    : "İnşa Önizleme"}
                </span>
              )}
            </div>

            {tanim.konut && (
              <div className="space-y-3 rounded-3xl bg-stone-950/80 p-4 text-xs ring-1 ring-amber-500/30">
                <div className="flex items-center justify-between font-bold text-amber-200">
                  <span>🏠 Köy Toplam Barınma Kapasitesi:</span>
                  <span className="text-sm font-black text-amber-100">
                    👥 {env.insan ?? 5} / {toplamKonutKapasitesi(oyun.durum.binalar)} Kişi
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-200/75">
                  Her konut en fazla <b>3 katlı</b> olabilir ve her kat <b>+5 👥 İnsan</b> barındırır (1. Kat: 5, 2. Kat: 10, 3. Kat: 15 Kişi). Boş yatak kapasitesi olmadan Kıraathane&apos;den yeni insan toplayamazsın!
                </p>

                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {[1, 2, 3].map((katNo) => {
                    const aktifKat = b.seviye >= katNo;
                    return (
                      <div
                        key={katNo}
                        className={`rounded-xl p-2 text-center ${
                          aktifKat
                            ? "bg-emerald-900/50 text-emerald-200 ring-1 ring-emerald-500/40"
                            : "bg-stone-900 text-stone-400 ring-1 ring-stone-800"
                        }`}
                      >
                        <div className="font-black">{katNo}. Kat</div>
                        <div className="text-[10px]">{katNo * 5} 👥 Kişi</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sağ Sütun: İnşa / Yükseltme Şartları */}
          <div className="space-y-4 rounded-3xl bg-stone-950/80 p-5 ring-1 ring-amber-500/30 md:col-span-7">
            {b.maks ? (
              <div className="rounded-2xl bg-amber-500/20 p-6 text-center font-bold text-amber-100 ring-1 ring-amber-400/50">
                <div className="text-3xl">🏆</div>
                <div className="mt-2 text-base font-black">
                  {tanim.konut
                    ? "Bu Konut 3 Kata Ulaştı (15 👥 Kişi Maksimum Kapasite)"
                    : "Bu Bina Maksimum Seviyeye Ulaştı"}
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-sm font-black text-amber-300">
                  {tanim.konut
                    ? b.seviye
                      ? `⬆️ ${b.hedef}. Kata Çıkma Şartları (+5 👥 Kapasite)`
                      : "🔨 1. Kat İnşa Şartları (+5 👥 Kapasite)"
                    : b.seviye
                    ? `⬆️ Seviye ${sayiyaEk(b.hedef)} yükseltme şartları`
                    : `🔨 ${tanim.ad} İnşa Şartları`}
                </h3>

                <ul className="space-y-2">
                  <Sart tamam={b.levelYeterli}>Oyuncu Level {b.gerekenLevel}</Sart>

                  {b.gorevGerekmez ? (
                    <Sart tamam={true}>
                      🔑 Görev şartı aranmaz (Kaynaklarla doğrudan {b.seviye ? "yükseltilebilir" : "inşa edilebilir"})
                    </Sart>
                  ) : b.levelYeterli ? (
                    gosterilenGorevler.map((g) => (
                      <Sart
                        key={g.kod}
                        tamam={binaSartiTamamMi(g)}
                        eylem={
                          !binaSartiTamamMi(g) && (
                            <button
                              type="button"
                              onClick={() => setAcikGorev(g.kod)}
                              className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-black text-stone-900"
                            >
                              Yap →
                            </button>
                          )
                        }
                      >
                        🔑 {GOREV_TURLERI[g.tur]?.ikon ?? "✨"} {g.ad}{" "}
                        <span className="text-xs text-amber-200/70">
                          ({g.yapilan}/{g.hedef})
                        </span>
                      </Sart>
                    ))
                  ) : (
                    <Sart tamam={false}>🔑 Görev şartları (Level {b.gerekenLevel}&apos;de açılır)</Sart>
                  )}

                  {Object.entries(b.bedel).map(([k, m]) => {
                    const tutar = Number(m) || 0;
                    if (tutar <= 0) return null;
                    return (
                      <Sart key={k} tamam={(env[k] ?? 0) >= tutar}>
                        {k === "insan" ? (
                          <>
                            👥 Köy nüfusu en az <b className="tabular-nums">{tutar}</b> kişi olmalı (şu an{" "}
                            <b className="tabular-nums">{env[k] ?? 0}</b>)
                            <span className="block text-[11px] font-semibold text-amber-200/70">
                              İnsanlar harcanmaz; köyünde yaşamaya devam eder.
                            </span>
                          </>
                        ) : (
                          <>
                            🔑 {KAYNAKLAR[k].ikon} {KAYNAKLAR[k].ad}: <b className="tabular-nums">{env[k] ?? 0}</b> / {tutar}
                          </>
                        )}
                      </Sart>
                    );
                  })}
                </ul>

                <button
                  disabled={!b.yapilabilir || oyun.bekliyor}
                  onClick={async () => {
                    const r = await oyun.yukselt(id);
                    if (r) {
                      kapat?.();
                    }
                  }}
                  className="w-full rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 py-3.5 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:from-stone-700 disabled:to-stone-800 disabled:text-stone-400"
                >
                  {tanim.konut
                    ? b.seviye
                      ? `⬆️ ${b.hedef}. Katı Çık (+5 👥 Kapasite)`
                      : "🔨 1. Katı İnşa Et (+5 👥 Kapasite)"
                    : b.seviye
                    ? `⬆️ Seviye ${sayiyaEk(b.hedef)} yükselt`
                    : `🔨 ${tanim.ad} Binamızı İnşa Et`}
                </button>
              </>
            )}

            {/* Konut ise tüm 5+1 mahallenin özetini de altında göster */}
            {tanim.konut && (
              <div className="border-t border-stone-800 pt-4">
                <h4 className="mb-2 text-xs font-bold text-amber-300/80">
                  🏘️ 5+1 Konut Mahallesi Genel Durumu
                </h4>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {EV_IDLERI.map((evId) => {
                    const kat = oyun.durum.binalar[evId] ?? 0;
                    return (
                      <div
                        key={evId}
                        className={`rounded-xl px-3 py-2 text-xs ring-1 ${
                          evId === id
                            ? "bg-amber-500/20 text-amber-100 ring-amber-400"
                            : "bg-stone-900/90 text-stone-300 ring-stone-800"
                        }`}
                      >
                        <div className="font-bold">{BINALAR[evId].ad}</div>
                        <div className={kat > 0 ? "font-black text-emerald-300" : "text-stone-500"}>
                          {kat > 0 ? `${kat}. Kat (${kat * 5} 👥)` : "Boş Arsa"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PanoIcerik({ oyun, kapat, onSecimDegistir }) {
  const { level, durum, gorevler } = oyun;
  const sonLevel = durum.level >= LEVELLAR.length;
  const mektepKurulu = (durum.binalar.mektep ?? 0) >= 1;
  const kiraathaneKurulu = (durum.binalar.kiraathane ?? 0) >= 1;
  const [acikGorev, setAcikGorev] = useState(null);

  if (acikGorev) {
    return (
      <div className="space-y-4">
        <GorevEkrani
          gorevKodu={acikGorev}
          oyun={oyun}
          geri={() => setAcikGorev(null)}
          onSecimDegistir={onSecimDegistir}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-stone-950/80 p-5 ring-1 ring-amber-500/30">
        <p className="text-xs font-bold text-amber-300/80">
          📜 Görev Panosu · Level {level.no}
        </p>
        <h2 className="mt-1 text-2xl font-black text-amber-100">{level.gundem}</h2>
        <p className="mt-1 text-sm text-amber-200/75">
          Evre:{" "}
          {
            {
              bireysel: "🌱 Bireysel İnşa",
              birlik: "🤝 Kardeşlik ve Birlik",
              meydan: "🚩 Meydan ve Alan Mücadelesi",
            }[level.evre]
          }{" "}
          · Hedef süre ≈ {level.hedefGun} gün
        </p>
      </div>

      {!mektepKurulu && (
        <div className="rounded-3xl bg-amber-500/20 p-4 text-xs text-amber-100 ring-2 ring-amber-400 sm:text-sm">
          <b className="block text-base text-amber-300">🏛️ Önce Mektep&apos;i İnşa Etmelisin!</b>
          Köyünde henüz <b>Mektep</b> kurulmadığı için görevler kilitlidir. Haritada meydanın solundaki{" "}
          <b>Mektep</b> arsasına tıklayıp başlangıç kaynaklarınla 1. Seviyesini hemen kurabilirsin!
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-3xl bg-stone-950/80 p-5 ring-1 ring-amber-500/30">
          <h3 className="mb-3 text-sm font-black text-amber-300">
            1. Gündem Görevleri (Bina Anahtarları)
          </h3>
          {gorevler.length === 0 ? (
            <p className="rounded-xl bg-stone-900 p-3 text-xs text-stone-400">
              Bu level için henüz görev tanımlanmamış.
            </p>
          ) : (
            <ul className="space-y-2">
              {gorevler.map((g) => {
                const kiraathaneBekliyor = g.tur === "turku" && !kiraathaneKurulu && !g.tamam;
                return (
                  <Sart
                    key={g.kod}
                    tamam={g.tamam}
                    eylem={
                      kiraathaneBekliyor && onSecimDegistir ? (
                        <button
                          type="button"
                          onClick={() => onSecimDegistir({ tur: "bina", id: "kiraathane" })}
                          className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-black text-amber-200 ring-1 ring-amber-400/50 hover:bg-stone-700"
                        >
                          🔨 Önce Kıraathane Kur
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAcikGorev(g.kod)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-black ${
                            g.tamam ? "bg-stone-700 text-amber-100" : "bg-amber-400 text-stone-900"
                          }`}
                        >
                          {g.tamam ? "Aç" : "Yap →"}
                        </button>
                      )
                    }
                  >
                    <span>
                      {GOREV_TURLERI[g.tur]?.ikon ?? "✨"} {g.ad}
                    </span>
                    <span className="block text-xs text-amber-200/70">
                      İlerleme: <b className="tabular-nums">{g.yapilan}/{g.hedef}</b>
                      {g.bina && BINALAR[g.bina] && ` · 🔑 ${BINALAR[g.bina].ad}`}
                      {kiraathaneBekliyor && " · 🔒 Kıraathane inşa edilince açılır"}
                      {g.bugunYapildi && !g.tamam && " · Bugün yapıldı"}
                      {g.kilitli && !g.tamam && ` · 🔒 ${g.kilitNotu}`}
                    </span>
                  </Sart>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col justify-between rounded-3xl bg-stone-950/80 p-5 ring-1 ring-amber-500/30">
          <div>
            <h3 className="mb-3 text-sm font-black text-amber-300">
              2. Level Bina Hedefleri
            </h3>
            <ul className="space-y-2">
              {level.hedefler.map((h) => (
                <Sart key={h.binaId} tamam={h.tamam}>
                  {BINALAR[h.binaId]?.ad ?? h.binaId} → Seviye {h.seviye}
                </Sart>
              ))}
            </ul>

            {durum.level < BIRLIK_ACILIS_LEVEL && (
              <p className="mt-4 rounded-xl bg-sky-900/40 p-3 text-xs text-sky-100">
                🤝 Birlik sistemi {`Level ${BIRLIK_ACILIS_LEVEL}'te`} açılır.
              </p>
            )}
          </div>

          <button
            disabled={!oyun.levelAtlanabilir || oyun.bekliyor}
            onClick={async () => {
              const r = await oyun.levelAtla();
              if (r) kapat();
            }}
            className="mt-5 w-full rounded-2xl varak-dugme py-3.5 text-sm font-black text-stone-900 shadow-lg disabled:from-stone-700 disabled:to-stone-800 disabled:text-stone-400"
          >
            {sonLevel ? "🎓 Son Level (Mezuniyet için Oba'ya gir)" : `⭐ Level ${sayiyaEk(durum.level + 1)} geç`}
          </button>
        </div>
      </div>
    </div>
  );
}
