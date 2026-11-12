import { gelistiriciIzni } from "@/lib/sunucu/oturum";
import { durumGetir, durumYaz, oyunSaati } from "@/lib/sunucu/oyunDeposu";
import { govde, hata, oturumZorunlu, oyunYaniti } from "@/lib/sunucu/api";
import { topla, yukselt, levelAtla, gelistiriciEylemleri } from "@/lib/oyun/eylemler";

/** Oyuncunun güncel durumu */
export async function GET() {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  return oyunYaniti(kullanici, await durumGetir(kullanici.id));
}

/**
 * Oyun eylemi. Gövde: { eylem, ... }
 *   topla      { kaynak }
 *   yukselt    { binaId }
 *   levelAtla  {}
 *   gelistirici { islem, ...parametreler }  (sadece geliştirme ortamı / admin)
 * Tüm hesaplar sunucu saatine göre yapılır.
 */
export async function POST(request) {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;

  const g = await govde(request);
  const durum = await durumGetir(kullanici.id);
  const simdi = oyunSaati(durum);
  let sonuc;

  switch (g.eylem) {
    case "topla":
      sonuc = topla(durum, g.kaynak, simdi);
      break;
    case "yukselt":
      sonuc = yukselt(durum, g.binaId);
      break;
    case "levelAtla":
      sonuc = levelAtla(durum, simdi);
      break;
    case "gelistirici": {
      if (!gelistiriciIzni(kullanici)) return hata("Yetkisiz", 403);
      const islem = Object.hasOwn(gelistiriciEylemleri, g.islem) ? gelistiriciEylemleri[g.islem] : null;
      if (!islem) return hata("Bilinmeyen geliştirici işlemi");
      // Sıfırlamada kaydırılmış saat değil gerçek saat kullanılır
      sonuc = { durum: islem(durum, g, g.islem === "sifirla" ? Date.now() : simdi) };
      break;
    }
    default:
      return hata("Bilinmeyen eylem");
  }

  if (sonuc.hata) return Response.json({ hata: sonuc.hata }, { status: 409 });
  await durumYaz(kullanici.id, sonuc.durum);
  return oyunYaniti(kullanici, sonuc.durum, sonuc.miktar ? { miktar: sonuc.miktar } : {});
}
