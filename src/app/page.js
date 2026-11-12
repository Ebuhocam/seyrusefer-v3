import { redirect } from "next/navigation";
import { aktifKullanici, gelistiriciIzni } from "@/lib/sunucu/oturum";
import { durumGetir, oyunSaati } from "@/lib/sunucu/oyunDeposu";
import KoyHaritasi from "@/components/koy/KoyHaritasi";

export const dynamic = "force-dynamic";

export default async function Home() {
  const kullanici = await aktifKullanici();
  if (!kullanici) redirect("/giris");

  const durum = await durumGetir(kullanici.id);
  const baslangic = {
    kullanici: { ad: kullanici.ad, kullaniciAdi: kullanici.kullanici_adi, rol: kullanici.rol },
    durum,
    sunucuSaati: oyunSaati(durum),
    gelistirici: gelistiriciIzni(kullanici),
  };

  return <KoyHaritasi baslangic={baslangic} />;
}
