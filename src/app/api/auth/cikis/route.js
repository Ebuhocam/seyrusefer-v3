import { oturumKapat } from "@/lib/sunucu/oturum";

export async function POST() {
  await oturumKapat();
  return Response.json({ tamam: true });
}
