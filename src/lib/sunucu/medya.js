import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Cloudflare R2 medya deposu (wrangler.jsonc → r2_buckets → BUCKET). Yoksa null. */
export async function medyaDeposu() {
  try {
    const ctx = await getCloudflareContext({ async: true });
    return ctx?.env?.BUCKET ?? null;
  } catch {
    return null;
  }
}

export const SES_TURLERI = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
};
export const SES_EN_COK_BAYT = 15 * 1024 * 1024;
