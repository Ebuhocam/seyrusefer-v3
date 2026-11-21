import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { aktifKullanici, gelistiriciIzni } from "@/lib/sunucu/oturum";
import { durumGetir, oyunSaati } from "@/lib/sunucu/oyunDeposu";
import { oyunAyarlariniGetir } from "@/lib/sunucu/ayarlarDeposu";
import KoyHaritasi from "@/components/koy/KoyHaritasi";

export const dynamic = "force-dynamic";

export default async function Home() {
  const kullanici = await aktifKullanici();
  if (!kullanici) redirect("/giris");

  // E-posta doğrulanmadan oyuna girilmez. Tek istisna: e-postası hiç olmayan ESKİ hesaplar
  // "şimdilik geç" diyebilir (7 gün); yeni hesaplar geçemez.
  if (!kullanici.eposta_dogrulandi) {
    const gecti = kullanici.eposta ? false : (await cookies()).get("seyrusefer_eposta_gec")?.value === String(kullanici.id);
    if (!gecti) redirect("/dogrula");
  }

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
