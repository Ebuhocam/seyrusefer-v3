import "server-only";
import { db } from "./db";

function guvenliJson(metin, varsayilan = {}) {
  try {
    return JSON.parse(metin);
  } catch {
    return varsayilan;
  }
}

/**
 * Yönetici panelinden kaydedilmiş tüm oyun ve level ayarlarını döner.
 * Kayıt yoksa boş yapı döner (oyun otomatik olarak sabitler.js / gorevler.js varsayılanlarını kullanır).
 */
export async function oyunAyarlariniGetir() {
  const d = await db();
  const satirlar = await d.prepare("SELECT anahtar, deger_json FROM oyun_ayarlari").all();

  const levellar = {};
  let binalar = null;
  let seyyahGorevleri = null;
  let turkuler = null;
  let davalar = null;

  for (const s of satirlar.results ?? []) {
    if (s.anahtar === "genel_ayarlar") {
      const genel = guvenliJson(s.deger_json);
      binalar = genel.binalar ?? null;
      seyyahGorevleri = genel.seyyahGorevleri ?? null;
      turkuler = genel.turkuler ?? null;
      davalar = genel.davalar ?? null;
    } else if (s.anahtar.startsWith("level_")) {
      const no = Number(s.anahtar.replace("level_", ""));
      if (no >= 1 && no <= 10) {
        levellar[no] = guvenliJson(s.deger_json);
      }
    }
  }

  return { levellar, binalar, seyyahGorevleri, turkuler, davalar };
}

export async function levelAyariniKaydet(levelNo, veri) {
  const d = await db();
  const anahtar = `level_${Number(levelNo)}`;
  const simdi = Date.now();
  await d
    .prepare(
      `INSERT INTO oyun_ayarlari (anahtar, deger_json, guncelleme) VALUES (?1, ?2, ?3)
       ON CONFLICT(anahtar) DO UPDATE SET deger_json = ?2, guncelleme = ?3`
    )
    .bind(anahtar, JSON.stringify(veri), simdi)
    .run();
}

export async function genelAyarlariKaydet(veri) {
  const d = await db();
  const simdi = Date.now();
  await d
    .prepare(
      `INSERT INTO oyun_ayarlari (anahtar, deger_json, guncelleme) VALUES ('genel_ayarlar', ?1, ?2)
       ON CONFLICT(anahtar) DO UPDATE SET deger_json = ?1, guncelleme = ?2`
    )
    .bind(JSON.stringify(veri), simdi)
    .run();
}

/**
 * Öğrenci bugün bir görev yaptığında, ona bugün gönderilmiş bekleyen kardeşlik teşviklerini
 * karşılanmış olarak işaretler ve hem alıcıya hem gönderene +10 birlik katkı puanı verir.
 */
export async function tesvikOdulunuKontrolEt(kullaniciId, bugun) {
  const d = await db();
  const bekleyenler = await d
    .prepare("SELECT id, gonderen_id FROM birlik_tesvikler WHERE alici_id = ? AND gun = ? AND karsilandi = 0")
    .bind(kullaniciId, bugun)
    .all();

  if (!bekleyenler.results?.length) return;

  const ifadeler = [];
  for (const t of bekleyenler.results) {
    ifadeler.push(d.prepare("UPDATE birlik_tesvikler SET karsilandi = 1 WHERE id = ?").bind(t.id));
    ifadeler.push(
      d.prepare("UPDATE birlik_uyeleri SET katki_puani = katki_puani + 10 WHERE kullanici_id = ?").bind(t.gonderen_id)
    );
    ifadeler.push(
      d.prepare("UPDATE birlik_uyeleri SET katki_puani = katki_puani + 10 WHERE kullanici_id = ?").bind(kullaniciId)
    );
  }
  await d.batch(ifadeler);
}
