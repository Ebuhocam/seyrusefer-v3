import "./globals.css";
import Hazirlaniyor from "./Hazirlaniyor";
import { onizlemeIzniVar } from "@/lib/sunucu/onizleme";

export const metadata = {
  title: "Seyrüsefer",
  description: "Seyrüsefer — köyünü kur, gündemini yaşa, birliğinle yüksel.",
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
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full font-sans">{izinli ? children : <Hazirlaniyor />}</body>
    </html>
  );
}
