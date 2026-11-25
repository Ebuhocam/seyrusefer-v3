/**
 * Telefon / tablet / masaüstü için 3D grafik profili (Taş Ocağı, Tarla, Orman ve 3D Meydan ortak kullanır).
 */
function dokunmatikMi() {
  if (typeof window === "undefined") return false;
  return Boolean(window.matchMedia?.("(pointer: coarse)")?.matches) || (navigator.maxTouchPoints ?? 0) > 0;
}

/**
 * Grafik profili: telefonlarda piksel oranı, kenar yumuşatma, gölge ve kare hızı düşürülür.
 * Masaüstü: tam kalite · Güçlü telefon: orta · Zayıf telefon (≤4 GB bellek / ≤4 çekirdek): düşük.
 */
const DUSUK_PROFIL = { ad: "dusuk", dpr: 1, aa: false, golge: false, yumusakGolge: false, golgeBoyut: 256, fps: 30 };
let grafikProfiliOnbellek = null;
export function grafikProfili() {
  // Hafif mod (akıllı tahta / zayıf cihaz): her zaman en düşük kalite
  if (typeof document !== "undefined" && document.documentElement.classList.contains("hafif")) return DUSUK_PROFIL;
  if (grafikProfiliOnbellek) return grafikProfiliOnbellek;
  if (typeof window === "undefined") return { ad: "yuksek", dpr: 2, aa: true, golge: true, yumusakGolge: true, golgeBoyut: 2048, fps: 60 };
  const dokun = dokunmatikMi();
  const bellek = Number(navigator.deviceMemory ?? 8);
  const cekirdek = Number(navigator.hardwareConcurrency ?? 8);
  const zayif = dokun && (bellek <= 4 || cekirdek <= 4);
  grafikProfiliOnbellek = !dokun
    ? { ad: "yuksek", dpr: 2, aa: true, golge: true, yumusakGolge: true, golgeBoyut: 2048, fps: 60 }
    : zayif
    ? { ad: "dusuk", dpr: 1, aa: false, golge: false, yumusakGolge: false, golgeBoyut: 256, fps: 30 }
    : { ad: "orta", dpr: 1.25, aa: false, golge: true, yumusakGolge: false, golgeBoyut: 512, fps: 30 };
  return grafikProfiliOnbellek;
}
