import { db } from "@/lib/sunucu/db";
import { durumGetir, durumYaz, oyunSaati } from "@/lib/sunucu/oyunDeposu";
import { govde, hata, oturumZorunlu, oyunYaniti } from "@/lib/sunucu/api";
import { gorevIlerlet } from "@/lib/oyun/eylemler";

async function paylasimlariGetir(level) {
  const d = await db();
  const paylasimlar = await d
    .prepare(
      `SELECT p.id, p.level, p.icerik, p.olusturma, k.ad AS yazar_ad, k.kullanici_adi AS yazar_kullanici
         FROM meydan_paylasimlari p
         JOIN kullanicilar k ON k.id = p.kullanici_id
        WHERE p.level = ?
        ORDER BY p.olusturma DESC
        LIMIT 25`
    )
    .bind(level)
    .all();

  if (!paylasimlar.results.length) return [];

  const idler = paylasimlar.results.map((p) => p.id);
  const yerTutucular = idler.map(() => "?").join(",");
  const yorumlar = await d
    .prepare(
      `SELECT y.id, y.paylasim_id, y.icerik, y.olusturma, k.ad AS yazar_ad
         FROM meydan_yorumlar y
         JOIN kullanicilar k ON k.id = y.kullanici_id
        WHERE y.paylasim_id IN (${yerTutucular})
        ORDER BY y.olusturma ASC`
    )
    .bind(...idler)
    .all();

  const yorumHaritasi = {};
  for (const y of yorumlar.results) {
    (yorumHaritasi[y.paylasim_id] ??= []).push(y);
  }

  return paylasimlar.results.map((p) => ({
    ...p,
    yorumlar: yorumHaritasi[p.id] ?? [],
  }));
}

/** Aktif levelın (veya ?level=N) meydan paylaşımlarını döner */
export async function GET(request) {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  const durum = await durumGetir(kullanici.id);
  const istenenLevel = Number(request.nextUrl.searchParams.get("level")) || durum.level;
  return Response.json({ paylasimlar: await paylasimlariGetir(istenenLevel) });
}

/**
 * Gövde:
 *   { tur: 'paylasim', icerik }
 *   { tur: 'yorum', paylasimId, icerik }
 */
export async function POST(request) {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;

  const { tur, icerik, paylasimId } = await govde(request);
  const metin = String(icerik ?? "").trim();
  if (metin.length < 5 || metin.length > 500) {
    return hata("Mesaj 5 ile 500 karakter arasında olmalı.");
  }

  const d = await db();
  let durum = await durumGetir(kullanici.id);
  const simdi = oyunSaati(durum);

  if (tur === "paylasim") {
    await d
      .prepare("INSERT INTO meydan_paylasimlari (kullanici_id, level, icerik, olusturma) VALUES (?, ?, ?, ?)")
      .bind(kullanici.id, durum.level, metin, Date.now())
      .run();

    const ilerlet = gorevIlerlet(durum, "meydan_paylasim", simdi);
    if (ilerlet.durum) {
      durum = ilerlet.durum;
      await durumYaz(kullanici.id, durum);
    }
  } else if (tur === "yorum") {
    const p = await d.prepare("SELECT id FROM meydan_paylasimlari WHERE id = ?").bind(Number(paylasimId)).first();
    if (!p) return hata("Paylaşım bulunamadı", 404);

    await d
      .prepare("INSERT INTO meydan_yorumlar (paylasim_id, kullanici_id, icerik, olusturma) VALUES (?, ?, ?, ?)")
      .bind(p.id, kullanici.id, metin, Date.now())
      .run();

    const ilerlet = gorevIlerlet(durum, "meydan_yorum", simdi);
    if (ilerlet.durum) {
      durum = ilerlet.durum;
      await durumYaz(kullanici.id, durum);
    }
  } else {
    return hata("Geçersiz işlem türü");
  }

  return oyunYaniti(kullanici, durum, {
    paylasimlar: await paylasimlariGetir(durum.level),
  });
}
