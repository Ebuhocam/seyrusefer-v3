export default function manifest() {
  return {
    id: "/",
    name: "Seyrüsefer",
    short_name: "Seyrüsefer",
    description: "Seyrüsefer — köyünü kur, gündemini yaşa, birliğinle yüksel.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0d1628",
    theme_color: "#0d1628",
    lang: "tr",
    categories: ["education", "games"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
