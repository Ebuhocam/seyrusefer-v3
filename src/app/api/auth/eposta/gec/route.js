import { cookies } from "next/headers";
import { hata, oturumZorunlu } from "@/lib/sunucu/api";

// E-postası hiç olmayan ESKİ hesaplar için 7 günlük "şimdilik geç". Yeni hesaplar geçemez.
// Çerez adı app/page.js içindeki ile aynı olmalı: seyrusefer_eposta_gec
export async function POST() {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  if (kullanici.eposta) return hata("Yeni hesaplar e-postayı doğrulamadan devam edemez.", 403);
  (await cookies()).set("seyrusefer_eposta_gec", String(kullanici.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return Response.json({ tamam: true });
}
