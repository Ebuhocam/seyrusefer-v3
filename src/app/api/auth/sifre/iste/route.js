import { db } from "@/lib/sunucu/db";
import { govde, hata, onizlemeKontrol } from "@/lib/sunucu/api";
import { epostaDuzelt, kodGonder } from "@/lib/sunucu/eposta";

// Hesabın var olup olmadığı sızdırılmasın diye hep aynı yanıt döner.
export async function POST(request) {
  const kapali = await onizlemeKontrol();
  if (kapali) return kapali;
  const { kullaniciAdi, eposta } = await govde(request);
  const kAdi = String(kullaniciAdi ?? "").trim().toLowerCase();
  const posta = epostaDuzelt(eposta);
  if (!kAdi || !posta) return hata("Kullanıcı adını ve e-posta adresini yaz.");

  const d = await db();
  const k = await d
    .prepare("SELECT id FROM kullanicilar WHERE kullanici_adi = ? AND eposta = ? AND eposta_dogrulandi = 1")
    .bind(kAdi, posta)
    .first();
  if (k) {
    const g = await kodGonder(k.id, posta, "sifre");
    if (g.hata && /bekle|çok fazla/.test(g.hata)) return hata(g.hata, 429);
  }
  return Response.json({ tamam: true });
}
