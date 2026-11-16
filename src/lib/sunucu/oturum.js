import "server-only";
import { cookies, headers } from "next/headers";
import { db } from "./db";

export const CEREZ = "seyrusefer_oturum";
const OTURUM_GUN = 30;
const OTURUM_MS = OTURUM_GUN * 24 * 60 * 60 * 1000;

async function httpsBaglantisiMi() {
  try {
    const h = await headers();
    const proto = (h.get("x-forwarded-proto") || "").split(",")[0].trim();
    if (proto === "https") return true;
    const origin = h.get("origin") || h.get("referer") || "";
    if (origin.startsWith("https://")) return true;
    const xfHost = (h.get("x-forwarded-host") || "").split(",")[0].trim();
    if (xfHost && !xfHost.startsWith("localhost") && !xfHost.startsWith("127.0.0.1")) return true;
  } catch {
    // Sunucu bağlamı dışında varsayılan kontrol
  }
  return process.env.NODE_ENV === "production";
}

async function sha256(metin) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(metin));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function rastgeleToken() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Yeni oturum açar ve çerezi yazar (Route Handler / Server Function içinden çağrılmalı) */
export async function oturumAc(kullaniciId) {
  const token = rastgeleToken();
  const simdi = Date.now();
  const d = await db();
  await d
    .prepare("INSERT INTO oturumlar (token_hash, kullanici_id, bitis, olusturma) VALUES (?, ?, ?, ?)")
    .bind(await sha256(token), kullaniciId, simdi + OTURUM_MS, simdi)
    .run();
  // Ara sıra süresi dolmuş oturumları temizle
  if (Math.random() < 0.05) await d.prepare("DELETE FROM oturumlar WHERE bitis < ?").bind(simdi).run();

  const guvenli = await httpsBaglantisiMi();
  (await cookies()).set(CEREZ, token, {
    httpOnly: true,
    sameSite: guvenli ? "none" : "lax",
    secure: guvenli,
    path: "/",
    maxAge: OTURUM_GUN * 24 * 60 * 60,
  });
}

/** Çerezdeki oturumun kullanıcısını döner; yoksa null */
export async function aktifKullanici() {
  const token = (await cookies()).get(CEREZ)?.value;
  if (!token) return null;
  const d = await db();
  const satir = await d
    .prepare(
      `SELECT k.id, k.kullanici_adi, k.ad, k.rol
         FROM oturumlar o JOIN kullanicilar k ON k.id = o.kullanici_id
        WHERE o.token_hash = ? AND o.bitis > ?`
    )
    .bind(await sha256(token), Date.now())
    .first();
  return satir ?? null;
}

export async function oturumKapat() {
  const jar = await cookies();
  const token = jar.get(CEREZ)?.value;
  if (token) {
    const d = await db();
    await d.prepare("DELETE FROM oturumlar WHERE token_hash = ?").bind(await sha256(token)).run();
  }
  const guvenli = await httpsBaglantisiMi();
  jar.set(CEREZ, "", {
    httpOnly: true,
    sameSite: guvenli ? "none" : "lax",
    secure: guvenli,
    path: "/",
    maxAge: 0,
  });
}

/** Geliştirici araçları: yerel geliştirmede herkese, canlıda sadece admin'e açık */
export const gelistiriciIzni = (kullanici) => process.env.NODE_ENV !== "production" || kullanici?.rol === "admin";
