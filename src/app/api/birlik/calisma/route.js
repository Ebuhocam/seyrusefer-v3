import { db } from "@/lib/sunucu/db";
import { durumGetir, oyunSaati } from "@/lib/sunucu/oyunDeposu";
import { oturumZorunlu } from "@/lib/sunucu/api";
import { trGunNo } from "@/lib/oyun/kurallar";
import { ekTablolariHazirla, uyelikBul } from "@/lib/sunucu/ekTablolar";

/**
 * Medrese · Ortak Çalışma Salonu: birlik üyelerinin şu anki çalışmaları, bugünkü ve haftalık süreleri,
 * birliğin kendi içindeki ve birlikler arasındaki haftalık sıralaması.
 */
export async function GET() {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  const d = await db();
  await ekTablolariHazirla(d);
  const durum = await durumGetir(kullanici.id);
  const bugun = trGunNo(oyunSaati(durum));
  const haftaBasi = bugun - 6;
  const an = Date.now();

  const uyelik = await uyelikBul(d, kullanici.id);
  if (!uyelik) return Response.json({ birlik: null, bugun });

  const [uyeler, acik, sureler, siralama] = await d.batch([
    d
      .prepare(
        `SELECT k.id, k.ad FROM birlik_uyeleri u JOIN kullanicilar k ON k.id = u.kullanici_id
          WHERE u.birlik_id = ?1 ORDER BY k.ad`
      )
      .bind(uyelik.birlik_id),
    d
      .prepare(
        `SELECT dc.kullanici_id, dc.tur, dc.hedef_dakika, dc.baslangic FROM ders_calisma dc
           JOIN birlik_uyeleri u ON u.kullanici_id = dc.kullanici_id
          WHERE u.birlik_id = ?1 AND dc.bitis IS NULL`
      )
      .bind(uyelik.birlik_id),
    d
      .prepare(
        `SELECT dc.kullanici_id,
                SUM(CASE WHEN dc.gun = ?2 THEN dc.dakika ELSE 0 END) AS bugun_dk,
                SUM(dc.dakika) AS hafta_dk
           FROM ders_calisma dc JOIN birlik_uyeleri u ON u.kullanici_id = dc.kullanici_id
          WHERE u.birlik_id = ?1 AND dc.bitis IS NOT NULL AND dc.gun >= ?3
          GROUP BY dc.kullanici_id`
      )
      .bind(uyelik.birlik_id, bugun, haftaBasi),
    d
      .prepare(
        `SELECT b.id, b.ad, b.renk, SUM(dc.dakika) AS dakika, COUNT(DISTINCT dc.kullanici_id) AS kisi
           FROM ders_calisma dc
           JOIN birlik_uyeleri u ON u.kullanici_id = dc.kullanici_id
           JOIN birlikler b ON b.id = u.birlik_id
          WHERE dc.bitis IS NOT NULL AND dc.gun >= ?1
          GROUP BY b.id ORDER BY dakika DESC`
      )
      .bind(haftaBasi),
  ]);

  const acikHarita = new Map();
  for (const o of acik.results ?? []) {
    // Süresi (10 dk pay ile) dolmamış açık oturum "şu an çalışıyor" sayılır
    const bitis = Number(o.baslangic) + Number(o.hedef_dakika) * 60000;
    if (an < bitis + 10 * 60000) acikHarita.set(o.kullanici_id, { tur: o.tur, bitis, baslangic: Number(o.baslangic) });
  }
  const sureHarita = new Map((sureler.results ?? []).map((r) => [r.kullanici_id, r]));
  const uyeListesi = (uyeler.results ?? [])
    .map((u) => ({
      id: u.id,
      ad: u.ad,
      ben: u.id === kullanici.id,
      calisiyor: acikHarita.get(u.id) ?? null,
      bugunDakika: Number(sureHarita.get(u.id)?.bugun_dk ?? 0),
      haftaDakika: Number(sureHarita.get(u.id)?.hafta_dk ?? 0),
    }))
    .sort((a, b) => b.haftaDakika - a.haftaDakika || b.bugunDakika - a.bugunDakika);

  const birlikler = (siralama.results ?? []).map((r, i) => ({
    sira: i + 1,
    id: r.id,
    ad: r.ad,
    renk: r.renk,
    dakika: Number(r.dakika ?? 0),
    kisi: Number(r.kisi ?? 0),
    benim: r.id === uyelik.birlik_id,
  }));

  return Response.json({
    bugun,
    sunucuZamani: an,
    birlik: { id: uyelik.birlik_id, ad: uyelik.ad, renk: uyelik.renk },
    uyeler: uyeListesi,
    calisanSayisi: uyeListesi.filter((u) => u.calisiyor).length,
    birlikBugun: uyeListesi.reduce((t, u) => t + u.bugunDakika, 0),
    birlikHafta: uyeListesi.reduce((t, u) => t + u.haftaDakika, 0),
    siralama: birlikler.slice(0, 10),
    benimSiram: birlikler.find((b) => b.benim) ?? null,
  });
}
