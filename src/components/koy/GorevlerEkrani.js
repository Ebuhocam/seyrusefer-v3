"use client";
import { useEffect, useRef, useState } from "react";
import {
  BINALAR,
  DEPO_SAAT,
  EV_IDLERI,
  KAYNAKLAR,
  oyuncuKarakteriBul,
  toplamKonutKapasitesi,
} from "@/lib/oyun/sabitler";
import { depoKapasitesi, kaynakAcikMi } from "@/lib/oyun/kurallar";
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
// 6. ÇINAR ALTI SOSYAL MEDYA SAYFASI (Gündem İçi / Dışı, Söz/Hikâye/Video, Beğeni, Yorum, Şikayet, Profil)
// ---------------------------------------------------------------
const PAYLASIM_TURLERI = [
  { id: "soz", etiket: "✨ Güzel Söz" },
  { id: "hikaye", etiket: "📖 Kısa Hikâye / Kıssa" },
  { id: "dua", etiket: "🤲 Dua / İyi Dilek" },
  { id: "ani", etiket: "💭 Hatıra / Düşünce" },
  { id: "video", etiket: "🎬 Video (YouTube / Instagram)" },
];

const HAZIR_ILHAMLAR = [
  {
    altTur: "soz",
    metin: "“Güzel söz sadakadır; tebessüm etmek ise gönüllere şifadır.” Bugün karşılaştığım herkese güler yüzle selam vermeye niyet ettim.",
  },
  {
    altTur: "hikaye",
    metin: "Bir zamanlar Anadolu'da yolcular için çeşme yaptıran bir hayırsever, taşına 'Su içen dua etsin, kuşlar bile nasiplensin' yazdırmış. Küçük bir iyilik asırlar boyu yaşar.",
  },
  {
    altTur: "dua",
    metin: "Rabbim köyümüze bereket, kalplerimize ihlas ve tüm kardeşlerimize huzur nasip eylesin. Hayırlı günler!",
  },
];

function youtubeIdCikar(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0];
    if (u.hostname.includes("youtube.com")) {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const m = u.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/);
      if (m) return m[1];
    }
  } catch {
    return null;
  }
  return null;
}

function instagramEmbedUrlCikar(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.hostname.includes("instagram.com")) return null;
    const m = u.pathname.match(/\/(p|reel|tv)\/([^/?]+)/);
    if (m) return `https://www.instagram.com/${m[1]}/${m[2]}/embed`;
  } catch {
    return null;
  }
  return null;
}

export function SosyalMeydanKutusu({ oyun, onGeriDon }) {
  const { durum, aktifIcerik } = oyun;
  const gundemSorusu = aktifIcerik?.gundemSorusu;
  const [paylasimlar, setPaylasimlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  // Paylaşım oluşturma state'leri
  const [kategori, setKategori] = useState("gundem"); // 'gundem' | 'serbest'
  const [altTur, setAltTur] = useState("soz");
  const [metin, setMetin] = useState("");
  const [medyaUrl, setMedyaUrl] = useState("");

  // Akış filtreleme ve etkileşim state'leri
  const [akisFiltre, setAkisFiltre] = useState("tumu"); // 'tumu' | 'gundem' | 'serbest' | 'video'
  const [acikYorumId, setAcikYorumId] = useState(null);
  const [yorumMetni, setYorumMetni] = useState("");
  const [sikayetPaylasimId, setSikayetPaylasimId] = useState(null);
  const [sikayetSebep, setSikayetSebep] = useState("Kırıcı veya uygunsuz ifade");
  const [seciliProfil, setSeciliProfil] = useState(null); // { yazar_id, yazar_ad, yazar_kullanici, yazar_karakter, yazar_level, yazar_mutluluk }

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
      body: JSON.stringify({
        tur: "paylasim",
        icerik: metin,
        kategori,
        altTur,
        medyaUrl: medyaUrl.trim(),
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      oyun.setMesaj({ tur: "hata", metin: j.hata ?? "Paylaşılamadı" });
      return;
    }
    setMetin("");
    setMedyaUrl("");
    setPaylasimlar(j.paylasimlar ?? []);
    oyun.veriUygula(j);
    oyun.setMesaj({
      tur: "tamam",
      metin:
        kategori === "gundem"
          ? "🌟 Gündem paylaşımın eklendi! Köy Huzurun +3 😊 arttı!"
          : "💬 Serbest paylaşımın Çınar Altı akışına eklendi (+1 😊 Huzur)!",
    });
  };

  const begeniDegistir = async (paylasimId) => {
    const r = await fetch("/api/meydan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tur: "begeni", paylasimId }),
    });
    const j = await r.json();
    if (r.ok) {
      setPaylasimlar(j.paylasimlar ?? []);
      oyun.veriUygula(j);
    }
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

  const sikayetGonder = async (paylasimId) => {
    const r = await fetch("/api/meydan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tur: "sikayet", paylasimId, sebep: sikayetSebep }),
    });
    const j = await r.json();
    setSikayetPaylasimId(null);
    if (r.ok) {
      oyun.setMesaj({
        tur: "tamam",
        metin: j.bildirim ?? "🚩 Şikayetin yöneticiye iletildi.",
      });
    }
  };

  // ÖĞRENCİ SOSYAL PROFİL SAYFASI GÖRÜNÜMÜ
  if (seciliProfil) {
    const profilKarakter = oyuncuKarakteriBul(seciliProfil.yazar_karakter);
    const kullaniciPaylasimlari = paylasimlar.filter(
      (p) => p.yazar_kullanici === seciliProfil.yazar_kullanici
    );
    const toplamBegeni = kullaniciPaylasimlari.reduce((t, p) => t + (p.begeniSayisi ?? 0), 0);

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSeciliProfil(null)}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-stone-800 px-4 py-2 text-xs font-black text-amber-200 ring-1 ring-amber-400/40 hover:bg-stone-700"
        >
          ← Çınar Altı Sosyal Akışına Dön
        </button>

        {/* Profil Üst Kartı */}
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-gradient-to-b from-stone-900 to-stone-950 p-6 text-center shadow-xl ring-2 ring-amber-400/60 sm:flex-row sm:text-left">
          <img
            src={profilKarakter.gorsel}
            alt={seciliProfil.yazar_ad}
            referrerPolicy="no-referrer"
            className="h-24 w-24 rounded-3xl bg-stone-950/90 p-1 object-contain ring-3 ring-amber-400 shadow-xl"
          />
          <div className="flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h3 className="text-xl font-black text-amber-100">{seciliProfil.yazar_ad}</h3>
              <span className="rounded-full bg-stone-800 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                @{seciliProfil.yazar_kullanici}
              </span>
            </div>
            <p className="text-xs font-bold text-amber-200/80">
              {profilKarakter.ikon} {profilKarakter.ad} ({profilKarakter.unvan})
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-1 sm:justify-start">
              <span className="rounded-xl bg-amber-500/20 px-3 py-1 text-xs font-black text-amber-200 ring-1 ring-amber-400/40">
                ⭐ Köy Seviyesi: Lv.{seciliProfil.yazar_level ?? 1}
              </span>
              <span className="rounded-xl bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-300 ring-1 ring-emerald-400/40">
                😊 Köy Huzuru: %{seciliProfil.yazar_mutluluk ?? 60}
              </span>
              <span className="rounded-xl bg-rose-500/20 px-3 py-1 text-xs font-black text-rose-200 ring-1 ring-rose-400/40">
                ❤️ Aldığı Beğeni: {toplamBegeni}
              </span>
            </div>
          </div>
        </div>

        <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
          📜 {seciliProfil.yazar_ad} Kardeşimizin Paylaşımları ({kullaniciPaylasimlari.length})
        </h4>
        <div className="space-y-3">
          {kullaniciPaylasimlari.map((p) => (
            <div key={p.id} className="rounded-2xl bg-stone-950/85 p-4 text-xs ring-1 ring-stone-800">
              <p className="text-sm leading-relaxed text-amber-50">{p.icerik}</p>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-amber-300/80">
                <span>❤️ {p.begeniSayisi ?? 0} Beğeni</span>
                <span>💬 {p.yorumlar?.length ?? 0} Yorum</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const filtrelenmisPaylasimlar = paylasimlar.filter((p) => {
    if (akisFiltre === "gundem") return p.kategori === "gundem";
    if (akisFiltre === "serbest") return p.kategori === "serbest";
    if (akisFiltre === "video") return Boolean(p.medyaUrl) || p.altTur === "video";
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Üst Başlık ve Köy Meydanına Dönüş Çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-stone-950/90 p-4 ring-1 ring-amber-500/40 sm:p-5">
        <div className="flex items-center gap-3">
          {onGeriDon && (
            <button
              type="button"
              onClick={onGeriDon}
              className="rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 px-3.5 py-2 text-xs font-black text-stone-950 shadow hover:brightness-110"
            >
              ← Köy Meydanı&apos;na Dön
            </button>
          )}
          <div>
            <h2 className="text-base font-black text-amber-100 sm:text-lg">
              🌳 Çınar Altı Sohbeti · Köy Sosyal Medya Meydanı
            </h2>
            <p className="text-xs text-amber-200/80">
              Gündem içi paylaşımlar <b>+3 😊 Huzur</b>, aldığın her beğeni <b>+1 😊 Huzur</b> kazandırır! Söz, hikâye, dua veya video paylaşabilirsin.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-stone-900 px-3 py-1.5 text-xs font-black text-emerald-300 ring-1 ring-emerald-500/40">
          <span>😊 Köy Huzurun:</span>
          <span>%{durum.mutluluk ?? 60}</span>
        </div>
      </div>

      {/* Paylaşım Oluşturma Kartı */}
      <form onSubmit={paylas} className="space-y-3.5 rounded-3xl bg-stone-950/85 p-4 shadow-xl ring-1 ring-amber-500/35 sm:p-5">
        {/* 1. Kategori Seçimi: Gündem İçi vs Gündem Harici Serbest Kürsü */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setKategori("gundem")}
            className={`flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-left text-xs font-black ring-1 transition ${
              kategori === "gundem"
                ? "bg-amber-500 text-stone-950 ring-amber-200 shadow"
                : "bg-stone-900 text-amber-100 ring-stone-800 hover:bg-stone-800"
            }`}
          >
            <span>📌 Level {durum.level} Gündem Paylaşımı</span>
            <span className="rounded-full bg-stone-950/25 px-2 py-0.5 text-[10px]">+3 😊 Huzur</span>
          </button>

          <button
            type="button"
            onClick={() => setKategori("serbest")}
            className={`flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-left text-xs font-black ring-1 transition ${
              kategori === "serbest"
                ? "bg-emerald-500 text-stone-950 ring-emerald-200 shadow"
                : "bg-stone-900 text-amber-100 ring-stone-800 hover:bg-stone-800"
            }`}
          >
            <span>🌿 Gündem Harici (Serbest Kürsü)</span>
            <span className="rounded-full bg-stone-950/25 px-2 py-0.5 text-[10px]">+1 😊 Huzur</span>
          </button>
        </div>

        {/* Gündem Sorusu Kutusu */}
        {kategori === "gundem" && (
          <div className="rounded-2xl bg-amber-500/15 p-3.5 ring-1 ring-amber-500/30">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              📌 Level {durum.level} Gündem Konusu (Söz, Kısa Hikâye, Dua veya Video Paylaşabilirsin)
            </span>
            <p className="mt-1 text-sm font-semibold text-amber-50">{gundemSorusu}</p>
          </div>
        )}

        {/* 2. Paylaşım Türü Etiketi (Söz / Hikâye / Dua / Anı / Video) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-bold text-amber-200/80">Tür:</span>
          {PAYLASIM_TURLERI.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAltTur(t.id)}
              className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                altTur === t.id
                  ? "bg-amber-400 text-stone-950 shadow"
                  : "bg-stone-900 text-stone-300 ring-1 ring-stone-800 hover:bg-stone-800"
              }`}
            >
              {t.etiket}
            </button>
          ))}
        </div>

        {/* Küçük Çocuklar İçin Tek Tıkla İlham Şablonları */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-amber-300/80">💡 Ne yazacağını bilemedin mi? Örnek seç:</span>
          {HAZIR_ILHAMLAR.map((ornek, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setAltTur(ornek.altTur);
                setMetin(ornek.metin);
              }}
              className="rounded-lg bg-stone-900 px-2 py-1 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-500/30 hover:bg-stone-800"
            >
              +{ornek.altTur === "soz" ? "Güzel Söz Örneği" : ornek.altTur === "hikaye" ? "Kısa Kıssa Örneği" : "Dua Örneği"}
            </button>
          ))}
        </div>

        <textarea
          rows={3}
          value={metin}
          onChange={(e) => setMetin(e.target.value)}
          placeholder="Güzel bir söz, kısa bir hikâye, öğrendiğin bir bilgi, dua veya videonun açıklamasını buraya yaz…"
          className="w-full rounded-2xl bg-stone-900/90 p-3.5 text-xs text-amber-50 ring-1 ring-stone-700 focus:ring-2 focus:ring-amber-400 focus:outline-none sm:text-sm"
        />

        {/* YouTube veya Instagram Video Link Alanı */}
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
          <span className="shrink-0 text-xs font-bold text-amber-200/85">
            🎬 Video Linki (İsteğe Bağlı):
          </span>
          <input
            type="url"
            value={medyaUrl}
            onChange={(e) => {
              setMedyaUrl(e.target.value);
              if (e.target.value.trim()) setAltTur("video");
            }}
            placeholder="YouTube veya Instagram video linki yapıştır (https://youtube.com/... veya https://instagram.com/reel/...)"
            className="flex-1 rounded-xl bg-stone-900/90 px-3 py-2 text-xs text-amber-50 ring-1 ring-stone-700 focus:ring-2 focus:ring-amber-400 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={metin.trim().length < 3}
          className="w-full rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 py-3 text-xs font-black text-stone-950 shadow-lg hover:brightness-110 disabled:from-stone-800 disabled:to-stone-800 disabled:text-stone-500 sm:text-sm"
        >
          {kategori === "gundem"
            ? "📌 Gündem İçinde Paylaş (+3 😊 Köy Huzuru)"
            : "🌿 Serbest Kürsüde Paylaş (+1 😊 Köy Huzuru)"}
        </button>
      </form>

      {/* Akış Filtre Sekmeleri */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "tumu", etiket: `🌐 Tüm Akış (${paylasimlar.length})` },
            { id: "gundem", etiket: "📌 Gündem İçi" },
            { id: "serbest", etiket: "🌿 Gündem Harici" },
            { id: "video", etiket: "🎬 Videolar" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setAkisFiltre(f.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                akisFiltre === f.id
                  ? "bg-amber-400 text-stone-950 shadow"
                  : "bg-stone-900 text-amber-100/80 ring-1 ring-stone-800 hover:bg-stone-800"
              }`}
            >
              {f.etiket}
            </button>
          ))}
        </div>
      </div>

      {/* Sosyal Medya Akış Kartları */}
      <div className="space-y-4">
        {yukleniyor ? (
          <p className="text-center text-xs text-stone-400">Çınar Altı akışı yükleniyor…</p>
        ) : filtrelenmisPaylasimlar.length === 0 ? (
          <div className="rounded-3xl bg-stone-950/70 p-6 text-center text-xs text-stone-400 ring-1 ring-stone-800">
            Bu kategoride henüz paylaşım yok. İlk paylaşımı sen yap!
          </div>
        ) : (
          filtrelenmisPaylasimlar.map((p) => {
            const yazarKarakter = oyuncuKarakteriBul(p.yazar_karakter);
            const ytId = youtubeIdCikar(p.medyaUrl);
            const igEmbed = instagramEmbedUrlCikar(p.medyaUrl);
            const turBilgi = PAYLASIM_TURLERI.find((x) => x.id === p.altTur) ?? PAYLASIM_TURLERI[0];

            return (
              <article
                key={p.id}
                className="space-y-3 rounded-3xl bg-stone-950/90 p-4 shadow-lg ring-1 ring-stone-800 sm:p-5"
              >
                {/* Üst Yazar Barı + Profile Git */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSeciliProfil(p)}
                    className="group flex items-center gap-2.5 text-left"
                  >
                    <img
                      src={yazarKarakter.gorsel}
                      alt={p.yazar_ad}
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 rounded-2xl bg-stone-900 p-0.5 object-contain ring-2 ring-amber-400/70 transition group-hover:scale-105"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-amber-100 group-hover:text-amber-300 group-hover:underline">
                          {p.yazar_ad}
                        </span>
                        <span className="rounded-md bg-stone-800 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                          Lv.{p.yazar_level ?? 1}
                        </span>
                      </div>
                      <span className="text-[11px] text-amber-200/70">
                        @{p.yazar_kullanici} · {yazarKarakter.ad} · 😊 %{p.yazar_mutluluk ?? 60}
                      </span>
                    </div>
                  </button>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                        p.kategori === "serbest"
                          ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                          : "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
                      }`}
                    >
                      {p.kategori === "serbest" ? "🌿 Gündem Harici" : `📌 Level ${p.level} Gündemi`}
                    </span>
                    <span className="rounded-full bg-stone-900 px-2.5 py-0.5 text-[10px] font-bold text-stone-300 ring-1 ring-stone-700">
                      {turBilgi.etiket}
                    </span>
                  </div>
                </div>

                {/* Paylaşım Metni */}
                <p className="whitespace-pre-line text-sm leading-relaxed text-amber-50/95">{p.icerik}</p>

                {/* Gömülü YouTube veya Instagram Videosu */}
                {ytId && (
                  <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black ring-1 ring-stone-700">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      title="YouTube video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  </div>
                )}

                {!ytId && igEmbed && (
                  <div className="overflow-hidden rounded-2xl bg-stone-900 ring-1 ring-stone-700">
                    <iframe
                      src={igEmbed}
                      title="Instagram video"
                      className="h-[420px] w-full border-0"
                    />
                  </div>
                )}

                {!ytId && !igEmbed && p.medyaUrl && (
                  <a
                    href={p.medyaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3 py-2 text-xs font-bold text-sky-300 ring-1 ring-sky-500/40 hover:bg-stone-800"
                  >
                    🎬 Paylaşılan Videoyu / Bağlantıyı Aç ↗
                  </a>
                )}

                {/* Sosyal Medya Etkileşim Çubuğu: Beğen, Yorum, Profil, Şikayet */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-800/90 pt-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => begeniDegistir(p.id)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-black transition ${
                        p.benBegendim
                          ? "bg-rose-600 text-white shadow"
                          : "bg-stone-900 text-amber-100 ring-1 ring-stone-700 hover:bg-stone-800"
                      }`}
                    >
                      <span>{p.benBegendim ? "❤️" : "🤍"}</span>
                      <span>Beğen ({p.begeniSayisi ?? 0})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAcikYorumId(acikYorumId === p.id ? null : p.id);
                        setYorumMetni("");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3 py-1.5 font-bold text-amber-200 ring-1 ring-stone-700 hover:bg-stone-800"
                    >
                      <span>💬</span>
                      <span>Yorum Yap ({p.yorumlar?.length ?? 0})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSeciliProfil(p)}
                      className="inline-flex items-center gap-1 rounded-xl bg-stone-900 px-3 py-1.5 font-bold text-sky-200 ring-1 ring-stone-700 hover:bg-stone-800"
                    >
                      <span>👤</span>
                      <span>Profile Git</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSikayetPaylasimId(sikayetPaylasimId === p.id ? null : p.id)
                    }
                    className="inline-flex items-center gap-1 rounded-xl bg-stone-900 px-2.5 py-1.5 text-[11px] font-bold text-stone-400 ring-1 ring-stone-800 hover:bg-red-950/60 hover:text-red-300"
                  >
                    <span>🚩</span>
                    <span>Yöneticiye Şikayet Et</span>
                  </button>
                </div>

                {/* Şikayet Kutusu */}
                {sikayetPaylasimId === p.id && (
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-red-950/50 p-3 ring-1 ring-red-500/40">
                    <select
                      value={sikayetSebep}
                      onChange={(e) => setSikayetSebep(e.target.value)}
                      className="rounded-xl bg-stone-900 px-3 py-1.5 text-xs text-amber-50 ring-1 ring-stone-700"
                    >
                      <option value="Kırıcı veya uygunsuz ifade">Kırıcı veya uygunsuz ifade</option>
                      <option value="Uygunsuz video veya bağlantı">Uygunsuz video veya bağlantı</option>
                      <option value="Anlamsız / Spam paylaşım">Anlamsız / Spam paylaşım</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => sikayetGonder(p.id)}
                      className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-black text-white"
                    >
                      🚩 Yöneticiye Bildir
                    </button>
                  </div>
                )}

                {/* Yorumlar Listesi */}
                {p.yorumlar?.length > 0 && (
                  <div className="space-y-1.5 rounded-2xl bg-stone-900/75 p-3 ring-1 ring-stone-800">
                    {p.yorumlar.map((y) => (
                      <div key={y.id} className="flex items-start gap-2 text-xs">
                        <span className="font-black text-amber-300">{y.yazar_ad}:</span>
                        <span className="text-amber-50/90">{y.icerik}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Yeni Yorum Yazma */}
                {acikYorumId === p.id && (
                  <div className="flex gap-2">
                    <input
                      value={yorumMetni}
                      onChange={(e) => setYorumMetni(e.target.value)}
                      placeholder="Kardeşine güzel ve yapıcı bir yorum yaz…"
                      className="flex-1 rounded-xl bg-stone-900 px-3 py-2 text-xs text-amber-50 ring-1 ring-stone-700"
                    />
                    <button
                      type="button"
                      onClick={() => yorumGonder(p.id)}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white"
                    >
                      Gönder
                    </button>
                  </div>
                )}
              </article>
            );
          })
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
            📜 Günün Haberci İyilik Görevi
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
            : "🤝 Bugünkü İyilik Görevini Yaptım"}
        </button>
      )}
    </div>
  );
}

export function HaberciKutusu({ oyun, onSecimDegistir, varsayilanSekme = "mektup" }) {
  const [sekme, setSekme] = useState(varsayilanSekme);
  const { durum, aktifIcerik } = oyun;
  const mektupAlindiMi = (durum.mektupAlindi ?? 0) >= durum.level;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 rounded-xl bg-stone-950/70 p-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => setSekme("mektup")}
          className={`rounded-lg py-2 ${sekme === "mektup" ? "bg-amber-500 text-stone-900" : "text-amber-200/70"}`}
        >
          ✉️ Aile Mektubu {!mektupAlindiMi && "🔴"}
        </button>
        <button
          type="button"
          onClick={() => setSekme("iyilik")}
          className={`rounded-lg py-2 ${sekme === "iyilik" ? "bg-amber-500 text-stone-900" : "text-amber-200/70"}`}
        >
          🤝 Günün İyiliği
        </button>
      </div>
      {sekme === "mektup" ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-stone-950/85 p-5 ring-1 ring-amber-500/40 sm:flex-row">
            <img
              src="/assets/binalar/seyyaherkek.webp"
              alt="Köy Habercisi"
              className="h-28 w-28 shrink-0 object-contain"
            />
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <span className="inline-block rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-black text-amber-300 ring-1 ring-amber-400/40">
                📜 Köy Habercisi · Level {durum.level} Aile Mektubu
              </span>
              <h3 className="text-base font-black text-amber-100">
                {aktifIcerik?.aile?.baslik ?? "Aile Meclisi Mektubu"}
              </h3>
              {!mektupAlindiMi ? (
                <p className="text-xs leading-relaxed text-amber-100/90">
                  “Selamünaleyküm! Uzak diyarlardan senin ve ev halkın için mühürlü bir okuma mektubu getirdim. Mektubu benden teslim alıp <b>Kendi Evine</b> götür; yanına büyüklerini veya sevdiklerini çağırarak birlikte okuyun!”
                </p>
              ) : (
                <p className="text-xs leading-relaxed text-emerald-200">
                  ✅ Mektubu Haberci&apos;den teslim aldın! Şimdi <b>Kendi Evine</b> girip &ldquo;Çağırdım&rdquo; butonuna tıklayarak mektubu okuyabilirsin.
                </p>
              )}

              <div className="flex flex-wrap justify-center gap-2 pt-1 sm:justify-start">
                {!mektupAlindiMi ? (
                  <button
                    type="button"
                    disabled={oyun.bekliyor}
                    onClick={() => oyun.mektupAl()}
                    className="animate-bounce rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 px-5 py-3 text-xs font-black text-stone-950 shadow-xl ring-2 ring-amber-200 hover:brightness-110 sm:text-sm"
                  >
                    📬 Mektubu Haberci&apos;den Teslim Al
                  </button>
                ) : (
                  onSecimDegistir && (
                    <button
                      type="button"
                      onClick={() => onSecimDegistir({ tur: "bina", id: "kendi_evim" })}
                      className="rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 py-3 text-xs font-black text-stone-950 shadow-xl ring-2 ring-emerald-200 hover:brightness-110 sm:text-sm"
                    >
                      🏡 Kendi Evime Git ve Mektubu Oku →
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {mektupAlindiMi && <AileOkumasiKutusu oyun={oyun} />}
        </div>
      ) : (
        <SeyyahKutusu oyun={oyun} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// 8. KÖY MEYDANI DİVANI: HALK DAVALARI (TEKİL SORUN ÇÖZME) KUTUSU
// ---------------------------------------------------------------
export function ObaDavaKutusu({ oyun, onTamamKapat }) {
  const { durum, ayarlar } = oyun;
  const davalar = koyDavalariListesi(ayarlar);
  const cozulenler = Array.isArray(durum.cozulenDavalar) ? durum.cozulenDavalar : [];
  const mutluluk = durum.mutluluk ?? 60;
  const gorev = oyun.gorevler.find((g) => g.tur === "dava" || g.kod === "dava");

  // Tüm davalar bir arada gösterilmez; yalnızca sıradaki çözülmemiş tek dava meydanda bekler
  const siradakiDava = davalar.find((d) => !cozulenler.includes(d.id)) ?? null;
  const [sonCozum, setSonCozum] = useState(null);

  const gosterilenDava = sonCozum?.dava ?? siradakiDava;

  const kararVer = async (secenekIndeks) => {
    if (!siradakiDava) return;
    const secilenDava = siradakiDava;
    const sonuc = await oyun.davaCoz(secilenDava.id, secenekIndeks);
    if (sonuc) {
      setSonCozum({ ...sonuc, dava: secilenDava });
    }
  };

  // Karar verildikten sonra küçük bildirim yerine TAM EKRAN KARAR SONUCU KARTI
  if (sonCozum) {
    const olumlu = sonCozum.mutlulukDegisimi >= 0;
    return (
      <div
        className={`space-y-5 rounded-3xl p-6 text-center shadow-2xl ring-2 sm:p-8 ${
          olumlu
            ? "bg-gradient-to-b from-emerald-950/95 to-stone-950 text-emerald-50 ring-emerald-400"
            : "bg-gradient-to-b from-red-950/95 to-stone-950 text-red-50 ring-red-400"
        }`}
      >
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-stone-900/90 text-5xl shadow-xl ring-2 ring-amber-400">
          {olumlu ? "🌟" : "⚠️"}
        </div>

        <div className="space-y-2">
          <span
            className={`inline-block rounded-full px-4 py-1 text-sm font-black shadow ${
              olumlu ? "bg-emerald-400 text-stone-950" : "bg-red-500 text-white"
            }`}
          >
            {olumlu
              ? `+${sonCozum.mutlulukDegisimi} 😊 Köy Huzuru Arttı!`
              : `${sonCozum.mutlulukDegisimi} 😟 Köy Huzuru Azaldı`}
          </span>
          <h3 className="text-xl font-black text-amber-100 sm:text-2xl">
            {olumlu ? "Hikmetli Hükmün Köyde Huzur Sağladı!" : "Bu Karar Köylüleri Üzdü"}
          </h3>
        </div>

        <div className="mx-auto max-w-xl rounded-2xl bg-stone-900/90 p-5 text-sm leading-relaxed text-amber-50 ring-1 ring-stone-700 sm:text-base">
          “{sonCozum.aciklama}”
        </div>

        <div className="mx-auto max-w-md rounded-2xl bg-stone-950/80 p-3.5 text-xs text-amber-200 ring-1 ring-stone-800">
          <div className="flex items-center justify-between font-bold">
            <span>😊 Güncel Köy Huzuru:</span>
            <span className="text-sm font-black text-emerald-300">%{sonCozum.yeniMutluluk ?? mutluluk}</span>
          </div>
          <p className="mt-1.5 text-[11px] text-amber-200/75">
            Köylüler hükmünü dinleyip teşekkür ederek meydandan ayrıldılar. Yarın (1 gün sonra) meydanda yeni bir olay veya köye yerleşmek isteyen yeni misafirler seni bekleyecek!
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSonCozum(null);
            if (onTamamKapat) onTamamKapat();
          }}
          className="w-full max-w-md rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 py-4 text-base font-black text-stone-950 shadow-xl ring-2 ring-amber-200 transition hover:brightness-110"
        >
          ✅ Tamam
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Köy Huzur / Mutluluk Durumu */}
      <div className="rounded-2xl bg-stone-950/80 p-4 ring-1 ring-amber-500/30">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-amber-200">
            ⚖️ Köy Meydanı Divanı · Köy Huzuru ve Mutluluğu
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-stone-800 px-2.5 py-0.5 text-[11px] font-bold text-amber-200">
              Çözülen Mesele: {cozulenler.length} / {davalar.length}
            </span>
            <span className="text-sm font-black text-emerald-300">%{mutluluk}</span>
          </div>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-stone-800">
          <div
            className={`h-full transition-all ${
              mutluluk >= 70 ? "bg-emerald-500" : mutluluk >= 40 ? "bg-amber-400" : "bg-red-500"
            }`}
            style={{ width: `${mutluluk}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-amber-200/80">
          Köylüler aralarındaki anlaşmazlıkları tek tek <b>Köy Meydanı</b>&apos;na getirir. Hikmetli ve adil kararların mutluluğu (+4 / +2) artırır; sert veya adaletsiz kararlar ise düşürür!
        </p>
      </div>

      {gosterilenDava ? (
        <div className="space-y-4 rounded-3xl bg-stone-950/85 p-5 shadow-xl ring-1 ring-amber-500/40">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-stone-800 pb-3">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-black text-amber-300 ring-1 ring-amber-400/40">
                📢 Meydanda Söz İsteyen Köylüler: {gosterilenDava.kisi}
              </span>
              <h3 className="mt-2 text-lg font-black text-amber-100">{gosterilenDava.baslik}</h3>
            </div>
            {gorev && (
              <span className="shrink-0 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-200 ring-1 ring-emerald-500/40">
                Level Görevi: {gorev.yapilan}/{gorev.hedef}
              </span>
            )}
          </div>

          <div className="rounded-2xl bg-stone-900/90 p-4 text-sm leading-relaxed text-amber-50/95 ring-1 ring-stone-800">
            “{gosterilenDava.hikaye}”
          </div>

          <div className="space-y-2.5 pt-1">
            <p className="text-xs font-black uppercase tracking-wider text-amber-300">
              ⚖️ Hükmün nedir genç yönetici?
            </p>
            {(gosterilenDava.secenekler ?? []).map((s, idx) => (
              <button
                key={idx}
                type="button"
                disabled={oyun.bekliyor}
                onClick={() => kararVer(idx)}
                className="w-full rounded-2xl bg-stone-900/95 p-3.5 text-left text-xs leading-relaxed text-amber-50 ring-1 ring-stone-700 transition hover:bg-amber-500/20 hover:ring-amber-400 sm:text-sm"
              >
                <b className="mr-2 inline-grid h-6 w-6 place-items-center rounded-lg bg-amber-500/20 text-amber-300">
                  {idx + 1}
                </b>
                {s.metin}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl bg-stone-950/80 p-6 text-center ring-1 ring-emerald-500/40">
          <div className="text-4xl">🌿</div>
          <h3 className="mt-2 text-lg font-black text-emerald-200">
            Köy Meydanı&apos;nda Huzur ve Muhabbet Hâkim!
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-amber-100/80 sm:text-sm">
            Meydanda bekleyen tüm anlaşmazlıkları ({davalar.length}/{davalar.length}) hikmetle karara bağladın. Ahali meydanda huzurla sohbet ediyor.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// 9. KIRAATHANE: OZAN DEDE (TÜRKÜ HİKÂYESİ) & YOLCULAR (İNSAN TOPLA)
// ---------------------------------------------------------------
export function KiraathaneKutusu({ oyun, varsayilanSekme = "ozan", onKiraathaneAc = null }) {
  const { durum, ayarlar, simdi } = oyun;
  const kiraathaneSeviye = durum.binalar?.kiraathane ?? 0;
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

  // Kıraathane henüz inşa edilmediyse Ozan Dede dinlenemez!
  if (kiraathaneSeviye < 1) {
    return (
      <div className="space-y-4 rounded-3xl bg-stone-950/90 p-6 text-center shadow-xl ring-2 ring-amber-400/50">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-stone-900 text-4xl ring-1 ring-amber-500/40">
          🍵
        </div>
        <div className="space-y-2">
          <span className="inline-block rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-black text-amber-300 ring-1 ring-amber-400/40">
            🔒 Önce Kıraathane İnşa Edilmeli
          </span>
          <h3 className="text-lg font-black text-amber-100 sm:text-xl">
            Kıraathane Henüz İnşa Edilmedi!
          </h3>
          <p className="mx-auto max-w-lg text-xs leading-relaxed text-amber-100/85 sm:text-sm">
            <b>Ozan Dede</b>&apos;den türkülerimizin hikâyesini dinlemek ve köye uğrayan yolcuları ağırlamak için önce meydanın sağındaki <b>Kıraathane</b> binasını inşa etmelisin.
          </p>
        </div>
        {onKiraathaneAc && (
          <button
            type="button"
            onClick={onKiraathaneAc}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 px-6 py-3 text-sm font-black text-stone-950 shadow-xl ring-2 ring-amber-200 transition hover:brightness-110"
          >
            🔨 Kıraathane Arsasına Git ve İnşa Et →
          </button>
        )}
      </div>
    );
  }

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

    // Ses dosyası girilmemişse tarayıcı Türkçe seslendirme + ağız animasyonu
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
                💡 Bu sırada <b>Köy Meydanı</b>&apos;na gidip halkın davalarını hikmetle çözerek köy mutluluğunu artırabilirsin.
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
    const { durum } = oyun;
    const otagSeviye = durum.binalar.otag ?? 1;
    const mezun = durum.level === 10 && otagSeviye >= 4 && oyun.tumGorevlerTamam;
    const konutKapasite = toplamKonutKapasitesi(durum.binalar);
    const mevcutInsan = durum.envanter.insan ?? 5;
    const cozulenSayisi = Array.isArray(durum.cozulenDavalar) ? durum.cozulenDavalar.length : 0;

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

        {/* Oba Yönetici Divanı Özeti */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-stone-950/80 p-4 ring-1 ring-amber-500/30">
            <span className="text-xs font-bold text-amber-300">😊 Köy Huzuru</span>
            <div className="mt-1 text-2xl font-black text-emerald-300">%{durum.mutluluk ?? 60}</div>
            <p className="mt-1 text-[11px] text-amber-200/75">
              Köy Meydanı&apos;nda çözülen mesele: <b>{cozulenSayisi}</b>
            </p>
          </div>

          <div className="rounded-2xl bg-stone-950/80 p-4 ring-1 ring-amber-500/30">
            <span className="text-xs font-bold text-amber-300">🏠 5+1 Konut Kapasitesi</span>
            <div className="mt-1 text-2xl font-black text-amber-100">
              👥 {mevcutInsan} / {konutKapasite}
            </div>
            <p className="mt-1 text-[11px] text-amber-200/75">
              Boş yatak kapasitesi: <b>{Math.max(0, konutKapasite - mevcutInsan)} Kişi</b>
            </p>
          </div>

          <div className="rounded-2xl bg-stone-950/80 p-4 ring-1 ring-amber-500/30">
            <span className="text-xs font-bold text-amber-300">📦 Oba Depo Bereketi</span>
            <div className="mt-1 text-2xl font-black text-amber-100">{DEPO_SAAT[otagSeviye] ?? 24} Saat</div>
            <p className="mt-1 text-[11px] text-amber-200/75">
              Oba Seviye {otagSeviye} üretim saklama süresi
            </p>
          </div>
        </div>

        {/* Üretim Depoları Durumu */}
        <div className="rounded-2xl bg-stone-950/80 p-4 ring-1 ring-stone-800">
          <h4 className="mb-3 text-xs font-black uppercase tracking-wider text-amber-300">
            🌾 Köy Üretim Alanlarında Biriken Kaynaklar
          </h4>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {["erzak", "kereste", "tas"].map((k) => {
              const t = KAYNAKLAR[k];
              const acik = kaynakAcikMi(k, durum.level);
              const dBilgi = acik ? oyun.dolum(k) : null;
              const hazirAdet = dBilgi?.hazirAdet ?? 0;
              const toplamAdet = dBilgi?.toplamAdet ?? 0;
              const birikenMiktar = dBilgi?.biriken ?? 0;
              return (
                <div key={k} className="rounded-xl bg-stone-900/90 p-3 ring-1 ring-stone-800">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>
                      {t.ikon} {t.ad}
                    </span>
                    <span className="tabular-nums text-amber-200">
                      {acik
                        ? k === "kereste"
                          ? `${hazirAdet}/${toplamAdet} Sefer`
                          : `${hazirAdet}/${toplamAdet} Hazır`
                        : `🔒 Lv.${t.acilisLevel}`}
                    </span>
                  </div>
                  {acik && k !== "kereste" && (
                    <button
                      type="button"
                      disabled={hazirAdet <= 0 || oyun.bekliyor}
                      onClick={() => oyun.sahaHepsiniTopla(k)}
                      className="mt-2 w-full rounded-lg bg-amber-400 py-1.5 text-xs font-black text-stone-950 disabled:bg-stone-800 disabled:text-stone-500"
                    >
                      {hazirAdet > 0 ? `Hepsini Topla (+${birikenMiktar} ${t.ad})` : "Yetişiyor…"}
                    </button>
                  )}
                  {acik && k === "kereste" && (
                    <div className="mt-2 rounded-lg bg-stone-800/80 py-1.5 text-center text-[11px] font-bold text-amber-200/80">
                      {hazirAdet > 0 ? "🌲 Orman haritasından keşfet" : "Bugünkü seferler tamam"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 5+1 Konut Mahallesi Durumu */}
        <div className="rounded-2xl bg-stone-950/80 p-4 ring-1 ring-stone-800">
          <h4 className="mb-2.5 text-xs font-black uppercase tracking-wider text-amber-300">
            🏘️ 5+1 Konut Mahallesi Hane Durumu
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {EV_IDLERI.map((evId) => {
              const kat = durum.binalar[evId] ?? 0;
              return (
                <div
                  key={evId}
                  className="flex items-center justify-between rounded-xl bg-stone-900/90 px-3 py-2 text-xs ring-1 ring-stone-800"
                >
                  <span className="font-bold text-amber-100">{BINALAR[evId].ad}</span>
                  <span className={kat > 0 ? "font-black text-emerald-300" : "text-stone-500"}>
                    {kat > 0 ? `${kat}. Kat (${kat * 5} 👥)` : "Boş Arsa"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (binaId === "sosyalmeydan") {
    const aktif = sekme ?? "dava";
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 rounded-2xl bg-stone-950/80 p-1 text-xs font-black ring-1 ring-amber-500/30 sm:text-sm">
          <button
            type="button"
            onClick={() => setSekme("dava")}
            className={`rounded-xl py-2.5 transition ${
              aktif === "dava" ? "bg-amber-500 text-stone-950 shadow" : "text-amber-200/75 hover:bg-stone-900"
            }`}
          >
            ⚖️ Halkın Davası (Meydan Divanı)
          </button>
          <button
            type="button"
            onClick={() => setSekme("sohbet")}
            className={`rounded-xl py-2.5 transition ${
              aktif === "sohbet" ? "bg-amber-500 text-stone-950 shadow" : "text-amber-200/75 hover:bg-stone-900"
            }`}
          >
            🗣️ Meydan Sohbeti (Paylaşım)
          </button>
        </div>

        {aktif === "dava" ? <ObaDavaKutusu oyun={oyun} /> : <SosyalMeydanKutusu oyun={oyun} />}
      </div>
    );
  }

  if (binaId === "takasmerkezi") {
    return <BirlikPaneli oyun={oyun} varsayilanSekme="birlik" />;
  }

  if (binaId === "oyuncadiri") {
    return <BirlikPaneli oyun={oyun} varsayilanSekme="fetih" />;
  }

  return null;
}
