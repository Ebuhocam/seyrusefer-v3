import { db } from "@/lib/sunucu/db";
import { durumGetir, oyunSaati } from "@/lib/sunucu/oyunDeposu";
import { govde, hata, oturumZorunlu } from "@/lib/sunucu/api";
import { trGunNo } from "@/lib/oyun/kurallar";

// Ders Çalışma Köşesi: kitap okuma, ödev ve konu tekrarı oturumları
const TURLER = ["kitap", "odev", "tekrar"];
const EN_AZ_DAKIKA = 5;
const EN_COK_DAKIKA = 120;
const GECMIS_GUN = 30;

// Tablo, göç (migration) çalıştırılmamış olsa da ilk istekte kurulur
const TABLO_SQL = [
  `CREATE TABLE IF NOT EXISTS ders_calisma (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kullanici_id INTEGER NOT NULL,
    gun INTEGER NOT NULL,
    tur TEXT NOT NULL,
    hedef_dakika INTEGER NOT NULL,
    dakika INTEGER NOT NULL DEFAULT 0,
    baslangic INTEGER NOT NULL,
    bitis INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS ders_calisma_kullanici_gun ON ders_calisma (kullanici_id, gun)`,
];
async function tabloHazirla(d) {
  if (globalThis.__dersTablosuHazir) return;
  for (const sql of TABLO_SQL) await d.prepare(sql).run();
  globalThis.__dersTablosuHazir = true;
}

/** Son 30 günün gün gün toplamı, bugünün oturumları ve (varsa) yarım kalmış açık oturum */
async function ozet(d, kullaniciId, bugun) {
  const ilkGun = bugun - (GECMIS_GUN - 1);
  const [gunluk, bugunku, acik] = await d.batch([
    d
      .prepare(
        `SELECT gun, tur, SUM(dakika) AS dakika FROM ders_calisma
         WHERE kullanici_id = ?1 AND gun >= ?2 AND bitis IS NOT NULL GROUP BY gun, tur`
      )
      .bind(kullaniciId, ilkGun),
    d
      .prepare(
        `SELECT id, tur, hedef_dakika AS hedefDakika, dakika, baslangic, bitis FROM ders_calisma
         WHERE kullanici_id = ?1 AND gun = ?2 AND bitis IS NOT NULL ORDER BY baslangic DESC LIMIT 20`
      )
      .bind(kullaniciId, bugun),
    d
      .prepare(
        `SELECT id, tur, hedef_dakika AS hedefDakika, baslangic FROM ders_calisma
         WHERE kullanici_id = ?1 AND bitis IS NULL ORDER BY baslangic DESC LIMIT 1`
      )
      .bind(kullaniciId),
  ]);
  const gunler = [];
  for (let i = 0; i < GECMIS_GUN; i++) {
    const gun = ilkGun + i;
    gunler.push({ gun, dakika: 0, kitap: 0, odev: 0, tekrar: 0 });
  }
  for (const r of gunluk.results ?? []) {
    const g = gunler.find((x) => x.gun === Number(r.gun));
    if (!g) continue;
    g[r.tur] = (g[r.tur] ?? 0) + Number(r.dakika || 0);
    g.dakika += Number(r.dakika || 0);
  }
  return {
    bugun,
    gunler,
    bugunkuOturumlar: bugunku.results ?? [],
    acikOturum: acik.results?.[0] ?? null,
    sunucuZamani: Date.now(),
  };
}

async function bugunGunu(kullaniciId) {
  const durum = await durumGetir(kullaniciId);
  return trGunNo(oyunSaati(durum));
}

export async function GET() {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  const d = await db();
  await tabloHazirla(d);
  return Response.json(await ozet(d, kullanici.id, await bugunGunu(kullanici.id)));
}

export async function POST(request) {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  const g = await govde(request);
  const d = await db();
  await tabloHazirla(d);
  const bugun = await bugunGunu(kullanici.id);
  const an = Date.now();

  if (g.islem === "basla") {
    const tur = String(g.tur ?? "");
    if (!TURLER.includes(tur)) return hata("Geçersiz çalışma türü");
    const hedef = Math.round(Number(g.hedefDakika));
    if (!Number.isFinite(hedef) || hedef < EN_AZ_DAKIKA || hedef > EN_COK_DAKIKA) {
      return hata(`Süre ${EN_AZ_DAKIKA}–${EN_COK_DAKIKA} dakika arasında olmalı`);
    }
    // Yarım kalmış eski oturum varsa, gerçekten geçen süreye göre kapatılır
    await d
      .prepare(
        `UPDATE ders_calisma SET bitis = ?2,
           dakika = MIN(hedef_dakika, MAX(0, (?2 - baslangic) / 60000))
         WHERE kullanici_id = ?1 AND bitis IS NULL`
      )
      .bind(kullanici.id, an)
      .run();
    await d
      .prepare(
        `INSERT INTO ders_calisma (kullanici_id, gun, tur, hedef_dakika, dakika, baslangic) VALUES (?1, ?2, ?3, ?4, 0, ?5)`
      )
      .bind(kullanici.id, bugun, tur, hedef, an)
      .run();
    return Response.json(await ozet(d, kullanici.id, bugun));
  }

  if (g.islem === "bitir") {
    const acik = await d
      .prepare(`SELECT id, hedef_dakika, baslangic FROM ders_calisma WHERE kullanici_id = ?1 AND bitis IS NULL ORDER BY baslangic DESC LIMIT 1`)
      .bind(kullanici.id)
      .first();
    if (!acik) return hata("Açık bir çalışma oturumu yok");
    // Öğrencinin bildirdiği odaklı süre; gerçekte geçen süreyi ve hedefi aşamaz
    const gecen = Math.floor((an - Number(acik.baslangic)) / 60000);
    const bildirilen = Math.max(0, Math.floor(Number(g.dakika) || 0));
    const dakika = Math.min(bildirilen, gecen + 1, Number(acik.hedef_dakika));
    await d.prepare(`UPDATE ders_calisma SET bitis = ?2, dakika = ?3 WHERE id = ?1`).bind(acik.id, an, dakika).run();
    return Response.json({ ...(await ozet(d, kullanici.id, bugun)), kaydedilenDakika: dakika });
  }

  if (g.islem === "vazgec") {
    await d.prepare(`DELETE FROM ders_calisma WHERE kullanici_id = ?1 AND bitis IS NULL`).bind(kullanici.id).run();
    return Response.json(await ozet(d, kullanici.id, bugun));
  }

  return hata("Geçersiz işlem");
}
