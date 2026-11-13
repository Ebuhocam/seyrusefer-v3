import { db } from "@/lib/sunucu/db";
import { durumGetir, durumYaz, oyunSaati } from "@/lib/sunucu/oyunDeposu";
import { oyunAyarlariniGetir } from "@/lib/sunucu/ayarlarDeposu";
import { govde, hata, oturumZorunlu, oyunYaniti } from "@/lib/sunucu/api";
import { BIRLIK_ACILIS_LEVEL, ALAN_MUCADELESI_LEVEL, BIRLIK_BINALARI, BOLGELER } from "@/lib/oyun/sabitler";
import { bedelKontrol } from "@/lib/oyun/kurallar";
import { oyunGunu } from "@/lib/oyun/gorevler";

const BAGIS_KAYNAKLARI = new Set(["erzak", "kereste", "tas"]);

async function birlikDurumuGetir(kullaniciId, bugun) {
  const d = await db();
  const uyelik = await d
    .prepare(
      `SELECT b.id, b.ad, b.slogan, b.renk, b.lider_id, b.erzak, b.kereste, b.tas,
              u.bagis_toplam, u.katki_puani
         FROM birlik_uyeleri u
         JOIN birlikler b ON b.id = u.birlik_id
        WHERE u.kullanici_id = ?`
    )
    .bind(kullaniciId)
    .first();

  // Tüm bölgelerin sıralaması
  const hamleler = await d
    .prepare(
      `SELECT h.bolge_id, h.birlik_id, h.guc, h.hamle_sayisi, b.ad AS birlik_ad, b.renk AS birlik_renk
         FROM bolge_hamleleri h
         JOIN birlikler b ON b.id = h.birlik_id
        ORDER BY h.guc DESC`
    )
    .all();

  const bolgeHaritasi = {};
  for (const h of hamleler.results ?? []) {
    (bolgeHaritasi[h.bolge_id] ??= []).push(h);
  }

  const bolgeler = BOLGELER.map((b) => {
    const siralama = bolgeHaritasi[b.id] ?? [];
    const lider = siralama[0] ?? null;
    const bizim = uyelik ? siralama.find((s) => s.birlik_id === uyelik.id) ?? null : null;
    return {
      ...b,
      lider: lider ? { birlikId: lider.birlik_id, ad: lider.birlik_ad, renk: lider.birlik_renk, guc: lider.guc } : null,
      bizimGuc: bizim?.guc ?? 0,
      siralama: siralama.slice(0, 5),
    };
  });

  if (!uyelik) {
    const acikBirlikler = await d
      .prepare(
        `SELECT b.id, b.ad, b.slogan, b.renk, COUNT(u.kullanici_id) AS uye_sayisi
           FROM birlikler b
           LEFT JOIN birlik_uyeleri u ON u.birlik_id = b.id
          GROUP BY b.id
          ORDER BY uye_sayisi DESC, b.id DESC
          LIMIT 30`
      )
      .all();
    return { birlik: null, acikBirlikler: acikBirlikler.results ?? [], bolgeler };
  }

  const [uyeler, gonderilenTesvikler, gelenTesvikler, binalarSor, mesajlarSor] = await d.batch([
    d
      .prepare(
        `SELECT k.id, k.ad, k.kullanici_adi, COALESCE(od.level, 1) AS level,
                u.bagis_toplam, u.katki_puani,
                COALESCE(nc.sabah + nc.ogle + nc.ikindi + nc.aksam + nc.yatsi, 0) AS bugun_namaz,
                EXISTS(
                  SELECT 1 FROM gorev_ilerlemesi gi
                   WHERE gi.kullanici_id = k.id AND gi.son_gun = ?2
                  UNION
                  SELECT 1 FROM namaz_cetelesi nc2
                   WHERE nc2.kullanici_id = k.id AND nc2.tarih = ?2
                     AND (nc2.sabah + nc2.ogle + nc2.ikindi + nc2.aksam + nc2.yatsi) > 0
                ) AS bugun_aktif
           FROM birlik_uyeleri u
           JOIN kullanicilar k ON k.id = u.kullanici_id
           LEFT JOIN oyuncu_durumu od ON od.kullanici_id = k.id
           LEFT JOIN namaz_cetelesi nc ON nc.kullanici_id = k.id AND nc.tarih = ?2
          WHERE u.birlik_id = ?1
          ORDER BY u.katki_puani DESC, u.bagis_toplam DESC`
      )
      .bind(uyelik.id, bugun),
    d
      .prepare("SELECT alici_id FROM birlik_tesvikler WHERE gonderen_id = ? AND gun = ?")
      .bind(kullaniciId, bugun),
    d
      .prepare(
        `SELECT t.id, t.karsilandi, k.ad AS gonderen_ad
           FROM birlik_tesvikler t
           JOIN kullanicilar k ON k.id = t.gonderen_id
          WHERE t.alici_id = ? AND t.gun = ?`
      )
      .bind(kullaniciId, bugun),
    d.prepare("SELECT bina_id, seviye FROM birlik_binalari WHERE birlik_id = ?").bind(uyelik.id),
    d
      .prepare(
        `SELECT m.id, m.kullanici_id, m.mesaj, m.olusturma, k.ad AS yazar_ad
           FROM birlik_mesajlari m
           JOIN kullanicilar k ON k.id = m.kullanici_id
          WHERE m.birlik_id = ?
          ORDER BY m.olusturma DESC
          LIMIT 40`
      )
      .bind(uyelik.id),
  ]);

  const tesvikEdilenler = new Set((gonderilenTesvikler.results ?? []).map((t) => t.alici_id));
  const uyeListesi = (uyeler.results ?? []).map((u) => ({
    id: u.id,
    ad: u.ad,
    kullaniciAdi: u.kullanici_adi,
    level: u.level,
    bagisToplam: u.bagis_toplam,
    katkiPuani: u.katki_puani,
    bugunNamaz: u.bugun_namaz ?? 0,
    bugunAktif: !!u.bugun_aktif,
    bugunTesvikEdildi: tesvikEdilenler.has(u.id),
  }));

  const binalar = Object.fromEntries(Object.keys(BIRLIK_BINALARI).map((k) => [k, 1]));
  for (const b of binalarSor.results ?? []) {
    binalar[b.bina_id] = b.seviye;
  }

  const aktifSayisi = uyeListesi.filter((u) => u.bugunAktif).length;
  const disiplinOrani = uyeListesi.length ? Math.round((aktifSayisi / uyeListesi.length) * 100) : 0;
  const namazToplam = uyeListesi.reduce((t, u) => t + (u.bugunNamaz || 0), 0);

  return {
    birlik: {
      id: uyelik.id,
      ad: uyelik.ad,
      slogan: uyelik.slogan,
      renk: uyelik.renk,
      liderId: uyelik.lider_id,
      kasa: { erzak: uyelik.erzak, kereste: uyelik.kereste, tas: uyelik.tas },
      binalar,
      mesajlar: (mesajlarSor.results ?? []).reverse(),
      namazToplam,
      disiplinOrani,
      uyeler: uyeListesi,
      gelenTesvikler: gelenTesvikler.results ?? [],
    },
    acikBirlikler: [],
    bolgeler,
  };
}

export async function GET() {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  const durum = await durumGetir(kullanici.id);
  const bugun = oyunGunu(oyunSaati(durum));
  return Response.json(await birlikDurumuGetir(kullanici.id, bugun));
}

export async function POST(request) {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;

  const g = await govde(request);
  const [durum, ayarlar] = await Promise.all([durumGetir(kullanici.id), oyunAyarlariniGetir()]);
  const simdi = oyunSaati(durum);
  const bugun = oyunGunu(simdi);

  if (durum.level < BIRLIK_ACILIS_LEVEL) {
    return hata(`Birlik sistemi Level ${BIRLIK_ACILIS_LEVEL}'te açılır.`);
  }

  const d = await db();

  if (g.eylem === "kur") {
    const ad = String(g.ad ?? "").trim();
    const slogan = String(g.slogan ?? "").trim().slice(0, 80);
    const renk = /^#[0-9a-fA-F]{6}$/.test(g.renk) ? g.renk : "#d97706";
    if (ad.length < 3 || ad.length > 28) return hata("Birlik adı 3-28 karakter olmalı.");

    const mevcut = await d.prepare("SELECT 1 FROM birlik_uyeleri WHERE kullanici_id = ?").bind(kullanici.id).first();
    if (mevcut) return hata("Zaten bir birliğin üyesisin.");

    const cakisma = await d.prepare("SELECT 1 FROM birlikler WHERE LOWER(ad) = LOWER(?)").bind(ad).first();
    if (cakisma) return hata("Bu birlik adı zaten kullanılıyor.", 409);

    const yeni = await d
      .prepare("INSERT INTO birlikler (ad, slogan, renk, lider_id, olusturma) VALUES (?, ?, ?, ?, ?) RETURNING id")
      .bind(ad, slogan, renk, kullanici.id, Date.now())
      .first();

    await d
      .prepare("INSERT INTO birlik_uyeleri (kullanici_id, birlik_id, katilma) VALUES (?, ?, ?)")
      .bind(kullanici.id, yeni.id, Date.now())
      .run();
  } else if (g.eylem === "katil") {
    const birlikId = Number(g.birlikId);
    const b = await d.prepare("SELECT id FROM birlikler WHERE id = ?").bind(birlikId).first();
    if (!b) return hata("Birlik bulunamadı.", 404);

    const mevcut = await d.prepare("SELECT 1 FROM birlik_uyeleri WHERE kullanici_id = ?").bind(kullanici.id).first();
    if (mevcut) return hata("Zaten bir birliğin üyesisin.");

    await d
      .prepare("INSERT INTO birlik_uyeleri (kullanici_id, birlik_id, katilma) VALUES (?, ?, ?)")
      .bind(kullanici.id, birlikId, Date.now())
      .run();
  } else if (g.eylem === "ayril") {
    const uyelik = await d
      .prepare("SELECT birlik_id FROM birlik_uyeleri WHERE kullanici_id = ?")
      .bind(kullanici.id)
      .first();
    if (!uyelik) return hata("Herhangi bir birliğe üye değilsin.");

    await d.prepare("DELETE FROM birlik_uyeleri WHERE kullanici_id = ?").bind(kullanici.id).run();
    const kalan = await d
      .prepare("SELECT kullanici_id FROM birlik_uyeleri WHERE birlik_id = ? ORDER BY katilma ASC LIMIT 1")
      .bind(uyelik.birlik_id)
      .first();
    if (!kalan) {
      await d.prepare("DELETE FROM birlikler WHERE id = ?").bind(uyelik.birlik_id).run();
    } else {
      await d.prepare("UPDATE birlikler SET lider_id = ? WHERE id = ?").bind(kalan.kullanici_id, uyelik.birlik_id).run();
    }
  } else if (g.eylem === "bagis") {
    const kaynak = g.kaynak;
    const miktar = Math.floor(Number(g.miktar) || 0);
    if (!BAGIS_KAYNAKLARI.has(kaynak) || miktar <= 0) return hata("Geçerli bir kaynak (Mahsul, Tahta, Taş) ve miktar girin.");
    if ((durum.envanter[kaynak] ?? 0) < miktar) return hata("Envanterinde yeterli kaynak yok.");

    const uyelik = await d
      .prepare("SELECT birlik_id FROM birlik_uyeleri WHERE kullanici_id = ?")
      .bind(kullanici.id)
      .first();
    if (!uyelik) return hata("Önce bir birliğe katılmalısın.");

    durum.envanter[kaynak] -= miktar;
    await durumYaz(kullanici.id, durum);

    await d.batch([
      d
        .prepare(`UPDATE birlikler SET ${kaynak} = ${kaynak} + ? WHERE id = ?`)
        .bind(miktar, uyelik.birlik_id),
      d
        .prepare(
          "UPDATE birlik_uyeleri SET bagis_toplam = bagis_toplam + ?1, katki_puani = katki_puani + ?2 WHERE kullanici_id = ?3"
        )
        .bind(miktar, Math.max(1, Math.floor(miktar / 10)), kullanici.id),
    ]);
  } else if (g.eylem === "mesajYaz") {
    const mesaj = String(g.mesaj ?? "").trim();
    if (mesaj.length < 2 || mesaj.length > 280) return hata("Mesaj 2-280 karakter olmalı.");

    const uyelik = await d
      .prepare("SELECT birlik_id FROM birlik_uyeleri WHERE kullanici_id = ?")
      .bind(kullanici.id)
      .first();
    if (!uyelik) return hata("Önce bir birliğe katılmalısın.");

    await d.batch([
      d
        .prepare("INSERT INTO birlik_mesajlari (birlik_id, kullanici_id, mesaj, olusturma) VALUES (?, ?, ?, ?)")
        .bind(uyelik.birlik_id, kullanici.id, mesaj, Date.now()),
      d.prepare("UPDATE birlik_uyeleri SET katki_puani = katki_puani + 2 WHERE kullanici_id = ?").bind(kullanici.id),
    ]);
  } else if (g.eylem === "binaYukselt") {
    const binaId = g.binaId;
    const tanim = BIRLIK_BINALARI[binaId];
    if (!tanim) return hata("Geçersiz birlik binası.");

    const veri = await birlikDurumuGetir(kullanici.id, bugun);
    if (!veri.birlik) return hata("Önce bir birliğe katılmalısın.");

    const mevcutSeviye = veri.birlik.binalar?.[binaId] ?? 1;
    if (mevcutSeviye >= tanim.maksSeviye) return hata("Bu birlik binası zaten en üst seviyede.");

    const hedefSeviye = mevcutSeviye + 1;
    const bedel = tanim.bedel?.[hedefSeviye] ?? {};
    const kontrol = bedelKontrol(bedel, veri.birlik.kasa);
    if (!kontrol.yeterli) {
      return hata("Birlik kasasında (ortak vergi sandığında) bu yükseltme için yeterli kaynak yok.");
    }

    await d.batch([
      d
        .prepare("UPDATE birlikler SET erzak = erzak - ?, kereste = kereste - ?, tas = tas - ? WHERE id = ?")
        .bind(bedel.erzak ?? 0, bedel.kereste ?? 0, bedel.tas ?? 0, veri.birlik.id),
      d
        .prepare(
          `INSERT INTO birlik_binalari (birlik_id, bina_id, seviye) VALUES (?1, ?2, ?3)
           ON CONFLICT(birlik_id, bina_id) DO UPDATE SET seviye = ?3`
        )
        .bind(veri.birlik.id, binaId, hedefSeviye),
      d.prepare("UPDATE birlik_uyeleri SET katki_puani = katki_puani + 20 WHERE kullanici_id = ?").bind(kullanici.id),
    ]);
  } else if (g.eylem === "tesvik") {
    const aliciId = Number(g.aliciId);
    if (!aliciId || aliciId === kullanici.id) return hata("Geçersiz hedef öğrenci.");

    const [gonderenUye, aliciUye] = await d.batch([
      d.prepare("SELECT birlik_id FROM birlik_uyeleri WHERE kullanici_id = ?").bind(kullanici.id),
      d.prepare("SELECT birlik_id FROM birlik_uyeleri WHERE kullanici_id = ?").bind(aliciId),
    ]);
    const bId = gonderenUye.results[0]?.birlik_id;
    if (!bId || bId !== aliciUye.results[0]?.birlik_id) {
      return hata("Sadece kendi birliğindeki arkadaşlarını teşvik edebilirsin.");
    }

    const var_ = await d
      .prepare("SELECT 1 FROM birlik_tesvikler WHERE gonderen_id = ? AND alici_id = ? AND gun = ?")
      .bind(kullanici.id, aliciId, bugun)
      .first();
    if (var_) return hata("Bu arkadaşına bugün zaten teşvik gönderdin.");

    await d.batch([
      d
        .prepare("INSERT INTO birlik_tesvikler (birlik_id, gonderen_id, alici_id, gun, olusturma) VALUES (?, ?, ?, ?, ?)")
        .bind(bId, kullanici.id, aliciId, bugun, Date.now()),
      d.prepare("UPDATE birlik_uyeleri SET katki_puani = katki_puani + 5 WHERE kullanici_id = ?").bind(kullanici.id),
    ]);
  } else if (g.eylem === "fetihHamlesi") {
    if (durum.level < ALAN_MUCADELESI_LEVEL) {
      return hata(`Alan Mücadelesi Level ${ALAN_MUCADELESI_LEVEL}'da açılır.`);
    }
    const bolge = BOLGELER.find((b) => b.id === g.bolgeId);
    if (!bolge) return hata("Geçersiz bölge.");

    const veri = await birlikDurumuGetir(kullanici.id, bugun);
    if (!veri.birlik) return hata("Önce bir birliğe katılmalısın.");

    const kontrol = bedelKontrol(bolge.bedel, veri.birlik.kasa);
    if (!kontrol.yeterli) return hata("Birlik kasasında bu hamle için yeterli kaynak yok.");

    // Manevi güç: temel güç * (1 + disiplinOrani/100) + üye katkı bonusu
    const toplamKatki = veri.birlik.uyeler.reduce((t, u) => t + u.katkiPuani, 0);
    const disiplinCarpani = 1 + veri.birlik.disiplinOrani / 100;
    const kazanilanGuc = Math.round(bolge.temelGuc * disiplinCarpani) + Math.min(200, Math.floor(toplamKatki / 5));

    await d.batch([
      d
        .prepare("UPDATE birlikler SET erzak = erzak - ?, kereste = kereste - ?, tas = tas - ? WHERE id = ?")
        .bind(bolge.bedel.erzak ?? 0, bolge.bedel.kereste ?? 0, bolge.bedel.tas ?? 0, veri.birlik.id),
      d
        .prepare(
          `INSERT INTO bolge_hamleleri (bolge_id, birlik_id, guc, hamle_sayisi, guncelleme)
           VALUES (?1, ?2, ?3, 1, ?4)
           ON CONFLICT(bolge_id, birlik_id) DO UPDATE SET
             guc = bolge_hamleleri.guc + ?3,
             hamle_sayisi = bolge_hamleleri.hamle_sayisi + 1,
             guncelleme = ?4`
        )
        .bind(bolge.id, veri.birlik.id, kazanilanGuc, Date.now()),
      d.prepare("UPDATE birlik_uyeleri SET katki_puani = katki_puani + 15 WHERE kullanici_id = ?").bind(kullanici.id),
    ]);
  } else {
    return hata("Bilinmeyen birlik eylemi.");
  }

  const guncelBirlik = await birlikDurumuGetir(kullanici.id, bugun);
  return oyunYaniti(kullanici, durum, guncelBirlik, ayarlar);
}
