"use client";
// =============================================================
// OYUN DURUMU — sunucu API'sine bağlı
// Durumun ve ayarların asıl sahibi sunucudur (D1).
// =============================================================
import { useCallback, useEffect, useState } from "react";
import { BINALAR, oyuncuKarakteriBul } from "./sabitler";
import {
  biriken,
  dolumBilgisi,
  binaDurumu,
  levelDurumu,
  sahaNoktalariDurumu,
  ormanSeferBilgisi,
} from "./kurallar";
import { gorevKontrol, levelAtlanabilirMi } from "./eylemler";
import { levelGorevListesi, levelIcerigi, gununSeyyahGorevi, tumLevelGorevleriTamamMi } from "./gorevler";

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
    const t = setTimeout(() => setMesaj(null), 3200);
    return () => clearTimeout(t);
  }, [mesaj]);

  const { durum, sunucuSaati, ayarlar } = veri;
  const simdi = saat.alindi == null ? sunucuSaati : sunucuSaati + (saat.simdi - saat.alindi);

  const veriUygula = useCallback((j) => {
    const t = Date.now();
    setVeri((eski) => ({
      kullanici: j.kullanici ?? eski.kullanici,
      durum: j.durum ?? eski.durum,
      ayarlar: j.ayarlar ?? eski.ayarlar,
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
  const kontrolDurumu = gorevKontrol(durum, ayarlar);

  const bekleyen = (k) =>
    durum.sonToplama[k] != null ? biriken(k, durum.sonToplama[k], simdi, otag, durum.isciler?.[k] ?? 1) : 0;

  const dolum = (k) =>
    dolumBilgisi(k, durum.sonToplama?.[k], simdi, otag, durum.isciler?.[k] ?? 1, durum);

  const sahaNoktalari = (k) => sahaNoktalariDurumu(k, durum, simdi);
  const ormanSefer = () => ormanSeferBilgisi(durum, simdi);

  const karakter = oyuncuKarakteriBul(durum.karakter, durum.cinsiyet);

  const topla = async (k) => {
    const j = await gonder({ eylem: "topla", kaynak: k });
    if (j?.miktar) setMesaj({ tur: "tamam", metin: `+${j.miktar} toplandı` });
  };

  const isciAta = async (kaynak, degisim) => {
    const j = await gonder({ eylem: "isciAta", kaynak, degisim });
    if (j?.sonuc?.mesaj) {
      setMesaj({ tur: "tamam", metin: j.sonuc.mesaj });
    }
    return j?.sonuc ?? null;
  };

  const sahaHasat = async (kaynak, noktaId) => {
    const j = await gonder({ eylem: "sahaHasat", kaynak, noktaId });
    if (j?.sonuc?.mesaj) {
      setMesaj({ tur: "tamam", metin: j.sonuc.mesaj });
    }
    return j?.sonuc ?? null;
  };

  const sahaHepsiniTopla = async (kaynak) => {
    const j = await gonder({ eylem: "sahaHepsiniTopla", kaynak });
    if (j?.sonuc?.mesaj) {
      setMesaj({ tur: "tamam", metin: j.sonuc.mesaj });
    }
    return j?.sonuc ?? null;
  };

  const ormanKesif = async (bolgeId) => {
    const j = await gonder({ eylem: "ormanKesif", bolgeId });
    if (j?.sonuc?.mesaj) {
      setMesaj({
        tur: j.sonuc.agacTuru === "kurumus" ? "tamam" : "bilgi",
        metin: j.sonuc.mesaj,
      });
    }
    return j?.sonuc ?? null;
  };

  const ormanAgacKes = async () => {
    const j = await gonder({ eylem: "ormanAgacKes" });
    if (j?.sonuc?.mesaj) {
      setMesaj({ tur: "tamam", metin: j.sonuc.mesaj });
    }
    return j?.sonuc ?? null;
  };

  const uretimEtkilesim = async (kaynak, noktaId = null) => {
    const j = await gonder({ eylem: "uretimEtkilesim", kaynak, noktaId });
    if (j?.sonuc?.mesaj) {
      setMesaj({ tur: "tamam", metin: j.sonuc.mesaj });
    }
    return j?.sonuc ?? null;
  };

  const mektupAl = async () => {
    const j = await gonder({ eylem: "mektupAl" });
    if (j?.sonuc?.mesaj) {
      setMesaj({ tur: "tamam", metin: j.sonuc.mesaj });
    }
    return j?.sonuc ?? null;
  };

  const karakterSec = async (yeniKarakter, yeniCinsiyet) => {
    const j = await gonder({ eylem: "karakterSec", karakter: yeniKarakter, cinsiyet: yeniCinsiyet });
    if (j?.sonuc?.mesaj) {
      setMesaj({ tur: "tamam", metin: j.sonuc.mesaj });
    }
    return j?.sonuc ?? null;
  };

  const yukselt = (binaId) => gonder({ eylem: "yukselt", binaId }, "Bina yükseltildi!");
  const levelAtla = () => gonder({ eylem: "levelAtla" }, `Level ${durum.level + 1}'e geçildi!`);

  const gorevTamamla = (gorevKodu) => gonder({ eylem: "gorevTamamla", gorevKodu }, "Görev ilerlemesi kaydedildi!");
  const namazIsaretle = (vakit, deger) => gonder({ eylem: "namazIsaretle", vakit, deger });
  const sinavCevapla = (cevaplar) => gonder({ eylem: "sinavCevapla", cevaplar }, "Tebrikler! Sınavı başarıyla geçtin!");
  const davaCoz = async (davaId, secenekIndeks) => {
    const j = await gonder({ eylem: "davaCoz", davaId, secenekIndeks });
    return j?.sonuc ?? null;
  };
  const gocmenTeklifEt = async (meydandanMi = false) => {
    const j = await gonder({ eylem: "gocmenTeklifEt", meydandanMi });
    if (j?.sonuc && !meydandanMi) {
      setMesaj({
        tur: j.sonuc.kabul ? "tamam" : "hata",
        metin: j.sonuc.mesaj,
      });
    }
    return j?.sonuc ?? null;
  };

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

  const gorevler = levelGorevListesi(durum.level, durum.gorevIlerlemesi, durum.gorevlerTamam, simdi, ayarlar);
  const tumGorevlerTamam = tumLevelGorevleriTamamMi(durum.level, durum.gorevIlerlemesi, durum.gorevlerTamam, ayarlar);
  const aktifIcerik = levelIcerigi(durum.level, ayarlar);
  const aktifSeyyahGorevi = gununSeyyahGorevi(simdi, ayarlar);

  return {
    hazir: true,
    kullanici: veri.kullanici,
    durum,
    ayarlar,
    aktifIcerik,
    aktifSeyyahGorevi,
    simdi,
    bekliyor,
    mesaj,
    setMesaj,
    veriUygula,
    level: levelDurumu(durum.level, durum.binalar, ayarlar?.levellar),
    levelAtlanabilir: levelAtlanabilirMi(durum, ayarlar),
    levelAtla,
    gorevler,
    tumGorevlerTamam,
    gorevTamamla,
    namazIsaretle,
    sinavCevapla,
    davaCoz,
    gocmenTeklifEt,
    bekleyen,
    dolum,
    sahaNoktalari,
    ormanSefer,
    topla,
    isciAta,
    sahaHasat,
    sahaHepsiniTopla,
    ormanKesif,
    ormanAgacKes,
    uretimEtkilesim,
    mektupAl,
    karakter,
    karakterSec,
    binaBilgisi: (binaId) => binaDurumu(binaId, kontrolDurumu, ayarlar?.binalar),
    yukselt,
    binaIdleri: Object.keys(BINALAR),
    gelistirici,
    cikis,
  };
}
