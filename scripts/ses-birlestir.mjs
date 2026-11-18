/**
 * Seyrüsefer v3 — ElevenLabs Seslendirme + Arka Plan Müziği Birleştirici
 * Kullanım:
 *   1. ElevenLabs çıktısını proje klasörüne `seslendirme.mp3` olarak kaydedin.
 *   2. Müzik çıktısını proje klasörüne `muzik.mp3` olarak kaydedin.
 *   3. Çalıştırın: node scripts/ses-birlestir.mjs
 * İsteğe bağlı tek dosya da verebilirsiniz (yalnızca seslendirme veya yalnızca müzik).
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const KOK = process.cwd();
const VIDEO_GIRDI = path.join(KOK, "tanitim_filmi.mp4");
const VIDEO_CIKTI = path.join(KOK, "tanitim_filmi_sesli.mp4");

const FFMPEG_ADAYLARI = [
  process.env.FFMPEG_PATH,
  "C:\\Users\\Ebubekir\\Desktop\\Sarıgelin\\node_modules\\ffmpeg-static\\ffmpeg.exe",
  "ffmpeg",
].filter(Boolean);

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

function dosyaBul(isim, uzantilar = [".mp3", ".wav", ".m4a", ".ogg"]) {
  for (const u of uzantilar) {
    const tam = path.join(KOK, `${isim}${u}`);
    if (fs.existsSync(tam)) return tam;
  }
  return null;
}

function main() {
  if (!fs.existsSync(VIDEO_GIRDI)) {
    console.error("Hata: Önce `node scripts/tanitim-filmi-olustur.mjs` ile tanitim_filmi.mp4 üretin.");
    process.exit(1);
  }

  const sesDosya = dosyaBul("seslendirme");
  const muzikDosya = dosyaBul("muzik");

  if (!sesDosya && !muzikDosya) {
    console.log("Ses dosyası bulunamadı.");
    console.log("Lütfen proje klasörüne şu dosyalardan birini veya ikisini ekleyin:");
    console.log("  - seslendirme.mp3  (ElevenLabs seslendirmesi)");
    console.log("  - muzik.mp3        (Arka plan müziği)");
    console.log("Sonra yeniden çalıştırın: node scripts/ses-birlestir.mjs");
    process.exit(1);
  }

  const ffmpeg = ffmpegBul();
  const args = ["-y", "-i", VIDEO_GIRDI];
  let filtre = "";

  if (sesDosya && muzikDosya) {
    console.log("Seslendirme:", path.basename(sesDosya));
    console.log("Müzik:", path.basename(muzikDosya));
    args.push("-i", sesDosya, "-stream_loop", "-1", "-i", muzikDosya);
    // Müziği %18 seviyesine kısar, seslendirmeyi net tutar, sonunda yumuşak fade-out yapar
    filtre =
      "[1:a]volume=1.05,apad[ses];[2:a]volume=0.18,afade=t=in:st=0:d=1.2[muz];[ses][muz]amix=inputs=2:duration=first:dropout_transition=2:normalize=0,afade=t=out:st=53.5:d=2.5[aout]";
  } else if (sesDosya) {
    console.log("Yalnızca seslendirme eklenecek:", path.basename(sesDosya));
    args.push("-i", sesDosya);
    filtre = "[1:a]volume=1.05,apad[aout]";
  } else {
    console.log("Yalnızca müzik eklenecek:", path.basename(muzikDosya));
    args.push("-stream_loop", "-1", "-i", muzikDosya);
    filtre = "[1:a]volume=0.75,afade=t=in:st=0:d=1.2,afade=t=out:st=53.5:d=2.5[aout]";
  }

  args.push(
    "-filter_complex",
    filtre,
    "-map",
    "0:v",
    "-map",
    "[aout]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    "-movflags",
    "+faststart",
    VIDEO_CIKTI
  );

  const sonuc = spawnSync(ffmpeg, args, { encoding: "utf8" });
  if (sonuc.status !== 0) {
    console.error(sonuc.stderr);
    process.exit(sonuc.status || 1);
  }

  const mb = (fs.statSync(VIDEO_CIKTI).size / (1024 * 1024)).toFixed(2);
  console.log(`Hazır: ${VIDEO_CIKTI} (${mb} MB)`);
}

main();
