"use client";
// =============================================================
// OYUN DURUMU — sunucu API'sine bağlı
// Durumun asıl sahibi sunucudur (D1). İstemci sadece gösterir ve eylem gönderir.
// Üretim sayaçları ve günlük görevler sunucu saatine göre ilerletilir.
// =============================================================
import { useCallback, useEffect, useState } from "react";
import { BINALAR } from "./sabitler";
import { biriken, binaDurumu, levelDurumu } from "./kurallar";
import { gorevKontrol, levelAtlanabilirMi } from "./eylemler";
import { levelGorevListesi, tumLevelGorevleriTamamMi } from "./gorevler";

/**
 * @param {{ kullanici, durum, sunucuSaati:number, gelistirici:boolean }} baslangic
 */
export function useOyun(baslangic) {
  const [veri, setVeri] = useState(baslangic);
  const [saat, setSaat] = useState({ alindi: null, simdi: null });
  const [bekliyor, setBekliyor] = useState(false);
  const [mesaj, setMesaj] = useState(null);

  useEffect(() => {
    const t0 = Date.now();
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

  const veriUygula = useCallback((j) => {
    const t = Date.now();
    setVeri((eski) => ({
      kullanici: j.kullanici ?? eski.kullanici,
      durum: j.durum ?? eski.durum,
      sunucuSaati: j.sunucuSaati ?? eski.sunucuSaati,
      gelistirici: j.gelistirici ?? eski.gelistirici,
    }));
    setSaat({ alindi: t, simdi: t });
  }, []);

  const gonder = useCallback(
    async (govde, basariMesaji = null) => {
      setBekliyor(true);
      try {
        const r = await fetch("/api/oyun", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(govde),
        });
        if (r.status === 401) {
          window.location.href = "/giris";
          return null;
        }
        const j = await r.json();
        if (!r.ok) {
          setMesaj({ tur: "hata", metin: j.hata ?? "Bir hata oluştu" });
          return null;
        }
        veriUygula(j);
        if (basariMesaji) setMesaj({ tur: "tamam", metin: basariMesaji });
        return j;
      } catch {
        setMesaj({ tur: "hata", metin: "Sunucuya ulaşılamadı" });
        return null;
      } finally {
        setBekliyor(false);
      }
    },
    [veriUygula]
  );

  const otag = durum.binalar.otag ?? 1;
  const kontrolDurumu = gorevKontrol(durum);

  const bekleyen = (k) => (durum.sonToplama[k] != null ? biriken(k, durum.sonToplama[k], simdi, otag) : 0);

  const topla = async (k) => {
    const j = await gonder({ eylem: "topla", kaynak: k });
    if (j?.miktar) setMesaj({ tur: "tamam", metin: `+${j.miktar} toplandı` });
  };

  const yukselt = (binaId) => gonder({ eylem: "yukselt", binaId }, "Bina yükseltildi!");
  const levelAtla = () => gonder({ eylem: "levelAtla" }, `Level ${durum.level + 1}'e geçildi!`);

  const gorevTamamla = (gorevKodu) => gonder({ eylem: "gorevTamamla", gorevKodu }, "Görev ilerlemesi kaydedildi!");
  const namazIsaretle = (vakit, deger) => gonder({ eylem: "namazIsaretle", vakit, deger });
  const sinavCevapla = (cevaplar) => gonder({ eylem: "sinavCevapla", cevaplar }, "Tebrikler! Sınavı başarıyla geçtin!");

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

  const gorevler = levelGorevListesi(durum.level, durum.gorevIlerlemesi, durum.gorevlerTamam, simdi);
  const tumGorevlerTamam = tumLevelGorevleriTamamMi(durum.level, durum.gorevIlerlemesi, durum.gorevlerTamam);

  return {
    hazir: true,
    kullanici: veri.kullanici,
    durum,
    simdi,
    bekliyor,
    mesaj,
    setMesaj,
    veriUygula,
    level: levelDurumu(durum.level, durum.binalar),
    levelAtlanabilir: levelAtlanabilirMi(durum),
    levelAtla,
    gorevler,
    tumGorevlerTamam,
    gorevTamamla,
    namazIsaretle,
    sinavCevapla,
    bekleyen,
    topla,
    binaBilgisi: (binaId) => binaDurumu(binaId, kontrolDurumu),
    yukselt,
    binaIdleri: Object.keys(BINALAR),
    gelistirici,
    cikis,
  };
}
