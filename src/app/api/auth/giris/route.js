import { db } from "@/lib/sunucu/db";
import { sifreDogrula } from "@/lib/sunucu/sifre";
import { oturumAc } from "@/lib/sunucu/oturum";
import { govde, hata } from "@/lib/sunucu/api";

export async function POST(request) {
  const { kullaniciAdi, sifre } = await govde(request);
  const kAdi = String(kullaniciAdi ?? "").trim().toLowerCase();
  if (!kAdi || typeof sifre !== "string") return hata("Kullanıcı adı ve şifre gerekli.");

  const d = await db();
  const k = await d.prepare("SELECT id, sifre_hash FROM kullanicilar WHERE kullanici_adi = ?").bind(kAdi).first();
  if (!k || !(await sifreDogrula(sifre, k.sifre_hash))) return hata("Kullanıcı adı veya şifre hatalı.", 401);

  await oturumAc(k.id);
  return Response.json({ tamam: true });
}
