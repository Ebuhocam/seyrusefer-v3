import "server-only";
import { ortamOku } from "./eposta";

// =============================================================
// Firebase Cloud Messaging (HTTP v1) — Cloudflare Worker içinden bildirim gönderimi.
// Gizli değişken: FIREBASE_SERVICE_ACCOUNT (service account .json dosyasının tüm içeriği)
// =============================================================
const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const metinB64url = (s) => b64url(new TextEncoder().encode(s));

let onbellek = { hesap: null, jeton: null, bitis: 0 };

async function hesapOku() {
  if (onbellek.hesap) return onbellek.hesap;
  const ham = await ortamOku("FIREBASE_SERVICE_ACCOUNT");
  if (!ham) throw new Error("FIREBASE_SERVICE_ACCOUNT tanımlı değil.");
  const hesap = JSON.parse(ham);
  if (!hesap.private_key || !hesap.client_email || !hesap.project_id) throw new Error("Service account dosyası eksik.");
  onbellek.hesap = hesap;
  return hesap;
}

async function erisimJetonu() {
  if (onbellek.jeton && Date.now() < onbellek.bitis - 60000) return onbellek.jeton;
  const hesap = await hesapOku();
  const simdi = Math.floor(Date.now() / 1000);
  const baslik = metinB64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const yuk = metinB64url(
    JSON.stringify({
      iss: hesap.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: simdi,
      exp: simdi + 3600,
    })
  );
  const der = Uint8Array.from(
    atob(hesap.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")),
    (c) => c.charCodeAt(0)
  );
  const anahtar = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const imza = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", anahtar, new TextEncoder().encode(`${baslik}.${yuk}`));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${baslik}.${yuk}.${b64url(imza)}`,
    }),
  });
  if (!r.ok) throw new Error(`Google erişim jetonu alınamadı (${r.status}).`);
  const j = await r.json();
  onbellek.jeton = j.access_token;
  onbellek.bitis = Date.now() + (j.expires_in ?? 3600) * 1000;
  return onbellek.jeton;
}

/** Tek cihaza bildirim gönderir. { tamam } veya { tamam:false, gecersiz } (kod artık geçersizse). */
export async function bildirimGonder(token, { baslik, metin, url = "/" }) {
  const hesap = await hesapOku();
  const jeton = await erisimJetonu();
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${hesap.project_id}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        token,
        data: { baslik, metin, url },
        webpush: { headers: { TTL: "86400", Urgency: "normal" } },
      },
    }),
  });
  if (r.ok) return { tamam: true };
  const j = await r.json().catch(() => ({}));
  const kod = j?.error?.details?.find?.((d) => d.errorCode)?.errorCode ?? j?.error?.status;
  return { tamam: false, gecersiz: r.status === 404 || kod === "UNREGISTERED", durum: r.status };
}

/** Cron çağrısını doğrulamak için gizli değişkenden türetilen anahtar (ek gizli değişken gerekmez). */
export async function cronAnahtari() {
  const ham = (await ortamOku("FIREBASE_SERVICE_ACCOUNT")).trim();
  if (!ham) return "";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ham));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
