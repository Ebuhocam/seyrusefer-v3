import { db } from "@/lib/sunucu/db";
import { govde, hata, oturumZorunlu } from "@/lib/sunucu/api";

const CIHAZ_SINIRI = 5; // bir kullanıcının en fazla kaç cihazı bildirim alabilir

function kodAl(v) {
  const t = typeof v === "string" ? v.trim() : "";
  return t.length >= 50 && t.length <= 4096 ? t : null;
}

// Bu cihazı günlük hatırlatma listesine ekler
export async function POST(request) {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  const token = kodAl((await govde(request)).token);
  if (!token) return hata("Geçersiz bildirim kodu.");
  const d = await db();
  const simdi = Date.now();
  await d
    .prepare(
      `INSERT INTO bildirim_tokenlari (token, kullanici_id, olusturma, son_gorulme) VALUES (?, ?, ?, ?)
       ON CONFLICT(token) DO UPDATE SET kullanici_id = excluded.kullanici_id, son_gorulme = excluded.son_gorulme`
    )
    .bind(token, kullanici.id, simdi, simdi)
    .run();
  // En yeni CIHAZ_SINIRI cihazı tut
  await d
    .prepare(
      `DELETE FROM bildirim_tokenlari WHERE kullanici_id = ? AND token NOT IN
         (SELECT token FROM bildirim_tokenlari WHERE kullanici_id = ? ORDER BY son_gorulme DESC LIMIT ?)`
    )
    .bind(kullanici.id, kullanici.id, CIHAZ_SINIRI)
    .run();
  return Response.json({ tamam: true });
}

// Bu cihazı listeden çıkarır
export async function DELETE(request) {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  const token = kodAl((await govde(request)).token);
  if (!token) return hata("Geçersiz bildirim kodu.");
  const d = await db();
  await d.prepare("DELETE FROM bildirim_tokenlari WHERE token = ? AND kullanici_id = ?").bind(token, kullanici.id).run();
  return Response.json({ tamam: true });
}
