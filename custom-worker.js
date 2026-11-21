// OpenNext Worker'ını sarar ve günlük bildirim zamanlayıcısını (cron) ekler.
// wrangler.jsonc → "main": "custom-worker.js", "triggers.crons"
import handler from "./.open-next/worker.js";

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

async function sha256(metin) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(metin));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
  fetch: handler.fetch,

  // Her gün (wrangler.jsonc'daki saatte) günlük hatırlatma uç noktasını kendi kendine çağırır
  async scheduled(event, env, ctx) {
    const ham = String(env.FIREBASE_SERVICE_ACCOUNT ?? "").trim();
    if (!ham) return;
    const istek = new Request("https://seyrusefer.org/api/bildirim/gunluk", {
      method: "POST",
      headers: { "x-cron-anahtar": await sha256(ham) },
    });
    ctx.waitUntil(handler.fetch(istek, env, ctx));
  },
};
