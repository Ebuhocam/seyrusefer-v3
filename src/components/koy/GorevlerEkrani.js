"use client";
import { useEffect, useRef, useState } from "react";
import { toplamKonutKapasitesi } from "@/lib/oyun/sabitler";
import { NAMAZ_VAKITLERI, oyunGunu } from "@/lib/oyun/gorevler";
import { koyDavalariListesi, turkuHikayeleriListesi, gocmenDurumu } from "@/lib/oyun/hikayeler";
import { BirlikPaneli } from "./BirlikVeFetihEkrani";

// ---------------------------------------------------------------
// 1. GÜNLÜK HADİS KUTUSU
// ---------------------------------------------------------------
export function HadisKutusu({ oyun, gorevKodu = "hadis" }) {
  const { durum, aktifIcerik } = oyun;
  const gorev =
    oyun.gorevler.find((g) => g.kod === gorevKodu) ??
    oyun.gorevler.find((g) => g.tur === "hadis");
  const hadisler = aktifIcerik?.hadisler ?? [];
  const aktifIndeks = gorev ? Math.min(gorev.yapilan, Math.max(0, hadisler.length - 1)) : 0;
  const [ozelIndeks, setOzelIndeks] = useState(null);
  const secili = ozelIndeks ?? aktifIndeks;

  const h = hadisler[secili] ?? hadisler[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-300/80">
          📖 Level {durum.level} Hadisleri
        </span>
        {gorev && (
          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-200">
            {gorev.yapilan} / {gorev.hedef}
          </span>
        )}
      </div>

      {hadisler.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {hadisler.map((_, i) => {
            const okundu = gorev && i < gorev.yapilan;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setOzelIndeks(i)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  secili === i
                    ? "bg-amber-400 text-stone-900"
                    : okundu
                    ? "bg-emerald-900/60 text-emerald-200 ring-1 ring-emerald-500/40"
                    : "bg-stone-800 text-stone-300"
                }`}
              >
                {okundu ? "✅ " : ""}Hadis {i + 1}
              </button>
            );
          })}
        </div>
      )}

      {h ? (
        <div className="rounded-2xl bg-stone-950/70 p-4 ring-1 ring-amber-500/30">
          <p className="text-base leading-relaxed font-semibold text-amber-50">“{h.metin}”</p>
          {h.kaynak && <p className="mt-2 text-right text-xs font-bold text-amber-300/80">— {h.kaynak}</p>}
        </div>
      ) : (
        <p className="rounded-xl bg-stone-950/60 p-3 text-xs text-stone-400">Bu level için henüz hadis eklenmemiş.</p>
      )}

      {gorev && (
        <button
          type="button"
          disabled={oyun.bekliyor || gorev.tamam || gorev.bugunYapildi}
          onClick={() => {
            setOzelIndeks(null);
            oyun.gorevTamamla(gorev.kod);
          }}
          className="w-full rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 py-3 text-sm font-black text-stone-900 shadow-lg disabled:from-stone-700 disabled:to-stone-800 disabled:text-stone-400"
        >
          {gorev.tamam
            ? "✅ Hadis Görevi Tamamlandı"
            : gorev.bugunYapildi
            ? "✅ Bugünün Hadisini Okudun (Yarın Devam Et)"
            : "📖 Günün Hadisini Okudum ve Tefekkür Ettim"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// 2. VİDEO KUTUSU (İleri sarma engelli)
// ---------------------------------------------------------------
export function VideoKutusu({ oyun, gorevKodu = "video" }) {
  const { aktifIcerik } = oyun;
  const video = aktifIcerik?.video;
  const gorev =
    oyun.gorevler.find((g) => g.kod === gorevKodu) ??
    oyun.gorevler.find((g) => g.tur === "video");
  const toplamSn = Math.max(5, Number(video?.sureSn) || 15);

  const [oynuyor, setOynuyor] = useState(false);
  const [gecenSn, setGecenSn] = useState(0);
  const [uyari, setUyari] = useState(null);
  const videoRef = useRef(null);
  const enYuksekSnRef = useRef(0);

  useEffect(() => {
    if (!oynuyor || video?.url) return;
    const t = setInterval(() => {
      setGecenSn((sn) => {
        if (sn + 1 >= toplamSn) {
          setOynuyor(false);
          return toplamSn;
        }
        return sn + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [oynuyor, toplamSn, video?.url]);

  const bitti = (gorev && gorev.tamam) || gecenSn >= toplamSn;
  const oran = Math.min(100, Math.round((gecenSn / toplamSn) * 100));

  const zamanGuncellendi = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.currentTime > enYuksekSnRef.current + 1.5) {
      el.currentTime = enYuksekSnRef.current;
      setUyari("İleri sarma yapılamaz; videoyu sırasıyla izlemelisin.");
      return;
    }
    enYuksekSnRef.current = Math.max(enYuksekSnRef.current, el.currentTime);
    setGecenSn(Math.floor(enYuksekSnRef.current));
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-stone-950/80 p-4 ring-1 ring-amber-500/30">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-300/80">
          🎬 Gündem Videosu · İleri Sarma Korumalı
        </span>
        <h3 className="mt-1 text-base font-black text-amber-100">{video?.baslik}</h3>
        <p className="mt-1 text-xs leading-relaxed text-amber-200/80">{video?.ozet}</p>

        {video?.url ? (
          <video
            ref={videoRef}
            src={video.url}
            controls
            onTimeUpdate={zamanGuncellendi}
            onSeeking={zamanGuncellendi}
            onEnded={() => setGecenSn(toplamSn)}
            className="mt-3 w-full rounded-xl bg-black"
          />
        ) : (
          <div className="mt-3 rounded-xl bg-gradient-to-br from-stone-900 to-stone-950 p-4 text-center ring-1 ring-stone-700">
            <div className="mb-2 text-3xl">{bitti ? "🌟" : oynuyor ? "▶️" : "🎞️"}</div>
            <p className="text-xs text-amber-100/90">
              {bitti
                ? "Ders sunumu tamamlandı! Artık görevi onaylayabilirsin."
                : oynuyor
                ? "Gündem dersi oynatılıyor… Lütfen sonuna kadar takip et."
                : `Ders süresi: ${toplamSn} sn (İleri sarılamaz)`}
            </p>
            <div
              onClick={() => !bitti && setUyari("İleri sarma engellidir; dersin tamamını izlemelisin.")}
              className="mt-3 h-2.5 cursor-not-allowed overflow-hidden rounded-full bg-stone-800"
              title="İleri sarma engelli"
            >
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${oran}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-amber-200/70">
              <span>{gecenSn} sn</span>
              <span>{toplamSn} sn</span>
            </div>
            {!bitti && (
              <button
                type="button"
                onClick={() => {
                  setUyari(null);
                  setOynuyor((o) => !o);
                }}
                className="mt-2 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-black text-stone-900"
              >
                {oynuyor ? "⏸ Duraklat" : gecenSn > 0 ? "▶ Devam Et" : "▶ Dersi Başlat"}
              </button>
            )}
          </div>
        )}

        {uyari && <p className="mt-2 text-xs font-semibold text-amber-300">⚠️ {uyari}</p>}
      </div>

      {gorev && (
        <button
          type="button"
          disabled={oyun.bekliyor || gorev.tamam || !bitti}
          onClick={() => oyun.gorevTamamla(gorev.kod)}
          className="w-full rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 py-3 text-sm font-black text-white shadow-lg disabled:from-stone-700 disabled:to-stone-800 disabled:text-stone-400"
        >
          {gorev.tamam
            ? "✅ Video Görevi Tamamlandı"
            : bitti
            ? "🎬 Videoyu Tamamladım (Kaydet)"
            : "🔒 Tamamını İzleyince Açılır"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// 3. AİLE OKUMASI KUTUSU (Otağ)
// ---------------------------------------------------------------
export function AileOkumasiKutusu({ oyun, gorevKodu = "aile" }) {
  const { durum, aktifIcerik } = oyun;
  const aile = aktifIcerik?.aile;
  const gorev =
    oyun.gorevler.find((g) => g.kod === gorevKodu) ??
    oyun.gorevler.find((g) => g.tur === "aile");
  const [onay, setOnay] = useState(false);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-stone-950/75 p-4 ring-1 ring-amber-500/30">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-300/80">
          ✉️ Haberci&apos;nin Getirdiği Aile Mektubu · Level {durum.level}
        </span>
        <h3 className="mt-1 text-base font-black text-amber-100">{aile?.baslik}</h3>
        <p className="mt-2 text-sm leading-relaxed text-amber-50/95">{aile?.metin}</p>
        {aile?.soru && (
          <div className="mt-3 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200 ring-1 ring-amber-500/30">
            <b className="block text-amber-300">💬 Aile İstişare Sorusu:</b>
            {aile.soru}
          </div>
        )}
      </div>

      {gorev && !gorev.tamam && (
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-stone-800/70 px-3 py-2.5 text-xs">
          <input
            type="checkbox"
            checked={onay}
            onChange={(e) => setOnay(e.target.checked)}
            className="h-4 w-4 accent-amber-500"
          />
          <span>Bu metni ailemle birlikte okudum ve üzerine sohbet ettik.</span>
        </label>
      )}

      {gorev && (
        <button
          type="button"
          disabled={oyun.bekliyor || gorev.tamam || !onay}
          onClick={() => oyun.gorevTamamla(gorev.kod)}
          className="w-full rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 py-3 text-sm font-black text-stone-900 shadow-lg disabled:from-stone-700 disabled:to-stone-800 disabled:text-stone-400"
        >
          {gorev.tamam ? "✅ Aile Okuması Tamamlandı" : "🏠 Aile Okumasını Tamamla"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// 4. NAMAZ ÇETELESİ KUTUSU (Cami)
// ---------------------------------------------------------------
export function NamazCetelesiKutusu({ oyun }) {
  const { durum, simdi } = oyun;
  const bugun = oyunGunu(simdi);
  const cetele = durum.bugunNamaz ?? {};
  const kilinan = NAMAZ_VAKITLERI.filter((v) => cetele[v.kod]).length;
  const gorev = oyun.gorevler.find((g) => g.tur === "namaz" || g.kod === "namaz");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300/80">
            🕌 Günlük Namaz Çetelesi
          </span>
          <p className="text-xs text-amber-200/70">
            Tarih: {bugun} · Bugün {kilinan}/5 vakit
          </p>
        </div>
        {gorev && (
          <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-200">
            Hedef: {gorev.yapilan}/{gorev.hedef} tam gün
          </span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {NAMAZ_VAKITLERI.map((v) => {
          const tamam = !!cetele[v.kod];
          return (
            <button
              key={v.kod}
              type="button"
              disabled={oyun.bekliyor}
              onClick={() => oyun.namazIsaretle(v.kod, !tamam)}
              className={`flex flex-col items-center rounded-2xl p-2.5 text-center transition ring-1 ${
                tamam
                  ? "bg-emerald-700/80 text-white ring-emerald-300 shadow-lg"
                  : "bg-stone-900/80 text-amber-100/70 ring-stone-700 hover:bg-stone-800"
              }`}
            >
              <span className="text-xl">{v.ikon}</span>
              <span className="mt-1 text-xs font-bold">{v.ad}</span>
              <span className="mt-0.5 text-[10px]">{tamam ? "✅ Kılındı" : "İşaretle"}</span>
            </button>
          );
        })}
      </div>

      <p className="rounded-xl bg-stone-950/60 p-3 text-xs text-amber-200/80">
        {kilinan === 5
          ? "🌟 Maşallah! Bugünün 5 vakit namaz çetelesi tamamlandı."
          : "💡 Bir günde 5 vakti tamamladığında level namaz çetelesi hedefin otomatik olarak 1 gün ilerler."}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------
// 5. İLİM VE HADİS SINAVI KUTUSU (Medrese)
// ---------------------------------------------------------------
export function SinavKutusu({ oyun }) {
  const { durum, aktifIcerik } = oyun;
  const sorular = aktifIcerik?.sinav ?? [];
  const gorev = oyun.gorevler.find((g) => g.tur === "sinav" || g.kod === "sinav");
  const [cevaplar, setCevaplar] = useState({});

  if (!sorular.length) {
    return (
      <p className="rounded-xl bg-stone-900/70 p-4 text-center text-xs text-amber-200/70">
        Bu levelda yazılı sınav bulunmuyor; hadis ve video derslerini takip edebilirsin.
      </p>
    );
  }

  const gonder = (e) => {
    e.preventDefault();
    const dizi = sorular.map((_, i) => cevaplar[i]);
    oyun.sinavCevapla(dizi);
  };

  return (
    <form onSubmit={gonder} className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-300/80">
          ✍️ Level {durum.level} İlim Sınavı
        </span>
        {gorev?.tamam && (
          <span className="rounded-full bg-emerald-600/30 px-2.5 py-0.5 text-xs font-bold text-emerald-200">
            ✅ Geçildi
          </span>
        )}
      </div>

      {sorular.map((s, i) => (
        <div key={i} className="rounded-2xl bg-stone-950/75 p-3.5 ring-1 ring-stone-700">
          <p className="mb-2 text-xs font-bold text-amber-100">
            {i + 1}. {s.soru}
          </p>
          <div className="space-y-1.5">
            {(s.secenekler ?? []).map((secenek, secIdx) => {
              const secili = cevaplar[i] === secIdx;
              return (
                <label
                  key={secIdx}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs transition ${
                    secili ? "bg-amber-500/30 text-amber-100 ring-1 ring-amber-400" : "bg-stone-900/80 text-stone-300"
                  }`}
                >
                  <input
                    type="radio"
                    name={`soru-${i}`}
                    checked={secili}
                    disabled={gorev?.tamam}
                    onChange={() => setCevaplar((c) => ({ ...c, [i]: secIdx }))}
                    className="accent-amber-400"
                  />
                  <span>{secenek}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      <button
        type="submit"
        disabled={oyun.bekliyor || gorev?.tamam || Object.keys(cevaplar).length < sorular.length}
        className="w-full rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 py-3 text-sm font-black text-stone-900 shadow-lg disabled:from-stone-700 disabled:to-stone-800 disabled:text-stone-400"
      >
        {gorev?.tamam ? "✅ Sınav Başarıyla Tamamlandı" : "✍️ Cevapları Kontrol Et"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------
// 6. SOSYAL MEYDAN KUTUSU (Gündem Paylaşımı & Yorumlar)
// ---------------------------------------------------------------
export function SosyalMeydanKutusu({ oyun }) {
  const { durum, aktifIcerik } = oyun;
  const gundemSorusu = aktifIcerik?.gundemSorusu;
  const [paylasimlar, setPaylasimlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [metin, setMetin] = useState("");
  const [acikYorumId, setAcikYorumId] = useState(null);
  const [yorumMetni, setYorumMetni] = useState("");

  useEffect(() => {
    let iptal = false;
    fetch(`/api/meydan?level=${durum.level}`)
      .then((r) => r.json())
      .then((j) => {
        if (!iptal) {
          setPaylasimlar(j.paylasimlar ?? []);
          setYukleniyor(false);
        }
      })
      .catch(() => !iptal && setYukleniyor(false));
    return () => {
      iptal = true;
    };
  }, [durum.level]);

  const paylas = async (e) => {
    e.preventDefault();
    if (!metin.trim()) return;
    const r = await fetch("/api/meydan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tur: "paylasim", icerik: metin }),
    });
    const j = await r.json();
    if (!r.ok) {
      oyun.setMesaj({ tur: "hata", metin: j.hata ?? "Paylaşılamadı" });
      return;
    }
    setMetin("");
    setPaylasimlar(j.paylasimlar ?? []);
    oyun.veriUygula(j);
    oyun.setMesaj({ tur: "tamam", metin: "Paylaşımın Sosyal Meydan'a eklendi!" });
  };

  const yorumGonder = async (paylasimId) => {
    if (!yorumMetni.trim()) return;
    const r = await fetch("/api/meydan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tur: "yorum", paylasimId, icerik: yorumMetni }),
    });
    const j = await r.json();
    if (!r.ok) {
      oyun.setMesaj({ tur: "hata", metin: j.hata ?? "Yorum eklenemedi" });
      return;
    }
    setYorumMetni("");
    setAcikYorumId(null);
    setPaylasimlar(j.paylasimlar ?? []);
    oyun.veriUygula(j);
    oyun.setMesaj({ tur: "tamam", metin: "Yorumun eklendi!" });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-amber-500/10 p-3.5 ring-1 ring-amber-500/30">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
          💬 Level {durum.level} Meydan Gündemi
        </span>
        <p className="mt-1 text-sm font-semibold text-amber-50">{gundemSorusu}</p>
      </div>

      <form onSubmit={paylas} className="space-y-2">
        <textarea
          rows={2}
          value={metin}
          onChange={(e) => setMetin(e.target.value)}
          placeholder="Gündem hakkındaki düşünceni veya tecrübeni yaz…"
          className="w-full rounded-xl bg-stone-950/80 p-3 text-xs text-amber-50 ring-1 ring-stone-700 focus:ring-2 focus:ring-amber-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={metin.trim().length < 5}
          className="w-full rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 py-2.5 text-xs font-black text-stone-900 shadow disabled:from-stone-700 disabled:to-stone-800 disabled:text-stone-400"
        >
          💬 Meydan&apos;da Paylaş
        </button>
      </form>

      <div className="space-y-2 pt-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300/80">
          Son Paylaşımlar ({paylasimlar.length})
        </h4>
        {yukleniyor ? (
          <p className="text-xs text-stone-400">Yükleniyor…</p>
        ) : paylasimlar.length === 0 ? (
          <p className="rounded-xl bg-stone-950/50 p-3 text-center text-xs text-stone-400">
            Bu gündemde ilk paylaşımı sen yap!
          </p>
        ) : (
          paylasimlar.map((p) => (
            <div key={p.id} className="rounded-2xl bg-stone-950/75 p-3 text-xs ring-1 ring-stone-800">
              <div className="flex items-center justify-between text-[11px] text-amber-300/80">
                <b>{p.yazar_ad}</b>
                <span>@{p.yazar_kullanici}</span>
              </div>
              <p className="mt-1.5 text-amber-50/95">{p.icerik}</p>

              {p.yorumlar?.length > 0 && (
                <div className="mt-2 space-y-1 border-l-2 border-amber-500/40 pl-2.5">
                  {p.yorumlar.map((y) => (
                    <p key={y.id} className="text-[11px] text-amber-100/85">
                      <b className="text-amber-300">{y.yazar_ad}:</b> {y.icerik}
                    </p>
                  ))}
                </div>
              )}

              {acikYorumId === p.id ? (
                <div className="mt-2 flex gap-1.5">
                  <input
                    value={yorumMetni}
                    onChange={(e) => setYorumMetni(e.target.value)}
                    placeholder="Kardeşine güzel bir yorum yaz…"
                    className="flex-1 rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs text-amber-50 ring-1 ring-stone-700"
                  />
                  <button
                    type="button"
                    onClick={() => yorumGonder(p.id)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Gönder
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAcikYorumId(p.id);
                    setYorumMetni("");
                  }}
                  className="mt-2 text-[11px] font-bold text-amber-300 hover:underline"
                >
                  🤝 Yorum Yap ({p.yorumlar?.length ?? 0})
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// 7. HABERCİ: AİLE MEKTUBU & SÜRPRİZ İYİLİK GÖREVİ KUTUSU
// ---------------------------------------------------------------
export function SeyyahKutusu({ oyun, gorevKodu = "seyyah" }) {
  const { aktifSeyyahGorevi } = oyun;
  const gorev =
    oyun.gorevler.find((g) => g.kod === gorevKodu) ??
    oyun.gorevler.find((g) => g.tur === "seyyah");

  return (
    <div className="space-y-3 text-center">
      <img
        src="/assets/binalar/seyyaherkek.webp"
        alt="Haberci"
        className="mx-auto h-28 object-contain"
      />
      <div className="rounded-2xl bg-stone-950/75 p-4 text-left ring-1 ring-amber-500/30">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
            🏇 Günün Haberci İyilik Görevi
          </span>
          {gorev && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-200">
              {gorev.yapilan} / {gorev.hedef}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-amber-50">{aktifSeyyahGorevi}</p>
      </div>
      {gorev && (
        <button
          type="button"
          disabled={oyun.bekliyor || gorev.tamam || gorev.bugunYapildi}
          onClick={() => oyun.gorevTamamla(gorev.kod)}
          className="w-full rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 py-3 text-sm font-black text-stone-900 shadow-lg disabled:from-stone-700 disabled:to-stone-800 disabled:text-stone-400"
        >
          {gorev.tamam
            ? "✅ Haberci Görevleri Tamamlandı"
            : gorev.bugunYapildi
            ? "✅ Bugünkü İyilik Görevini Yaptın (Yarın Yeni Görev)"
            : "🏇 Bugünkü İyilik Görevini Yaptım"}
        </button>
      )}
    </div>
  );
}

export function HaberciKutusu({ oyun, varsayilanSekme = "mektup" }) {
  const [sekme, setSekme] = useState(varsayilanSekme);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 rounded-xl bg-stone-950/70 p-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => setSekme("mektup")}
          className={`rounded-lg py-2 ${sekme === "mektup" ? "bg-amber-500 text-stone-900" : "text-amber-200/70"}`}
        >
          ✉️ Aile Mektubu
        </button>
        <button
          type="button"
          onClick={() => setSekme("iyilik")}
          className={`rounded-lg py-2 ${sekme === "iyilik" ? "bg-amber-500 text-stone-900" : "text-amber-200/70"}`}
        >
          🏇 Günün İyiliği
        </button>
      </div>
      {sekme === "mektup" ? <AileOkumasiKutusu oyun={oyun} /> : <SeyyahKutusu oyun={oyun} />}
    </div>
  );
}

// ---------------------------------------------------------------
// 8. OBA: KÖY YÖNETİCİSİ HALK DAVALARI (SORUN ÇÖZME) KUTUSU
// ---------------------------------------------------------------
export function ObaDavaKutusu({ oyun }) {
  const { durum, ayarlar } = oyun;
  const davalar = koyDavalariListesi(ayarlar);
  const cozulenler = Array.isArray(durum.cozulenDavalar) ? durum.cozulenDavalar : [];
  const mutluluk = durum.mutluluk ?? 60;
  const gorev = oyun.gorevler.find((g) => g.tur === "dava" || g.kod === "dava");

  // Önce bu level veya altındaki çözülmemiş ilk davayı seç
  const varsayilanIndeks = Math.max(
    0,
    davalar.findIndex((d) => !cozulenler.includes(d.id))
  );
  const [seciliIdx, setSeciliIdx] = useState(varsayilanIndeks);
  const [sonCozum, setSonCozum] = useState(null);

  const dava = davalar[seciliIdx] ?? davalar[0];
  const buCozuldu = dava && cozulenler.includes(dava.id);

  const kararVer = async (secenekIndeks) => {
    if (!dava) return;
    const sonuc = await oyun.davaCoz(dava.id, secenekIndeks);
    if (sonuc) setSonCozum(sonuc);
  };

  return (
    <div className="space-y-3">
      {/* Köy Huzur / Mutluluk Durumu */}
      <div className="rounded-2xl bg-stone-950/80 p-3.5 ring-1 ring-amber-500/30">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-amber-200">
            ⚖️ Oba Divanı · Köy Huzuru ve Mutluluğu
          </span>
          <span className="font-black text-emerald-300">%{mutluluk}</span>
        </div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-stone-800">
          <div
            className={`h-full transition-all ${
              mutluluk >= 70 ? "bg-emerald-500" : mutluluk >= 40 ? "bg-amber-400" : "bg-red-500"
            }`}
            style={{ width: `${mutluluk}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-amber-200/75">
          Köyün yöneticisi sensin! Ahali arasındaki anlaşmazlıkları hikmetle çözersen mutluluk (+4 / +2) artar; sert veya adaletsiz kararlarda ise düşer. Mutlu köye Kıraathane&apos;den daha çok <b>👥 İnsan</b> yerleşir!
        </p>
      </div>

      {/* Dava Seçici */}
      <div className="flex flex-wrap gap-1.5">
        {davalar.map((d, i) => {
          const cozuldu = cozulenler.includes(d.id);
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setSeciliIdx(i);
                setSonCozum(null);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                seciliIdx === i
                  ? "bg-amber-400 text-stone-900"
                  : cozuldu
                  ? "bg-emerald-900/60 text-emerald-200 ring-1 ring-emerald-500/40"
                  : "bg-stone-800 text-stone-300"
              }`}
            >
              {cozuldu ? "✅ " : "⚖️ "}Dava {i + 1}
            </button>
          );
        })}
      </div>

      {dava && (
        <div className="space-y-3 rounded-2xl bg-stone-950/75 p-4 ring-1 ring-stone-700">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                👥 {dava.kisi}
              </span>
              <h3 className="text-base font-black text-amber-100">{dava.baslik}</h3>
            </div>
            {gorev && (
              <span className="shrink-0 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-200">
                Görev: {gorev.yapilan}/{gorev.hedef}
              </span>
            )}
          </div>

          <p className="text-sm leading-relaxed text-amber-50/95">{dava.hikaye}</p>

          {sonCozum && sonCozum.davaId === dava.id && (
            <div
              className={`rounded-xl p-3 text-xs font-semibold ring-1 ${
                sonCozum.mutlulukDegisimi >= 0
                  ? "bg-emerald-950/80 text-emerald-100 ring-emerald-400/50"
                  : "bg-red-950/80 text-red-100 ring-red-400/50"
              }`}
            >
              <b>
                {sonCozum.mutlulukDegisimi >= 0
                  ? `🌟 +${sonCozum.mutlulukDegisimi} Mutluluk!`
                  : `⚠️ ${sonCozum.mutlulukDegisimi} Mutluluk:`}
              </b>{" "}
              {sonCozum.aciklama}
            </div>
          )}

          {buCozuldu ? (
            <p className="rounded-xl bg-emerald-900/30 p-3 text-center text-xs font-bold text-emerald-200 ring-1 ring-emerald-500/30">
              ✅ Bu meseleyi karara bağladın. Yukarıdan diğer davalara göz atabilirsin.
            </p>
          ) : (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-bold text-amber-300">Hükmün nedir yönetici?</p>
              {(dava.secenekler ?? []).map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={oyun.bekliyor}
                  onClick={() => kararVer(idx)}
                  className="w-full rounded-xl bg-stone-900/90 p-3 text-left text-xs leading-relaxed text-amber-50 ring-1 ring-stone-700 transition hover:bg-amber-500/20 hover:ring-amber-400"
                >
                  <b className="mr-1.5 text-amber-400">{idx + 1}.</b>
                  {s.metin}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// 9. KIRAATHANE: OZAN DEDE (TÜRKÜ HİKÂYESİ) & YOLCULAR (İNSAN TOPLA)
// ---------------------------------------------------------------
export function KiraathaneKutusu({ oyun, varsayilanSekme = "ozan" }) {
  const { durum, ayarlar, simdi } = oyun;
  const [sekme, setSekme] = useState(varsayilanSekme); // 'ozan' | 'yolcular'
  const turkuler = turkuHikayeleriListesi(ayarlar);
  const [seciliIdx, setSeciliIdx] = useState(0);
  const [konusuyor, setKonusuyor] = useState(false);
  const [agizAcik, setAgizAcik] = useState(false);
  const [dinlendi, setDinlendi] = useState(false);
  const sesRef = useRef(null);

  const turku = turkuler[seciliIdx] ?? turkuler[0];
  const gorev = oyun.gorevler.find((g) => g.tur === "turku" || g.kod === "turku");
  const gocmen = gocmenDurumu(simdi, durum.sonGocmenKontrol);
  const mutluluk = durum.mutluluk ?? 60;
  const olasilik = Math.min(95, Math.max(15, mutluluk));
  const kapasite = toplamKonutKapasitesi(durum.binalar);
  const mevcutInsan = durum.envanter.insan ?? 5;
  const bosYer = Math.max(0, kapasite - mevcutInsan);

  // Ozan Dede konuşurken ağzını açıp kapat (lip-sync)
  useEffect(() => {
    if (!konusuyor) return;
    const t = setInterval(() => setAgizAcik((a) => !a), 190);
    return () => {
      clearInterval(t);
      setAgizAcik(false);
    };
  }, [konusuyor]);

  // Sekme veya türkü değiştiğinde sesi durdur
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [seciliIdx, sekme]);

  const ozaniBaslatDurdur = () => {
    if (!turku) return;
    if (konusuyor) {
      if (sesRef.current) sesRef.current.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setKonusuyor(false);
      setDinlendi(true);
      return;
    }

    setDinlendi(true);
    if (turku.sesUrl && sesRef.current) {
      sesRef.current.currentTime = 0;
      sesRef.current.play().catch(() => {});
      setKonusuyor(true);
      return;
    }

    // Ses dosyası girilmemişse tarayıcı Türkçe seslendirme + 10 sn ağız animasyonu
    setKonusuyor(true);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(`${turku.turkuAdi}. ${turku.anlatim}`);
      u.lang = "tr-TR";
      u.rate = 0.95;
      u.onend = () => setKonusuyor(false);
      u.onerror = () => setKonusuyor(false);
      window.speechSynthesis.speak(u);
    } else {
      setTimeout(() => setKonusuyor(false), 8000);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 rounded-xl bg-stone-950/70 p-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => setSekme("ozan")}
          className={`rounded-lg py-2 ${sekme === "ozan" ? "bg-amber-500 text-stone-900" : "text-amber-200/70"}`}
        >
          🎵 Ozan Dede (Türküler)
        </button>
        <button
          type="button"
          onClick={() => setSekme("yolcular")}
          className={`rounded-lg py-2 ${sekme === "yolcular" ? "bg-amber-500 text-stone-900" : "text-amber-200/70"}`}
        >
          👥 Yolcular (İnsan Topla)
        </button>
      </div>

      {sekme === "ozan" ? (
        <div className="space-y-3">
          {turkuler.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {turkuler.map((t, i) => (
                <button
                  key={t.id ?? i}
                  type="button"
                  onClick={() => {
                    setKonusuyor(false);
                    setSeciliIdx(i);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    seciliIdx === i ? "bg-amber-400 text-stone-900" : "bg-stone-800 text-stone-300"
                  }`}
                >
                  🎵 Türkü {i + 1}
                </button>
              ))}
            </div>
          )}

          {turku && (
            <div className="rounded-2xl bg-stone-950/80 p-4 ring-1 ring-amber-500/30">
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <div className="relative shrink-0">
                  <img
                    src={agizAcik ? "/assets/binalar/ozan_acik.webp" : "/assets/binalar/ozan_kapali.webp"}
                    alt="Ozan Dede"
                    className={`h-28 w-28 rounded-2xl object-cover ring-2 ${
                      konusuyor ? "ring-amber-400 shadow-lg shadow-amber-500/20" : "ring-stone-700"
                    }`}
                  />
                  {konusuyor && (
                    <span className="absolute -top-2 -right-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-stone-950 animate-pulse">
                      🎶 Anlatıyor…
                    </span>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    🎵 {turku.turkuAdi}
                  </span>
                  <h3 className="text-base font-black text-amber-100">{turku.baslik}</h3>
                  <button
                    type="button"
                    onClick={ozaniBaslatDurdur}
                    className={`mt-2 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black shadow ${
                      konusuyor
                        ? "bg-red-600 text-white"
                        : "bg-gradient-to-b from-amber-400 to-amber-600 text-stone-900"
                    }`}
                  >
                    {konusuyor ? "⏹ Anlatımı Durdur" : "🔊 Ozan Dede'den Dinle"}
                  </button>
                </div>
              </div>

              {turku.sesUrl && (
                <audio
                  ref={sesRef}
                  src={turku.sesUrl}
                  onEnded={() => setKonusuyor(false)}
                  onPause={() => setKonusuyor(false)}
                  onPlay={() => setKonusuyor(true)}
                  controls
                  className="mt-3 h-9 w-full"
                />
              )}

              <p className="mt-3 rounded-xl bg-stone-900/90 p-3 text-sm leading-relaxed text-amber-50/95">
                “{turku.anlatim}”
              </p>

              {turku.odev && (
                <div className="mt-3 rounded-xl bg-amber-500/15 p-3 text-xs text-amber-100 ring-1 ring-amber-400/30">
                  <b className="block text-amber-300">📜 Ozan Dede&apos;nin Gönül Ödevi:</b>
                  {turku.odev}
                </div>
              )}
            </div>
          )}

          {gorev && (
            <button
              type="button"
              disabled={oyun.bekliyor || gorev.tamam || (!dinlendi && !gorev.tamam)}
              onClick={() => oyun.gorevTamamla(gorev.kod)}
              className="w-full rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 py-3 text-sm font-black text-white shadow-lg disabled:from-stone-700 disabled:to-stone-800 disabled:text-stone-400"
            >
              {gorev.tamam
                ? "✅ Ozan Dede Görevi Tamamlandı"
                : dinlendi
                ? "🎵 Türkünün Hikâyesini Dinledim ve Ödevimi Aldım"
                : "🔒 Önce 'Ozan Dede'den Dinle' Butonuna Bas"}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl bg-stone-950/80 p-4 ring-1 ring-amber-500/30">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-200">🏠 Köy Barınma (Ev) Kapasitesi:</span>
              <span className="text-sm font-black text-amber-100">
                👥 {mevcutInsan} / {kapasite} Kişi (Boş Yatak: {bosYer})
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-amber-200/80">😊 Köy Mutluluğuna Göre Kabul Şansı:</span>
              <span className="font-black text-emerald-300">%{olasilik}</span>
            </div>
            <p className="mt-2 text-[11px] text-amber-200/70">
              Yeni insanların köye yerleşebilmesi için <b>5+1 Konut Mahallende</b> boş barınma yeri olmalıdır. Her ev en fazla 3 katlı olur ve her kat <b>+5 👥 Kişi</b> kapasite sağlar.
            </p>
          </div>

          {bosYer <= 0 && (
            <div className="rounded-2xl bg-red-950/80 p-3.5 text-xs text-red-100 ring-1 ring-red-400/50">
              <b className="block text-red-200">🏠 Evlerde Boş Yatak Kalmadı ({mevcutInsan}/{kapasite})!</b>
              Yeni yolcuları köyüne davet edebilmek için önce haritadaki boş konut arsalarından birine <b>Ev inşa etmeli</b> veya mevcut evlerini <b>2. / 3. kata</b> yükseltmelisin.
            </div>
          )}

          {gocmen.hazir ? (
            <div className="rounded-2xl bg-stone-950/80 p-4 ring-1 ring-emerald-500/40">
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                🍵 Kıraathane&apos;de Misafir Var!
              </span>
              <h3 className="mt-2 text-base font-black text-amber-100">{gocmen.aday.ad}</h3>
              <p className="text-xs font-bold text-amber-300/80">
                Meslek: {gocmen.aday.meslek} · Aile/Ekip: +{gocmen.aday.kisiSayisi} 👥 İnsan
              </p>
              <p className="mt-2 rounded-xl bg-stone-900 p-3 text-xs italic text-amber-50">
                “{gocmen.aday.soz}”
              </p>
              <button
                type="button"
                disabled={oyun.bekliyor || bosYer <= 0}
                onClick={() => oyun.gocmenTeklifEt()}
                className="mt-3 w-full rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 py-3 text-sm font-black text-stone-900 shadow-lg disabled:from-stone-700 disabled:to-stone-800 disabled:text-stone-400"
              >
                {bosYer <= 0
                  ? "🔒 Önce Köyde Yeni Ev İnşa Et veya Kat Çık"
                  : `🏡 Köyümüze Ev Kurmayı Teklif Et (+${Math.min(gocmen.aday.kisiSayisi, bosYer)} 👥 İnsan · %${olasilik} Şans)`}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-stone-950/70 p-4 text-center ring-1 ring-stone-800">
              <div className="text-2xl">⏳</div>
              <h4 className="mt-1 text-sm font-black text-amber-100">Şu An Kıraathane&apos;de Yeni Yolcu Yok</h4>
              <p className="mt-1 text-xs text-amber-200/75">
                Yeni yolcular her 2 saatte bir Kıraathane&apos;ye uğrayıp çay içerler. Yaklaşık{" "}
                <b>{gocmen.kalanDakika} dakika</b> sonra tekrar bakabilirsin!
              </p>
              <p className="mt-2 text-[11px] text-amber-300/70">
                💡 Bu sırada <b>Oba</b>&apos;ya gidip halkın davalarını hikmetle çözerek köy mutluluğunu artırabilirsin.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// 10. YÖNETİCİ ÖZEL GÖREV / ETKİNLİK KUTUSU (tur: "onay")
// ---------------------------------------------------------------
export function OzelGorevKutusu({ gorev, oyun }) {
  if (!gorev) return null;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-stone-950/75 p-4 ring-1 ring-amber-500/30">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">✨ Görev Detayı</span>
          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-200">
            {gorev.yapilan} / {gorev.hedef}
          </span>
        </div>
        <h3 className="mt-1 text-base font-black text-amber-100">{gorev.ad}</h3>
        {gorev.aciklama && <p className="mt-2 text-sm leading-relaxed text-amber-50/90">{gorev.aciklama}</p>}
      </div>

      <button
        type="button"
        disabled={oyun.bekliyor || gorev.tamam || gorev.bugunYapildi}
        onClick={() => oyun.gorevTamamla(gorev.kod)}
        className="w-full rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 py-3 text-sm font-black text-stone-900 shadow-lg disabled:from-stone-700 disabled:to-stone-800 disabled:text-stone-400"
      >
        {gorev.tamam
          ? "✅ Görev Tamamlandı"
          : gorev.bugunYapildi
          ? "✅ Bugünkü Adım Tamamlandı (Yarın Devam Et)"
          : "✅ Görevi Yaptım (Kaydet)"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------
// 11. BİNA İÇİ TAM GÖRÜNÜMÜ
// ---------------------------------------------------------------
export function BinaIciGorunumu({ binaId, oyun, baslangicSekme = null }) {
  const [sekme, setSekme] = useState(baslangicSekme);

  if (binaId === "cami") {
    return (
      <div className="space-y-4">
        <NamazCetelesiKutusu oyun={oyun} />
      </div>
    );
  }

  if (binaId === "mektep" || binaId === "medrese") {
    const aktif = sekme ?? "hadis";
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 rounded-xl bg-stone-950/70 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSekme("hadis")}
            className={`rounded-lg py-2 ${aktif === "hadis" ? "bg-amber-500 text-stone-900" : "text-amber-200/70"}`}
          >
            📖 Hadis
          </button>
          <button
            type="button"
            onClick={() => setSekme("video")}
            className={`rounded-lg py-2 ${aktif === "video" ? "bg-amber-500 text-stone-900" : "text-amber-200/70"}`}
          >
            🎬 Video
          </button>
          <button
            type="button"
            onClick={() => setSekme("sinav")}
            className={`rounded-lg py-2 ${aktif === "sinav" ? "bg-amber-500 text-stone-900" : "text-amber-200/70"}`}
          >
            ✍️ Sınav
          </button>
        </div>
        {aktif === "hadis" && <HadisKutusu oyun={oyun} />}
        {aktif === "video" && <VideoKutusu oyun={oyun} />}
        {aktif === "sinav" && <SinavKutusu oyun={oyun} />}
      </div>
    );
  }

  if (binaId === "kiraathane") {
    return <KiraathaneKutusu oyun={oyun} varsayilanSekme={baslangicSekme ?? "ozan"} />;
  }

  if (binaId === "otag") {
    const mezun = oyun.durum.level === 10 && (oyun.durum.binalar.otag ?? 1) >= 4 && oyun.tumGorevlerTamam;
    return (
      <div className="space-y-4">
        {mezun && (
          <div className="rounded-2xl bg-gradient-to-b from-amber-400/25 to-amber-600/15 p-4 text-center ring-2 ring-amber-400">
            <div className="text-3xl">🎓</div>
            <h3 className="mt-1 text-lg font-black text-amber-200">Seyrüsefer Mezuniyet Beratı</h3>
            <p className="mt-1 text-xs text-amber-100/90">
              Tebrikler <b>{oyun.kullanici?.ad}</b>! 10 Level boyunca köyünü imar ettin ve İhsan makamına ulaştın.
            </p>
          </div>
        )}
        <ObaDavaKutusu oyun={oyun} />
      </div>
    );
  }

  if (binaId === "sosyalmeydan") {
    return <SosyalMeydanKutusu oyun={oyun} />;
  }

  if (binaId === "takasmerkezi") {
    return <BirlikPaneli oyun={oyun} varsayilanSekme="birlik" />;
  }

  if (binaId === "oyuncadiri") {
    return <BirlikPaneli oyun={oyun} varsayilanSekme="fetih" />;
  }

  return null;
}
