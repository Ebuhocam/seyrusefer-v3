"use client";
// =============================================================
// Küçük ses efektleri — dosya gerektirmez, tarayıcının WebAudio'su ile üretilir.
// Öğrenci üst bardaki 🔔 düğmesiyle kapatabilir (tercih cihazda saklanır).
// =============================================================
const ANAHTAR = "seyrusefer_ses";
let baglam = null;

export function sesAcikMi() {
  try {
    return window.localStorage.getItem(ANAHTAR) !== "kapali";
  } catch {
    return true;
  }
}

export function sesAyarla(acik) {
  try {
    window.localStorage.setItem(ANAHTAR, acik ? "acik" : "kapali");
  } catch {
    // saklanamazsa yalnızca bu oturumda geçerli olur
  }
}

function nota(ctx, frekans, baslangic, sure, tur = "sine", siddet = 0.12) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = tur;
  o.frequency.setValueAtTime(frekans, baslangic);
  g.gain.setValueAtTime(0.0001, baslangic);
  g.gain.exponentialRampToValueAtTime(siddet, baslangic + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, baslangic + sure);
  o.connect(g).connect(ctx.destination);
  o.start(baslangic);
  o.stop(baslangic + sure + 0.05);
}

// Hüseynî makamını andıran küçük ezgiler (Hz)
const EZGILER = {
  toplama: { notalar: [660, 880], aralik: 0.07, sure: 0.18, tur: "triangle" },
  gorev: { notalar: [587, 659, 784], aralik: 0.09, sure: 0.3, tur: "triangle" },
  insa: { notalar: [392, 494, 587, 784], aralik: 0.1, sure: 0.4, tur: "triangle" },
  level: { notalar: [440, 494, 587, 659, 784, 880, 1175], aralik: 0.11, sure: 0.6, tur: "sine" },
  hata: { notalar: [220, 196], aralik: 0.12, sure: 0.22, tur: "sawtooth", siddet: 0.05 },
};

export function sesCal(ad) {
  if (typeof window === "undefined" || !sesAcikMi()) return;
  const ezgi = EZGILER[ad];
  if (!ezgi) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    baglam = baglam ?? new Ctx();
    if (baglam.state === "suspended") baglam.resume();
    const t0 = baglam.currentTime + 0.01;
    ezgi.notalar.forEach((f, i) => nota(baglam, f, t0 + i * ezgi.aralik, ezgi.sure, ezgi.tur, ezgi.siddet ?? 0.1));
  } catch {
    // ses çalınamazsa oyun sessiz devam eder
  }
}

// =============================================================
// OZAN DEDE SESİ (ses dosyası girilmemişse tarayıcının Türkçe sesi)
// Cihazdaki Türkçe sesler arasından en doğal olanı seçer: önce "Natural/Neural/Online"
// (Edge/Windows), sonra Google, sonra erkek sesleri. Uzun metinler, bazı tarayıcıların
// konuşmayı yarıda kesmemesi için cümle cümle okunur.
// =============================================================
const ERKEK_SES_ADLARI = /ahmet|tolga|emre|cem|erkek|male/i;

function sesleriAl() {
  return new Promise((coz) => {
    const synth = window.speechSynthesis;
    const liste = synth.getVoices();
    if (liste.length) return coz(liste);
    const bitti = () => coz(synth.getVoices());
    synth.addEventListener?.("voiceschanged", bitti, { once: true });
    window.setTimeout(bitti, 1200);
  });
}

function ozanSesiPuani(v) {
  let p = 0;
  if (/natural|neural|online|premium|enhanced/i.test(v.name)) p += 40;
  if (/google/i.test(v.name)) p += 15;
  if (ERKEK_SES_ADLARI.test(v.name)) p += 20;
  if (v.localService === false) p += 5;
  return p;
}

/**
 * Metni Ozan Dede sesiyle okur. Döndürülen fonksiyon okumayı durdurur.
 * @param {string} metin
 * @param {{ onBitti?: () => void }} [secenek]
 */
export function ozanSesiyleOku(metin, { onBitti } = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    const t = window.setTimeout(() => onBitti?.(), 8000);
    return () => window.clearTimeout(t);
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  let iptal = false;
  const cumleler = String(metin)
    .split(/(?<=[.!?…])\s+/)
    .map((c) => c.trim())
    .filter(Boolean);

  sesleriAl().then((sesler) => {
    if (iptal) return;
    const turkce = sesler.filter((v) => /^tr(-|_|$)/i.test(v.lang));
    const ses = turkce.sort((a, b) => ozanSesiPuani(b) - ozanSesiPuani(a))[0] ?? null;
    const erkek = ses ? ERKEK_SES_ADLARI.test(ses.name) : false;
    let i = 0;
    const sonraki = () => {
      if (iptal) return;
      if (i >= cumleler.length) {
        onBitti?.();
        return;
      }
      const u = new SpeechSynthesisUtterance(cumleler[i++]);
      u.lang = "tr-TR";
      if (ses) u.voice = ses;
      u.rate = 0.86; // ağır, hikâye anlatır gibi
      u.pitch = erkek ? 0.85 : 0.7; // kadın sesi seçilmek zorunda kalındıysa daha kalın
      u.onend = () => window.setTimeout(sonraki, 220); // cümle arası kısa nefes
      u.onerror = () => onBitti?.();
      synth.speak(u);
    };
    sonraki();
  });

  return () => {
    iptal = true;
    synth.cancel();
  };
}
