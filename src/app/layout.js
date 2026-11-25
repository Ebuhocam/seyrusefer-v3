import "./globals.css";
import Hazirlaniyor from "./Hazirlaniyor";
import KurulumDavet from "./KurulumDavet";
import HafifOlcer from "./HafifOlcer";
import { HAFIF_BASLANGIC_BETIGI } from "@/lib/hafifMod";
import { onizlemeIzniVar } from "@/lib/sunucu/onizleme";

export const metadata = {
  title: "Seyrüsefer",
  description: "Seyrüsefer — köyünü kur, gündemini yaşa, birliğinle yüksel.",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Seyrüsefer", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "Seyrüsefer",
    description: "Seyrüsefer — köyünü kur, gündemini yaşa, birliğinle yüksel.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0d1628",
};

export default async function RootLayout({ children }) {
  // Gizli ön izleme kapısı: şifre girilmemişse herkes "hazırlanıyor" sayfasını görür
  const izinli = await onizlemeIzniVar();
  return (
    <html lang="tr" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Hafif mod sınıfı sayfa boyanmadan eklenir (akıllı tahta / zayıf cihaz) */}
        <script dangerouslySetInnerHTML={{ __html: HAFIF_BASLANGIC_BETIGI }} />
      </head>
      <body className="min-h-full font-sans">
        {izinli ? children : <Hazirlaniyor />}
        {izinli && <KurulumDavet />}
        {izinli && <HafifOlcer />}
      </body>
    </html>
  );
}
