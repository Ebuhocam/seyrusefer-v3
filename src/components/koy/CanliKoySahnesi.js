"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { grafikProfili } from "./grafikProfili";
import { hafifAbone, hafifMi } from "@/lib/hafifMod";

// Telefonlarda efekt katmanları daha seyrek çizilir (yüksek: x1, orta: x1.6, düşük: x2.5)
const fxOlcek = () => {
  const ad = grafikProfili().ad;
  return ad === "yuksek" ? 1 : ad === "orta" ? 1.6 : 2.5;
};

// =============================================================
// SEYRÜSEFER v3 — CANLI KÖY KATMANI
//  * Gün ışığı: gerçek yerel saat (Europe/Istanbul) -> sabah altını, öğle, gün batımı,
//    mehtaplı gece (lamba/ateş parıltıları + ateş böcekleri). Demo: ?saat=21 veya window.__seyirSaat
//  * Harita dokusundan türetilen su maskesi ile resmin kendi dere/kanalı akar (karaya taşmaz)
//  * Ağaç tacı salınımı, bulut gölgeleri, kuşlar, kelebekler, polen/yaprak, kamp ateşi
//  * Patikalarda yürüyen küçük köylüler (y-derinlik sıralı)
// Performans: tek bir paylaşılan requestAnimationFrame döngüsü; sekme gizliyken/aktif=false iken durur;
// efektler düşük çözünürlüklü tuvaller; azaltılmış hareket tercihinde animasyon döngüsü yoktur.
// =============================================================

// ---------- Koordinat yardımcıları ----------
// Harita <img> object-cover ile 1710x920 kutuya oturur; koy.webp 1376x768 -> dikeyde hafif kırpılır.
const IMG_W = 1376;
const IMG_H = 768;
const KONT_ORAN = 1710 / 920;
const GORSEL_ORAN = IMG_W / IMG_H;
const DIKEY_GORUNUR = GORSEL_ORAN / KONT_ORAN; // görüntünün dikeyde görünen oranı (~0.964)
const gx = (ix) => (ix / IMG_W) * 100; // görsel pikseli -> kutu %
const gy = (iy) => ((iy / IMG_H - 0.5) / DIKEY_GORUNUR + 0.5) * 100;

const ARK_CANLI = false;
const FX_W = 960;
const FX_H = Math.round((FX_W * 920) / 1710);

const lerp = (a, b, u) => a + (b - a) * u;
const kenet = (v, a, b) => Math.min(b, Math.max(a, v));

// ---------- Paylaşılan tek animasyon döngüsü ----------
const ticker = {
  aboneler: new Set(),
  raf: 0,
  son: 0,
  aktif: true,
  dinliyor: false,
};

function tickerDongu(ts) {
  ticker.raf = requestAnimationFrame(tickerDongu);
  const dt = Math.min(0.1, Math.max(0.0005, (ts - ticker.son) / 1000));
  ticker.son = ts;
  const t = ts / 1000;
  for (const fn of ticker.aboneler) fn(t, dt);
}

function tickerGuncelle() {
  const calismali = ticker.aboneler.size > 0 && ticker.aktif && !document.hidden;
  if (calismali && !ticker.raf) {
    ticker.son = performance.now();
    ticker.raf = requestAnimationFrame(tickerDongu);
  } else if (!calismali && ticker.raf) {
    cancelAnimationFrame(ticker.raf);
    ticker.raf = 0;
  }
}

function tickerGorunurluk() {
  tickerGuncelle();
}

function tickerAbone(fn) {
  ticker.aboneler.add(fn);
  if (!ticker.dinliyor) {
    ticker.dinliyor = true;
    document.addEventListener("visibilitychange", tickerGorunurluk);
  }
  tickerGuncelle();
  return () => {
    ticker.aboneler.delete(fn);
    if (ticker.aboneler.size === 0 && ticker.dinliyor) {
      ticker.dinliyor = false;
      document.removeEventListener("visibilitychange", tickerGorunurluk);
    }
    tickerGuncelle();
  };
}

function tickerAktifAyarla(v) {
  ticker.aktif = v;
  tickerGuncelle();
}

// ---------- prefers-reduced-motion ----------
// Hafif mod da (akıllı tahta / zayıf cihaz) "az hareket" sayılır: efekt döngüleri hiç çalışmaz
function azHareketAbone(cb) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  const hafifBirak = hafifAbone(cb);
  return () => {
    mq.removeEventListener("change", cb);
    hafifBirak();
  };
}
const azHareketAl = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || hafifMi();
const azHareketSunucu = () => false;
const bosAbone = () => () => {};

// ---------- Saat ve gün ışığı ----------
let saatBicimleyici = null;
function saatOku() {
  try {
    const w = window.__seyirSaat;
    if (w !== undefined && w !== null && w !== "" && Number.isFinite(Number(w))) {
      return ((Number(w) % 24) + 24) % 24;
    }
    const q = new URLSearchParams(window.location.search).get("saat");
    if (q) {
      const v = parseFloat(q.replace(",", "."));
      if (Number.isFinite(v)) return ((v % 24) + 24) % 24;
    }
  } catch {
    /* yoksay */
  }
  try {
    if (!saatBicimleyici) {
      saatBicimleyici = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Istanbul",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      });
    }
    const p = {};
    for (const x of saatBicimleyici.formatToParts(new Date())) p[x.type] = x.value;
    return (Number(p.hour) % 24) + Number(p.minute) / 60 + Number(p.second) / 3600;
  } catch {
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  }
}

// mul: çarpma tonu, sic: sıcak/soğuk yumuşak ışık rengi, sa: onun gücü,
// gece: 0..1 gece oranı, lamba: lamba/ateş parıltısı, gx: güneş/ay ışığı yatay konumu
const ANAHTARLAR = [
  { h: 0, mul: [152, 164, 228], sic: [120, 145, 255], sa: 0.3, gece: 1, lamba: 1, gx: 0.18 },
  { h: 5, mul: [152, 164, 228], sic: [120, 145, 255], sa: 0.3, gece: 1, lamba: 1, gx: 0.18 },
  { h: 6.3, mul: [206, 188, 218], sic: [255, 172, 150], sa: 0.26, gece: 0.5, lamba: 0.6, gx: 0.92 },
  { h: 7.6, mul: [255, 232, 184], sic: [255, 204, 108], sa: 0.38, gece: 0, lamba: 0.08, gx: 0.88 },
  { h: 10, mul: [255, 250, 238], sic: [255, 238, 176], sa: 0.12, gece: 0, lamba: 0, gx: 0.7 },
  { h: 12.5, mul: [255, 255, 255], sic: [255, 250, 225], sa: 0.0, gece: 0, lamba: 0, gx: 0.5 },
  { h: 15.5, mul: [255, 252, 242], sic: [255, 238, 180], sa: 0.07, gece: 0, lamba: 0, gx: 0.34 },
  { h: 17.5, mul: [255, 228, 180], sic: [255, 192, 104], sa: 0.3, gece: 0, lamba: 0.05, gx: 0.18 },
  { h: 19, mul: [255, 186, 142], sic: [255, 140, 84], sa: 0.36, gece: 0.15, lamba: 0.3, gx: 0.08 },
  { h: 20, mul: [216, 162, 182], sic: [255, 124, 118], sa: 0.24, gece: 0.5, lamba: 0.7, gx: 0.1 },
  { h: 21.3, mul: [164, 164, 224], sic: [124, 146, 255], sa: 0.28, gece: 0.92, lamba: 1, gx: 0.16 },
  { h: 24, mul: [152, 164, 228], sic: [120, 145, 255], sa: 0.3, gece: 1, lamba: 1, gx: 0.18 },
];

function isikHesapla(h) {
  let i = 0;
  while (i < ANAHTARLAR.length - 2 && h >= ANAHTARLAR[i + 1].h) i++;
  const a = ANAHTARLAR[i];
  const b = ANAHTARLAR[i + 1];
  let u = kenet((h - a.h) / (b.h - a.h), 0, 1);
  u = u * u * (3 - 2 * u);
  const mix3 = (p, q) => [lerp(p[0], q[0], u), lerp(p[1], q[1], u), lerp(p[2], q[2], u)];
  return {
    saat: h,
    mul: mix3(a.mul, b.mul),
    sic: mix3(a.sic, b.sic),
    sa: lerp(a.sa, b.sa, u),
    gece: lerp(a.gece, b.gece, u),
    lamba: lerp(a.lamba, b.lamba, u),
    gx: lerp(a.gx, b.gx, u),
  };
}

const rgb = (c) => `${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])}`;

// ---------- TAŞ PATİKA WAYPOINT AĞI (kutu %) ----------
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

const KOYLU_PROFILI = [
  { baslik: "takke", ustRenk: "#1e40af", yelekRenk: "#92400e", pantolon: "#44403c", ten: "#f1c29b", baslangic: "m_kb", hedef: "kb_1" },
  { baslik: "yazma", ustRenk: "#0f766e", yelekRenk: "#b45309", pantolon: "#57534e", ten: "#f5cba7", baslangic: "m_gd", hedef: "m_dogu" },
  { baslik: "kece", ustRenk: "#9a3412", yelekRenk: "#374151", pantolon: "#3f3f46", ten: "#e8b88a", baslangic: "g_1", hedef: "m_guney" },
];

// koy.webp'deki mevcut ağaç taçları (görsel pikseli: merkez x, y, yarıçap rx, ry) -> kutu % olarak çevrilir
const AGAC_TACLARI = [
  [175, 100, 40, 46], [345, 68, 48, 38], [410, 95, 26, 48], [255, 68, 24, 48], [118, 118, 28, 50],
  [40, 100, 26, 52], [62, 225, 28, 55], [118, 242, 24, 46], [28, 305, 34, 42], [348, 300, 40, 40],
  [400, 400, 28, 54], [1072, 420, 40, 46], [1330, 285, 46, 44], [1345, 385, 36, 26], [1212, 452, 32, 22],
  [30, 545, 46, 50], [135, 590, 48, 48], [92, 652, 38, 38], [32, 690, 28, 52], [218, 722, 26, 44],
  [262, 552, 24, 44], [455, 685, 28, 56], [808, 688, 28, 52], [868, 728, 44, 36],
].map(([x, y, rx, ry], i) => ({
  x: gx(x),
  y: gy(y),
  rx: (rx / IMG_W) * 100,
  ry: (ry / IMG_H / DIKEY_GORUNUR) * 100,
  faz: i * 1.37,
}));

// Resmin boyalı dere + sulama kanalı çevresi (görsel pikseli) -> kutu uv
const SU_KUTUSU = [gx(160) / 100, gy(380) / 100, gx(450) / 100, gy(565) / 100];

function yazilimGlTespit(gl) {
  try {
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const gpu = String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || "");
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

// =============================================================
// 1. SU + AĞAÇ SALINIMI (tek WebGL tuvali, harita dokusundan beslenir)
// Su maskesi doğrudan resmin mavi piksellerinden çıkar: boyalı dere/kanalla birebir
// örtüşür ve karaya taşamaz. Ağaçlar: yalnızca taç elipsi içindeki yaprak pikselleri esner.
// =============================================================
const GL_VERTEX = `
attribute vec2 aPos;
uniform vec4 uRect;
varying vec2 vUv;
void main() {
  vUv = mix(uRect.xy, uRect.zw, aPos);
  gl_Position = vec4(vUv.x * 2.0 - 1.0, 1.0 - vUv.y * 2.0, 0.0, 1.0);
}
`;

const GL_FRAGMENT = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uMap;
uniform float uTime;
uniform vec2 uScale;     // kutu uv -> görsel uv kırpma ölçeği
uniform float uMode;     // 0: su, 1: ağaç
uniform vec4 uTree;      // cx, cy, rx, ry (kutu uv)
uniform float uPhase;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec2 imgUv(vec2 uv) { return vec2(0.5) + (uv - vec2(0.5)) * uScale; }

void main() {
  vec2 iuv = imgUv(vUv);
  vec4 c = texture2D(uMap, iuv);

  if (uMode < 0.5) {
    // --- SU: resimdeki mavi/turkuaz pikseller ---
    float wm = smoothstep(0.05, 0.12, c.b - c.r) * smoothstep(-0.17, -0.06, c.b - c.g);
    if (wm < 0.02) discard;
    vec2 p = iuv * vec2(1376.0, 768.0);
    vec2 d = normalize(vec2(-0.86, 0.5));          // akış: yukarı-sağdan aşağı-sola
    vec2 q = vec2(dot(p, d), dot(p, vec2(-d.y, d.x)));
    float t = uTime;
    float f1 = noise(vec2((q.x - t * 16.0) * 0.045, q.y * 0.16));
    float f2 = noise(vec2((q.x - t * 27.0) * 0.095 + 7.0, q.y * 0.28));
    float seritler = smoothstep(0.60, 0.86, f1 * 0.58 + f2 * 0.52);
    vec3 col = c.rgb;
    col *= 0.94 + 0.10 * sin((q.x - t * 20.0) * 0.16 + q.y * 0.5);   // yumuşak dalga gölgesi
    col += vec3(0.50, 0.80, 0.86) * seritler * 0.50;
    // ışıltı: küçük hücrelerde kısa parlamalar
    vec2 cell = floor(p / 2.6);
    float h = hash(cell);
    float tw = pow(max(0.0, sin(t * (2.2 + h * 3.4) + h * 40.0)), 26.0);
    col += vec3(1.0, 0.98, 0.88) * step(0.90, h) * tw * 1.1;
    gl_FragColor = vec4(col * wm, wm);
    return;
  }

  // --- AĞAÇ TACI SALINIMI ---
  vec2 e = (vUv - uTree.xy) / uTree.zw;
  float r = length(e);
  float elips = 1.0 - smoothstep(0.72, 1.02, r);
  if (elips <= 0.0) discard;
  float yaprak = smoothstep(0.0, 0.04, c.g - c.r) * smoothstep(0.0, 0.05, c.g - c.b * 0.9);
  float a = elips * yaprak;
  if (a < 0.02) discard;
  float yukseklik = clamp(0.5 - e.y * 0.5, 0.0, 1.0);     // tepe 1, alt 0
  float ruzgar = 0.55 + 0.45 * sin(uTime * 0.45 + uPhase);
  float s = sin(uTime * 1.7 + uPhase + vUv.y * 34.0) * 0.6 + sin(uTime * 3.1 + uPhase * 1.7 + vUv.x * 46.0) * 0.4;
  vec2 kayma = vec2(s * 0.0034 * ruzgar, cos(uTime * 2.2 + uPhase) * 0.0011) * yukseklik;
  vec3 col = texture2D(uMap, clamp(iuv - kayma * uScale, 0.001, 0.999)).rgb;
  col += vec3(0.05, 0.06, 0.01) * max(0.0, s) * yukseklik * 0.5;
  gl_FragColor = vec4(col * a, a);
}
`;

function AgacSuKatmani({ hareketsiz }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let iptal = false;
    let kaynak = null;
    let abone = null;
    let yazilim = false;
    let birikim = 0;

    const gorsel = new Image();

    const derle = (gl, tur, src) => {
      const sh = gl.createShader(tur);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const sok = () => {
      if (!kaynak) return;
      const { gl } = kaynak;
      try {
        gl.deleteTexture(kaynak.tex);
        gl.deleteBuffer(kaynak.buf);
        gl.deleteProgram(kaynak.prog);
        gl.deleteShader(kaynak.vs);
        gl.deleteShader(kaynak.fs);
      } catch {
        /* bağlam zaten kayıp */
      }
      kaynak = null;
    };

    const kur = () => {
      const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
      if (!gl) return false;
      yazilim = yazilimGlTespit(gl);
      const vs = derle(gl, gl.VERTEX_SHADER, GL_VERTEX);
      const fs = derle(gl, gl.FRAGMENT_SHADER, GL_FRAGMENT);
      if (!vs || !fs) return false;
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);

      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, gorsel);

      gl.useProgram(prog);
      const aPos = gl.getAttribLocation(prog, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      const w = yazilim || grafikProfili().ad !== "yuksek" ? 688 : IMG_W;
      const h = Math.round((w * 920) / 1710);
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);

      const sx = KONT_ORAN >= GORSEL_ORAN ? 1 : KONT_ORAN / GORSEL_ORAN;
      const sy = KONT_ORAN >= GORSEL_ORAN ? GORSEL_ORAN / KONT_ORAN : 1;

      kaynak = {
        gl, vs, fs, prog, buf, tex,
        uRect: gl.getUniformLocation(prog, "uRect"),
        uTime: gl.getUniformLocation(prog, "uTime"),
        uMode: gl.getUniformLocation(prog, "uMode"),
        uTree: gl.getUniformLocation(prog, "uTree"),
        uPhase: gl.getUniformLocation(prog, "uPhase"),
      };
      gl.uniform1i(gl.getUniformLocation(prog, "uMap"), 0);
      gl.uniform2f(gl.getUniformLocation(prog, "uScale"), sx, sy);
      return true;
    };

    const ciz = (t) => {
      if (!kaynak) return;
      const { gl } = kaynak;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(kaynak.uTime, t);

      // Tarla yanındaki boyalı sulama arkı artık canlandırılmaz; akan su Vadi Deresi'ndedir
      if (ARK_CANLI) {
        gl.uniform1f(kaynak.uMode, 0);
        gl.uniform4f(kaynak.uRect, SU_KUTUSU[0], SU_KUTUSU[1], SU_KUTUSU[2], SU_KUTUSU[3]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      gl.uniform1f(kaynak.uMode, 1);
      for (const a of AGAC_TACLARI) {
        const cx = a.x / 100;
        const cy = a.y / 100;
        const rx = a.rx / 100;
        const ry = a.ry / 100;
        gl.uniform4f(kaynak.uRect, cx - rx * 1.05, cy - ry * 1.05, cx + rx * 1.05, cy + ry * 1.05);
        gl.uniform4f(kaynak.uTree, cx, cy, rx, ry);
        gl.uniform1f(kaynak.uPhase, a.faz);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    };

    const abonelik = () => {
      if (abone || hareketsiz) return;
      const aralik = (yazilim ? 1 / 10 : 1 / 30) * fxOlcek();
      abone = tickerAbone((t, dt) => {
        birikim += dt;
        if (birikim < aralik) return;
        birikim = 0;
        ciz(t);
      });
    };

    const kayip = (e) => {
      e.preventDefault();
      if (abone) {
        abone();
        abone = null;
      }
      kaynak = null;
      canvas.style.visibility = "hidden";
    };
    const geri = () => {
      if (iptal) return;
      if (kur()) {
        canvas.style.visibility = "visible";
        ciz(0);
        abonelik();
      }
    };

    canvas.addEventListener("webglcontextlost", kayip);
    canvas.addEventListener("webglcontextrestored", geri);

    gorsel.onload = () => {
      if (iptal) return;
      if (!kur()) {
        canvas.style.visibility = "hidden"; // WebGL yok: boyalı harita olduğu gibi kalır
        return;
      }
      ciz(0);
      abonelik();
    };
    gorsel.src = "/assets/harita/koy.webp";

    return () => {
      iptal = true;
      gorsel.onload = null;
      canvas.removeEventListener("webglcontextlost", kayip);
      canvas.removeEventListener("webglcontextrestored", geri);
      if (abone) abone();
      sok();
    };
  }, [hareketsiz]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 block h-full w-full"
      style={{ zIndex: 8 }}
    />
  );
}

// =============================================================
// 2. BULUT GÖLGELERİ (düşük çözünürlüklü, ağır akan yumuşak lekeler)
// =============================================================
const GOLGE_W = 480;
const GOLGE_H = Math.round((GOLGE_W * 920) / 1710);

function bulutSpriti() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const lekeler = [
    [128, 66, 84, 44], [78, 74, 56, 34], [180, 72, 62, 36], [124, 44, 52, 28], [210, 84, 40, 24],
  ];
  for (const [x, y, rx, ry] of lekeler) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx / ry, 1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
    g.addColorStop(0, "rgba(20,48,60,0.55)");
    g.addColorStop(0.6, "rgba(20,48,60,0.28)");
    g.addColorStop(1, "rgba(20,48,60,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, ry, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  return c;
}

const BULUTLAR = [
  { y: 0.22, boy: 0.62, hiz: 0.0105, faz: 0.0 },
  { y: 0.58, boy: 0.5, hiz: 0.0078, faz: 0.46 },
  { y: 0.82, boy: 0.7, hiz: 0.0125, faz: 0.78 },
];

// =============================================================
// VADİ DERESİ — sağ üstteki ormandan doğup yamaçtaki yarıktan çağlayarak inen,
// alttaki kuru dere yatağını izleyip maden kayalıklarının ardında kaybolan dere.
// Haritanın çizim üslubunda (koyu kontur + açık su + köpük) 2D tuvale çizilir.
// Noktalar koy.webp piksel koordinatlarıdır.
// =============================================================
const DERE_NOKTALARI = [
  [1252, 256], [1246, 284], [1240, 318], [1222, 344], [1196, 370], [1170, 398],
  [1152, 424], [1150, 448], [1155, 470], [1160, 488],
];
const GOLET = { x: 1162, y: 500, rx: 21, ry: 9 };
const DERE_W = 1376;
const DERE_H = Math.round((DERE_W * 920) / 1710);

function dereNoktasi([ix, iy]) {
  return [(gx(ix) / 100) * DERE_W, (gy(iy) / 100) * DERE_H];
}

/** Noktalar arasından yumuşak eğri geçirir; her parça için kalınlık oranı (0 kaynak → 1 ağız) verir */
function dereParcalari() {
  const p = DERE_NOKTALARI.map(dereNoktasi);
  const parcalar = [];
  for (let i = 0; i < p.length - 1; i++) {
    const a = i === 0 ? p[0] : [(p[i - 1][0] + p[i][0]) / 2, (p[i - 1][1] + p[i][1]) / 2];
    const b = [(p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2];
    const son = i === p.length - 2 ? p[i + 1] : b;
    parcalar.push({ a, k: p[i], b: son, u: i / (p.length - 2) });
  }
  return parcalar;
}

function dereYolu(ctx, parcalar) {
  ctx.beginPath();
  ctx.moveTo(parcalar[0].a[0], parcalar[0].a[1]);
  for (const pr of parcalar) ctx.quadraticCurveTo(pr.k[0], pr.k[1], pr.b[0], pr.b[1]);
}

/** Eğriyi sık noktalara böler: [{x, y, u, nx, ny}] (u: kaynak 0 → ağız 1, n: sağ normal) */
function dereOrnekleri(parcalar, adim = 10) {
  const out = [];
  parcalar.forEach((pr, i) => {
    for (let j = 0; j < adim; j++) {
      const t = j / adim;
      const x = (1 - t) * (1 - t) * pr.a[0] + 2 * (1 - t) * t * pr.k[0] + t * t * pr.b[0];
      const y = (1 - t) * (1 - t) * pr.a[1] + 2 * (1 - t) * t * pr.k[1] + t * t * pr.b[1];
      out.push({ x, y, u: (i + t) / parcalar.length });
    }
  });
  const sonPr = parcalar[parcalar.length - 1];
  out.push({ x: sonPr.b[0], y: sonPr.b[1], u: 1 });
  for (let i = 0; i < out.length; i++) {
    const a = out[Math.max(0, i - 1)];
    const b = out[Math.min(out.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    out[i].nx = -dy / l;
    out[i].ny = dx / l;
  }
  return out;
}

/** Kaynakta ince, ağızda geniş; kıyı hafifçe dalgalı */
const dereGenisligi = (u, i) => (3.5 + u * 11) * (1 + 0.16 * Math.sin(i * 0.9) + 0.08 * Math.sin(i * 2.3));

function dereGovdesiCiz() {
  const c = document.createElement("canvas");
  c.width = DERE_W;
  c.height = DERE_H;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const nk = dereOrnekleri(dereParcalari());
  const olcek = DERE_W / 1376;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const serit = (renk, ek, kayma = 0) => {
    ctx.strokeStyle = renk;
    for (let i = 0; i < nk.length - 1; i++) {
      const a = nk[i];
      const b = nk[i + 1];
      const w = dereGenisligi(a.u, i);
      ctx.lineWidth = Math.max(0.8, (w + ek) * olcek);
      ctx.beginPath();
      ctx.moveTo(a.x + a.nx * kayma * w, a.y + a.ny * kayma * w);
      ctx.lineTo(b.x + b.nx * kayma * w, b.y + b.ny * kayma * w);
      ctx.stroke();
    }
  };
  serit("rgba(122, 86, 42, 0.55)", 6, 0.18); // ıslak toprak kıyı (alt yanda)
  serit("#2f2a1f", 2.2); // mürekkep konturu
  serit("#5e9a98", 0); // kıyıya yakın koyu su şeridi
  serit("#84c6b8", -2.6, -0.12); // açık su
  serit("#a9dccf", -6.5, -0.2); // akıntı ortası
  // Kıyı çakılları (sabit dizilim)
  for (let i = 4; i < nk.length - 6; i += 9) {
    const a = nk[i];
    const w = dereGenisligi(a.u, i) * olcek;
    const yon = (i * 5) % 3 ? 1 : -1;
    const x = a.x + a.nx * yon * (w * 0.5 + 3.5);
    const y = a.y + a.ny * yon * (w * 0.5 + 3.5);
    const r = 1.6 + ((i * 7) % 5) * 0.35;
    ctx.fillStyle = "#b9b2a0";
    ctx.strokeStyle = "#2f2a1f";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.3, r, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // Gölet: dere, yatağın dibinde küçük bir gölete dökülür
  const [gx0, gy0] = dereNoktasi([GOLET.x, GOLET.y]);
  const grx = GOLET.rx * olcek * 1.24;
  const gry = GOLET.ry * olcek * 1.24;
  ctx.fillStyle = "rgba(122, 86, 42, 0.5)";
  ctx.beginPath();
  ctx.ellipse(gx0, gy0 + 1.5, grx + 4, gry + 3, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5e9a98";
  ctx.strokeStyle = "#2f2a1f";
  ctx.lineWidth = 2.2 * olcek;
  ctx.beginPath();
  ctx.ellipse(gx0, gy0, grx, gry, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#84c6b8";
  ctx.beginPath();
  ctx.ellipse(gx0 - grx * 0.12, gy0 - gry * 0.18, grx * 0.78, gry * 0.62, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // Kıyıda birkaç saz
  ctx.strokeStyle = "#3f6b2a";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) {
    const sx = gx0 + grx * (0.55 + i * 0.09);
    const sy = gy0 + gry * (0.2 - i * 0.12);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + 1.5, sy - 5, sx + 0.5 + (i % 2) * 2, sy - 9 - (i % 3) * 2);
    ctx.stroke();
  }
  // Çağlayan: yarıktaki basamakta köpük
  const [cx, cy] = dereNoktasi([1240, 318]);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.strokeStyle = "#2f2a1f";
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(cx - 5 + i * 2.6, cy + 5 + (i % 2) * 1.6, 2.6, 1.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  return c;
}

function VadiDeresiKatmani({ isikRef, hareketsiz }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const govde = ctx ? dereGovdesiCiz() : null;
    if (!canvas || !ctx || !govde) return undefined;
    canvas.width = DERE_W;
    canvas.height = DERE_H;
    const parcalar = dereParcalari();
    const nk = dereOrnekleri(parcalar);
    const [cx, cy] = dereNoktasi([1240, 318]);
    let birikim = 0;

    const ciz = (t) => {
      ctx.clearRect(0, 0, DERE_W, DERE_H);
      ctx.drawImage(govde, 0, 0);
      const gece = isikRef.current?.gece ?? 0;
      ctx.lineCap = "round";
      // Akan su çizgileri: boyalı arktaki kısa beyaz çizgiler gibi, akış yönünde kayar
      const n = nk.length;
      const parlaklik = 0.8 - gece * 0.4;
      ctx.strokeStyle = `rgba(240, 252, 250, ${parlaklik})`;
      ctx.lineWidth = 1.3;
      for (let s = 0; s < 9; s++) {
        const ilerleme = ((t * 0.09 + s / 9) % 1) * (n - 4);
        const i = Math.floor(ilerleme);
        const a = nk[i];
        const b = nk[i + 2];
        const w = dereGenisligi(a.u, i) * 0.22 * (s % 2 ? 1 : -1);
        const sol = Math.min(1, ilerleme / 6, (n - 4 - ilerleme) / 6);
        ctx.globalAlpha = Math.max(0, sol);
        ctx.beginPath();
        ctx.moveTo(a.x + a.nx * w, a.y + a.ny * w);
        ctx.lineTo(b.x + b.nx * w, b.y + b.ny * w);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Gölette genişleyen halkalar
      const [gx0, gy0] = dereNoktasi([GOLET.x, GOLET.y]);
      for (let r = 0; r < 2; r++) {
        const f = (t * 0.35 + r * 0.5) % 1;
        ctx.strokeStyle = `rgba(240, 252, 250, ${(1 - f) * (0.6 - gece * 0.3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(gx0 - 6, gy0 - 1, 3 + f * 12, 1.4 + f * 5, -0.1, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Çağlayanda kabaran köpük
      const k = 0.5 + 0.5 * Math.sin(t * 6);
      ctx.fillStyle = `rgba(255,255,255,${0.35 + k * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 7, 7 + k * 2, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Gece ay ışığı parıltısı
      if (gece > 0.3) {
        ctx.fillStyle = `rgba(210, 225, 255, ${(gece - 0.3) * 0.5})`;
        for (let i = 0; i < parcalar.length; i += 2) {
          const pr = parcalar[i];
          const s = Math.max(0, Math.sin(t * 2.3 + i * 1.7));
          ctx.beginPath();
          ctx.arc(pr.k[0], pr.k[1], 1.2 + s * 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    if (hareketsiz) {
      ciz(0);
      const id = window.setInterval(() => ciz(0), 5000);
      return () => window.clearInterval(id);
    }
    return tickerAbone((t, dt) => {
      birikim += dt;
      if (birikim < (1 / 20) * fxOlcek()) return;
      birikim = 0;
      ciz(t);
    });
  }, [isikRef, hareketsiz]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 block h-full w-full"
      style={{ zIndex: 6 }}
    />
  );
}

function BulutGolgeKatmani({ isikRef, hareketsiz }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const sprite = ctx ? bulutSpriti() : null;
    if (!canvas || !ctx || !sprite) return undefined;
    canvas.width = GOLGE_W;
    canvas.height = GOLGE_H;
    let birikim = 0;

    const ciz = (t) => {
      const p = isikRef.current;
      ctx.clearRect(0, 0, GOLGE_W, GOLGE_H);
      const yogunluk = p ? (1 - p.gece) * 0.2 : 0.18;
      if (yogunluk < 0.01) return;
      ctx.globalAlpha = yogunluk;
      for (const b of BULUTLAR) {
        const w = GOLGE_W * b.boy;
        const h = w * 0.5;
        const dongu = GOLGE_W + w;
        const x = ((t * b.hiz * GOLGE_W + b.faz * dongu) % dongu) - w;
        ctx.drawImage(sprite, x, GOLGE_H * b.y - h / 2, w, h);
      }
      ctx.globalAlpha = 1;
    };

    if (hareketsiz) {
      ciz(40);
      const id = window.setInterval(() => ciz(40), 5000);
      return () => window.clearInterval(id);
    }
    return tickerAbone((t, dt) => {
      birikim += dt;
      if (birikim < (1 / 15) * fxOlcek()) return;
      birikim = 0;
      ciz(t);
    });
  }, [isikRef, hareketsiz]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 block h-full w-full"
      style={{ zIndex: 9 }}
    />
  );
}

// =============================================================
// 3. OBA KAMP ATEŞİ (alev, kıvılcım, duman)
// =============================================================
function ObaAtesiKatmani({ hareketsiz }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return undefined;
    canvas.width = 140;
    canvas.height = 160;

    const kivilcimlar = Array.from({ length: 14 }, (_, i) => ({
      x: 70 + ((i % 5) - 2) * 5,
      y: 108 - ((i * 7) % 75),
      vy: 26 + (i % 4) * 9,
      boy: 1.5 + (i % 3) * 0.8,
      faz: i * 1.1,
    }));

    const ciz = (t, dt) => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const cx = W * 0.5;
      const cy = H * 0.72;

      const haleR = 46 + Math.sin(t * 7.5) * 4 + Math.cos(t * 11.3) * 2.5;
      const haleGrad = ctx.createRadialGradient(cx, cy + 4, 4, cx, cy + 4, haleR);
      haleGrad.addColorStop(0, "rgba(251, 146, 60, 0.5)");
      haleGrad.addColorStop(0.5, "rgba(234, 88, 12, 0.2)");
      haleGrad.addColorStop(1, "rgba(234, 88, 12, 0)");
      ctx.fillStyle = haleGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 6, haleR, haleR * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();

      for (let s = 0; s < 3; s++) {
        const f = (t * 0.45 + s * 0.33) % 1;
        ctx.fillStyle = `rgba(228, 228, 231, ${((1 - f) * 0.16).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(cx + Math.sin(t * 2.2 + s * 2) * (6 + f * 10), cy - 26 - f * 62, 8 + f * 16, 0, Math.PI * 2);
        ctx.fill();
      }

      const katmanlar = [
        { gen: 22, yuk: 42, r1: "rgba(220, 38, 38, 0.88)", r2: "rgba(249, 115, 22, 0)", hiz: 6.2, faz: 0 },
        { gen: 18, yuk: 36, r1: "rgba(249, 115, 22, 0.92)", r2: "rgba(251, 191, 36, 0)", hiz: 7.8, faz: 1.4 },
        { gen: 14, yuk: 28, r1: "rgba(251, 191, 36, 0.95)", r2: "rgba(254, 240, 138, 0)", hiz: 9.4, faz: 2.7 },
        { gen: 8.5, yuk: 18, r1: "rgba(254, 249, 195, 0.96)", r2: "rgba(254, 240, 138, 0)", hiz: 11.2, faz: 0.8 },
      ];
      for (const kat of katmanlar) {
        for (let dal = -1; dal <= 1; dal++) {
          const yan = dal * (kat.gen * 0.36);
          const boy = kat.yuk * (dal === 0 ? 1.08 : 0.82) + Math.sin(t * kat.hiz + kat.faz + dal) * 4.5;
          const uc = Math.sin(t * (kat.hiz + 1.5) + dal * 1.7 + kat.faz) * 6.5;
          const grad = ctx.createLinearGradient(cx, cy + 6, cx + uc, cy - boy);
          grad.addColorStop(0, kat.r1);
          grad.addColorStop(0.75, kat.r1);
          grad.addColorStop(1, kat.r2);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(cx + yan - kat.gen * 0.5, cy + 4);
          ctx.quadraticCurveTo(cx + yan - kat.gen * 0.65, cy - boy * 0.45, cx + yan * 0.4 + uc, cy - boy);
          ctx.quadraticCurveTo(cx + yan + kat.gen * 0.65, cy - boy * 0.45, cx + yan + kat.gen * 0.5, cy + 4);
          ctx.closePath();
          ctx.fill();
        }
      }

      for (const p of kivilcimlar) {
        p.y -= p.vy * dt;
        p.x += Math.sin(t * 5.0 + p.faz) * 14 * dt;
        if (p.y < 18) {
          p.y = cy + 2;
          p.x = cx + (((p.faz * 7.3) % 1) - 0.5) * 22;
        }
        const omur = kenet((p.y - 18) / (cy - 18), 0, 1);
        ctx.fillStyle = omur > 0.5 ? `rgba(254, 240, 138, ${omur.toFixed(2)})` : `rgba(249, 115, 22, ${omur.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.boy * omur + 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    if (hareketsiz) {
      ciz(1.3, 0);
      return undefined;
    }
    return tickerAbone(ciz);
  }, [hareketsiz]);

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: "55.18%",
        top: "21.70%",
        width: "4.6%",
        minWidth: "46px",
        aspectRatio: "140 / 160",
        transform: "translate(-50%, -72%)",
        zIndex: 43,
      }}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
    </div>
  );
}

// =============================================================
// 4. KUŞLAR, KELEBEKLER, POLEN/YAPRAK (gündüz; normal karışım)
// =============================================================
const KELEBEKLER = [
  { x: gx(150), y: gy(352), ax: 4.2, ay: 3.0, faz: 0.3, renk: "#fde68a", renk2: "#f59e0b" },
  { x: gx(300), y: gy(600), ax: 4.8, ay: 2.6, faz: 2.1, renk: "#fb923c", renk2: "#7c2d12" },
  { x: gx(60), y: gy(600), ax: 3.6, ay: 3.2, faz: 4.0, renk: "#bae6fd", renk2: "#3b82f6" },
];

const POLENLER = Array.from({ length: 12 }, (_, i) => ({
  x: (i * 67) % 100,
  y: (i * 43) % 100,
  vx: 0.8 + (i % 4) * 0.3,
  vy: 0.25 + (i % 3) * 0.15,
  faz: i * 0.9,
  boy: i % 3 === 0 ? 2.6 : 1.7,
  yaprak: i % 3 === 0,
}));

function CanlilarKatmani({ isikRef, hareketsiz }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return undefined;
    if (hareketsiz) {
      // azaltılmış hareket / hafif mod: hiç çizilmez (havada donmuş kuş kalmasın)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return undefined;
    }
    canvas.width = FX_W;
    canvas.height = FX_H;
    const W = FX_W;
    const H = FX_H;
    let birikim = 0;
    let sonraki = 4;
    let surum = null;

    const ciz = (t, dt) => {
      birikim += dt;
      if (birikim < (1 / 30) * fxOlcek()) return;
      const adim = birikim;
      birikim = 0;
      const p = isikRef.current;
      const gunduz = p ? kenet(1 - p.gece * 1.3, 0, 1) : 1;
      ctx.clearRect(0, 0, W, H);
      if (gunduz <= 0.02) {
        surum = null;
        return;
      }

      // polen + yapraklar
      for (const q of POLENLER) {
        q.x += q.vx * adim;
        q.y += q.vy * adim + Math.sin(t * 1.4 + q.faz) * 0.04;
        if (q.x > 102) q.x = -2;
        if (q.y > 102) q.y = -2;
        ctx.save();
        ctx.translate((q.x / 100) * W, (q.y / 100) * H);
        ctx.globalAlpha = gunduz;
        if (q.yaprak) {
          ctx.rotate(t * 1.2 + q.faz);
          ctx.fillStyle = "rgba(132, 184, 78, 0.6)";
          ctx.beginPath();
          ctx.ellipse(0, 0, q.boy * 1.5, q.boy * 0.75, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "rgba(253, 230, 138, 0.5)";
          ctx.beginPath();
          ctx.arc(0, 0, q.boy, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // kelebekler
      for (const b of KELEBEKLER) {
        const x = b.x + b.ax * Math.sin(t * 0.45 + b.faz) + b.ax * 0.4 * Math.sin(t * 1.15 + b.faz * 2);
        const y = b.y + b.ay * Math.sin(t * 0.62 + b.faz * 1.3) + Math.sin(t * 5 + b.faz) * 0.25;
        const px = (x / 100) * W;
        const py = (y / 100) * H;
        const kanat = 0.25 + 0.75 * Math.abs(Math.cos(t * 12 + b.faz));
        ctx.save();
        ctx.globalAlpha = gunduz;
        ctx.translate(px, py);
        ctx.rotate(Math.sin(t * 0.7 + b.faz) * 0.5);
        ctx.fillStyle = b.renk;
        ctx.strokeStyle = b.renk2;
        ctx.lineWidth = 0.8;
        for (const yon of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(yon * 2.6 * kanat, -1, 3.2 * kanat, 3.4, yon * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.fillStyle = "#292524";
        ctx.fillRect(-0.5, -2.6, 1, 5.4);
        ctx.restore();
      }

      // kuşlar: arada bir kısa bir sürü geçer
      if (!surum && t > sonraki) {
        const sagaMi = Math.random() < 0.5;
        const y0 = 8 + Math.random() * 26;
        surum = {
          t0: t,
          sure: 16 + Math.random() * 6,
          sagaMi,
          y0,
          egim: (Math.random() - 0.4) * 16,
          kuslar: Array.from({ length: 3 + Math.floor(Math.random() * 3) }, (_, i) => ({
            dx: -i * 2.4 * (sagaMi ? 1 : -1) + (Math.random() - 0.5),
            dy: (i % 2 ? 1 : -1) * i * 1.1,
            faz: Math.random() * 6,
          })),
        };
      }
      if (surum) {
        const u = (t - surum.t0) / surum.sure;
        if (u >= 1) {
          surum = null;
          sonraki = t + 14 + Math.random() * 26;
        } else {
          const bx = surum.sagaMi ? -6 + u * 112 : 106 - u * 112;
          const by = surum.y0 + surum.egim * u;
          ctx.strokeStyle = "rgba(38, 32, 40, 0.8)";
          ctx.lineWidth = 1.5;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.globalAlpha = gunduz;
          for (const k of surum.kuslar) {
            const kx = ((bx + k.dx) / 100) * W;
            const ky = ((by + k.dy) / 100) * H;
            const cirp = Math.sin(t * 9 + k.faz) * 3.6;
            ctx.beginPath();
            ctx.moveTo(kx - 6, ky - cirp * 0.6 + 1);
            ctx.quadraticCurveTo(kx - 3, ky - 3 + cirp * 0.4, kx, ky);
            ctx.quadraticCurveTo(kx + 3, ky - 3 + cirp * 0.4, kx + 6, ky - cirp * 0.6 + 1);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    };

    return tickerAbone(ciz);
  }, [isikRef, hareketsiz]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 block h-full w-full"
      style={{ zIndex: 186 }}
    />
  );
}

// =============================================================
// 5. GECE IŞIKLARI: ateş havuzu, fener parıltıları, ateş böcekleri (screen karışımı)
// =============================================================
const FENERLER = [
  { x: 55.18, y: 22.6, r: 11, guc: 0.62, kor: false, faz: 0.0 },      // Oba kamp ateşi havuzu
  { x: gx(722), y: gy(284), r: 4.2, guc: 0.62, kor: true, faz: 1.3 },   // pano feneri (sol)
  { x: gx(803), y: gy(284), r: 4.2, guc: 0.62, kor: true, faz: 2.6 },   // pano feneri (sağ)
  { x: gx(724), y: gy(656), r: 3.8, guc: 0.55, kor: true, faz: 3.9 },   // yön tabelası feneri
  { x: gx(1262), y: gy(572), r: 5.6, guc: 0.6, kor: false, faz: 5.2 },  // taş ocağı ağzı
];

const BOCEK_ALANLARI = [
  { x: gx(300), y: gy(585), rx: 4.6, ry: 5.4 },
  { x: gx(1010), y: gy(530), rx: 4.2, ry: 9.0 },
  { x: gx(620), y: gy(700), rx: 3.6, ry: 5.0 },
  { x: gx(430), y: gy(300), rx: 3.6, ry: 5.2 },
  { x: gx(960), y: gy(205), rx: 4.2, ry: 8.0 },
];
const ATES_BOCEKLERI = Array.from({ length: 20 }, (_, i) => ({
  alan: BOCEK_ALANLARI[i % BOCEK_ALANLARI.length],
  fx: 0.18 + ((i * 7) % 5) * 0.06,
  fy: 0.22 + ((i * 3) % 4) * 0.07,
  faz: i * 1.7,
  yanip: 0.6 + ((i * 5) % 4) * 0.22,
}));

function GeceIsiklariKatmani({ isikRef, hareketsiz }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return undefined;
    canvas.width = FX_W;
    canvas.height = FX_H;
    const W = FX_W;
    const H = FX_H;
    let birikim = 0;
    let bos = false;

    const ciz = (t, sabit) => {
      const p = isikRef.current;
      const lamba = p ? p.lamba : 0;
      if (lamba < 0.02) {
        if (!bos) ctx.clearRect(0, 0, W, H);
        bos = true;
        return;
      }
      bos = false;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (const f of FENERLER) {
        const titre = sabit ? 1 : 1 + 0.08 * Math.sin(t * 7 + f.faz) + 0.05 * Math.sin(t * 13.3 + f.faz * 2);
        const px = (f.x / 100) * W;
        const py = (f.y / 100) * H;
        const R = (f.r / 100) * W * titre;
        const a = f.guc * lamba;
        const g = ctx.createRadialGradient(px, py, 0, px, py, R);
        g.addColorStop(0, `rgba(255, 176, 84, ${(a * 0.9).toFixed(3)})`);
        g.addColorStop(0.35, `rgba(255, 128, 40, ${(a * 0.42).toFixed(3)})`);
        g.addColorStop(1, "rgba(255, 100, 20, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(px, py, R, R * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        if (f.kor) {
          ctx.fillStyle = `rgba(255, 236, 170, ${(0.95 * lamba).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(px, py, 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const gece = p ? p.gece : 0;
      if (!sabit && gece > 0.45) {
        const gorun = kenet((gece - 0.45) / 0.4, 0, 1);
        for (const b of ATES_BOCEKLERI) {
          const x = b.alan.x + b.alan.rx * Math.sin(t * b.fx + b.faz) + b.alan.rx * 0.5 * Math.sin(t * b.fx * 2.3 + b.faz * 1.7);
          const y = b.alan.y + b.alan.ry * Math.sin(t * b.fy + b.faz * 1.3);
          const yan = Math.pow(Math.max(0, Math.sin(t * b.yanip + b.faz)), 2);
          if (yan < 0.03) continue;
          const px = (x / 100) * W;
          const py = (y / 100) * H;
          const g = ctx.createRadialGradient(px, py, 0, px, py, 9);
          g.addColorStop(0, `rgba(230, 255, 140, ${(0.95 * yan * gorun).toFixed(3)})`);
          g.addColorStop(0.3, `rgba(190, 255, 90, ${(0.32 * yan * gorun).toFixed(3)})`);
          g.addColorStop(1, "rgba(170, 255, 60, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, 9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = "source-over";
    };

    if (hareketsiz) {
      ciz(0, true);
      const id = window.setInterval(() => ciz(0, true), 4000);
      return () => window.clearInterval(id);
    }
    return tickerAbone((t, dt) => {
      birikim += dt;
      if (birikim < (1 / 24) * fxOlcek()) return;
      birikim = 0;
      ciz(t, false);
    });
  }, [isikRef, hareketsiz]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 block h-full w-full"
      style={{ zIndex: 187, mixBlendMode: "screen" }}
    />
  );
}

// =============================================================
// 6. KÖYLÜLER: bellekte çizilen sprite sayfası (idle + 8 adımlık yürüyüş)
// =============================================================
const SW = 72;
const SH = 96;
const KARE_SAYISI = 9;
const ADIM_BOYU = 1.15; // bir tam adım döngüsü için kat edilecek mesafe (dikey % birimi)

function koyluKareCiz(ctx, pr, kare) {
  const duruyor = kare === 0;
  const faz = duruyor ? 0 : ((kare - 1) / 8) * Math.PI * 2;
  const adim = duruyor ? 0 : Math.sin(faz) * 3.1;
  const yay = duruyor ? 0 : -Math.abs(Math.sin(faz)) * 1.1;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.fillStyle = "rgba(15, 23, 12, 0.32)";
  ctx.beginPath();
  ctx.ellipse(24, 58.5, 9.5, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();

  const bacak = (x, ofs) => {
    ctx.strokeStyle = "#231f20";
    ctx.lineWidth = 5.2;
    ctx.beginPath();
    ctx.moveTo(x, 41 + yay);
    ctx.lineTo(x + ofs, 55);
    ctx.stroke();
    ctx.strokeStyle = pr.pantolon;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(x, 41 + yay);
    ctx.lineTo(x + ofs, 55);
    ctx.stroke();
    ctx.fillStyle = "#1c1917";
    ctx.beginPath();
    ctx.ellipse(x + ofs + 1.2, 56, 3.2, 1.9, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  bacak(23, -adim);
  bacak(25, adim);

  ctx.fillStyle = pr.ustRenk;
  ctx.strokeStyle = "#1c1917";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(17, 25 + yay, 14, 18, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = pr.yelekRenk;
  ctx.fillRect(18.5, 26 + yay, 4, 13);
  ctx.fillRect(25.5, 26 + yay, 4, 13);
  ctx.fillStyle = "#292524";
  ctx.fillRect(17.8, 38.5 + yay, 12.4, 1.8);

  const kol = duruyor ? 0 : -adim * 0.55;
  ctx.strokeStyle = "#1c1917";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(24, 28 + yay);
  ctx.lineTo(24 + kol, 39 + yay);
  ctx.stroke();
  ctx.strokeStyle = pr.ustRenk;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(24, 28 + yay);
  ctx.lineTo(24 + kol, 39 + yay);
  ctx.stroke();
  ctx.fillStyle = pr.ten;
  ctx.beginPath();
  ctx.arc(24 + kol, 39.6 + yay, 1.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = pr.ten;
  ctx.strokeStyle = "#1c1917";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(24, 17.5 + yay, 6.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1c1917";
  ctx.beginPath();
  ctx.arc(26.6, 17.8 + yay, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(220, 110, 90, 0.35)";
  ctx.beginPath();
  ctx.arc(27.2, 20.4 + yay, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#1c1917";
  ctx.lineWidth = 1.6;
  if (pr.baslik === "takke") {
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(24, 15.5 + yay, 6.9, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (pr.baslik === "yazma") {
    ctx.fillStyle = "#0d9488";
    ctx.beginPath();
    ctx.arc(24, 16.5 + yay, 7.3, Math.PI * 0.82, Math.PI * 0.12);
    ctx.lineTo(21, 25 + yay);
    ctx.lineTo(17.5, 22 + yay);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = "#78350f";
    ctx.beginPath();
    ctx.arc(24, 14.6 + yay, 6.9, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#92400e";
    ctx.beginPath();
    ctx.ellipse(24, 14.8 + yay, 10, 2.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function koyluSayfasiUret(pr) {
  const c = document.createElement("canvas");
  c.width = SW * KARE_SAYISI;
  c.height = SH;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  for (let k = 0; k < KARE_SAYISI; k++) {
    ctx.save();
    ctx.translate(k * SW, 0);
    ctx.scale(1.5, 1.5);
    koyluKareCiz(ctx, pr, k);
    ctx.restore();
  }
  return c;
}

function koyluAjaniKur(pr, idx) {
  const bas = PATIKA_DUGUMLERI[pr.baslangic];
  return {
    mevcut: pr.baslangic,
    hedef: pr.hedef,
    ilerleme: 0,
    x: bas.x,
    y: bas.y,
    yon: idx % 2 === 0 ? -1 : 1,
    hiz: 1.05 + idx * 0.12,
    bekle: 1.0 + idx * 2.2,
    bakis: 2.2,
    kat: idx * 0.37,
    ivme: 0,
    sonKare: -1,
  };
}

// Ajanı dt kadar ilerletir. Dönen değer: gösterilecek kare (0: dur, 1..8: yürüyüş).
function koyluAdim(k, dt) {
  if (k.bekle > 0) {
    k.bekle -= dt;
    k.bakis -= dt;
    k.ivme = 0;
    if (k.bakis <= 0) {
      k.yon *= -1;
      k.bakis = 2.4 + Math.random() * 2.5;
    }
    return 0;
  }
  const a = PATIKA_DUGUMLERI[k.mevcut];
  const b = PATIKA_DUGUMLERI[k.hedef];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const m = Math.max(0.1, Math.hypot(dx * KONT_ORAN, dy)); // ekran-orantılı uzunluk
  k.ivme = Math.min(1, k.ivme + dt * 2.5);
  const ds = k.hiz * dt * (0.35 + 0.65 * k.ivme);
  k.ilerleme += ds / m;
  k.kat += ds;
  if (Math.abs(dx) > 0.05) k.yon = dx >= 0 ? 1 : -1;

  if (k.ilerleme >= 1) {
    k.x = b.x;
    k.y = b.y;
    const kom = PATIKA_KOMSULUK[k.hedef] || ["m_kuzey"];
    const adaylar = kom.length > 1 ? kom.filter((n) => n !== k.hedef && n !== k.mevcut) : kom;
    const yeni = adaylar[Math.floor(Math.random() * adaylar.length)];
    k.mevcut = k.hedef;
    k.hedef = yeni;
    k.ilerleme = 0;
    if (b.durak || Math.random() < 0.5) {
      k.bekle = 3.5 + Math.random() * 4;
      k.bakis = 1.6 + Math.random() * 2;
    }
    return 0;
  }
  k.x = a.x + dx * k.ilerleme;
  k.y = a.y + dy * k.ilerleme;
  return 1 + (Math.floor((k.kat / ADIM_BOYU) * 8) % 8);
}

// =============================================================
// ANA BİLEŞEN
// =============================================================
export default function CanliKoySahnesi({ katman = "koy", insanSayisi = 5, aktif = true }) {
  const hazir = useSyncExternalStore(bosAbone, () => true, () => false);
  const hareketsiz = useSyncExternalStore(azHareketAbone, azHareketAl, azHareketSunucu);

  const kokRef = useRef(null);
  const carpRef = useRef(null);
  const sicakRef = useRef(null);
  const vinyetRef = useRef(null);
  const isikRef = useRef(null);
  const koyluKutuRef = useRef([]);
  const koyluCvRef = useRef([]);
  const ajanRef = useRef([]);

  const koyMu = katman === "koy";
  const koyluSayisi = koyMu ? Math.min(KOYLU_PROFILI.length, Math.max(0, Math.round(insanSayisi) > 0 ? Math.min(3, insanSayisi) : 0)) : 0;

  // aktif=false veya sekme gizli: paylaşılan döngü durur
  useEffect(() => {
    tickerAktifAyarla(Boolean(aktif));
    return () => tickerAktifAyarla(true);
  }, [aktif]);

  // Gün ışığı: saniyede bir saati oku, değişince katmanları uygula (animasyon döngüsü gerektirmez)
  useEffect(() => {
    if (!hazir) return undefined;
    let son = -1;
    const uygula = () => {
      if (document.hidden) return;
      const h = saatOku();
      if (Math.abs(h - son) < 0.0006) return;
      son = h;
      const p = isikHesapla(h);
      isikRef.current = p;
      if (carpRef.current) carpRef.current.style.backgroundColor = `rgb(${rgb(p.mul)})`;
      if (sicakRef.current) {
        const a = p.sa;
        sicakRef.current.style.background =
          `radial-gradient(ellipse 95% 85% at ${(p.gx * 100).toFixed(1)}% 0%, rgba(${rgb(p.sic)},${a.toFixed(3)}) 0%, ` +
          `rgba(${rgb(p.sic)},${(a * 0.45).toFixed(3)}) 55%, rgba(${rgb(p.sic)},${(a * 0.12).toFixed(3)}) 100%)`;
      }
      if (vinyetRef.current) {
        const v = 0.1 + 0.16 * p.gece;
        vinyetRef.current.style.background =
          `radial-gradient(ellipse 75% 70% at 50% 48%, rgba(8,14,40,0) 55%, rgba(8,14,40,${v.toFixed(3)}) 100%)`;
      }
      if (kokRef.current) kokRef.current.style.setProperty("--seyir-gece", p.gece.toFixed(3));
    };
    uygula();
    const id = window.setInterval(uygula, 1000);
    document.addEventListener("visibilitychange", uygula);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", uygula);
    };
  }, [hazir]);

  // Köylüler
  useEffect(() => {
    if (!hazir || !koyMu || koyluSayisi === 0) return undefined;
    const sayfalar = KOYLU_PROFILI.slice(0, koyluSayisi).map((pr) => koyluSayfasiUret(pr));
    for (let i = 0; i < koyluSayisi; i++) {
      if (!ajanRef.current[i]) ajanRef.current[i] = koyluAjaniKur(KOYLU_PROFILI[i], i);
    }

    const goster = (i, kare) => {
      const k = ajanRef.current[i];
      const kutu = koyluKutuRef.current[i];
      const cv = koyluCvRef.current[i];
      if (!k || !kutu || !cv) return;
      kutu.style.left = `${k.x.toFixed(2)}%`;
      kutu.style.top = `${k.y.toFixed(2)}%`;
      kutu.style.zIndex = String(Math.round(k.y * 2));
      cv.style.transform = `scaleX(${k.yon})`;
      if (k.sonKare !== kare && sayfalar[i]) {
        const ctx = cv.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, SW, SH);
          ctx.drawImage(sayfalar[i], kare * SW, 0, SW, SH, 0, 0, SW, SH);
          k.sonKare = kare;
        }
      }
    };

    for (let i = 0; i < koyluSayisi; i++) {
      ajanRef.current[i].sonKare = -1;
      goster(i, 0);
    }
    if (hareketsiz) return undefined;

    return tickerAbone((t, dt) => {
      for (let i = 0; i < koyluSayisi; i++) {
        const kare = koyluAdim(ajanRef.current[i], dt);
        goster(i, kare);
      }
    });
  }, [hazir, koyMu, koyluSayisi, hareketsiz]);

  if (!hazir) {
    return <div ref={kokRef} className="pointer-events-none absolute inset-0" />;
  }

  return (
    <div ref={kokRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {koyMu && (
        <>
          <AgacSuKatmani hareketsiz={hareketsiz} />
          <VadiDeresiKatmani isikRef={isikRef} hareketsiz={hareketsiz} />
          <BulutGolgeKatmani isikRef={isikRef} hareketsiz={hareketsiz} />
          <ObaAtesiKatmani hareketsiz={hareketsiz} />

          {KOYLU_PROFILI.slice(0, koyluSayisi).map((pr, idx) => {
            const bas = PATIKA_DUGUMLERI[pr.baslangic];
            return (
              <div
                key={`koylu_${idx}`}
                ref={(el) => {
                  koyluKutuRef.current[idx] = el;
                }}
                className="pointer-events-none absolute"
                style={{
                  left: `${bas.x}%`,
                  top: `${bas.y}%`,
                  width: "1.8%",
                  minWidth: "calc(22px * var(--isaret-olcek, 1))",
                  maxWidth: "calc(32px * var(--isaret-olcek, 1))",
                  aspectRatio: `${SW} / ${SH}`,
                  transform: "translate(-50%, -90%)",
                  zIndex: Math.round(bas.y * 2),
                }}
              >
                <div
                  className="absolute"
                  style={{
                    left: "50%",
                    top: "44%",
                    width: "230%",
                    height: "170%",
                    transform: "translate(-50%, -50%)",
                    background: "radial-gradient(circle, rgba(255,190,90,0.55) 0%, rgba(255,150,50,0.18) 38%, rgba(255,150,50,0) 68%)",
                    opacity: "var(--seyir-gece, 0)",
                  }}
                />
                <canvas
                  ref={(el) => {
                    koyluCvRef.current[idx] = el;
                  }}
                  width={SW}
                  height={SH}
                  className="relative block h-full w-full select-none"
                />
              </div>
            );
          })}
        </>
      )}

      {/* Gün ışığı katmanları (z < 190: arayüz ve kenar sisinin altında) */}
      <div ref={carpRef} className="pointer-events-none absolute inset-0" style={{ zIndex: 183, mixBlendMode: "multiply", backgroundColor: "rgb(255,255,255)" }} />
      <div ref={sicakRef} className="pointer-events-none absolute inset-0" style={{ zIndex: 184, mixBlendMode: "soft-light" }} />
      <div ref={vinyetRef} className="pointer-events-none absolute inset-0" style={{ zIndex: 185 }} />

      {koyMu && (
        <>
          <CanlilarKatmani isikRef={isikRef} hareketsiz={hareketsiz} />
          <GeceIsiklariKatmani isikRef={isikRef} hareketsiz={hareketsiz} />
        </>
      )}
    </div>
  );
}
