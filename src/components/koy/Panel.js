"use client";
import { BINALAR, KAYNAKLAR, NOKTALAR, DEPO_SAAT, BIRLIK_ACILIS_LEVEL, LEVELLAR } from "@/lib/oyun/sabitler";
import { depoKapasitesi, kaynakAcikMi } from "@/lib/oyun/kurallar";

export default function Panel({ secim, oyun, kapat }) {
  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center bg-black/50 sm:items-center" onClick={kapat}>
      <div
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-gradient-to-b from-stone-800 to-stone-900 p-5 text-amber-50 shadow-2xl ring-1 ring-amber-500/40 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={kapat} className="float-right -mt-1 text-2xl leading-none text-stone-400 hover:text-white">×</button>
        {secim.tur === "bina" && <BinaIcerik id={secim.id} oyun={oyun} />}
        {secim.tur === "nokta" && secim.id === "pano" && <PanoIcerik oyun={oyun} kapat={kapat} />}
        {secim.tur === "nokta" && NOKTALAR[secim.id].kaynak && <KaynakIcerik id={secim.id} oyun={oyun} />}
        {secim.tur === "nokta" && secim.id === "seyyah" && <SeyyahIcerik oyun={oyun} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
function Sart({ tamam, children }) {
  return (
    <li className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${tamam ? "bg-emerald-900/40" : "bg-red-950/40"}`}>
      <span>{tamam ? "✅" : "❌"}</span>
      <span className="flex-1">{children}</span>
    </li>
  );
}

function BinaIcerik({ id, oyun }) {
  const tanim = BINALAR[id];
  const b = oyun.binaBilgisi(id);
  const env = oyun.durum.envanter;
  const onizleme = tanim.gorsel(b.maks ? b.seviye : b.hedef);

  return (
    <>
      <h2 className="text-xl font-black">{tanim.ad}</h2>
      <p className="text-sm text-amber-200/70">{b.seviye ? `Seviye ${b.seviye} / ${tanim.maksSeviye}` : "Henüz inşa edilmedi"}</p>

      <div className="relative my-4 flex h-44 items-center justify-center rounded-2xl bg-stone-950/50">
        <img src={onizleme} alt="" className={`max-h-40 object-contain ${b.seviye === 0 ? "opacity-60 grayscale" : ""}`} />
        {!b.maks && (
          <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-black text-stone-900">
            {b.seviye ? `Lv.${b.hedef} önizleme` : "İnşa önizleme"}
          </span>
        )}
      </div>

      {b.maks ? (
        <p className="rounded-xl bg-amber-500/20 p-3 text-center font-bold">🏆 Maksimum seviyeye ulaşıldı</p>
      ) : (
        <>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-amber-300/80">
            {b.seviye ? `Seviye ${b.hedef}'e yükseltme şartları` : "İnşa şartları"}
          </h3>
          <ul className="space-y-1.5">
            <Sart tamam={b.levelYeterli}>Oyuncu Level {b.gerekenLevel}</Sart>
            <Sart tamam={b.gorevTamam}>
              🔑 Görev şartı
              <span className="block text-xs text-amber-200/60">{"Faz 4'te gerçek görevler bağlanacak — şimdilik geliştirici panelinden işaretleyin"}</span>
            </Sart>
            {Object.entries(b.bedel).map(([k, m]) => (
              <Sart key={k} tamam={env[k] >= m}>
                🔑 {KAYNAKLAR[k].ikon} {KAYNAKLAR[k].ad}: <b className="tabular-nums">{env[k]}</b> / {m}
              </Sart>
            ))}
          </ul>
          <button
            disabled={!b.yapilabilir}
            onClick={() => oyun.yukselt(id)}
            className="mt-4 w-full rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 py-3 font-black shadow-lg disabled:from-stone-600 disabled:to-stone-700 disabled:text-stone-400"
          >
            {b.seviye ? `⬆️ Seviye ${b.hedef}'e Yükselt` : "🔨 İnşa Et"}
          </button>
        </>
      )}

      {b.seviye > 0 && (
        <button disabled className="mt-2 w-full rounded-xl bg-indigo-800/60 py-3 font-bold text-indigo-200/60">
          🚪 İçeri Gir <span className="text-xs">(Faz 4)</span>
        </button>
      )}
    </>
  );
}

function PanoIcerik({ oyun, kapat }) {
  const { level, durum } = oyun;
  const sonLevel = durum.level >= LEVELLAR.length;
  return (
    <>
      <p className="text-xs uppercase tracking-wider text-amber-300/80">📜 Görev Panosu · Level {level.no}</p>
      <h2 className="text-2xl font-black">{level.gundem}</h2>
      <p className="mb-4 text-sm text-amber-200/70">
        Evre: {{ bireysel: "🌱 Bireysel İnşa", birlik: "🤝 Kardeşlik ve Birlik", meydan: "🚩 Meydan ve Alan Mücadelesi" }[level.evre]} · Hedef süre ≈ {level.hedefGun} gün
      </p>

      <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-amber-300/80">Level hedefleri</h3>
      <ul className="space-y-1.5">
        <Sart tamam={durum.gorevlerTamam}>
          Gündem görevleri (hadis, video, aile okuması, namaz…)
          <span className="block text-xs text-amber-200/60">{"Faz 4'te gelecek"}</span>
        </Sart>
        {level.hedefler.map((h) => (
          <Sart key={h.binaId} tamam={h.tamam}>
            {BINALAR[h.binaId].ad} → Seviye {h.seviye}
          </Sart>
        ))}
      </ul>

      {durum.level < BIRLIK_ACILIS_LEVEL && (
        <p className="mt-3 rounded-lg bg-sky-900/40 p-2 text-xs text-sky-100">🤝 Birlik sistemi {`Level ${BIRLIK_ACILIS_LEVEL}'te`} açılır.</p>
      )}

      <button
        disabled={!oyun.levelAtlanabilir}
        onClick={() => {
          oyun.levelAtla();
          kapat();
        }}
        className="mt-4 w-full rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 py-3 font-black text-stone-900 shadow-lg disabled:from-stone-600 disabled:to-stone-700 disabled:text-stone-400"
      >
        {sonLevel ? "🎓 Son level" : `⭐ Level ${durum.level + 1}'e Geç`}
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
      <h2 className="text-xl font-black">{n.ikon} {n.ad}</h2>
      <p className="mb-4 text-sm text-amber-200/70">{t.ad} üretir · Günde {t.gunluk}</p>
      {!acik ? (
        <p className="rounded-xl bg-stone-700/50 p-3 text-center">🔒 {`Level ${t.acilisLevel}'de`} açılır</p>
      ) : (
        <>
          <div className="mb-1 flex justify-between text-sm">
            <span>Depo</span>
            <span className="tabular-nums">{bekleyen} / {kap}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-stone-950">
            <div className={`h-full ${doluluk >= 100 ? "bg-red-500" : "bg-amber-400"}`} style={{ width: `${doluluk}%` }} />
          </div>
          <p className="mt-2 text-xs text-amber-200/60">
            Depo {DEPO_SAAT[durum.binalar.otag]} saatlik üretim alır (Otağ Lv.{durum.binalar.otag}). Dolunca üretim durur — her gün toplamayı unutma!
          </p>
          <button
            disabled={!bekleyen}
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

function SeyyahIcerik({ oyun }) {
  const acik = oyun.durum.level >= NOKTALAR.seyyah.acilisLevel;
  return (
    <>
      <h2 className="text-xl font-black">🏇 Seyyah</h2>
      <img src="/assets/binalar/seyyaherkek.webp" alt="" className={`mx-auto my-3 h-36 ${acik ? "" : "grayscale opacity-50"}`} />
      <p className="text-center text-sm text-amber-200/80">
        {acik ? "Her gün bir sürpriz iyilik görevi getirir. (Faz 4)" : `Level ${NOKTALAR.seyyah.acilisLevel}'te köyüne uğrayacak.`}
      </p>
    </>
  );
}
