// Eski Seyrüsefer sürümünün service worker'ını temizler.
// Tarayıcı bu dosyanın değiştiğini görünce yeni sürümü kurar; bu sürüm tüm eski
// önbellekleri siler, kendini kaldırır ve açık sekmeleri tazeler.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const anahtarlar = await caches.keys();
      await Promise.all(anahtarlar.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const sekmeler = await self.clients.matchAll({ type: "window" });
      sekmeler.forEach((s) => s.navigate(s.url));
    })()
  );
});
