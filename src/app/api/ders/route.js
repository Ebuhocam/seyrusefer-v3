import { db } from "@/lib/sunucu/db";
import { durumGetir, durumYaz, oyunSaati } from "@/lib/sunucu/oyunDeposu";
import { govde, hata, oturumZorunlu, oyunYaniti } from "@/lib/sunucu/api";
import { trGunNo } from "@/lib/oyun/kurallar";
import { ekTablolariHazirla } from "@/lib/sunucu/ekTablolar";

// Ders Çalışma Köşesi: kitap okuma, ödev ve konu tekrarı oturumları
const TURLER = ["kitap", "odev", "tekrar"];
const EN_AZ_DAKIKA = 5;
const EN_COK_DAKIKA = 60;
// Günün toplam çalışmasında her 30 dakika köye +1 Huzur getirir (günde en çok 4 Huzur = 2 saat)
const HUZUR_DAKIKA = 30;
const GUNLUK_HUZUR_TAVANI = 4;
const GECMIS_GUN = 30;

const tabloHazirla = ekTablolariHazirla;

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
    const onceki = await d
      .prepare(`SELECT COALESCE(SUM(dakika), 0) AS t FROM ders_calisma WHERE kullanici_id = ?1 AND gun = ?2 AND bitis IS NOT NULL`)
      .bind(kullanici.id, bugun)
      .first();
    await d.prepare(`UPDATE ders_calisma SET bitis = ?2, dakika = ?3 WHERE id = ?1`).bind(acik.id, an, dakika).run();

    // Huzur: bugünün toplamı yeni bir 30 dakikalık dilimi geçtiyse köy huzuru artar
    const oncekiToplam = Number(onceki?.t ?? 0);
    const dilimOnce = Math.min(GUNLUK_HUZUR_TAVANI, Math.floor(oncekiToplam / HUZUR_DAKIKA));
    const dilimSonra = Math.min(GUNLUK_HUZUR_TAVANI, Math.floor((oncekiToplam + dakika) / HUZUR_DAKIKA));
    const huzurKazanildi = Math.max(0, dilimSonra - dilimOnce);
    let oyunVerisi = null;
    if (huzurKazanildi > 0) {
      const durum = await durumGetir(kullanici.id);
      const yeni = { ...durum, mutluluk: Math.min(100, (durum.mutluluk ?? 60) + huzurKazanildi) };
      await durumYaz(kullanici.id, yeni);
      oyunVerisi = await (await oyunYaniti(kullanici, yeni)).json();
    }
    return Response.json({
      ...(await ozet(d, kullanici.id, bugun)),
      kaydedilenDakika: dakika,
      huzurKazanildi,
      oyun: oyunVerisi,
    });
  }

  if (g.islem === "vazgec") {
    await d.prepare(`DELETE FROM ders_calisma WHERE kullanici_id = ?1 AND bitis IS NULL`).bind(kullanici.id).run();
    return Response.json(await ozet(d, kullanici.id, bugun));
  }

  return hata("Geçersiz işlem");
}
