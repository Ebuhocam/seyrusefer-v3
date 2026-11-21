// PWA simgelerini _kaynak-gorseller/uygulama-ikonu.jpg (1024x1024) görselinden üretir.
// Kullanım: node scripts/pwa-ikon-uret.mjs
import sharp from "sharp";

const KAYNAK = "_kaynak-gorseller/uygulama-ikonu.jpg";
const CIKTI = "public/icons";
const ZEMIN = { r: 0, g: 15, b: 44, alpha: 1 }; // görselin lacivert zemini

// Normal simgeler: görselin kendisi (kendi altın çerçevesiyle)
for (const [boyut, ad] of [
  [192, "icon-192.png"],
  [512, "icon-512.png"],
  [180, "apple-touch-icon.png"],
]) {
  await sharp(KAYNAK).resize(boyut, boyut).png().toFile(`${CIKTI}/${ad}`);
  console.log(ad);
}

// Maskable: Android simgeyi daire/yuvarlak kareyle kırpabilir; görseli küçültüp zemin üstüne yerleştiririz
const ic = Math.round(512 * 0.72);
const kucuk = await sharp(KAYNAK).resize(ic, ic).toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: ZEMIN } })
  .composite([{ input: kucuk, gravity: "center" }])
  .png()
  .toFile(`${CIKTI}/icon-maskable-512.png`);
console.log("icon-maskable-512.png");
