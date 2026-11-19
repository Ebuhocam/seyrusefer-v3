/**
 * Seyrüsefer v3 — Birlik Alanı Görsel Kesim & Harita Güncelleme Betiği
 *
 * Kullanım:
 *   _kaynak-gorseller/uretilen/ klasörüne aşağıdaki dosyalardan elinizde olanları koyun:
 *     - birlik_alani_izometrik.png  -> public/assets/harita/birlik_alani.webp (1376x768)
 *     - takasmerkezi1.png           -> public/assets/binalar/takasmerkezi1.webp (şeffaf arka plan)
 *     - talimhane2.png              -> public/assets/binalar/talimhane2.webp (şeffaf arka plan)
 *     - haberlesme_kulesi.png       -> public/assets/binalar/haberlesme_kulesi.webp (şeffaf arka plan)
 *
 *   Çalıştırın:
 *     node scripts/birlik-gorsel-hazirla.mjs
 *
 *   Opsiyonel yerleşim önizlemesi üretmek için:
 *     node scripts/birlik-gorsel-hazirla.mjs --onizle
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { BIRLIK_BINALARI, BIRLIK_MEYDANI_CINAR } from "../src/lib/oyun/sabitler.js";

const KOK = process.cwd();
const URETILEN_KLASOR = path.join(KOK, "_kaynak-gorseller", "uretilen");
const HARITA_HEDEF = path.join(KOK, "public", "assets", "harita", "birlik_alani.webp");
const BINA_KLASOR = path.join(KOK, "public", "assets", "binalar");

const BINA_ESLESMELERI = [
  { kaynakAd: "takasmerkezi1", hedefAd: "takasmerkezi1.webp" },
  { kaynakAd: "talimhane2", hedefAd: "talimhane2.webp" },
  { kaynakAd: "haberlesme_kulesi", hedefAd: "haberlesme_kulesi.webp" },
];

function dosyaBul(adTabani) {
  for (const uzanti of [".png", ".jpg", ".jpeg", ".webp"]) {
    const yol = path.join(URETILEN_KLASOR, `${adTabani}${uzanti}`);
    if (fs.existsSync(yol)) return yol;
  }
  return null;
}

function beyazArkaPlanMi(data, idx) {
  const r = data[idx];
  const g = data[idx + 1];
  const b = data[idx + 2];
  const a = data[idx + 3];
  if (a < 20) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  // Nötr beyaz veya çok açık gri stüdyo zemini (doygunluk düşük, parlaklık yüksek)
  return min >= 224 && max - min <= 24;
}

/**
 * Dış kenarlardan bağlı beyaz/açık gri pikselleri flood-fill ile siler;
 * içerideki beyaz detayları (ör. beyaz güvercin, taş parıltıları) korur.
 */
async function seffafKesVeKaydet(kaynakYol, hedefYol) {
  const { data, info } = await sharp(kaynakYol)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: w, height: h } = info;
  const toplam = w * h;
  const ziyaret = new Uint8Array(toplam);
  const silinecek = new Uint8Array(toplam);
  const kuyruk = new Int32Array(toplam);
  let bas = 0;
  let son = 0;

  const ekle = (x, y) => {
    const pos = y * w + x;
    if (ziyaret[pos]) return;
    ziyaret[pos] = 1;
    if (beyazArkaPlanMi(data, pos * 4)) {
      silinecek[pos] = 1;
      kuyruk[son++] = pos;
    }
  };

  for (let x = 0; x < w; x++) {
    ekle(x, 0);
    ekle(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    ekle(0, y);
    ekle(w - 1, y);
  }

  while (bas < son) {
    const pos = kuyruk[bas++];
    const x = pos % w;
    const y = (pos - x) / w;
    if (x > 0) ekle(x - 1, y);
    if (x + 1 < w) ekle(x + 1, y);
    if (y > 0) ekle(x, y - 1);
    if (y + 1 < h) ekle(x, y + 1);
  }

  // Silinen pikselleri şeffaf yap; sınırındaki 1 piksellik açık hale varsa alpha yumuşat
  for (let pos = 0; pos < toplam; pos++) {
    const idx = pos * 4;
    if (silinecek[pos]) {
      data[idx + 3] = 0;
      continue;
    }
    const x = pos % w;
    const y = (pos - x) / w;
    const komsuSilindi =
      (x > 0 && silinecek[pos - 1]) ||
      (x + 1 < w && silinecek[pos + 1]) ||
      (y > 0 && silinecek[pos - w]) ||
      (y + 1 < h && silinecek[pos + w]);

    if (komsuSilindi) {
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const min = Math.min(r, g, b);
      const max = Math.max(r, g, b);
      if (min >= 200 && max - min <= 26) {
        const oran = Math.max(0, Math.min(1, (240 - min) / 45));
        data[idx + 3] = Math.round(data[idx + 3] * oran);
      }
    }
  }

  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 10 })
    .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84, alphaQuality: 92 })
    .toFile(hedefYol);

  const meta = await sharp(hedefYol).metadata();
  const kb = Math.round(fs.statSync(hedefYol).size / 1024);
  console.log(`✓ ${path.basename(hedefYol)} güncellendi (${meta.width}x${meta.height}, ${kb} KB)`);
}

async function haritaGuncelle(kaynakYol) {
  await sharp(kaynakYol)
    .resize(1376, 768, { fit: "cover", position: "center" })
    .webp({ quality: 86 })
    .toFile(HARITA_HEDEF);

  const kb = Math.round(fs.statSync(HARITA_HEDEF).size / 1024);
  console.log(`✓ birlik_alani.webp güncellendi (1376x768, ${kb} KB)`);
}

async function onizlemeUret(seviyeModu, ciktiYolu) {
  const W = 1710;
  const H = 920;
  const katmanlar = [];

  for (const [, b] of Object.entries(BIRLIK_BINALARI)) {
    const s = seviyeModu === "min" ? 1 : b.maksSeviye;
    const gorselYol = path.join(KOK, "public", b.gorsel(s));
    const genislik = Math.round((b.genislik / 100) * W);
    const parca = await sharp(gorselYol)
      .resize({ width: genislik })
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    const left = Math.round((b.x / 100) * W - parca.info.width * 0.5);
    const top = Math.round((b.y / 100) * H - parca.info.height * 0.65);
    katmanlar.push({
      input: parca.data,
      left: Math.max(0, left),
      top: Math.max(0, top),
      z: Math.round(b.y * 2),
    });
  }

  katmanlar.sort((a, b) => a.z - b.z);
  const cx = Math.round((BIRLIK_MEYDANI_CINAR.x / 100) * W);
  const cy = Math.round((BIRLIK_MEYDANI_CINAR.y / 100) * H);
  const cinarSvg = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${cx - 72}" y="${cy - 22}" width="144" height="44" rx="16" fill="#047857" stroke="#fcd34d" stroke-width="3"/>
      <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="16" font-weight="bold" fill="#ecfdf5">Çınar Altı</text>
    </svg>`
  );

  await sharp(HARITA_HEDEF)
    .resize(W, H, { fit: "cover", position: "center" })
    .composite([...katmanlar.map(({ input, left, top }) => ({ input, left, top })), { input: cinarSvg, left: 0, top: 0 }])
    .png()
    .toFile(ciktiYolu);

  console.log(`✓ Önizleme üretildi: ${ciktiYolu}`);
}

async function main() {
  fs.mkdirSync(URETILEN_KLASOR, { recursive: true });
  let islenen = 0;

  const haritaKaynak = dosyaBul("birlik_alani_izometrik");
  if (haritaKaynak) {
    await haritaGuncelle(haritaKaynak);
    islenen++;
  }

  for (const m of BINA_ESLESMELERI) {
    const kaynakYol = dosyaBul(m.kaynakAd);
    if (!kaynakYol) continue;
    await seffafKesVeKaydet(kaynakYol, path.join(BINA_KLASOR, m.hedefAd));
    islenen++;
  }

  if (islenen === 0) {
    console.log("İşlenecek yeni kaynak görsel bulunamadı (_kaynak-gorseller/uretilen/).");
  }

  if (process.argv.includes("--onizle")) {
    await onizlemeUret("min", path.join(URETILEN_KLASOR, "onizle_min.png"));
    await onizlemeUret("max", path.join(URETILEN_KLASOR, "onizle_max.png"));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
