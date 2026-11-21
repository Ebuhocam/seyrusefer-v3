import { db } from "@/lib/sunucu/db";
import { govde, hata, oturumZorunlu } from "@/lib/sunucu/api";
import { EPOSTA_BASINA_HESAP, epostaDuzelt, epostaGecerliMi, epostaHesapSayisi, kodGonder } from "@/lib/sunucu/eposta";

// Doğrulama kodunu (yeniden) gönderir. Gövdede eposta varsa hesabın e-postası o adrese ayarlanır
// (e-postası olmayan eski hesaplar ve yanlış adres yazanlar için). Eski hesaplar koşulları da burada kabul eder.
export async function POST(request) {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  if (kullanici.eposta_dogrulandi) return hata("E-postan zaten doğrulanmış.");
  const { eposta, kosulKabul } = await govde(request);
  const d = await db();

  let posta = kullanici.eposta;
  if (eposta !== undefined && eposta !== null && eposta !== "") {
    posta = epostaDuzelt(eposta);
    if (!epostaGecerliMi(posta)) return hata("Geçerli bir e-posta adresi yaz.");
    if ((await epostaHesapSayisi(posta, kullanici.id)) >= EPOSTA_BASINA_HESAP) {
      return hata(`Bu e-posta adresiyle en fazla ${EPOSTA_BASINA_HESAP} hesap olabilir.`, 409);
    }
  }
  if (!posta) return hata("Önce e-posta adresini yaz.");
  if (!kullanici.kosul_onay) {
    if (kosulKabul !== true) return hata("Devam etmek için Kullanım Koşulları ve Gizlilik Bildirimi'ni kabul etmelisin.");
    await d.prepare("UPDATE kullanicilar SET kosul_onay = ? WHERE id = ?").bind(Date.now(), kullanici.id).run();
  }
  if (posta !== kullanici.eposta) {
    await d.prepare("UPDATE kullanicilar SET eposta = ?, eposta_dogrulandi = 0 WHERE id = ?").bind(posta, kullanici.id).run();
  }
  const g = await kodGonder(kullanici.id, posta, "dogrula");
  if (g.hata) return hata(g.hata, 429);
  return Response.json({ tamam: true, eposta: posta });
}
