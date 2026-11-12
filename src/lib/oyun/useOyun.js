"use client";
// =============================================================
// OYUN DURUMU (Faz 2) — sunucu API'sine bağlı
// Durumun asıl sahibi sunucudur (D1). İstemci sadece gösterir ve eylem gönderir.
// Üretim sayaçları sunucu saatine göre ilerletilir (istemci saati kurcalanamaz).
// =============================================================
import { useCallback, useEffect, useState } from "react";
import { BINALAR } from "./sabitler";
import { biriken, binaDurumu, levelDurumu } from "./kurallar";
import { levelAtlanabilirMi } from "./eylemler";

/**
 * @param {{ kullanici, durum, sunucuSaati:number, gelistirici:boolean }} baslangic
 *        Sunucu bileşeninden gelen ilk veri (sayfa yüklenirken hazır olur)
 */
export function useOyun(baslangic) {
  const [veri, setVeri] = useState(baslangic);
  // alindi: sunucu saatinin alındığı andaki istemci saati (ilk render'da null → SSR ile aynı çıktı)
  const [saat, setSaat] = useState({ alindi: null, simdi: null });
  const [bekliyor, setBekliyor] = useState(false);
  const [mesaj, setMesaj] = useState(null);

  useEffect(() => {
    const t0 = Date.now();
    // İstemci saatini sadece tarayıcıda başlatabiliriz
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaat({ alindi: t0, simdi: t0 });
    const t = setInterval(() => setSaat((s) => ({ ...s, simdi: Date.now() })), 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!mesaj) return;
    const t = setTimeout(() => setMesaj(null), 3000);
    return () => clearTimeout(t);
  }, [mesaj]);

  const { durum, sunucuSaati } = veri;
  const simdi = saat.alindi == null ? sunucuSaati : sunucuSaati + (saat.simdi - saat.alindi);

  const gonder = useCallback(async (govde) => {
    setBekliyor(true);
    try {
      const r = await fetch("/api/oyun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(govde),
      });
      if (r.status === 401) {
        window.location.href = "/giris";
        return;
      }
      const j = await r.json();
      if (!r.ok) {
        setMesaj({ tur: "hata", metin: j.hata ?? "Bir hata oluştu" });
        return;
      }
      const t = Date.now();
      setVeri(j);
      setSaat({ alindi: t, simdi: t });
      return j;
    } catch {
      setMesaj({ tur: "hata", metin: "Sunucuya ulaşılamadı" });
    } finally {
      setBekliyor(false);
    }
  }, []);

  const otag = durum.binalar.otag ?? 1;
  const gorevKontrol = { ...durum, gorevlerTamam: () => durum.gorevlerTamam };

  const bekleyen = (k) => (durum.sonToplama[k] != null ? biriken(k, durum.sonToplama[k], simdi, otag) : 0);

  const topla = async (k) => {
    const j = await gonder({ eylem: "topla", kaynak: k });
    if (j?.miktar) setMesaj({ tur: "tamam", metin: `+${j.miktar} toplandı` });
  };

  const yukselt = (binaId) => gonder({ eylem: "yukselt", binaId });
  const levelAtla = () => gonder({ eylem: "levelAtla" });

  const gelistiriciIslem = (islem, p = {}) => gonder({ eylem: "gelistirici", islem, ...p });
  const gelistirici = veri.gelistirici
    ? {
        zamanIlerlet: (s) => gelistiriciIslem("zamanIlerlet", { saat: s }),
        levelAyarla: (n) => gelistiriciIslem("levelAyarla", { level: n }),
        gorevleriIsaretle: (v) => gelistiriciIslem("gorevleriIsaretle", { deger: v }),
        kaynakEkle: (m) => gelistiriciIslem("kaynakEkle", { miktar: m }),
        sifirla: () => gelistiriciIslem("sifirla"),
      }
    : null;

  const cikis = async () => {
    await fetch("/api/auth/cikis", { method: "POST" });
    window.location.href = "/giris";
  };

  return {
    hazir: true,
    kullanici: veri.kullanici,
    durum,
    simdi,
    bekliyor,
    mesaj,
    level: levelDurumu(durum.level, durum.binalar),
    levelAtlanabilir: levelAtlanabilirMi(durum),
    levelAtla,
    bekleyen,
    topla,
    binaBilgisi: (binaId) => binaDurumu(binaId, gorevKontrol),
    yukselt,
    binaIdleri: Object.keys(BINALAR),
    gelistirici,
    cikis,
  };
}
