import { redirect } from "next/navigation";
import { aktifKullanici } from "@/lib/sunucu/oturum";
import GirisFormu from "./GirisFormu";

export const dynamic = "force-dynamic";

export default async function GirisSayfasi() {
  const kullanici = await aktifKullanici();
  if (kullanici) redirect("/");
  return <GirisFormu />;
}
