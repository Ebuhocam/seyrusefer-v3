"use client";
import { useState } from "react";
import { BINALAR, KAYNAKLAR, NOKTALAR, DEPO_SAAT, BIRLIK_ACILIS_LEVEL, LEVELLAR } from "@/lib/oyun/sabitler";
import { depoKapasitesi, kaynakAcikMi } from "@/lib/oyun/kurallar";
import { GOREV_TURLERI } from "@/lib/oyun/gorevler";
import {
  HadisKutusu,
  VideoKutusu,
  AileOkumasiKutusu,
  NamazCetelesiKutusu,
  SinavKutusu,
  SosyalMeydanKutusu,
  SeyyahKutusu,
  OzelGorevKutusu,
  BinaIciGorunumu,
} from "./GorevlerEkrani";
import { BirlikPaneli } from "./BirlikVeFetihEkrani";

export default function Panel({ secim, oyun, kapat }) {
  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center bg-black/50 sm:items-center" onClick={kapat}>
      <div
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-gradient-to-b from-stone-800 to-stone-900 p-5 text-amber-50 shadow-2xl ring-1 ring-amber-500/40 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={kapat} className="float-right -mt-1 text-2xl leading-none text-stone-400 hover:text-white">
          ×
        </button>
        {secim.tur === "bina" && <BinaIcerik id={secim.id} oyun={oyun} />}
        {secim.tur === "nokta" && secim.id === "pano" && <PanoIcerik oyun={oyun} kapat={kapat} />}
        {secim.tur === "nokta" && NOKTALAR[secim.id]?.kaynak && <KaynakIcerik id={secim.id} oyun={oyun} />}
        {secim.tur === "nokta" && secim.id === "seyyah" && (
          <>
            <h2 className="mb-2 text-xl font-black">🏇 Seyyah</h2>
            <SeyyahKutusu oyun={oyun} />
          </>
        )}
        {secim.tur === "birlik" && (
          <>
            <h2 className="mb-3 text-xl font-black">🤝 Birlik ve Alan Mücadelesi</h2>
            <BirlikPaneli oyun={oyun} varsayilanSekme={secim.sekme ?? "birlik"} />
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
function Sart({ tamam, children, eylem }) {
  return (
    <li className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${tamam ? "bg-emerald-900/40" : "bg-red-950/40"}`}>
      <span>{tamam ? "✅" : "❌"}</span>
      <span className="flex-1">{children}</span>
      {eylem}
    </li>
  );
}

function GorevEkrani({ gorevKodu, oyun, geri }) {
  const gorev = oyun.gorevler.find((g) => g.kod === gorevKodu);
  const tur = gorev?.tur ?? gorevKodu;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={geri}
        className="inline-flex items-center gap-1 rounded-lg bg-stone-800 px-2.5 py-1 text-xs font-bold text-amber-200 hover:bg-stone-700"
      >
        ← Geri Dön
      </button>
      {tur === "hadis" && <HadisKutusu oyun={oyun} gorevKodu={gorevKodu} />}
      {tur === "video" && <VideoKutusu oyun={oyun} gorevKodu={gorevKodu} />}
      {tur === "aile" && <AileOkumasiKutusu oyun={oyun} gorevKodu={gorevKodu} />}
      {tur === "namaz" && <NamazCetelesiKutusu oyun={oyun} />}
      {tur === "sinav" && <SinavKutusu oyun={oyun} />}
      {(tur === "meydan_paylasim" || tur === "meydan_yorum") && <SosyalMeydanKutusu oyun={oyun} />}
      {tur === "seyyah" && <SeyyahKutusu oyun={oyun} gorevKodu={gorevKodu} />}
      {tur === "onay" && <OzelGorevKutusu gorev={gorev} oyun={oyun} />}
    </div>
  );
}

function BinaIcerik({ id, oyun }) {
  const tanim = BINALAR[id];
  const b = oyun.binaBilgisi(id);
  const env = oyun.durum.envanter;
  const onizleme = tanim.gorsel(b.maks ? b.seviye : b.hedef);
  const [icerde, setIcerde] = useState(false);
  const [acikGorev, setAcikGorev] = useState(null);

  const binaGorevleri = oyun.gorevler.filter((g) => g.bina === id);
  const gosterilenGorevler = binaGorevleri.length > 0 ? binaGorevleri : oyun.gorevler;

  if (acikGorev) {
    return (
      <>
        <h2 className="mb-2 text-xl font-black">{tanim.ad} · Görev</h2>
        <GorevEkrani gorevKodu={acikGorev} oyun={oyun} geri={() => setAcikGorev(null)} />
      </>
    );
  }

  if (icerde && b.seviye > 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between pr-6">
          <div>
            <h2 className="text-xl font-black">{tanim.ad}</h2>
            <p className="text-xs text-amber-200/70">Seviye {b.seviye} · Bina İçi</p>
          </div>
          <button
            type="button"
            onClick={() => setIcerde(false)}
            className="rounded-lg bg-stone-800 px-2.5 py-1 text-xs font-bold text-amber-200 hover:bg-stone-700"
          >
            🔨 Yükseltme
          </button>
        </div>
        <BinaIciGorunumu binaId={id} oyun={oyun} />
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-black">{tanim.ad}</h2>
      <p className="text-sm text-amber-200/70">{b.seviye ? `Seviye ${b.seviye} / ${tanim.maksSeviye}` : "Henüz inşa edilmedi"}</p>

      <div className="relative my-4 flex h-40 items-center justify-center rounded-2xl bg-stone-950/50">
        <img src={onizleme} alt="" className={`max-h-36 object-contain ${b.seviye === 0 ? "opacity-60 grayscale" : ""}`} />
        {!b.maks && (
          <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-black text-stone-900">
            {b.seviye ? `Lv.${b.hedef} önizleme` : "İnşa önizleme"}
          </span>
        )}
      </div>

      {b.seviye > 0 && (
        <button
          type="button"
          onClick={() => setIcerde(true)}
          className="mb-4 w-full rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-700 py-3 font-black text-white shadow-lg"
        >
          🚪 İçeri Gir ({tanim.ad})
        </button>
      )}

      {b.maks ? (
        <p className="rounded-xl bg-amber-500/20 p-3 text-center font-bold">🏆 Maksimum seviyeye ulaşıldı</p>
      ) : (
        <>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-amber-300/80">
            {b.seviye ? `Seviye ${b.hedef}'e yükseltme şartları` : "İnşa şartları"}
          </h3>
          <ul className="space-y-1.5">
            <Sart tamam={b.levelYeterli}>Oyuncu Level {b.gerekenLevel}</Sart>

            {b.levelYeterli ? (
              gosterilenGorevler.map((g) => (
                <Sart
                  key={g.kod}
                  tamam={g.tamam}
                  eylem={
                    !g.tamam && (
                      <button
                        type="button"
                        onClick={() => setAcikGorev(g.kod)}
                        className="rounded-md bg-amber-500 px-2 py-1 text-xs font-black text-stone-900"
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
                <Sart key={k} tamam={env[k] >= tutar}>
                  🔑 {KAYNAKLAR[k].ikon} {KAYNAKLAR[k].ad}: <b className="tabular-nums">{env[k]}</b> / {tutar}
                </Sart>
              );
            })}
          </ul>
          <button
            disabled={!b.yapilabilir || oyun.bekliyor}
            onClick={() => oyun.yukselt(id)}
            className="mt-4 w-full rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 py-3 font-black shadow-lg disabled:from-stone-600 disabled:to-stone-700 disabled:text-stone-400"
          >
            {b.seviye ? `⬆️ Seviye ${b.hedef}'e Yükselt` : "🔨 İnşa Et"}
          </button>
        </>
      )}
    </>
  );
}

function PanoIcerik({ oyun, kapat }) {
  const { level, durum, gorevler } = oyun;
  const sonLevel = durum.level >= LEVELLAR.length;
  const [acikGorev, setAcikGorev] = useState(null);

  if (acikGorev) {
    return (
      <>
        <p className="text-xs uppercase tracking-wider text-amber-300/80">📜 Görev Panosu · Level {level.no}</p>
        <h2 className="mb-3 text-xl font-black">{level.gundem}</h2>
        <GorevEkrani gorevKodu={acikGorev} oyun={oyun} geri={() => setAcikGorev(null)} />
      </>
    );
  }

  return (
    <>
      <p className="text-xs uppercase tracking-wider text-amber-300/80">📜 Görev Panosu · Level {level.no}</p>
      <h2 className="text-2xl font-black">{level.gundem}</h2>
      <p className="mb-4 text-sm text-amber-200/70">
        Evre: {{ bireysel: "🌱 Bireysel İnşa", birlik: "🤝 Kardeşlik ve Birlik", meydan: "🚩 Meydan ve Alan Mücadelesi" }[level.evre]} · Hedef süre ≈ {level.hedefGun} gün
      </p>

      <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-amber-300/80">
        1. Gündem Görevleri (Bina Anahtarları)
      </h3>
      {gorevler.length === 0 ? (
        <p className="rounded-xl bg-stone-950/50 p-3 text-xs text-stone-400">
          Bu level için henüz görev tanımlanmamış.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {gorevler.map((g) => (
            <Sart
              key={g.kod}
              tamam={g.tamam}
              eylem={
                <button
                  type="button"
                  onClick={() => setAcikGorev(g.kod)}
                  className={`rounded-md px-2.5 py-1 text-xs font-black ${
                    g.tamam ? "bg-stone-700 text-amber-100" : "bg-amber-400 text-stone-900"
                  }`}
                >
                  {g.tamam ? "Aç" : "Yap →"}
                </button>
              }
            >
              <span>
                {GOREV_TURLERI[g.tur]?.ikon ?? "✨"} {g.ad}
              </span>
              <span className="block text-xs text-amber-200/70">
                İlerleme: <b className="tabular-nums">{g.yapilan}/{g.hedef}</b>
                {g.bina && BINALAR[g.bina] && ` · 🔑 ${BINALAR[g.bina].ad}`}
                {g.bugunYapildi && !g.tamam && " · Bugün yapıldı"}
              </span>
            </Sart>
          ))}
        </ul>
      )}

      <h3 className="mt-4 mb-2 text-sm font-bold uppercase tracking-wider text-amber-300/80">
        2. Level Bina Hedefleri
      </h3>
      <ul className="space-y-1.5">
        {level.hedefler.map((h) => (
          <Sart key={h.binaId} tamam={h.tamam}>
            {BINALAR[h.binaId]?.ad ?? h.binaId} → Seviye {h.seviye}
          </Sart>
        ))}
      </ul>

      {durum.level < BIRLIK_ACILIS_LEVEL && (
        <p className="mt-3 rounded-lg bg-sky-900/40 p-2 text-xs text-sky-100">
          🤝 Birlik sistemi {`Level ${BIRLIK_ACILIS_LEVEL}'te`} açılır.
        </p>
      )}

      <button
        disabled={!oyun.levelAtlanabilir || oyun.bekliyor}
        onClick={async () => {
          const r = await oyun.levelAtla();
          if (r) kapat();
        }}
        className="mt-4 w-full rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 py-3 font-black text-stone-900 shadow-lg disabled:from-stone-600 disabled:to-stone-700 disabled:text-stone-400"
      >
        {sonLevel ? "🎓 Son Level (Mezuniyet için Otağ'a gir)" : `⭐ Level ${durum.level + 1}'e Geç`}
      </button>
    </>
  );
}

function KaynakIcerik({ id, oyun }) {
  const n = NOKTALAR[id];
  const k = n.kaynak;
  const t = KAYNAKLAR[k];
  const { durum } = oyun;
  const acik = kaynakAcikMi(k, durum.level);
  const kap = depoKapasitesi(k, durum.binalar.otag);
  const bekleyen = oyun.bekleyen(k);
  const doluluk = Math.min(100, (bekleyen / kap) * 100);

  return (
    <>
      <h2 className="text-xl font-black">
        {n.ikon} {n.ad}
      </h2>
      <p className="mb-4 text-sm text-amber-200/70">
        {t.ad} üretir · Günde {t.gunluk}
      </p>
      {!acik ? (
        <p className="rounded-xl bg-stone-700/50 p-3 text-center">🔒 {`Level ${t.acilisLevel}'de`} açılır</p>
      ) : (
        <>
          <div className="mb-1 flex justify-between text-sm">
            <span>Depo</span>
            <span className="tabular-nums">
              {bekleyen} / {kap}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-stone-950">
            <div className={`h-full ${doluluk >= 100 ? "bg-red-500" : "bg-amber-400"}`} style={{ width: `${doluluk}%` }} />
          </div>
          <p className="mt-2 text-xs text-amber-200/60">
            Depo {DEPO_SAAT[durum.binalar.otag]} saatlik üretim alır (Otağ Lv.{durum.binalar.otag}). Dolunca üretim durur — her gün toplamayı unutma!
          </p>
          <button
            disabled={!bekleyen || oyun.bekliyor}
            onClick={() => oyun.topla(k)}
            className="mt-4 w-full rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 py-3 font-black text-stone-900 disabled:from-stone-600 disabled:to-stone-700 disabled:text-stone-400"
          >
            {bekleyen ? `${t.ikon} ${bekleyen} ${t.ad} Topla` : "Henüz birikmedi"}
          </button>
        </>
      )}
    </>
  );
}
