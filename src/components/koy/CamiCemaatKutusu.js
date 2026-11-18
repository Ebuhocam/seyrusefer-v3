"use client";
import { useEffect, useState } from "react";

/** Ulu Cami: birlik kardeşlerinin bugünkü namaz çetelesi (kim kaç vakit kıldı) ve birliğin ortak toplamı */
export default function CamiCemaatKutusu({ yenile = 0 }) {
  const [veri, setVeri] = useState(null);
  const [hataMetni, setHataMetni] = useState("");

  useEffect(() => {
    let iptal = false;
    fetch("/api/birlik", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!iptal) setVeri(j);
      })
      .catch(() => {
        if (!iptal) setHataMetni("Cemaat bilgisi yüklenemedi.");
      });
    return () => {
      iptal = true;
    };
  }, [yenile]);

  const birlik = veri?.birlik;
  const uyeler = [...(birlik?.uyeler ?? [])].sort((a, b) => String(a.ad).localeCompare(String(b.ad), "tr"));
  const kilanlar = uyeler.filter((u) => (u.bugunNamaz ?? 0) > 0).length;
  const toplam = birlik?.namazToplam ?? 0;
  const hedef = uyeler.length * 5;

  return (
    <section id="cami-cemaat" className="scroll-mt-24 rounded-3xl bg-stone-950/85 p-4 ring-1 ring-emerald-500/30 sm:p-5">
      <h4 className="font-display text-base text-emerald-100 sm:text-lg">📿 Cemaatimiz · Bugün</h4>
      {hataMetni ? <p className="mt-2 text-sm text-red-300">{hataMetni}</p> : null}
      {!veri ? (
        <p className="py-4 text-center text-sm text-amber-200/70">Yükleniyor…</p>
      ) : !birlik ? (
        <p className="mt-2 text-sm text-amber-200/85">
          Birlik kardeşlerinle ortak çetele tutmak için önce bir birliğe katıl. Kendi namaz çeteleni yukarıdan işaretleyebilirsin.
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs text-amber-200/80">
            {birlik.ad} birliğinden bugün <b className="text-emerald-300">{kilanlar}</b> kardeş namaz kıldı · toplam{" "}
            <b className="text-emerald-300">{toplam}</b> / {hedef} vakit
          </p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-stone-800">
            <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${hedef ? Math.min(100, (toplam / hedef) * 100) : 0}%` }} />
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {uyeler.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2 rounded-xl bg-stone-900/80 px-3 py-2 ring-1 ring-stone-700">
                <span className="truncate text-sm text-amber-100">{u.ad}</span>
                <span className={`shrink-0 text-xs font-bold ${(u.bugunNamaz ?? 0) > 0 ? "text-emerald-300" : "text-stone-500"}`}>
                  {(u.bugunNamaz ?? 0) > 0 ? "🤲 Bugün namazda" : "—"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-amber-200/70">
            Namaz kişinin Rabbiyle arasındadır; burada kimseyi yarıştırmıyoruz. Birbirimizi hayırla hatırlatalım. 🤲
          </p>
        </>
      )}
    </section>
  );
}
