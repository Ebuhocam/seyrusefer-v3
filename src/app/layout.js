import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

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
  themeColor: "#1f3315",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
