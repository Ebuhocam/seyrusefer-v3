import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "./db";
import { SITE_ADI } from "../yasal";

// =============================================================
// E-posta doğrulama kodları ve gönderim (Resend)
// Gizli değişken: RESEND_API_KEY (Cloudflare → Worker → Settings → Variables and Secrets)
// İsteğe bağlı: EPOSTA_GONDEREN (varsayılan "Seyrüsefer <noreply@seyrusefer.org>")
// =============================================================
const KOD_OMRU_MS = 15 * 60 * 1000;
const BEKLEME_MS = 60 * 1000; // aynı hesaba iki kod arası
const SAATLIK_SINIR = 5; // aynı e-postaya saatte en fazla kod
const MAKS_DENEME = 5;
export const EPOSTA_BASINA_HESAP = 3; // kardeşler aynı veli e-postasını kullanabilsin

export const epostaDuzelt = (s) => String(s ?? "").trim().toLowerCase();
export const epostaGecerliMi = (s) => s.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

async function sha256(metin) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(metin));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function kodUret() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(n).padStart(6, "0");
}

export async function ortamOku(ad) {
  let v = process.env[ad];
  if (!v) {
    try {
      const ctx = await getCloudflareContext({ async: true });
      v = ctx?.env?.[ad];
    } catch {
      // Cloudflare bağlamı yok (yerel geliştirme)
    }
  }
  return String(v ?? "").trim();
}

async function mailGonder({ to, konu, metin, html }) {
  const anahtar = await ortamOku("RESEND_API_KEY");
  if (!anahtar) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[E-POSTA - yerel geliştirme] ${to}: ${konu}\n${metin}`);
      return;
    }
    throw new Error("E-posta servisi ayarlanmamış (RESEND_API_KEY yok).");
  }
  const gonderen = (await ortamOku("EPOSTA_GONDEREN")) || `${SITE_ADI} <noreply@seyrusefer.org>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${anahtar}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: gonderen, to: [to], subject: konu, text: metin, html }),
  });
  if (!r.ok) throw new Error(`E-posta gönderilemedi (${r.status}).`);
}

const AMAC_METNI = {
  dogrula: { konu: `${SITE_ADI} e-posta doğrulama kodun`, giris: "E-posta adresini doğrulamak için kodun:" },
  sifre: { konu: `${SITE_ADI} şifre sıfırlama kodun`, giris: "Şifreni sıfırlamak için kodun:" },
};

/** Kod üretir, kaydeder ve e-postayla gönderir. Sorun olursa { hata } döner. */
export async function kodGonder(kullaniciId, eposta, amac) {
  const d = await db();
  const simdi = Date.now();

  const son = await d
    .prepare("SELECT olusturma FROM eposta_kodlari WHERE kullanici_id = ? AND amac = ? ORDER BY olusturma DESC LIMIT 1")
    .bind(kullaniciId, amac)
    .first();
  if (son && simdi - son.olusturma < BEKLEME_MS) {
    const sn = Math.ceil((BEKLEME_MS - (simdi - son.olusturma)) / 1000);
    return { hata: `Yeni kod için ${sn} saniye bekle.` };
  }
  const saatlik = await d
    .prepare("SELECT COUNT(*) AS adet FROM eposta_kodlari WHERE eposta = ? AND olusturma > ?")
    .bind(eposta, simdi - 60 * 60 * 1000)
    .first();
  if ((saatlik?.adet ?? 0) >= SAATLIK_SINIR) return { hata: "Bu adrese çok fazla kod gönderildi. Bir saat sonra tekrar dene." };

  const kod = kodUret();
  await d.prepare("DELETE FROM eposta_kodlari WHERE kullanici_id = ? AND amac = ?").bind(kullaniciId, amac).run();
  await d
    .prepare("INSERT INTO eposta_kodlari (kullanici_id, eposta, amac, kod_hash, bitis, olusturma) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(kullaniciId, eposta, amac, await sha256(`${kullaniciId}:${amac}:${kod}`), simdi + KOD_OMRU_MS, simdi)
    .run();

  const m = AMAC_METNI[amac];
  const metin = `${m.giris} ${kod}\n\nKod 15 dakika geçerlidir. Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.`;
  const html =
    `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:20px;border:1px solid #e7b93b;border-radius:12px">` +
    `<h2 style="margin:0 0 8px;color:#0d1628">${SITE_ADI}</h2><p>${m.giris}</p>` +
    `<p style="font-size:34px;letter-spacing:8px;font-weight:bold;color:#0d1628;margin:12px 0">${kod}</p>` +
    `<p style="color:#555;font-size:13px">Kod 15 dakika geçerlidir. Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.</p></div>`;
  try {
    await mailGonder({ to: eposta, konu: m.konu, metin, html });
  } catch (e) {
    console.error("[eposta]", e?.message);
    return { hata: "E-posta şu an gönderilemedi. Biraz sonra tekrar dene." };
  }
  return { tamam: true };
}

/** Kodu doğrular; başarılıysa kodu siler. { tamam } veya { hata } döner. */
export async function kodDogrula(kullaniciId, amac, girilen) {
  const d = await db();
  const kayit = await d
    .prepare("SELECT id, kod_hash, bitis, deneme, eposta FROM eposta_kodlari WHERE kullanici_id = ? AND amac = ? ORDER BY olusturma DESC LIMIT 1")
    .bind(kullaniciId, amac)
    .first();
  const kod = String(girilen ?? "").replace(/\s+/g, "");
  if (!kayit || !/^\d{6}$/.test(kod)) return { hata: "Kod hatalı veya süresi dolmuş." };
  if (kayit.bitis < Date.now() || kayit.deneme >= MAKS_DENEME) {
    await d.prepare("DELETE FROM eposta_kodlari WHERE id = ?").bind(kayit.id).run();
    return { hata: "Kodun süresi doldu veya çok fazla deneme yapıldı. Yeni kod iste." };
  }
  if ((await sha256(`${kullaniciId}:${amac}:${kod}`)) !== kayit.kod_hash) {
    await d.prepare("UPDATE eposta_kodlari SET deneme = deneme + 1 WHERE id = ?").bind(kayit.id).run();
    return { hata: "Kod hatalı." };
  }
  await d.prepare("DELETE FROM eposta_kodlari WHERE id = ?").bind(kayit.id).run();
  return { tamam: true, eposta: kayit.eposta };
}

/** Bu e-postayı (verilen hesap dışında) kaç hesap kullanıyor? */
export async function epostaHesapSayisi(eposta, haricId = 0) {
  const d = await db();
  const s = await d
    .prepare("SELECT COUNT(*) AS adet FROM kullanicilar WHERE eposta = ? AND id != ?")
    .bind(eposta, haricId)
    .first();
  return s?.adet ?? 0;
}
