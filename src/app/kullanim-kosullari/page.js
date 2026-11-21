import KartKabugu from "../KartKabugu";
import { ILETISIM_EPOSTA, SITE_ADI, YASAL_GUNCELLEME } from "@/lib/yasal";

export const metadata = { title: "Kullanım Koşulları — Seyrüsefer" };

const B = "mt-4 mb-1 text-base font-black text-amber-200";
const P = "text-sm leading-relaxed text-amber-100/90";

export default function KullanimKosullari() {
  return (
    <KartKabugu baslik="Kullanım Koşulları" genis>
      <p className="text-center text-[11px] text-amber-300/70">Son güncelleme: {YASAL_GUNCELLEME}</p>

      <h2 className={B}>1. Hizmet nedir?</h2>
      <p className={P}>
        {SITE_ADI}, öğrencilerin din kültürü ve ahlak bilgisi derslerini oyunla pekiştirmeleri için hazırlanmış eğitici bir oyun
        platformudur. Ticari bir amaç taşımaz; oyun içi kaynaklar (erzak, kereste, taş vb.) gerçek para değeri taşımaz.
      </p>

      <h2 className={B}>2. Hesap ve yaş</h2>
      <p className={P}>
        Hesap açarken doğru bilgi vermelisin. Kullanıcı adın ve şifren sana özeldir; başkasıyla paylaşma. 18 yaşından küçükler
        platformu velilerinin bilgisi dahilinde kullanır; kayıtta yazılan e-posta adresi veli e-postası olabilir. Aynı e-posta
        adresiyle en fazla 3 hesap açılabilir.
      </p>

      <h2 className={B}>3. Davranış kuralları</h2>
      <p className={P}>
        Diğer oyunculara saygılı ol. Hakaret, küfür, taciz, kişisel bilgi paylaşma, haksız avantaj sağlamak için hile veya
        sistemi aksatacak davranışlar yasaktır. Çınar Altı ve benzeri ortak alanlardaki yazıların sorumluluğu yazana aittir.
        Kurallara uymayan hesaplar uyarılabilir, kısıtlanabilir veya kapatılabilir.
      </p>

      <h2 className={B}>4. İçerik</h2>
      <p className={P}>
        Platformdaki metin, görsel ve oyun tasarımları {SITE_ADI} ekibine aittir; izinsiz kopyalanıp ticari amaçla kullanılamaz.
        Oyunda yer alan dini içerikler eğitim amaçlıdır; ibadet ve kutsal şahsiyetler canlandırılmaz.
      </p>

      <h2 className={B}>5. Hizmetin sürekliliği</h2>
      <p className={P}>
        Platform &quot;olduğu gibi&quot; sunulur. Bakım, güncelleme veya teknik sorunlar nedeniyle hizmet geçici olarak kesilebilir;
        oyun verileri korunmaya çalışılır ancak kayıpsız olacağı garanti edilmez. Hizmet değiştirilebilir veya sona erdirilebilir.
      </p>

      <h2 className={B}>6. Hesabı silme</h2>
      <p className={P}>
        Hesabının ve verilerinin silinmesini istediğinde {ILETISIM_EPOSTA} adresine, hesabına kayıtlı e-postadan yazabilirsin.
      </p>

      <h2 className={B}>7. Değişiklikler ve iletişim</h2>
      <p className={P}>
        Bu koşullar güncellenebilir; önemli değişiklikler platformda duyurulur. Sorular için: {ILETISIM_EPOSTA}
      </p>

      <a href="/giris" className="mt-6 block text-center text-xs font-semibold text-amber-200/80 underline hover:text-amber-100">
        Girişe dön
      </a>
    </KartKabugu>
  );
}
