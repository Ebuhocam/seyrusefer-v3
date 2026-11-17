import { redirect } from "next/navigation";
import { aktifKullanici } from "@/lib/sunucu/oturum";
import AdminPaneli from "./AdminPaneli";

export const dynamic = "force-dynamic";

export default async function AdminSayfasi() {
  const kullanici = await aktifKullanici();
  if (!kullanici) redirect("/giris");
  // Yönetim Merkezi yalnızca öğretmen (admin rolü) içindir; geliştirme ortamında bile öğrenciler giremez
  if (kullanici.rol !== "admin") redirect("/");

  return <AdminPaneli />;
}
