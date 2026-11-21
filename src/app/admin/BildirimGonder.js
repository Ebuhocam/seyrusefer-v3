"use client";
import { useEffect, useMemo, useState } from "react";

// Yönetim paneli: istediğin öğrencilere anlık bildirim gönder.
export default function BildirimGonder() {
  const [ogrenciler, setOgrenciler] = useState(null);
  const [ara, setAra] = useState("");
  const [secili, setSecili] = useState(new Set());
  const [baslik, setBaslik] = useState("Seyrüsefer");
  const [metin, setMetin] = useState("");
  const [sonuc, setSonuc] = useState(null);
  const [hata, setHata] = useState(null);
  const [gonderiyor, setGonderiyor] = useState(false);

  useEffect(() => {
    fetch("/api/admin/bildirim")
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.hata ?? "Liste alınamadı.");
        setOgrenciler(j.ogrenciler);
      })
      .catch((e) => setHata(e.message));
  }, []);

  const gorunen = useMemo(() => {
    const q = ara.trim().toLowerCase();
    return (ogrenciler ?? []).filter((o) => !q || o.ad.toLowerCase().includes(q) || o.kullaniciAdi.includes(q));
  }, [ogrenciler, ara]);

  const acikSayisi = (ogrenciler ?? []).filter((o) => o.cihaz > 0).length;
  const degistir = (id) =>
    setSecili((s) => {
      const y = new Set(s);
      if (y.has(id)) y.delete(id);
      else y.add(id);
      return y;
    });

  const gonder = async (hepsi) => {
    setHata(null);
    setSonuc(null);
    setGonderiyor(true);
    try {
      const r = await fetch("/api/admin/bildirim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baslik, metin, hepsi, kullaniciIdleri: [...secili] }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setHata(j.hata ?? "Gönderilemedi.");
      setSonuc(`✅ ${j.gonderilen} cihaza gönderildi${j.basarisiz ? `, ${j.basarisiz} cihaza ulaşılamadı` : ""}${j.silinen ? `, ${j.silinen} eski cihaz temizlendi` : ""}.`);
      // Temizlenen cihazlar listede de güncellensin
      const l = await fetch("/api/admin/bildirim").then((x) => x.json()).catch(() => null);
      if (l?.ogrenciler) setOgrenciler(l.ogrenciler);
    } catch {
      setHata("Sunucuya ulaşılamadı.");
    } finally {
      setGonderiyor(false);
    }
  };

  const girdi =
    "w-full rounded-xl bg-stone-950/80 px-3.5 py-2.5 text-sm text-amber-50 ring-1 ring-amber-500/25 placeholder:text-stone-400 focus:ring-2 focus:ring-amber-400 focus:outline-none";

  return (
    <section className="space-y-4 rounded-3xl bg-stone-900/90 p-5 ring-1 ring-stone-800">
      <h2 className="text-base font-black text-amber-300">🔔 Bildirim Gönder</h2>
      <p className="text-xs text-amber-100/80">
        Bildirimi açmış öğrenciler: <b>{acikSayisi}</b> / {ogrenciler?.length ?? "…"}. Bildirimi kapalı olanlara gönderilemez.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-amber-200/80">Başlık</span>
          <input value={baslik} onChange={(e) => setBaslik(e.target.value)} maxLength={60} className={girdi} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-bold text-amber-200/80">Mesaj ({metin.length}/240)</span>
          <textarea value={metin} onChange={(e) => setMetin(e.target.value)} maxLength={240} rows={3} placeholder="Örn: Yarınki sınav için köyündeki Medrese görevini tamamlamayı unutma!" className={girdi} />
        </label>
      </div>

      <div className="space-y-2">
        <input value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Öğrenci ara (ad veya kullanıcı adı)" className={girdi} />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button type="button" onClick={() => setSecili(new Set(gorunen.filter((o) => o.cihaz > 0).map((o) => o.id)))} className="rounded-lg bg-stone-800 px-3 py-1.5 font-bold text-amber-100 hover:bg-stone-700">
            Görünen (bildirimi açık) hepsini seç
          </button>
          <button type="button" onClick={() => setSecili(new Set())} className="rounded-lg bg-stone-800 px-3 py-1.5 font-bold text-amber-100 hover:bg-stone-700">
            Seçimi temizle
          </button>
          <span className="text-amber-300/80">{secili.size} öğrenci seçili</span>
        </div>
        <div className="max-h-72 overflow-y-auto rounded-xl ring-1 ring-stone-800">
          {ogrenciler === null && !hata && <p className="p-3 text-xs text-stone-400">Yükleniyor…</p>}
          {gorunen.map((o) => (
            <label
              key={o.id}
              className={`flex items-center gap-3 border-b border-stone-800/70 px-3 py-2 text-xs ${o.cihaz > 0 ? "cursor-pointer hover:bg-stone-800/60" : "opacity-50"}`}
            >
              <input
                type="checkbox"
                disabled={o.cihaz === 0}
                checked={secili.has(o.id)}
                onChange={() => degistir(o.id)}
                className="h-4 w-4 accent-amber-400"
              />
              <span className="flex-1 font-bold text-amber-100">{o.ad}</span>
              <span className="text-stone-400">@{o.kullaniciAdi}</span>
              <span className={o.cihaz > 0 ? "text-emerald-300" : "text-stone-500"}>{o.cihaz > 0 ? `🔔 ${o.cihaz} cihaz` : "🔕 kapalı"}</span>
            </label>
          ))}
        </div>
      </div>

      {hata && <p className="rounded-xl bg-red-950/70 px-3 py-2 text-xs font-semibold text-red-200 ring-1 ring-red-500/40">{hata}</p>}
      {sonuc && <p className="rounded-xl bg-emerald-950/60 px-3 py-2 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/40">{sonuc}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={gonderiyor || secili.size === 0 || metin.trim().length < 2}
          onClick={() => gonder(false)}
          className="varak-dugme rounded-xl px-4 py-2.5 text-xs font-black disabled:opacity-50"
        >
          {gonderiyor ? "Gönderiliyor…" : `📤 Seçilen ${secili.size} öğrenciye gönder`}
        </button>
        <button
          type="button"
          disabled={gonderiyor || acikSayisi === 0 || metin.trim().length < 2}
          onClick={() => gonder(true)}
          className="rounded-xl bg-stone-800 px-4 py-2.5 text-xs font-black text-amber-100 ring-1 ring-stone-700 hover:bg-stone-700 disabled:opacity-50"
        >
          📣 Bildirimi açan herkese gönder
        </button>
      </div>
    </section>
  );
}
