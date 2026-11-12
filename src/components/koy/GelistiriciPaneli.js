"use client";
import { useState } from "react";

const Btn = ({ children, ...p }) => (
  <button {...p} className="rounded-md bg-stone-700 px-2 py-1 text-xs font-bold hover:bg-stone-600">{children}</button>
);

// Sadece prototip aşamasında: zaman, level ve görev şartını elle değiştirmek için
export default function GelistiriciPaneli({ oyun, duzenle, setDuzenle }) {
  const [acik, setAcik] = useState(false);
  const g = oyun.gelistirici;
  const d = oyun.durum;

  return (
    <div className="fixed bottom-3 left-3 z-[350] text-amber-50">
      {acik && (
        <div className="mb-2 w-64 space-y-2 rounded-xl bg-black/85 p-3 text-xs shadow-2xl ring-1 ring-lime-500/40">
          <p className="font-black text-lime-300">🛠 Geliştirici (prototip)</p>
          <div className="flex items-center gap-1">
            <span className="flex-1">Level: {d.level}</span>
            <Btn onClick={() => g.levelAyarla(d.level - 1)}>−</Btn>
            <Btn onClick={() => g.levelAyarla(d.level + 1)}>+</Btn>
          </div>
          <div className="flex items-center gap-1">
            <span className="flex-1">Zaman</span>
            <Btn onClick={() => g.zamanIlerlet(6)}>+6 sa</Btn>
            <Btn onClick={() => g.zamanIlerlet(24)}>+1 gün</Btn>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={d.gorevlerTamam} onChange={(e) => g.gorevleriIsaretle(e.target.checked)} />
            Görev şartları tamam
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={duzenle} onChange={(e) => setDuzenle(e.target.checked)} />
            Koordinat modu (haritaya tıkla)
          </label>
          <div className="flex gap-1">
            <Btn onClick={() => g.kaynakEkle(500)}>+500 kaynak</Btn>
            <Btn onClick={() => confirm("Tüm prototip ilerlemesi silinsin mi?") && g.sifirla()}>Sıfırla</Btn>
          </div>
        </div>
      )}
      <button onClick={() => setAcik(!acik)} className="grid h-10 w-10 place-items-center rounded-full bg-black/70 text-lg ring-1 ring-lime-500/50">
        🛠
      </button>
    </div>
  );
}
