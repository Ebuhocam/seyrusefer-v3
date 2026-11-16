import { db } from "@/lib/sunucu/db";
import { durumGetir, durumYaz, oyunSaati } from "@/lib/sunucu/oyunDeposu";
import { oyunAyarlariniGetir, tesvikOdulunuKontrolEt } from "@/lib/sunucu/ayarlarDeposu";
import { govde, hata, oturumZorunlu, oyunYaniti } from "@/lib/sunucu/api";
import { gorevIlerlet } from "@/lib/oyun/eylemler";
import { oyunGunu } from "@/lib/oyun/gorevler";
import { KARAKTER_KODLARI } from "@/lib/oyun/sabitler";

async function sosyalTablolariHazirla(d) {
  await d.batch([
    d.prepare(
      `CREATE TABLE IF NOT EXISTS meydan_begeniler (
         paylasim_id  INTEGER NOT NULL,
         kullanici_id INTEGER NOT NULL,
         olusturma    INTEGER NOT NULL,
         PRIMARY KEY (paylasim_id, kullanici_id)
       )`
    ),
    d.prepare(
      `CREATE TABLE IF NOT EXISTS meydan_sikayetler (
         id           INTEGER PRIMARY KEY AUTOINCREMENT,
         paylasim_id  INTEGER NOT NULL,
         kullanici_id INTEGER NOT NULL,
         sebep        TEXT    NOT NULL,
         olusturma    INTEGER NOT NULL
       )`
    ),
  ]);
}

function icerikCoz(hamIcerik) {
  const dizge = String(hamIcerik ?? "");
  if (dizge.startsWith("{")) {
    try {
      const veri = JSON.parse(dizge);
      if (veri && typeof veri.metin === "string") {
        return {
          metin: veri.metin,
          kategori: veri.kategori === "serbest" ? "serbest" : "gundem",
          altTur: veri.altTur || "soz",
          medyaUrl: veri.medyaUrl || "",
        };
      }
    } catch {
      // düz metin olarak devam et
    }
  }
  return {
    metin: dizge,
    kategori: "gundem",
    altTur: "soz",
    medyaUrl: "",
  };
}

async function paylasimlariGetir(level, aktifKullaniciId) {
  const d = await db();
  await sosyalTablolariHazirla(d);

  // Hem bu levelın hem de serbest paylaşımların son 35 kaydını getir
  const paylasimlar = await d
    .prepare(
      `SELECT p.id, p.kullanici_id AS yazar_id, p.level, p.icerik, p.olusturma,
              k.ad AS yazar_ad, k.kullanici_adi AS yazar_kullanici,
              COALESCE(od.level, 1) AS yazar_level,
              COALESCE(od.mutluluk, 60) AS yazar_mutluluk,
              COALESCE(kr.envanter, 0) AS yazar_karakter_idx
         FROM meydan_paylasimlari p
         JOIN kullanicilar k ON k.id = p.kullanici_id
         LEFT JOIN oyuncu_durumu od ON od.kullanici_id = p.kullanici_id
         LEFT JOIN kaynaklar kr ON kr.kullanici_id = p.kullanici_id AND kr.kaynak = 'oyuncu_karakter'
        ORDER BY p.olusturma DESC
        LIMIT 35`
    )
    .all();

  if (!paylasimlar.results.length) return [];

  const idler = paylasimlar.results.map((p) => p.id);
  const yerTutucular = idler.map(() => "?").join(",");

  const [yorumlar, begeniler] = await d.batch([
    d
      .prepare(
        `SELECT y.id, y.paylasim_id, y.kullanici_id AS yazar_id, y.icerik, y.olusturma,
                k.ad AS yazar_ad, k.kullanici_adi AS yazar_kullanici,
                COALESCE(kr.envanter, 0) AS yazar_karakter_idx
           FROM meydan_yorumlar y
           JOIN kullanicilar k ON k.id = y.kullanici_id
           LEFT JOIN kaynaklar kr ON kr.kullanici_id = y.kullanici_id AND kr.kaynak = 'oyuncu_karakter'
          WHERE y.paylasim_id IN (${yerTutucular})
          ORDER BY y.olusturma ASC`
      )
      .bind(...idler),
    d
      .prepare(
        `SELECT paylasim_id, kullanici_id
           FROM meydan_begeniler
          WHERE paylasim_id IN (${yerTutucular})`
      )
      .bind(...idler),
  ]);

  const yorumHaritasi = {};
  for (const y of yorumlar.results) {
    (yorumHaritasi[y.paylasim_id] ??= []).push({
      ...y,
      yazar_karakter: KARAKTER_KODLARI[y.yazar_karakter_idx] ?? "alp",
    });
  }

  const begeniSayiHaritasi = {};
  const benBegendimHaritasi = {};
  for (const b of begeniler.results) {
    begeniSayiHaritasi[b.paylasim_id] = (begeniSayiHaritasi[b.paylasim_id] ?? 0) + 1;
    if (b.kullanici_id === aktifKullaniciId) {
      benBegendimHaritasi[b.paylasim_id] = true;
    }
  }

  return paylasimlar.results.map((p) => {
    const cozulmus = icerikCoz(p.icerik);
    return {
      id: p.id,
      level: p.level,
      olusturma: p.olusturma,
      yazar_id: p.yazar_id,
      yazar_ad: p.yazar_ad,
      yazar_kullanici: p.yazar_kullanici,
      yazar_level: p.yazar_level,
      yazar_mutluluk: p.yazar_mutluluk,
      yazar_karakter: KARAKTER_KODLARI[p.yazar_karakter_idx] ?? "alp",
      icerik: cozulmus.metin,
      kategori: cozulmus.kategori,
      altTur: cozulmus.altTur,
      medyaUrl: cozulmus.medyaUrl,
      begeniSayisi: begeniSayiHaritasi[p.id] ?? 0,
      benBegendim: Boolean(benBegendimHaritasi[p.id]),
      yorumlar: yorumHaritasi[p.id] ?? [],
    };
  });
}

export async function GET(request) {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  const durum = await durumGetir(kullanici.id);
  const istenenLevel = Number(request.nextUrl.searchParams.get("level")) || durum.level;
  return Response.json({ paylasimlar: await paylasimlariGetir(istenenLevel, kullanici.id) });
}

export async function POST(request) {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;

  const { tur, icerik, paylasimId, kategori, altTur, medyaUrl, sebep } = await govde(request);
  const d = await db();
  await sosyalTablolariHazirla(d);

  let [durum, ayarlar] = await Promise.all([durumGetir(kullanici.id), oyunAyarlariniGetir()]);
  const simdi = oyunSaati(durum);

  // 1. BEĞENİ İŞLEMİ (+1 Köy Huzuru paylaşım sahibine!)
  if (tur === "begeni") {
    const p = await d
      .prepare("SELECT id, kullanici_id FROM meydan_paylasimlari WHERE id = ?")
      .bind(Number(paylasimId))
      .first();
    if (!p) return hata("Paylaşım bulunamadı", 404);

    const mevcutBegeni = await d
      .prepare("SELECT 1 FROM meydan_begeniler WHERE paylasim_id = ? AND kullanici_id = ?")
      .bind(p.id, kullanici.id)
      .first();

    if (mevcutBegeni) {
      await d
        .prepare("DELETE FROM meydan_begeniler WHERE paylasim_id = ? AND kullanici_id = ?")
        .bind(p.id, kullanici.id)
        .run();
    } else {
      await d
        .prepare("INSERT INTO meydan_begeniler (paylasim_id, kullanici_id, olusturma) VALUES (?, ?, ?)")
        .bind(p.id, kullanici.id, Date.now())
        .run();

      // Beğeni alan öğrencinin Köy Huzuru +1 artar!
      if (p.kullanici_id === kullanici.id) {
        durum = { ...durum, mutluluk: Math.min(100, (durum.mutluluk ?? 60) + 1) };
        await durumYaz(kullanici.id, durum);
      } else {
        await d
          .prepare("UPDATE oyuncu_durumu SET mutluluk = MIN(100, COALESCE(mutluluk, 60) + 1) WHERE kullanici_id = ?")
          .bind(p.kullanici_id)
          .run();
      }
    }

    return oyunYaniti(
      kullanici,
      durum,
      { paylasimlar: await paylasimlariGetir(durum.level, kullanici.id) },
      ayarlar
    );
  }

  // 2. YÖNETİCİYE ŞİKAYET İŞLEMİ
  if (tur === "sikayet") {
    const p = await d.prepare("SELECT id FROM meydan_paylasimlari WHERE id = ?").bind(Number(paylasimId)).first();
    if (!p) return hata("Paylaşım bulunamadı", 404);
    const temizSebep = String(sebep ?? "Uygunsuz içerik").trim().slice(0, 200);
    await d
      .prepare("INSERT INTO meydan_sikayetler (paylasim_id, kullanici_id, sebep, olusturma) VALUES (?, ?, ?, ?)")
      .bind(p.id, kullanici.id, temizSebep, Date.now())
      .run();

    return oyunYaniti(
      kullanici,
      durum,
      {
        bildirim: "🚩 Bildirimin köy yönetimine (Admin) iletildi. Köyümüzün huzurunu koruduğun için teşekkürler!",
        paylasimlar: await paylasimlariGetir(durum.level, kullanici.id),
      },
      ayarlar
    );
  }

  const metin = String(icerik ?? "").trim();
  const temizMedya = String(medyaUrl ?? "").trim().slice(0, 300);

  if (metin.length < 3 || metin.length > 600) {
    return hata("Mesaj 3 ile 600 karakter arasında olmalı.");
  }

  // 3. YENİ PAYLAŞIM (Gündem İçi veya Gündem Harici / Söz / Hikaye / Video)
  if (tur === "paylasim") {
    const secilenKategori = kategori === "serbest" ? "serbest" : "gundem";
    const secilenAltTur = ["soz", "hikaye", "ani", "dua", "video"].includes(altTur) ? altTur : "soz";
    const zarf = JSON.stringify({
      v: 1,
      metin,
      kategori: secilenKategori,
      altTur: secilenAltTur,
      medyaUrl: temizMedya,
    });

    await d
      .prepare("INSERT INTO meydan_paylasimlari (kullanici_id, level, icerik, olusturma) VALUES (?, ?, ?, ?)")
      .bind(kullanici.id, durum.level, zarf, Date.now())
      .run();

    // Gündem içi paylaşım yapıldığında Köy Huzuru +3 artar! Serbest paylaşımda +1 artar.
    const huzurArtisi = secilenKategori === "gundem" ? 3 : 1;
    durum = {
      ...durum,
      mutluluk: Math.min(100, (durum.mutluluk ?? 60) + huzurArtisi),
    };

    const ilerlet = gorevIlerlet(durum, "meydan_paylasim", simdi, ayarlar);
    if (ilerlet.durum) {
      durum = ilerlet.durum;
    }
    await durumYaz(kullanici.id, durum);
    await tesvikOdulunuKontrolEt(kullanici.id, oyunGunu(simdi));
  } else if (tur === "yorum") {
    const p = await d.prepare("SELECT id FROM meydan_paylasimlari WHERE id = ?").bind(Number(paylasimId)).first();
    if (!p) return hata("Paylaşım bulunamadı", 404);

    await d
      .prepare("INSERT INTO meydan_yorumlar (paylasim_id, kullanici_id, icerik, olusturma) VALUES (?, ?, ?, ?)")
      .bind(p.id, kullanici.id, metin, Date.now())
      .run();

    const ilerlet = gorevIlerlet(durum, "meydan_yorum", simdi, ayarlar);
    if (ilerlet.durum) {
      durum = ilerlet.durum;
    }
    await durumYaz(kullanici.id, durum);
    await tesvikOdulunuKontrolEt(kullanici.id, oyunGunu(simdi));
  } else {
    return hata("Geçersiz işlem türü");
  }

  return oyunYaniti(
    kullanici,
    durum,
    { paylasimlar: await paylasimlariGetir(durum.level, kullanici.id) },
    ayarlar
  );
}
