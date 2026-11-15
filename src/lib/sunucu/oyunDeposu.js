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
    d
      .prepare(
        "SELECT level, gorevler_tamam, zaman_kaydirma, mutluluk, insan, cozulen_davalar, son_gocmen_kontrol FROM oyuncu_durumu WHERE kullanici_id = ?"
      )
      .bind(kullaniciId),
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
  const binaHaritasi = Object.fromEntries(binalar.results.map((b) => [b.bina_id, b.seviye]));
  if (binaHaritasi.kendi_evim == null) binaHaritasi.kendi_evim = 1;

  const tumKaynakSatirlari = Object.fromEntries(kaynaklar.results.map((k) => [k.kaynak, k]));
  const GERCEK_KAYNAKLAR = ["erzak", "kereste", "tas", "insan"];
  const envanter = {};
  const sonToplama = {};
  for (const k of GERCEK_KAYNAKLAR) {
    if (tumKaynakSatirlari[k]) {
      envanter[k] = tumKaynakSatirlari[k].envanter;
      sonToplama[k] = tumKaynakSatirlari[k].son_toplama;
    } else if (k !== "insan") {
      envanter[k] = 0;
      sonToplama[k] = simdi;
    }
  }
  if (envanter.insan == null) envanter.insan = o.insan ?? 5;
  if (o.level === 1 && !binaHaritasi.mektep && (envanter.erzak ?? 0) === 0 && (envanter.kereste ?? 0) === 0) {
    envanter.erzak = 150;
    envanter.kereste = 150;
  }

  const isciler = {
    erzak: tumKaynakSatirlari.isci_erzak?.envanter ?? 1,
    kereste: tumKaynakSatirlari.isci_kereste?.envanter ?? 1,
    tas: tumKaynakSatirlari.isci_tas?.envanter ?? 0,
  };
  const sonEtkilesim = {
    erzak: tumKaynakSatirlari.isci_erzak?.son_toplama ?? 0,
    kereste: tumKaynakSatirlari.isci_kereste?.son_toplama ?? 0,
    tas: tumKaynakSatirlari.isci_tas?.son_toplama ?? 0,
  };
  const mektupAlindi = tumKaynakSatirlari.mektup_durumu?.envanter ?? 0;

  let cozulenDavalar = [];
  try {
    cozulenDavalar = JSON.parse(o.cozulen_davalar || "[]");
  } catch {
    cozulenDavalar = [];
  }

  return {
    level: o.level,
    gorevlerTamam: !!o.gorevler_tamam,
    zamanKaydirma: o.zaman_kaydirma,
    mutluluk: o.mutluluk ?? 60,
    cozulenDavalar: Array.isArray(cozulenDavalar) ? cozulenDavalar : [],
    sonGocmenKontrol: o.son_gocmen_kontrol ?? 0,
    binalar: binaHaritasi,
    envanter,
    sonToplama,
    isciler,
    sonEtkilesim,
    mektupAlindi,
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
  const mutluluk = Math.min(100, Math.max(0, Number(durum.mutluluk ?? 60)));
  const insanSayisi = Math.max(0, Number(durum.envanter?.insan ?? 5));
  const cozulenJson = JSON.stringify(Array.isArray(durum.cozulenDavalar) ? durum.cozulenDavalar : []);
  const sonGocmen = Number(durum.sonGocmenKontrol || 0);

  const ifadeler = [
    d
      .prepare(
        `INSERT INTO oyuncu_durumu (kullanici_id, level, gorevler_tamam, zaman_kaydirma, mutluluk, insan, cozulen_davalar, son_gocmen_kontrol, guncelleme)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(kullanici_id) DO UPDATE SET
           level = ?2, gorevler_tamam = ?3, zaman_kaydirma = ?4,
           mutluluk = ?5, insan = ?6, cozulen_davalar = ?7, son_gocmen_kontrol = ?8, guncelleme = ?9`
      )
      .bind(
        kullaniciId,
        durum.level,
        durum.gorevlerTamam ? 1 : 0,
        durum.zamanKaydirma,
        mutluluk,
        insanSayisi,
        cozulenJson,
        sonGocmen,
        gercekSimdi
      ),
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
    ...["erzak", "kereste", "tas"].map((k) =>
      d
        .prepare(
          `INSERT INTO kaynaklar (kullanici_id, kaynak, envanter, son_toplama) VALUES (?1, ?2, ?3, ?4)
           ON CONFLICT(kullanici_id, kaynak) DO UPDATE SET envanter = ?3, son_toplama = ?4`
        )
        .bind(kullaniciId, `isci_${k}`, durum.isciler?.[k] ?? (k === "tas" ? 0 : 1), durum.sonEtkilesim?.[k] ?? 0)
    ),
    d
      .prepare(
        `INSERT INTO kaynaklar (kullanici_id, kaynak, envanter, son_toplama) VALUES (?1, 'mektup_durumu', ?2, 0)
         ON CONFLICT(kullanici_id, kaynak) DO UPDATE SET envanter = ?2, son_toplama = 0`
      )
      .bind(kullaniciId, durum.mektupAlindi ?? 0),
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
