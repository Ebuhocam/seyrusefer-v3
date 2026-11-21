import { db } from "@/lib/sunucu/db";
import { hata } from "@/lib/sunucu/api";
import { bildirimGonder, cronAnahtari } from "@/lib/sunucu/fcm";

export const dynamic = "force-dynamic";

// Günlük hatırlatma. Cloudflare zamanlayıcısı (custom-worker.js → scheduled) her gün çağırır.
// Dışarıdan çağrılamasın diye FIREBASE_SERVICE_ACCOUNT'tan türetilen anahtar istenir.
const MESAJLAR = [
  { baslik: "Köyün seni bekliyor 🏕️", metin: "Bugünün görevleri hazır. Gel, köyünü büyüt!" },
  { baslik: "Seyrüsefer'de yeni bir gün ☀️", metin: "Tarla, orman ve taş ocağın seni bekliyor." },
  { baslik: "Birliğin seni arıyor 🤝", metin: "Bugünkü iyilik ve ibadet görevlerini tamamladın mı?" },
  { baslik: "Besmeleyle başla 🌿", metin: "Günün görevlerine girmek için köyüne uğra." },
];

export async function POST(request) {
  const beklenen = await cronAnahtari();
  const gelen = request.headers.get("x-cron-anahtar") ?? "";
  if (!beklenen || gelen !== beklenen) return hata("Yetkisiz.", 403);

  const d = await db();
  const { results } = await d.prepare("SELECT token FROM bildirim_tokenlari").all();
  const gun = Math.floor((Date.now() + 3 * 60 * 60 * 1000) / 86400000); // Türkiye günü
  const mesaj = { ...MESAJLAR[gun % MESAJLAR.length], url: "/" };

  let gonderilen = 0;
  let silinen = 0;
  let basarisiz = 0;
  for (let i = 0; i < results.length; i += 20) {
    const dilim = results.slice(i, i + 20);
    const sonuclar = await Promise.all(dilim.map((s) => bildirimGonder(s.token, mesaj).catch(() => ({ tamam: false }))));
    for (let k = 0; k < sonuclar.length; k++) {
      const s = sonuclar[k];
      if (s.tamam) gonderilen++;
      else if (s.gecersiz) {
        await d.prepare("DELETE FROM bildirim_tokenlari WHERE token = ?").bind(dilim[k].token).run();
        silinen++;
      } else basarisiz++;
    }
  }
  return Response.json({ tamam: true, toplam: results.length, gonderilen, silinen, basarisiz });
}
