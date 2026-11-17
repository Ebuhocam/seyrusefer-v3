import "server-only";
import { cookies } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// =============================================================
// GİZLİ ÖN İZLEME KAPISI
// Cloudflare'de ONIZLEME_SIFRESI adlı gizli değişken tanımlıysa site "hazırlanıyor"
// sayfasının arkasına saklanır; şifreyi bilen kişi tarayıcısına imzalı bir çerez alır.
// Değişken silinince site herkese açılır. Yerel geliştirmede değişken yoksa kapı yoktur.
// =============================================================
export const ONIZLEME_CEREZ = "seyrusefer_onizleme";
const CEREZ_GUN = 60;

async function sifreOku() {
  let s = process.env.ONIZLEME_SIFRESI;
  if (!s) {
    try {
      const ctx = await getCloudflareContext({ async: true });
      s = ctx?.env?.ONIZLEME_SIFRESI;
    } catch {
      // Cloudflare bağlamı yoksa (yerel geliştirme) kapı kapalı değildir
    }
  }
  return String(s ?? "").trim();
}

async function ozet(metin) {
  const veri = new TextEncoder().encode(metin);
  const h = await crypto.subtle.digest("SHA-256", veri);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const cerezDegeri = (sifre) => ozet(`seyrusefer-onizleme:${sifre}`);

/** Ziyaretçi siteyi görebilir mi? (kapı yoksa ya da geçerli çerezi varsa evet) */
export async function onizlemeIzniVar() {
  const sifre = await sifreOku();
  if (!sifre) return true;
  const cerez = (await cookies()).get(ONIZLEME_CEREZ)?.value;
  return Boolean(cerez) && cerez === (await cerezDegeri(sifre));
}

/** Girilen şifre doğruysa çerezi yazar ve true döner */
export async function onizlemeSifresiyleGir(girilen) {
  const sifre = await sifreOku();
  if (!sifre) return true;
  if (String(girilen ?? "").trim() !== sifre) return false;
  (await cookies()).set(ONIZLEME_CEREZ, await cerezDegeri(sifre), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: CEREZ_GUN * 24 * 60 * 60,
  });
  return true;
}

export async function onizlemedenCik() {
  (await cookies()).delete(ONIZLEME_CEREZ);
}
