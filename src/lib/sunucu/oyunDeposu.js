import "server-only";
import { db } from "./db";
import { baslangicDurumu } from "@/lib/oyun/eylemler";
import { levelGorevTanimlari, oyunGunu } from "@/lib/oyun/gorevler";

const BOS_NAMAZ = { sabah: 0, ogle: 0, ikindi: 0, aksam: 0, yatsi: 0 };

/** Oyun saati: sunucu saati + (geliştirici) zaman kaydırması */
export const oyunSaati = (durum) => Date.now() + (durum?.zamanKaydirma ?? 0);

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

  const simdi = Date.now() + (o.zaman_kaydirma ?? 0);
  const bugun = oyunGunu(simdi);

  const [gorevler, namaz] = await d.batch([
    d
      .prepare("SELECT gorev_kodu, ilerleme, son_gun FROM gorev_ilerlemesi WHERE kullanici_id = ? AND level = ?")
      .bind(kullaniciId, o.level),
    d
      .prepare("SELECT sabah, ogle, ikindi, aksam, yatsi FROM namaz_cetelesi WHERE kullanici_id = ? AND tarih = ?")
      .bind(kullaniciId, bugun),
  ]);

  const n = namaz.results[0];
  return {
    level: o.level,
    gorevlerTamam: !!o.gorevler_tamam,
    zamanKaydirma: o.zaman_kaydirma,
    binalar: Object.fromEntries(binalar.results.map((b) => [b.bina_id, b.seviye])),
    envanter: Object.fromEntries(kaynaklar.results.map((k) => [k.kaynak, k.envanter])),
    sonToplama: Object.fromEntries(kaynaklar.results.map((k) => [k.kaynak, k.son_toplama])),
    gorevIlerlemesi: Object.fromEntries(
      gorevler.results.map((g) => [g.gorev_kodu, { ilerleme: g.ilerleme, sonGun: g.son_gun }])
    ),
    bugunNamaz: n
      ? { sabah: n.sabah, ogle: n.ogle, ikindi: n.ikindi, aksam: n.aksam, yatsi: n.yatsi }
      : { ...BOS_NAMAZ },
  };
}

/** Durumu tek bir toplu işlemle (atomik) yazar */
export async function durumYaz(kullaniciId, durum, islemSaati = null, ayarlar = null) {
  const d = await db();
  const gercekSimdi = Date.now();
  const simdi = islemSaati ?? oyunSaati(durum);
  const bugun = oyunGunu(simdi);
  const tanimlar = Object.fromEntries(levelGorevTanimlari(durum.level, ayarlar).map((t) => [t.kod, t]));
  const n = durum.bugunNamaz ?? BOS_NAMAZ;

  const ifadeler = [
    d
      .prepare(
        `INSERT INTO oyuncu_durumu (kullanici_id, level, gorevler_tamam, zaman_kaydirma, guncelleme)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(kullanici_id) DO UPDATE SET level = ?2, gorevler_tamam = ?3, zaman_kaydirma = ?4, guncelleme = ?5`
      )
      .bind(kullaniciId, durum.level, durum.gorevlerTamam ? 1 : 0, durum.zamanKaydirma, gercekSimdi),
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
    ...Object.entries(durum.gorevIlerlemesi ?? {}).map(([kod, kayit]) => {
      const hedef = tanimlar[kod]?.hedef ?? 1;
      const tamamlandi = kayit.ilerleme >= hedef ? gercekSimdi : null;
      return d
        .prepare(
          `INSERT INTO gorev_ilerlemesi (kullanici_id, level, gorev_kodu, ilerleme, son_gun, tamamlandi, guncelleme)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
           ON CONFLICT(kullanici_id, level, gorev_kodu) DO UPDATE SET
             ilerleme = ?4, son_gun = ?5, tamamlandi = COALESCE(gorev_ilerlemesi.tamamlandi, ?6), guncelleme = ?7`
        )
        .bind(kullaniciId, durum.level, kod, kayit.ilerleme, kayit.sonGun ?? null, tamamlandi, gercekSimdi);
    }),
    d
      .prepare(
        `INSERT INTO namaz_cetelesi (kullanici_id, tarih, sabah, ogle, ikindi, aksam, yatsi, guncelleme)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(kullanici_id, tarih) DO UPDATE SET
           sabah = ?3, ogle = ?4, ikindi = ?5, aksam = ?6, yatsi = ?7, guncelleme = ?8`
      )
      .bind(kullaniciId, bugun, n.sabah ? 1 : 0, n.ogle ? 1 : 0, n.ikindi ? 1 : 0, n.aksam ? 1 : 0, n.yatsi ? 1 : 0, gercekSimdi),
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
