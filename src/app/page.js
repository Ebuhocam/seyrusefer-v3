import { redirect } from "next/navigation";
import { aktifKullanici, gelistiriciIzni } from "@/lib/sunucu/oturum";
import { durumGetir, oyunSaati } from "@/lib/sunucu/oyunDeposu";
import { oyunAyarlariniGetir } from "@/lib/sunucu/ayarlarDeposu";
import KoyHaritasi from "@/components/koy/KoyHaritasi";

export const dynamic = "force-dynamic";

export default async function Home() {
  const kullanici = await aktifKullanici();
  if (!kullanici) redirect("/giris");

  const [durum, ayarlar] = await Promise.all([durumGetir(kullanici.id), oyunAyarlariniGetir()]);
  const baslangic = {
    kullanici: { id: kullanici.id, ad: kullanici.ad, kullaniciAdi: kullanici.kullanici_adi, rol: kullanici.rol },
    durum,
    ayarlar,
    sunucuSaati: oyunSaati(durum),
    gelistirici: gelistiriciIzni(kullanici),
  };

  return <KoyHaritasi baslangic={baslangic} />;
}
