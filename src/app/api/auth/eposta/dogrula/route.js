import { db } from "@/lib/sunucu/db";
import { govde, hata, oturumZorunlu } from "@/lib/sunucu/api";
import { kodDogrula } from "@/lib/sunucu/eposta";

export async function POST(request) {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  const { kod } = await govde(request);
  const s = await kodDogrula(kullanici.id, "dogrula", kod);
  if (s.hata) return hata(s.hata, 400);
  const d = await db();
  // Kod gönderildikten sonra adres değiştiyse eski adrese giden kod geçerli sayılmaz
  const guncel = await d.prepare("SELECT eposta FROM kullanicilar WHERE id = ?").bind(kullanici.id).first();
  if (!guncel || guncel.eposta !== s.eposta) return hata("Kod bu e-posta adresi için geçerli değil. Yeni kod iste.");
  await d.prepare("UPDATE kullanicilar SET eposta_dogrulandi = 1 WHERE id = ?").bind(kullanici.id).run();
  return Response.json({ tamam: true });
}
