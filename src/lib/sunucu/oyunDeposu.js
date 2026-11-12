import "server-only";
import { db } from "./db";
import { baslangicDurumu } from "@/lib/oyun/eylemler";

/** Oyuncunun durumunu veritabanından okur (yoksa null) */
export async function durumOku(kullaniciId) {
  const d = await db();
  const [oyuncu, binalar, kaynaklar] = await d.batch([
    d.prepare("SELECT level, gorevler_tamam, zaman_kaydirma FROM oyuncu_durumu WHERE kullanici_id = ?").bind(kullaniciId),
    d.prepare("SELECT bina_id, seviye FROM binalar WHERE kullanici_id = ?").bind(kullaniciId),
    d.prepare("SELECT kaynak, envanter, son_toplama FROM kaynaklar WHERE kullanici_id = ?").bind(kullaniciId),
  ]);
  const o = oyuncu.results[0];
  if (!o) return null;
  return {
    level: o.level,
    gorevlerTamam: !!o.gorevler_tamam,
    zamanKaydirma: o.zaman_kaydirma,
    binalar: Object.fromEntries(binalar.results.map((b) => [b.bina_id, b.seviye])),
    envanter: Object.fromEntries(kaynaklar.results.map((k) => [k.kaynak, k.envanter])),
    sonToplama: Object.fromEntries(kaynaklar.results.map((k) => [k.kaynak, k.son_toplama])),
  };
}

/** Durumu tek bir toplu işlemle (atomik) yazar */
export async function durumYaz(kullaniciId, durum) {
  const d = await db();
  const simdi = Date.now();
  const ifadeler = [
    d
      .prepare(
        `INSERT INTO oyuncu_durumu (kullanici_id, level, gorevler_tamam, zaman_kaydirma, guncelleme)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(kullanici_id) DO UPDATE SET level = ?2, gorevler_tamam = ?3, zaman_kaydirma = ?4, guncelleme = ?5`
      )
      .bind(kullaniciId, durum.level, durum.gorevlerTamam ? 1 : 0, durum.zamanKaydirma, simdi),
    d.prepare("DELETE FROM binalar WHERE kullanici_id = ?").bind(kullaniciId),
    ...Object.entries(durum.binalar).map(([id, seviye]) =>
      d.prepare("INSERT INTO binalar (kullanici_id, bina_id, seviye) VALUES (?, ?, ?)").bind(kullaniciId, id, seviye)
    ),
    ...Object.keys(durum.envanter).map((k) =>
      d
        .prepare(
          `INSERT INTO kaynaklar (kullanici_id, kaynak, envanter, son_toplama) VALUES (?1, ?2, ?3, ?4)
           ON CONFLICT(kullanici_id, kaynak) DO UPDATE SET envanter = ?3, son_toplama = ?4`
        )
        .bind(kullaniciId, k, durum.envanter[k], durum.sonToplama[k] ?? null)
    ),
  ];
  await d.batch(ifadeler);
}

/** Durumu okur; oyuncunun kaydı yoksa başlangıç durumunu oluşturur */
export async function durumGetir(kullaniciId) {
  const mevcut = await durumOku(kullaniciId);
  if (mevcut) return mevcut;
  const yeni = baslangicDurumu(Date.now());
  await durumYaz(kullaniciId, yeni);
  return yeni;
}

/** Oyun saati: sunucu saati + (geliştirici) zaman kaydırması */
export const oyunSaati = (durum) => Date.now() + (durum?.zamanKaydirma ?? 0);
