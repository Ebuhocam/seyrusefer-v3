"use client";
import { youtubeKimligi } from "@/components/koy/YoutubeOynatici";
import { useEffect, useState } from "react";
import Link from "next/link";
import BildirimGonder from "./BildirimGonder";
import { BINALAR, KAYNAKLAR } from "@/lib/oyun/sabitler";
import { GOREV_TURLERI } from "@/lib/oyun/gorevler";

/** Geri alınamayan işlemler için satır içi iki adımlı onay (window.confirm kullanılmaz) */
function OnayliSil({ etiket = "Sil", soru = "Emin misin?", onayEtiketi = "Evet, sil", onOnay, sinif = "", disabled = false }) {
  const [soruyor, setSoruyor] = useState(false);
  if (!soruyor) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setSoruyor(true)}
        className={sinif || "rounded-lg bg-red-950/70 px-2.5 py-1 text-xs font-bold text-red-300 hover:bg-red-900 disabled:opacity-50"}
      >
        {etiket}
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-red-950/80 px-2 py-1 ring-1 ring-red-400/50">
      <span className="text-xs font-bold text-red-100">{soru}</span>
      <button
        type="button"
        onClick={() => {
          setSoruyor(false);
          onOnay();
        }}
        className="rounded-md bg-red-600 px-2 py-1 text-xs font-black text-white hover:bg-red-500"
      >
        {onayEtiketi}
      </button>
      <button type="button" onClick={() => setSoruyor(false)} className="rounded-md bg-stone-800 px-2 py-1 text-xs font-bold text-stone-200">
        Vazgeç
      </button>
    </span>
  );
}

const GUN_MS = 24 * 60 * 60 * 1000;

/** "3 gün önce" gibi kısa Türkçe zaman ifadesi */
function gecenSure(ms, simdi) {
  if (!ms) return "Hiç";
  const fark = Math.max(0, simdi - ms);
  if (fark < 60 * 60 * 1000) return "Az önce";
  if (fark < GUN_MS) return `${Math.floor(fark / (60 * 60 * 1000))} saat önce`;
  const gun = Math.floor(fark / GUN_MS);
  return gun === 1 ? "Dün" : `${gun} gün önce`;
}

export default function AdminPaneli() {
  const [veri, setVeri] = useState(null);
  const [yuklemeHatasi, setYuklemeHatasi] = useState("");
  const [anaSekme, setAnaSekme] = useState("sinif"); // 'sinif' | 'levellar' | 'binalar' | 'moderasyon' | 'kullanicilar'
  const [seciliLevel, setSeciliLevel] = useState(1);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [bildirim, setBildirim] = useState(null);

  useEffect(() => {
    fetch("/api/admin")
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.hata ?? "Yönetim verisi alınamadı.");
        setVeri(j);
      })
      .catch((e) => setYuklemeHatasi(e.message));
  }, []);

  useEffect(() => {
    // Başarı mesajı kendiliğinden kaybolur; hata mesajı öğretmen kapatana kadar ekranda kalır
    if (!bildirim || bildirim.tur === "hata") return;
    const t = setTimeout(() => setBildirim(null), 3500);
    return () => clearTimeout(t);
  }, [bildirim]);

  if (yuklemeHatasi) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-950 p-6 text-amber-50">
        <div className="max-w-sm space-y-3 text-center">
          <p className="font-bold text-red-200">{yuklemeHatasi}</p>
          <Link href="/" className="varak-dugme inline-block rounded-xl px-4 py-2 text-xs font-black">
            ← Köy Haritasına Dön
          </Link>
        </div>
      </main>
    );
  }

  if (!veri) {
    return (
      <main className="min-h-screen bg-stone-950 p-6 text-amber-50 grid place-items-center">
        Yönetim Merkezi yükleniyor…
      </main>
    );
  }

  const gonder = async (govde, mesaj) => {
    setKaydediyor(true);
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(govde),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setBildirim({ tur: "hata", metin: j.hata ?? "Kaydedilemedi. Lütfen tekrar deneyin." });
        return false;
      }
      setVeri(j);
      setBildirim({ tur: "tamam", metin: mesaj });
      return true;
    } catch {
      setBildirim({ tur: "hata", metin: "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin." });
      return false;
    } finally {
      setKaydediyor(false);
    }
  };

  const lv = veri.levellar[seciliLevel];

  const levelAlanGuncelle = (alan, deger) => {
    setVeri((eski) => ({
      ...eski,
      levellar: {
        ...eski.levellar,
        [seciliLevel]: { ...eski.levellar[seciliLevel], [alan]: deger },
      },
    }));
  };

  const icerikGuncelle = (alan, deger) => {
    setVeri((eski) => ({
      ...eski,
      levellar: {
        ...eski.levellar,
        [seciliLevel]: {
          ...eski.levellar[seciliLevel],
          icerik: { ...eski.levellar[seciliLevel].icerik, [alan]: deger },
        },
      },
    }));
  };

  return (
    <main className="min-h-screen bg-stone-950 text-amber-50 pb-20">
      {/* Üst Başlık */}
      <header className="sticky top-0 z-30 border-b border-amber-500/20 bg-stone-900/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-lg font-black text-stone-900">
              ⚙️
            </span>
            <div>
              <h1 className="text-lg font-black text-amber-200">Seyrüsefer v3 · Level Tasarım ve Yönetim Merkezi</h1>
              <p className="text-xs text-amber-200/70">
                10 levelın görevlerini, içeriklerini, bina hedeflerini ve kaynak bedellerini buradan yönetebilirsiniz
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-xl bg-stone-800 px-3.5 py-2 text-xs font-black text-amber-200 ring-1 ring-amber-500/40 hover:bg-stone-700"
            >
              ← Köy Haritasına Dön
            </Link>
          </div>
        </div>
      </header>

      {bildirim && (
        <div className="sticky top-[68px] z-20 mx-auto mt-2 max-w-6xl px-4" role={bildirim.tur === "hata" ? "alert" : "status"}>
          <div
            className={`flex items-start justify-between gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold shadow-lg ring-1 ${
              bildirim.tur === "hata" ? "bg-red-900 text-red-50 ring-red-400/60" : "bg-emerald-800 text-emerald-50 ring-emerald-400/60"
            }`}
          >
            <span>{bildirim.tur === "hata" ? "⚠️ " : "✅ "}{bildirim.metin}</span>
            <button type="button" onClick={() => setBildirim(null)} className="shrink-0 text-xs underline">
              Kapat
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl p-4 space-y-6">
        {/* Ana Sekmeler */}
        <div className="flex flex-wrap gap-2 rounded-2xl bg-stone-900 p-1.5 ring-1 ring-stone-800">
          {[
            { kod: "sinif", ad: `🧑‍🎓 Sınıf Durumu (${veri.sinif.length})` },
            { kod: "levellar", ad: "📜 Level & Görev Tasarım Merkezi (1-10)" },
            { kod: "binalar", ad: "🏛️ Binalar, Ozan Dede & Haberci" },
            { kod: "moderasyon", ad: `🚩 Çınar Altı Moderasyon${veri.moderasyon.filter((m) => m.bekleyen > 0).length ? ` (${veri.moderasyon.filter((m) => m.bekleyen > 0).length})` : ""}` },
            { kod: "bildirim", ad: "🔔 Bildirim Gönder" },
            { kod: "kullanicilar", ad: `👥 Öğrenciler & Roller (${veri.kullanicilar.length})` },
          ].map((s) => (
            <button
              key={s.kod}
              type="button"
              onClick={() => setAnaSekme(s.kod)}
              className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                anaSekme === s.kod ? "varak-dugme" : "text-amber-200/70 hover:bg-stone-800"
              }`}
            >
              {s.ad}
            </button>
          ))}
        </div>

        {/* SEKME 1: LEVEL & GÖREV TASARIM MERKEZİ */}
        {anaSekme === "levellar" && lv && (
          <div className="space-y-6">
            {/* Level Seçici */}
            <div className="flex flex-wrap gap-1.5">
              {Object.values(veri.levellar).map((l) => (
                <button
                  key={l.no}
                  type="button"
                  onClick={() => setSeciliLevel(l.no)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-black transition ring-1 ${
                    seciliLevel === l.no
                      ? "varak-dugme ring-amber-300 shadow-lg"
                      : "bg-stone-900 text-amber-100/80 ring-stone-800 hover:bg-stone-800"
                  }`}
                >
                  Lv.{l.no} · {l.gundem}
                  {l.ozellestirilmis && <span title="Bu level özelleştirilmiş"> ✎</span>}
                </button>
              ))}
            </div>

            {/* 1. Gündem ve Hedef Binalar */}
            <section className="rounded-3xl bg-stone-900/90 p-5 ring-1 ring-stone-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-black text-amber-300">
                  1. Level {lv.no} Gündemi ve Bina Hedefleri
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <OnayliSil
                    etiket="↩️ Varsayılana Dön"
                    soru={`Level ${lv.no} oyunun hazır ayarlarına dönsün mü? Yaptığınız tüm değişiklikler silinir.`}
                    onayEtiketi="Evet, varsayılana dön"
                    disabled={kaydediyor}
                    sinif="rounded-xl bg-stone-800 px-3 py-2 text-xs font-bold text-amber-200 ring-1 ring-stone-600 hover:bg-stone-700 disabled:opacity-50"
                    onOnay={() => gonder({ islem: "levelSifirla", levelNo: lv.no }, `Level ${lv.no} varsayılan ayarlara döndü.`)}
                  />
                  <button
                    type="button"
                    disabled={kaydediyor}
                    onClick={() =>
                      gonder({ islem: "levelKaydet", levelNo: lv.no, veri: lv }, `Level ${lv.no} tasarımı kaydedildi!`)
                    }
                    className="varak-dugme rounded-xl px-4 py-2 text-xs font-black disabled:opacity-50"
                  >
                    💾 Level {lv.no} Tasarımını Kaydet
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-amber-200/80">Gündem Başlığı</span>
                  <input
                    value={lv.gundem}
                    onChange={(e) => levelAlanGuncelle("gundem", e.target.value)}
                    className="w-full rounded-xl bg-stone-950 px-3 py-2 text-sm text-amber-50 ring-1 ring-stone-700"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-amber-200/80">Evre</span>
                  <select
                    value={lv.evre}
                    onChange={(e) => levelAlanGuncelle("evre", e.target.value)}
                    className="w-full rounded-xl bg-stone-950 px-3 py-2 text-sm text-amber-50 ring-1 ring-stone-700"
                  >
                    <option value="bireysel">🌱 Bireysel İnşa</option>
                    <option value="birlik">🤝 Kardeşlik ve Birlik</option>
                    <option value="meydan">🚩 Meydan ve Alan Mücadelesi</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-amber-200/80">Hedef Süre (Gün)</span>
                  <input
                    type="number"
                    min={1}
                    value={lv.hedefGun}
                    onChange={(e) => levelAlanGuncelle("hedefGun", Number(e.target.value))}
                    className="w-full rounded-xl bg-stone-950 px-3 py-2 text-sm text-amber-50 ring-1 ring-stone-700"
                  />
                </label>
              </div>

              <div>
                <span className="mb-2 block text-xs font-bold text-amber-200/80">
                  Bu Levelı Geçmek İçin Ulaşılması Gereken Bina Seviyeleri (0 = bu levelda şart değil)
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                  {Object.entries(BINALAR).map(([binaId, b]) => {
                    const seciliSeviye = lv.hedefler?.[binaId] ?? 0;
                    return (
                      <label key={binaId} className="rounded-xl bg-stone-950 p-2.5 text-xs ring-1 ring-stone-800">
                        <span className="block font-bold text-amber-100">{b.ad}</span>
                        <select
                          value={seciliSeviye}
                          onChange={(e) => {
                            const deger = Number(e.target.value);
                            const yeni = { ...(lv.hedefler ?? {}) };
                            if (deger > 0) yeni[binaId] = deger;
                            else delete yeni[binaId];
                            levelAlanGuncelle("hedefler", yeni);
                          }}
                          className="mt-1 w-full rounded-lg bg-stone-900 px-2 py-1 text-xs text-amber-50 ring-1 ring-stone-700"
                        >
                          <option value={0}>Şart değil</option>
                          {Array.from({ length: b.maksSeviye }, (_, i) => i + 1).map((s) => (
                            <option key={s} value={s}>
                              Seviye {s}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* 2. Level Görevleri */}
            <section className="rounded-3xl bg-stone-900/90 p-5 ring-1 ring-stone-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-black text-amber-300">
                    2. Level {lv.no} Görev Şartları ({lv.gorevler.length} görev)
                  </h2>
                  <p className="text-xs text-amber-200/70">
                    Öğrencinin bina yükseltmek ve level atlamak için tamamlaması gereken görevler
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const yeniKod = `gorev_${Date.now().toString(36)}`;
                    levelAlanGuncelle("gorevler", [
                      ...lv.gorevler,
                      {
                        kod: yeniKod,
                        tur: "onay",
                        ad: "Yeni Görev",
                        aciklama: "",
                        hedef: 1,
                        gunluk: false,
                        bina: Object.keys(lv.hedefler ?? {})[0] ?? "cami",
                      },
                    ]);
                  }}
                  className="varak-dugme rounded-xl px-3.5 py-2 text-xs font-black"
                >
                  + Yeni Görev Ekle
                </button>
              </div>

              <div className="space-y-2.5">
                {lv.gorevler.map((g, idx) => {
                  const guncelle = (alan, deger) => {
                    const liste = lv.gorevler.map((item, i) => (i === idx ? { ...item, [alan]: deger } : item));
                    levelAlanGuncelle("gorevler", liste);
                  };
                  return (
                    <div
                      key={g.kod || idx}
                      className="grid gap-2 rounded-2xl bg-stone-950 p-3.5 ring-1 ring-stone-800 sm:grid-cols-12 items-center"
                    >
                      <div className="sm:col-span-3">
                        <span className="block text-[10px] font-bold text-amber-300/70">Görev Türü</span>
                        <select
                          value={g.tur}
                          onChange={(e) => {
                            const yeniTur = e.target.value;
                            const liste = lv.gorevler.map((item, i) =>
                              i === idx
                                ? {
                                    ...item,
                                    tur: yeniTur,
                                    kod: yeniTur === "onay" ? item.kod : yeniTur,
                                  }
                                : item
                            );
                            levelAlanGuncelle("gorevler", liste);
                          }}
                          className="mt-0.5 w-full rounded-lg bg-stone-900 px-2 py-1.5 text-xs text-amber-50 ring-1 ring-stone-700"
                        >
                          {Object.entries(GOREV_TURLERI).map(([turKod, t]) => (
                            <option key={turKod} value={turKod}>
                              {t.ikon} {t.ad}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <span className="block text-[10px] font-bold text-amber-300/70">Görev Başlığı</span>
                        <input
                          value={g.ad}
                          onChange={(e) => guncelle("ad", e.target.value)}
                          placeholder="Örn: 3 Günlük Hadis Oku"
                          className="mt-0.5 w-full rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs text-amber-50 ring-1 ring-stone-700"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <span className="block text-[10px] font-bold text-amber-300/70">Hedef</span>
                        <input
                          type="number"
                          min={1}
                          value={g.hedef}
                          onChange={(e) => guncelle("hedef", Number(e.target.value))}
                          className="mt-0.5 w-full rounded-lg bg-stone-900 px-2 py-1.5 text-xs text-amber-50 ring-1 ring-stone-700"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <span className="block text-[10px] font-bold text-amber-300/70">Anahtar Bina</span>
                        <select
                          value={g.bina ?? ""}
                          onChange={(e) => guncelle("bina", e.target.value || null)}
                          className="mt-0.5 w-full rounded-lg bg-stone-900 px-2 py-1.5 text-xs text-amber-50 ring-1 ring-stone-700"
                        >
                          <option value="">Genel (Tüm Level)</option>
                          {Object.entries(BINALAR).map(([bId, b]) => (
                            <option key={bId} value={bId}>
                              🔑 {b.ad}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center justify-between gap-2 sm:col-span-2 pt-3 sm:pt-0">
                        <label className="flex items-center gap-1.5 text-xs">
                          <input
                            type="checkbox"
                            checked={!!g.gunluk}
                            onChange={(e) => guncelle("gunluk", e.target.checked)}
                            className="accent-amber-400"
                          />
                          <span>Günlük</span>
                        </label>
                        <OnayliSil
                          soru="Görev silinsin mi?"
                          onOnay={() =>
                            levelAlanGuncelle(
                              "gorevler",
                              lv.gorevler.filter((_, i) => i !== idx)
                            )
                          }
                        />
                      </div>

                      {g.tur === "onay" && (
                        <div className="sm:col-span-12">
                          <input
                            value={g.aciklama ?? ""}
                            onChange={(e) => guncelle("aciklama", e.target.value)}
                            placeholder="Özel görev açıklaması / yönergesi (öğrenci göreve tıkladığında bu metni görür)"
                            className="w-full rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs text-amber-100 ring-1 ring-stone-700"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 3. Level Eğitsel İçerikleri */}
            <section className="grid gap-4 lg:grid-cols-2">
              {/* Hadisler */}
              <div className="rounded-3xl bg-stone-900/90 p-5 ring-1 ring-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-amber-300">
                    📖 Level {lv.no} Hadis Listesi ({lv.icerik.hadisler.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      icerikGuncelle("hadisler", [...lv.icerik.hadisler, { metin: "", kaynak: "" }])
                    }
                    className="varak-dugme rounded-lg px-2.5 py-1 text-xs font-black"
                  >
                    + Hadis Ekle
                  </button>
                </div>

                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {lv.icerik.hadisler.map((h, i) => (
                    <div key={i} className="space-y-1.5 rounded-2xl bg-stone-950 p-3 ring-1 ring-stone-800">
                      <div className="flex items-center justify-between text-xs">
                        <b className="text-amber-200">{i + 1}. Gün Hadisi</b>
                        <OnayliSil
                          soru="Hadis silinsin mi?"
                          onOnay={() =>
                            icerikGuncelle(
                              "hadisler",
                              lv.icerik.hadisler.filter((_, idx) => idx !== i)
                            )
                          }
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={h.metin}
                        onChange={(e) => {
                          const yeni = lv.icerik.hadisler.map((item, idx) =>
                            idx === i ? { ...item, metin: e.target.value } : item
                          );
                          icerikGuncelle("hadisler", yeni);
                        }}
                        placeholder="Hadis-i şerif metni…"
                        className="w-full rounded-lg bg-stone-900 p-2 text-xs text-amber-50 ring-1 ring-stone-700"
                      />
                      <input
                        value={h.kaynak ?? ""}
                        onChange={(e) => {
                          const yeni = lv.icerik.hadisler.map((item, idx) =>
                            idx === i ? { ...item, kaynak: e.target.value } : item
                          );
                          icerikGuncelle("hadisler", yeni);
                        }}
                        placeholder="Kaynak (örn: Buhârî, Îmân, 1)"
                        className="w-full rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs text-amber-200 ring-1 ring-stone-700"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Video ve Aile Okuması */}
              <div className="space-y-4">
                <div className="rounded-3xl bg-stone-900/90 p-5 ring-1 ring-stone-800 space-y-2.5">
                  <h3 className="text-sm font-black text-amber-300">🎬 Gündem Videosu (İleri Sarma Korumalı)</h3>
                  <input
                    value={lv.icerik.video?.baslik ?? ""}
                    onChange={(e) => icerikGuncelle("video", { ...lv.icerik.video, baslik: e.target.value })}
                    placeholder="Video başlığı"
                    className="w-full rounded-xl bg-stone-950 px-3 py-2 text-xs text-amber-50 ring-1 ring-stone-700"
                  />
                  <textarea
                    rows={2}
                    value={lv.icerik.video?.ozet ?? ""}
                    onChange={(e) => icerikGuncelle("video", { ...lv.icerik.video, ozet: e.target.value })}
                    placeholder="Ders özeti / açıklaması"
                    className="w-full rounded-xl bg-stone-950 p-3 text-xs text-amber-50 ring-1 ring-stone-700"
                  />
                  <label className="block space-y-1">
                    <span className="text-[11px] font-bold text-amber-200/80">Video bağlantısı (YouTube veya .mp4)</span>
                    <input
                      value={lv.icerik.video?.url ?? ""}
                      onChange={(e) => icerikGuncelle("video", { ...lv.icerik.video, url: e.target.value.trim() })}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full rounded-xl bg-stone-950 px-3 py-2 text-xs text-amber-50 ring-1 ring-stone-700"
                    />
                  </label>
                  {(() => {
                    const url = lv.icerik.video?.url ?? "";
                    if (!url) {
                      return (
                        <label className="flex items-center gap-2">
                          <span className="text-[11px] text-amber-200/80">
                            Bağlantı yoksa öğrenciye süreli bir ders kartı gösterilir. Ders süresi (saniye):
                          </span>
                          <input
                            type="number"
                            min={5}
                            step={5}
                            value={lv.icerik.video?.sureSn ?? 15}
                            onChange={(e) =>
                              icerikGuncelle("video", { ...lv.icerik.video, sureSn: Math.max(5, Number(e.target.value) || 15) })
                            }
                            className="w-20 rounded-xl bg-stone-950 px-2 py-1.5 text-xs text-amber-50 ring-1 ring-stone-700"
                          />
                        </label>
                      );
                    }
                    if (youtubeKimligi(url)) {
                      return (
                        <p className="text-[11px] font-semibold text-emerald-300">
                          ✓ YouTube videosu tanındı. Süre videonun kendisinden otomatik alınır; öğrenci ileri saramaz.
                        </p>
                      );
                    }
                    if (/^https?:\/\/.+\.(mp4|webm)(\?.*)?$/i.test(url)) {
                      return (
                        <p className="text-[11px] font-semibold text-emerald-300">
                          ✓ Video dosyası tanındı. Süre dosyadan otomatik alınır.
                        </p>
                      );
                    }
                    return (
                      <p className="text-[11px] font-semibold text-red-400">
                        ⚠️ Bu bağlantı tanınmadı. YouTube video bağlantısı (youtube.com/watch?v=… veya youtu.be/…) ya da .mp4 dosya adresi girin.
                      </p>
                    );
                  })()}
                </div>

                <div className="rounded-3xl bg-stone-900/90 p-5 ring-1 ring-stone-800 space-y-2.5">
                  <h3 className="text-sm font-black text-amber-300">🏠 Otağ Aile Okuması &amp; Meydan Sorusu</h3>
                  <input
                    value={lv.icerik.aile?.baslik ?? ""}
                    onChange={(e) => icerikGuncelle("aile", { ...lv.icerik.aile, baslik: e.target.value })}
                    placeholder="Aile mektubu başlığı"
                    className="w-full rounded-xl bg-stone-950 px-3 py-2 text-xs text-amber-50 ring-1 ring-stone-700"
                  />
                  <textarea
                    rows={3}
                    value={lv.icerik.aile?.metin ?? ""}
                    onChange={(e) => icerikGuncelle("aile", { ...lv.icerik.aile, metin: e.target.value })}
                    placeholder="Aile ile birlikte okunacak metin…"
                    className="w-full rounded-xl bg-stone-950 p-3 text-xs text-amber-50 ring-1 ring-stone-700"
                  />
                  <input
                    value={lv.icerik.aile?.soru ?? ""}
                    onChange={(e) => icerikGuncelle("aile", { ...lv.icerik.aile, soru: e.target.value })}
                    placeholder="Aile istişare sorusu"
                    className="w-full rounded-xl bg-stone-950 px-3 py-2 text-xs text-amber-50 ring-1 ring-stone-700"
                  />
                  <input
                    value={lv.icerik.gundemSorusu ?? ""}
                    onChange={(e) => icerikGuncelle("gundemSorusu", e.target.value)}
                    placeholder="💬 Sosyal Meydan tartışma/paylaşım sorusu"
                    className="w-full rounded-xl bg-stone-950 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-500/40"
                  />
                </div>
              </div>
            </section>

            {/* 4. İlim Sınavı Soruları */}
            <section className="rounded-3xl bg-stone-900/90 p-5 ring-1 ring-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-amber-300">
                  ✍️ Level {lv.no} Medrese İlim Sınavı Soruları ({lv.icerik.sinav.length})
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    icerikGuncelle("sinav", [
                      ...lv.icerik.sinav,
                      { soru: "", secenekler: ["", "", "", ""], dogru: 0 },
                    ])
                  }
                  className="varak-dugme rounded-lg px-3 py-1.5 text-xs font-black"
                >
                  + Sınav Sorusu Ekle
                </button>
              </div>

              {lv.icerik.sinav.map((s, sIdx) => (
                <div key={sIdx} className="space-y-2 rounded-2xl bg-stone-950 p-3.5 ring-1 ring-stone-800">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      value={s.soru}
                      onChange={(e) => {
                        const yeni = lv.icerik.sinav.map((item, idx) =>
                          idx === sIdx ? { ...item, soru: e.target.value } : item
                        );
                        icerikGuncelle("sinav", yeni);
                      }}
                      placeholder={`${sIdx + 1}. Soru metni…`}
                      className="flex-1 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-bold text-amber-100 ring-1 ring-stone-700"
                    />
                    <OnayliSil
                      soru="Soru silinsin mi?"
                      onOnay={() =>
                        icerikGuncelle(
                          "sinav",
                          lv.icerik.sinav.filter((_, idx) => idx !== sIdx)
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-4">
                    {[0, 1, 2, 3].map((secIdx) => (
                      <label
                        key={secIdx}
                        className={`flex items-center gap-1.5 rounded-lg p-1.5 ring-1 ${
                          Number(s.dogru) === secIdx
                            ? "bg-emerald-950/60 ring-emerald-500/60"
                            : "bg-stone-900 ring-stone-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`admin-soru-${sIdx}`}
                          checked={Number(s.dogru) === secIdx}
                          onChange={() => {
                            const yeni = lv.icerik.sinav.map((item, idx) =>
                              idx === sIdx ? { ...item, dogru: secIdx } : item
                            );
                            icerikGuncelle("sinav", yeni);
                          }}
                          className="accent-emerald-400"
                        />
                        <input
                          value={s.secenekler?.[secIdx] ?? ""}
                          onChange={(e) => {
                            const yeniSecenekler = [...(s.secenekler ?? ["", "", "", ""])];
                            yeniSecenekler[secIdx] = e.target.value;
                            const yeni = lv.icerik.sinav.map((item, idx) =>
                              idx === sIdx ? { ...item, secenekler: yeniSecenekler } : item
                            );
                            icerikGuncelle("sinav", yeni);
                          }}
                          placeholder={`${["A", "B", "C", "D"][secIdx]} şıkkı`}
                          className="w-full bg-transparent text-xs text-amber-50 focus:outline-none"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={kaydediyor}
                  onClick={() =>
                    gonder({ islem: "levelKaydet", levelNo: lv.no, veri: lv }, `Level ${lv.no} tasarımı kaydedildi!`)
                  }
                  className="varak-dugme rounded-xl px-6 py-2.5 text-sm font-black disabled:opacity-50"
                >
                  💾 Level {lv.no} Tüm Değişiklikleri Kaydet
                </button>
              </div>
            </section>
          </div>
        )}

        {/* SEKME 2: BİNA KAYNAK BEDELLERİ, OZAN DEDE & HABERCİ */}
        {anaSekme === "binalar" && (
          <div className="space-y-6">
            <section className="rounded-3xl bg-stone-900/90 p-5 ring-1 ring-stone-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-amber-300">🏛️ Köy Binaları: Açılış Levelları ve Bedeller</h2>
                  <p className="text-xs text-amber-200/70">
                    Her bina seviyesinin açılış levelı ve Mahsul / Odun / Taş bedeli. &quot;En az nüfus şartı&quot; harcanmaz; köyde en az o kadar kişi yaşaması yeterlidir.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={kaydediyor}
                  onClick={() =>
                    gonder(
                      {
                        islem: "genelKaydet",
                        binalar: veri.binalar,
                        seyyahGorevleri: veri.seyyahGorevleri,
                        turkuler: veri.turkuler,
                        birlik: { uyeSiniri: veri.birlik.uyeSiniri },
                      },
                      "Bina bedelleri, Ozan Dede türküleri, Haberci görevleri ve birlik ayarı kaydedildi!"
                    )
                  }
                  className="varak-dugme rounded-xl px-4 py-2 text-xs font-black disabled:opacity-50"
                >
                  💾 Genel Ayarları Kaydet
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(veri.binalar).map(([binaId, b]) => {
                  const baslangic = (b.baslangicSeviye ?? 0) + 1;
                  return (
                    <div key={binaId} className="rounded-2xl bg-stone-950 p-4 ring-1 ring-stone-800 space-y-2.5">
                      <h3 className="text-sm font-black text-amber-200">{b.ad}</h3>
                      {Array.from({ length: b.maksSeviye - baslangic + 1 }, (_, i) => baslangic + i).map((seviye) => {
                        const bedel = b.bedel?.[seviye] ?? {};
                        const acilis = b.acilis?.[seviye] ?? 1;
                        return (
                          <div key={seviye} className="grid grid-cols-3 items-end gap-2 text-xs sm:grid-cols-6">
                            <span className="font-bold text-amber-100">Seviye {seviye}</span>
                            <label className="block">
                              <span className="block text-[10px] text-amber-300/70">Açılış Lv</span>
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={acilis}
                                onChange={(e) => {
                                  const deger = Number(e.target.value);
                                  setVeri((eski) => ({
                                    ...eski,
                                    binalar: {
                                      ...eski.binalar,
                                      [binaId]: {
                                        ...eski.binalar[binaId],
                                        acilis: { ...eski.binalar[binaId].acilis, [seviye]: deger },
                                      },
                                    },
                                  }));
                                }}
                                className="w-full rounded-lg bg-stone-900 px-2 py-1 text-amber-50 ring-1 ring-stone-700"
                              />
                            </label>
                            {Object.entries(KAYNAKLAR).map(([k, kt]) => (
                              <label key={k} className="block">
                                <span className="block text-[10px] leading-tight text-amber-300/70">
                                  {kt.ikon} {k === "insan" ? "En az nüfus şartı (harcanmaz)" : kt.ad}
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  step={k === "insan" ? 1 : 25}
                                  value={bedel[k] ?? 0}
                                  onChange={(e) => {
                                    const deger = Number(e.target.value);
                                    setVeri((eski) => ({
                                      ...eski,
                                      binalar: {
                                        ...eski.binalar,
                                        [binaId]: {
                                          ...eski.binalar[binaId],
                                          bedel: {
                                            ...eski.binalar[binaId].bedel,
                                            [seviye]: { ...(eski.binalar[binaId].bedel?.[seviye] ?? {}), [k]: deger },
                                          },
                                        },
                                      },
                                    }));
                                  }}
                                  className="w-full rounded-lg bg-stone-900 px-2 py-1 text-amber-50 ring-1 ring-stone-700"
                                />
                              </label>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl bg-stone-900/90 p-5 ring-1 ring-stone-800 space-y-3">
              <h2 className="text-base font-black text-amber-300">🤝 Birlik Ayarı</h2>
              <label className="flex flex-wrap items-center gap-3 text-xs text-amber-100">
                <span className="font-bold">Bir birlikte en fazla kaç öğrenci olabilir?</span>
                <input
                  type="number"
                  min={veri.birlik.en_az}
                  max={veri.birlik.en_cok}
                  value={veri.birlik.uyeSiniri}
                  onChange={(e) => setVeri((eski) => ({ ...eski, birlik: { ...eski.birlik, uyeSiniri: Number(e.target.value) } }))}
                  className="w-20 rounded-lg bg-stone-950 px-2.5 py-1.5 text-amber-50 ring-1 ring-stone-700"
                />
                <span className="text-amber-200/70">({veri.birlik.en_az} ile {veri.birlik.en_cok} arası; &quot;Genel Ayarları Kaydet&quot; ile geçerli olur)</span>
              </label>
              <div className="pt-1">
                <OnayliSil
                  etiket="↩️ Bina Bedellerini Varsayılana Döndür"
                  soru="Tüm bina bedelleri ve açılış levelları oyunun hazır ayarlarına dönsün mü?"
                  onayEtiketi="Evet, döndür"
                  disabled={kaydediyor}
                  sinif="rounded-xl bg-stone-800 px-3 py-2 text-xs font-bold text-amber-200 ring-1 ring-stone-600 hover:bg-stone-700 disabled:opacity-50"
                  onOnay={() => gonder({ islem: "binalariSifirla" }, "Bina bedelleri varsayılan ayarlara döndü.")}
                />
                {!veri.binaOzellestirilmis && <span className="ml-2 text-[11px] text-amber-200/60">Şu an zaten hazır ayarlar kullanılıyor.</span>}
              </div>
            </section>

            {/* Kıraathane Ozan Dede Türkü Hikâyeleri */}
            <section className="rounded-3xl bg-stone-900/90 p-5 ring-1 ring-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-amber-300">
                    🎵 Kıraathane · Ozan Dede Türkü Hikâyeleri ve Seslendirme ({(veri.turkuler ?? []).length})
                  </h2>
                  <p className="text-xs text-amber-200/70">
                    Metni ve MP3/ses URL&apos;sini girdiğinizde Ozan Dede ağzını oynatarak türkünün tarihini anlatır ve ödevi verir
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setVeri((eski) => ({
                      ...eski,
                      turkuler: [
                        ...(eski.turkuler ?? []),
                        {
                          id: `turku_${Date.now()}`,
                          level: 1,
                          baslik: "Yeni Türkü Hikâyesi",
                          turkuAdi: "Türkü Adı",
                          anlatim: "",
                          sesUrl: "",
                          odev: "",
                        },
                      ],
                    }))
                  }
                  className="varak-dugme rounded-lg px-3 py-1.5 text-xs font-black"
                >
                  + Türkü Hikâyesi Ekle
                </button>
              </div>

              <div className="space-y-3">
                {(veri.turkuler ?? []).map((t, i) => (
                  <div key={t.id ?? i} className="rounded-2xl bg-stone-950 p-4 ring-1 ring-stone-800 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input
                        value={t.baslik ?? ""}
                        onChange={(e) => {
                          const yeni = veri.turkuler.map((x, idx) =>
                            idx === i ? { ...x, baslik: e.target.value } : x
                          );
                          setVeri((eski) => ({ ...eski, turkuler: yeni }));
                        }}
                        placeholder="Hikâye Başlığı"
                        className="rounded-xl bg-stone-900 px-3 py-1.5 text-xs text-amber-50 ring-1 ring-stone-700"
                      />
                      <input
                        value={t.turkuAdi ?? ""}
                        onChange={(e) => {
                          const yeni = veri.turkuler.map((x, idx) =>
                            idx === i ? { ...x, turkuAdi: e.target.value } : x
                          );
                          setVeri((eski) => ({ ...eski, turkuler: yeni }));
                        }}
                        placeholder="Türkü Adı / Dizesi"
                        className="rounded-xl bg-stone-900 px-3 py-1.5 text-xs text-amber-50 ring-1 ring-stone-700"
                      />
                      <div className="flex gap-2">
                        <input
                          value={t.sesUrl ?? ""}
                          onChange={(e) => {
                            const yeni = veri.turkuler.map((x, idx) =>
                              idx === i ? { ...x, sesUrl: e.target.value } : x
                            );
                            setVeri((eski) => ({ ...eski, turkuler: yeni }));
                          }}
                          placeholder="Seslendirme adresi (boşsa tarayıcının Türkçe sesi)"
                          className="flex-1 rounded-xl bg-stone-900 px-3 py-1.5 text-xs text-amber-50 ring-1 ring-stone-700"
                        />
                        <SesYukle
                          onYuklendi={(url) =>
                            setVeri((eski) => ({
                              ...eski,
                              turkuler: eski.turkuler.map((x, idx) => (idx === i ? { ...x, sesUrl: url } : x)),
                            }))
                          }
                        />
                        <OnayliSil
                          soru="Türkü silinsin mi?"
                          onOnay={() =>
                            setVeri((eski) => ({
                              ...eski,
                              turkuler: eski.turkuler.filter((_, idx) => idx !== i),
                            }))
                          }
                        />
                      </div>
                      {t.sesUrl && (
                        <audio controls preload="none" src={t.sesUrl} className="h-9 w-full" aria-label="Seslendirmeyi dinle" />
                      )}
                    </div>
                    <textarea
                      rows={2}
                      value={t.anlatim ?? ""}
                      onChange={(e) => {
                        const yeni = veri.turkuler.map((x, idx) =>
                          idx === i ? { ...x, anlatim: e.target.value } : x
                        );
                        setVeri((eski) => ({ ...eski, turkuler: yeni }));
                      }}
                      placeholder="Ozan Dede'nin anlatacağı türkü tarihi ve hikmetli kıssa…"
                      className="w-full rounded-xl bg-stone-900 px-3 py-2 text-xs text-amber-50 ring-1 ring-stone-700"
                    />
                    <input
                      value={t.odev ?? ""}
                      onChange={(e) => {
                        const yeni = veri.turkuler.map((x, idx) =>
                          idx === i ? { ...x, odev: e.target.value } : x
                        );
                        setVeri((eski) => ({ ...eski, turkuler: yeni }));
                      }}
                      placeholder="Ozan Dede'nin öğrenciye vereceği gönül ödevi…"
                      className="w-full rounded-xl bg-stone-900 px-3 py-1.5 text-xs text-amber-50 ring-1 ring-stone-700"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Haberci Görevleri */}
            <section className="rounded-3xl bg-stone-900/90 p-5 ring-1 ring-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-amber-300">
                  📜 Haberci Günlük İyilik Görevleri Havuzu ({veri.seyyahGorevleri.length})
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setVeri((eski) => ({ ...eski, seyyahGorevleri: [...eski.seyyahGorevleri, ""] }))
                  }
                  className="varak-dugme rounded-lg px-3 py-1.5 text-xs font-black"
                >
                  + Haberci Görevi Ekle
                </button>
              </div>

              <div className="space-y-2">
                {veri.seyyahGorevleri.map((metin, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={metin}
                      onChange={(e) => {
                        const yeni = veri.seyyahGorevleri.map((m, idx) => (idx === i ? e.target.value : m));
                        setVeri((eski) => ({ ...eski, seyyahGorevleri: yeni }));
                      }}
                      placeholder="Günlük sürpriz iyilik görevi metni…"
                      className="flex-1 rounded-xl bg-stone-950 px-3 py-2 text-xs text-amber-50 ring-1 ring-stone-800"
                    />
                    <OnayliSil
                      soru="Görev silinsin mi?"
                      onOnay={() =>
                        setVeri((eski) => ({
                          ...eski,
                          seyyahGorevleri: eski.seyyahGorevleri.filter((_, idx) => idx !== i),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* SEKME: SINIF DURUMU */}
        {anaSekme === "sinif" && <SinifDurumu veri={veri} />}

        {/* SEKME: ÇINAR ALTI MODERASYON */}
        {anaSekme === "moderasyon" && (
          <Moderasyon
            liste={veri.moderasyon}
            kaydediyor={kaydediyor}
            karar={(paylasimId, karar, mesaj) => gonder({ islem: "moderasyon", paylasimId, karar }, mesaj)}
          />
        )}

        {/* SEKME: BİLDİRİM GÖNDER */}
        {anaSekme === "bildirim" && <BildirimGonder />}

        {/* SEKME 3: KULLANICILAR */}
        {anaSekme === "kullanicilar" && (
          <section className="rounded-3xl bg-stone-900/90 p-5 ring-1 ring-stone-800 space-y-3">
            <h2 className="text-base font-black text-amber-300">👥 Kayıtlı Kullanıcılar ({veri.kullanicilar.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-800 text-amber-300/80">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Ad Soyad</th>
                    <th className="py-2 pr-3">Kullanıcı Adı</th>
                    <th className="py-2 pr-3">Level</th>
                    <th className="py-2 pr-3">Rol</th>
                    <th className="py-2">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/70">
                  {veri.kullanicilar.map((u) => (
                    <KullaniciSatiri
                      key={u.id}
                      u={u}
                      kaydet={(rol, level) =>
                        gonder(
                          { islem: "kullaniciGuncelle", kullaniciId: u.id, rol, level },
                          `${u.ad} güncellendi`
                        )
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function SinifDurumu({ veri }) {
  const [sadeceGeride, setSadeceGeride] = useState(false);
  const simdi = veri.simdi;
  const satirlar = veri.sinif.map((o) => {
    const sonIs = o.sonEtkinlik ?? 0;
    const hareketsizGun = sonIs ? Math.floor((simdi - sonIs) / GUN_MS) : null;
    let durum = "iyi";
    let neden = "Düzenli ilerliyor";
    if (!sonIs) {
      durum = "geride";
      neden = "Henüz hiç görev yapmadı";
    } else if (hareketsizGun >= 3) {
      durum = "geride";
      neden = `${hareketsizGun} gündür görev yapmadı`;
    } else if (o.haftaGorev === 0) {
      durum = "dikkat";
      neden = "Bu hafta görev tamamlamadı";
    }
    return { ...o, durum, neden, sonIs };
  });
  const sira = { geride: 0, dikkat: 1, iyi: 2 };
  const gorunen = satirlar
    .filter((o) => !sadeceGeride || o.durum !== "iyi")
    .sort((a, b) => sira[a.durum] - sira[b.durum] || a.sonIs - b.sonIs);
  const geridekiler = satirlar.filter((o) => o.durum === "geride").length;
  const dikkatler = satirlar.filter((o) => o.durum === "dikkat").length;

  return (
    <section className="space-y-3 rounded-3xl bg-stone-900/90 p-5 ring-1 ring-stone-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-black text-amber-300">🧑‍🎓 Sınıf Durumu</h2>
          <p className="text-xs text-amber-200/70">
            {geridekiler} öğrenci geride, {dikkatler} öğrenci dikkat istiyor, toplam {satirlar.length} öğrenci. Geride kalanlar en üstte görünür.
          </p>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-amber-100">
          <input type="checkbox" checked={sadeceGeride} onChange={(e) => setSadeceGeride(e.target.checked)} className="accent-amber-400" />
          Yalnızca ilgi gerekenleri göster
        </label>
      </div>
      {gorunen.length === 0 ? (
        <p className="rounded-xl bg-stone-950 p-4 text-center text-xs text-amber-200/70">
          {satirlar.length === 0 ? "Henüz kayıtlı öğrenci yok." : "Herkes düzenli ilerliyor. 🎉"}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-800 text-amber-300/80">
                <th className="py-2 pr-3">Öğrenci</th>
                <th className="py-2 pr-3">Level</th>
                <th className="py-2 pr-3">Son görev etkinliği</th>
                <th className="py-2 pr-3">Bu hafta tamamlanan görev</th>
                <th className="py-2 pr-3">Bu levelın görevleri</th>
                <th className="py-2 pr-3">Birlik</th>
                <th className="py-2">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/70">
              {gorunen.map((o) => (
                <tr key={o.id}>
                  <td className="py-2.5 pr-3">
                    <b className="text-amber-100">{o.ad}</b>
                    <span className="block text-[11px] text-amber-200/60">@{o.kullaniciAdi}</span>
                  </td>
                  <td className="py-2.5 pr-3 font-bold text-amber-100">Lv.{o.level}</td>
                  <td className="py-2.5 pr-3 text-amber-100">
                    {gecenSure(o.sonIs, simdi)}
                    {o.sonGiris && <span className="block text-[11px] text-amber-200/60">Son giriş: {gecenSure(o.sonGiris, simdi)}</span>}
                  </td>
                  <td className="py-2.5 pr-3 font-bold text-amber-100">{o.haftaGorev}</td>
                  <td className="py-2.5 pr-3 text-amber-100">
                    {o.levelGorevTamam}/{o.levelGorevToplam}
                  </td>
                  <td className="py-2.5 pr-3 text-amber-200/80">{o.birlik ?? "—"}</td>
                  <td className="py-2.5">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        o.durum === "geride"
                          ? "bg-red-900/80 text-red-100"
                          : o.durum === "dikkat"
                            ? "bg-amber-800/70 text-amber-100"
                            : "bg-emerald-900/70 text-emerald-100"
                      }`}
                    >
                      {o.durum === "geride" ? "Geride" : o.durum === "dikkat" ? "Dikkat" : "İyi"}: {o.neden}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-amber-200/60">
        &quot;Bu hafta&quot; son 7 günü (bugün dahil) anlatır. Etkinlik, öğrencinin görev ve namaz çetelesi kayıtlarından alınır.
      </p>
    </section>
  );
}

function Moderasyon({ liste, kaydediyor, karar }) {
  const bekleyenler = liste.filter((m) => m.bekleyen > 0);
  const gizliler = liste.filter((m) => m.gizli && m.bekleyen === 0);
  const tarih = (ms) => new Date(ms).toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

  const Kart = ({ m }) => (
    <div className="space-y-2 rounded-2xl bg-stone-950 p-3.5 ring-1 ring-stone-800">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-amber-200">
          <b>{m.yazar}</b> <span className="text-amber-200/60">@{m.yazarKullanici} · {tarih(m.olusturma)}</span>
        </span>
        <span className="flex gap-1.5">
          {m.bekleyen > 0 && <span className="rounded-full bg-red-900/80 px-2 py-0.5 text-[11px] font-bold text-red-100">{m.bekleyen} şikâyet</span>}
          {m.gizli && <span className="rounded-full bg-stone-700 px-2 py-0.5 text-[11px] font-bold text-stone-100">Akıştan kaldırıldı</span>}
        </span>
      </div>
      <p className="whitespace-pre-wrap break-words rounded-xl bg-stone-900 p-2.5 text-xs text-amber-50">{m.metin}</p>
      {m.medya && <p className="break-all text-[11px] text-amber-200/70">Bağlantı: {m.medya}</p>}
      {m.sebepler && <p className="text-[11px] text-amber-200/70">Şikâyet sebepleri: {m.sebepler}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {(!m.gizli || m.bekleyen > 0) && (
          <button
            type="button"
            disabled={kaydediyor}
            onClick={() => karar(m.id, "gizle", "Paylaşım akıştan kaldırıldı, şikâyetler kapatıldı.")}
            className="varak-dugme rounded-lg px-3 py-1.5 text-xs font-black disabled:opacity-50"
          >
            {m.gizli ? "Kaldırılmış Kalsın (Şikâyetleri Kapat)" : "Akıştan Kaldır"}
          </button>
        )}
        {m.gizli && (
          <button
            type="button"
            disabled={kaydediyor}
            onClick={() => karar(m.id, m.bekleyen > 0 ? "yayinda" : "geriAc", "Paylaşım yeniden yayında.")}
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
          >
            Yeniden Yayına Al
          </button>
        )}
        {m.bekleyen > 0 && !m.gizli && (
          <button
            type="button"
            disabled={kaydediyor}
            onClick={() => karar(m.id, "yayinda", "Şikâyetler kapatıldı, paylaşım yayında kalıyor.")}
            className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-bold text-amber-100 ring-1 ring-stone-600 disabled:opacity-50"
          >
            Sorun Yok, Şikâyeti Kapat
          </button>
        )}
        <OnayliSil
          etiket="Kalıcı Sil"
          soru="Paylaşım ve yorumları tamamen silinsin mi?"
          onOnay={() => karar(m.id, "sil", "Paylaşım silindi.")}
          disabled={kaydediyor}
        />
      </div>
    </div>
  );

  return (
    <section className="space-y-4 rounded-3xl bg-stone-900/90 p-5 ring-1 ring-stone-800">
      <div>
        <h2 className="text-base font-black text-amber-300">🚩 Çınar Altı Moderasyon</h2>
        <p className="text-xs text-amber-200/70">
          Öğrencilerin şikâyet ettiği paylaşımlar burada toplanır. 3 farklı öğrenci şikâyet ederse paylaşım kendiliğinden akıştan kalkar; kararı siz verirsiniz.
        </p>
      </div>
      <div className="space-y-2.5">
        <h3 className="text-sm font-black text-amber-200">İncelenmeyi bekleyenler ({bekleyenler.length})</h3>
        {bekleyenler.length === 0 ? (
          <p className="rounded-xl bg-stone-950 p-4 text-center text-xs text-amber-200/70">Bekleyen şikâyet yok. 🌿</p>
        ) : (
          bekleyenler.map((m) => <Kart key={m.id} m={m} />)
        )}
      </div>
      {gizliler.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-sm font-black text-amber-200">Akıştan kaldırılmış paylaşımlar ({gizliler.length})</h3>
          {gizliler.map((m) => (
            <Kart key={m.id} m={m} />
          ))}
        </div>
      )}
    </section>
  );
}

function KullaniciSatiri({ u, kaydet }) {
  const [rol, setRol] = useState(u.rol);
  const [level, setLevel] = useState(u.level);
  const [onayBekliyor, setOnayBekliyor] = useState(false);
  const degisti = rol !== u.rol || Number(level) !== Number(u.level);
  // Rol değişimi ya da level düşürme geri alması zahmetli işlemlerdir: önce satır içi onay istenir
  const onayGerekli = rol !== u.rol || Number(level) < Number(u.level);

  return (
    <tr>
      <td className="py-2.5 pr-3 text-stone-400">{u.id}</td>
      <td className="py-2.5 pr-3 font-bold text-amber-100">{u.ad}</td>
      <td className="py-2.5 pr-3 text-amber-200/70">@{u.kullanici_adi}</td>
      <td className="py-2.5 pr-3">
        <select
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          className="rounded-lg bg-stone-950 px-2 py-1 text-amber-50 ring-1 ring-stone-700"
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              Lv.{n}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2.5 pr-3">
        <select
          value={rol}
          onChange={(e) => setRol(e.target.value)}
          className="rounded-lg bg-stone-950 px-2 py-1 text-amber-50 ring-1 ring-stone-700"
        >
          <option value="ogrenci">Öğrenci</option>
          <option value="rehber">Rehber</option>
          <option value="admin">Admin</option>
        </select>
      </td>
      <td className="py-2.5">
        {onayBekliyor ? (
          <span className="inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-red-950/80 px-2 py-1 ring-1 ring-red-400/50">
            <span className="text-xs font-bold text-red-100">
              {rol !== u.rol ? "Rol değişsin mi?" : "Level düşürülsün mü?"}
            </span>
            <button
              type="button"
              onClick={() => {
                setOnayBekliyor(false);
                kaydet(rol, level);
              }}
              className="rounded-md bg-red-600 px-2 py-1 text-xs font-black text-white"
            >
              Evet
            </button>
            <button type="button" onClick={() => setOnayBekliyor(false)} className="rounded-md bg-stone-800 px-2 py-1 text-xs text-stone-200">
              Vazgeç
            </button>
          </span>
        ) : (
          <button
            type="button"
            disabled={!degisti}
            onClick={() => (onayGerekli ? setOnayBekliyor(true) : kaydet(rol, level))}
            className="varak-dugme rounded-lg px-3 py-1 font-bold disabled:opacity-40"
          >
            Kaydet
          </button>
        )}
      </td>
    </tr>
  );
}

/** Ozan Dede seslendirmesi gibi bir ses dosyasını depoya yükler, çalınabilir adresini verir */
function SesYukle({ onYuklendi }) {
  const [durum, setDurum] = useState(null); // null | "yukleniyor" | hata metni
  return (
    <label
      className={`shrink-0 cursor-pointer rounded-xl px-3 py-1.5 text-xs font-black ring-1 ${
        durum === "yukleniyor" ? "bg-stone-800 text-stone-400 ring-stone-700" : "bg-emerald-700 text-white ring-emerald-400/50 hover:bg-emerald-600"
      }`}
      title={typeof durum === "string" && durum !== "yukleniyor" ? durum : "MP3 seslendirme yükle"}
    >
      {durum === "yukleniyor" ? "Yükleniyor…" : typeof durum === "string" ? "⚠️ Tekrar dene" : "🎙️ MP3 yükle"}
      <input
        type="file"
        accept="audio/*,.mp3,.m4a"
        className="sr-only"
        disabled={durum === "yukleniyor"}
        onChange={async (e) => {
          const dosya = e.target.files?.[0];
          e.target.value = "";
          if (!dosya) return;
          setDurum("yukleniyor");
          try {
            const form = new FormData();
            form.append("dosya", dosya);
            const r = await fetch("/api/admin/ses", { method: "POST", body: form });
            const j = await r.json().catch(() => ({}));
            if (!r.ok || !j.url) throw new Error(j.hata || "Yüklenemedi");
            onYuklendi(j.url);
            setDurum(null);
          } catch (err) {
            setDurum(err.message || "Yüklenemedi");
          }
        }}
      />
    </label>
  );
}
