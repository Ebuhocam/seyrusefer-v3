"use client";
// =============================================================
// PROTOTİP DURUMU (Faz 1)
// Veritabanı gelene kadar oyun durumu tarayıcıda (localStorage) tutulur.
// Faz 2'de bu hook'un yerini sunucu API'si alacak; bileşenler aynı kalacak.
// =============================================================
import { useCallback, useEffect, useState } from "react";
import { KAYNAKLAR, BINALAR, LEVELLAR } from "./sabitler";
import { biriken, binaDurumu, kaynakAcikMi, levelDurumu } from "./kurallar";

const ANAHTAR = "seyrusefer-v3-prototip";
const SAAT_MS = 60 * 60 * 1000;

function baslangicDurumu() {
  const simdi = Date.now();
  return {
    level: 1,
    binalar: { otag: 1 },
    envanter: { erzak: 0, kereste: 0, tas: 0 },
    // null = üretim alanı henüz açılmadı
    sonToplama: { erzak: simdi, kereste: simdi, tas: null },
    zamanKaydirma: 0, // geliştirici paneli için "zamanda ileri git"
    gorevlerTamam: false, // Faz 4'e kadar görev şartı elle işaretlenir
  };
}

export function useSahteOyun() {
  const [durum, setDurum] = useState(null);
  const [saat, setSaat] = useState(() => Date.now());

  // İlk yükleme (sunucu/istemci uyumsuzluğu olmasın diye effect içinde)
  useEffect(() => {
    let kayit = null;
    try {
      kayit = JSON.parse(localStorage.getItem(ANAHTAR));
    } catch {}
    // localStorage sadece tarayıcıda okunabildiği için ilk yükleme effect içinde yapılır
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDurum(kayit ?? baslangicDurumu());
  }, []);

  useEffect(() => {
    if (durum) localStorage.setItem(ANAHTAR, JSON.stringify(durum));
  }, [durum]);

  // Üretim sayaçları için saati her 15 sn'de bir ilerlet
  useEffect(() => {
    const t = setInterval(() => setSaat(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  const simdi = saat + (durum?.zamanKaydirma ?? 0);

  // Level değişince yeni açılan üretim alanlarını o andan itibaren başlatır
  const uretimiBaslat = (d) => {
    const sonToplama = { ...d.sonToplama };
    for (const k of Object.keys(KAYNAKLAR)) {
      if (kaynakAcikMi(k, d.level) && sonToplama[k] == null) sonToplama[k] = simdi;
    }
    return { ...d, sonToplama };
  };

  const otag = durum?.binalar.otag ?? 1;

  const bekleyen = (k) =>
    durum && durum.sonToplama[k] != null ? biriken(k, durum.sonToplama[k], simdi, otag) : 0;

  const topla = useCallback(
    (k) =>
      setDurum((d) => {
        const miktar = biriken(k, d.sonToplama[k], simdi, d.binalar.otag);
        if (!miktar) return d;
        return {
          ...d,
          envanter: { ...d.envanter, [k]: d.envanter[k] + miktar },
          sonToplama: { ...d.sonToplama, [k]: simdi },
        };
      }),
    [simdi]
  );

  const binaBilgisi = (binaId) =>
    durum && binaDurumu(binaId, { ...durum, gorevlerTamam: () => durum.gorevlerTamam });

  const yukselt = (binaId) =>
    setDurum((d) => {
      const b = binaDurumu(binaId, { ...d, gorevlerTamam: () => d.gorevlerTamam });
      if (!b.yapilabilir) return d;
      const envanter = { ...d.envanter };
      for (const [k, m] of Object.entries(b.bedel)) envanter[k] -= m;
      return { ...d, envanter, binalar: { ...d.binalar, [binaId]: b.hedef } };
    });

  const level = durum && levelDurumu(durum.level, durum.binalar);
  const levelAtlanabilir = !!level && level.binalarTamam && durum.gorevlerTamam && durum.level < LEVELLAR.length;

  const levelAtla = () =>
    levelAtlanabilir && setDurum((d) => uretimiBaslat({ ...d, level: d.level + 1, gorevlerTamam: false }));

  // ---- Geliştirici araçları ----
  const gelistirici = {
    zamanIlerlet: (saatSayisi) =>
      setDurum((d) => ({ ...d, zamanKaydirma: d.zamanKaydirma + saatSayisi * SAAT_MS })),
    levelAyarla: (n) =>
      setDurum((d) => uretimiBaslat({ ...d, level: Math.min(LEVELLAR.length, Math.max(1, n)) })),
    gorevleriIsaretle: (v) => setDurum((d) => ({ ...d, gorevlerTamam: v })),
    kaynakEkle: (m) =>
      setDurum((d) => ({
        ...d,
        envanter: Object.fromEntries(Object.entries(d.envanter).map(([k, v]) => [k, v + m])),
      })),
    sifirla: () => setDurum(baslangicDurumu()),
  };

  return {
    hazir: !!durum,
    durum,
    simdi,
    level,
    levelAtlanabilir,
    levelAtla,
    bekleyen,
    topla,
    binaBilgisi,
    yukselt,
    binaIdleri: Object.keys(BINALAR),
    gelistirici,
  };
}
