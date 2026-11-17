import { medyaDeposu } from "@/lib/sunucu/medya";

/** Yüklenen ses dosyasını çalar (ileri-geri sarma için Range desteğiyle) */
export async function GET(request, { params }) {
  const { anahtar } = await params;
  if (!/^[a-f0-9-]{36}\.(mp3|m4a|aac|ogg|wav|webm)$/i.test(anahtar ?? "")) {
    return new Response("Bulunamadı", { status: 404 });
  }
  const depo = await medyaDeposu();
  if (!depo) return new Response("Depo yok", { status: 500 });

  const anahtarYolu = `sesler/${anahtar}`;
  const bas = await depo.head(anahtarYolu);
  if (!bas) return new Response("Bulunamadı", { status: 404 });
  const boyut = bas.size;
  const tur = bas.httpMetadata?.contentType || "audio/mpeg";
  const ortak = {
    "Content-Type": tur,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  const aralik = request.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (aralik && (aralik[1] || aralik[2])) {
    let baslangic = aralik[1] ? Number(aralik[1]) : Math.max(0, boyut - Number(aralik[2]));
    let bitis = aralik[1] && aralik[2] ? Number(aralik[2]) : boyut - 1;
    bitis = Math.min(bitis, boyut - 1);
    if (baslangic > bitis) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${boyut}` } });
    const nesne = await depo.get(anahtarYolu, { range: { offset: baslangic, length: bitis - baslangic + 1 } });
    return new Response(nesne.body, {
      status: 206,
      headers: { ...ortak, "Content-Range": `bytes ${baslangic}-${bitis}/${boyut}`, "Content-Length": String(bitis - baslangic + 1) },
    });
  }
  const nesne = await depo.get(anahtarYolu);
  return new Response(nesne.body, { headers: { ...ortak, "Content-Length": String(boyut) } });
}
