import { hata, oturumZorunlu } from "@/lib/sunucu/api";
import { medyaDeposu, SES_TURLERI, SES_EN_COK_BAYT } from "@/lib/sunucu/medya";

/** Öğretmen bir ses dosyası (ör. Ozan Dede seslendirmesi) yükler; çalınabilir adresini döner */
export async function POST(request) {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  if (kullanici.rol !== "admin") return hata("Bu işlem yalnızca öğretmen içindir.", 403);

  let form;
  try {
    form = await request.formData();
  } catch {
    return hata("Dosya okunamadı.");
  }
  const dosya = form.get("dosya");
  if (!dosya || typeof dosya === "string") return hata("Bir ses dosyası seçin.");
  const uzantiAdi = String(dosya.name || "").toLowerCase().split(".").pop();
  const tur = dosya.type || (uzantiAdi === "mp3" ? "audio/mpeg" : "");
  const uzanti = SES_TURLERI[tur];
  if (!uzanti) return hata("Yalnızca ses dosyası yüklenebilir (mp3, m4a, ogg, wav).");
  if (dosya.size > SES_EN_COK_BAYT) return hata("Dosya çok büyük (en fazla 15 MB).");

  const depo = await medyaDeposu();
  if (!depo) return hata("Dosya deposu bulunamadı. Cloudflare'de 'seyrusefer-medya' R2 deposunu oluşturun.", 500);

  const anahtar = `${crypto.randomUUID()}.${uzanti}`;
  await depo.put(`sesler/${anahtar}`, await dosya.arrayBuffer(), {
    httpMetadata: { contentType: tur === "audio/mp3" ? "audio/mpeg" : tur },
    customMetadata: { ad: String(dosya.name || "").slice(0, 120), yukleyen: String(kullanici.id) },
  });
  return Response.json({ url: `/api/ses/${anahtar}` });
}
