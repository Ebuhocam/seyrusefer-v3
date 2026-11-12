// =============================================================
// SEYRÜSEFER v3 — OYUN EYLEMLERİ (saf fonksiyonlar)
// Bir oyun durumunu alıp yeni durumu döner. Sunucu (API) bunları kullanır;
// istemci sadece sonucu gösterir. Geçersiz eylemde { hata } döner.
//
// durum = { level, binalar:{id:seviye}, envanter:{k:miktar},
//           sonToplama:{k:ms|null}, gorevlerTamam:boolean, zamanKaydirma:ms }
// =============================================================
import { KAYNAKLAR, BINALAR, LEVELLAR } from "./sabitler";
import { biriken, binaDurumu, kaynakAcikMi, levelDurumu } from "./kurallar";

const SAAT_MS = 60 * 60 * 1000;

/** Yeni oyuncunun başlangıç durumu */
export function baslangicDurumu(simdi) {
  const binalar = {};
  for (const [id, t] of Object.entries(BINALAR)) if (t.baslangicSeviye) binalar[id] = t.baslangicSeviye;
  const d = {
    level: 1,
    binalar,
    envanter: Object.fromEntries(Object.keys(KAYNAKLAR).map((k) => [k, 0])),
    sonToplama: Object.fromEntries(Object.keys(KAYNAKLAR).map((k) => [k, null])),
    gorevlerTamam: false, // Faz 4'e kadar görev şartı geliştirici panelinden işaretlenir
    zamanKaydirma: 0,
  };
  return uretimiBaslat(d, simdi);
}

/** Level'a göre açılmış ama henüz başlamamış üretim alanlarını şimdi başlatır */
export function uretimiBaslat(d, simdi) {
  const sonToplama = { ...d.sonToplama };
  for (const k of Object.keys(KAYNAKLAR)) {
    if (kaynakAcikMi(k, d.level) && sonToplama[k] == null) sonToplama[k] = simdi;
  }
  return { ...d, sonToplama };
}

const gorevKontrol = (d) => ({ ...d, gorevlerTamam: () => d.gorevlerTamam });

export function topla(d, kaynak, simdi) {
  if (!KAYNAKLAR[kaynak]) return { hata: "Bilinmeyen kaynak" };
  if (!kaynakAcikMi(kaynak, d.level) || d.sonToplama[kaynak] == null) return { hata: "Bu alan henüz açılmadı" };
  const miktar = biriken(kaynak, d.sonToplama[kaynak], simdi, d.binalar.otag ?? 1);
  if (!miktar) return { hata: "Henüz birikmedi" };
  return {
    durum: {
      ...d,
      envanter: { ...d.envanter, [kaynak]: (d.envanter[kaynak] ?? 0) + miktar },
      sonToplama: { ...d.sonToplama, [kaynak]: simdi },
    },
    miktar,
  };
}

export function yukselt(d, binaId) {
  if (!BINALAR[binaId]) return { hata: "Bilinmeyen bina" };
  const b = binaDurumu(binaId, gorevKontrol(d));
  if (b.maks) return { hata: "Bina zaten en üst seviyede" };
  if (!b.levelYeterli) return { hata: `Level ${b.gerekenLevel} gerekli` };
  if (!b.gorevTamam) return { hata: "Görev şartı tamamlanmadı" };
  if (!b.kaynakYeterli) return { hata: "Kaynak yetersiz" };
  const envanter = { ...d.envanter };
  for (const [k, m] of Object.entries(b.bedel)) envanter[k] -= m;
  return { durum: { ...d, envanter, binalar: { ...d.binalar, [binaId]: b.hedef } } };
}

export function levelAtlanabilirMi(d) {
  const l = levelDurumu(d.level, d.binalar);
  return !!l && l.binalarTamam && d.gorevlerTamam && d.level < LEVELLAR.length;
}

export function levelAtla(d, simdi) {
  if (!levelAtlanabilirMi(d)) return { hata: "Level hedefleri tamamlanmadı" };
  return { durum: uretimiBaslat({ ...d, level: d.level + 1, gorevlerTamam: false }, simdi) };
}

// ---------- Geliştirici araçları (sadece geliştirme ortamı / admin) ----------
export const gelistiriciEylemleri = {
  zamanIlerlet: (d, { saat }) => ({ ...d, zamanKaydirma: d.zamanKaydirma + Number(saat) * SAAT_MS }),
  levelAyarla: (d, { level }, simdi) =>
    uretimiBaslat({ ...d, level: Math.min(LEVELLAR.length, Math.max(1, Math.floor(Number(level)) || 1)) }, simdi),
  gorevleriIsaretle: (d, { deger }) => ({ ...d, gorevlerTamam: !!deger }),
  kaynakEkle: (d, { miktar }) => ({
    ...d,
    envanter: Object.fromEntries(Object.entries(d.envanter).map(([k, v]) => [k, Math.max(0, v + Number(miktar))])),
  }),
  sifirla: (_d, _p, simdi) => baslangicDurumu(simdi),
};
