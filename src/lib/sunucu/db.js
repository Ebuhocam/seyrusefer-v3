import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** D1 veritabanı bağlantısı (wrangler.jsonc → d1_databases.binding = "DB") */
export async function db() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}
