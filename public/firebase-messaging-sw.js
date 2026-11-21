// Seyrüsefer bildirim servis işçisi. Sunucu "data" mesajı gönderir: { baslik, metin, url }.
// Firebase SDK'sına gerek yok; gelen push'u doğrudan gösteririz.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let yuk = {};
  try {
    yuk = event.data ? event.data.json() : {};
  } catch {
    yuk = {};
  }
  const d = yuk.data || yuk;
  const baslik = d.baslik || (yuk.notification && yuk.notification.title) || "Seyrüsefer";
  const metin = d.metin || (yuk.notification && yuk.notification.body) || "Köyün seni bekliyor.";
  event.waitUntil(
    self.registration.showNotification(baslik, {
      body: metin,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "seyrusefer-gunluk", // aynı gün üst üste birikmez
      data: { url: d.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((liste) => {
      for (const c of liste) {
        if ("focus" in c) return c.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
