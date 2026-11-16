"use client";
import { useEffect, useRef, useState } from "react";

// =============================================================
// SEYRÜSEFER v3 — CANLI KÖY HARİTASI ATMOSFER & DERİNLİK KATMANI
// - GLSL Fragment Shader ile Oba kalesinin ARKA vadisinden kıvrılarak akan Göksu Irmağı
// - Sahte/ekstra harita ağacı eklemez (koy.webp'nin özgün çizimlerini korur)
// - Yalnızca taş patikalarda çok yavaş yürüyen, durup etrafı seyreden 2 küçük köylü
// - Ortak Y-derinlik sıralaması: zIndex = Math.round(y * 2) (binalarla tam uyumlu)
// - SSR / Hydration %100 uyumlu
// =============================================================

// ---------- TAŞ PATİKA WAYPOINT AĞI ----------
const PATIKA_DUGUMLERI = {
  m_kuzey: { x: 55.2, y: 46.6, durak: true },
  m_kb: { x: 49.4, y: 49.2, durak: false },
  m_kd: { x: 60.8, y: 49.4, durak: false },
  m_bati: { x: 47.4, y: 54.8, durak: true },
  m_dogu: { x: 63.0, y: 54.8, durak: true },
  m_gb: { x: 49.8, y: 60.2, durak: false },
  m_guney: { x: 55.2, y: 62.4, durak: true },
  m_gd: { x: 60.6, y: 60.2, durak: false },

  kb_1: { x: 45.2, y: 43.2, durak: true },
  kb_2: { x: 40.4, y: 36.2, durak: true },
  kb_3: { x: 33.6, y: 31.6, durak: false },
  orman_giris: { x: 26.4, y: 28.2, durak: true },

  kd_1: { x: 64.2, y: 44.5, durak: false },
  kd_2: { x: 66.8, y: 39.2, durak: true },
  kiraathane_onu: { x: 66.4, y: 51.2, durak: true },

  gb_1: { x: 44.2, y: 65.2, durak: true },
  gb_2: { x: 36.8, y: 72.6, durak: true },
  gb_3: { x: 31.4, y: 79.8, durak: true },

  g_1: { x: 55.0, y: 71.4, durak: true },
  g_2: { x: 52.8, y: 80.5, durak: true },

  gd_1: { x: 62.0, y: 66.8, durak: false },
  gd_2: { x: 71.8, y: 71.6, durak: true },
  gd_3: { x: 78.6, y: 77.8, durak: true },
};

const PATIKA_KOMSULUK = {
  m_kuzey: ["m_kb", "m_kd"],
  m_kb: ["m_kuzey", "m_bati", "kb_1"],
  m_kd: ["m_kuzey", "m_dogu", "kd_1", "kiraathane_onu"],
  m_bati: ["m_kb", "m_gb"],
  m_dogu: ["m_kd", "m_gd", "kiraathane_onu"],
  m_gb: ["m_bati", "m_guney", "gb_1"],
  m_guney: ["m_gb", "m_gd", "g_1"],
  m_gd: ["m_dogu", "m_guney", "gd_1"],
  kb_1: ["m_kb", "kb_2"],
  kb_2: ["kb_1", "kb_3"],
  kb_3: ["kb_2", "orman_giris"],
  orman_giris: ["kb_3"],
  kd_1: ["m_kd", "kd_2"],
  kd_2: ["kd_1"],
  kiraathane_onu: ["m_kd", "m_dogu"],
  gb_1: ["m_gb", "gb_2"],
  gb_2: ["gb_1", "gb_3"],
  gb_3: ["gb_2"],
  g_1: ["m_guney", "g_2"],
  g_2: ["g_1"],
  gd_1: ["m_gd", "gd_2"],
  gd_2: ["gd_1", "gd_3"],
  gd_3: ["gd_2"],
};

// Yalnızca 2 sakin köylü profili (küçük, yavaş yürüyen ve etrafta oyalanan)
const IKI_KOYLU_PROFILI = [
  {
    baslik: "takke",
    ustRenk: "#1e40af",
    yelekRenk: "#92400e",
    pantolon: "#44403c",
    ten: "#f1c29b",
    baslangicDugum: "m_kb",
    hedefDugum: "kb_1",
  },
  {
    baslik: "yazma_turkuaz",
    ustRenk: "#0f766e",
    yelekRenk: "#b45309",
    pantolon: "#57534e",
    ten: "#f5cba7",
    baslangicDugum: "m_gd",
    hedefDugum: "kiraathane_onu",
  },
];

function yazilimGlTespit(gl) {
  try {
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const param = dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || "");
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

// =============================================================
// 1. KUZEY GÖKSU IRMAĞI — GERÇEK GLSL WATER SHADER KATMANI
// Oba kalesinin taş surlarının ve çadırının ARKA vadisinden akar;
// kalenin üzerine tek bir piksel dahi taşmaz.
// =============================================================
const NEHIR_YUKSEKLIK_ORANI = 0.24;

const NEHIR_VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vUv.y = 1.0 - vUv.y;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const NEHIR_FRAGMENT = `
precision mediump float;
varying vec2 vUv;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = rot * p * 2.05 + vec2(1.3, 4.7);
    a *= 0.5;
  }
  return v;
}

// Su içi güneş kostik ağ dokusu (ilk ırmaktaki berrak parıltı hissi)
float caustic(vec2 p) {
  float n1 = noise(p);
  float n2 = noise(p * 1.65 + vec2(3.1, -2.4));
  float c = 1.0 - abs(n1 - n2) * 2.4;
  return clamp(c, 0.0, 1.0);
}

void main() {
  float mx = vUv.x;
  float my = vUv.y * 0.24;

  // 1. Oba kalesinin taş platformu + Kuzeybatı çam tepeleri maskesi:
  // koy.webp'de Oba kalesinin tepe köşesi (0.556, 0.002), sol sur (0.370, 0.165), sağ sur (0.745, 0.195).
  // Bu sur sınırlarının iç kısmında kalan pikseller Oba kalesinin arkasında kaldığı için tamamen gizlenir!
  float solSurX = 0.546 - my * 1.15;
  float sagSurX = 0.566 + my * 1.02;
  float solTaraf = 1.0 - smoothstep(solSurX - 0.008, solSurX + 0.002, mx);
  float sagTaraf = smoothstep(sagSurX - 0.002, sagSurX + 0.008, mx);
  float obaArkaMaske = max(solTaraf, sagTaraf);

  // Sol uçtaki sık çam ağaçlarının arasından doğal çıkış + sağ vadi sınırı
  float solOrmanMaske = smoothstep(0.24, 0.33, mx);
  float sagKenarMaske = smoothstep(1.0, 0.965, mx);
  float gorunurMaske = obaArkaMaske * solOrmanMaske * sagKenarMaske;

  if (gorunurMaske <= 0.002) {
    discard;
  }

  // 2. Doğal vadi menderesi:
  // Sol kanyonda y ~ 0.038, Oba'nın arkasından geçip sağdaki güneşli yeşil vadi oluğuna (y: 0.055 -> 0.138) süzülür
  float sagVadi = smoothstep(0.58, 0.98, mx);
  float merkezY = 0.038
    + 0.008 * sin(mx * 10.5 + 0.4)
    + 0.092 * sagVadi
    + 0.011 * sin(mx * 17.0 - 1.1) * sagVadi;

  float yariGenislik = 0.021 + 0.013 * sagVadi + 0.003 * sin(mx * 13.0 + 0.8);

  // Doğal kıyı girinti-çıkıntısı
  float kiyiDalga = (noise(vec2(mx * 42.0, my * 95.0)) - 0.5) * 0.0055;
  float d = abs(my - merkezY + kiyiDalga) / yariGenislik;

  if (d > 1.28) {
    discard;
  }

  // Islak çakıllı / çimenli doğal kıyı geçişi (1.0 .. 1.28)
  if (d > 1.0) {
    float kiyiT = 1.0 - smoothstep(1.0, 1.28, d);
    float tasDoku = noise(vec2(mx * 95.0, my * 220.0));
    vec3 islakTas = mix(vec3(0.27, 0.35, 0.19), vec3(0.42, 0.38, 0.26), tasDoku);
    gl_FragColor = vec4(islakTas, kiyiT * 0.68 * gorunurMaske);
    return;
  }

  // 3. Soldan sağa vadi eğimi boyunca akan berrak su katmanları
  float t = uTime * 0.62;
  float kesit = (my - merkezY) / yariGenislik; // -1 .. +1
  // Merkezde akıntı kıyıya göre biraz daha hızlıdır (gerçek nehir fiziği)
  float hizFarki = 1.0 - 0.32 * kesit * kesit;

  vec2 akisUv1 = vec2(mx * 20.0 - t * 1.45 * hizFarki, kesit * 3.2 + sin(mx * 12.0 - t * 0.9) * 0.22);
  vec2 akisUv2 = vec2(mx * 34.0 - t * 2.15 * hizFarki, kesit * 5.4 - cos(mx * 16.0 + t * 0.7) * 0.18);

  float dalga1 = fbm(akisUv1);
  float dalga2 = fbm(akisUv2);
  float dalga = dalga1 * 0.58 + dalga2 * 0.42;

  // Derin zümrüt-maviden turkuaz sığlığa berrak su gradyanı
  float derinlik = clamp(1.0 - d * d, 0.0, 1.0);
  vec3 sigRenk = vec3(0.32, 0.78, 0.77);
  vec3 ortaRenk = vec3(0.10, 0.56, 0.66);
  vec3 derinRenk = vec3(0.04, 0.33, 0.46);

  vec3 suRenk = mix(sigRenk, ortaRenk, smoothstep(0.05, 0.52, derinlik));
  suRenk = mix(suRenk, derinRenk, smoothstep(0.50, 0.96, derinlik));

  // Su altı kostik ışık ağları
  float kostik = caustic(akisUv1 * 1.35 + vec2(dalga2 * 0.6, -t * 0.35));
  suRenk += vec3(0.18, 0.40, 0.42) * pow(kostik, 2.2) * (0.45 + 0.55 * derinlik);

  // Güneş parıltıları (sağdaki güneşli vadide altın-turkuaz ışıltı artar)
  float gunesOrani = smoothstep(0.55, 0.95, mx);
  float parilti = smoothstep(0.67, 0.86, dalga) * (0.42 + 0.28 * gunesOrani);
  vec3 pariltiRenk = mix(vec3(0.80, 0.97, 0.98), vec3(0.99, 0.97, 0.82), gunesOrani * 0.65);
  suRenk += pariltiRenk * parilti;

  // Kıyı boyunca akan yumuşak beyaz su köpüğü
  float kopukKusak = smoothstep(0.74, 0.99, d);
  float kopukDoku = smoothstep(0.40, 0.74, fbm(vec2(mx * 52.0 - t * 2.2, kesit * 6.5)));
  float kopuk = kopukKusak * (0.38 + 0.62 * kopukDoku);
  suRenk = mix(suRenk, vec3(0.93, 0.99, 0.99), clamp(kopuk, 0.0, 0.86));

  float alpha = smoothstep(1.0, 0.88, d) * 0.94 * gorunurMaske;
  gl_FragColor = vec4(suRenk, alpha);
}
`;

function NehirShaderKatmani({ aktif }) {
  const canvasRef = useRef(null);
  const aktifRef = useRef(aktif);

  useEffect(() => {
    aktifRef.current = aktif;
  }, [aktif]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const testTuval = document.createElement("canvas");
    const webglDestekli = Boolean(
      testTuval.getContext("webgl") || testTuval.getContext("experimental-webgl")
    );

    const gl = webglDestekli
      ? canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: true }) ||
        canvas.getContext("experimental-webgl", { alpha: true, premultipliedAlpha: false })
      : null;

    // WebGL devre dışı olan cihazlar için Oba maskeli 2D Canvas akarsu yedeği
    if (!gl) {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = 960;
      canvas.height = 220;
      let timerId = 0;
      let iptal = false;
      const baslangic = performance.now();

      const nehirMerkezY = (mx) => {
        const u = Math.max(0, Math.min(1, (mx - 0.58) / 0.4));
        const sagVadi = u * u * (3 - 2 * u);
        const my =
          0.038 +
          0.008 * Math.sin(mx * 10.5 + 0.4) +
          0.092 * sagVadi +
          0.011 * Math.sin(mx * 17.0 - 1.1) * sagVadi;
        return my / NEHIR_YUKSEKLIK_ORANI;
      };

      const nehirYariH = (mx) => {
        const u = Math.max(0, Math.min(1, (mx - 0.58) / 0.4));
        const sagVadi = u * u * (3 - 2 * u);
        return (0.021 + 0.013 * sagVadi) / NEHIR_YUKSEKLIK_ORANI;
      };

      const ciz2D = () => {
        if (iptal) return;
        if (aktifRef.current) {
          const t = (performance.now() - baslangic) * 0.001;
          const W = canvas.width;
          const H = canvas.height;
          ctx.clearRect(0, 0, W, H);

          const parcaCiz = (xBas, xSon) => {
            ctx.save();
            ctx.beginPath();
            const adim = 40;
            for (let i = 0; i <= adim; i++) {
              const mx = xBas + ((xSon - xBas) * i) / adim;
              const py = (nehirMerkezY(mx) - nehirYariH(mx)) * H;
              if (i === 0) ctx.moveTo(mx * W, py);
              else ctx.lineTo(mx * W, py);
            }
            for (let i = adim; i >= 0; i--) {
              const mx = xBas + ((xSon - xBas) * i) / adim;
              const py = (nehirMerkezY(mx) + nehirYariH(mx)) * H;
              ctx.lineTo(mx * W, py);
            }
            ctx.closePath();

            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, "rgba(42, 168, 178, 0.88)");
            grad.addColorStop(0.5, "rgba(14, 105, 132, 0.93)");
            grad.addColorStop(1, "rgba(56, 189, 198, 0.88)");
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = "rgba(232, 252, 252, 0.65)";
            ctx.stroke();
            ctx.clip();

            for (let s = 0; s < 18; s++) {
              const faz = (s / 18 + t * 0.09) % 1;
              const mx = xBas + faz * (xSon - xBas);
              const sapma = ((s % 5) - 2) * 5.5;
              ctx.beginPath();
              ctx.strokeStyle = s % 2 === 0 ? "rgba(235, 253, 250, 0.48)" : "rgba(125, 228, 232, 0.38)";
              ctx.lineWidth = 2.2;
              ctx.lineCap = "round";
              for (let k = 0; k <= 5; k++) {
                const kmx = Math.min(xSon, mx + (k / 5) * 0.045);
                const ky = nehirMerkezY(kmx) * H + sapma + Math.sin(t * 3 + s + k) * 1.4;
                if (k === 0) ctx.moveTo(kmx * W, ky);
                else ctx.lineTo(kmx * W, ky);
              }
              ctx.stroke();
            }
            ctx.restore();
          };

          // Sol kanyon kolu (Oba sol surunun arkasına kadar) ve sağ güneşli vadi kolu
          parcaCiz(0.27, 0.49);
          parcaCiz(0.625, 0.99);
        }
        timerId = window.setTimeout(ciz2D, 50);
      };

      ciz2D();
      return () => {
        iptal = true;
        clearTimeout(timerId);
      };
    }

    const yazilimGl = yazilimGlTespit(gl);

    const derle = (tur, kaynak) => {
      const sh = gl.createShader(tur);
      if (!sh) return null;
      gl.shaderSource(sh, kaynak);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const vs = derle(gl.VERTEX_SHADER, NEHIR_VERTEX);
    const fs = derle(gl.FRAGMENT_SHADER, NEHIR_FRAGMENT);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(prog, "aPos");
    const uTime = gl.getUniformLocation(prog, "uTime");

    gl.useProgram(prog);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let rafId = 0;
    let timerId = 0;
    let iptal = false;
    const baslangic = performance.now();

    const ciz = () => {
      if (iptal) return;
      if (aktifRef.current) {
        const genislik = yazilimGl ? 768 : 1280;
        const yukseklik = yazilimGl ? 180 : 280;
        if (canvas.width !== genislik || canvas.height !== yukseklik) {
          canvas.width = genislik;
          canvas.height = yukseklik;
          gl.viewport(0, 0, genislik, yukseklik);
        }
        const gecenSn = (performance.now() - baslangic) * 0.001;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(uTime, gecenSn);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      if (yazilimGl) {
        timerId = window.setTimeout(ciz, 70);
      } else {
        rafId = requestAnimationFrame(ciz);
      }
    };

    ciz();

    return () => {
      iptal = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <div
      className="pointer-events-none absolute top-0 left-0 w-full overflow-hidden"
      style={{ height: `${NEHIR_YUKSEKLIK_ORANI * 100}%`, zIndex: 12 }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}

// =============================================================
// 2. KÜÇÜK KÖYLÜ SPRITE ÜRETİCİSİ (İstemci Belleğinde)
// =============================================================
function koyluKareleriUret(profil) {
  const kareler = [];
  for (let f = 0; f < 5; f++) {
    const c = document.createElement("canvas");
    c.width = 48;
    c.height = 64;
    const ctx = c.getContext("2d");
    if (!ctx) continue;

    const duruyor = f === 0;
    const faz = duruyor ? 0 : ((f - 1) / 4) * Math.PI * 2;
    const adim = duruyor ? 0 : Math.sin(faz) * 2.8;
    const yaylanma = duruyor ? 0 : -Math.abs(Math.sin(faz)) * 0.9;

    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Ayak altı yumuşak gölge
    ctx.fillStyle = "rgba(15, 23, 12, 0.30)";
    ctx.beginPath();
    ctx.ellipse(24, 58, 9, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arka bacak
    ctx.strokeStyle = "#231f20";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(23, 41 + yaylanma);
    ctx.lineTo(23 - adim, 55);
    ctx.stroke();
    ctx.strokeStyle = profil.pantolon;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(23, 41 + yaylanma);
    ctx.lineTo(23 - adim, 55);
    ctx.stroke();

    // Ön bacak
    ctx.strokeStyle = "#231f20";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(25, 41 + yaylanma);
    ctx.lineTo(25 + adim, 55);
    ctx.stroke();
    ctx.strokeStyle = profil.pantolon;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(25, 41 + yaylanma);
    ctx.lineTo(25 + adim, 55);
    ctx.stroke();

    // Gövde (mintan + yelek)
    ctx.fillStyle = profil.ustRenk;
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(17, 25 + yaylanma, 14, 18, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = profil.yelekRenk;
    ctx.fillRect(18.5, 26 + yaylanma, 4, 13);
    ctx.fillRect(25.5, 26 + yaylanma, 4, 13);

    // Ön kol
    const kolSalinim = duruyor ? 0 : -adim * 0.55;
    ctx.strokeStyle = profil.ustRenk;
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.moveTo(24, 28 + yaylanma);
    ctx.lineTo(24 + kolSalinim, 39 + yaylanma);
    ctx.stroke();

    // Baş
    ctx.fillStyle = profil.ten;
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(24, 17.5 + yaylanma, 6.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Göz
    ctx.fillStyle = "#1c1917";
    ctx.beginPath();
    ctx.arc(26.5, 17.5 + yaylanma, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Başlık
    if (profil.baslik === "takke") {
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.arc(24, 15.5 + yaylanma, 6.9, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = "#0d9488";
      ctx.beginPath();
      ctx.arc(24, 16.5 + yaylanma, 7.3, Math.PI * 0.82, Math.PI * 0.12);
      ctx.lineTo(21, 25 + yaylanma);
      ctx.lineTo(17.5, 22 + yaylanma);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    kareler.push(c.toDataURL("image/png"));
  }
  return kareler;
}

export default function CanliKoySahnesi({ katman = "koy", insanSayisi = 5, aktif = true }) {
  const [istemciHazir, setIstemciHazir] = useState(false);
  const [koyluKareleri, setKoyluKareleri] = useState([]);

  const koyluDomRef = useRef([]);
  const koyluImgRef = useRef([]);
  const partikulCanvasRef = useRef(null);

  useEffect(() => {
    const koyluler = IKI_KOYLU_PROFILI.map((p) => koyluKareleriUret(p));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKoyluKareleri(koyluler);
    setIstemciHazir(true);
  }, []);

  // 2 küçük köylünün yavaş yürüyüşü/oyalanması + hafif polen/yaprak esintisi
  useEffect(() => {
    if (!istemciHazir || katman !== "koy") return;

    const koyluSayisi = insanSayisi > 0 ? 2 : 0;

    const ajanlar = IKI_KOYLU_PROFILI.slice(0, koyluSayisi).map((p, idx) => {
      const bas = PATIKA_DUGUMLERI[p.baslangicDugum];
      return {
        mevcut: p.baslangicDugum,
        hedef: p.hedefDugum,
        onceki: null,
        ilerleme: 0,
        x: bas.x,
        y: bas.y,
        yon: idx === 0 ? -1 : 1,
        hiz: 0.78 + idx * 0.1,
        bekleme: idx === 1 ? 2.8 : 0,
        bakisSayaci: 2.2,
        adimZamani: idx * 1.3,
        sonKare: 0,
      };
    });

    const partikuller = Array.from({ length: 14 }, (_, i) => ({
      x: (i * 67) % 100,
      y: (i * 43) % 100,
      vx: 0.85 + (i % 4) * 0.3,
      vy: 0.3 + (i % 3) * 0.18,
      faz: i * 0.9,
      boy: i % 3 === 0 ? 3.0 : 2.0,
      yaprakMi: i % 3 === 0,
    }));

    let rafId = 0;
    let sonZaman = performance.now();

    const dongu = (simdi) => {
      const dt = Math.min(0.08, Math.max(0.001, (simdi - sonZaman) * 0.001));
      sonZaman = simdi;

      if (aktif) {
        const sn = simdi * 0.001;

        for (let i = 0; i < ajanlar.length; i++) {
          const k = ajanlar[i];
          const kutuEl = koyluDomRef.current[i];
          const imgEl = koyluImgRef.current[i];
          if (!kutuEl || !imgEl) continue;

          let kareIndeks = 0;

          if (k.bekleme > 0) {
            k.bekleme -= dt;
            k.bakisSayaci -= dt;
            if (k.bakisSayaci <= 0) {
              k.yon *= -1;
              k.bakisSayaci = 2.4 + Math.random() * 2.5;
            }
            kareIndeks = 0;
          } else {
            const dBas = PATIKA_DUGUMLERI[k.mevcut];
            const dHedef = PATIKA_DUGUMLERI[k.hedef];
            const dx = dHedef.x - dBas.x;
            const dy = dHedef.y - dBas.y;
            const mesafe = Math.max(0.1, Math.hypot(dx, dy));

            k.ilerleme += (k.hiz * dt) / mesafe;
            if (Math.abs(dx) > 0.05) {
              k.yon = dx >= 0 ? 1 : -1;
            }

            if (k.ilerleme >= 1) {
              k.x = dHedef.x;
              k.y = dHedef.y;
              const komsular = PATIKA_KOMSULUK[k.hedef] || ["m_kuzey"];
              const adaylar = komsular.length > 1 ? komsular.filter((n) => n !== k.mevcut) : komsular;
              const yeniHedef = adaylar[Math.floor(Math.random() * adaylar.length)];

              k.onceki = k.mevcut;
              k.mevcut = k.hedef;
              k.hedef = yeniHedef;
              k.ilerleme = 0;

              if (dHedef.durak || Math.random() < 0.7) {
                k.bekleme = 4.5 + Math.random() * 4.0;
                k.bakisSayaci = 1.8 + Math.random() * 2.0;
              }
              kareIndeks = 0;
            } else {
              k.x = dBas.x + dx * k.ilerleme;
              k.y = dBas.y + dy * k.ilerleme;
              k.adimZamani += dt * 2.2;
              kareIndeks = 1 + (Math.floor(k.adimZamani) % 4);
            }
          }

          kutuEl.style.left = `${k.x.toFixed(2)}%`;
          kutuEl.style.top = `${k.y.toFixed(2)}%`;
          kutuEl.style.zIndex = String(Math.round(k.y * 2));
          imgEl.style.transform = `scaleX(${k.yon})`;

          if (k.sonKare !== kareIndeks && koyluKareleri[i]?.[kareIndeks]) {
            k.sonKare = kareIndeks;
            imgEl.src = koyluKareleri[i][kareIndeks];
          }
        }

        const pCanvas = partikulCanvasRef.current;
        if (pCanvas) {
          const ctx = pCanvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, pCanvas.width, pCanvas.height);
            for (const p of partikuller) {
              p.x += p.vx * dt;
              p.y += p.vy * dt + Math.sin(sn * 1.4 + p.faz) * 0.04;
              if (p.x > 102) p.x = -2;
              if (p.y > 102) p.y = -2;

              const px = (p.x / 100) * pCanvas.width;
              const py = (p.y / 100) * pCanvas.height;

              ctx.save();
              ctx.translate(px, py);
              if (p.yaprakMi) {
                ctx.rotate(sn * 1.2 + p.faz);
                ctx.fillStyle = "rgba(132, 184, 78, 0.60)";
                ctx.beginPath();
                ctx.ellipse(0, 0, p.boy * 1.5, p.boy * 0.75, 0, 0, Math.PI * 2);
                ctx.fill();
              } else {
                ctx.fillStyle = "rgba(253, 230, 138, 0.50)";
                ctx.beginPath();
                ctx.arc(0, 0, p.boy, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.restore();
            }
          }
        }
      }

      rafId = requestAnimationFrame(dongu);
    };

    rafId = requestAnimationFrame(dongu);
    return () => cancelAnimationFrame(rafId);
  }, [istemciHazir, katman, insanSayisi, aktif, koyluKareleri]);

  if (!istemciHazir || katman !== "koy") {
    return <div className="pointer-events-none absolute inset-0" />;
  }

  const gosterilecekKoyluSayisi = insanSayisi > 0 ? 2 : 0;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 1. Oba'nın Arka Vadisinden Akan Berrak Göksu Irmağı (GLSL Shader) */}
      <NehirShaderKatmani aktif={aktif} />

      {/* 2. Sadece 2 Küçük Köylü (Taş Patikalarda Çok Yavaş Yürür, Durup Etrafı Seyreder, Y-Derinlikli) */}
      {IKI_KOYLU_PROFILI.slice(0, gosterilecekKoyluSayisi).map((p, idx) => {
        const bas = PATIKA_DUGUMLERI[p.baslangicDugum];
        return (
          <div
            key={`koylu_${idx}`}
            ref={(el) => {
              koyluDomRef.current[idx] = el;
            }}
            className="pointer-events-none absolute"
            style={{
              left: `${bas.x}%`,
              top: `${bas.y}%`,
              width: "1.45%",
              minWidth: "18px",
              maxWidth: "26px",
              transform: "translate(-50%, -92%)",
              zIndex: Math.round(bas.y * 2),
            }}
          >
            {koyluKareleri[idx]?.[0] && (
              <img
                ref={(el) => {
                  koyluImgRef.current[idx] = el;
                }}
                src={koyluKareleri[idx][0]}
                alt=""
                draggable={false}
                className="block h-auto w-full select-none"
              />
            )}
          </div>
        );
      })}

      {/* 3. Hafif Yaprak & Polen Esintisi Katmanı */}
      <canvas
        ref={partikulCanvasRef}
        width={680}
        height={366}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ zIndex: 185 }}
      />
    </div>
  );
}
