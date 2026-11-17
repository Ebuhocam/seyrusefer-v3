import "server-only";
import { db } from "./db";

/** Bir birlikte en fazla kaç öğrenci olabilir (öğretmen Yönetim Merkezi'nden değiştirebilir) */
export const BIRLIK_UYE_SINIRI_VARSAYILAN = 8;
export const BIRLIK_UYE_SINIRI_ARALIK = { en_az: 2, en_cok: 40 };

const GUN_MS = 24 * 60 * 60 * 1000;
const TURKIYE_FARKI_MS = 3 * 60 * 60 * 1000; // Türkiye saati = UTC+3 (yaz saati uygulaması yok)

/** Verilen anın içinde bulunduğu Türkiye gününün başlangıcı (ms, UTC) */
export function turkiyeGunBasi(ms = Date.now()) {
  return Math.floor((ms + TURKIYE_FARKI_MS) / GUN_MS) * GUN_MS - TURKIYE_FARKI_MS;
}

/**
 * 'YYYY-AA-GG' biçimindeki bir günden geriye doğru `adet` günü (o gün dahil) döner.
 * Gün dizgesi üzerinde takvim hesabı yapar; saat diliminden bağımsızdır.
 */
export function sonGunler(bugun, adet = 7) {
  const [y, a, g] = String(bugun).split("-").map(Number);
  const temel = Date.UTC(y, (a || 1) - 1, g || 1);
  return Array.from({ length: adet }, (_, i) => new Date(temel - i * GUN_MS).toISOString().slice(0, 10));
}

function guvenliJson(metin, varsayilan = {}) {
  try {
    const v = JSON.parse(metin);
    return v && typeof v === "object" ? v : varsayilan;
  } catch {
    return varsayilan;
  }
}

function uyeSiniriCoz(deger) {
  const n = Math.floor(Number(deger));
  if (!Number.isFinite(n)) return BIRLIK_UYE_SINIRI_VARSAYILAN;
  return Math.min(BIRLIK_UYE_SINIRI_ARALIK.en_cok, Math.max(BIRLIK_UYE_SINIRI_ARALIK.en_az, n));
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
  let birlik = { uyeSiniri: BIRLIK_UYE_SINIRI_VARSAYILAN };

  for (const s of satirlar.results ?? []) {
    if (s.anahtar === "genel_ayarlar") {
      const genel = guvenliJson(s.deger_json);
      binalar = genel.binalar ?? null;
      seyyahGorevleri = genel.seyyahGorevleri ?? null;
      turkuler = genel.turkuler ?? null;
      davalar = genel.davalar ?? null;
      birlik = { uyeSiniri: uyeSiniriCoz(genel.birlik?.uyeSiniri ?? BIRLIK_UYE_SINIRI_VARSAYILAN) };
    } else if (s.anahtar.startsWith("level_")) {
      const no = Number(s.anahtar.replace("level_", ""));
      if (no >= 1 && no <= 10) {
        levellar[no] = guvenliJson(s.deger_json);
      }
    }
  }

  return { levellar, binalar, seyyahGorevleri, turkuler, davalar, birlik };
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

/** Bir levelın özel tasarımını siler; level oyunun varsayılan tasarımına döner */
export async function levelAyariniSil(levelNo) {
  const d = await db();
  await d.prepare("DELETE FROM oyun_ayarlari WHERE anahtar = ?").bind(`level_${Number(levelNo)}`).run();
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

/** Kayıtlı genel ayarları (ham hâliyle) döner; yoksa boş nesne */
export async function genelAyarlariOku() {
  const d = await db();
  const s = await d.prepare("SELECT deger_json FROM oyun_ayarlari WHERE anahtar = 'genel_ayarlar'").first();
  return s ? guvenliJson(s.deger_json) : {};
}

/** Hangi ayar anahtarlarının özelleştirildiğini ve ne zaman kaydedildiğini döner */
export async function ayarKayitBilgisi() {
  const d = await db();
  const satirlar = await d.prepare("SELECT anahtar, guncelleme FROM oyun_ayarlari").all();
  return Object.fromEntries((satirlar.results ?? []).map((s) => [s.anahtar, s.guncelleme]));
}

/**
 * Öğrenci bugün bir görev yaptığında, ona bugün gönderilmiş bekleyen kardeşlik teşviklerini
 * karşılanmış olarak işaretler ve hem alıcıya hem gönderene +10 birlik katkı puanı verir.
 *
 * Her teşvik için işaretleme ve puan aynı toplu işlemde (transaction) yapılır; puan yalnızca
 * işaret gerçekten bu istekte konduysa (changes() = 1) yazılır. Böylece aynı anda gelen iki
 * istek aynı teşvikten iki kez puan kazandıramaz.
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
    ifadeler.push(
      d.prepare("UPDATE birlik_tesvikler SET karsilandi = 1 WHERE id = ? AND karsilandi = 0").bind(t.id)
    );
    ifadeler.push(
      d
        .prepare(
          `UPDATE birlik_uyeleri SET katki_puani = katki_puani + 10
            WHERE changes() = 1
              AND kullanici_id IN (?1, ?2)
              AND birlik_id = (SELECT birlik_id FROM birlik_tesvikler WHERE id = ?3)`
        )
        .bind(t.gonderen_id, kullaniciId, t.id)
    );
  }
  await d.batch(ifadeler);
}
