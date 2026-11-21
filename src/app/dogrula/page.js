import { redirect } from "next/navigation";
import { aktifKullanici } from "@/lib/sunucu/oturum";
import DogrulaFormu from "./DogrulaFormu";

export const dynamic = "force-dynamic";

export default async function DogrulaSayfasi() {
  const kullanici = await aktifKullanici();
  if (!kullanici) redirect("/giris");
  if (kullanici.eposta_dogrulandi) redirect("/");
  return (
    <DogrulaFormu
      eposta={kullanici.eposta ?? ""}
      eskiHesap={!kullanici.eposta}
      kosulOnayli={Boolean(kullanici.kosul_onay)}
    />
  );
}
