import { db } from "@/lib/sunucu/db";
import { sifreOzetle } from "@/lib/sunucu/sifre";
import { govde, hata, onizlemeKontrol } from "@/lib/sunucu/api";
import { epostaDuzelt, kodDogrula } from "@/lib/sunucu/eposta";

export async function POST(request) {
  const kapali = await onizlemeKontrol();
  if (kapali) return kapali;
  const { kullaniciAdi, eposta, kod, yeniSifre } = await govde(request);
  const kAdi = String(kullaniciAdi ?? "").trim().toLowerCase();
  const posta = epostaDuzelt(eposta);
  if (typeof yeniSifre !== "string" || yeniSifre.length < 6 || yeniSifre.length > 100) return hata("Yeni şifre en az 6 karakter olmalı.");

  const d = await db();
  const k = await d
    .prepare("SELECT id FROM kullanicilar WHERE kullanici_adi = ? AND eposta = ? AND eposta_dogrulandi = 1")
    .bind(kAdi, posta)
    .first();
  if (!k) return hata("Kod hatalı veya süresi dolmuş.");
  const s = await kodDogrula(k.id, "sifre", kod);
  if (s.hata) return hata(s.hata);

  await d.prepare("UPDATE kullanicilar SET sifre_hash = ? WHERE id = ?").bind(await sifreOzetle(yeniSifre), k.id).run();
  // Şifre değişince açık tüm oturumlar kapanır
  await d.prepare("DELETE FROM oturumlar WHERE kullanici_id = ?").bind(k.id).run();
  return Response.json({ tamam: true });
}
