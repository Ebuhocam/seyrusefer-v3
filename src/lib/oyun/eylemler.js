// =============================================================
// SEYRÜSEFER v3 — OYUN EYLEMLERİ (saf fonksiyonlar)
// Bir oyun durumunu alıp yeni durumu döner. Sunucu (API) bunları kullanır;
// istemci sadece sonucu gösterir. Geçersiz eylemde { hata } döner.
// =============================================================
import { KAYNAKLAR, BINALAR, LEVELLAR } from "./sabitler";
import { biriken, binaDurumu, kaynakAcikMi, levelDurumu } from "./kurallar";
import {
  NAMAZ_VAKITLERI,
  oyunGunu,
  levelGorevTanimlari,
  levelIcerigi,
  binaGorevleriTamamMi,
  tumLevelGorevleriTamamMi,
} from "./gorevler";

const SAAT_MS = 60 * 60 * 1000;
const BOS_NAMAZ = { sabah: 0, ogle: 0, ikindi: 0, aksam: 0, yatsi: 0 };

/** Yeni oyuncunun başlangıç durumu */
export function baslangicDurumu(simdi) {
  const binalar = {};
  for (const [id, t] of Object.entries(BINALAR)) if (t.baslangicSeviye) binalar[id] = t.baslangicSeviye;
  const d = {
    level: 1,
    binalar,
    envanter: Object.fromEntries(Object.keys(KAYNAKLAR).map((k) => [k, 0])),
    sonToplama: Object.fromEntries(Object.keys(KAYNAKLAR).map((k) => [k, null])),
    gorevlerTamam: false,
    gorevIlerlemesi: {},
    bugunNamaz: { ...BOS_NAMAZ },
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

export const gorevKontrol = (d, ayarlar = null) => ({
  ...d,
  gorevlerTamam: (binaId) => binaGorevleriTamamMi(d.level, binaId, d.gorevIlerlemesi, d.gorevlerTamam, ayarlar),
});

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

export function yukselt(d, binaId, ayarlar = null) {
  if (!BINALAR[binaId]) return { hata: "Bilinmeyen bina" };
  const b = binaDurumu(binaId, gorevKontrol(d, ayarlar), ayarlar?.binalar);
  if (b.maks) return { hata: "Bina zaten en üst seviyede" };
  if (!b.levelYeterli) return { hata: `Level ${b.gerekenLevel} gerekli` };
  if (!b.gorevTamam) return { hata: "Bu binanın görev şartları henüz tamamlanmadı" };
  if (!b.kaynakYeterli) return { hata: "Kaynak yetersiz" };
  const envanter = { ...d.envanter };
  for (const [k, m] of Object.entries(b.bedel)) envanter[k] -= Number(m) || 0;
  return { durum: { ...d, envanter, binalar: { ...d.binalar, [binaId]: b.hedef } } };
}

export function levelAtlanabilirMi(d, ayarlar = null) {
  const l = levelDurumu(d.level, d.binalar, ayarlar?.levellar);
  const gorevTamam = tumLevelGorevleriTamamMi(d.level, d.gorevIlerlemesi, d.gorevlerTamam, ayarlar);
  return !!l && l.binalarTamam && gorevTamam && d.level < LEVELLAR.length;
}

export function levelAtla(d, simdi, ayarlar = null) {
  if (!levelAtlanabilirMi(d, ayarlar)) return { hata: "Level hedefleri tamamlanmadı" };
  return {
    durum: uretimiBaslat(
      { ...d, level: d.level + 1, gorevlerTamam: false, gorevIlerlemesi: {} },
      simdi
    ),
  };
}

/**
 * Bir görevi 1 adım ilerletir (kod veya tür ile eşleşir).
 */
export function gorevIlerlet(d, gorevKodu, simdi, ayarlar = null) {
  const tanimlar = levelGorevTanimlari(d.level, ayarlar);
  let tanim = tanimlar.find((g) => g.kod === gorevKodu);
  if (!tanim) {
    // Tür üzerinden henüz tamamlanmamış ilk görevi bul (örn. meydan_paylasim, hadis)
    tanim =
      tanimlar.find((g) => g.tur === gorevKodu && (d.gorevIlerlemesi?.[g.kod]?.ilerleme ?? 0) < g.hedef) ??
      tanimlar.find((g) => g.tur === gorevKodu);
  }
  if (!tanim) return { hata: "Bu levelda böyle bir görev yok" };

  const mevcut = d.gorevIlerlemesi?.[tanim.kod] ?? { ilerleme: 0, sonGun: null };
  if (mevcut.ilerleme >= tanim.hedef) return { hata: "Bu görev zaten tamamlandı" };

  const bugun = oyunGunu(simdi);
  if (tanim.gunluk && mevcut.sonGun === bugun) {
    return { hata: "Bu günlük görevi bugün zaten yaptın. Yarın devam edebilirsin!" };
  }

  const yeni = { ilerleme: mevcut.ilerleme + 1, sonGun: bugun };
  return {
    durum: {
      ...d,
      gorevIlerlemesi: { ...d.gorevIlerlemesi, [tanim.kod]: yeni },
    },
    gorev: tanim,
  };
}

/**
 * Günlük namaz çetelesini günceller.
 * 5 vakit tamamlandığında o leveldaki namaz görevlerini otomatik 1 gün ilerletir.
 */
export function namazGuncelle(d, vakit, deger, simdi, ayarlar = null) {
  if (!NAMAZ_VAKITLERI.some((v) => v.kod === vakit)) return { hata: "Geçersiz namaz vakti" };
  const bugunNamaz = { ...(d.bugunNamaz ?? BOS_NAMAZ), [vakit]: deger ? 1 : 0 };
  const kilinanSayisi = Object.values(bugunNamaz).reduce((a, b) => a + (b ? 1 : 0), 0);

  let yeniDurum = { ...d, bugunNamaz };
  const tanimlar = levelGorevTanimlari(d.level, ayarlar);
  const namazGorevi = tanimlar.find((g) => g.tur === "namaz" || g.kod === "namaz");
  const bugun = oyunGunu(simdi);

  if (namazGorevi && kilinanSayisi === 5) {
    const mevcut = d.gorevIlerlemesi?.[namazGorevi.kod] ?? { ilerleme: 0, sonGun: null };
    if (mevcut.ilerleme < namazGorevi.hedef && mevcut.sonGun !== bugun) {
      yeniDurum = {
        ...yeniDurum,
        gorevIlerlemesi: {
          ...d.gorevIlerlemesi,
          [namazGorevi.kod]: { ilerleme: mevcut.ilerleme + 1, sonGun: bugun },
        },
      };
    }
  }

  return { durum: yeniDurum, kilinanSayisi };
}

/**
 * Medrese sınavını değerlendirir; tüm sorular doğruysa 'sinav' görevini tamamlar.
 */
export function sinavDegerlendir(d, cevaplar, simdi, ayarlar = null) {
  const sorular = levelIcerigi(d.level, ayarlar)?.sinav ?? [];
  if (!sorular.length) return { hata: "Bu levelda sınav bulunmuyor" };
  if (!Array.isArray(cevaplar) || cevaplar.length !== sorular.length) {
    return { hata: "Lütfen tüm soruları cevapla" };
  }
  const yanlisIndeks = sorular.findIndex((s, i) => Number(cevaplar[i]) !== Number(s.dogru));
  if (yanlisIndeks !== -1) {
    return { hata: `${yanlisIndeks + 1}. sorunun cevabı hatalı. Tekrar dene!` };
  }
  return gorevIlerlet(d, "sinav", simdi, ayarlar);
}

// ---------- Geliştirici araçları (sadece geliştirme ortamı / admin) ----------
export const gelistiriciEylemleri = {
  zamanIlerlet: (d, { saat }) => ({ ...d, zamanKaydirma: d.zamanKaydirma + Number(saat) * SAAT_MS }),
  levelAyarla: (d, { level }, simdi) =>
    uretimiBaslat(
      {
        ...d,
        level: Math.min(LEVELLAR.length, Math.max(1, Math.floor(Number(level)) || 1)),
        gorevIlerlemesi: {},
      },
      simdi
    ),
  gorevleriIsaretle: (d, { deger }) => ({ ...d, gorevlerTamam: !!deger }),
  kaynakEkle: (d, { miktar }) => ({
    ...d,
    envanter: Object.fromEntries(Object.entries(d.envanter).map(([k, v]) => [k, Math.max(0, v + Number(miktar))])),
  }),
  sifirla: (_d, _p, simdi) => baslangicDurumu(simdi),
};
