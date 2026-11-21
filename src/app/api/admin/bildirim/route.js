import { db } from "@/lib/sunucu/db";
import { govde, hata, oturumZorunlu } from "@/lib/sunucu/api";
import { bildirimGonder } from "@/lib/sunucu/fcm";

export const dynamic = "force-dynamic";

const yoneticiMi = (kullanici) => kullanici?.rol === "admin";

// Öğrenci listesi + her birinin bildirim açık cihaz sayısı
export async function GET() {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  if (!yoneticiMi(kullanici)) return hata("Bu işlem yalnızca öğretmen (yönetici) hesabına açıktır.", 403);
  const d = await db();
  const { results } = await d
    .prepare(
      `SELECT k.id, k.ad, k.kullanici_adi AS kullaniciAdi,
              (SELECT COUNT(*) FROM bildirim_tokenlari b WHERE b.kullanici_id = k.id) AS cihaz
         FROM kullanicilar k ORDER BY k.ad COLLATE NOCASE`
    )
    .all();
  return Response.json({ ogrenciler: results ?? [] });
}

// Seçilen öğrencilere (veya bildirimi açan herkese) anlık bildirim gönderir
export async function POST(request) {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  if (!yoneticiMi(kullanici)) return hata("Bu işlem yalnızca öğretmen (yönetici) hesabına açıktır.", 403);

  const g = await govde(request);
  const baslik = String(g.baslik ?? "").trim().slice(0, 60) || "Seyrüsefer";
  const metin = String(g.metin ?? "").trim().slice(0, 240);
  if (metin.length < 2) return hata("Bildirim metnini yaz.");

  const d = await db();
  let satirlar;
  if (g.hepsi === true) {
    satirlar = (await d.prepare("SELECT token FROM bildirim_tokenlari").all()).results ?? [];
  } else {
    const idler = [...new Set((Array.isArray(g.kullaniciIdleri) ? g.kullaniciIdleri : []).map(Number).filter(Number.isInteger))].slice(0, 200);
    if (idler.length === 0) return hata("En az bir öğrenci seç.");
    satirlar = (
      await d
        .prepare(`SELECT token FROM bildirim_tokenlari WHERE kullanici_id IN (${idler.map(() => "?").join(",")})`)
        .bind(...idler)
        .all()
    ).results ?? [];
  }
  if (satirlar.length === 0) return hata("Seçilenlerin hiçbirinde bildirim açık değil.", 422);

  let gonderilen = 0;
  let silinen = 0;
  let basarisiz = 0;
  for (let i = 0; i < satirlar.length; i += 20) {
    const dilim = satirlar.slice(i, i + 20);
    const sonuclar = await Promise.all(dilim.map((s) => bildirimGonder(s.token, { baslik, metin, url: "/" }).catch(() => ({ tamam: false }))));
    for (let k = 0; k < sonuclar.length; k++) {
      const s = sonuclar[k];
      if (s.tamam) gonderilen++;
      else if (s.gecersiz) {
        await d.prepare("DELETE FROM bildirim_tokenlari WHERE token = ?").bind(dilim[k].token).run();
        silinen++;
      } else basarisiz++;
    }
  }
  return Response.json({ tamam: true, cihaz: satirlar.length, gonderilen, silinen, basarisiz });
}
