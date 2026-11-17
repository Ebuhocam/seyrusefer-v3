import { onizlemeSifresiyleGir, onizlemedenCik } from "@/lib/sunucu/onizleme";
import { govde, hata } from "@/lib/sunucu/api";

export async function POST(request) {
  const { sifre } = await govde(request);
  const tamam = await onizlemeSifresiyleGir(sifre);
  if (!tamam) {
    // Tahmin denemelerini yavaşlat
    await new Promise((r) => setTimeout(r, 800));
    return hata("Şifre yanlış.", 403);
  }
  return Response.json({ tamam: true });
}

export async function DELETE() {
  await onizlemedenCik();
  return Response.json({ tamam: true });
}
