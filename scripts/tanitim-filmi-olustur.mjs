/**
 * Seyrüsefer v3 — Tanıtım Filmi Üretici (1920x1080 Full HD MP4)
 * Sharp (Pango/Librsvg) ile 8 yüksek çözünürlüklü Tezhip sahnesi üretir,
 * FFmpeg ile Ken Burns (zoom/pan) hareketleri, yumuşak geçişler ve fon tınısı ekleyerek
 * `tanitim_filmi.mp4` dosyasını oluşturur.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

const KOK = process.cwd();
const VARLIK = (altYol) => path.join(KOK, "public", "assets", altYol);
const GECICI_KLASOR = path.join(KOK, ".tmp-tanitim");
const CIKTI_ANA = path.join(KOK, "tanitim_filmi.mp4");

const FFMPEG_ADAYLARI = [
  process.env.FFMPEG_PATH,
  "C:\\Users\\Ebubekir\\Desktop\\Sarıgelin\\node_modules\\ffmpeg-static\\ffmpeg.exe",
  "ffmpeg",
].filter(Boolean);

// Master sahne boyutları (Ken Burns sırasında kalite kaybı olmaması için 1080p üstü 16:9)
const W = 2240;
const H = 1260;
const FPS = 30;
const GECIS_SURE = 0.6;

// Tezhip Paleti (src/app/globals.css ile birebir uyumlu)
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
  beyaz: "#fbf6e9",
};

const FONT_BASLIK = "Georgia, 'Times New Roman', serif";
const FONT_METIN = "'Segoe UI', Arial, sans-serif";

function ffmpegBul() {
  for (const aday of FFMPEG_ADAYLARI) {
    if (aday === "ffmpeg") {
      const deneme = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
      if (deneme.status === 0) return "ffmpeg";
    } else if (fs.existsSync(aday)) {
      return aday;
    }
  }
  throw new Error(
    "FFmpeg bulunamadı. FFMPEG_PATH ortam değişkeni tanımlayın veya ffmpeg kurun."
  );
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
    if (!suAn) {
      suAn = k;
    } else if (suAn.length + 1 + k.length <= maksKarakter) {
      suAn += " " + k;
    } else {
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
  satirAraligi = 42,
  boyut = 30,
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

function selcukluYildiz(cx, cy, r = 18, renk = RENK.varak) {
  const k = r / 12;
  return `
    <g transform="translate(${cx - 12 * k}, ${cy - 12 * k}) scale(${k})">
      <path fill="${renk}" d="M12 1l3.2 3.3 4.6-.1-.1 4.6L23 12l-3.3 3.2.1 4.6-4.6-.1L12 23l-3.2-3.3-4.6.1.1-4.6L1 12l3.3-3.2-.1-4.6 4.6.1z"/>
      <circle cx="12" cy="12" r="3.4" fill="${RENK.murekkep}"/>
    </g>
  `;
}

function tezhipCerceveKatmani(altMetin = "SEYRÜSEFER · TÜRKİYE'NİN İLK MANEVİ GELİŞİM VE AİLE OYUNU") {
  const m = 66;
  return `
    <defs>
      <linearGradient id="ustGolge" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0d1628" stop-opacity="0.82"/>
        <stop offset="30%" stop-color="#0d1628" stop-opacity="0.10"/>
        <stop offset="72%" stop-color="#0d1628" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#0d1628" stop-opacity="0.90"/>
      </linearGradient>
      <linearGradient id="altinCizgi" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#946511" stop-opacity="0.25"/>
        <stop offset="25%" stop-color="#e7b93b" stop-opacity="0.95"/>
        <stop offset="50%" stop-color="#faeec2" stop-opacity="1"/>
        <stop offset="75%" stop-color="#e7b93b" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#946511" stop-opacity="0.25"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ustGolge)"/>
    <rect x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}" rx="28" fill="none" stroke="url(#altinCizgi)" stroke-width="3.5"/>
    <rect x="${m + 14}" y="${m + 14}" width="${W - 2 * (m + 14)}" height="${H - 2 * (m + 14)}" rx="20" fill="none" stroke="${RENK.varak}" stroke-opacity="0.32" stroke-width="1.5"/>
    ${selcukluYildiz(m, m, 22)}
    ${selcukluYildiz(W - m, m, 22)}
    ${selcukluYildiz(m, H - m, 22)}
    ${selcukluYildiz(W - m, H - m, 22)}
    <rect x="${W / 2 - 420}" y="${H - m - 18}" width="840" height="36" rx="18" fill="${RENK.murekkep}" stroke="${RENK.varak}" stroke-width="2"/>
    <text x="${W / 2}" y="${H - m + 7}" text-anchor="middle" font-family="${FONT_METIN}" font-size="19" font-weight="700" letter-spacing="2" fill="${RENK.varakAcik}">${xmlKacis(altMetin)}</text>
  `;
}

async function kapakArkaPlan(dosyaYolu, karartma = 0.25) {
  const temel = await sharp(dosyaYolu)
    .resize(W, H, { fit: "cover", position: "center" })
    .ensureAlpha()
    .toBuffer();

  if (karartma <= 0) return sharp(temel);

  const perde = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="${H}" fill="${RENK.murekkep}" fill-opacity="${karartma}"/>
    </svg>`
  );
  const birlesik = await sharp(temel)
    .composite([{ input: perde }])
    .toBuffer();
  return sharp(birlesik);
}

async function ikiliArkaPlan(solDosya, sagDosya, karartma = 0.52) {
  const yari = W / 2;
  const sol = await sharp(solDosya).resize(yari, H, { fit: "cover", position: "center" }).toBuffer();
  const sag = await sharp(sagDosya).resize(yari, H, { fit: "cover", position: "center" }).toBuffer();
  const perde = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="${H}" fill="${RENK.murekkep}" fill-opacity="${karartma}"/>
      <line x1="${yari}" y1="90" x2="${yari}" y2="${H - 90}" stroke="${RENK.varak}" stroke-opacity="0.55" stroke-width="4"/>
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

async function haritaUzeriKatman(binalar) {
  const katmanlar = [];
  for (const b of binalar) {
    const genislikPx = Math.round((b.genislikYuzde / 100) * W);
    const parca = await sharp(VARLIK(b.dosya))
      .resize({ width: genislikPx })
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });
    const sol = Math.round((b.x / 100) * W - parca.info.width / 2);
    const ust = Math.round((b.y / 100) * H - parca.info.height / 2);
    katmanlar.push({ input: parca.data, left: Math.max(0, sol), top: Math.max(0, ust) });
  }
  return katmanlar;
}

async function yuvarlakPortre(dosya, cap = 230, cerceveRenk = RENK.varak) {
  const icCap = cap - 16;
  const resim = await sharp(VARLIK(dosya))
    .resize(icCap, icCap, { fit: "cover", position: "top" })
    .ensureAlpha()
    .toBuffer();

  const maske = Buffer.from(
    `<svg width="${icCap}" height="${icCap}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${icCap / 2}" cy="${icCap / 2}" r="${icCap / 2}" fill="#fff"/>
    </svg>`
  );

  const kesilmis = await sharp(resim)
    .composite([{ input: maske, blend: "dest-in" }])
    .png()
    .toBuffer();

  const halka = Buffer.from(
    `<svg width="${cap}" height="${cap}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cap / 2}" cy="${cap / 2}" r="${cap / 2 - 3}" fill="${RENK.lacivert}" stroke="${cerceveRenk}" stroke-width="6"/>
    </svg>`
  );

  return sharp(halka)
    .composite([{ input: kesilmis, left: 8, top: 8 }])
    .png()
    .toBuffer();
}

async function sahneKaydet(ad, tuval, ekKatmanlar, svgStr) {
  const svgBuf = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svgStr}</svg>`
  );
  const dosya = path.join(GECICI_KLASOR, ad);
  await tuval
    .composite([...ekKatmanlar, { input: svgBuf, left: 0, top: 0 }])
    .png()
    .toFile(dosya);
  return dosya;
}

// =============================================================
// 8 SAHNE TASARIMI (Aile & Türkiye'nin İlk Manevi Gelişim Oyunu)
// =============================================================

async function sahne1() {
  const tuval = await kapakArkaPlan(VARLIK("harita/koy.webp"), 0.14);
  const binalar = await haritaUzeriKatman([
    { dosya: "binalar/otag3.webp", x: 55.2, y: 24.0, genislikYuzde: 15.5 },
    { dosya: "binalar/mektep.webp", x: 36.8, y: 46.5, genislikYuzde: 12.2 },
    { dosya: "binalar/kiraathane.webp", x: 74.2, y: 47.0, genislikYuzde: 12.2 },
    { dosya: "binalar/sosyalmeydan2.webp", x: 55.2, y: 54.0, genislikYuzde: 10.5 },
    { dosya: "binalar/ev2.webp", x: 38.6, y: 63.2, genislikYuzde: 9.0 },
    { dosya: "binalar/ev3.webp", x: 67.5, y: 63.5, genislikYuzde: 9.0 },
    { dosya: "binalar/seyyaherkek.webp", x: 46.8, y: 81.5, genislikYuzde: 6.5 },
  ]);

  const svg = `
    ${tezhipCerceveKatmani("SEYRÜSEFER · NİYETTEN İHSANA GÖNÜL YOLCULUĞU")}
    <rect x="260" y="102" width="${W - 520}" height="248" rx="30" fill="${RENK.murekkep}" fill-opacity="0.88" stroke="${RENK.varak}" stroke-width="3"/>
    <rect x="274" y="116" width="${W - 548}" height="220" rx="22" fill="none" stroke="${RENK.varak}" stroke-opacity="0.35" stroke-width="1.5"/>
    <text x="${W / 2}" y="166" text-anchor="middle" font-family="${FONT_METIN}" font-size="25" font-weight="800" letter-spacing="4" fill="${RENK.cini}">TÜRKİYE&apos;NİN İLK MANEVİ GELİŞİM VE AİLE OYUNU</text>
    <text x="${W / 2}" y="256" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="94" font-weight="900" letter-spacing="8" fill="${RENK.varak}">SEYRÜSEFER</text>
    <text x="${W / 2}" y="310" text-anchor="middle" font-family="${FONT_METIN}" font-size="28" font-weight="600" fill="${RENK.parsomen}">Köyünü Kur · Değerlerle Büyü · Ailenle Aynı Gönülde Buluş</text>

    <rect x="220" y="${H - 235}" width="${W - 440}" height="106" rx="24" fill="${RENK.murekkep}" fill-opacity="0.90" stroke="${RENK.varak}" stroke-width="2.5"/>
    <text x="${W / 2}" y="${H - 170}" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="34" font-weight="700" fill="${RENK.varakAcik}">Çocukları ekran başında yalnızlaştıran değil, aileyi bir araya getiren oyun</text>
  `;
  return sahneKaydet("sahne_01.png", tuval, binalar, svg);
}

async function sahne2() {
  const tuval = await kapakArkaPlan(VARLIK("mekanlar/ev_ici.webp"), 0.56);
  const karakterler = [
    { dosya: "karakterler/ahmet.webp", ad: "Ahmet", x: 1450, y: 260 },
    { dosya: "karakterler/elif.webp", ad: "Elif", x: 1760, y: 260 },
    { dosya: "karakterler/omer.webp", ad: "Ömer", x: 1450, y: 580 },
    { dosya: "karakterler/zeynep.webp", ad: "Zeynep", x: 1760, y: 580 },
  ];
  const portreler = await Promise.all(
    karakterler.map(async (k) => ({
      input: await yuvarlakPortre(k.dosya, 250),
      left: k.x,
      top: k.y,
    }))
  );

  const baslik = metinSatirla("Tek Başına Değil, Ailenle Bir Araya Gel!", 26);
  const aciklama = metinSatirla(
    "Seyrüsefer, ekran süresini aileden koparan bir alışkanlıktan çıkarır; anne, baba ve çocukları akşamları aynı sohbetin ve muhabbetin etrafında buluşturur.",
    46
  );

  const svg = `
    ${tezhipCerceveKatmani("KENDİ EVİM · EKRANDAN SOFRAYA TAŞINAN MUHABBET")}
    <rect x="145" y="185" width="1180" height="820" rx="34" fill="${RENK.murekkep}" fill-opacity="0.90" stroke="${RENK.varak}" stroke-width="3"/>
    <rect x="165" y="205" width="1140" height="780" rx="26" fill="none" stroke="${RENK.varak}" stroke-opacity="0.3" stroke-width="1.5"/>
    <rect x="210" y="245" width="470" height="48" rx="24" fill="${RENK.cini}" fill-opacity="0.22" stroke="${RENK.cini}" stroke-width="2"/>
    <text x="445" y="277" text-anchor="middle" font-family="${FONT_METIN}" font-size="22" font-weight="800" letter-spacing="2" fill="${RENK.ciniAcik}">KENDİ EVİM · AİLE BULUŞMASI</text>
    ${svgSatirlar({ x: 210, y: 385, satirlar: baslik, satirAraligi: 76, boyut: 62, renk: RENK.varak, font: FONT_BASLIK, kalinlik: "900" })}
    <line x1="210" y1="560" x2="1220" y2="560" stroke="${RENK.varak}" stroke-opacity="0.4" stroke-width="2"/>
    ${svgSatirlar({ x: 210, y: 630, satirlar: aciklama, satirAraligi: 48, boyut: 32, renk: RENK.parsomen, font: FONT_METIN, kalinlik: "500" })}

    <rect x="210" y="845" width="310" height="74" rx="18" fill="${RENK.lacivert}" stroke="${RENK.varak}" stroke-width="2"/>
    <text x="365" y="891" text-anchor="middle" font-family="${FONT_METIN}" font-size="24" font-weight="700" fill="${RENK.varakAcik}">Aile Okuma Saati</text>
    <rect x="545" y="845" width="335" height="74" rx="18" fill="${RENK.lacivert}" stroke="${RENK.cini}" stroke-width="2"/>
    <text x="712" y="891" text-anchor="middle" font-family="${FONT_METIN}" font-size="24" font-weight="700" fill="${RENK.ciniAcik}">Aile Sofrası Oyunları</text>
    <rect x="905" y="845" width="315" height="74" rx="18" fill="${RENK.lacivert}" stroke="${RENK.varak}" stroke-width="2"/>
    <text x="1062" y="891" text-anchor="middle" font-family="${FONT_METIN}" font-size="24" font-weight="700" fill="${RENK.varakAcik}">Kalıcı Güzel Ahlak</text>

    <rect x="1420" y="885" width="620" height="120" rx="24" fill="${RENK.murekkep}" fill-opacity="0.90" stroke="${RENK.varak}" stroke-width="2"/>
    <text x="1730" y="938" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="30" font-weight="800" fill="${RENK.varak}">10 Özgün Anadolu Karakteri</text>
    <text x="1730" y="978" text-anchor="middle" font-family="${FONT_METIN}" font-size="23" font-weight="600" fill="${RENK.parsomen}">Gençlere ilham veren sıcak rol modeller</text>
  `;
  return sahneKaydet("sahne_02.png", tuval, portreler, svg);
}

async function sahne3() {
  const tuval = await kapakArkaPlan(VARLIK("harita/koy.webp"), 0.68);
  const haberci = await sharp(VARLIK("binalar/seyyaherkek.webp"))
    .resize({ width: 540 })
    .ensureAlpha()
    .toBuffer();

  const mektupMetni = metinSatirla(
    "Sevgili ev halkım, bugün sofraya hep birlikte oturalım. Yemeğe besmeleyle başlayıp şükürle kalkmak, ekmeğin kırıntısını bile israf etmemek sofrayı bereketlendirir.",
    48
  );
  const soruMetni = metinSatirla(
    "Bu akşam sofrayı kurarken ve toplarken kim hangi işi üstlenebilir?",
    46
  );

  const svg = `
    ${tezhipCerceveKatmani("HABERCİ · HER GÜN YENİ BİR AİLE MEKTUBU")}
    <text x="${W / 2}" y="176" text-anchor="middle" font-family="${FONT_METIN}" font-size="24" font-weight="800" letter-spacing="4" fill="${RENK.cini}">GERÇEK HAYATLA BAĞ KURAN GÜNLÜK GÖREV</text>
    <text x="${W / 2}" y="246" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="60" font-weight="900" fill="${RENK.varak}">Haberci&apos;nin Günlük Aile Mektupları</text>

    <rect x="190" y="910" width="520" height="106" rx="22" fill="${RENK.lacivert}" stroke="${RENK.varak}" stroke-width="2.5"/>
    <text x="450" y="955" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="30" font-weight="800" fill="${RENK.varakAcik}">Köyün Habercisi</text>
    <text x="450" y="992" text-anchor="middle" font-family="${FONT_METIN}" font-size="22" font-weight="600" fill="${RENK.parsomen}">Her gün ailece okunacak yeni bir mektup getirir</text>

    <rect x="810" y="305" width="1240" height="710" rx="34" fill="${RENK.parsomen}" stroke="${RENK.varakKoyu}" stroke-width="5"/>
    <rect x="832" y="327" width="1196" height="666" rx="24" fill="none" stroke="${RENK.varakKoyu}" stroke-opacity="0.45" stroke-width="2"/>
    <text x="890" y="392" font-family="${FONT_METIN}" font-size="22" font-weight="800" letter-spacing="3" fill="${RENK.varakKoyu}">GÜNÜN AİLE MEKTUBU · SOFRADAKİ BEREKET</text>
    <text x="890" y="458" font-family="${FONT_BASLIK}" font-size="44" font-weight="900" fill="${RENK.murekkep}">Sofra Duası ve Paylaşmanın Sevinci</text>
    <line x1="890" y1="485" x2="1970" y2="485" stroke="${RENK.varakKoyu}" stroke-opacity="0.35" stroke-width="2"/>
    ${svgSatirlar({ x: 890, y: 550, satirlar: mektupMetni, satirAraligi: 50, boyut: 33, renk: "#1f2b44", font: FONT_METIN, kalinlik: "600" })}

    <rect x="890" y="750" width="1080" height="196" rx="22" fill="${RENK.murekkep}" stroke="${RENK.cini}" stroke-width="3"/>
    <text x="935" y="802" font-family="${FONT_METIN}" font-size="22" font-weight="800" letter-spacing="2" fill="${RENK.cini}">AİLECE KONUŞALIM</text>
    ${svgSatirlar({ x: 935, y: 858, satirlar: soruMetni, satirAraligi: 44, boyut: 31, renk: RENK.varakAcik, font: FONT_BASLIK, kalinlik: "700" })}
  `;
  return sahneKaydet("sahne_03.png", tuval, [{ input: haberci, left: 190, top: 310 }], svg);
}

async function sahne4() {
  const tuval = await kapakArkaPlan(VARLIK("mekanlar/ev_ici.webp"), 0.72);
  const kartY = 390;
  const kartH = 610;
  const kartW = 580;

  const svg = `
    ${tezhipCerceveKatmani("AİLE SOFRASI OYUNLARI · PUAN İÇİN DEĞİL, MUHABBET İÇİN")}
    <text x="${W / 2}" y="168" text-anchor="middle" font-family="${FONT_METIN}" font-size="23" font-weight="800" letter-spacing="4" fill="${RENK.cini}">TELEFONU ORTAYA KOYUN · BÜYÜKLER VE KÜÇÜKLER BİRLİKTE OYNASIN</text>
    <text x="${W / 2}" y="238" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="62" font-weight="900" fill="${RENK.varak}">Aile Sofrası Oyunları</text>

    <rect x="${W / 2 - 330}" y="270" width="660" height="74" rx="37" fill="${RENK.lacivert}" stroke="${RENK.varak}" stroke-width="2.5"/>
    <text x="${W / 2 - 170}" y="317" text-anchor="middle" font-family="${FONT_METIN}" font-size="26" font-weight="800" fill="${RENK.varakAcik}">BÜYÜKLER  4</text>
    <text x="${W / 2}" y="317" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="28" font-weight="900" fill="${RENK.cini}">VS</text>
    <text x="${W / 2 + 170}" y="317" text-anchor="middle" font-family="${FONT_METIN}" font-size="26" font-weight="800" fill="${RENK.varakAcik}">4  KÜÇÜKLER</text>

    <!-- KART 1: TABU -->
    <rect x="180" y="${kartY}" width="${kartW}" height="${kartH}" rx="28" fill="${RENK.murekkep}" fill-opacity="0.93" stroke="${RENK.varak}" stroke-width="3"/>
    <rect x="210" y="${kartY + 28}" width="180" height="42" rx="21" fill="${RENK.varak}" fill-opacity="0.18" stroke="${RENK.varak}" stroke-width="1.5"/>
    <text x="300" y="${kartY + 56}" text-anchor="middle" font-family="${FONT_METIN}" font-size="19" font-weight="800" fill="${RENK.varak}">40 DEĞER KARTI</text>
    <text x="470" y="${kartY + 132}" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="46" font-weight="900" fill="${RENK.varak}">TABU</text>
    <text x="470" y="${kartY + 176}" text-anchor="middle" font-family="${FONT_METIN}" font-size="23" font-weight="600" fill="${RENK.parsomen}">Yasak kelimeleri söylemeden anlat</text>
    <rect x="225" y="${kartY + 215}" width="490" height="340" rx="22" fill="${RENK.parsomen}" stroke="${RENK.varakKoyu}" stroke-width="3"/>
    <text x="470" y="${kartY + 290}" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="44" font-weight="900" fill="${RENK.murekkep}">MERHAMET</text>
    <line x1="285" y1="${kartY + 320}" x2="655" y2="${kartY + 320}" stroke="${RENK.nar}" stroke-opacity="0.4" stroke-width="2"/>
    <text x="470" y="${kartY + 372}" text-anchor="middle" font-family="${FONT_METIN}" font-size="28" font-weight="700" fill="${RENK.nar}">Acımak · Şefkat</text>
    <text x="470" y="${kartY + 422}" text-anchor="middle" font-family="${FONT_METIN}" font-size="28" font-weight="700" fill="${RENK.nar}">Sevgi · Yardım</text>
    <text x="470" y="${kartY + 505}" text-anchor="middle" font-family="${FONT_METIN}" font-size="21" font-weight="700" fill="#4a5876">İmece · Vefa · Sabır · Dürüstlük...</text>

    <!-- KART 2: SESSİZ SİNEMA -->
    <rect x="830" y="${kartY}" width="${kartW}" height="${kartH}" rx="28" fill="${RENK.murekkep}" fill-opacity="0.93" stroke="${RENK.cini}" stroke-width="3"/>
    <rect x="860" y="${kartY + 28}" width="180" height="42" rx="21" fill="${RENK.cini}" fill-opacity="0.18" stroke="${RENK.cini}" stroke-width="1.5"/>
    <text x="950" y="${kartY + 56}" text-anchor="middle" font-family="${FONT_METIN}" font-size="19" font-weight="800" fill="${RENK.ciniAcik}">30 EYLEM KARTI</text>
    <text x="1120" y="${kartY + 132}" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="44" font-weight="900" fill="${RENK.cini}">SESSİZ SİNEMA</text>
    <text x="1120" y="${kartY + 176}" text-anchor="middle" font-family="${FONT_METIN}" font-size="23" font-weight="600" fill="${RENK.parsomen}">Konuşmadan, sadece hareketlerle canlandır</text>
    <rect x="875" y="${kartY + 215}" width="490" height="340" rx="22" fill="${RENK.lacivert}" stroke="${RENK.cini}" stroke-width="2.5"/>
    <text x="1120" y="${kartY + 280}" text-anchor="middle" font-family="${FONT_METIN}" font-size="20" font-weight="800" letter-spacing="2" fill="${RENK.cini}">CANLANDIRMA KARTI</text>
    ${svgSatirlar({ x: 1120, y: kartY + 345, satirlar: metinSatirla("Yaşlı bir komşunun pazar poşetlerini taşımak", 24), satirAraligi: 48, boyut: 34, renk: RENK.varakAcik, font: FONT_BASLIK, kalinlik: "800", hiza: "middle" })}
    <text x="1120" y="${kartY + 505}" text-anchor="middle" font-family="${FONT_METIN}" font-size="21" font-weight="700" fill="${RENK.ciniAcik}">Misafir karşılamak · Kuşlara yem vermek...</text>

    <!-- KART 3: BİLMECE -->
    <rect x="1480" y="${kartY}" width="${kartW}" height="${kartH}" rx="28" fill="${RENK.murekkep}" fill-opacity="0.93" stroke="${RENK.varak}" stroke-width="3"/>
    <rect x="1510" y="${kartY + 28}" width="190" height="42" rx="21" fill="${RENK.varak}" fill-opacity="0.18" stroke="${RENK.varak}" stroke-width="1.5"/>
    <text x="1605" y="${kartY + 56}" text-anchor="middle" font-family="${FONT_METIN}" font-size="19" font-weight="800" fill="${RENK.varak}">15 HİKMETLİ SORU</text>
    <text x="1770" y="${kartY + 132}" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="46" font-weight="900" fill="${RENK.varak}">BİLMECE</text>
    <text x="1770" y="${kartY + 176}" text-anchor="middle" font-family="${FONT_METIN}" font-size="23" font-weight="600" fill="${RENK.parsomen}">Sırayla sor, bilen bir sonrakini sorsun</text>
    <rect x="1525" y="${kartY + 215}" width="490" height="340" rx="22" fill="${RENK.lacivert}" stroke="${RENK.varak}" stroke-width="2.5"/>
    ${svgSatirlar({ x: 1770, y: kartY + 295, satirlar: metinSatirla("Verdikçe azalmam, aksine çoğalırım; paylaşanın gönlünde yer bulurum.", 26), satirAraligi: 42, boyut: 28, renk: RENK.parsomen, font: FONT_METIN, kalinlik: "600", hiza: "middle" })}
    <rect x="1635" y="${kartY + 455}" width="270" height="62" rx="16" fill="${RENK.varak}"/>
    <text x="1770" y="${kartY + 496}" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="29" font-weight="900" fill="${RENK.murekkep}">Cevap: Sevgi</text>
  `;
  return sahneKaydet("sahne_04.png", tuval, [], svg);
}

async function sahne5() {
  const tuval = await ikiliArkaPlan(VARLIK("mekanlar/medrese_ici.webp"), VARLIK("mekanlar/cami_ici.webp"), 0.58);
  const mektep = await sharp(VARLIK("binalar/mektep.webp")).resize({ width: 320 }).ensureAlpha().toBuffer();
  const cami = await sharp(VARLIK("binalar/cami4.webp")).resize({ width: 220 }).ensureAlpha().toBuffer();

  const sutunlar = [
    {
      x: 160,
      renk: RENK.varak,
      etiket: "MEKTEP · İLİM YUVASI",
      baslik: "Sahih Hadis & Video",
      satirlar: metinSatirla("Günlük sahih hadisler, ileri sarma korumalı Niyet ve İhlas videoları, seviye sonu ilim sınavları.", 28),
    },
    {
      x: 830,
      renk: RENK.cini,
      etiket: "KÖY CAMİİ & ULU CAMİ",
      baslik: "Namaz Çetelesi",
      satirlar: metinSatirla("Beş vakit namaz bilincini sevdiren günlük takip ve birlik kardeşleriyle cemaat iklimi.", 28),
    },
    {
      x: 1500,
      renk: RENK.varak,
      etiket: "DERS KÖŞEM · VERİMLİLİK",
      baslik: "Gerçek Ders Sayacı",
      satirlar: metinSatirla("Sunucu başlangıç saatine göre çalışan gerçek ders kronometresi. Her 30 dakikada köye +1 Huzur.", 28),
    },
  ];

  const kartSvg = sutunlar
    .map(
      (s) => `
      <rect x="${s.x}" y="530" width="580" height="490" rx="30" fill="${RENK.murekkep}" fill-opacity="0.92" stroke="${s.renk}" stroke-width="3"/>
      <text x="${s.x + 48}" y="596" font-family="${FONT_METIN}" font-size="21" font-weight="800" letter-spacing="2" fill="${s.renk}">${xmlKacis(s.etiket)}</text>
      <text x="${s.x + 48}" y="662" font-family="${FONT_BASLIK}" font-size="42" font-weight="900" fill="${RENK.parsomen}">${xmlKacis(s.baslik)}</text>
      <line x1="${s.x + 48}" y1="695" x2="${s.x + 532}" y2="695" stroke="${s.renk}" stroke-opacity="0.35" stroke-width="2"/>
      ${svgSatirlar({ x: s.x + 48, y: 760, satirlar: s.satirlar, satirAraligi: 48, boyut: 30, renk: RENK.varakAcik, font: FONT_METIN, kalinlik: "500" })}
    `
    )
    .join("\n");

  const svg = `
    ${tezhipCerceveKatmani("MANEVİ GELİŞİM · GÖREVLER KAYNAK VERMEZ, İZİN VE HUZUR KAZANDIRIR")}
    <rect x="440" y="130" width="1360" height="170" rx="28" fill="${RENK.murekkep}" fill-opacity="0.88" stroke="${RENK.varak}" stroke-width="2.5"/>
    <text x="${W / 2}" y="190" text-anchor="middle" font-family="${FONT_METIN}" font-size="22" font-weight="800" letter-spacing="4" fill="${RENK.cini}">GERÇEK HAYATTAKİ EYLEMLERLE İLERLEYEN SİSTEM</text>
    <text x="${W / 2}" y="264" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="58" font-weight="900" fill="${RENK.varak}">İlim, İbadet ve Sorumluluk</text>
    ${kartSvg}
  `;
  return sahneKaydet(
    "sahne_05.png",
    tuval,
    [
      { input: mektep, left: 290, top: 200 },
      { input: cami, left: 1710, top: 185 },
    ],
    svg
  );
}

async function sahne6() {
  const tuval = await ikiliArkaPlan(VARLIK("mekanlar/tarla_sahne.webp"), VARLIK("mekanlar/meydan_sahne.webp"), 0.62);
  const ozan = await sharp(VARLIK("binalar/ozan_acik.webp")).resize({ width: 220 }).ensureAlpha().toBuffer();
  const ev = await sharp(VARLIK("binalar/ev3.webp")).resize({ width: 250 }).ensureAlpha().toBuffer();

  const kartlar = [
    {
      x: 165,
      y: 340,
      renk: RENK.varak,
      baslik: "Alın Teri ve Emek",
      metin: "Tarlada hasat, ormanda keşif, Taş Ocağı'nda kaya kırma ve taş avı. Kaynaklar görevle değil, düzenli emekle birikir.",
    },
    {
      x: 1145,
      y: 340,
      renk: RENK.cini,
      baslik: "Köy Meydanı Halk Davaları",
      metin: "Köylülerin meselelerini öfkeyle değil; adalet, merhamet ve hikmetle çözerek köyünün Huzurunu yükselt.",
    },
    {
      x: 165,
      y: 690,
      renk: RENK.cini,
      baslik: "Komşu Evlerini Güzelleştir",
      metin: "Beş komşu evinin odalarını imeceyle döşe; her adımda komşuna sevinç, köyüne Huzur kazandır.",
    },
    {
      x: 1145,
      y: 690,
      renk: RENK.varak,
      baslik: "Kıraathane ve Ozan Dede",
      metin: "Anadolu türkülerinin hikâyelerini Ozan Dede'den dinle, köye uğrayan yolcuları yuvana davet et.",
    },
  ];

  const izgaralar = kartlar
    .map(
      (k) => `
      <rect x="${k.x}" y="${k.y}" width="930" height="310" rx="28" fill="${RENK.murekkep}" fill-opacity="0.92" stroke="${k.renk}" stroke-width="3"/>
      <text x="${k.x + 54}" y="${k.y + 82}" font-family="${FONT_BASLIK}" font-size="42" font-weight="900" fill="${k.renk}">${xmlKacis(k.baslik)}</text>
      ${svgSatirlar({ x: k.x + 54, y: k.y + 150, satirlar: metinSatirla(k.metin, 45), satirAraligi: 44, boyut: 29, renk: RENK.parsomen, font: FONT_METIN, kalinlik: "500" })}
    `
    )
    .join("\n");

  const svg = `
    ${tezhipCerceveKatmani("EMEK, ADALET VE ANADOLU KÜLTÜRÜ")}
    <text x="${W / 2}" y="170" text-anchor="middle" font-family="${FONT_METIN}" font-size="23" font-weight="800" letter-spacing="4" fill="${RENK.cini}">KÖYÜNÜ SADECE İNŞA ETME · ONU ADALET VE EMEKLE YAŞAT</text>
    <text x="${W / 2}" y="246" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="60" font-weight="900" fill="${RENK.varak}">Emek, Hikmet, Komşuluk ve Kültür</text>
    ${izgaralar}
  `;
  return sahneKaydet(
    "sahne_06.png",
    tuval,
    [
      { input: ev, left: 145, top: 100 },
      { input: ozan, left: W - 365, top: 105 },
    ],
    svg
  );
}

async function sahne7() {
  const tuval = await kapakArkaPlan(VARLIK("harita/birlik_alani.webp"), 0.16);
  const binalar = await haritaUzeriKatman([
    { dosya: "binalar/otag4.webp", x: 49.6, y: 78.0, genislikYuzde: 16.5 },
    { dosya: "binalar/cami4.webp", x: 26.3, y: 40.5, genislikYuzde: 11.5 },
    { dosya: "binalar/medrese4.webp", x: 77.0, y: 44.5, genislikYuzde: 15.0 },
    { dosya: "binalar/takasmerkezi.webp", x: 24.8, y: 65.5, genislikYuzde: 14.0 },
    { dosya: "binalar/talimhane.webp", x: 76.3, y: 66.0, genislikYuzde: 16.0 },
    { dosya: "binalar/haberlesme_kulesi.webp", x: 67.5, y: 28.5, genislikYuzde: 6.8 },
  ]);

  const svg = `
    ${tezhipCerceveKatmani("BİRLİK MEYDANI · KARDEŞLİK, TAKAS VE SANCAK TALİMİ")}
    <rect x="280" y="106" width="${W - 560}" height="184" rx="28" fill="${RENK.murekkep}" fill-opacity="0.90" stroke="${RENK.varak}" stroke-width="3"/>
    <text x="${W / 2}" y="164" text-anchor="middle" font-family="${FONT_METIN}" font-size="22" font-weight="800" letter-spacing="4" fill="${RENK.cini}">LEVEL 3+ İLE AÇILAN YENİ DÜNYA</text>
    <text x="${W / 2}" y="242" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="60" font-weight="900" fill="${RENK.varak}">Birlik Meydanı ve Sancak Talimi</text>

    <rect x="170" y="${H - 255}" width="${W - 340}" height="128" rx="26" fill="${RENK.murekkep}" fill-opacity="0.92" stroke="${RENK.cini}" stroke-width="2.5"/>
    <text x="${W / 2}" y="${H - 196}" text-anchor="middle" font-family="${FONT_METIN}" font-size="29" font-weight="700" fill="${RENK.varakAcik}">Ulu Çınar Altı Paylaşımları · Ortak Ders Çalışma Salonu · Emanetli Takas Merkezi</text>
    <text x="${W / 2}" y="${H - 150}" text-anchor="middle" font-family="${FONT_METIN}" font-size="27" font-weight="700" fill="${RENK.ciniAcik}">Güvenli Haberleşme Kulesi · 160 Soruluk Sancak Talimi ile 6 Stratejik Bölge Mücadelesi</text>
  `;
  return sahneKaydet("sahne_07.png", tuval, binalar, svg);
}

async function sahne8() {
  const tuval = await kapakArkaPlan(VARLIK("harita/genel_harita.webp"), 0.66);
  const solKarakterler = ["ahmet.webp", "elif.webp", "alp.webp", "zeynep.webp", "omer.webp"];
  const sagKarakterler = ["meryem.webp", "yusuf.webp", "bala.webp", "kerem.webp", "defne.webp"];

  const solPortreler = await Promise.all(
    solKarakterler.map(async (f, i) => ({
      input: await yuvarlakPortre(`karakterler/${f}`, 176),
      left: i % 2 === 0 ? 150 : 320,
      top: 150 + i * 190,
    }))
  );
  const sagPortreler = await Promise.all(
    sagKarakterler.map(async (f, i) => ({
      input: await yuvarlakPortre(`karakterler/${f}`, 176),
      left: i % 2 === 0 ? W - 326 : W - 496,
      top: 150 + i * 190,
    }))
  );

  const svg = `
    ${tezhipCerceveKatmani("SEYRÜSEFER.ORG · AİLECEK BİR GÖNÜL YOLCULUĞU")}
    <rect x="540" y="210" width="1160" height="820" rx="40" fill="${RENK.murekkep}" fill-opacity="0.93" stroke="${RENK.varak}" stroke-width="4"/>
    <rect x="564" y="234" width="1112" height="772" rx="30" fill="none" stroke="${RENK.varak}" stroke-opacity="0.35" stroke-width="2"/>
    ${selcukluYildiz(W / 2, 310, 42)}
    <text x="${W / 2}" y="405" text-anchor="middle" font-family="${FONT_METIN}" font-size="24" font-weight="800" letter-spacing="4" fill="${RENK.cini}">NİYETTEN İHSANA 10 LEVEL · BİR DÖNEMLİK EĞİTSEL YOLCULUK</text>
    <text x="${W / 2}" y="535" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="112" font-weight="900" letter-spacing="8" fill="${RENK.varak}">SEYRÜSEFER</text>
    <line x1="720" y1="585" x2="${W - 720}" y2="585" stroke="${RENK.varak}" stroke-opacity="0.45" stroke-width="2.5"/>
    <text x="${W / 2}" y="660" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="40" font-weight="800" fill="${RENK.parsomen}">Türkiye&apos;nin İlk Manevi Gelişim ve Aile Oyunu</text>
    <text x="${W / 2}" y="726" text-anchor="middle" font-family="${FONT_METIN}" font-size="30" font-weight="600" fill="${RENK.varakAcik}">Köyünü Kur · Ailenle Büyü · Birliğinle Yüksel</text>

    <rect x="${W / 2 - 310}" y="810" width="620" height="106" rx="53" fill="${RENK.varak}"/>
    <text x="${W / 2}" y="876" text-anchor="middle" font-family="${FONT_BASLIK}" font-size="46" font-weight="900" letter-spacing="2" fill="${RENK.murekkep}">seyrusefer.org</text>
  `;
  return sahneKaydet("sahne_08.png", tuval, [...solPortreler, ...sagPortreler], svg);
}

async function main() {
  const ffmpeg = ffmpegBul();
  console.log("FFmpeg bulundu:", ffmpeg);
  fs.mkdirSync(GECICI_KLASOR, { recursive: true });

  console.log("1/3 Sahneler Sharp ile çiziliyor (2240x1260)...");
  const sahneler = [
    { dosya: await sahne1(), sure: 7.5, yon: "in" },
    { dosya: await sahne2(), sure: 7.5, yon: "out" },
    { dosya: await sahne3(), sure: 8.5, yon: "in" },
    { dosya: await sahne4(), sure: 8.5, yon: "out" },
    { dosya: await sahne5(), sure: 7.5, yon: "in" },
    { dosya: await sahne6(), sure: 7.5, yon: "out" },
    { dosya: await sahne7(), sure: 6.5, yon: "in" },
    { dosya: await sahne8(), sure: 6.7, yon: "out" },
  ];

  const toplamSure =
    sahneler.reduce((t, s) => t + s.sure, 0) - (sahneler.length - 1) * GECIS_SURE;
  console.log(`2/3 FFmpeg ile 1080p MP4 derleniyor (~${toplamSure.toFixed(1)} sn)...`);

  const girdiler = [];
  const filtreler = [];

  sahneler.forEach((s, i) => {
    girdiler.push("-i", s.dosya);
    const kare = Math.round(s.sure * FPS);
    const zoomExpr =
      s.yon === "in"
        ? `1+0.045*(on/${kare})`
        : `1.045-0.045*(on/${kare})`;
    filtreler.push(
      `[${i}:v]zoompan=z='${zoomExpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${kare}:s=1920x1080:fps=${FPS},format=yuv420p,setsar=1[v${i}]`
    );
  });

  // Sahne geçişleri (xfade)
  let sonEtiket = "v0";
  let ofset = 0;
  for (let i = 1; i < sahneler.length; i++) {
    ofset += sahneler[i - 1].sure - GECIS_SURE;
    const yeniEtiket = `x${i}`;
    filtreler.push(
      `[${sonEtiket}][v${i}]xfade=transition=fade:duration=${GECIS_SURE}:offset=${ofset.toFixed(2)}[${yeniEtiket}]`
    );
    sonEtiket = yeniEtiket;
  }

  // Sakin Anadolu makam/ambiant fon tınısı (ses eklenene kadar sessiz kalmasın diye)
  const sesGirdiIndeksi = sahneler.length;
  girdiler.push(
    "-f",
    "lavfi",
    "-t",
    toplamSure.toFixed(2),
    "-i",
    "aevalsrc=0.06*(sin(2*PI*146.83*t)+0.55*sin(2*PI*220.0*t)+0.35*sin(2*PI*293.66*t)+0.25*sin(2*PI*329.63*t))*(0.7+0.3*sin(2*PI*0.18*t)):s=44100"
  );
  filtreler.push(
    `[${sesGirdiIndeksi}:a]lowpass=f=650,afade=t=in:st=0:d=1.8,afade=t=out:st=${(toplamSure - 2.2).toFixed(2)}:d=2.2[aout]`
  );

  const ffmpegArgs = [
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
    "20",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    CIKTI_ANA,
  ];

  const sonuc = spawnSync(ffmpeg, ffmpegArgs, { encoding: "utf8" });
  if (sonuc.status !== 0) {
    console.error(sonuc.stderr);
    throw new Error(`FFmpeg hata kodu: ${sonuc.status}`);
  }

  fs.rmSync(GECICI_KLASOR, { recursive: true, force: true });

  const boyutMB = (fs.statSync(CIKTI_ANA).size / (1024 * 1024)).toFixed(2);
  console.log(`3/3 Tamamlandı!`);
  console.log(`- ${CIKTI_ANA} (${boyutMB} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
