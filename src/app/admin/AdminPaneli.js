"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BINALAR, KAYNAKLAR } from "@/lib/oyun/sabitler";
import { GOREV_TURLERI } from "@/lib/oyun/gorevler";

export default function AdminPaneli() {
  const [veri, setVeri] = useState(null);
  const [anaSekme, setAnaSekme] = useState("levellar"); // 'levellar' | 'binalar' | 'kullanicilar'
  const [seciliLevel, setSeciliLevel] = useState(1);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [bildirim, setBildirim] = useState(null);

  useEffect(() => {
    fetch("/api/admin")
      .then((r) => r.json())
      .then((j) => setVeri(j));
  }, []);

  useEffect(() => {
    if (!bildirim) return;
    const t = setTimeout(() => setBildirim(null), 3000);
    return () => clearTimeout(t);
  }, [bildirim]);

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
      const j = await r.json();
      if (!r.ok) {
        setBildirim({ tur: "hata", metin: j.hata ?? "Kaydedilemedi" });
        return;
      }
      setVeri(j);
      setBildirim({ tur: "tamam", metin: mesaj });
    } catch {
      setBildirim({ tur: "hata", metin: "Sunucuya ulaşılamadı" });
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
            {bildirim && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  bildirim.tur === "hata" ? "bg-red-700 text-white" : "bg-emerald-600 text-white"
                }`}
              >
                {bildirim.metin}
              </span>
            )}
            <Link
              href="/"
              className="rounded-xl bg-stone-800 px-3.5 py-2 text-xs font-black text-amber-200 ring-1 ring-amber-500/40 hover:bg-stone-700"
            >
              ← Köy Haritasına Dön
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl p-4 space-y-6">
        {/* Ana Sekmeler */}
        <div className="flex flex-wrap gap-2 rounded-2xl bg-stone-900 p-1.5 ring-1 ring-stone-800">
          {[
            { kod: "levellar", ad: "📜 Level & Görev Tasarım Merkezi (1-10)" },
            { kod: "binalar", ad: "🏛️ Bina Bedelleri & Seyyah Görevleri" },
            { kod: "kullanicilar", ad: `👥 Öğrenciler & Roller (${veri.kullanicilar.length})` },
          ].map((s) => (
            <button
              key={s.kod}
              type="button"
              onClick={() => setAnaSekme(s.kod)}
              className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                anaSekme === s.kod ? "bg-amber-500 text-stone-900" : "text-amber-200/70 hover:bg-stone-800"
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
                      ? "bg-amber-400 text-stone-900 ring-amber-300 shadow-lg"
                      : "bg-stone-900 text-amber-100/80 ring-stone-800 hover:bg-stone-800"
                  }`}
                >
                  Lv.{l.no} · {l.gundem}
                </button>
              ))}
            </div>

            {/* 1. Gündem ve Hedef Binalar */}
            <section className="rounded-3xl bg-stone-900/90 p-5 ring-1 ring-stone-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-black text-amber-300">
                  1. Level {lv.no} Gündemi ve Bina Hedefleri
                </h2>
                <button
                  type="button"
                  disabled={kaydediyor}
                  onClick={() =>
                    gonder({ islem: "levelKaydet", levelNo: lv.no, veri: lv }, `Level ${lv.no} tasarımı kaydedildi!`)
                  }
                  className="rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-2 text-xs font-black text-white shadow-lg disabled:opacity-50"
                >
                  💾 Level {lv.no} Tasarımını Kaydet
                </button>
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
                  className="rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-black text-stone-900"
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
                        <button
                          type="button"
                          onClick={() =>
                            levelAlanGuncelle(
                              "gorevler",
                              lv.gorevler.filter((_, i) => i !== idx)
                            )
                          }
                          className="rounded-lg bg-red-950/70 px-2.5 py-1 text-xs font-bold text-red-300 hover:bg-red-900"
                        >
                          Sil
                        </button>
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
                    className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-black text-stone-900"
                  >
                    + Hadis Ekle
                  </button>
                </div>

                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {lv.icerik.hadisler.map((h, i) => (
                    <div key={i} className="space-y-1.5 rounded-2xl bg-stone-950 p-3 ring-1 ring-stone-800">
                      <div className="flex items-center justify-between text-xs">
                        <b className="text-amber-200">{i + 1}. Gün Hadisi</b>
                        <button
                          type="button"
                          onClick={() =>
                            icerikGuncelle(
                              "hadisler",
                              lv.icerik.hadisler.filter((_, idx) => idx !== i)
                            )
                          }
                          className="text-red-300 hover:underline"
                        >
                          Sil
                        </button>
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
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={lv.icerik.video?.url ?? ""}
                      onChange={(e) => icerikGuncelle("video", { ...lv.icerik.video, url: e.target.value })}
                      placeholder="Video dosyası URL (.mp4, isteğe bağlı)"
                      className="col-span-2 rounded-xl bg-stone-950 px-3 py-2 text-xs text-amber-50 ring-1 ring-stone-700"
                    />
                    <input
                      type="number"
                      min={5}
                      value={lv.icerik.video?.sureSn ?? 15}
                      onChange={(e) =>
                        icerikGuncelle("video", { ...lv.icerik.video, sureSn: Number(e.target.value) })
                      }
                      placeholder="Süre (sn)"
                      className="rounded-xl bg-stone-950 px-3 py-2 text-xs text-amber-50 ring-1 ring-stone-700"
                    />
                  </div>
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
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black text-stone-900"
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
                    <button
                      type="button"
                      onClick={() =>
                        icerikGuncelle(
                          "sinav",
                          lv.icerik.sinav.filter((_, idx) => idx !== sIdx)
                        )
                      }
                      className="rounded-lg bg-red-950/70 px-2.5 py-1 text-xs font-bold text-red-300"
                    >
                      Sil
                    </button>
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
                  className="rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 px-6 py-2.5 text-sm font-black text-white shadow-lg disabled:opacity-50"
                >
                  💾 Level {lv.no} Tüm Değişiklikleri Kaydet
                </button>
              </div>
            </section>
          </div>
        )}

        {/* SEKME 2: BİNA KAYNAK BEDELLERİ & SEYYAH */}
        {anaSekme === "binalar" && (
          <div className="space-y-6">
            <section className="rounded-3xl bg-stone-900/90 p-5 ring-1 ring-stone-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-amber-300">🏛️ Bina Açılış Levelları ve Kaynak Bedelleri</h2>
                  <p className="text-xs text-amber-200/70">Her bina seviyesinin açılış levelı ve Erzak / Kereste / Taş bedeli</p>
                </div>
                <button
                  type="button"
                  disabled={kaydediyor}
                  onClick={() =>
                    gonder(
                      { islem: "genelKaydet", binalar: veri.binalar, seyyahGorevleri: veri.seyyahGorevleri },
                      "Bina bedelleri ve Seyyah görevleri kaydedildi!"
                    )
                  }
                  className="rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-2 text-xs font-black text-white shadow-lg"
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
                          <div key={seviye} className="grid grid-cols-5 gap-2 items-center text-xs">
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
                                <span className="block text-[10px] text-amber-300/70">
                                  {kt.ikon} {kt.ad}
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  step={25}
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

            {/* Seyyah Görevleri */}
            <section className="rounded-3xl bg-stone-900/90 p-5 ring-1 ring-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-amber-300">
                  🏇 Seyyah Günlük İyilik Görevleri Havuzu ({veri.seyyahGorevleri.length})
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setVeri((eski) => ({ ...eski, seyyahGorevleri: [...eski.seyyahGorevleri, ""] }))
                  }
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black text-stone-900"
                >
                  + Seyyah Görevi Ekle
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
                    <button
                      type="button"
                      onClick={() =>
                        setVeri((eski) => ({
                          ...eski,
                          seyyahGorevleri: eski.seyyahGorevleri.filter((_, idx) => idx !== i),
                        }))
                      }
                      className="rounded-xl bg-red-950/70 px-3 py-2 text-xs font-bold text-red-300"
                    >
                      Sil
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

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

function KullaniciSatiri({ u, kaydet }) {
  const [rol, setRol] = useState(u.rol);
  const [level, setLevel] = useState(u.level);
  const degisti = rol !== u.rol || Number(level) !== Number(u.level);

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
        <button
          type="button"
          disabled={!degisti}
          onClick={() => kaydet(rol, level)}
          className="rounded-lg bg-emerald-600 px-3 py-1 font-bold text-white disabled:bg-stone-800 disabled:text-stone-500"
        >
          Kaydet
        </button>
      </td>
    </tr>
  );
}
