"use client";
import { useState } from "react";

const Btn = ({ children, className = "", ...p }) => (
  <button
    type="button"
    {...p}
    className={`rounded-md bg-stone-700 px-2 py-1 text-xs font-bold hover:bg-stone-600 disabled:opacity-45 ${className}`}
  >
    {children}
  </button>
);

// Prototip ve araştırma aşamasında: zaman, level, kaynak ve sıfırlama kontrolü
export default function GelistiriciPaneli({ oyun, duzenle, setDuzenle, onSifirlandi }) {
  const [acik, setAcik] = useState(false);
  const [sifirlaOnay, setSifirlaOnay] = useState(false);
  const g = oyun.gelistirici;
  const d = oyun.durum;

  const sifirlaUygula = async () => {
    setSifirlaOnay(false);
    const yanit = await g.sifirla();
    if (yanit) {
      oyun.setMesaj({ tur: "tamam", metin: "Köy ilerlemesi başlangıç durumuna sıfırlandı!" });
      onSifirlandi?.();
    }
  };

  return (
    <div className="fixed bottom-3 left-3 z-[350] text-amber-50">
      {acik && (
        <div className="mb-2 w-68 space-y-2 rounded-xl bg-stone-950/95 p-3 text-xs shadow-2xl ring-1 ring-lime-500/40">
          <p className="font-black text-lime-300">🛠 Geliştirici (prototip)</p>
          <div className="flex items-center gap-1">
            <span className="flex-1 tabular-nums">Level: {d.level}</span>
            <Btn disabled={oyun.bekliyor} onClick={() => g.levelAyarla(d.level - 1)}>−</Btn>
            <Btn disabled={oyun.bekliyor} onClick={() => g.levelAyarla(d.level + 1)}>+</Btn>
          </div>
          <div className="flex items-center gap-1">
            <span className="flex-1">Zaman</span>
            <Btn disabled={oyun.bekliyor} onClick={() => g.zamanIlerlet(6)}>+6 sa</Btn>
            <Btn disabled={oyun.bekliyor} onClick={() => g.zamanIlerlet(24)}>+1 gün</Btn>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={d.gorevlerTamam}
              onChange={(e) => g.gorevleriIsaretle(e.target.checked)}
            />
            Görev şartları tamam
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={duzenle}
              onChange={(e) => setDuzenle(e.target.checked)}
            />
            Koordinat modu (haritaya tıkla)
          </label>

          {!sifirlaOnay ? (
            <div className="flex gap-1.5 pt-0.5">
              <Btn disabled={oyun.bekliyor} onClick={() => g.kaynakEkle(500)} className="flex-1">
                +500 kaynak
              </Btn>
              <Btn
                disabled={oyun.bekliyor}
                onClick={() => setSifirlaOnay(true)}
                className="bg-red-800/90 text-red-100 hover:bg-red-700"
              >
                Sıfırla
              </Btn>
            </div>
          ) : (
            <div className="space-y-1.5 rounded-lg bg-red-950/90 p-2 ring-1 ring-red-400/60">
              <p className="text-[11px] font-bold text-red-100">
                Tüm köy ilerlemesi baştan başlatılsın mı?
              </p>
              <div className="flex gap-1.5">
                <Btn
                  disabled={oyun.bekliyor}
                  onClick={sifirlaUygula}
                  className="flex-1 bg-red-600 text-white hover:bg-red-500"
                >
                  Evet, Sıfırla
                </Btn>
                <Btn
                  disabled={oyun.bekliyor}
                  onClick={() => setSifirlaOnay(false)}
                  className="bg-stone-800 text-stone-200 hover:bg-stone-700"
                >
                  Vazgeç
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          setAcik(!acik);
          setSifirlaOnay(false);
        }}
        className="grid h-10 w-10 place-items-center rounded-full bg-stone-950/85 text-lg ring-1 ring-lime-500/50 hover:bg-stone-900"
      >
        🛠
      </button>
    </div>
  );
}
