import "server-only";
import { db } from "./db";
import { baslangicDurumu } from "@/lib/oyun/eylemler";
import { KARAKTERLER, KARAKTER_KODLARI } from "@/lib/oyun/sabitler";
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
    tas: tumKaynakSatirlari.isci_tas?.envanter ?? (o.level >= 2 ? 1 : 0),
  };
  const sonEtkilesim = {
    erzak: tumKaynakSatirlari.isci_erzak?.son_toplama ?? 0,
    kereste: tumKaynakSatirlari.isci_kereste?.son_toplama ?? 0,
    tas: tumKaynakSatirlari.isci_tas?.son_toplama ?? 0,
  };

  // Bağımsız 6 Tarla Parseli & 6 Taş Ocağı Kayası zaman damgaları
  // Satırın envanter sütunu: o parselin / kayanın ekildiği andaki işçi sayısı (verim bunun üzerinden hesaplanır)
  const tarlaSaha = {};
  const madenSaha = {};
  const tarlaIsci = {};
  const madenIsci = {};
  for (let i = 1; i <= 6; i++) {
    const t = tumKaynakSatirlari[`saha_tarla_${i}`];
    const m = tumKaynakSatirlari[`saha_maden_${i}`];
    if (t?.son_toplama) tarlaSaha[i] = t.son_toplama;
    if (m?.son_toplama) madenSaha[i] = m.son_toplama;
    if (Number(t?.envanter) > 0) tarlaIsci[i] = Number(t.envanter);
    if (Number(m?.envanter) > 0) madenIsci[i] = Number(m.envanter);
  }

  // Orman Keşif Seferi durumu
  const seferAna = tumKaynakSatirlari.orman_sefer;
  const seferDetay = tumKaynakSatirlari.orman_sefer_detay;
  const paketKod = Number(seferDetay?.son_toplama ?? 0);
  const ormanSefer = {
    gun: Number(seferAna?.son_toplama ?? 0),
    kullanilan: Number(seferAna?.envanter ?? 0),
    maske: Number(seferDetay?.envanter ?? 0),
    aktifBolge: Math.floor(paketKod / 10) - 1,
    sonSonuc: paketKod % 10,
  };

  const mektupAlindi = tumKaynakSatirlari.mektup_durumu?.envanter ?? 0;
  const mektupGunu = Number(tumKaynakSatirlari.mektup_durumu?.son_toplama ?? 0);
  const mektupNo = Number(tumKaynakSatirlari.mektup_no?.envanter ?? 0);
  const karakterIndeks = tumKaynakSatirlari.oyuncu_karakter?.envanter ?? 0;
  const karakter = KARAKTER_KODLARI[karakterIndeks] ?? "ahmet";
  const cinsiyet = KARAKTERLER[karakter]?.cinsiyet ?? "erkek";
  const sonMeydanOlayZamani = tumKaynakSatirlari.oyuncu_karakter?.son_toplama ?? 0;

  // Dinamik Huzur (Mutluluk) Mekanizması: Her 12 saatte bir ilgilenilmezse huzur -2 azalır (en az 25'e kadar)
  const sonHuzurKontrol = tumKaynakSatirlari.huzur_kontrol?.son_toplama ?? simdi;
  const gecenOnIkiSaat = Math.floor(Math.max(0, simdi - sonHuzurKontrol) / (12 * 60 * 60 * 1000));
  const hamMutluluk = o.mutluluk ?? 60;
  const guncelMutluluk =
    gecenOnIkiSaat > 0 ? Math.max(25, hamMutluluk - gecenOnIkiSaat * 2) : hamMutluluk;
  const guncelHuzurKontrol =
    gecenOnIkiSaat > 0 ? sonHuzurKontrol + gecenOnIkiSaat * 12 * 60 * 60 * 1000 : sonHuzurKontrol;

  let cozulenDavalar = [];
  try {
    cozulenDavalar = JSON.parse(o.cozulen_davalar || "[]");
  } catch {
    cozulenDavalar = [];
  }

  return {
    level: o.level,
    cinsiyet,
    karakter,
    gorevlerTamam: !!o.gorevler_tamam,
    zamanKaydirma: o.zaman_kaydirma,
    mutluluk: guncelMutluluk,
    sonHuzurKontrol: guncelHuzurKontrol,
    cozulenDavalar: Array.isArray(cozulenDavalar) ? cozulenDavalar : [],
    sonGocmenKontrol: o.son_gocmen_kontrol ?? 0,
    sonMeydanOlayZamani,
    binalar: binaHaritasi,
    envanter,
    sonToplama,
    isciler,
    sonEtkilesim,
    sahaDurumu: { tarla: tarlaSaha, maden: madenSaha, tarlaIsci, madenIsci },
    ormanSefer,
    mektupAlindi,
    mektupGunu,
    mektupNo,
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
  const tarlaSaha = durum.sahaDurumu?.tarla ?? {};
  const madenSaha = durum.sahaDurumu?.maden ?? {};
  const tarlaIsci = durum.sahaDurumu?.tarlaIsci ?? {};
  const madenIsci = durum.sahaDurumu?.madenIsci ?? {};
  const oSefer = durum.ormanSefer ?? { gun: 0, kullanilan: 0, maske: 0, sonSonuc: 0, aktifBolge: -1 };
  const paketKod = (Math.max(-1, Number(oSefer.aktifBolge ?? -1)) + 1) * 10 + (Number(oSefer.sonSonuc || 0) % 10);

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
    ...[1, 2, 3, 4, 5, 6].map((i) =>
      d
        .prepare(
          `INSERT INTO kaynaklar (kullanici_id, kaynak, envanter, son_toplama) VALUES (?1, ?2, ?4, ?3)
           ON CONFLICT(kullanici_id, kaynak) DO UPDATE SET son_toplama = ?3, envanter = ?4`
        )
        .bind(kullaniciId, `saha_tarla_${i}`, Number(tarlaSaha[i] || 0), Number(tarlaIsci[i] || 0))
    ),
    ...[1, 2, 3, 4, 5, 6].map((i) =>
      d
        .prepare(
          `INSERT INTO kaynaklar (kullanici_id, kaynak, envanter, son_toplama) VALUES (?1, ?2, ?4, ?3)
           ON CONFLICT(kullanici_id, kaynak) DO UPDATE SET son_toplama = ?3, envanter = ?4`
        )
        .bind(kullaniciId, `saha_maden_${i}`, Number(madenSaha[i] || 0), Number(madenIsci[i] || 0))
    ),
    d
      .prepare(
        `INSERT INTO kaynaklar (kullanici_id, kaynak, envanter, son_toplama) VALUES (?1, 'orman_sefer', ?2, ?3)
         ON CONFLICT(kullanici_id, kaynak) DO UPDATE SET envanter = ?2, son_toplama = ?3`
      )
      .bind(kullaniciId, Number(oSefer.kullanilan || 0), Number(oSefer.gun || 0)),
    d
      .prepare(
        `INSERT INTO kaynaklar (kullanici_id, kaynak, envanter, son_toplama) VALUES (?1, 'orman_sefer_detay', ?2, ?3)
         ON CONFLICT(kullanici_id, kaynak) DO UPDATE SET envanter = ?2, son_toplama = ?3`
      )
      .bind(kullaniciId, Number(oSefer.maske || 0), paketKod),
    d
      .prepare(
        `INSERT INTO kaynaklar (kullanici_id, kaynak, envanter, son_toplama) VALUES (?1, 'mektup_durumu', ?2, ?3)
         ON CONFLICT(kullanici_id, kaynak) DO UPDATE SET envanter = ?2, son_toplama = ?3`
      )
      .bind(kullaniciId, durum.mektupAlindi ?? 0, Number(durum.mektupGunu || 0)),
    d
      .prepare(
        `INSERT INTO kaynaklar (kullanici_id, kaynak, envanter, son_toplama) VALUES (?1, 'mektup_no', ?2, 0)
         ON CONFLICT(kullanici_id, kaynak) DO UPDATE SET envanter = ?2`
      )
      .bind(kullaniciId, Number(durum.mektupNo || 0)),
    d
      .prepare(
        `INSERT INTO kaynaklar (kullanici_id, kaynak, envanter, son_toplama) VALUES (?1, 'oyuncu_karakter', ?2, ?3)
         ON CONFLICT(kullanici_id, kaynak) DO UPDATE SET envanter = ?2, son_toplama = ?3`
      )
      .bind(
        kullaniciId,
        Math.max(0, KARAKTER_KODLARI.indexOf(durum.karakter ?? "ahmet")),
        durum.sonMeydanOlayZamani ?? 0
      ),
    d
      .prepare(
        `INSERT INTO kaynaklar (kullanici_id, kaynak, envanter, son_toplama) VALUES (?1, 'huzur_kontrol', 0, ?2)
         ON CONFLICT(kullanici_id, kaynak) DO UPDATE SET son_toplama = ?2`
      )
      .bind(kullaniciId, durum.sonHuzurKontrol ?? simdi),
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
export async function durumGetir(kullaniciId, cinsiyet = "erkek", karakter = null) {
  const mevcut = await durumOku(kullaniciId);
  if (mevcut) return mevcut;
  const yeni = baslangicDurumu(Date.now(), cinsiyet, karakter);
  await durumYaz(kullaniciId, yeni);
  return yeni;
}
