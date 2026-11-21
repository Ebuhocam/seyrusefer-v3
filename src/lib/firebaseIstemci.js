// Firebase web ayarları gizli değildir (herkese açık istemci ayarları). Service account anahtarı ise
// yalnızca Cloudflare'de gizli değişken olarak durur (FIREBASE_SERVICE_ACCOUNT).
export const FIREBASE_AYARLARI = {
  apiKey: "AIzaSyBjtF9TScNnbQmCFmlZ5RevQxOfxHwgLwY",
  authDomain: "seyrusefer-afead.firebaseapp.com",
  projectId: "seyrusefer-afead",
  storageBucket: "seyrusefer-afead.firebasestorage.app",
  messagingSenderId: "780173498974",
  appId: "1:780173498974:web:f112fa4b3dab55c267b2cf",
};

// Cloud Messaging → Web Push certificates → açık anahtar
export const VAPID_ANAHTARI =
  "BAOnbEraYWCJXXPhPKu0BdxLYnpD3JqzAf7fZVXEZtD8RH8maPjCeFEfqamzwPrezwcIlf32zb6JDLTGC-Ml6DA";

/** Bu cihaz için FCM kodunu alır (bildirim izni verilmiş olmalı). Desteklenmiyorsa null. */
export async function bildirimKodunuAl() {
  const { initializeApp, getApps, getApp } = await import("firebase/app");
  const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
  if (!(await isSupported())) return null;
  const app = getApps().length ? getApp() : initializeApp(FIREBASE_AYARLARI);
  // firebase-messaging-sw.js (public/) varsayılan kapsamıyla kendiliğinden kaydedilir
  return (await getToken(getMessaging(app), { vapidKey: VAPID_ANAHTARI })) || null;
}
