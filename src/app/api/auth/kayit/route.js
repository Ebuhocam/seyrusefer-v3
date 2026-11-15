import { db } from "@/lib/sunucu/db";
import { sifreOzetle } from "@/lib/sunucu/sifre";
import { oturumAc } from "@/lib/sunucu/oturum";
import { durumGetir } from "@/lib/sunucu/oyunDeposu";
import { govde, hata } from "@/lib/sunucu/api";

const AD_DESENI = /^[a-z0-9_.]{3,20}$/;

export async function POST(request) {
  const { kullaniciAdi, sifre, ad, cinsiyet, karakter } = await govde(request);
  const kAdi = String(kullaniciAdi ?? "").trim().toLowerCase();
  const gorunenAd = String(ad ?? "").trim().replace(/\s+/g, " ");
  const secilenCinsiyet = cinsiyet === "kiz" ? "kiz" : "erkek";
  const secilenKarakter = String(karakter ?? (secilenCinsiyet === "kiz" ? "bala" : "alp"));

  if (!AD_DESENI.test(kAdi)) return hata("Kullanıcı adı 3-20 karakter olmalı; sadece İngilizce harf, rakam, _ ve . kullanılabilir.");
  if (gorunenAd.length < 2 || gorunenAd.length > 40) return hata("Ad 2-40 karakter olmalı.");
  if (typeof sifre !== "string" || sifre.length < 6 || sifre.length > 100) return hata("Şifre en az 6 karakter olmalı.");

  const d = await db();
  const var_ = await d.prepare("SELECT 1 FROM kullanicilar WHERE kullanici_adi = ?").bind(kAdi).first();
  if (var_) return hata("Bu kullanıcı adı alınmış.", 409);

  // İlk kayıt olan kullanıcı otomatik olarak 'admin' rolü alır
  const sayac = await d.prepare("SELECT COUNT(*) AS adet FROM kullanicilar").first();
  const rol = (sayac?.adet ?? 0) === 0 ? "admin" : "ogrenci";

  const kayit = await d
    .prepare("INSERT INTO kullanicilar (kullanici_adi, sifre_hash, ad, rol, olusturma) VALUES (?, ?, ?, ?, ?) RETURNING id")
    .bind(kAdi, await sifreOzetle(sifre), gorunenAd, rol, Date.now())
    .first();

  await durumGetir(kayit.id, secilenCinsiyet, secilenKarakter);
  await oturumAc(kayit.id);
  return Response.json({ tamam: true, rol });
}
