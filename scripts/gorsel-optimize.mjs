// Orijinal PNG'leri (_kaynak-gorseller) web için hafif WebP'lere dönüştürür.
// Kullanım: npm run gorseller
import sharp from "sharp";
import { readdir, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const KAYNAK = "_kaynak-gorseller";
const HEDEF = "public/assets";

// Klasör → çıktı ayarları
const GRUPLAR = [
  // Bina görselleri: şeffaf boşlukları kırp, en uzun kenar 640px
  { klasor: "binalar", cikti: "binalar", kirp: true, maks: 640, kalite: 82 },
  // Arka plan haritası: tam genişlik korunur
  { klasor: "harita", cikti: "harita", kirp: false, maks: 1920, kalite: 85 },
];

const kb = (b) => `${Math.round(b / 1024)} KB`;

for (const g of GRUPLAR) {
  const giris = path.join(KAYNAK, g.klasor);
  const cikis = path.join(HEDEF, g.cikti);
  await mkdir(cikis, { recursive: true });

  let dosyalar = [];
  try {
    dosyalar = (await readdir(giris)).filter((f) => /\.(png|jpe?g)$/i.test(f));
  } catch {
    console.warn(`! ${giris} bulunamadı, atlanıyor`);
    continue;
  }

  for (const dosya of dosyalar) {
    const kaynakYol = path.join(giris, dosya);
    const hedefYol = path.join(cikis, dosya.replace(/\.(png|jpe?g)$/i, ".webp"));

    let img = sharp(kaynakYol);
    if (g.kirp) img = img.trim({ threshold: 10 });
    await img
      .resize({ width: g.maks, height: g.maks, fit: "inside", withoutEnlargement: true })
      .webp({ quality: g.kalite, alphaQuality: 90 })
      .toFile(hedefYol);

    const [once, sonra] = await Promise.all([stat(kaynakYol), stat(hedefYol)]);
    const meta = await sharp(hedefYol).metadata();
    console.log(
      `${dosya.padEnd(22)} ${kb(once.size).padStart(8)} → ${kb(sonra.size).padStart(7)}  (${meta.width}x${meta.height})`
    );
  }
}
