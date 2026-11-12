import { redirect } from "next/navigation";
import { aktifKullanici, gelistiriciIzni } from "@/lib/sunucu/oturum";
import AdminPaneli from "./AdminPaneli";

export const dynamic = "force-dynamic";

export default async function AdminSayfasi() {
  const kullanici = await aktifKullanici();
  if (!kullanici) redirect("/giris");
  if (!gelistiriciIzni(kullanici)) redirect("/");

  return <AdminPaneli />;
}
