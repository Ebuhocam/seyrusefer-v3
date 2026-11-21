import KartKabugu from "../KartKabugu";
import { ILETISIM_EPOSTA, SITE_ADI, YASAL_GUNCELLEME } from "@/lib/yasal";

// Kök düzen çerez okuduğu için sayfa her istekte üretilir (statik üretim canlıda 500 veriyordu)
export const dynamic = "force-dynamic";

export const metadata = { title: "Gizlilik Bildirimi — Seyrüsefer" };

const B = "mt-4 mb-1 text-base font-black text-amber-200";
const P = "text-sm leading-relaxed text-amber-100/90";

export default function Gizlilik() {
  return (
    <KartKabugu baslik="Gizlilik ve KVKK Aydınlatma Metni" genis>
      <p className="text-center text-[11px] text-amber-300/70">Son güncelleme: {YASAL_GUNCELLEME}</p>

      <h2 className={B}>Veri sorumlusu</h2>
      <p className={P}>
        {SITE_ADI} platformunun işletmecisi, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusudur.
        İletişim: {ILETISIM_EPOSTA}
      </p>

      <h2 className={B}>Hangi verileri topluyoruz?</h2>
      <ul className={`${P} list-disc space-y-1 pl-5`}>
        <li>Kullanıcı adı, görünen ad, seçtiğin karakter ve cinsiyet bilgisi</li>
        <li>E-posta adresi (doğrulama ve şifre sıfırlama için)</li>
        <li>Şifren (yalnızca geri döndürülemez şifrelenmiş özeti saklanır; biz de göremeyiz)</li>
        <li>Oyun ilerlemen: bina, kaynak, görev, puan, birlik ve sohbet/mesaj kayıtları</li>
        <li>Teknik veriler: oturum çerezi ve güvenlik amaçlı istek kayıtları</li>
      </ul>

      <h2 className={B}>Neden kullanıyoruz?</h2>
      <p className={P}>
        Hesabını yönetmek, oyunu sunmak, hesap güvenliğini sağlamak (e-posta doğrulama, şifre sıfırlama, çoklu sahte hesabı
        önleme) ve öğretmenin sınıf ilerlemesini görebilmesi için. Verilerin reklam amacıyla kullanılmaz, satılmaz ve üçüncü
        taraflarla pazarlama için paylaşılmaz.
      </p>

      <h2 className={B}>Kimlerle paylaşılır?</h2>
      <p className={P}>
        Verilerin yalnızca hizmetin çalışması için gereken altyapı sağlayıcılarında işlenir: barındırma ve veritabanı için
        Cloudflare, doğrulama e-postalarının gönderimi için Resend. Bu sağlayıcıların sunucuları yurt dışında olabilir. Sınıf
        ilerlemesi, platformu kullandıran öğretmen/yönetici tarafından görülebilir.
      </p>

      <h2 className={B}>Çocukların verileri</h2>
      <p className={P}>
        Platform ortaokul öğrencilerine yöneliktir. 18 yaşından küçük kullanıcılar için kayıt, velinin bilgisi ve onayı
        dahilinde yapılmalıdır. Velilerin, çocuklarına ait verilerin bilgisini istemeye ve silinmesini talep etmeye hakkı vardır.
        Gerçek ad ve soyad yerine takma ad kullanılması önerilir; sohbet alanlarına telefon, adres gibi kişisel bilgi yazılmamalıdır.
      </p>

      <h2 className={B}>Saklama süresi</h2>
      <p className={P}>
        Verilerin hesabın var olduğu sürece saklanır. Hesabın silinmesini istediğinde veriler makul bir süre içinde silinir veya
        anonim hale getirilir; yasal saklama yükümlülükleri saklıdır.
      </p>

      <h2 className={B}>Çerezler ve tarayıcı depolama</h2>
      <p className={P}>
        Oturumunu açık tutmak için zorunlu bir çerez kullanırız. Ayrıca uygulamayı ana ekrana ekleme davetini hatırlamak gibi
        tercihlerin için cihazında küçük kayıtlar tutulur. Reklam veya takip çerezi kullanılmaz.
      </p>

      <h2 className={B}>Hakların</h2>
      <p className={P}>
        KVKK madde 11 uyarınca verilerinin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltme, silme ve itiraz etme
        haklarına sahipsin. Başvuru için {ILETISIM_EPOSTA} adresine, hesabına kayıtlı e-postadan yazabilirsin.
      </p>

      <a href="/giris" className="mt-6 block text-center text-xs font-semibold text-amber-200/80 underline hover:text-amber-100">
        Girişe dön
      </a>
    </KartKabugu>
  );
}
