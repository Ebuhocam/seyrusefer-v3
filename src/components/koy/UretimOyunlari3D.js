"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ORMAN_KESIF_BOLGELERI } from "@/lib/oyun/sabitler";

// =============================================================
// SEYRÜSEFER v3 — 3D ÜRETİM MİNİ OYUNLARI MOTORU (Three.js)
// 1. TasOcagi3DSahnesi: 6 bağımsız kaya, kazma darbesi, çatlak ve parçacık dağılması
// 2. OrmanKesifVeKesimSahnesi: işçi başına 2 seferlik keşif haritası + kurumuş ağaç kesme
// 3. TarlaFPS3DSahnesi: 6 fideli parsel, bakır ibrikle sulama, elle hasat
// Ortak altyapı: sRGB + ACES, sınırlı piksel oranı, gökyüzü kubbesi + bulut,
// sıcak güneş + soğuk gök dolgusu, yumuşak gölge, kanvas dokular, THREE.Timer.
// =============================================================

// ---------- ORTAK YARDIMCILAR ----------
const { clamp, lerp, smootherstep } = THREE.MathUtils;
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
const easeInCubic = (x) => x * x * x;
const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutBack = (x) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

function dokunmatikMi() {
  if (typeof window === "undefined") return false;
  return Boolean(window.matchMedia?.("(pointer: coarse)")?.matches) || (navigator.maxTouchPoints ?? 0) > 0;
}

function yazilimGlTespit(gl) {
  try {
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const rendererAdi = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "";
    return /SwiftShader|llvmpipe|Software/i.test(String(rendererAdi));
  } catch {
    return false;
  }
}

// Yazılım WebGL'de (GPU'suz cihaz) kareleri GPU bitirince çizer; aksi halde requestAnimationFrame
function kareZamanlayiciOlustur(gl, yazilimGl) {
  let rafId = 0;
  let timerId = 0;
  let durdu = false;
  const gl2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext ? gl : null;

  const sonraki = (fn) => {
    if (durdu) return;
    if (!yazilimGl) {
      rafId = requestAnimationFrame(fn);
      return;
    }
    if (gl2) {
      const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl2.flush();
      const yokla = () => {
        if (durdu) {
          gl2.deleteSync(sync);
          return;
        }
        const durum = gl2.clientWaitSync(sync, 0, 0);
        if (durum === gl2.TIMEOUT_EXPIRED) {
          timerId = window.setTimeout(yokla, 16);
          return;
        }
        gl2.deleteSync(sync);
        timerId = window.setTimeout(fn, 60);
      };
      timerId = window.setTimeout(yokla, 16);
    } else {
      timerId = window.setTimeout(fn, 70);
    }
  };

  const iptal = () => {
    durdu = true;
    cancelAnimationFrame(rafId);
    clearTimeout(timerId);
  };

  return { sonraki, iptal };
}

// THREE.Clock yerine THREE.Timer (sekme gizlenince büyük dt sıçraması olmaz)
function zamanOlcerKur(yazilimGl) {
  const timer = new THREE.Timer();
  timer.connect(document);
  const ust = yazilimGl ? 0.1 : 0.05;
  return {
    guncelle() {
      timer.update();
      return clamp(timer.getDelta(), 0.001, ust);
    },
    gecen: () => timer.getElapsed(),
    birak() {
      timer.disconnect();
      timer.dispose();
    },
  };
}

// Renderer: sRGB, ACES, piksel oranı sınırı (dokunmatik ≤1.5, diğer ≤2), yumuşak gölge
function rendererKur(el) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  const gl = renderer.getContext();
  const yazilimGl = yazilimGlTespit(gl);
  const sinir = dokunmatikMi() ? 1.5 : 2;
  renderer.setPixelRatio(yazilimGl ? 1 : Math.min(window.devicePixelRatio || 1, sinir));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const w = el.clientWidth || 800;
  const h = el.clientHeight || 450;
  renderer.setSize(w, h, false);
  const c = renderer.domElement;
  c.style.width = "100%";
  c.style.height = "100%";
  c.style.display = "block";
  c.style.touchAction = "pan-y"; // dikey kaydırma çalışsın, dokunma/tıklama da çalışsın
  el.replaceChildren(c);
  return { renderer, gl, yazilimGl };
}

function boyutlandirici(el, renderer, camera) {
  const guncelle = () => {
    const w = el.clientWidth || 800;
    const h = el.clientHeight || 450;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  const ro = new ResizeObserver(guncelle);
  ro.observe(el);
  window.addEventListener("resize", guncelle);
  window.addEventListener("orientationchange", guncelle);
  return () => {
    ro.disconnect();
    window.removeEventListener("resize", guncelle);
    window.removeEventListener("orientationchange", guncelle);
  };
}

function sahneTemizle(scene, renderer, dokular = [], ekstra = []) {
  const doku = new Set(dokular);
  scene.traverse((nesne) => {
    nesne.geometry?.dispose?.();
    if (nesne.material) {
      const materyaller = Array.isArray(nesne.material) ? nesne.material : [nesne.material];
      for (const m of materyaller) {
        for (const v of Object.values(m)) if (v?.isTexture) doku.add(v);
        m.dispose();
      }
    }
  });
  for (const t of doku) t?.dispose?.();
  for (const o of ekstra) o?.dispose?.();
  scene.environment?.dispose?.();
  renderer.dispose();
  renderer.forceContextLoss?.();
  renderer.domElement.remove();
}

// ---------- PROSEDÜREL DOKULAR ----------
function dokuYap(c, tekrar = null) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (tekrar) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(tekrar[0], tekrar[1]);
  }
  return tex;
}

function tuvalYap(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

// Yumuşak dairesel gradyan (toz, bulut, kontak gölgesi, ışıltı)
function radyalDoku(rgb = "255,255,255", ic = 1, dis = 0, boyut = 64) {
  const [c, ctx] = tuvalYap(boyut, boyut);
  const g = ctx.createRadialGradient(boyut / 2, boyut / 2, 0, boyut / 2, boyut / 2, boyut / 2);
  g.addColorStop(0, `rgba(${rgb},${ic})`);
  g.addColorStop(0.55, `rgba(${rgb},${(ic * 0.45).toFixed(3)})`);
  g.addColorStop(1, `rgba(${rgb},${dis})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, boyut, boyut);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function bulutDokusuUret() {
  const [c, ctx] = tuvalYap(256, 128);
  const kabarciklar = [
    [64, 78, 40], [100, 62, 46], [140, 58, 50], [182, 70, 44], [208, 84, 32], [120, 88, 44], [160, 90, 38],
  ];
  for (const [x, y, r] of kabarciklar) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,250,240,0.95)");
    g.addColorStop(0.6, "rgba(255,246,232,0.55)");
    g.addColorStop(1, "rgba(255,246,232,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function kayaDokusuUret(anaRenk = "#78716c") {
  const [c, ctx] = tuvalYap(256, 256);
  ctx.fillStyle = anaRenk;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 520; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 2 + Math.random() * 12;
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,248,235,0.08)" : "rgba(15,12,10,0.13)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Tabaka çizgileri ve ince kılcal çatlaklar
  ctx.strokeStyle = "rgba(20,14,8,0.16)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 26; i++) {
    ctx.beginPath();
    let x = Math.random() * 256;
    let y = Math.random() * 256;
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (Math.random() - 0.3) * 26;
      y += (Math.random() - 0.5) * 12;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return dokuYap(c);
}

// Taş ocağı zemini: kırık taş plakalar ve çakıl
function tasZeminDokusuUret() {
  const [c, ctx] = tuvalYap(512, 512);
  ctx.fillStyle = "#6f665a";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const w = 28 + Math.random() * 56;
    const h = 20 + Math.random() * 40;
    const ton = 96 + Math.random() * 56;
    ctx.fillStyle = `rgb(${ton + 14},${ton + 4},${ton - 10})`;
    ctx.beginPath();
    ctx.roundRect?.(x, y, w, h, 8) ?? ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.strokeStyle = "rgba(25,18,10,0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  for (let i = 0; i < 700; i++) {
    ctx.fillStyle = i % 2 ? "rgba(255,240,215,0.1)" : "rgba(20,14,8,0.14)";
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 4, 2 + Math.random() * 3);
  }
  return dokuYap(c, [10, 10]);
}

function otDokusuUret() {
  const [c, ctx] = tuvalYap(256, 256);
  ctx.fillStyle = "#5f8a37";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const ton = Math.random();
    ctx.strokeStyle =
      ton < 0.4 ? "rgba(40,78,26,0.35)" : ton < 0.8 ? "rgba(138,176,78,0.32)" : "rgba(196,184,98,0.22)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 5, y - 4 - Math.random() * 7);
    ctx.stroke();
  }
  return dokuYap(c, [14, 14]);
}

function toprakDokusuUret(kuru = true) {
  const [c, ctx] = tuvalYap(256, 256);
  ctx.fillStyle = kuru ? "#8a6240" : "#3f2815";
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, y, 256, 10);
    ctx.fillStyle = "rgba(255,235,200,0.08)";
    ctx.fillRect(0, y + 12, 256, 6);
  }
  for (let i = 0; i < 520; i++) {
    ctx.fillStyle = i % 2 === 0 ? "rgba(30,18,8,0.2)" : "rgba(210,175,130,0.13)";
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 5, 2 + Math.random() * 4);
  }
  return dokuYap(c, [2, 2]);
}

// Gövde kabuğu: dikey lifler (kurumuş ağaç)
function kabukDokusuUret() {
  const [c, ctx] = tuvalYap(128, 256);
  ctx.fillStyle = "#8d7a66";
  ctx.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = i % 2 === 0 ? "rgba(28,18,10,0.34)" : "rgba(175,140,100,0.2)";
    ctx.fillRect(Math.random() * 128, Math.random() * 256, 1.5 + Math.random() * 2.5, 16 + Math.random() * 34);
  }
  return dokuYap(c);
}

// Ahşap damarı (tahta, kenar bordür, sepet)
function ahsapDokusuUret(taban = "#8a5a2e") {
  const [c, ctx] = tuvalYap(256, 128);
  ctx.fillStyle = taban;
  ctx.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 46; i++) {
    const y = Math.random() * 128;
    ctx.strokeStyle = i % 3 === 0 ? "rgba(255,225,180,0.14)" : "rgba(40,22,8,0.2)";
    ctx.lineWidth = 0.8 + Math.random() * 1.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(80, y + (Math.random() - 0.5) * 8, 170, y + (Math.random() - 0.5) * 8, 256, y + (Math.random() - 0.5) * 6);
    ctx.stroke();
  }
  return dokuYap(c);
}

// ---------- GÖKYÜZÜ KUBBESİ + BULUT + SİS + IŞIK + ORTAM ----------
const GOK_YARICAP = 52;

function gokKubbesiKur(scene, dokular, { ust = 0x4a82c4, orta = 0x93bde6, ufuk = 0xf0dcb8, bulut = 7, sisYakin = 12, sisUzak = 46 } = {}) {
  const geo = new THREE.SphereGeometry(GOK_YARICAP, 24, 16);
  const pos = geo.attributes.position;
  const renk = new Float32Array(pos.count * 3);
  const cUst = new THREE.Color(ust);
  const cOrta = new THREE.Color(orta);
  const cUfuk = new THREE.Color(ufuk);
  const gecici = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / GOK_YARICAP;
    if (y <= 0.02) gecici.copy(cUfuk);
    else if (y < 0.3) gecici.lerpColors(cUfuk, cOrta, smootherstep(y, 0.02, 0.3));
    else gecici.lerpColors(cOrta, cUst, smootherstep(y, 0.3, 0.9));
    renk[i * 3] = gecici.r;
    renk[i * 3 + 1] = gecici.g;
    renk[i * 3 + 2] = gecici.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(renk, 3));
  const kubbe = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })
  );
  kubbe.renderOrder = -10;
  kubbe.frustumCulled = false;
  scene.add(kubbe);

  // Yumuşak bulutlar (kubbe yüzeyinde, yavaşça süzülür)
  const bulutDoku = bulutDokusuUret();
  dokular.push(bulutDoku);
  const bulutGrubu = new THREE.Group();
  for (let i = 0; i < bulut; i++) {
    const m = new THREE.SpriteMaterial({
      map: bulutDoku,
      transparent: true,
      opacity: 0.55 + (i % 3) * 0.12,
      depthWrite: false,
      fog: false,
    });
    const s = new THREE.Sprite(m);
    const aci = (i / bulut) * Math.PI * 2 + 0.4;
    const yuk = 0.16 + ((i * 37) % 11) / 11 * 0.3;
    const r = GOK_YARICAP * 0.9;
    s.position.set(Math.cos(aci) * r * Math.cos(yuk), r * Math.sin(yuk) + 2, Math.sin(aci) * r * Math.cos(yuk));
    const olcek = 16 + (i % 4) * 4;
    s.scale.set(olcek, olcek * 0.42, 1);
    bulutGrubu.add(s);
  }
  scene.add(bulutGrubu);

  scene.background = new THREE.Color(ufuk);
  scene.fog = new THREE.Fog(ufuk, sisYakin, sisUzak);
  return { kubbe, bulutGrubu };
}

// Sıcak ikindi güneşi (dar gölge kamerası) + serin gök dolgusu
function isikKur(scene, { poz = [6, 10, 5], hedef = [0, 0, 0], yaricap = 7, golgeBoyut = 1024, siddet = 2.7 } = {}) {
  const gunes = new THREE.DirectionalLight(0xffe0b0, siddet);
  gunes.position.set(hedef[0] + poz[0], hedef[1] + poz[1], hedef[2] + poz[2]);
  gunes.target.position.set(hedef[0], hedef[1], hedef[2]);
  gunes.castShadow = true;
  gunes.shadow.mapSize.set(golgeBoyut, golgeBoyut);
  const k = gunes.shadow.camera;
  k.left = -yaricap;
  k.right = yaricap;
  k.top = yaricap;
  k.bottom = -yaricap;
  k.near = 1;
  k.far = 40;
  gunes.shadow.bias = -0.0004;
  gunes.shadow.normalBias = 0.03;
  scene.add(gunes, gunes.target);

  const gokIsigi = new THREE.HemisphereLight(0xb4d0ee, 0x74603f, 0.8);
  scene.add(gokIsigi);
  return { gunes, gokIsigi };
}

// Ortam yansıması: gökyüzü kubbesinden üretilir (bakır sıcak gökten yansır)
function ortamHaritasiKur(renderer, scene, kubbe, siddet = 0.75) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(kubbe.geometry, kubbe.material));
  const zemin = new THREE.Mesh(new THREE.CircleGeometry(60, 16), new THREE.MeshBasicMaterial({ color: 0x86704c }));
  zemin.rotation.x = -Math.PI / 2;
  zemin.position.y = -1.5;
  const gunesTopu = new THREE.Mesh(
    new THREE.SphereGeometry(5, 12, 8),
    new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(7, 5.2, 3.2) })
  );
  gunesTopu.position.set(26, 28, 18);
  env.add(zemin, gunesTopu);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, 0.03).texture;
  scene.environmentIntensity = siddet;
  zemin.geometry.dispose();
  zemin.material.dispose();
  gunesTopu.geometry.dispose();
  gunesTopu.material.dispose();
  pmrem.dispose();
}

// Havada süzülen toz zerrecikleri (sıcak ışıkta)
function tozZerreleriKur(scene, dokular, { adet = 46, alan = [9, 3.2, 6], merkez = [0, 1.6, 0] } = {}) {
  const doku = radyalDoku("255,240,205", 1, 0, 32);
  dokular.push(doku);
  const geo = new THREE.BufferGeometry();
  const konum = new Float32Array(adet * 3);
  const faz = new Float32Array(adet);
  for (let i = 0; i < adet; i++) {
    konum[i * 3] = merkez[0] + (Math.random() - 0.5) * alan[0] * 2;
    konum[i * 3 + 1] = merkez[1] + (Math.random() - 0.5) * alan[1] * 2;
    konum[i * 3 + 2] = merkez[2] + (Math.random() - 0.5) * alan[2] * 2;
    faz[i] = Math.random() * Math.PI * 2;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(konum, 3));
  const mat = new THREE.PointsMaterial({
    map: doku,
    size: 0.11,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    color: 0xfff0cc,
  });
  const noktalar = new THREE.Points(geo, mat);
  noktalar.frustumCulled = false;
  scene.add(noktalar);
  return {
    guncelle(t, dt) {
      for (let i = 0; i < adet; i++) {
        konum[i * 3] += Math.sin(t * 0.3 + faz[i]) * 0.12 * dt + 0.05 * dt;
        konum[i * 3 + 1] += Math.cos(t * 0.5 + faz[i]) * 0.1 * dt;
        konum[i * 3 + 2] += Math.cos(t * 0.25 + faz[i] * 1.3) * 0.1 * dt;
        if (konum[i * 3] > merkez[0] + alan[0]) konum[i * 3] = merkez[0] - alan[0];
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

// Kıvılcım / kırıntı / toz bulutu parçacıkları (havuzlu, çöp üretmez)
function parcacikSistemiKur(scene, dokular) {
  const aktifler = [];
  const kivilcimGeo = new THREE.OctahedronGeometry(0.055, 0);
  const kivilcimMat = new THREE.MeshBasicMaterial({ color: 0xffcf66 });
  const tozDoku = radyalDoku("226,208,176", 0.9, 0, 64);
  dokular.push(tozDoku);
  const tozHavuz = Array.from({ length: 30 }, () => {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tozDoku, transparent: true, opacity: 0, depthWrite: false })
    );
    s.visible = false;
    scene.add(s);
    return s;
  });
  let tozSira = 0;

  const kivilcim = (x, y, z, adet = 10, hiz = 1) => {
    for (let i = 0; i < adet; i++) {
      const m = new THREE.Mesh(kivilcimGeo, kivilcimMat);
      m.position.set(x, y, z);
      scene.add(m);
      const aci = Math.random() * Math.PI * 2;
      const h = (2 + Math.random() * 3.5) * hiz;
      aktifler.push({
        tur: "mesh", nesne: m, vx: Math.cos(aci) * h, vy: (2.2 + Math.random() * 3.2) * hiz, vz: Math.sin(aci) * h,
        rx: 9, ry: 7, omur: 0.4 + Math.random() * 0.3, maks: 0.7, yercekimi: 14, sekme: 0.3,
      });
    }
  };

  const toz = (x, y, z, adet = 5, boyut = 0.9, renk = 0xd8c8a8) => {
    for (let i = 0; i < adet; i++) {
      const s = tozHavuz[tozSira++ % tozHavuz.length];
      s.visible = true;
      s.material.color.setHex(renk);
      s.position.set(x + (Math.random() - 0.5) * 0.4, y, z + (Math.random() - 0.5) * 0.4);
      const aci = Math.random() * Math.PI * 2;
      const idx = aktifler.findIndex((a) => a.nesne === s);
      if (idx >= 0) aktifler.splice(idx, 1);
      aktifler.push({
        tur: "toz", nesne: s, vx: Math.cos(aci) * 0.9, vy: 0.5 + Math.random() * 0.6, vz: Math.sin(aci) * 0.9,
        omur: 0.9, maks: 0.9, boyut: boyut * (0.7 + Math.random() * 0.6),
      });
    }
  };

  // Hazır mesh'i fiziğe sok (kaya kırıntısı, odun yongası)
  const parca = (mesh, v, omur = 1.3, yercekimi = 14.5, sekme = 0.42) => {
    scene.add(mesh);
    aktifler.push({
      tur: "mesh", nesne: mesh, vx: v[0], vy: v[1], vz: v[2], rx: v[3] ?? 6, ry: v[4] ?? 6,
      omur, maks: omur, yercekimi, sekme, yuzey: v[5] ?? 0.14,
    });
  };

  const guncelle = (dt) => {
    for (let i = aktifler.length - 1; i >= 0; i--) {
      const p = aktifler[i];
      p.omur -= dt;
      const n = p.nesne;
      if (p.omur <= 0) {
        if (p.tur === "toz") {
          n.visible = false;
          n.material.opacity = 0;
        } else {
          scene.remove(n);
        }
        aktifler.splice(i, 1);
        continue;
      }
      if (p.tur === "toz") {
        const u = 1 - p.omur / p.maks;
        n.position.x += p.vx * dt * (1 - u);
        n.position.y += p.vy * dt * (1 - u);
        n.position.z += p.vz * dt * (1 - u);
        const b = p.boyut * (0.5 + easeOutCubic(u) * 1.1);
        n.scale.set(b, b, 1);
        n.material.opacity = 0.55 * (1 - u) * Math.min(1, u * 8);
        continue;
      }
      p.vy -= p.yercekimi * dt;
      n.position.x += p.vx * dt;
      n.position.y += p.vy * dt;
      n.position.z += p.vz * dt;
      n.rotation.x += p.rx * dt;
      n.rotation.y += p.ry * dt;
      const yuzey = p.yuzey ?? 0.08;
      if (n.position.y < yuzey) {
        n.position.y = yuzey;
        p.vy = Math.abs(p.vy) * p.sekme;
        p.vx *= 0.74;
        p.vz *= 0.74;
      }
      if (p.omur < 0.3) n.scale.multiplyScalar(0.93);
    }
  };

  return {
    kivilcim,
    toz,
    parca,
    guncelle,
    birak: () => {
      kivilcimGeo.dispose();
      kivilcimMat.dispose();
    },
  };
}

// Kamera sarsıntısı: güç hızla sönümlenir
function sarsintiKur() {
  const d = { guc: 0 };
  return {
    vur: (g) => {
      d.guc = Math.max(d.guc, g);
    },
    uygula(kamera, taban, dt) {
      d.guc *= Math.exp(-9 * dt);
      if (d.guc < 0.002) d.guc = 0;
      kamera.position.set(
        taban.x + (Math.random() - 0.5) * d.guc,
        taban.y + (Math.random() - 0.5) * d.guc,
        taban.z
      );
    },
  };
}

// ---------- WEB AUDIO PROSEDÜREL SES EFEKTLERİ ----------
let ortakAudioCtx = null;
function sesCal(tur) {
  try {
    if (typeof window === "undefined") return;
    const AudioSinifi = window.AudioContext || window.webkitAudioContext;
    if (!AudioSinifi) return;
    if (!ortakAudioCtx) ortakAudioCtx = new AudioSinifi();
    if (ortakAudioCtx.state === "suspended") ortakAudioCtx.resume();
    const ctx = ortakAudioCtx;
    const t0 = ctx.currentTime;

    const ton = (tip, f0, f1, sure, ses) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tip;
      osc.frequency.setValueAtTime(f0, t0);
      osc.frequency.exponentialRampToValueAtTime(f1, t0 + sure);
      gain.gain.setValueAtTime(ses, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + sure + 0.02);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + sure + 0.03);
    };

    if (tur === "kazma") ton("triangle", 920, 210, 0.13, 0.22);
    else if (tur === "balta") ton("sawtooth", 240, 68, 0.12, 0.24);
    else if (tur === "su") ton("sine", 420 + Math.random() * 220, 760, 0.08, 0.05);
    else if (tur === "hasat") ton("sine", 440, 780, 0.12, 0.18);
    else if (tur === "parcalanma" || tur === "devrilme") {
      const uzunluk = Math.floor(ctx.sampleRate * 0.36);
      const buf = ctx.createBuffer(1, uzunluk, ctx.sampleRate);
      const veri = buf.getChannelData(0);
      for (let i = 0; i < uzunluk; i++) veri[i] = (Math.random() * 2 - 1) * Math.exp(-i / (uzunluk * 0.35));
      const src = ctx.createBufferSource();
      const filtre = ctx.createBiquadFilter();
      filtre.type = "lowpass";
      filtre.frequency.value = tur === "parcalanma" ? 420 : 280;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.32, t0);
      gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.35);
      src.buffer = buf;
      src.connect(filtre).connect(gain).connect(ctx.destination);
      src.start(t0);
    }
  } catch {
    // Ses bağlamı kısıtlıysa sessizce devam et
  }
}

// =============================================================
// 1. TAŞ OCAĞI 3D KAYA PARÇALAMA SAHNESİ (6 Bağımsız Kaya + Kazma + Parçacıklar)
// =============================================================
const KAYA_KONUMLARI_3D = [
  { id: 1, x: -3.5, z: -0.9, olcek: 1.05 },
  { id: 2, x: 0.0, z: -1.35, olcek: 1.12 },
  { id: 3, x: 3.4, z: -0.85, olcek: 1.06 },
  { id: 4, x: -2.5, z: 1.35, olcek: 0.98 },
  { id: 5, x: 0.35, z: 1.5, olcek: 1.02 },
  { id: 6, x: 3.1, z: 1.25, olcek: 1.0 },
];

const KAZMA_SURE = 0.62; // sn: kaldırma (0-0.30) · iniş (0.30-0.42) · geri tepme
const KAZMA_VURUS_ZAMANI = 0.42;

function golgeAc(nesne, yayar = true, alir = true) {
  nesne.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = yayar;
      n.receiveShadow = alir;
    }
  });
  return nesne;
}

function kazmaModeliOlustur(ahsapDoku) {
  const grup = new THREE.Group();
  const sapMat = new THREE.MeshStandardMaterial({ map: ahsapDoku, color: 0xd9b48a, roughness: 0.74 });
  const demirMat = new THREE.MeshStandardMaterial({ color: 0x5d6670, metalness: 0.85, roughness: 0.38 });
  const ucMat = new THREE.MeshStandardMaterial({ color: 0xc9d1d9, metalness: 0.92, roughness: 0.22 });

  const sap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.068, 1.5, 10), sapMat);
  sap.position.y = 0.72;
  grup.add(sap);

  // Eğri kazma başı: yay + iki sivri uç
  const R = 0.52;
  const yay = Math.PI * 0.74;
  const bas = new THREE.Mesh(new THREE.TorusGeometry(R, 0.055, 8, 20, yay), demirMat);
  bas.rotation.z = Math.PI / 2 - yay / 2;
  bas.position.y = 1.42 - R;
  grup.add(bas);

  for (const yon of [-1, 1]) {
    const th = Math.PI / 2 + (yon * yay) / 2; // yayın uç açısı
    const ux = R * Math.cos(th);
    const uy = 1.42 - R + R * Math.sin(th);
    const uc = new THREE.Mesh(new THREE.ConeGeometry(0.058, 0.3, 8), ucMat);
    // teğet yönü (ucun dışa/aşağıya devamı)
    const tx = -yon * Math.sin(th);
    const ty = yon * Math.cos(th);
    uc.rotation.z = Math.atan2(-tx, ty);
    uc.position.set(ux + tx * 0.12, uy + ty * 0.12, 0);
    grup.add(uc);
  }

  const kusak = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.2, 0.17), demirMat);
  kusak.position.y = 1.42;
  grup.add(kusak);
  return golgeAc(grup, true, false);
}

function kayaKutlesiOlustur(kayaBilgi, doku, kontakDoku) {
  const kok = new THREE.Group();
  const govdeGrup = new THREE.Group();
  kok.add(govdeGrup);

  const anaMat = new THREE.MeshStandardMaterial({
    map: doku,
    color: 0xf4eee6,
    roughness: 0.88,
    metalness: 0.04,
    flatShading: true,
    emissive: new THREE.Color(0xffb35a),
    emissiveIntensity: 0,
  });
  const damarMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(kayaBilgi.damarRenk),
    emissive: new THREE.Color(kayaBilgi.damarRenk),
    emissiveIntensity: 0.22,
    roughness: 0.3,
    metalness: 0.6,
    flatShading: true,
  });
  const catlakMat = new THREE.MeshBasicMaterial({ color: 0x140d08 });

  const parcalar = [
    { r: 0.82, pos: [0, 0.62, 0], scl: [1.15, 0.92, 1.0] },
    { r: 0.58, pos: [-0.46, 0.42, 0.24], scl: [1.0, 0.8, 0.9] },
    { r: 0.54, pos: [0.48, 0.44, -0.18], scl: [0.95, 0.85, 1.05] },
    { r: 0.44, pos: [0.12, 0.92, 0.16], scl: [0.9, 0.72, 0.85] },
  ];

  const tiklanabilirParcalar = [];
  parcalar.forEach((p, idx) => {
    const geo = new THREE.DodecahedronGeometry(p.r, 0);
    geo.scale(p.scl[0], p.scl[1], p.scl[2]);
    const mesh = new THREE.Mesh(geo, anaMat);
    mesh.position.set(p.pos[0], p.pos[1], p.pos[2]);
    mesh.rotation.set(idx * 0.7, idx * 1.1, idx * 0.4);
    mesh.layers.enable(1);
    mesh.userData = { kayaId: kayaBilgi.id };
    govdeGrup.add(mesh);
    tiklanabilirParcalar.push(mesh);
  });

  for (let i = 0; i < 3; i++) {
    const kMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.18 + i * 0.03, 0), damarMat);
    const aci = i * 2.1 + kayaBilgi.id;
    kMesh.position.set(Math.cos(aci) * 0.55, 0.58 + i * 0.16, Math.sin(aci) * 0.52);
    kMesh.rotation.set(aci, i, 0.4);
    govdeGrup.add(kMesh);
  }

  const catlaklar1 = new THREE.Group();
  const catlaklar2 = new THREE.Group();
  catlaklar1.visible = false;
  catlaklar2.visible = false;
  for (let i = 0; i < 4; i++) {
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.62, 0.06), catlakMat);
    c1.position.set((i - 1.5) * 0.22, 0.68, 0.74 - Math.abs(i - 1.5) * 0.14);
    c1.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.38;
    catlaklar1.add(c1);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.055, 0.07), catlakMat);
    c2.position.set(0, 0.48 + i * 0.16, 0.76 - i * 0.08);
    c2.rotation.z = (i - 1.5) * 0.25;
    catlaklar2.add(c2);
  }
  govdeGrup.add(catlaklar1, catlaklar2);
  golgeAc(govdeGrup, true, true);

  // Zemin temas gölgesi (yumuşak gradyan)
  const golge = new THREE.Mesh(
    new THREE.PlaneGeometry(2.7, 2.7),
    new THREE.MeshBasicMaterial({ map: kontakDoku, transparent: true, opacity: 0.55, depthWrite: false })
  );
  golge.rotation.x = -Math.PI / 2;
  golge.position.y = 0.025;
  kok.add(golge);

  const kalinti = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), anaMat);
    m.position.set(Math.cos(i * 1.6) * 0.45, 0.09, Math.sin(i * 1.6) * 0.42);
    m.rotation.set(i, i * 2, 0);
    kalinti.add(m);
  }
  kalinti.visible = false;
  golgeAc(kalinti, false, true);
  kok.add(kalinti);

  return { kok, govdeGrup, catlaklar1, catlaklar2, kalinti, anaMat, tiklanabilirParcalar };
}

export function TasOcagi3DSahnesi({ oyun }) {
  const kapsayiciRef = useRef(null);
  const sahneApiRef = useRef(null);
  const noktalar = oyun.sahaNoktalari("tas");
  const [vurusSayilari, setVurusSayilari] = useState({});
  const [aktifMesaj, setAktifMesaj] = useState(
    "⛏️ Sahadaki 6 kayadan birine dokun. Her kaya 3 kazma darbesinde parçalanır."
  );
  const [isleniyorId, setIsleniyorId] = useState(null);

  const oyunRef = useRef(oyun);
  const noktalarRef = useRef(noktalar);
  const vurusRef = useRef({});
  const kilitRef = useRef(false); // sunucu isteği sürerken yeni darbe alma
  useEffect(() => {
    oyunRef.current = oyun;
    noktalarRef.current = noktalar;
    const api = sahneApiRef.current;
    if (!api) return;
    for (const n of noktalar) {
      if (!n.hazir) vurusRef.current[n.id] = 0;
      api.kayaDurumu(n.id, Boolean(n.hazir));
    }
  });

  const kayaDarbeVur = useCallback(async (kayaId) => {
    if (kilitRef.current) return;
    const api = sahneApiRef.current;
    const guncelNokta = noktalarRef.current.find((n) => n.id === kayaId);
    if (!api || !guncelNokta || oyunRef.current.bekliyor) return;
    if (!guncelNokta.hazir) {
      setAktifMesaj(
        `⏳ ${guncelNokta.ad} yeniden oluşuyor (~${guncelNokta.kalanDakika ?? 60} dk). Sağlam bir kayaya vurabilirsin.`
      );
      return;
    }

    const mevcutVurus = (vurusRef.current[kayaId] ?? 0) + 1;
    if (mevcutVurus < 3) {
      vurusRef.current[kayaId] = mevcutVurus;
      api.kazmaSalla(kayaId, mevcutVurus);
      setVurusSayilari({ ...vurusRef.current });
      setAktifMesaj(
        mevcutVurus === 1
          ? `💥 ${guncelNokta.ad} sarsıldı, ilk çatlaklar göründü. (1/3 darbe)`
          : `⚡ ${guncelNokta.ad} derinden çatladı. Parçalamak için son darbeyi vur! (2/3 darbe)`
      );
      return;
    }

    // 3. darbe: kaya taş bloklara ayrılır, ödül sunucudan istenir (kilit: çift istek olmaz)
    kilitRef.current = true;
    vurusRef.current[kayaId] = 0;
    setVurusSayilari({ ...vurusRef.current });
    setIsleniyorId(kayaId);
    try {
      await api.kazmaSalla(kayaId, 3);
      const sonuc = await oyunRef.current.sahaHasat("tas", kayaId);
      if (!sonuc) {
        sahneApiRef.current?.kayaGeriGetir(kayaId);
        setAktifMesaj("⚠️ Taş toplanamadı, kaya yerine döndü. Bir kez daha dene.");
      } else if (sonuc.mesaj) {
        setAktifMesaj(`${sonuc.mesaj} Diğer sağlam kayalardan devam edebilirsin.`);
      }
    } finally {
      kilitRef.current = false;
      setIsleniyorId(null);
    }
  }, []);

  const darbeRef = useRef(kayaDarbeVur);
  useEffect(() => {
    darbeRef.current = kayaDarbeVur;
  }, [kayaDarbeVur]);

  useEffect(() => {
    const el = kapsayiciRef.current;
    if (!el) return;

    const { renderer, gl, yazilimGl } = rendererKur(el);
    const scene = new THREE.Scene();
    const dokular = [];
    const { kubbe, bulutGrubu } = gokKubbesiKur(scene, dokular, {
      ust: 0x5b8ec6, orta: 0xa4c4df, ufuk: 0xe9d7b8, sisYakin: 14, sisUzak: 44,
    });
    ortamHaritasiKur(renderer, scene, kubbe, 0.7);
    isikKur(scene, {
      poz: [-6, 10, 7], hedef: [0, 0, 0], yaricap: 8.5, golgeBoyut: yazilimGl ? 512 : 1024,
    });
    renderer.toneMappingExposure = 1.05;

    const camera = new THREE.PerspectiveCamera(44, (el.clientWidth || 800) / (el.clientHeight || 450), 0.1, 80);
    const kameraTaban = new THREE.Vector3(0, 5.4, 8.2);
    camera.position.copy(kameraTaban);
    camera.lookAt(0, 0.5, 0.1);
    const aspectUyarla = () => {
      // Dar (telefon) ekranda kamerayı geri çek: 6 kaya da kadrajda kalsın
      const en = camera.aspect;
      const k = en < 1.2 ? clamp(1.25 / en, 1, 1.8) : 1;
      kameraTaban.set(0, 5.4 * k, 8.2 * k);
    };

    // Zemin, taş ocağı duvarı ve arka tepeler
    const zeminDoku = tasZeminDokusuUret();
    zeminDoku.repeat.set(26, 26);
    const ahsapDoku = ahsapDokusuUret("#8a5a2e");
    dokular.push(zeminDoku, ahsapDoku);
    const kontakDoku = radyalDoku("12,8,4", 0.9, 0, 64);
    dokular.push(kontakDoku);

    const zemin = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ map: zeminDoku, color: 0xd8cdbd, roughness: 0.95 })
    );
    zemin.rotation.x = -Math.PI / 2;
    zemin.receiveShadow = true;
    scene.add(zemin);

    const yamaMat = new THREE.MeshStandardMaterial({ color: 0x8a7e6e, roughness: 0.92, flatShading: true });
    for (let i = -5; i <= 5; i++) {
      const tepe = new THREE.Mesh(
        new THREE.ConeGeometry(2.4 + Math.abs(i % 2) * 0.9, 4.2 + (i % 3) * 0.8, 6),
        yamaMat
      );
      tepe.position.set(i * 2.5, 1.8, -8.2 - Math.abs(i) * 0.3);
      tepe.rotation.y = i * 0.6;
      scene.add(tepe);
    }
    // Basamaklı ocak cephesi
    const cephe = new THREE.Group();
    for (let s = 0; s < 3; s++) {
      for (let i = 0; i < 7; i++) {
        const blok = new THREE.Mesh(
          new THREE.BoxGeometry(2.1, 1.1 + s * 0.2, 1.6),
          new THREE.MeshStandardMaterial({
            map: zeminDoku, color: new THREE.Color().setHSL(0.09, 0.12, 0.5 + ((i * 7 + s * 3) % 5) * 0.03), roughness: 0.93, flatShading: true,
          })
        );
        blok.position.set((i - 3) * 2.2 + s * 0.4, 0.55 + s * 1.05, -5.0 - s * 1.2);
        blok.rotation.y = (i % 3 - 1) * 0.06;
        blok.castShadow = true;
        blok.receiveShadow = true;
        cephe.add(blok);
      }
    }
    scene.add(cephe);

    // Kesilmiş taş yığını + ahşap sandık (sahneye yaşam)
    const kesikTasMat = new THREE.MeshStandardMaterial({ map: zeminDoku, color: 0xe6dccb, roughness: 0.9 });
    const yigin = new THREE.Group();
    [[0, 0], [0.62, 0], [0.31, 0.46], [0.0, 0.0]].forEach(([x, y], i) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.4, 0.4), kesikTasMat);
      b.position.set(x, 0.2 + (i === 2 ? 0.4 : 0) + (i === 3 ? 0.4 : 0), i === 3 ? 0.04 : 0);
      b.rotation.y = (i - 1.5) * 0.06;
      yigin.add(b);
    });
    yigin.position.set(-5.6, 0, 1.4);
    yigin.rotation.y = 0.5;
    golgeAc(yigin);
    scene.add(yigin);
    const sandik = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.55, 0.62),
      new THREE.MeshStandardMaterial({ map: ahsapDoku, color: 0xcaa073, roughness: 0.8 })
    );
    sandik.position.set(5.4, 0.28, 1.9);
    sandik.rotation.y = -0.4;
    golgeAc(sandik);
    scene.add(sandik);

    // 6 bağımsız kaya
    const kayalar = {};
    const rayHedefleri = [];
    for (const kKonum of KAYA_KONUMLARI_3D) {
      const kBilgi = noktalarRef.current.find((x) => x.id === kKonum.id) ?? {
        id: kKonum.id, renk: "#78716c", damarRenk: "#fbbf24", hazir: true,
      };
      const doku = kayaDokusuUret(kBilgi.renk);
      dokular.push(doku);
      const model = kayaKutlesiOlustur(kBilgi, doku, kontakDoku);
      model.kok.position.set(kKonum.x, 0, kKonum.z);
      model.kok.scale.setScalar(kKonum.olcek);
      model.govdeGrup.visible = Boolean(kBilgi.hazir);
      model.kalinti.visible = !kBilgi.hazir;
      scene.add(model.kok);
      kayalar[kKonum.id] = {
        ...model, x: kKonum.x, z: kKonum.z, olcek: kKonum.olcek,
        sarsinti: 0, sq: 0, flash: 0, belirme: 1, vurus: 0, cp: [0, 0], sonHazir: Boolean(kBilgi.hazir),
      };
      rayHedefleri.push(...model.tiklanabilirParcalar);
    }

    // 3D kazma
    const kazma = kazmaModeliOlustur(ahsapDoku);
    kazma.visible = false;
    scene.add(kazma);
    const kazmaDurum = { aktif: false, sure: 0, k: null, vurusNo: 0, vurdu: false, coz: null, pivot: new THREE.Vector3() };

    const parcacik = parcacikSistemiKur(scene, dokular);
    const toz = tozZerreleriKur(scene, dokular, { adet: 44, alan: [9, 2.8, 6], merkez: [0, 2.2, 0.5] });
    const sarsinti = sarsintiKur();
    const blokGeo = new THREE.DodecahedronGeometry(0.22, 0);

    const kayaPatlat = (k) => {
      k.govdeGrup.visible = false;
      k.kalinti.visible = true;
      k.vurus = 0;
      k.cp = [0, 0];
      k.catlaklar1.visible = false;
      k.catlaklar2.visible = false;
      for (let i = 0; i < 16; i++) {
        const m = new THREE.Mesh(blokGeo, k.anaMat);
        m.castShadow = true;
        m.scale.set(0.7 + Math.random() * 0.8, 0.6 + Math.random() * 0.7, 0.7 + Math.random() * 0.8);
        m.position.set(k.x + (Math.random() - 0.5) * 0.8, 0.45 + Math.random() * 0.7, k.z + (Math.random() - 0.5) * 0.8);
        const aci = (i / 16) * Math.PI * 2 + Math.random() * 0.4;
        const hiz = 2.2 + Math.random() * 3.4;
        parcacik.parca(m, [Math.cos(aci) * hiz, 3.4 + Math.random() * 3.5, Math.sin(aci) * hiz, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10], 1.5);
      }
      parcacik.kivilcim(k.x, 0.9, k.z + 0.2, 16, 1.25);
      parcacik.toz(k.x, 0.35, k.z, 7, 1.7);
      sarsinti.vur(0.34);
      sesCal("parcalanma");
    };

    // Darbe anı: kamera sarsıntısı, ezilme-uzama, parlama, kıvılcım ve toz
    const darbeEtkisi = () => {
      const d = kazmaDurum;
      if (d.vurdu || !d.k) return;
      d.vurdu = true;
      const k = d.k;
      if (d.vurusNo >= 3) {
        kayaPatlat(k);
      } else {
        k.sarsinti = 1;
        k.sq = 1;
        k.flash = 1;
        k.vurus = d.vurusNo;
        if (d.vurusNo >= 1) k.catlaklar1.visible = true;
        if (d.vurusNo >= 2) k.catlaklar2.visible = true;
        if (d.vurusNo === 1) k.cp[0] = 0;
        if (d.vurusNo === 2) k.cp[1] = 0;
        parcacik.kivilcim(k.x, 0.95, k.z + 0.5, 9);
        parcacik.toz(k.x, 0.4, k.z + 0.5, 3, 1.0);
        sarsinti.vur(0.14);
        sesCal("kazma");
      }
      d.coz?.();
      d.coz = null;
    };

    const kazmaSalla = (id, vurusNo) =>
      new Promise((coz) => {
        const k = kayalar[id];
        if (!k) {
          coz();
          return;
        }
        if (kazmaDurum.aktif) darbeEtkisi(); // önceki salınışın etkisini tamamla
        Object.assign(kazmaDurum, { aktif: true, sure: 0, k, vurusNo, vurdu: false, coz });
        kazmaDurum.pivot.set(k.x + 1.0, 0.78, k.z + 0.72);
        kazma.visible = true;
        // Emniyet: kare akışı durursa bile eylem takılı kalmasın
        window.setTimeout(() => {
          if (kazmaDurum.k === k && kazmaDurum.vurusNo === vurusNo) darbeEtkisi();
        }, 1100);
      });

    sahneApiRef.current = {
      kayalar,
      kazmaSalla,
      kayaDurumu: (id, hazir) => {
        const k = kayalar[id];
        if (!k || k.sonHazir === hazir) return;
        k.sonHazir = hazir;
        k.vurus = 0;
        k.govdeGrup.visible = hazir;
        k.kalinti.visible = !hazir;
        k.catlaklar1.visible = false;
        k.catlaklar2.visible = false;
        k.cp = [0, 0];
        if (hazir) k.belirme = 0; // yeniden oluşurken yumuşakça büyür
      },
      kayaGeriGetir: (id) => {
        const k = kayalar[id];
        if (!k) return;
        k.govdeGrup.visible = true;
        k.kalinti.visible = false;
        k.belirme = 0;
      },
    };

    // Dokunma / tıklama: yalnız görünür kayalar hedeflenir
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const fareVek = new THREE.Vector2();
    const tuvalTikla = (e) => {
      if (e.isPrimary === false) return;
      const rect = renderer.domElement.getBoundingClientRect();
      fareVek.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      fareVek.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(fareVek, camera);
      const gorunur = rayHedefleri.filter((m) => kayalar[m.userData.kayaId]?.govdeGrup.visible);
      const kesisimler = raycaster.intersectObjects(gorunur, false);
      if (kesisimler.length > 0) darbeRef.current?.(kesisimler[0].object.userData.kayaId);
    };
    renderer.domElement.addEventListener("pointerdown", tuvalTikla);

    const boyutIptal = boyutlandirici(el, renderer, camera);
    aspectUyarla();
    const boyutDinle = () => aspectUyarla();
    window.addEventListener("resize", boyutDinle);
    const ro2 = new ResizeObserver(boyutDinle);
    ro2.observe(el);

    const olcer = zamanOlcerKur(yazilimGl);
    const zamanlayici = kareZamanlayiciOlustur(gl, yazilimGl);

    const ciz = () => {
      const dt = olcer.guncelle();
      const t = olcer.gecen();

      // Kazma: kaldır (ease-out) → hızlı iniş (ease-in) → geri tepme (ease-out)
      if (kazmaDurum.aktif) {
        kazmaDurum.sure += dt;
        const s = kazmaDurum.sure;
        let aci;
        let boy = 1;
        if (s < 0.3) {
          const u = easeOutCubic(s / 0.3);
          aci = lerp(-0.45, -1.05, u);
          boy = lerp(0.85, 1, u);
        } else if (s < KAZMA_VURUS_ZAMANI) {
          aci = lerp(-1.05, 1.18, easeInCubic((s - 0.3) / (KAZMA_VURUS_ZAMANI - 0.3)));
        } else {
          aci = lerp(1.18, 0.9, easeOutCubic(Math.min(1, (s - KAZMA_VURUS_ZAMANI) / (KAZMA_SURE - KAZMA_VURUS_ZAMANI))));
        }
        if (s >= KAZMA_VURUS_ZAMANI && !kazmaDurum.vurdu) darbeEtkisi();
        kazma.position.copy(kazmaDurum.pivot);
        kazma.rotation.set(0.12, -0.3, aci);
        kazma.scale.setScalar(boy);
        if (s >= KAZMA_SURE) {
          kazmaDurum.aktif = false;
          kazma.visible = false;
        }
      }

      // Kayalar: sarsıntı, ezilme-uzama (yaylı), parlama, çatlak belirme, yeniden büyüme
      for (const k of Object.values(kayalar)) {
        k.sarsinti = Math.max(0, k.sarsinti - dt * 3.4);
        const salinim = Math.sin(t * 62) * 0.1 * k.sarsinti * k.sarsinti;
        k.govdeGrup.position.x = salinim;
        k.govdeGrup.rotation.z = salinim * 0.5;
        k.sq = Math.max(0, k.sq - dt * 3.2);
        const yay = Math.sin((1 - k.sq) * 18) * k.sq;
        k.belirme = Math.min(1, k.belirme + dt * 2.2);
        const dogus = k.belirme < 1 ? easeOutBack(k.belirme) : 1;
        k.govdeGrup.scale.set(
          (1 + 0.09 * yay) * dogus,
          (1 - 0.16 * yay) * dogus,
          (1 + 0.09 * yay) * dogus
        );
        k.flash = Math.max(0, k.flash - dt * 5.5);
        k.anaMat.emissiveIntensity = k.flash * 0.4;
        for (let i = 0; i < 2; i++) {
          const g = i === 0 ? k.catlaklar1 : k.catlaklar2;
          if (g.visible) {
            k.cp[i] = Math.min(1, k.cp[i] + dt * 5);
            g.scale.setScalar(Math.max(0.01, easeOutBack(k.cp[i])));
          }
        }
      }

      parcacik.guncelle(dt);
      toz.guncelle(t, dt);
      bulutGrubu.rotation.y += dt * 0.004;
      // Kamera: hafif nefes + darbe sarsıntısı
      const taban = { x: kameraTaban.x + Math.sin(t * 0.4) * 0.04, y: kameraTaban.y + Math.sin(t * 0.6) * 0.03, z: kameraTaban.z };
      sarsinti.uygula(camera, taban, dt);
      camera.lookAt(0, 0.5, 0.1);

      renderer.render(scene, camera);
      zamanlayici.sonraki(ciz);
    };
    ciz();

    return () => {
      zamanlayici.iptal();
      boyutIptal();
      window.removeEventListener("resize", boyutDinle);
      ro2.disconnect();
      renderer.domElement.removeEventListener("pointerdown", tuvalTikla);
      kazmaDurum.coz?.();
      sahneApiRef.current = null;
      olcer.birak();
      sahneTemizle(scene, renderer, dokular, [blokGeo, { dispose: parcacik.birak }]);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="tezhip rounded-2xl px-4 py-3 text-xs font-bold text-amber-100">{aktifMesaj}</div>

      {/* 3D WebGL Taş Ocağı Sahnesi */}
      <div className="relative aspect-[16/9] kisa:aspect-auto kisa:h-[calc(100dvh-4.5rem)] w-full overflow-hidden rounded-3xl bg-stone-950 shadow-2xl ring-2 ring-amber-500/40 max-sm:aspect-[4/5]">
        <div ref={kapsayiciRef} className="h-full w-full cursor-crosshair" />
        <div className="ust-levha pointer-events-none absolute top-3 left-3 rounded-xl px-3 py-1.5 text-[11px] font-black text-amber-200">
          ⛰️ Taş Ocağı · Kayaya dokun, 3 darbede parçalanır
        </div>
      </div>

      {/* 6 bağımsız kaya durum kartları */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {noktalar.map((k) => {
          const vurus = vurusSayilari[k.id] ?? 0;
          return (
            <button
              key={k.id}
              type="button"
              disabled={!k.hazir || isleniyorId != null}
              onClick={() => kayaDarbeVur(k.id)}
              className={`flex flex-col items-center rounded-2xl p-2.5 text-center transition ${
                k.hazir ? "ust-levha text-amber-100 hover:brightness-125" : "bg-stone-950/75 text-stone-500 ring-1 ring-stone-800"
              }`}
            >
              <span className="text-[11px] font-black">{k.ad}</span>
              <span className="mt-1 text-[10px] font-bold">
                {k.hazir ? (
                  <span className="text-emerald-300">⛏️ {vurus > 0 ? `Çatladı (${vurus}/3)` : `Sağlam (+${k.miktar} 🧱)`}</span>
                ) : (
                  <span>⏳ ~{k.kalanDakika} dk</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================
// 2. ORMAN KEŞİF HARİTASI (İşçi × 2 Sefer) & 3D KURUMUŞ AĞAÇ KESME SAHNESİ
// =============================================================
function isinDokusuUret() {
  const [c, ctx] = tuvalYap(32, 128);
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "rgba(255,236,190,0.9)");
  g.addColorStop(1, "rgba(255,236,190,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function otTutamiDokusuUret() {
  const [c, ctx] = tuvalYap(64, 64);
  for (let i = 0; i < 9; i++) {
    const x = 8 + i * 6 + (Math.random() - 0.5) * 4;
    ctx.strokeStyle = i % 2 ? "#7ea64a" : "#4f7a2c";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, 62);
    ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 14, 36, x + (Math.random() - 0.5) * 22, 6 + Math.random() * 18);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function KurumusAgac3DSahnesi({ bolgeAd, odulMiktar, onKesimTamam, bekliyor }) {
  const kapsayiciRef = useRef(null);
  const sahneApiRef = useRef(null);
  const [vurus, setVurus] = useState(0);
  const [devrildi, setDevrildi] = useState(false);
  const [istekSuruyor, setIstekSuruyor] = useState(false);
  const [hata, setHata] = useState(false);

  const vurusRef = useRef(0);
  const istekRef = useRef(false);
  const kesimRef = useRef(onKesimTamam);
  useEffect(() => {
    kesimRef.current = onKesimTamam;
  }, [onKesimTamam]);

  // Ödül isteği: tek seferde bir kez; hata olursa "Tekrar dene" açılır
  const kesimiBitir = useCallback(async () => {
    if (istekRef.current) return;
    istekRef.current = true;
    setIstekSuruyor(true);
    setHata(false);
    try {
      const sonuc = await kesimRef.current?.();
      if (!sonuc) setHata(true);
    } finally {
      istekRef.current = false;
      setIstekSuruyor(false);
    }
  }, []);

  const baltaVur = useCallback(() => {
    if (vurusRef.current >= 3) return;
    vurusRef.current += 1;
    const yeni = vurusRef.current;
    setVurus(yeni);
    if (yeni >= 3) setDevrildi(true);
    sahneApiRef.current?.baltaSalla(yeni);
  }, []);

  const baltaRef = useRef(baltaVur);
  useEffect(() => {
    baltaRef.current = baltaVur;
  }, [baltaVur]);
  const bitirRef = useRef(kesimiBitir);
  useEffect(() => {
    bitirRef.current = kesimiBitir;
  }, [kesimiBitir]);

  useEffect(() => {
    const el = kapsayiciRef.current;
    if (!el) return;

    const { renderer, gl, yazilimGl } = rendererKur(el);
    const scene = new THREE.Scene();
    const dokular = [];
    const { kubbe, bulutGrubu } = gokKubbesiKur(scene, dokular, {
      ust: 0x5f94b8, orta: 0xb4cfc4, ufuk: 0xe2e3b8, sisYakin: 9, sisUzak: 34, bulut: 5,
    });
    ortamHaritasiKur(renderer, scene, kubbe, 0.55);
    isikKur(scene, { poz: [5, 9, 6], hedef: [0, 1, 0], yaricap: 6.5, golgeBoyut: yazilimGl ? 512 : 1024, siddet: 2.5 });
    renderer.toneMappingExposure = 1.05;

    const camera = new THREE.PerspectiveCamera(42, (el.clientWidth || 800) / (el.clientHeight || 450), 0.1, 70);
    const kameraHedef = new THREE.Vector3(0, 1.65, 0);
    const kameraTaban = new THREE.Vector3();
    const kameraBaz = new THREE.Vector3(0, 2.9, 7.6);
    const kameraUyarla = () => {
      const k = camera.aspect < 1.5 ? clamp(1.45 / camera.aspect, 1, 2) : 1;
      kameraTaban.copy(kameraHedef).addScaledVector(kameraBaz.clone().sub(kameraHedef), k);
    };

    const kabukDoku = kabukDokusuUret();
    const otDoku = otDokusuUret();
    const tutamDoku = otTutamiDokusuUret();
    const isinDoku = isinDokusuUret();
    dokular.push(kabukDoku, otDoku, tutamDoku, isinDoku);

    // Orman açıklığı zemini
    otDoku.repeat.set(36, 36);
    const zemin = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ map: otDoku, color: 0xcfe0a6, roughness: 0.96 })
    );
    zemin.rotation.x = -Math.PI / 2;
    zemin.receiveShadow = true;
    scene.add(zemin);

    // Arka plan çam ormanı (rüzgârla hafifçe sallanır)
    const camMat = new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.88, flatShading: true });
    const camMat2 = new THREE.MeshStandardMaterial({ color: 0x3f7d3f, roughness: 0.88, flatShading: true });
    const govdeArkaMat = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.9 });
    const kutukGeo = new THREE.CylinderGeometry(0.14, 0.2, 1.2, 6);
    const tac1Geo = new THREE.ConeGeometry(0.95, 2.2, 7);
    const tac2Geo = new THREE.ConeGeometry(0.7, 1.8, 7);
    const tac3Geo = new THREE.ConeGeometry(0.5, 1.4, 7);
    const agaclar = [];
    for (let i = -6; i <= 6; i++) {
      if (Math.abs(i) < 1) continue;
      for (let sira = 0; sira < 2; sira++) {
        const g = new THREE.Group();
        const kutuk = new THREE.Mesh(kutukGeo, govdeArkaMat);
        kutuk.position.y = 0.6;
        const tac1 = new THREE.Mesh(tac1Geo, sira ? camMat2 : camMat);
        tac1.position.y = 2.0;
        const tac2 = new THREE.Mesh(tac2Geo, sira ? camMat2 : camMat);
        tac2.position.y = 3.1;
        const tac3 = new THREE.Mesh(tac3Geo, sira ? camMat2 : camMat);
        tac3.position.y = 4.0;
        g.add(kutuk, tac1, tac2, tac3);
        const olcek = 0.85 + ((i * 13 + sira * 5) % 7) / 14;
        g.scale.setScalar(olcek);
        g.position.set(i * 1.75 + sira * 0.9, 0, -3.4 - sira * 2.6 - (Math.abs(i) % 2) * 0.9);
        golgeAc(g, true, false);
        scene.add(g);
        agaclar.push({ g, faz: i * 0.7 + sira });
      }
    }

    // Çim tutamları (kesişen iki düzlem; rüzgârda sallanır)
    const tutamGeo = new THREE.PlaneGeometry(0.7, 0.55);
    const tutamMat = new THREE.MeshStandardMaterial({ map: tutamDoku, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 1 });
    const tutamlar = [];
    for (let i = 0; i < 44; i++) {
      const g = new THREE.Group();
      const a = new THREE.Mesh(tutamGeo, tutamMat);
      const b = new THREE.Mesh(tutamGeo, tutamMat);
      a.position.y = b.position.y = 0.26;
      b.rotation.y = Math.PI / 2;
      g.add(a, b);
      const aci = Math.random() * Math.PI * 2;
      const r = 1.6 + Math.random() * 7;
      g.position.set(Math.cos(aci) * r * 1.3, 0, Math.sin(aci) * r * 0.55 - 0.4);
      g.scale.setScalar(0.8 + Math.random() * 0.8);
      scene.add(g);
      tutamlar.push({ g, faz: Math.random() * 6 });
    }

    // Işık huzmeleri (ağaç aralarından)
    const huzmeMat = new THREE.MeshBasicMaterial({
      map: isinDoku, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
    });
    const huzmeler = [];
    for (let i = 0; i < 4; i++) {
      const h = new THREE.Mesh(new THREE.PlaneGeometry(1.1 + (i % 2) * 0.7, 9), huzmeMat);
      h.position.set(-3 + i * 2.1, 4.2, -2.6 - (i % 2));
      h.rotation.set(0, 0.2, 0.28);
      scene.add(h);
      huzmeler.push(h);
    }

    // Süzülen yapraklar
    const yaprakGeo = new THREE.PlaneGeometry(0.13, 0.09);
    const yaprakMatlar = [0xc9892b, 0x8aa83a, 0xb4531e].map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, side: THREE.DoubleSide })
    );
    const yapraklar = [];
    for (let i = 0; i < 14; i++) {
      const y = new THREE.Mesh(yaprakGeo, yaprakMatlar[i % 3]);
      scene.add(y);
      yapraklar.push({
        y, faz: Math.random() * 6.28, hiz: 0.25 + Math.random() * 0.25,
        x: (Math.random() - 0.5) * 8, z: -2 + Math.random() * 4, h: Math.random() * 4,
      });
    }

    const toz = tozZerreleriKur(scene, dokular, { adet: 40, alan: [6, 2.5, 3], merkez: [0, 2.2, 0] });
    const parcacik = parcacikSistemiKur(scene, dokular);
    const sarsinti = sarsintiKur();

    // Merkezdeki kurumuş ağaç
    const kuruMat = new THREE.MeshStandardMaterial({ map: kabukDoku, color: 0xf0e4d2, roughness: 0.92, flatShading: true });
    const icOdunMat = new THREE.MeshStandardMaterial({ color: 0xf0d79a, roughness: 0.7 });

    const altKutuk = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.5, 0.78, 10), kuruMat);
    altKutuk.position.y = 0.39;
    scene.add(altKutuk);
    const koklar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.78, 0.14, 10), kuruMat);
    koklar.position.y = 0.07;
    scene.add(koklar);

    const centik = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.52), icOdunMat);
    centik.position.set(0.22, 0.74, 0);
    centik.visible = false;
    scene.add(centik);

    const mentese = new THREE.Group();
    mentese.position.set(-0.18, 0.76, 0);
    scene.add(mentese);

    const ustGovde = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 2.85, 10), kuruMat);
    ustGovde.position.set(0.18, 1.42, 0);
    mentese.add(ustGovde);

    const dalBilgileri = [
      { y: 1.9, rotZ: -0.78, rotY: 0.3, boy: 1.3 },
      { y: 2.25, rotZ: 0.72, rotY: -0.4, boy: 1.2 },
      { y: 2.55, rotZ: -0.58, rotY: 1.4, boy: 1.0 },
      { y: 2.75, rotZ: 0.62, rotY: 2.3, boy: 0.95 },
    ];
    for (const d of dalBilgileri) {
      const dal = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, d.boy, 7), kuruMat);
      dal.position.set(0.18, d.y, 0);
      dal.rotation.z = d.rotZ;
      dal.rotation.y = d.rotY;
      dal.translateY(d.boy * 0.42);
      mentese.add(dal);
    }
    golgeAc(altKutuk);
    golgeAc(koklar, false, true);
    golgeAc(mentese);

    // Büyük, görünmez dokunma alanı (parmakla kolay isabet)
    const tiklaVekil = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.0, 3.6, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    tiklaVekil.position.y = 1.8;
    scene.add(tiklaVekil);

    // Odunculuk baltası (çelik başlık metal, sap ahşap)
    const ahsapDoku = ahsapDokusuUret("#8a5a2e");
    dokular.push(ahsapDoku);
    const balta = new THREE.Group();
    const sap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.065, 1.35, 10),
      new THREE.MeshStandardMaterial({ map: ahsapDoku, color: 0xd6b28a, roughness: 0.72 })
    );
    sap.position.y = 0.65;
    const bas = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.28, 0.09),
      new THREE.MeshStandardMaterial({ color: 0x59636e, metalness: 0.85, roughness: 0.34 })
    );
    bas.position.set(-0.18, 1.2, 0);
    const agiz = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.34, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.18 })
    );
    agiz.position.set(-0.42, 1.2, 0);
    balta.add(sap, bas, agiz);
    golgeAc(balta, true, false);
    balta.visible = false;
    scene.add(balta);

    const yongaGeo = new THREE.BoxGeometry(0.13, 0.05, 0.08);
    const baltaDurum = {
      aktif: false, sure: 0, vurdu: false, darbeNo: 0,
      devriliyor: false, aci: 0, omega: 0, yere: false, sekme: 0, bitti: false, bitisTimer: 0,
    };
    let agacSarsinti = 0;

    const yongaFirlat = (adet, guc = 1) => {
      for (let i = 0; i < adet; i++) {
        const m = new THREE.Mesh(yongaGeo, icOdunMat);
        m.castShadow = true;
        m.position.set(0.28, 0.82, (Math.random() - 0.5) * 0.3);
        m.scale.setScalar(0.7 + Math.random() * 0.8);
        parcacik.parca(
          m,
          [(1.4 + Math.random() * 2.8) * guc, (1.8 + Math.random() * 2.6) * guc, (Math.random() - 0.5) * 2.6, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, 0.04],
          0.9, 13, 0.3
        );
      }
    };

    const darbeEtkisi = () => {
      if (baltaDurum.vurdu) return;
      baltaDurum.vurdu = true;
      const no = baltaDurum.darbeNo;
      centik.visible = true;
      centik.scale.set(1, no * 0.75, 1);
      yongaFirlat(no >= 3 ? 20 : 11, no >= 3 ? 1.2 : 1);
      parcacik.toz(0.3, 0.8, 0.1, no >= 3 ? 5 : 3, 0.9, 0xcdb88c);
      agacSarsinti = 1;
      sarsinti.vur(no >= 3 ? 0.2 : 0.12);
      sesCal(no >= 3 ? "devrilme" : "balta");
      if (no >= 3) {
        baltaDurum.devriliyor = true;
        baltaDurum.omega = 0.15;
        baltaDurum.bitisTimer = 3.2; // emniyet: düşüş animasyonu ne olursa olsun ödül istenir
      }
    };

    sahneApiRef.current = {
      baltaSalla: (darbeNo) => {
        if (baltaDurum.aktif && !baltaDurum.vurdu) darbeEtkisi();
        Object.assign(baltaDurum, { aktif: true, sure: 0, vurdu: false, darbeNo });
        balta.visible = true;
        window.setTimeout(() => {
          if (baltaDurum.darbeNo === darbeNo) darbeEtkisi();
        }, 1000);
      },
    };

    const raycaster = new THREE.Raycaster();
    const fare = new THREE.Vector2();
    const tikla = (e) => {
      if (e.isPrimary === false) return;
      const r = renderer.domElement.getBoundingClientRect();
      fare.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      fare.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(fare, camera);
      if (raycaster.intersectObjects([tiklaVekil, altKutuk, ...mentese.children], false).length > 0) {
        baltaRef.current?.();
      }
    };
    renderer.domElement.addEventListener("pointerdown", tikla);

    const boyutIptal = boyutlandirici(el, renderer, camera);
    const ro2 = new ResizeObserver(kameraUyarla);
    ro2.observe(el);
    window.addEventListener("resize", kameraUyarla);
    kameraUyarla();

    const olcer = zamanOlcerKur(yazilimGl);
    const zamanlayici = kareZamanlayiciOlustur(gl, yazilimGl);
    const KAZMA = { x: 1.15, y: 0.6, z: 0.42 };

    const ciz = () => {
      const dt = olcer.guncelle();
      const t = olcer.gecen();

      // Balta: geri çek (ease-out) → hızlı iniş (ease-in) → geri tepme
      if (baltaDurum.aktif) {
        baltaDurum.sure += dt;
        const s = baltaDurum.sure;
        let aci;
        if (s < 0.28) aci = lerp(-0.25, -0.95, easeOutCubic(s / 0.28));
        else if (s < 0.4) aci = lerp(-0.95, 1.32, easeInCubic((s - 0.28) / 0.12));
        else aci = lerp(1.32, 1.05, easeOutCubic(Math.min(1, (s - 0.4) / 0.2)));
        if (s >= 0.4 && !baltaDurum.vurdu) darbeEtkisi();
        balta.position.set(KAZMA.x, KAZMA.y, KAZMA.z);
        balta.rotation.set(0.1, -0.35, aci);
        if (s >= 0.6) {
          baltaDurum.aktif = false;
          balta.visible = false;
        }
      }

      // Ağaç: darbede yaylı sarsılma; son darbede devrilme (hızlanarak) + yere çarpıp sekme
      if (baltaDurum.devriliyor) {
        const hedef = Math.PI / 2.06;
        if (!baltaDurum.yere) {
          baltaDurum.omega += 5.2 * (0.3 + Math.sin(baltaDurum.aci) * 1.3) * dt + 0.9 * dt;
          baltaDurum.aci = Math.min(hedef, baltaDurum.aci + baltaDurum.omega * dt);
          if (baltaDurum.aci >= hedef) {
            baltaDurum.yere = true;
            baltaDurum.sekme = 1;
            parcacik.toz(-2.7, 0.2, 0, 6, 1.6, 0xcdb88c);
            parcacik.toz(-3.3, 0.2, 0.3, 4, 1.3, 0xcdb88c);
            sarsinti.vur(0.3);
            sesCal("devrilme");
          }
        } else {
          baltaDurum.sekme = Math.max(0, baltaDurum.sekme - dt * 2.2);
          baltaDurum.aci = hedef - Math.sin((1 - baltaDurum.sekme) * 14) * 0.05 * baltaDurum.sekme;
          if (baltaDurum.sekme <= 0 && !baltaDurum.bitti) {
            baltaDurum.bitti = true;
            window.setTimeout(() => bitirRef.current?.(), 450);
          }
        }
        mentese.rotation.z = baltaDurum.aci;
        mentese.position.y = 0.76 - 0.5 * smootherstep(baltaDurum.aci / (Math.PI / 2.06), 0.2, 1);
        baltaDurum.bitisTimer -= dt;
        if (baltaDurum.bitisTimer <= 0 && !baltaDurum.bitti) {
          baltaDurum.bitti = true;
          bitirRef.current?.();
        }
      } else {
        agacSarsinti = Math.max(0, agacSarsinti - dt * 2.6);
        mentese.rotation.z = Math.sin(t * 52) * 0.06 * agacSarsinti * agacSarsinti + Math.sin(t * 0.9) * 0.002;
      }

      // Ortam hareketi
      for (const a of agaclar) a.g.rotation.z = Math.sin(t * 0.7 + a.faz) * 0.012;
      for (const o of tutamlar) o.g.rotation.z = Math.sin(t * 1.3 + o.faz) * 0.1;
      huzmeler.forEach((h, i) => {
        h.material.opacity = 0.1;
        h.position.x += Math.sin(t * 0.2 + i) * 0.0015;
      });
      for (const y of yapraklar) {
        y.h -= y.hiz * dt;
        if (y.h < 0) y.h = 4.4;
        y.y.position.set(y.x + Math.sin(t * 0.8 + y.faz) * 0.7, y.h, y.z + Math.cos(t * 0.6 + y.faz) * 0.5);
        y.y.rotation.set(t * 1.6 + y.faz, t * 1.1, t * 0.9 + y.faz);
      }
      bulutGrubu.rotation.y += dt * 0.004;
      toz.guncelle(t, dt);
      parcacik.guncelle(dt);

      sarsinti.uygula(camera, kameraTaban, dt);
      camera.lookAt(kameraHedef);

      renderer.render(scene, camera);
      zamanlayici.sonraki(ciz);
    };
    ciz();

    return () => {
      zamanlayici.iptal();
      boyutIptal();
      ro2.disconnect();
      window.removeEventListener("resize", kameraUyarla);
      renderer.domElement.removeEventListener("pointerdown", tikla);
      sahneApiRef.current = null;
      olcer.birak();
      sahneTemizle(scene, renderer, dokular, [yongaGeo, { dispose: parcacik.birak }]);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="tezhip flex flex-col gap-3 rounded-2xl px-4 py-3 text-xs text-amber-100 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <span className="font-black text-amber-300">🪓 Kurumuş ağaç bulundu: {bolgeAd}</span>
          <p className="mt-0.5 text-amber-100/85">
            {hata
              ? "Tahtalar toplanamadı. Bir daha dene."
              : devrildi
              ? istekSuruyor
                ? "Ağaç devrildi, tahtalar toplanıyor…"
                : "Ağaç devriliyor…"
              : `Ağacın gövdesine veya düğmeye dokunarak baltayla 3 kez vur (+${odulMiktar} 🌲 tahta).`}
          </p>
        </div>
        {hata ? (
          <button
            type="button"
            disabled={bekliyor || istekSuruyor}
            onClick={kesimiBitir}
            className="varak-dugme rounded-2xl px-5 py-2.5 text-xs max-sm:w-full"
          >
            🌲 Tahtaları Tekrar Topla
          </button>
        ) : (
          <button
            type="button"
            disabled={devrildi}
            onClick={baltaVur}
            className="varak-dugme rounded-2xl px-5 py-2.5 text-xs max-sm:w-full"
          >
            {devrildi ? "🌲 Ağaç Devrildi" : `🪓 Balta Vur (${vurus}/3)`}
          </button>
        )}
      </div>

      <div className="relative aspect-[16/9] kisa:aspect-auto kisa:h-[calc(100dvh-4.5rem)] w-full overflow-hidden rounded-3xl bg-stone-950 shadow-2xl ring-2 ring-amber-500/40 max-sm:aspect-[4/5]">
        <div ref={kapsayiciRef} className="h-full w-full cursor-pointer" />
      </div>
    </div>
  );
}

export function OrmanKesifVeKesimSahnesi({ oyun }) {
  const sefer = oyun.ormanSefer();
  const [acilanSonuclar, setAcilanSonuclar] = useState({});
  const [aramaYapiliyorId, setAramaYapiliyorId] = useState(null);
  const [bilgiNotu, setBilgiNotu] = useState(
    "🧭 Orman Keşif Haritası: Görevli her oduncu için günlük 2 sefer (arama) hakkın vardır. Bir bölgeye tıklayıp kurumuş ağaç ara!"
  );

  const aktifBolgeBilgisi =
    sefer.aktifBolge >= 0 ? ORMAN_KESIF_BOLGELERI.find((b) => b.id === sefer.aktifBolge) : null;

  const aramaKilidiRef = useRef(false);
  const bolgeAra = async (bolge) => {
    if (aramaKilidiRef.current || oyun.bekliyor || aramaYapiliyorId != null) return;
    if ((sefer.maske & (1 << bolge.id)) !== 0) return;

    if (sefer.kalanSefer <= 0) {
      setBilgiNotu(
        `⚠️ Bugünkü tüm keşif seferlerini (${sefer.maksSefer}/${sefer.maksSefer}) tamamladın! Yukarıdan yeni kalıcı oduncu görevlendirerek anında +2 sefer hakkı kazanabilirsin.`
      );
      return;
    }

    aramaKilidiRef.current = true;
    setAramaYapiliyorId(bolge.id);
    let sonuc = null;
    try {
      sonuc = await oyun.ormanKesif(bolge.id);
    } finally {
      aramaKilidiRef.current = false;
      setAramaYapiliyorId(null);
    }

    if (sonuc) {
      setAcilanSonuclar((prev) => ({ ...prev, [bolge.id]: sonuc.agacTuru }));
      setBilgiNotu(sonuc.mesaj);
    }
  };

  if (aktifBolgeBilgisi) {
    return (
      <KurumusAgac3DSahnesi
        bolgeAd={aktifBolgeBilgisi.ad}
        odulMiktar={sefer.agacOdulu}
        bekliyor={oyun.bekliyor}
        onKesimTamam={async () => {
          const s = await oyun.ormanAgacKes();
          if (s?.mesaj) setBilgiNotu(s.mesaj);
          return s;
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Sefer Hakkı & Bilgi Çubuğu */}
      <div className="tezhip flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3">
        <p className="text-xs font-bold text-amber-100">{bilgiNotu}</p>
        <div className="flex items-center gap-2">
          <span className="ust-levha rounded-xl px-3 py-1.5 text-xs font-black text-emerald-300">
            🧭 Kalan Keşif Seferi: {sefer.kalanSefer} / {sefer.maksSefer} ({sefer.isci} İşçi × 2)
          </span>
        </div>
      </div>

      {/* İnteraktif Orman Keşif Haritası */}
      <div className="relative aspect-[16/9] kisa:aspect-auto kisa:h-[calc(100dvh-4.5rem)] w-full overflow-hidden rounded-3xl bg-stone-950 shadow-2xl ring-2 ring-amber-500/40 select-none max-sm:aspect-[3/4]">
        <img
          src="/assets/mekanlar/orman_sahne.webp"
          alt="Orman Keşif Haritası"
          draggable={false}
          className="h-full w-full object-cover brightness-90"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at center, rgba(16,38,20,0.18) 0%, rgba(10,24,14,0.62) 100%)",
          }}
        />

        {/* Keşif Bölgeleri (12 Nokta) */}
        {ORMAN_KESIF_BOLGELERI.map((b) => {
          const acildi = (sefer.maske & (1 << b.id)) !== 0;
          const sonucTuru = acilanSonuclar[b.id];
          const araniyor = aramaYapiliyorId === b.id;

          return (
            <button
              key={b.id}
              type="button"
              disabled={acildi || oyun.bekliyor || sefer.kalanSefer <= 0}
              onClick={() => bolgeAra(b)}
              style={{ left: `${b.x}%`, top: `${b.y}%` }}
              className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 transition duration-200 hover:scale-110 disabled:cursor-default disabled:hover:scale-100"
            >
              <div
                className={`flex flex-col items-center rounded-2xl px-3 py-2 text-center shadow-xl ring-2 ${
                  araniyor
                    ? "animate-pulse bg-amber-500 text-stone-950 ring-white"
                    : acildi
                    ? sonucTuru === "kurumus"
                      ? "bg-amber-950/90 text-amber-200 ring-amber-500/60"
                      : "bg-emerald-950/90 text-emerald-200 ring-emerald-500/60"
                    : sefer.kalanSefer > 0
                    ? "bg-stone-950/90 text-amber-100 ring-amber-400 hover:bg-stone-900"
                    : "bg-stone-950/75 text-stone-500 ring-stone-700"
                }`}
              >
                <span className="text-lg sm:text-xl">
                  {araniyor
                    ? "🧭"
                    : acildi
                    ? sonucTuru === "kurumus"
                      ? "🪵✅"
                      : "🌲🌿"
                    : "🔍"}
                </span>
                <span className="text-[10px] font-black whitespace-nowrap sm:text-[11px]">{b.ad}</span>
                <span className="text-[9px] font-bold opacity-85">
                  {araniyor
                    ? "Aranıyor…"
                    : acildi
                    ? sonucTuru === "kurumus"
                      ? "Kesildi"
                      : "Yaş Ağaç (Kesilmez)"
                    : sefer.kalanSefer > 0
                    ? "Keşfet (1 Sefer)"
                    : "Sefer Bitti"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


// =============================================================
// 3. TARLA BİRİNCİ ŞAHIS (FPS / 3D) SU İBRİĞİ SULAMA & ELLE HASAT OYUNU
// =============================================================
function bitkiModeliOlustur(tur, indeks) {
  const kok = new THREE.Group();
  const fideGrup = new THREE.Group();
  kok.add(fideGrup);

  const sapMat = new THREE.MeshStandardMaterial({ color: 0x3f9a58, roughness: 0.7 });
  const yaprakMat = new THREE.MeshStandardMaterial({ color: 0x2f8f3f, roughness: 0.66, side: THREE.DoubleSide });

  const govde = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.52, 8), sapMat);
  govde.position.y = 0.26;
  fideGrup.add(govde);

  for (let i = 0; i < 5; i++) {
    const yaprak = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), yaprakMat);
    yaprak.scale.set(1.4, 0.26, 0.85);
    const aci = (i * Math.PI * 2) / 5 + 0.4;
    yaprak.position.set(Math.cos(aci) * 0.17, 0.2 + (i % 2) * 0.15, Math.sin(aci) * 0.17);
    yaprak.rotation.y = -aci;
    yaprak.rotation.z = 0.35;
    fideGrup.add(yaprak);
  }

  if (tur === "domates") {
    const herek = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.026, 0.85, 6),
      new THREE.MeshStandardMaterial({ color: 0x8a5a2e, roughness: 0.88 })
    );
    herek.position.set(-0.07, 0.42, -0.04);
    kok.add(herek);
  }

  const meyveGrup = new THREE.Group();
  let meyveGeo;
  let meyveMat;
  if (tur === "domates") {
    meyveGeo = new THREE.SphereGeometry(0.145, 16, 12);
    meyveMat = new THREE.MeshStandardMaterial({ color: 0xd2321f, roughness: 0.28, metalness: 0.04 });
  } else if (tur === "bugday") {
    meyveGeo = new THREE.ConeGeometry(0.09, 0.36, 8);
    meyveMat = new THREE.MeshStandardMaterial({ color: 0xe3b32b, roughness: 0.55 });
  } else if (tur === "salatalik") {
    meyveGeo = new THREE.CapsuleGeometry(0.065, 0.22, 6, 10);
    meyveMat = new THREE.MeshStandardMaterial({ color: 0x2f9e4a, roughness: 0.4 });
  } else if (tur === "biber") {
    meyveGeo = new THREE.ConeGeometry(0.075, 0.28, 10);
    meyveMat = new THREE.MeshStandardMaterial({ color: 0xe8591a, roughness: 0.3 });
  } else if (tur === "karpuz") {
    meyveGeo = new THREE.SphereGeometry(0.21, 14, 12);
    meyveGeo.scale(1.22, 0.92, 1.0);
    meyveMat = new THREE.MeshStandardMaterial({ color: 0x1f6b36, roughness: 0.34 });
  } else {
    meyveGeo = new THREE.CylinderGeometry(0.075, 0.09, 0.28, 10);
    meyveMat = new THREE.MeshStandardMaterial({ color: 0xf2a516, roughness: 0.45 });
  }

  const anaMeyve = new THREE.Mesh(meyveGeo, meyveMat);
  if (tur === "biber") anaMeyve.rotation.x = Math.PI;
  anaMeyve.castShadow = true;
  anaMeyve.userData = { bitkiIndeks: indeks };
  meyveGrup.add(anaMeyve);

  meyveGrup.position.set(0.08, tur === "karpuz" ? 0.2 : 0.42, 0.1);
  meyveGrup.scale.setScalar(0.01);
  kok.add(meyveGrup);

  // Parmakla kolay isabet için görünmez büyük dokunma alanı
  const proxy = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  proxy.position.copy(meyveGrup.position);
  proxy.userData = { bitkiIndeks: indeks };
  kok.add(proxy);

  fideGrup.scale.setScalar(0.45);
  golgeAc(fideGrup, true, false);
  return { kok, fideGrup, meyveGrup, anaMeyve, proxy };
}

function bakirIbrikOlustur() {
  const ibrikKok = new THREE.Group();

  // Gerçek bakır: yüksek metalik, sıcak turuncu-kırmızı; yansıma gökyüzü haritasından gelir
  const bakirMat = new THREE.MeshStandardMaterial({ color: 0xc2693a, metalness: 1, roughness: 0.3 });
  const pirincMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 1, roughness: 0.26 });

  const profilNoktalari = [
    new THREE.Vector2(0.01, 0.0),
    new THREE.Vector2(0.17, 0.02),
    new THREE.Vector2(0.26, 0.2),
    new THREE.Vector2(0.23, 0.38),
    new THREE.Vector2(0.1, 0.54),
    new THREE.Vector2(0.085, 0.68),
    new THREE.Vector2(0.13, 0.76),
  ];
  const ibrikGovde = new THREE.Mesh(new THREE.LatheGeometry(profilNoktalari, 28), bakirMat);
  ibrikGovde.position.y = -0.32;
  ibrikKok.add(ibrikGovde);

  // Geleneksel işleme bantları (pirinç)
  for (const [y, r] of [[-0.26, 0.19], [0.0, 0.262], [0.17, 0.205]]) {
    const bant = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 28), pirincMat);
    bant.rotation.x = Math.PI / 2;
    bant.position.y = y;
    ibrikKok.add(bant);
  }

  const kapak = new THREE.Mesh(new THREE.ConeGeometry(0.115, 0.16, 20), pirincMat);
  kapak.position.y = 0.52;
  ibrikKok.add(kapak);
  const alem = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), pirincMat);
  alem.position.y = 0.62;
  ibrikKok.add(alem);

  const emzikEgrisi = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.17, -0.06, 0),
    new THREE.Vector3(-0.37, 0.12, 0),
    new THREE.Vector3(-0.52, 0.26, 0),
  ]);
  ibrikKok.add(new THREE.Mesh(new THREE.TubeGeometry(emzikEgrisi, 14, 0.028, 10, false), bakirMat));

  const emzikAgzi = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 8, 12), pirincMat);
  emzikAgzi.position.set(-0.52, 0.26, 0);
  emzikAgzi.rotation.y = Math.PI / 2;
  ibrikKok.add(emzikAgzi);

  const emzikUcu = new THREE.Object3D();
  emzikUcu.position.set(-0.54, 0.26, 0);
  ibrikKok.add(emzikUcu);

  const kulpEgrisi = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.1, 0.34, 0),
    new THREE.Vector3(0.32, 0.22, 0),
    new THREE.Vector3(0.22, -0.1, 0),
  ]);
  ibrikKok.add(new THREE.Mesh(new THREE.TubeGeometry(kulpEgrisi, 12, 0.024, 8, false), pirincMat));

  golgeAc(ibrikKok, true, false);
  return { ibrikKok, emzikUcu };
}

// Fide başına ıslanma anı (kovanın o fidenin üstüne geldiği ilerleme değeri)
const FIDE_ISLANMA = [0.12, 0.32, 0.52, 0.9, 0.71, 0.52];
const SULAMA_TOPLAM = 1.3; // 0..1 ibrik gezisi, 1..1.3 son fidelerin büyüme payı

function TarlaYakinCekimFPS({ parsel, onHasatTamam, onGeriDon }) {
  const kapsayiciRef = useRef(null);
  const sahneApiRef = useRef(null);
  const onHasatTamamRef = useRef(onHasatTamam);
  // Evre: "kuru" -> "sulaniyor" -> "olgun" -> "tamam"
  const [evre, setEvre] = useState("kuru");
  const [toplananAdet, setToplananAdet] = useState(0);
  const evreRef = useRef("kuru");

  useEffect(() => {
    onHasatTamamRef.current = onHasatTamam;
  }, [onHasatTamam]);

  const evreYaz = useCallback((e) => {
    evreRef.current = e;
    setEvre(e);
  }, []);

  const sulamayiBaslat = useCallback(() => {
    if (evreRef.current !== "kuru") return;
    evreYaz("sulaniyor");
    sahneApiRef.current?.sulamaBaslat();
  }, [evreYaz]);

  const hepsiniElleTopla = useCallback(() => {
    if (evreRef.current !== "olgun") return;
    sahneApiRef.current?.siraylaElleTopla();
  }, []);

  useEffect(() => {
    const el = kapsayiciRef.current;
    if (!el) return;

    const { renderer, gl, yazilimGl } = rendererKur(el);
    const scene = new THREE.Scene();
    const dokular = [];
    const { kubbe, bulutGrubu } = gokKubbesiKur(scene, dokular, {
      ust: 0x4a86c8, orta: 0x9cc6ea, ufuk: 0xf1dfb9, sisYakin: 10, sisUzak: 38, bulut: 7,
    });
    ortamHaritasiKur(renderer, scene, kubbe, 0.8);
    isikKur(scene, { poz: [4, 8, 5], hedef: [0, 0, 0], yaricap: 4.8, golgeBoyut: yazilimGl ? 512 : 1024, siddet: 2.7 });
    renderer.toneMappingExposure = 1.05;

    const camera = new THREE.PerspectiveCamera(46, (el.clientWidth || 800) / (el.clientHeight || 450), 0.1, 60);
    const kameraHedef = new THREE.Vector3(0, 0.25, -0.15);
    const kameraTaban = new THREE.Vector3();
    const kameraBaz = new THREE.Vector3(0, 2.45, 3.45);
    const kameraUyarla = () => {
      const k = camera.aspect < 1.4 ? clamp(1.4 / camera.aspect, 1, 2) : 1;
      kameraTaban.copy(kameraHedef).addScaledVector(kameraBaz.clone().sub(kameraHedef), k);
    };

    const toprakDoku = toprakDokusuUret(true);
    const otDoku = otDokusuUret();
    const ahsapDoku = ahsapDokusuUret("#8a5a2e");
    const tutamDoku = otTutamiDokusuUret();
    dokular.push(toprakDoku, otDoku, ahsapDoku, tutamDoku);

    otDoku.repeat.set(34, 34);
    const cayir = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ map: otDoku, color: 0xdceab0, roughness: 0.96 })
    );
    cayir.rotation.x = -Math.PI / 2;
    cayir.position.y = -0.04;
    cayir.receiveShadow = true;
    scene.add(cayir);

    // Toprak karık: ıslanınca koyulaşır
    const toprakMat = new THREE.MeshStandardMaterial({ map: toprakDoku, color: new THREE.Color(0xb98a5c), roughness: 0.95 });
    const karikYatak = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.22, 2.3), toprakMat);
    karikYatak.position.set(0, 0.08, -0.15);
    karikYatak.receiveShadow = true;
    scene.add(karikYatak);

    // Fide sıraları arasında kabartma karıklar
    for (const z of [-1.0, -0.12, 0.74]) {
      const sirt = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 3.55, 10), toprakMat);
      sirt.rotation.z = Math.PI / 2;
      sirt.scale.set(1, 1, 0.8);
      sirt.position.set(0, 0.2, z);
      sirt.castShadow = true;
      sirt.receiveShadow = true;
      scene.add(sirt);
    }

    const ahsapMat = new THREE.MeshStandardMaterial({ map: ahsapDoku, color: 0xc9a07a, roughness: 0.85 });
    const arkaTahta = new THREE.Mesh(new THREE.BoxGeometry(3.96, 0.28, 0.12), ahsapMat);
    arkaTahta.position.set(0, 0.14, -1.32);
    const onTahta = new THREE.Mesh(new THREE.BoxGeometry(3.96, 0.22, 0.1), ahsapMat);
    onTahta.position.set(0, 0.11, 1.02);
    const yanTahtaGeo = new THREE.BoxGeometry(0.1, 0.24, 2.46);
    const solTahta = new THREE.Mesh(yanTahtaGeo, ahsapMat);
    solTahta.position.set(-1.93, 0.12, -0.15);
    const sagTahta = new THREE.Mesh(yanTahtaGeo, ahsapMat);
    sagTahta.position.set(1.93, 0.12, -0.15);
    for (const t of [arkaTahta, onTahta, solTahta, sagTahta]) {
      t.castShadow = true;
      t.receiveShadow = true;
      scene.add(t);
    }

    // Arkada ahşap çit
    const direkGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.9, 7);
    const rayGeo = new THREE.BoxGeometry(1.1, 0.05, 0.05);
    for (let i = -4; i <= 4; i++) {
      const d = new THREE.Mesh(direkGeo, ahsapMat);
      d.position.set(i * 1.1, 0.45, -3.2);
      d.castShadow = true;
      scene.add(d);
      if (i < 4) {
        for (const y of [0.34, 0.66]) {
          const r = new THREE.Mesh(rayGeo, ahsapMat);
          r.position.set(i * 1.1 + 0.55, y, -3.2);
          r.castShadow = true;
          scene.add(r);
        }
      }
    }

    // Çim tutamları (rüzgârda sallanır)
    const tutamGeo = new THREE.PlaneGeometry(0.7, 0.55);
    const tutamMat = new THREE.MeshStandardMaterial({ map: tutamDoku, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 1 });
    const tutamlar = [];
    for (let i = 0; i < 50; i++) {
      const g = new THREE.Group();
      const a = new THREE.Mesh(tutamGeo, tutamMat);
      const b = new THREE.Mesh(tutamGeo, tutamMat);
      a.position.y = b.position.y = 0.26;
      b.rotation.y = Math.PI / 2;
      g.add(a, b);
      const x = (Math.random() - 0.5) * 12;
      const z = -3 + Math.random() * 7;
      if (Math.abs(x) < 2.3 && z > -1.6 && z < 1.4) continue; // karığın üstüne gelmesin
      g.position.set(x, 0, z);
      g.scale.setScalar(0.7 + Math.random() * 0.8);
      scene.add(g);
      tutamlar.push({ g, faz: Math.random() * 6 });
    }

    // 6 fide + büyüyen mahsul
    const bitkiKonumlari = [
      [-1.15, -0.58], [0.0, -0.6], [1.15, -0.58], [-1.08, 0.35], [0.0, 0.36], [1.08, 0.35],
    ];
    const bitkiler = bitkiKonumlari.map(([bx, bz], idx) => {
      const b = bitkiModeliOlustur(parsel.tur, idx);
      b.kok.position.set(bx, 0.18, bz);
      scene.add(b.kok);
      return { ...b, toplandi: false, ucuyor: false, ucusP: 0, basPos: new THREE.Vector3(), faz: idx * 1.3, buyume: 0 };
    });

    // Hasat sepeti (hasır, sap kemerli)
    const sepetGrup = new THREE.Group();
    const sepetMat = new THREE.MeshStandardMaterial({ map: ahsapDoku, color: 0xd9a86a, roughness: 0.85, side: THREE.DoubleSide });
    const sepetGovde = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.26, 0.36, 18, 1, true), sepetMat);
    const sepetTaban = new THREE.Mesh(new THREE.CircleGeometry(0.26, 18), sepetMat);
    sepetTaban.rotation.x = -Math.PI / 2;
    sepetTaban.position.y = -0.17;
    const sepetCember = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.025, 8, 22), ahsapMat);
    sepetCember.rotation.x = Math.PI / 2;
    sepetCember.position.y = 0.18;
    const sepetKulp = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.022, 8, 20, Math.PI), ahsapMat);
    sepetKulp.position.y = 0.18;
    sepetGrup.add(sepetGovde, sepetTaban, sepetCember, sepetKulp);
    sepetGrup.position.set(-1.58, 0.22, 1.32);
    golgeAc(sepetGrup);
    scene.add(sepetGrup);
    let sepetSekme = 0;

    // Bakır ibrik (dünya uzayında)
    const { ibrikKok, emzikUcu } = bakirIbrikOlustur();
    const dinlenmePos = new THREE.Vector3(1.62, 0.38, 1.24);
    ibrikKok.position.copy(dinlenmePos);
    ibrikKok.scale.setScalar(0.88);
    scene.add(ibrikKok);

    // Su damlaları: havuzlu, uzamış damla (akış gibi görünür), yarı saydam
    const damlaGeo = new THREE.CapsuleGeometry(0.026, 0.1, 3, 6);
    const damlaMat = new THREE.MeshStandardMaterial({
      color: 0x8fd3f2, transparent: true, opacity: 0.72, roughness: 0.04, metalness: 0, emissive: 0x2a7aa0, emissiveIntensity: 0.25,
    });
    const damlalar = Array.from({ length: 80 }, () => {
      const m = new THREE.Mesh(damlaGeo, damlaMat);
      m.visible = false;
      scene.add(m);
      return { mesh: m, aktif: false, vx: 0, vy: 0, vz: 0 };
    });
    let damlaSira = 0;
    const dunyaEmzikVek = new THREE.Vector3();
    const kuruRenk = new THREE.Color(0xb98a5c);
    const islakRenk = new THREE.Color(0x4a2f19);

    const toz = tozZerreleriKur(scene, dokular, { adet: 36, alan: [4.5, 1.4, 3], merkez: [0, 1.5, 0] });
    const parcacik = parcacikSistemiKur(scene, dokular);
    const sarsinti = sarsintiKur();

    const anim = { mod: "bekle", ilerleme: 0, damlaSayac: 0, sesSayac: 0, kuyruk: [], kuyrukZaman: 0 };

    const tekMeyveTopla = (indeks) => {
      const b = bitkiler[indeks];
      if (!b || b.toplandi || b.ucuyor || anim.mod !== "olgun") return;
      b.ucuyor = true;
      b.ucusP = 0;
      b.meyveGrup.getWorldPosition(b.basPos);
      scene.attach(b.meyveGrup);
      sesCal("hasat");
      parcacik.kivilcim(b.basPos.x, b.basPos.y, b.basPos.z, 5, 0.6);
    };

    const sulamaBaslat = () => {
      if (anim.mod !== "bekle") return;
      anim.mod = "sula";
      anim.ilerleme = 0;
    };

    sahneApiRef.current = {
      sulamaBaslat,
      siraylaElleTopla: () => {
        anim.kuyruk = bitkiler.map((b, idx) => (!b.toplandi && !b.ucuyor ? idx : -1)).filter((idx) => idx >= 0);
        anim.kuyrukZaman = 0;
      },
    };

    const raycaster = new THREE.Raycaster();
    const fare = new THREE.Vector2();
    const tikla = (e) => {
      if (e.isPrimary === false) return;
      const r = renderer.domElement.getBoundingClientRect();
      fare.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      fare.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(fare, camera);

      if (anim.mod === "bekle") {
        if (raycaster.intersectObjects([karikYatak, ibrikKok], true).length > 0) {
          evreRef.current = "sulaniyor";
          setEvre("sulaniyor");
          sulamaBaslat();
        }
      } else if (anim.mod === "olgun") {
        const hedefler = bitkiler.filter((b) => !b.toplandi && !b.ucuyor).map((b) => b.proxy);
        const kes = raycaster.intersectObjects(hedefler, false);
        if (kes.length > 0) tekMeyveTopla(kes[0].object.userData.bitkiIndeks);
      }
    };
    renderer.domElement.addEventListener("pointerdown", tikla);

    const boyutIptal = boyutlandirici(el, renderer, camera);
    const ro2 = new ResizeObserver(kameraUyarla);
    ro2.observe(el);
    window.addEventListener("resize", kameraUyarla);
    kameraUyarla();

    let hasatBildirildi = false;
    const olcer = zamanOlcerKur(yazilimGl);
    const zamanlayici = kareZamanlayiciOlustur(gl, yazilimGl);

    const damlaSalla = () => {
      emzikUcu.getWorldPosition(dunyaEmzikVek);
      for (let k = 0; k < 2; k++) {
        const d = damlalar[damlaSira++ % damlalar.length];
        d.aktif = true;
        d.mesh.visible = true;
        d.mesh.position.set(dunyaEmzikVek.x + (Math.random() - 0.5) * 0.04, dunyaEmzikVek.y, dunyaEmzikVek.z + (Math.random() - 0.5) * 0.04);
        d.vx = -0.2 + (Math.random() - 0.5) * 0.22;
        d.vy = -1.2 - Math.random() * 0.5;
        d.vz = (Math.random() - 0.5) * 0.2;
      }
    };

    const ciz = () => {
      const dt = olcer.guncelle();
      const t = olcer.gecen();

      if (anim.mod === "bekle") {
        ibrikKok.position.y = dinlenmePos.y + Math.sin(t * 2.6) * 0.025;
        ibrikKok.rotation.z = Math.sin(t * 1.7) * 0.025;
      } else if (anim.mod === "sula") {
        anim.ilerleme = Math.min(SULAMA_TOPLAM, anim.ilerleme + dt * 0.46);
        const p = anim.ilerleme;
        const pc = Math.min(1, p); // ibrik gezisi

        // 0..0.12 kalkış, 0.12..0.52 arka sıra, 0.52..0.90 ön sıra, 0.90..1 iniş
        let hedefX;
        let hedefZ;
        let kalkis = 1;
        if (pc < 0.12) {
          kalkis = smootherstep(pc / 0.12, 0, 1);
          hedefX = -1.15;
          hedefZ = -0.58;
        } else if (pc < 0.52) {
          hedefX = lerp(-1.15, 1.15, smootherstep((pc - 0.12) / 0.4, 0, 1));
          hedefZ = -0.58;
        } else if (pc < 0.9) {
          const u = smootherstep((pc - 0.52) / 0.38, 0, 1);
          hedefX = lerp(1.12, -1.12, u);
          hedefZ = lerp(-0.58 + 0.93 * Math.min(1, (pc - 0.52) / 0.06), 0.35, 1);
        } else {
          kalkis = smootherstep(Math.max(0, (1 - pc) / 0.1), 0, 1);
          hedefX = -1.12;
          hedefZ = 0.35;
        }
        // emzik ucu rotation.z=+0.60 iken ibrikKok'un (-0.58,-0.09) sol-altında: su tam fidenin üstüne dökülür
        ibrikKok.position.set(
          lerp(dinlenmePos.x, hedefX + 0.58, kalkis),
          lerp(dinlenmePos.y, 1.24, kalkis) + Math.sin(t * 3) * 0.01 * kalkis,
          lerp(dinlenmePos.z, hedefZ, kalkis)
        );
        ibrikKok.rotation.set(0, 0, kalkis * 0.6 + Math.sin(t * 7) * 0.012 * kalkis);

        // Toprak ıslanır
        toprakMat.color.lerpColors(kuruRenk, islakRenk, smootherstep(pc, 0, 1));
        toprakMat.roughness = 0.95 - pc * 0.4;

        if (kalkis > 0.7) {
          anim.damlaSayac += dt;
          anim.sesSayac += dt;
          if (anim.damlaSayac > 0.026) {
            anim.damlaSayac = 0;
            damlaSalla();
          }
          if (anim.sesSayac > 0.14) {
            anim.sesSayac = 0;
            sesCal("su");
          }
        }

        if (p >= SULAMA_TOPLAM) {
          anim.mod = "olgun";
          ibrikKok.position.copy(dinlenmePos);
          ibrikKok.rotation.set(0, 0, 0);
          evreRef.current = "olgun";
          setEvre("olgun");
        }
      } else if (anim.mod === "olgun") {
        ibrikKok.position.y = dinlenmePos.y + Math.sin(t * 2.2) * 0.012;
        if (anim.kuyruk.length > 0) {
          anim.kuyrukZaman -= dt;
          if (anim.kuyrukZaman <= 0) {
            tekMeyveTopla(anim.kuyruk.shift());
            anim.kuyrukZaman = 0.18;
          }
        }
      }

      // Fideler: ibrik üstlerinden geçince sırayla yaylanarak büyür; rüzgârda salınır
      for (let i = 0; i < bitkiler.length; i++) {
        const b = bitkiler[i];
        let g;
        if (anim.mod === "bekle") g = 0;
        else if (anim.mod === "olgun") g = 1;
        else g = clamp((anim.ilerleme - FIDE_ISLANMA[i]) / 0.3, 0, 1);
        b.buyume = g;
        const gg = g >= 1 ? 1 : easeOutBack(g);
        b.fideGrup.scale.setScalar(0.45 + 0.62 * gg);
        if (!b.ucuyor && !b.toplandi) {
          const m = Math.max(0.01, easeOutBack(clamp((g - 0.35) / 0.65, 0, 1)));
          let sc = m;
          // Olgun, toplanmamış mahsul "beni topla" diye hafifçe nabız atar
          if (anim.mod === "olgun") sc *= 1 + Math.sin(t * 4 + b.faz) * 0.06;
          b.meyveGrup.scale.setScalar(sc);
        }
        b.fideGrup.rotation.z = Math.sin(t * 1.6 + b.faz) * 0.035;
        b.fideGrup.rotation.x = Math.cos(t * 1.3 + b.faz) * 0.025;
      }
      for (const o of tutamlar) o.g.rotation.z = Math.sin(t * 1.4 + o.faz) * 0.1;

      // Damlalar
      for (const d of damlalar) {
        if (!d.aktif) continue;
        d.vy -= 9.8 * dt;
        d.mesh.position.x += d.vx * dt;
        d.mesh.position.y += d.vy * dt;
        d.mesh.position.z += d.vz * dt;
        if (d.mesh.position.y <= 0.2) {
          d.aktif = false;
          d.mesh.visible = false;
          if (Math.random() < 0.3) parcacik.toz(d.mesh.position.x, 0.22, d.mesh.position.z, 1, 0.3, 0xb4dcf0);
        }
      }

      // Mahsulün sepete yayla uçuşu (ease-in-out), varınca sepet yaylanır
      let bitenSayisi = 0;
      for (let i = 0; i < bitkiler.length; i++) {
        const b = bitkiler[i];
        if (b.toplandi) {
          bitenSayisi++;
          continue;
        }
        if (b.ucuyor) {
          b.ucusP = Math.min(1, b.ucusP + dt * 2.4);
          const u = easeInOutCubic(b.ucusP);
          const hedefX = sepetGrup.position.x + ((i % 3) - 1) * 0.11;
          const hedefY = sepetGrup.position.y + 0.06;
          const hedefZ = sepetGrup.position.z + (Math.floor(i / 3) - 0.5) * 0.1;
          b.meyveGrup.position.x = lerp(b.basPos.x, hedefX, u);
          b.meyveGrup.position.z = lerp(b.basPos.z, hedefZ, u);
          b.meyveGrup.position.y = lerp(b.basPos.y, hedefY, u) + Math.sin(u * Math.PI) * 0.85;
          b.meyveGrup.rotation.y += dt * 6;
          // Alınırken kısa "pop" (ezilme-uzama)
          const pop = 1 + Math.sin(Math.min(1, b.ucusP * 3) * Math.PI) * 0.25;
          b.meyveGrup.scale.set(pop, 2 - pop, pop);
          if (b.ucusP >= 1) {
            b.ucuyor = false;
            b.toplandi = true;
            b.meyveGrup.scale.setScalar(1);
            bitenSayisi++;
            sepetSekme = 1;
            parcacik.kivilcim(hedefX, hedefY + 0.1, hedefZ, 4, 0.5);
            sarsinti.vur(0.015);
            setToplananAdet(bitenSayisi);
          }
        }
      }
      sepetSekme = Math.max(0, sepetSekme - dt * 4);
      const sp = Math.sin((1 - sepetSekme) * 12) * sepetSekme;
      sepetGrup.scale.set(1 + sp * 0.05, 1 - sp * 0.08, 1 + sp * 0.05);

      if (bitenSayisi === bitkiler.length && !hasatBildirildi) {
        hasatBildirildi = true;
        evreRef.current = "tamam";
        setEvre("tamam");
        window.setTimeout(() => onHasatTamamRef.current?.(), 500);
      }

      bulutGrubu.rotation.y += dt * 0.004;
      toz.guncelle(t, dt);
      parcacik.guncelle(dt);
      sarsinti.uygula(camera, kameraTaban, dt);
      camera.position.x += Math.sin(t * 0.5) * 0.05;
      camera.position.y += Math.sin(t * 0.7) * 0.02;
      camera.lookAt(kameraHedef);

      renderer.render(scene, camera);
      zamanlayici.sonraki(ciz);
    };
    ciz();

    return () => {
      zamanlayici.iptal();
      boyutIptal();
      ro2.disconnect();
      window.removeEventListener("resize", kameraUyarla);
      renderer.domElement.removeEventListener("pointerdown", tikla);
      sahneApiRef.current = null;
      olcer.birak();
      // Sepete uçan meyveler sahnede kalır (traverse ile temizlenir); sahneden çıkmış olanlar yok
      sahneTemizle(scene, renderer, dokular, [damlaGeo, yanTahtaGeo, direkGeo, rayGeo, tutamGeo, { dispose: parcacik.birak }]);
    };
  }, [parsel.id, parsel.tur]);

  return (
    <div className="space-y-3">
      <div className="tezhip flex flex-col gap-2 rounded-2xl px-4 py-3 text-amber-100 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">
          <button
            type="button"
            onClick={onGeriDon}
            className="ust-levha shrink-0 rounded-xl px-3 py-1.5 text-xs font-black text-amber-200 hover:brightness-125"
          >
            ← Parsellere Dön
          </button>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-amber-100 sm:text-sm">
              🌱 {parsel.ad} · Sulama ve Hasat (+{parsel.miktar} 🌾 mahsul)
            </h4>
            <p className="text-[11px] text-amber-200/80">
              {evre === "kuru"
                ? "1. adım: Toprağa veya bakır ibriğe dokunarak fideleri sula."
                : evre === "sulaniyor"
                ? "💧 Bakır ibrik fidelerin üzerinde geziniyor, mahsuller büyüyor…"
                : evre === "olgun"
                ? `2. adım: ${parsel.mahsulAd} mahsullerine tek tek dokun ya da hepsini topla (${toplananAdet}/6).`
                : "✅ Tüm mahsuller sepete toplandı!"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 max-sm:[&>button]:w-full">
          {evre === "kuru" && (
            <button type="button" onClick={sulamayiBaslat} className="varak-dugme rounded-2xl px-5 py-2.5 text-xs">
              💧 İbriği Kaldır ve Sula
            </button>
          )}
          {evre === "olgun" && (
            <button type="button" onClick={hepsiniElleTopla} className="varak-dugme rounded-2xl px-5 py-2.5 text-xs">
              🌾 Hepsini Sepete Topla ({toplananAdet}/6)
            </button>
          )}
        </div>
      </div>

      <div className="relative aspect-[16/9] kisa:aspect-auto kisa:h-[calc(100dvh-4.5rem)] w-full overflow-hidden rounded-3xl bg-stone-950 shadow-2xl ring-2 ring-amber-500/40 max-sm:aspect-[4/5]">
        <div ref={kapsayiciRef} className="h-full w-full cursor-pointer" />
      </div>
    </div>
  );
}

export function TarlaFPS3DSahnesi({ oyun }) {
  const parseller = oyun.sahaNoktalari("erzak");
  const hazirParseller = parseller.filter((p) => p.hazir);
  const toplamHazirMahsul = hazirParseller.reduce((t, p) => t + p.miktar, 0);

  const [seciliParselId, setSeciliParselId] = useState(null);
  const [bilgi, setBilgi] = useState(
    "🌾 Tarlada 3 bereketli parsel var! İstediğin parsele tıklayıp 3D sahnede bakır ibrikle sulayabilir veya sağ üstteki 'Hepsini Topla' düğmesiyle tüm hazır parselleri tek tıkla hasat edebilirsin."
  );

  const aktifParsel = parseller.find((p) => p.id === seciliParselId && p.hazir) ?? null;

  if (aktifParsel) {
    return (
      <TarlaYakinCekimFPS
        parsel={aktifParsel}
        onGeriDon={() => setSeciliParselId(null)}
        onHasatTamam={async () => {
          const sonuc = await oyun.sahaHasat("erzak", aktifParsel.id);
          setSeciliParselId(null);
          if (sonuc?.mesaj) {
            setBilgi(`${sonuc.mesaj} Diğer hazır parsellerden devam edebilirsin!`);
          }
        }}
      />
    );
  }

  // tarla_sahne.webp üzerindeki 3 ana taş bordürlü toprak yatağıyla birebir hizalı koordinatlar
  const PARSEL_KONUMLARI = [
    { id: 1, left: "46%", top: "29%" },
    { id: 2, left: "76%", top: "48%" },
    { id: 3, left: "47%", top: "77%" },
  ];

  return (
    <div className="space-y-3">
      <div className="tezhip rounded-2xl px-4 py-3 text-xs leading-relaxed font-bold text-amber-100">{bilgi}</div>

      {/* 3 Ayrı Sebze/Meyve Parseli Genel Görünümü */}
      <div className="relative aspect-[16/9] kisa:aspect-auto kisa:h-[calc(100dvh-4.5rem)] w-full overflow-hidden rounded-3xl bg-stone-950 shadow-2xl ring-2 ring-amber-500/40 select-none max-sm:aspect-[3/4]">
        <img
          src="/assets/mekanlar/tarla_sahne.webp"
          alt="Tarla 3 Sebze ve Meyve Parseli"
          draggable={false}
          className="h-full w-full object-cover"
        />

        {/* Hepsini Topla: oyun çerçevesinin içinde, sağ üstte */}
        <button
          type="button"
          disabled={hazirParseller.length === 0 || oyun.bekliyor}
          onClick={async () => {
            const sonuc = await oyun.sahaHepsiniTopla("erzak");
            if (sonuc?.mesaj) setBilgi(sonuc.mesaj);
          }}
          className="varak-dugme absolute top-3 right-3 z-30 rounded-2xl px-3.5 py-2 text-xs shadow-xl sm:px-4 sm:py-2.5 sm:text-sm"
        >
          {hazirParseller.length > 0
            ? `🌾 Hepsini Topla (+${toplamHazirMahsul})`
            : "⏳ Parseller yetişiyor"}
        </button>

        {parseller.map((p, idx) => {
          const kon = PARSEL_KONUMLARI[idx] ?? { left: "50%", top: "50%" };
          return (
            <button
              key={p.id}
              type="button"
              disabled={!p.hazir || oyun.bekliyor}
              onClick={() => setSeciliParselId(p.id)}
              style={{ left: kon.left, top: kon.top }}
              className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 transition duration-200 hover:scale-110 disabled:cursor-default disabled:hover:scale-100"
            >
              <div
                className={`flex flex-col items-center rounded-2xl px-4 py-2.5 text-center shadow-2xl ring-2 ${
                  p.hazir
                    ? "bg-stone-950/92 text-amber-100 ring-amber-400 hover:bg-stone-900"
                    : "bg-stone-950/80 text-stone-400 ring-stone-700"
                }`}
              >
                <span
                  className="mb-1 inline-block h-3 w-9 rounded-full"
                  style={{ backgroundColor: p.hazir ? p.renk : "#57534e" }}
                />
                <span className="text-xs font-black whitespace-nowrap sm:text-sm">{p.ad}</span>
                <span className="mt-0.5 text-[10px] font-bold sm:text-[11px]">
                  {p.hazir ? (
                    <span className="text-sky-300">💧 Sula & Topla (+{p.miktar} 🌾)</span>
                  ) : (
                    <span>⏳ Yetişiyor (~{p.kalanDakika} dk)</span>
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
