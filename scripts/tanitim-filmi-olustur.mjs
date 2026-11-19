/**
 * Seyrüsefer v3 — Tanıtım Filmi Üretici (1920x1080 Full HD MP4, Sıfır Titreme)
 *
 * Mimari:
 *   1. Her sahne iki katman olarak 1920x1080 çizilir:
 *      - `bg_XX.png`: Yalnızca arka plan harita / mekân / binalar
 *      - `ui_XX.png`: Şeffaf zeminde sabit Tezhip altın çerçeve, kartlar ve yazılar
 *   2. Arka plan katmanı FFmpeg'te 3x süper-örnekleme (`5760x3240` Lanczos) ile
 *      pürüzsüz Ken Burns hareketi alır; UI katmanı ise üzerine sabit (`0:0`)
 *      bindirilerek yazı ve çizgilerde sıfır titreme sağlanır.
 *   3. Köy Haritası (Sahne 1) `sabitler.js` ve `KoyHaritasi.js` kurallarını birebir kullanır:
 *      `1710x920` oran, `translate(-50%, -78%)` ve tam dolu altın başaklı Tarla SVG'si.
 *   4. Birlik Alanı (Sahne 7) güncel çerçevesiz `birlik_alani.webp` haritası ve
 *      `translate(-50%, -65%)` kuralıyla oluşturulur.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import {
  ARSALAR,
  BINALAR,
  BIRLIK_BINALARI,
  BIRLIK_MEYDANI_CINAR,
  NOKTALAR,
} from "../src/lib/oyun/sabitler.js";

const KOK = process.cwd();
const VARLIK = (altYol) => path.join(KOK, "public", "assets", altYol);
const PUBLIC_DOSYA = (altYol) => path.join(KOK, "public", altYol.replace(/^\/+/, ""));
const GECICI_KLASOR = path.join(KOK, ".tmp-tanitim");
const CIKTI_ANA = path.join(KOK, "tanitim_filmi.mp4");

const FFMPEG_ADAYLARI = [
  process.env.FFMPEG_PATH,
  "C:\\Users\\Ebubekir\\Desktop\\Sarıgelin\\node_modules\\ffmpeg-static\\ffmpeg.exe",
  "ffmpeg",
].filter(Boolean);

const W = 1920;
const H = 1080;
const MW = 1710;
const MH = 920;
const FPS = 30;
const GECIS_SURE = 0.6;

// Tezhip Paleti (src/app/globals.css)
const RENK = {
  murekkep: "#0d1628",
  lacivert: "#16223a",
  varak: "#e7b93b",
  varakAcik: "#faeec2",
  varakKoyu: "#946511",
  cini: "#34b2a3",
  ciniAcik: "#c8efe7",
  parsomen: "#f6eed8",
  nar: "#a8322a",
};

const FONT_BASLIK = "Georgia, 'Times New Roman', serif";
const FONT_METIN = "'Segoe UI', Arial, sans-serif";

// KoyHaritasi.js içindeki TarlaUrunleri geometrisi ve sözde rastgele dizilimi (birebir)
const TARLA_KOSELERI = { ust: [200, 354], sag: [316, 420], alt: [150, 526], sol: [22, 452] };

function tarlaNoktasi(u, v) {
  const { ust, sag, alt, sol } = TARLA_KOSELERI;
  const x = (1 - u) * (1 - v) * ust[0] + u * (1 - v) * sag[0] + u * v * alt[0] + (1 - u) * v * sol[0];
  const y = (1 - u) * (1 - v) * ust[1] + u * (1 - v) * sag[1] + u * v * alt[1] + (1 - u) * v * sol[1];
  return [x, y];
}

const TARLA_BITKILERI = (() => {
  const liste = [];
  let t = 7;
  const r = () => ((t = (t * 9301 + 49297) % 233280) / 233280);
  const SIRA = 16;
  const SUTUN = 22;
  for (let i = 0; i < SIRA; i++) {
    const v = 0.06 + (i / (SIRA - 1)) * 0.88;
    if (v > 0.46 && v < 0.54) continue;
    for (let j = 0; j < SUTUN; j++) {
      const u = 0.05 + (j / (SUTUN - 1)) * 0.9 + (r() - 0.5) * 0.02;
      if (u > 0.455 && u < 0.53) continue;
      const [x, y] = tarlaNoktasi(u, v);
      liste.push({ x, y, b: 1.05 + r() * 0.35, e: (r() - 0.5) * 0.6 });
    }
  }
  return liste.sort((a, b) => a.y - b.y);
})();

function doluTarlaSvgBuffer() {
  const basaklar = TARLA_BITKILERI.map(
    (p) =>
      `<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${p.b.toFixed(2)})">` +
      `<path d="M0 0 Q${p.e} -6 ${p.e * 2} -11" stroke="#6b4a12" stroke-width="1.1" fill="none"/>` +
      `<ellipse cx="${p.e * 2}" cy="-12.5" rx="1.9" ry="3.6" fill="#e7b93b" stroke="#6b4a12" stroke-width="0.7"/>` +
      `<path d="M-0.3 -4 q-2.4 -1 -3.4 -3.2 M0.3 -5 q2.4 -1 3.2 -3.4" stroke="#a77d1d" stroke-width="0.8" fill="none"/>` +
      `</g>`
  ).join("");
  return Buffer.from(
    `<svg width="1376" height="768" viewBox="0 0 1376 768" xmlns="http://www.w3.org/2000/svg">${basaklar}</svg>`
  );
}

function ffmpegBul() {
  for (const aday of FFMPEG_ADAYLARI) {
    if (aday === "ffmpeg") {
      const deneme = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
      if (deneme.status === 0) return "ffmpeg";
    } else if (fs.existsSync(aday)) {
      return aday;
    }
  }
  throw new Error("FFmpeg bulunamadı.");
}

function calistir(ffmpeg, args, baslik) {
  const sonuc = spawnSync(ffmpeg, args, { encoding: "utf8" });
  if (sonuc.status !== 0) {
    console.error(`${baslik} hatası:\n`, sonuc.stderr);
    throw new Error(`FFmpeg hata kodu: ${sonuc.status}`);
  }
}

function xmlKacis(metin) {
  return String(metin)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function metinSatirla(metin, maksKarakter = 46) {
  const kelimeler = String(metin).trim().split(/\s+/);
  const satirlar = [];
  let suAn = "";
  for (const k of kelimeler) {
    if (!suAn) suAn = k;
    else if (suAn.length + 1 + k.length <= maksKarakter) suAn += " " + k;
    else {
      satirlar.push(suAn);
      suAn = k;
    }
  }
  if (suAn) satirlar.push(suAn);
  return satirlar;
}

function svgSatirlar({
  x,
  y,
  satirlar,
  satirAraligi = 36,
  boyut = 26,
  renk = RENK.parsomen,
  font = FONT_METIN,
  kalinlik = "600",
  hiza = "start",
}) {
  return satirlar
    .map(
      (s, i) =>
        `<text x="${x}" y="${y + i * satirAraligi}" text-anchor="${hiza}" font-family="${font}" font-size="${boyut}" font-weight="${kalinlik}" fill="${renk}">${xmlKacis(s)}</text>`
    )
    .join("\n");
}

function selcukluYildiz(cx, cy, r = 16, renk = RENK.varak) {
  const k = r / 12;
  return `
    <g transform="translate(${cx - 12 * k}, ${cy - 12 * k}) scale(${k})">
      <path fill="${renk}" d="M12 1l3.2 3.3 4.6-.1-.1 4.6L23 12l-3.3 3.2.1 4.6-4.6-.1L12 23l-3.2-3.3-4.6.1.1-4.6L1 12l3.3-3.2-.1-4.6 4.6.1z"/>
      <circle cx="12" cy="12" r="3.4" fill="${RENK.murekkep}"/>
    </g>
  `;
}

function tezhipCerceveKatmani(altMetin, golgeOpaklik = 0.78) {
  const m = 48;
  return `
    <defs>
      <linearGradient id="ustGolge" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0d1628" stop-opacity="${golgeOpaklik}"/>
        <stop offset="22%" stop-color="#0d1628" stop-opacity="0.06"/>
        <stop offset="78%" stop-color="#0d1628" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#0d1628" stop-opacity="0.86"/>
      </linearGradient>
      <linearGradient id="altinCizgi" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#946511" stop-opacity="0.30"/>
        <stop offset="25%" stop-color="#e7b93b" stop-opacity="0.95"/>
        <stop offset="50%" stop-color="#faeec2" stop-opacity="1"/>
        <stop offset="75%" stop-color="#e7b93b" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#946511" stop-opacity="0.30"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ustGolge)"/>
    <rect x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}" rx="22" fill="none" stroke="url(#altinCizgi)" stroke-width="3"/>
    <rect x="${m + 10}" y="${m + 10}" width="${W - 2 * (m + 10)}" height="${H - 2 * (m + 10)}" rx="16" fill="none" stroke="${RENK.varak}" stroke-opacity="0.32" stroke-width="1.5"/>
    ${selcukluYildiz(m, m, 18)}
    ${selcukluYildiz(W - m, m, 18)}
    ${selcukluYildiz(m, H - m, 18)}
    ${selcukluYildiz(W - m, H - m, 18)}
    <rect x="${W / 2 - 360}" y="${H - m - 16}" width="720" height="32" rx="16" fill="${RENK.murekkep}" stroke="${RENK.varak}" stroke-width="2"/>
    <text x="${W / 2}" y="${H - m + 6}" text-anchor="middle" font-family="${FONT_METIN}" font-size="16" font-weight="700" letter-spacing="1.6" fill="${RENK.varakAcik}">${xmlKacis(altMetin)}</text>
  `;
}

async function kapakArkaPlan(dosyaYolu, karartma = 0.25) {
  const temel = await sharp(dosyaYolu).resize(W, H, { fit: "cover", position: "center" }).ensureAlpha().toBuffer();
  if (karartma <= 0) return sharp(temel);
  const perde = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="${RENK.murekkep}" fill-opacity="${karartma}"/></svg>`
  );
  const birlesik = await sharp(temel).composite([{ input: perde }]).toBuffer();
  return sharp(birlesik);
}

async function ikiliArkaPlan(solDosya, sagDosya, karartma = 0.56) {
  const yari = W / 2;
  const sol = await sharp(solDosya).resize(yari, H, { fit: "cover", position: "center" }).toBuffer();
  const sag = await sharp(sagDosya).resize(yari, H, { fit: "cover", position: "center" }).toBuffer();
  const perde = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="${H}" fill="${RENK.murekkep}" fill-opacity="${karartma}"/>
      <line x1="${yari}" y1="76" x2="${yari}" y2="${H - 76}" stroke="${RENK.varak}" stroke-opacity="0.55" stroke-width="3"/>
    </svg>`
  );
  const birlesik = await sharp({
    create: { width: W, height: H, channels: 4, background: RENK.murekkep },
  })
    .composite([
      { input: sol, left: 0, top: 0 },
      { input: sag, left: yari, top: 0 },
      { input: perde, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
  return sharp(birlesik);
}

/**
 * 1710x920 harita tuvaline KoyHaritasi.js ile birebir yerlesim uygular
 * ve sonucu 1920x1080 tuvale hicbir binayi kirpmadan yerlestirir.
 */
async function haritaTuvaliOlustur(temelHaritaBuf, katmanNesneleri) {
  katmanNesneleri.sort((a, b) => a.z - b.z);
  const parcalar = [];

  for (const item of katmanNesneleri) {
    if (item.svg) {
      parcalar.push({ input: item.svg, left: 0, top: 0 });
      continue;
    }
    const w = Math.round((item.genislik / 100) * MW);
    const parca = await sharp(item.dosya)
      .resize({ width: w })
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    const left = Math.round((item.x / 100) * MW - parca.info.width * (item.anchorX ?? 0.5));
    const top = Math.round((item.y / 100) * MH - parca.info.height * (item.anchorY ?? 0.78));
    parcalar.push({
      input: parca.data,
      left: Math.max(0, left),
      top: Math.max(0, top),
    });
  }

  const tuval1710 = await sharp(temelHaritaBuf)
    .resize(MW, MH, { fit: "cover", position: "center" })
    .composite(parcalar)
    .png()
    .toBuffer();

  // 1710x920 -> 1920x1033 tam sığdır, alt/üst 23px boşluğu koyu zemin + harita uzantısı ile yumuşak kapat
  const harita1920 = await sharp(tuval1710).resize(W, Math.round((W * MH) / MW)).png().toBuffer();
  const disZemin = await sharp(tuval1710)
    .resize(W, H, { fit: "cover", position: "center" })
    .blur(12)
    .modulate({ brightness: 0.45 })
    .png()
    .toBuffer();

  return sharp(disZemin).composite([{ input: harita1920, left: 0, top: Math.round((H - Math.round((W * MH) / MW)) / 2) }]);
}

async function yuvarlakPortre(dosya, cap = 215, cerceveRenk = RENK.varak) {
  const icCap = cap - 14;
  const resim = await sharp(VARLIK(dosya)).resize(icCap, icCap, { fit: "cover", position: "top" }).ensureAlpha().toBuffer();
  const maske = Buffer.from(
    `<svg width="${icCap}" height="${icCap}" xmlns="http://www.w3.org/2000/svg"><circle cx="${icCap / 2}" cy="${icCap / 2}" r="${icCap / 2}" fill="#fff"/></svg>`
  );
  const kesilmis = await sharp(resim).composite([{ input: maske, blend: "dest-in" }]).png().toBuffer();
  const halka = Buffer.from(
    `<svg width="${cap}" height="${cap}" xmlns="http://www.w3.org/2000/svg"><circle cx="${cap / 2}" cy="${cap / 2}" r="${cap / 2 - 3}" fill="${RENK.lacivert}" stroke="${cerceveRenk}" stroke-width="5"/></svg>`
  );
  return sharp(halka).composite([{ input: kesilmis, left: 7, top: 7 }]).png().toBuffer();
}

async function sahneKatmanlariniKaydet(no, bgSharp, bgEkler, uiSvgStr, uiEkler = []) {
  const bgYol = path.join(GECICI_KLASOR, `bg_${no}.png`);
  const uiYol = path.join(GECICI_KLASOR, `ui_${no}.png`);

  await (bgEkler.length ? bgSharp.composite(bgEkler) : bgSharp).png().toFile(bgYol);

  const uiSvgBuf = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${uiSvgStr}</svg>`);
  await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: uiSvgBuf, left: 0, top: 0 }, ...uiEkler])
    .png()
    .toFile(uiYol);

  return { bgYol, uiYol };
}

// =============================================================
// 8 SAHNE (1920x1080)
// =============================================================

async function sahne1() {
  // 1. Dolu tarla SVG'sini native 1376x768 koy.webp üstüne bindir
  const doluKoy = await sharp(VARLIK("harita/koy.webp"))
    .composite([{ input: doluTarlaSvgBuffer(), left: 0, top: 0 }])
    .png()
    .toBuffer();

  // 2. Tüm köy binaları (ARSALAR) ve Haberci (NOKTALAR.haberci) KoyHaritasi.js koordinatlarıyla
  const koySeviyeleri = {
    otag: 4,
    mektep: 1,
    kiraathane: 1,
    sosyalmeydan: 4,
    kendi_evim: 3,
    ev1: 3,
    ev2: 2,
    ev3: 2,
    ev4: 2,
    ev5: 1,
  };

  const nesneler = Object.entries(ARSALAR).map(([id, a]) => ({
    dosya: PUBLIC_DOSYA(BINALAR[id].gorsel(koySeviyeleri[id] ?? 1)),
    x: a.x,
    y: a.y,
    genislik: a.genislik,
    anchorX: 0.5,
    anchorY: 0.78,
    z: Math.round(a.y * 2),
  }));

  nesneler.push({
    dosya: PUBLIC_DOSYA(NOKTALAR.haberci.gorsel),
    x: NOKTALAR.haberci.x,
    y: NOKTALAR.haberci.y,
    genislik: 5.2,
    anchorX: 0.5,
    anchorY: 0.84,
    z: Math.round(NOKTALAR.haberci.y * 2),
  });

  const bgSharp = await haritaTuvaliOlustur(doluKoy, nesneler);

  // Üst soldaki orman boşluğuna yerleştirilen zarif başlık kartı (Oba/Mektep/Tarla hiç kapanmaz)
  const uiSvg = `
    ${tezhipCerceveKatmani("SEYRÜSEFER · NİYETTEN İHSANA GÖNÜL YOLCULUĞU", 0.55)}
    <rect x="76" y="74" width="720" height="196" rx="22" fill="${RENK.murekkep}" fill-opacity="0.90" stroke="${RENK.varak}" stroke-width="2.5"/>
    <rect x="88" y="86" width="696" height="172" rx="16" fill="none" stroke="${RENK.varak}" stroke-opacity="0.30" stroke-width="1.2"/>
    <text x="116" y="126" font-family="${FONT_METIN}" font-size="18" font-weight="800" letter-spacing="2.4" fill="${RENK.cini}">TÜRKİYE&apos;NİN İLK MANEVİ GELİŞİM VE AİLE OYUNU</text>
    <text x="116" y="198" font-family="${FONT_BASLIK}" font-size="68" font-weight="900" letter-spacing="5" fill="${RENK.varak}">SEYRÜSEFER</text>
    <text x="116" y="240" font-family="${FONT_METIN}" font-size="22" font-weight="600" fill="${RENK.parsomen}">Köyünü Kur · Değerlerle Büyü · Ailenle Buluş</text>

    <rect x="260" y="${H - 166}" width="${W - 520}" height="74" rx="20" fill="${RENK.murekkep}" fill-opacity="0.91" stroke="${RENK.varak}" stroke-width="2.5"/>
    <text x="${W / 2}" y="${H - 120}" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="28" font-weight="700" fill="${RENK.varakAcik}">Çocukları ekran başında yalnızlaştıran değil, aileyi bir araya getiren oyun</text>
  `;
  return sahneKatmanlariniKaydet("01", bgSharp, [], uiSvg);
}

async function sahne2() {
  const bgSharp = await kapakArkaPlan(VARLIK("mekanlar/ev_ici.webp"), 0.54);
  const portreler = await Promise.all(
    [
      { dosya: "karakterler/ahmet.webp", x: 1245, y: 225 },
      { dosya: "karakterler/elif.webp", x: 1510, y: 225 },
      { dosya: "karakterler/omer.webp", x: 1245, y: 500 },
      { dosya: "karakterler/zeynep.webp", x: 1510, y: 500 },
    ].map(async (k) => ({ input: await yuvarlakPortre(k.dosya, 215), left: k.x, top: k.y }))
  );

  const baslik = metinSatirla("Tek Başına Değil, Ailenle Bir Araya Gel!", 26);
  const aciklama = metinSatirla(
    "Seyrüsefer, ekran süresini aileden koparan bir alışkanlıktan çıkarır; anne, baba ve çocukları akşamları aynı sohbetin ve muhabbetin etrafında buluşturur.",
    46
  );

  const uiSvg = `
    ${tezhipCerceveKatmani("KENDİ EVİM · EKRANDAN SOFRAYA TAŞINAN MUHABBET")}
    <rect x="124" y="160" width="1012" height="702" rx="28" fill="${RENK.murekkep}" fill-opacity="0.90" stroke="${RENK.varak}" stroke-width="2.5"/>
    <rect x="140" y="176" width="980" height="670" rx="22" fill="none" stroke="${RENK.varak}" stroke-opacity="0.30" stroke-width="1.2"/>
    <rect x="180" y="210" width="402" height="42" rx="21" fill="${RENK.cini}" fill-opacity="0.22" stroke="${RENK.cini}" stroke-width="2"/>
    <text x="381" y="238" text-anchor="middle" font-family="${FONT_METIN}" font-size="19" font-weight="800" letter-spacing="1.8" fill="${RENK.ciniAcik}">KENDİ EVİM · AİLE BULUŞMASI</text>
    ${svgSatirlar({ x: 180, y: 330, satirlar: baslik, satirAraligi: 64, boyut: 53, renk: RENK.varak, font: FONT_BASLIK, kalinlik: "900" })}
    <line x1="180" y1="480" x2="1046" y2="480" stroke="${RENK.varak}" stroke-opacity="0.4" stroke-width="2"/>
    ${svgSatirlar({ x: 180, y: 540, satirlar: aciklama, satirAraligi: 42, boyut: 27, renk: RENK.parsomen, font: FONT_METIN, kalinlik: "500" })}

    <rect x="180" y="725" width="265" height="64" rx="16" fill="${RENK.lacivert}" stroke="${RENK.varak}" stroke-width="2"/>
    <text x="312" y="764" text-anchor="middle" font-family="${FONT_METIN}" font-size="20" font-weight="700" fill="${RENK.varakAcik}">Aile Okuma Saati</text>
    <rect x="468" y="725" width="286" height="64" rx="16" fill="${RENK.lacivert}" stroke="${RENK.cini}" stroke-width="2"/>
    <text x="611" y="764" text-anchor="middle" font-family="${FONT_METIN}" font-size="20" font-weight="700" fill="${RENK.ciniAcik}">Aile Sofrası Oyunları</text>
    <rect x="776" y="725" width="270" height="64" rx="16" fill="${RENK.lacivert}" stroke="${RENK.varak}" stroke-width="2"/>
    <text x="911" y="764" text-anchor="middle" font-family="${FONT_METIN}" font-size="20" font-weight="700" fill="${RENK.varakAcik}">Kalıcı Güzel Ahlak</text>

    <rect x="1218" y="758" width="530" height="104" rx="20" fill="${RENK.murekkep}" fill-opacity="0.90" stroke="${RENK.varak}" stroke-width="2"/>
    <text x="1483" y="804" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="26" font-weight="800" fill="${RENK.varak}">10 Özgün Anadolu Karakteri</text>
    <text x="1483" y="838" text-anchor="middle" font-family="${FONT_METIN}" font-size="20" font-weight="600" fill="${RENK.parsomen}">Gençlere ilham veren sıcak rol modeller</text>
  `;
  return sahneKatmanlariniKaydet("02", bgSharp, [], uiSvg, portreler);
}

async function sahne3() {
  const bgSharp = await kapakArkaPlan(VARLIK("harita/koy.webp"), 0.66);
  const haberci = await sharp(VARLIK("binalar/seyyaherkek.webp")).resize({ width: 465 }).ensureAlpha().toBuffer();
  const mektupMetni = metinSatirla(
    "Sevgili ev halkım, bugün sofraya hep birlikte oturalım. Yemeğe besmeleyle başlayıp şükürle kalkmak, ekmeğin kırıntısını bile israf etmemek sofrayı bereketlendirir.",
    48
  );
  const soruMetni = metinSatirla(
    "Bu akşam sofrayı kurarken ve toplarken kim hangi işi üstlenebilir?",
    46
  );

  const uiSvg = `
    ${tezhipCerceveKatmani("HABERCİ · HER GÜN YENİ BİR AİLE MEKTUBU")}
    <text x="${W / 2}" y="150" text-anchor="middle" font-family="${FONT_METIN}" font-size="21" font-weight="800" letter-spacing="3.5" fill="${RENK.cini}">GERÇEK HAYATLA BAĞ KURAN GÜNLÜK GÖREV</text>
    <text x="${W / 2}" y="210" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="52" font-weight="900" fill="${RENK.varak}">Haberci&apos;nin Günlük Aile Mektupları</text>

    <rect x="162" y="780" width="446" height="90" rx="18" fill="${RENK.lacivert}" stroke="${RENK.varak}" stroke-width="2"/>
    <text x="385" y="819" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="26" font-weight="800" fill="${RENK.varakAcik}">Köyün Habercisi</text>
    <text x="385" y="850" text-anchor="middle" font-family="${FONT_METIN}" font-size="19" font-weight="600" fill="${RENK.parsomen}">Her gün ailece okunacak yeni bir mektup getirir</text>

    <rect x="694" y="262" width="1064" height="608" rx="28" fill="${RENK.parsomen}" stroke="${RENK.varakKoyu}" stroke-width="4"/>
    <rect x="712" y="280" width="1028" height="572" rx="20" fill="none" stroke="${RENK.varakKoyu}" stroke-opacity="0.45" stroke-width="1.5"/>
    <text x="762" y="336" font-family="${FONT_METIN}" font-size="19" font-weight="800" letter-spacing="2.5" fill="${RENK.varakKoyu}">GÜNÜN AİLE MEKTUBU · SOFRADAKİ BEREKET</text>
    <text x="762" y="392" font-family="${FONT_BASLIK}" font-size="38" font-weight="900" fill="${RENK.murekkep}">Sofra Duası ve Paylaşmanın Sevinci</text>
    <line x1="762" y1="416" x2="1690" y2="416" stroke="${RENK.varakKoyu}" stroke-opacity="0.35" stroke-width="1.5"/>
    ${svgSatirlar({ x: 762, y: 472, satirlar: mektupMetni, satirAraligi: 42, boyut: 28, renk: "#1f2b44", font: FONT_METIN, kalinlik: "600" })}

    <rect x="762" y="644" width="926" height="168" rx="18" fill="${RENK.murekkep}" stroke="${RENK.cini}" stroke-width="2.5"/>
    <text x="802" y="688" font-family="${FONT_METIN}" font-size="19" font-weight="800" letter-spacing="1.8" fill="${RENK.cini}">AİLECE KONUŞALIM</text>
    ${svgSatirlar({ x: 802, y: 736, satirlar: soruMetni, satirAraligi: 38, boyut: 27, renk: RENK.varakAcik, font: FONT_BASLIK, kalinlik: "700" })}
  `;
  return sahneKatmanlariniKaydet("03", bgSharp, [], uiSvg, [{ input: haberci, left: 162, top: 266 }]);
}

async function sahne4() {
  const bgSharp = await kapakArkaPlan(VARLIK("mekanlar/ev_ici.webp"), 0.72);
  const kartY = 335;
  const kartH = 520;
  const kartW = 496;

  const uiSvg = `
    ${tezhipCerceveKatmani("AİLE SOFRASI OYUNLARI · PUAN İÇİN DEĞİL, MUHABBET İÇİN")}
    <text x="${W / 2}" y="144" text-anchor="middle" font-family="${FONT_METIN}" font-size="20" font-weight="800" letter-spacing="3.2" fill="${RENK.cini}">TELEFONU ORTAYA KOYUN · BÜYÜKLER VE KÜÇÜKLER BİRLİKTE OYNASIN</text>
    <text x="${W / 2}" y="204" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="54" font-weight="900" fill="${RENK.varak}">Aile Sofrası Oyunları</text>

    <rect x="${W / 2 - 282}" y="232" width="564" height="62" rx="31" fill="${RENK.lacivert}" stroke="${RENK.varak}" stroke-width="2"/>
    <text x="${W / 2 - 146}" y="272" text-anchor="middle" font-family="${FONT_METIN}" font-size="22" font-weight="800" fill="${RENK.varakAcik}">BÜYÜKLER  4</text>
    <text x="${W / 2}" y="272" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="24" font-weight="900" fill="${RENK.cini}">VS</text>
    <text x="${W / 2 + 146}" y="272" text-anchor="middle" font-family="${FONT_METIN}" font-size="22" font-weight="800" fill="${RENK.varakAcik}">4  KÜÇÜKLER</text>

    <!-- KART 1: TABU -->
    <rect x="155" y="${kartY}" width="${kartW}" height="${kartH}" rx="24" fill="${RENK.murekkep}" fill-opacity="0.93" stroke="${RENK.varak}" stroke-width="2.5"/>
    <rect x="180" y="${kartY + 24}" width="154" height="36" rx="18" fill="${RENK.varak}" fill-opacity="0.18" stroke="${RENK.varak}" stroke-width="1.5"/>
    <text x="257" y="${kartY + 48}" text-anchor="middle" font-family="${FONT_METIN}" font-size="16" font-weight="800" fill="${RENK.varak}">40 DEĞER KARTI</text>
    <text x="403" y="${kartY + 114}" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="40" font-weight="900" fill="${RENK.varak}">TABU</text>
    <text x="403" y="${kartY + 150}" text-anchor="middle" font-family="${FONT_METIN}" font-size="20" font-weight="600" fill="${RENK.parsomen}">Yasak kelimeleri söylemeden anlat</text>
    <rect x="193" y="${kartY + 184}" width="420" height="292" rx="18" fill="${RENK.parsomen}" stroke="${RENK.varakKoyu}" stroke-width="2.5"/>
    <text x="403" y="${kartY + 248}" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="38" font-weight="900" fill="${RENK.murekkep}">MERHAMET</text>
    <line x1="244" y1="${kartY + 274}" x2="562" y2="${kartY + 274}" stroke="${RENK.nar}" stroke-opacity="0.4" stroke-width="1.5"/>
    <text x="403" y="${kartY + 320}" text-anchor="middle" font-family="${FONT_METIN}" font-size="24" font-weight="700" fill="${RENK.nar}">Acımak · Şefkat</text>
    <text x="403" y="${kartY + 362}" text-anchor="middle" font-family="${FONT_METIN}" font-size="24" font-weight="700" fill="${RENK.nar}">Sevgi · Yardım</text>
    <text x="403" y="${kartY + 432}" text-anchor="middle" font-family="${FONT_METIN}" font-size="18" font-weight="700" fill="#4a5876">İmece · Vefa · Sabır · Dürüstlük...</text>

    <!-- KART 2: SESSİZ SİNEMA -->
    <rect x="712" y="${kartY}" width="${kartW}" height="${kartH}" rx="24" fill="${RENK.murekkep}" fill-opacity="0.93" stroke="${RENK.cini}" stroke-width="2.5"/>
    <rect x="737" y="${kartY + 24}" width="154" height="36" rx="18" fill="${RENK.cini}" fill-opacity="0.18" stroke="${RENK.cini}" stroke-width="1.5"/>
    <text x="814" y="${kartY + 48}" text-anchor="middle" font-family="${FONT_METIN}" font-size="16" font-weight="800" fill="${RENK.ciniAcik}">30 EYLEM KARTI</text>
    <text x="960" y="${kartY + 114}" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="38" font-weight="900" fill="${RENK.cini}">SESSİZ SİNEMA</text>
    <text x="960" y="${kartY + 150}" text-anchor="middle" font-family="${FONT_METIN}" font-size="20" font-weight="600" fill="${RENK.parsomen}">Konuşmadan, sadece hareketlerle canlandır</text>
    <rect x="750" y="${kartY + 184}" width="420" height="292" rx="18" fill="${RENK.lacivert}" stroke="${RENK.cini}" stroke-width="2"/>
    <text x="960" y="${kartY + 240}" text-anchor="middle" font-family="${FONT_METIN}" font-size="17" font-weight="800" letter-spacing="1.6" fill="${RENK.cini}">CANLANDIRMA KARTI</text>
    ${svgSatirlar({ x: 960, y: kartY + 296, satirlar: metinSatirla("Yaşlı bir komşunun pazar poşetlerini taşımak", 24), satirAraligi: 40, boyut: 29, renk: RENK.varakAcik, font: FONT_BASLIK, kalinlik: "800", hiza: "middle" })}
    <text x="960" y="${kartY + 432}" text-anchor="middle" font-family="${FONT_METIN}" font-size="18" font-weight="700" fill="${RENK.ciniAcik}">Misafir karşılamak · Kuşlara yem vermek...</text>

    <!-- KART 3: BİLMECE -->
    <rect x="1269" y="${kartY}" width="${kartW}" height="${kartH}" rx="24" fill="${RENK.murekkep}" fill-opacity="0.93" stroke="${RENK.varak}" stroke-width="2.5"/>
    <rect x="1294" y="${kartY + 24}" width="164" height="36" rx="18" fill="${RENK.varak}" fill-opacity="0.18" stroke="${RENK.varak}" stroke-width="1.5"/>
    <text x="1376" y="${kartY + 48}" text-anchor="middle" font-family="${FONT_METIN}" font-size="16" font-weight="800" fill="${RENK.varak}">15 HİKMETLİ SORU</text>
    <text x="1517" y="${kartY + 114}" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="40" font-weight="900" fill="${RENK.varak}">BİLMECE</text>
    <text x="1517" y="${kartY + 150}" text-anchor="middle" font-family="${FONT_METIN}" font-size="20" font-weight="600" fill="${RENK.parsomen}">Sırayla sor, bilen bir sonrakini sorsun</text>
    <rect x="1307" y="${kartY + 184}" width="420" height="292" rx="18" fill="${RENK.lacivert}" stroke="${RENK.varak}" stroke-width="2"/>
    ${svgSatirlar({ x: 1517, y: kartY + 252, satirlar: metinSatirla("Verdikçe azalmam, aksine çoğalırım; paylaşanın gönlünde yer bulurum.", 26), satirAraligi: 36, boyut: 24, renk: RENK.parsomen, font: FONT_METIN, kalinlik: "600", hiza: "middle" })}
    <rect x="1402" y="${kartY + 390}" width="230" height="54" rx="14" fill="${RENK.varak}"/>
    <text x="1517" y="${kartY + 425}" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="25" font-weight="900" fill="${RENK.murekkep}">Cevap: Sevgi</text>
  `;
  return sahneKatmanlariniKaydet("04", bgSharp, [], uiSvg);
}

async function sahne5() {
  const bgSharp = await ikiliArkaPlan(VARLIK("mekanlar/medrese_ici.webp"), VARLIK("mekanlar/cami_ici.webp"), 0.56);
  const mektep = await sharp(VARLIK("binalar/mektep.webp")).resize({ width: 270 }).ensureAlpha().toBuffer();
  const cami = await sharp(VARLIK("binalar/cami4.webp")).resize({ width: 185 }).ensureAlpha().toBuffer();

  const sutunlar = [
    {
      x: 136,
      renk: RENK.varak,
      etiket: "MEKTEP · İLİM YUVASI",
      baslik: "Sahih Hadis & Video",
      satirlar: metinSatirla("Günlük sahih hadisler, ileri sarma korumalı Niyet ve İhlas videoları, seviye sonu ilim sınavları.", 28),
    },
    {
      x: 712,
      renk: RENK.cini,
      etiket: "KÖY CAMİİ & ULU CAMİ",
      baslik: "Namaz Çetelesi",
      satirlar: metinSatirla("Beş vakit namaz bilincini sevdiren günlük takip ve birlik kardeşleriyle cemaat iklimi.", 28),
    },
    {
      x: 1288,
      renk: RENK.varak,
      etiket: "DERS KÖŞEM · VERİMLİLİK",
      baslik: "Gerçek Ders Sayacı",
      satirlar: metinSatirla("Sunucu başlangıç saatine göre çalışan gerçek ders kronometresi. Her 30 dakikada köye +1 Huzur.", 28),
    },
  ];

  const kartSvg = sutunlar
    .map(
      (s) => `
      <rect x="${s.x}" y="454" width="496" height="420" rx="26" fill="${RENK.murekkep}" fill-opacity="0.92" stroke="${s.renk}" stroke-width="2.5"/>
      <text x="${s.x + 40}" y="512" font-family="${FONT_METIN}" font-size="18" font-weight="800" letter-spacing="1.8" fill="${s.renk}">${xmlKacis(s.etiket)}</text>
      <text x="${s.x + 40}" y="568" font-family="${FONT_BASLIK}" font-size="36" font-weight="900" fill="${RENK.parsomen}">${xmlKacis(s.baslik)}</text>
      <line x1="${s.x + 40}" y1="596" x2="${s.x + 456}" y2="596" stroke="${s.renk}" stroke-opacity="0.35" stroke-width="1.5"/>
      ${svgSatirlar({ x: s.x + 40, y: 652, satirlar: s.satirlar, satirAraligi: 40, boyut: 26, renk: RENK.varakAcik, font: FONT_METIN, kalinlik: "500" })}
    `
    )
    .join("\n");

  const uiSvg = `
    ${tezhipCerceveKatmani("MANEVİ GELİŞİM · GÖREVLER KAYNAK VERMEZ, İZİN VE HUZUR KAZANDIRIR")}
    <rect x="378" y="112" width="1164" height="144" rx="24" fill="${RENK.murekkep}" fill-opacity="0.90" stroke="${RENK.varak}" stroke-width="2.5"/>
    <text x="${W / 2}" y="162" text-anchor="middle" font-family="${FONT_METIN}" font-size="19" font-weight="800" letter-spacing="3.2" fill="${RENK.cini}">GERÇEK HAYATTAKİ EYLEMLERLE İLERLEYEN SİSTEM</text>
    <text x="${W / 2}" y="226" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="50" font-weight="900" fill="${RENK.varak}">İlim, İbadet ve Sorumluluk</text>
    ${kartSvg}
  `;
  return sahneKatmanlariniKaydet("05", bgSharp, [], uiSvg, [
    { input: mektep, left: 250, top: 172 },
    { input: cami, left: 1465, top: 160 },
  ]);
}

async function sahne6() {
  const bgSharp = await ikiliArkaPlan(VARLIK("mekanlar/tarla_sahne.webp"), VARLIK("mekanlar/meydan_sahne.webp"), 0.60);
  const ozan = await sharp(VARLIK("binalar/ozan_acik.webp")).resize({ width: 185 }).ensureAlpha().toBuffer();
  const ev = await sharp(VARLIK("binalar/ev3.webp")).resize({ width: 215 }).ensureAlpha().toBuffer();

  const kartlar = [
    {
      x: 142,
      y: 292,
      renk: RENK.varak,
      baslik: "Alın Teri ve Emek",
      metin: "Tarlada hasat, ormanda keşif, Taş Ocağı'nda kaya kırma ve taş avı. Kaynaklar görevle değil, düzenli emekle birikir.",
    },
    {
      x: 982,
      y: 292,
      renk: RENK.cini,
      baslik: "Köy Meydanı Halk Davaları",
      metin: "Köylülerin meselelerini öfkeyle değil; adalet, merhamet ve hikmetle çözerek köyünün Huzurunu yükselt.",
    },
    {
      x: 142,
      y: 592,
      renk: RENK.cini,
      baslik: "Komşu Evlerini Güzelleştir",
      metin: "Beş komşu evinin odalarını imeceyle döşe; her adımda komşuna sevinç, köyüne Huzur kazandır.",
    },
    {
      x: 982,
      y: 592,
      renk: RENK.varak,
      baslik: "Kıraathane ve Ozan Dede",
      metin: "Anadolu türkülerinin hikâyelerini Ozan Dede'den dinle, köye uğrayan yolcuları yuvana davet et.",
    },
  ];

  const izgaralar = kartlar
    .map(
      (k) => `
      <rect x="${k.x}" y="${k.y}" width="796" height="266" rx="24" fill="${RENK.murekkep}" fill-opacity="0.92" stroke="${k.renk}" stroke-width="2.5"/>
      <text x="${k.x + 46}" y="${k.y + 70}" font-family="${FONT_BASLIK}" font-size="36" font-weight="900" fill="${k.renk}">${xmlKacis(k.baslik)}</text>
      ${svgSatirlar({ x: k.x + 46, y: k.y + 128, satirlar: metinSatirla(k.metin, 45), satirAraligi: 38, boyut: 25, renk: RENK.parsomen, font: FONT_METIN, kalinlik: "500" })}
    `
    )
    .join("\n");

  const uiSvg = `
    ${tezhipCerceveKatmani("EMEK, ADALET VE ANADOLU KÜLTÜRÜ")}
    <text x="${W / 2}" y="146" text-anchor="middle" font-family="${FONT_METIN}" font-size="20" font-weight="800" letter-spacing="3.2" fill="${RENK.cini}">KÖYÜNÜ SADECE İNŞA ETME · ONU ADALET VE EMEKLE YAŞAT</text>
    <text x="${W / 2}" y="210" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="52" font-weight="900" fill="${RENK.varak}">Emek, Hikmet, Komşuluk ve Kültür</text>
    ${izgaralar}
  `;
  return sahneKatmanlariniKaydet("06", bgSharp, [], uiSvg, [
    { input: ev, left: 124, top: 86 },
    { input: ozan, left: W - 314, top: 90 },
  ]);
}

async function sahne7() {
  const birlikSeviye = { otag: 4, cami: 4, medrese: 4, takasmerkezi: 1, oyuncadiri: 1, haberlesme: 1 };
  const nesneler = Object.entries(BIRLIK_BINALARI).map(([id, b]) => ({
    dosya: PUBLIC_DOSYA(b.gorsel(birlikSeviye[id] ?? 1)),
    x: b.x,
    y: b.y,
    genislik: b.genislik,
    anchorX: 0.5,
    anchorY: 0.65,
    z: Math.round(b.y * 2),
  }));

  const cx = Math.round((BIRLIK_MEYDANI_CINAR.x / 100) * MW);
  const cy = Math.round((BIRLIK_MEYDANI_CINAR.y / 100) * MH);
  nesneler.push({
    z: 205,
    svg: Buffer.from(
      `<svg width="${MW}" height="${MH}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${cx - 72}" y="${cy - 20}" width="144" height="40" rx="16" fill="#047857" stroke="#fcd34d" stroke-width="2.5"/>
        <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-family="${FONT_METIN}" font-size="16" font-weight="bold" fill="#ecfdf5">Çınar Altı</text>
      </svg>`
    ),
  });

  const bgSharp = await haritaTuvaliOlustur(VARLIK("harita/birlik_alani.webp"), nesneler);

  // Üst bar binaların tepesini kapatmayacak şekilde kompakt; alt şeritte tüm Birlik özellikleri
  const uiSvg = `
    ${tezhipCerceveKatmani("BİRLİK MEYDANI · KARDEŞLİK, TAKAS VE SANCAK TALİMİ", 0.55)}
    <rect x="470" y="72" width="980" height="114" rx="22" fill="${RENK.murekkep}" fill-opacity="0.90" stroke="${RENK.varak}" stroke-width="2.5"/>
    <text x="${W / 2}" y="114" text-anchor="middle" font-family="${FONT_METIN}" font-size="18" font-weight="800" letter-spacing="3" fill="${RENK.cini}">LEVEL 3+ İLE AÇILAN YENİ DÜNYA</text>
    <text x="${W / 2}" y="166" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="44" font-weight="900" fill="${RENK.varak}">Birlik Meydanı ve Sancak Talimi</text>

    <rect x="148" y="${H - 196}" width="${W - 296}" height="106" rx="22" fill="${RENK.murekkep}" fill-opacity="0.92" stroke="${RENK.cini}" stroke-width="2"/>
    <text x="${W / 2}" y="${H - 150}" text-anchor="middle" font-family="${FONT_METIN}" font-size="24" font-weight="700" fill="${RENK.varakAcik}">Ulu Çınar Altı Paylaşımları · Ortak Ders Çalışma Salonu · Takas Merkezi</text>
    <text x="${W / 2}" y="${H - 112}" text-anchor="middle" font-family="${FONT_METIN}" font-size="22" font-weight="700" fill="${RENK.ciniAcik}">Güvenli Haberleşme Kulesi · 160 Soruluk Sancak Talimi ile 6 Stratejik Bölge Mücadelesi</text>
  `;
  return sahneKatmanlariniKaydet("07", bgSharp, [], uiSvg);
}

async function sahne8() {
  const bgSharp = await kapakArkaPlan(VARLIK("harita/genel_harita.webp"), 0.64);
  const solKarakterler = ["ahmet.webp", "elif.webp", "alp.webp", "zeynep.webp", "omer.webp"];
  const sagKarakterler = ["meryem.webp", "yusuf.webp", "bala.webp", "kerem.webp", "defne.webp"];

  const portreler = await Promise.all([
    ...solKarakterler.map(async (f, i) => ({
      input: await yuvarlakPortre(`karakterler/${f}`, 152),
      left: i % 2 === 0 ? 128 : 274,
      top: 128 + i * 162,
    })),
    ...sagKarakterler.map(async (f, i) => ({
      input: await yuvarlakPortre(`karakterler/${f}`, 152),
      left: i % 2 === 0 ? W - 280 : W - 426,
      top: 128 + i * 162,
    })),
  ]);

  const uiSvg = `
    ${tezhipCerceveKatmani("SEYRÜSEFER.ORG · AİLECEK BİR GÖNÜL YOLCULUĞU")}
    <rect x="462" y="180" width="996" height="702" rx="34" fill="${RENK.murekkep}" fill-opacity="0.93" stroke="${RENK.varak}" stroke-width="3.5"/>
    <rect x="482" y="200" width="956" height="662" rx="26" fill="none" stroke="${RENK.varak}" stroke-opacity="0.35" stroke-width="1.5"/>
    ${selcukluYildiz(W / 2, 266, 36)}
    <text x="${W / 2}" y="346" text-anchor="middle" font-family="${FONT_METIN}" font-size="20" font-weight="800" letter-spacing="3.4" fill="${RENK.cini}">NİYETTEN İHSANA 10 LEVEL · BİR DÖNEMLİK EĞİTSEL YOLCULUK</text>
    <text x="${W / 2}" y="458" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="96" font-weight="900" letter-spacing="7" fill="${RENK.varak}">SEYRÜSEFER</text>
    <line x1="616" y1="502" x2="${W - 616}" y2="502" stroke="${RENK.varak}" stroke-opacity="0.45" stroke-width="2"/>
    <text x="${W / 2}" y="566" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="34" font-weight="800" fill="${RENK.parsomen}">Türkiye&apos;nin İlk Manevi Gelişim ve Aile Oyunu</text>
    <text x="${W / 2}" y="622" text-anchor="middle" font-family="${FONT_METIN}" font-size="26" font-weight="600" fill="${RENK.varakAcik}">Köyünü Kur · Ailenle Büyü · Birliğinle Yüksel</text>

    <rect x="${W / 2 - 266}" y="694" width="532" height="90" rx="45" fill="${RENK.varak}"/>
    <text x="${W / 2}" y="751" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="40" font-weight="900" letter-spacing="1.8" fill="${RENK.murekkep}">seyrusefer.org</text>
  `;
  return sahneKatmanlariniKaydet("08", bgSharp, [], uiSvg, portreler);
}

async function main() {
  const ffmpeg = ffmpegBul();
  console.log("FFmpeg:", ffmpeg);
  fs.mkdirSync(GECICI_KLASOR, { recursive: true });

  console.log("1/3 Sahneler iki katman (hareketli arka plan + sabit UI) olarak çiziliyor...");
  const sahneler = [
    { ...(await sahne1()), sure: 7.5, yon: "in" },
    { ...(await sahne2()), sure: 7.5, yon: "out" },
    { ...(await sahne3()), sure: 8.5, yon: "in" },
    { ...(await sahne4()), sure: 8.5, yon: "out" },
    { ...(await sahne5()), sure: 7.5, yon: "in" },
    { ...(await sahne6()), sure: 7.5, yon: "out" },
    { ...(await sahne7()), sure: 6.5, yon: "in" },
    { ...(await sahne8()), sure: 6.7, yon: "out" },
  ];

  console.log("2/3 Her sahne 3x süper-örnekleme ile titremesiz klibe dönüştürülüyor...");
  const klipler = [];
  for (let i = 0; i < sahneler.length; i++) {
    const s = sahneler[i];
    const kare = Math.round(s.sure * FPS);
    const zoomExpr = s.yon === "in" ? `1+0.038*(on/${kare})` : `1.038-0.038*(on/${kare})`;
    const klipYol = path.join(GECICI_KLASOR, `clip_0${i + 1}.mp4`);

    const args = [
      "-y",
      "-i",
      s.bgYol,
      "-framerate",
      String(FPS),
      "-loop",
      "1",
      "-t",
      String(s.sure),
      "-i",
      s.uiYol,
      "-filter_complex",
      `[0:v]scale=5760:3240:flags=lanczos,zoompan=z='${zoomExpr}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=${kare}:s=${W}x${H}:fps=${FPS},setsar=1[bg];` +
        `[1:v]format=rgba,fade=t=in:st=0.12:d=0.35:alpha=1[ui];` +
        `[bg][ui]overlay=0:0:shortest=1,format=yuv420p[vout]`,
      "-map",
      "[vout]",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "16",
      "-pix_fmt",
      "yuv420p",
      klipYol,
    ];
    calistir(ffmpeg, args, `Sahne ${i + 1}`);
    klipler.push({ yol: klipYol, sure: s.sure });
  }

  const toplamSure = sahneler.reduce((t, s) => t + s.sure, 0) - (sahneler.length - 1) * GECIS_SURE;
  console.log(`3/3 ${klipler.length} klip geçişler ve fon tınısıyla birleştiriliyor (~${toplamSure.toFixed(1)} sn)...`);

  const girdiler = klipler.flatMap((k) => ["-i", k.yol]);
  const filtreler = [];
  let sonEtiket = "0:v";
  let ofset = 0;
  for (let i = 1; i < klipler.length; i++) {
    ofset += klipler[i - 1].sure - GECIS_SURE;
    const yeniEtiket = `x${i}`;
    filtreler.push(
      `[${sonEtiket}][${i}:v]xfade=transition=fade:duration=${GECIS_SURE}:offset=${ofset.toFixed(2)}[${yeniEtiket}]`
    );
    sonEtiket = yeniEtiket;
  }

  const sesIndeks = klipler.length;
  girdiler.push(
    "-f",
    "lavfi",
    "-t",
    toplamSure.toFixed(2),
    "-i",
    "aevalsrc=0.06*(sin(2*PI*146.83*t)+0.55*sin(2*PI*220.0*t)+0.35*sin(2*PI*293.66*t)+0.25*sin(2*PI*329.63*t))*(0.7+0.3*sin(2*PI*0.18*t)):s=44100"
  );
  filtreler.push(
    `[${sesIndeks}:a]lowpass=f=650,afade=t=in:st=0:d=1.8,afade=t=out:st=${(toplamSure - 2.2).toFixed(2)}:d=2.2[aout]`
  );

  calistir(
    ffmpeg,
    [
      "-y",
      ...girdiler,
      "-filter_complex",
      filtreler.join(";"),
      "-map",
      `[${sonEtiket}]`,
      "-map",
      "[aout]",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "21",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      CIKTI_ANA,
    ],
    "Final birleştirme"
  );

  fs.rmSync(GECICI_KLASOR, { recursive: true, force: true });
  const boyutMB = (fs.statSync(CIKTI_ANA).size / (1024 * 1024)).toFixed(2);
  console.log(`Tamamlandı: ${CIKTI_ANA} (${boyutMB} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
