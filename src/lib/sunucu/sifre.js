import "server-only";
// Şifre özeti: PBKDF2-SHA256 (Web Crypto — Cloudflare Workers'ta da çalışır).
// Workers PBKDF2 için en fazla 100.000 iterasyona izin verir.

const ITERASYON = 100000;
const enc = new TextEncoder();

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const b64Coz = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function turet(sifre, tuz, iterasyon) {
  const anahtar = await crypto.subtle.importKey("raw", enc.encode(sifre), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: tuz, iterations: iterasyon }, anahtar, 256);
}

export async function sifreOzetle(sifre) {
  const tuz = crypto.getRandomValues(new Uint8Array(16));
  const ozet = await turet(sifre, tuz, ITERASYON);
  return `pbkdf2$${ITERASYON}$${b64(tuz)}$${b64(ozet)}`;
}

export async function sifreDogrula(sifre, kayitli) {
  const [tur, iter, tuz, ozet] = String(kayitli).split("$");
  if (tur !== "pbkdf2") return false;
  const yeni = new Uint8Array(await turet(sifre, b64Coz(tuz), Number(iter)));
  const eski = b64Coz(ozet);
  if (yeni.length !== eski.length) return false;
  let fark = 0;
  for (let i = 0; i < yeni.length; i++) fark |= yeni[i] ^ eski[i];
  return fark === 0;
}
