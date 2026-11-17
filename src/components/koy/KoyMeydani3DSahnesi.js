"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

// =============================================================
// SEYRÜSEFER v3 — 3D BİRİNCİ ŞAHIS (FIRST-PERSON) KÖY MEYDANI
// - Kendi gözünden (y = 1.65m) 360° Anadolu/Selçuklu köy meydanı gezintisi
// - Mobil sanal joystick (sol alt, dokunmatik + fare destekli)
// - Yere veya meydandaki kişilere/ağaca/çeşmeye dokununca otomatik yanlarına yürüme
// - WASD / Ok tuşları ve sürükleyerek etrafa bakma desteği
// =============================================================

const GOZ_YUKSEKLIGI = 1.65;
const GOK_YARICAP = 100;
const MEYDAN_YARICAP = 11.2;

// Render döngüsü içinde sıfır GC için önceden ayrılmış matematik nesneleri
const _ileriYon = new THREE.Vector3();
const _sagYon = new THREE.Vector3();
const _hareketVek = new THREE.Vector3();
const _projMisafir = new THREE.Vector3();
const _projCinar = new THREE.Vector3();
const _projCesme = new THREE.Vector3();
const _tikNoktasi = new THREE.Vector3();
const _tikFare = new THREE.Vector2();
const _zeminDuzlemi = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _kameraEuler = new THREE.Euler(0, 0, 0, "YXZ");

// Çarpışma daireleri (x, z, yarıçap)
const ENGEL_DAIRELERI = [
  { x: -5.2, z: -2.2, r: 2.05 }, // Taş Şadırvan / Çeşme
  { x: 5.4, z: -2.5, r: 2.25 }, // Ulu Çınar ve Sohbet Sediri
  { x: -0.4, z: -7.6, r: 1.25 }, // Duyuru Kürsüsü ve Sancaklar
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
          timerId = window.setTimeout(yokla, 14);
          return;
        }
        gl2.deleteSync(sync);
        timerId = window.setTimeout(fn, 75);
      };
      timerId = window.setTimeout(yokla, 14);
    } else {
      timerId = window.setTimeout(fn, 80);
    }
  };

  const iptal = () => {
    durdu = true;
    cancelAnimationFrame(rafId);
    clearTimeout(timerId);
  };

  return { sonraki, iptal };
}

function aciFarkiNormalize(hedef, mevcut) {
  let fark = (hedef - mevcut) % (Math.PI * 2);
  if (fark > Math.PI) fark -= Math.PI * 2;
  if (fark < -Math.PI) fark += Math.PI * 2;
  return fark;
}


function dokunmatikMi() {
  return Boolean(window.matchMedia?.("(pointer: coarse)")?.matches) || (navigator.maxTouchPoints ?? 0) > 0;
}

// THREE.Clock yerine THREE.Timer (sekme gizlenince dt sıçramaz)
function zamanOlcerKur() {
  const timer = new THREE.Timer();
  timer.connect(document);
  return {
    guncelle() {
      timer.update();
      return THREE.MathUtils.clamp(timer.getDelta(), 0.001, 0.12);
    },
    gecen: () => timer.getElapsed(),
    birak() {
      timer.disconnect();
      timer.dispose();
    },
  };
}

function tuvalYap(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

function radyalDoku(rgb = "255,255,255", ic = 1, boyut = 64) {
  const [c, ctx] = tuvalYap(boyut, boyut);
  const g = ctx.createRadialGradient(boyut / 2, boyut / 2, 0, boyut / 2, boyut / 2, boyut / 2);
  g.addColorStop(0, `rgba(${rgb},${ic})`);
  g.addColorStop(0.55, `rgba(${rgb},${(ic * 0.45).toFixed(3)})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, boyut, boyut);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function bulutDokusuUret() {
  const [c, ctx] = tuvalYap(256, 128);
  for (const [x, y, r] of [[64, 78, 40], [100, 62, 46], [140, 58, 50], [182, 70, 44], [208, 84, 32], [120, 88, 44], [160, 90, 38]]) {
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

function otDokusuUret() {
  const [c, ctx] = tuvalYap(256, 256);
  ctx.fillStyle = "#6a8f3d";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const ton = Math.random();
    ctx.strokeStyle = ton < 0.4 ? "rgba(44,82,28,0.32)" : ton < 0.8 ? "rgba(146,182,84,0.3)" : "rgba(204,190,104,0.22)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 5, y - 4 - Math.random() * 7);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(40, 40);
  return tex;
}

function otTutamiDokusuUret() {
  const [c, ctx] = tuvalYap(64, 64);
  for (let i = 0; i < 9; i++) {
    const x = 8 + i * 6 + (Math.random() - 0.5) * 4;
    ctx.strokeStyle = i % 2 ? "#86ac52" : "#58822f";
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

// Şadırvan suyu: halka dalgalı, yarı saydam doku (animasyonla kayar)
function suDalgaDokusuUret() {
  const [c, ctx] = tuvalYap(256, 256);
  ctx.fillStyle = "#2b9fb0";
  ctx.fillRect(0, 0, 256, 256);
  for (let r = 14; r < 128; r += 14) {
    ctx.strokeStyle = `rgba(215,248,252,${0.35 - r / 500})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(128 + Math.sin(r) * 6, 128 + Math.cos(r * 1.3) * 6, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.center.set(0.5, 0.5);
  return tex;
}

// Gradyan gökyüzü kubbesi + yumuşak bulutlar; sis rengi ufukla aynı
function gokKubbesiKur(scene, dokular) {
  const geo = new THREE.SphereGeometry(GOK_YARICAP, 24, 16);
  const pos = geo.attributes.position;
  const renk = new Float32Array(pos.count * 3);
  const cUst = new THREE.Color(0x4a82c4);
  const cOrta = new THREE.Color(0x9cc4e8);
  const cUfuk = new THREE.Color(0xeadfc6);
  const g = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / GOK_YARICAP;
    if (y <= 0.02) g.copy(cUfuk);
    else if (y < 0.3) g.lerpColors(cUfuk, cOrta, THREE.MathUtils.smootherstep(y, 0.02, 0.3));
    else g.lerpColors(cOrta, cUst, THREE.MathUtils.smootherstep(y, 0.3, 0.9));
    renk.set([g.r, g.g, g.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(renk, 3));
  const kubbe = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })
  );
  kubbe.renderOrder = -10;
  kubbe.frustumCulled = false;
  scene.add(kubbe);

  const bulutDoku = bulutDokusuUret();
  dokular.push(bulutDoku);
  const bulutGrubu = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: bulutDoku, transparent: true, opacity: 0.55 + (i % 3) * 0.12, depthWrite: false, fog: false })
    );
    const aci = (i / 9) * Math.PI * 2 + 0.4;
    const yuk = 0.14 + (((i * 37) % 11) / 11) * 0.3;
    const r = GOK_YARICAP * 0.9;
    s.position.set(Math.cos(aci) * r * Math.cos(yuk), r * Math.sin(yuk) + 4, Math.sin(aci) * r * Math.cos(yuk));
    const olcek = 34 + (i % 4) * 8;
    s.scale.set(olcek, olcek * 0.42, 1);
    bulutGrubu.add(s);
  }
  scene.add(bulutGrubu);
  scene.background = new THREE.Color(0xeadfc6);
  scene.fog = new THREE.FogExp2(0xeadfc6, 0.015);
  return { kubbe, bulutGrubu };
}

// Ortam yansıması gökyüzü kubbesinden üretilir (bakır/pirinç sıcak gökten yansır)
function ortamHaritasiKur(renderer, scene, kubbe, siddet = 0.6) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(kubbe.geometry, kubbe.material));
  const zemin = new THREE.Mesh(new THREE.CircleGeometry(90, 16), new THREE.MeshBasicMaterial({ color: 0x8c7650 }));
  zemin.rotation.x = -Math.PI / 2;
  zemin.position.y = -1.5;
  const gunesTopu = new THREE.Mesh(
    new THREE.SphereGeometry(6, 12, 8),
    new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(7, 5.2, 3.2) })
  );
  gunesTopu.position.set(40, 42, 28);
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

// Havada süzülen toz zerrecikleri
function tozZerreleriKur(scene, dokular, adet = 70) {
  const doku = radyalDoku("255,240,205", 1, 32);
  dokular.push(doku);
  const geo = new THREE.BufferGeometry();
  const konum = new Float32Array(adet * 3);
  const faz = new Float32Array(adet);
  for (let i = 0; i < adet; i++) {
    konum[i * 3] = (Math.random() - 0.5) * 24;
    konum[i * 3 + 1] = 0.4 + Math.random() * 4.5;
    konum[i * 3 + 2] = (Math.random() - 0.5) * 24;
    faz[i] = Math.random() * Math.PI * 2;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(konum, 3));
  const nokta = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ map: doku, size: 0.12, transparent: true, opacity: 0.45, depthWrite: false, color: 0xfff0cc })
  );
  nokta.frustumCulled = false;
  scene.add(nokta);
  return (t, dt) => {
    for (let i = 0; i < adet; i++) {
      konum[i * 3] += Math.sin(t * 0.3 + faz[i]) * 0.12 * dt + 0.06 * dt;
      konum[i * 3 + 1] += Math.cos(t * 0.5 + faz[i]) * 0.1 * dt;
      konum[i * 3 + 2] += Math.cos(t * 0.25 + faz[i] * 1.3) * 0.1 * dt;
      if (konum[i * 3] > 12) konum[i * 3] = -12;
    }
    geo.attributes.position.needsUpdate = true;
  };
}

// ---------- PROSEDÜREL MEYDAN TAŞ DÖŞEME DOKUSU ----------
function meydanTasDokusuUret(renderer, dokuListesi) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext("2d");
  if (ctx) {
    const cx = 512;
    const cy = 512;

    // Harç tabanı
    ctx.fillStyle = "#6e6355";
    ctx.fillRect(0, 0, 1024, 1024);

    // Eşmerkezli Anadolu Arnavut kaldırımı halkaları
    for (let r = 28; r < 500; r += 22) {
      const cevre = 2 * Math.PI * r;
      const tasAdet = Math.max(10, Math.floor(cevre / 24));
      for (let i = 0; i < tasAdet; i++) {
        const a0 = (i / tasAdet) * Math.PI * 2;
        const a1 = ((i + 0.88) / tasAdet) * Math.PI * 2;
        const ton = 158 + ((i * 19 + r * 7) % 34) - 17;
        ctx.fillStyle = `rgb(${ton + 12}, ${ton + 2}, ${ton - 14})`;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 9, a0, a1);
        ctx.arc(cx, cy, r - 9, a1, a0, true);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Merkez Selçuklu 8 köşeli yıldız madalyonu
    ctx.save();
    ctx.translate(cx, cy);
    for (let k = 0; k < 2; k++) {
      ctx.save();
      ctx.rotate((k * Math.PI) / 4);
      ctx.fillStyle = k === 0 ? "#b89b72" : "#9c7c54";
      ctx.strokeStyle = "#4a3b2c";
      ctx.lineWidth = 4;
      ctx.fillRect(-52, -52, 104, 104);
      ctx.strokeRect(-52, -52, 104, 104);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fillStyle = "#2b6e68";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#e7d3ad";
    ctx.stroke();
    ctx.restore();
  }

  const doku = new THREE.CanvasTexture(c);
  doku.colorSpace = THREE.SRGBColorSpace;
  doku.anisotropy = renderer.capabilities.getMaxAnisotropy();
  dokuListesi.push(doku);
  return doku;
}

function duyuruMetniDokusuUret(renderer, dokuListesi) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#efe1c1";
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, 484, 228);

    ctx.fillStyle = "#451a03";
    ctx.font = "bold 30px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("Köy Meydanı Divanı", 256, 68);

    ctx.font = "20px Georgia, serif";
    ctx.fillStyle = "#573016";
    ctx.fillText("Adalet mülkün temelidir.", 256, 118);
    ctx.fillText("Komşu hakkı ve misafir ikramı", 256, 156);
    ctx.fillText("köyümüzün bereketidir.", 256, 192);
  }
  const doku = new THREE.CanvasTexture(c);
  doku.colorSpace = THREE.SRGBColorSpace;
  doku.anisotropy = renderer.capabilities.getMaxAnisotropy();
  dokuListesi.push(doku);
  return doku;
}

// ---------- ÇOK PARÇALI 3D MİMARİ VE KARAKTER OLUŞTURUCULAR ----------

function sadirvanOlustur(etkilesimListesi) {
  const grup = new THREE.Group();
  grup.position.set(-5.2, 0, -2.2);

  const tasMat = new THREE.MeshStandardMaterial({ color: 0xd6cfc2, roughness: 0.82, metalness: 0.05 });
  const koyuTasMat = new THREE.MeshStandardMaterial({ color: 0x9c9283, roughness: 0.88, metalness: 0.05 });
  const ahsapMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.72, metalness: 0.08 });
  const kursunKubbeMat = new THREE.MeshStandardMaterial({ color: 0x3b5259, roughness: 0.42, metalness: 0.45 });
  const pirincMat = new THREE.MeshStandardMaterial({ color: 0xd4a437, roughness: 0.22, metalness: 0.88 });
  const suDoku = suDalgaDokusuUret();
  const suMat = new THREE.MeshStandardMaterial({
    map: suDoku,
    color: 0xcfeff2,
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });

  // 1. Basamaklı sekizgen kaide
  const kaideAlt = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.2, 0.22, 8), koyuTasMat);
  kaideAlt.position.y = 0.11;
  grup.add(kaideAlt);

  // 2. Oyma taş havuz gövdesi
  const havuzGovde = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.68, 0.78, 8), tasMat);
  havuzGovde.position.y = 0.6;
  grup.add(havuzGovde);

  // 3. Havuz bileziği
  const havuzKenar = new THREE.Mesh(new THREE.TorusGeometry(1.56, 0.09, 8, 8), koyuTasMat);
  havuzKenar.rotation.x = Math.PI / 2;
  havuzKenar.position.y = 0.99;
  grup.add(havuzKenar);

  // 4. Su yüzeyi
  const suYuzeyi = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.42, 0.05, 16), suMat);
  suYuzeyi.position.y = 0.93;
  grup.add(suYuzeyi);

  // 5. Merkez mermer fıskiye sütunu + çanak
  const ortaSutun = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.45, 12), tasMat);
  ortaSutun.position.y = 1.15;
  grup.add(ortaSutun);

  const ustCanak = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.24, 0.22, 12), tasMat);
  ustCanak.position.y = 1.88;
  grup.add(ustCanak);

  // 6. Pirinç musluk lüleleri (4 yönde)
  for (let i = 0; i < 4; i++) {
    const aci = (i * Math.PI) / 2;
    const lule = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.26, 8), pirincMat);
    lule.rotation.z = Math.PI / 2.3;
    lule.position.set(Math.cos(aci) * 0.36, 1.55, Math.sin(aci) * 0.36);
    lule.rotation.y = -aci;
    grup.add(lule);
  }

  // 7. 6 Ahşap dikme sütun + kemer kirişi + kurşun kubbe + pirinç alem
  for (let i = 0; i < 6; i++) {
    const aci = (i / 6) * Math.PI * 2;
    const direk = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 2.55, 8), ahsapMat);
    direk.position.set(Math.cos(aci) * 1.72, 1.48, Math.sin(aci) * 1.72);
    grup.add(direk);
  }

  const sacakHalka = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.25, 0.22, 6), ahsapMat);
  sacakHalka.position.y = 2.82;
  grup.add(sacakHalka);

  const kubbe = new THREE.Mesh(new THREE.SphereGeometry(1.75, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), kursunKubbeMat);
  kubbe.position.y = 2.86;
  grup.add(kubbe);

  const alem = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.48, 10), pirincMat);
  alem.position.y = 4.78;
  grup.add(alem);

  // 8. Akan su şeritleri (animasyonlu)
  const suDamlalari = [];
  const damlaMat = new THREE.MeshBasicMaterial({ color: 0xcffafe, transparent: true, opacity: 0.8 });
  const damlaGeo = new THREE.SphereGeometry(0.045, 6, 6);
  for (let i = 0; i < 24; i++) {
    const aci = (i % 4) * (Math.PI / 2) + (i > 11 ? 0.18 : 0);
    const damla = new THREE.Mesh(damlaGeo, damlaMat);
    grup.add(damla);
    suDamlalari.push({ mesh: damla, aci, faz: (i / 24) * Math.PI * 2 });
  }

  // Tıklama vekil kutusu
  const vurguKutu = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.1, 3.8, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  vurguKutu.position.y = 1.9;
  vurguKutu.userData = { etkilesimTuru: "cesme" };
  grup.add(vurguKutu);
  etkilesimListesi.push(vurguKutu);

  return { grup, suDamlalari, suDoku, suYuzeyi };
}

function uluCinarVeSedirOlustur(etkilesimListesi) {
  const grup = new THREE.Group();
  grup.position.set(5.4, 0, -2.5);

  const kabukMat = new THREE.MeshStandardMaterial({ color: 0x5b422d, roughness: 0.92, metalness: 0.02 });
  const sedirAhsapMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.76, metalness: 0.06 });
  const kilimMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.88, metalness: 0.02 });
  const yastikMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85, metalness: 0.02 });
  const siniMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.25, metalness: 0.85 });
  const fenerMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.85,
    roughness: 0.3,
  });

  // 1. Kök ve ulu gövde
  const govdeAlt = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.92, 1.6, 10), kabukMat);
  govdeAlt.position.y = 0.8;
  grup.add(govdeAlt);

  const govdeUst = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.6, 2.4, 10), kabukMat);
  govdeUst.position.y = 2.6;
  govdeUst.rotation.z = 0.05;
  grup.add(govdeUst);

  // 2. Ana dallar
  const dalVerileri = [
    { x: -0.9, y: 3.6, z: 0.5, rz: 0.65, rx: 0.25 },
    { x: 0.85, y: 3.7, z: -0.4, rz: -0.6, rx: -0.2 },
    { x: 0.2, y: 3.8, z: 0.9, rz: 0.15, rx: -0.6 },
    { x: -0.3, y: 3.75, z: -0.85, rz: -0.2, rx: 0.55 },
  ];
  for (const d of dalVerileri) {
    const dal = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.26, 2.1, 7), kabukMat);
    dal.position.set(d.x, d.y, d.z);
    dal.rotation.set(d.rx, 0, d.rz);
    grup.add(dal);
  }

  // 3. Katmanlı yaprak kümeleri (rüzgârda salınır)
  const yaprakGrubu = new THREE.Group();
  yaprakGrubu.position.y = 4.5;
  const yaprakRenkleri = [0x2d6a35, 0x3b7d3e, 0x4d9245, 0x346f39];
  const kumeler = [
    { x: 0, y: 0.8, z: 0, r: 2.15 },
    { x: -1.65, y: 0.15, z: 0.7, r: 1.65 },
    { x: 1.6, y: 0.2, z: -0.5, r: 1.65 },
    { x: 0.4, y: 0.25, z: 1.65, r: 1.55 },
    { x: -0.5, y: 0.2, z: -1.6, r: 1.6 },
    { x: -1.2, y: 0.55, z: -0.9, r: 1.45 },
    { x: 1.25, y: 0.5, z: 1.05, r: 1.45 },
  ];
  kumeler.forEach((k, idx) => {
    const mat = new THREE.MeshStandardMaterial({
      color: yaprakRenkleri[idx % yaprakRenkleri.length],
      roughness: 0.84,
      metalness: 0.02,
    });
    const kume = new THREE.Mesh(new THREE.DodecahedronGeometry(k.r, 1), mat);
    kume.scale.set(1.12, 0.74, 1.08);
    kume.position.set(k.x, k.y, k.z);
    yaprakGrubu.add(kume);
  });
  grup.add(yaprakGrubu);

  // 4. Daldan sarkan sıcak kandil fenerler
  for (const fx of [-1.35, 0.95]) {
    const ip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.65, 5), sedirAhsapMat);
    ip.position.set(fx, 3.55, 0.85);
    grup.add(ip);
    const fener = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), fenerMat);
    fener.position.set(fx, 3.18, 0.85);
    grup.add(fener);
  }

  // 5. Çınar altı ahşap sedir + kilim + yastıklar + bakır çay sinisi
  const sedir = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.42, 1.05), sedirAhsapMat);
  sedir.position.set(-1.35, 0.22, 1.15);
  sedir.rotation.y = 0.42;
  grup.add(sedir);

  const kilim = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.06, 0.96), kilimMat);
  kilim.position.set(-1.35, 0.45, 1.15);
  kilim.rotation.y = 0.42;
  grup.add(kilim);

  const sirtYastik = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.32, 0.22), yastikMat);
  sirtYastik.position.set(-1.5, 0.62, 1.48);
  sirtYastik.rotation.y = 0.42;
  grup.add(sirtYastik);

  const siniSehpa = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.3, 0.34, 12), sedirAhsapMat);
  siniSehpa.position.set(-0.65, 0.17, 0.25);
  grup.add(siniSehpa);

  const siniTepsi = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.44, 0.04, 18), siniMat);
  siniTepsi.position.set(-0.65, 0.36, 0.25);
  grup.add(siniTepsi);

  // Tıklama vekil kutusu
  const vurguKutu = new THREE.Mesh(
    new THREE.CylinderGeometry(2.3, 2.3, 4.5, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  vurguKutu.position.set(-0.4, 2.25, 0.3);
  vurguKutu.userData = { etkilesimTuru: "cinar" };
  grup.add(vurguKutu);
  etkilesimListesi.push(vurguKutu);

  return { grup, yaprakGrubu };
}

function koylu3DKarakterOlustur({
  kaftanRenk = 0x1e3a8a,
  kusakRenk = 0xd97706,
  baslikTuru = "sarik",
  baslikRenk = 0xf8fafc,
  boyOlcek = 1.0,
}) {
  const k = new THREE.Group();

  const kumasiMat = new THREE.MeshStandardMaterial({ color: kaftanRenk, roughness: 0.82, metalness: 0.04 });
  const kusakMat = new THREE.MeshStandardMaterial({ color: kusakRenk, roughness: 0.72, metalness: 0.08 });
  const pantolonMat = new THREE.MeshStandardMaterial({ color: 0x3f3a34, roughness: 0.88 });
  const cizmeMat = new THREE.MeshStandardMaterial({ color: 0x291d14, roughness: 0.65 });
  const tenMat = new THREE.MeshStandardMaterial({ color: 0xf1c29b, roughness: 0.72 });
  const baslikMat = new THREE.MeshStandardMaterial({ color: baslikRenk, roughness: 0.78 });
  const gozMat = new THREE.MeshBasicMaterial({ color: 0x1c1917 });

  // Çizmeler ve bacaklar
  for (const sx of [-0.13, 0.13]) {
    const cizme = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.38, 8), cizmeMat);
    cizme.position.set(sx, 0.19, 0);
    k.add(cizme);

    const bacak = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.085, 0.42, 8), pantolonMat);
    bacak.position.set(sx, 0.56, 0);
    k.add(bacak);
  }

  // Kaftan / cepken gövde
  const etek = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.31, 0.56, 10), kumasiMat);
  etek.position.y = 0.88;
  k.add(etek);

  const gogus = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.48, 10), kumasiMat);
  gogus.position.y = 1.24;
  k.add(gogus);

  // Kuşak
  const kusak = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.11, 10), kusakMat);
  kusak.position.y = 1.04;
  k.add(kusak);

  // Kollar (canlı jest salınımı için referanslı)
  const solKol = new THREE.Group();
  solKol.position.set(-0.29, 1.38, 0);
  const solKolMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.058, 0.48, 8), kumasiMat);
  solKolMesh.position.y = -0.21;
  const solEl = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 8), tenMat);
  solEl.position.y = -0.46;
  solKol.add(solKolMesh, solEl);
  solKol.rotation.z = 0.18;
  k.add(solKol);

  const sagKol = new THREE.Group();
  sagKol.position.set(0.29, 1.38, 0);
  const sagKolMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.058, 0.48, 8), kumasiMat);
  sagKolMesh.position.y = -0.21;
  const sagEl = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 8), tenMat);
  sagEl.position.y = -0.46;
  sagKol.add(sagKolMesh, sagEl);
  sagKol.rotation.z = -0.18;
  k.add(sagKol);

  // Baş grubu (oyuncuya doğru hafif dönebilir)
  const basGrup = new THREE.Group();
  basGrup.position.y = 1.64;

  const kafa = new THREE.Mesh(new THREE.SphereGeometry(0.185, 14, 12), tenMat);
  basGrup.add(kafa);

  // Gözler (+Z yönüne bakar)
  for (const gx of [-0.065, 0.065]) {
    const goz = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), gozMat);
    goz.position.set(gx, 0.02, 0.168);
    basGrup.add(goz);
  }

  if (baslikTuru === "sarik") {
    const sarik = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.068, 8, 14), baslikMat);
    sarik.rotation.x = Math.PI / 2 - 0.12;
    sarik.position.y = 0.09;
    basGrup.add(sarik);
    const kavuk = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), kusakMat);
    kavuk.position.y = 0.14;
    basGrup.add(kavuk);
  } else if (baslikTuru === "bork") {
    const bork = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.24, 10), baslikMat);
    bork.position.y = 0.14;
    basGrup.add(bork);
  } else {
    // Başörtüsü / yazma
    const ortu = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.72), baslikMat);
    ortu.position.set(0, 0.02, -0.02);
    basGrup.add(ortu);
    const omuzOrtu = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.24, 0.22, 10), baslikMat);
    omuzOrtu.position.set(0, -0.14, -0.02);
    basGrup.add(omuzOrtu);
  }

  k.add(basGrup);
  k.scale.setScalar(boyOlcek);

  return { grup: k, basGrup, solKol, sagKol };
}

function cumbaliEvOlustur({ genislik = 4.6, derinlik = 3.8, renkUst = 0xf5efe6, kiremitRenk = 0x9a3412 }) {
  const ev = new THREE.Group();

  const tasDuvarMat = new THREE.MeshStandardMaterial({ color: 0x8c8275, roughness: 0.9 });
  const kerpicMat = new THREE.MeshStandardMaterial({ color: renkUst, roughness: 0.85 });
  const ahsapHatilMat = new THREE.MeshStandardMaterial({ color: 0x4a2e19, roughness: 0.78 });
  const kiremitMat = new THREE.MeshStandardMaterial({ color: kiremitRenk, roughness: 0.74 });
  const pencereIsikMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.45,
    roughness: 0.35,
  });

  // 1. Taş zemin kat
  const altKat = new THREE.Mesh(new THREE.BoxGeometry(genislik, 2.2, derinlik), tasDuvarMat);
  altKat.position.y = 1.1;
  ev.add(altKat);

  // Ahşap kapı
  const kapi = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.65, 0.12), ahsapHatilMat);
  kapi.position.set(0, 0.83, derinlik / 2 + 0.03);
  ev.add(kapi);

  // 2. Üst kat + cumba çıkması
  const ustKat = new THREE.Mesh(new THREE.BoxGeometry(genislik + 0.35, 2.15, derinlik + 0.45), kerpicMat);
  ustKat.position.y = 3.28;
  ev.add(ustKat);

  const cumba = new THREE.Mesh(new THREE.BoxGeometry(genislik * 0.44, 1.85, 0.72), kerpicMat);
  cumba.position.set(0, 3.25, derinlik / 2 + 0.48);
  ev.add(cumba);

  // Ahşap kuşak kirişleri
  const kusak = new THREE.Mesh(new THREE.BoxGeometry(genislik + 0.42, 0.14, derinlik + 0.52), ahsapHatilMat);
  kusak.position.y = 2.22;
  ev.add(kusak);

  // Sıcak ışıklı pencereler
  for (const px of [-genislik * 0.3, 0, genislik * 0.3]) {
    const zKonum = px === 0 ? derinlik / 2 + 0.85 : derinlik / 2 + 0.24;
    const cam = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.78, 0.06), pencereIsikMat);
    cam.position.set(px, 3.3, zKonum);
    ev.add(cam);
  }

  // 3. Kiremit kırma çatı ve taş baca
  const cati = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(genislik, derinlik) * 0.8, 1.55, 4),
    kiremitMat
  );
  cati.rotation.y = Math.PI / 4;
  cati.position.y = 5.12;
  ev.add(cati);

  const baca = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.15, 0.45), tasDuvarMat);
  baca.position.set(genislik * 0.26, 5.35, -0.35);
  ev.add(baca);

  return ev;
}

export default function KoyMeydani3DSahnesi({
  gunlukOlayHazir,
  aktifOlayTuru,
  misafirBaslik,
  misafirAltYazi,
  kalanSaat,
  diyalogAcik,
  onMisafirEtkilesim,
  onCinarSohbetAc,
  onBilgiMesaji,
  children,
}) {
  const tuvalKapsayiciRef = useRef(null);
  const misafirEtiketRef = useRef(null);
  const cinarEtiketRef = useRef(null);
  const cesmeEtiketRef = useRef(null);

  // Joystick durumu
  const joystickRef = useRef({ aktif: false, pointerId: null, dx: 0, dy: 0 });
  const [joyTopuz, setJoyTopuz] = useState({ x: 0, y: 0, aktif: false });
  const [yakinHedef, setYakinHedef] = useState(null); // "misafir" | "cinar" | "cesme" | null
  const [otoYuruyusBilgi, setOtoYuruyusBilgi] = useState(null);
  const [ipucuAcik, setIpucuAcik] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setIpucuAcik(false), 9000);
    return () => window.clearTimeout(t);
  }, []);

  // Dış callback'leri ref içinde tutalım ki WebGL sahnesi yeniden kurulmasın
  const geriCagrilarRef = useRef({
    onMisafirEtkilesim,
    onCinarSohbetAc,
    onBilgiMesaji,
    gunlukOlayHazir,
  });
  useEffect(() => {
    geriCagrilarRef.current = {
      onMisafirEtkilesim,
      onCinarSohbetAc,
      onBilgiMesaji,
      gunlukOlayHazir,
    };
  }, [onMisafirEtkilesim, onCinarSohbetAc, onBilgiMesaji, gunlukOlayHazir]);

  // Sahne içinden dışarıdan tetiklenebilen otomatik yürüyüş fonksiyonu
  const hedefeYuruRef = useRef(null);

  const misafirlereYuru = useCallback(() => {
    hedefeYuruRef.current?.("misafir", 0, 0.85, 0, -1.6);
  }, []);

  const cinaraYuru = useCallback(() => {
    hedefeYuruRef.current?.("cinar", 3.0, -0.7, 5.0, -2.3);
  }, []);

  const cesmeyeYuru = useCallback(() => {
    hedefeYuruRef.current?.("cesme", -3.0, -0.6, -5.2, -2.2);
  }, []);

  useEffect(() => {
    const kapsayici = tuvalKapsayiciRef.current;
    if (!kapsayici) return;

    const dokular = [];
    const etkilesimNesneleri = [];

    // Yazılımsal WebGL tespiti
    const testGl = document.createElement("canvas").getContext("webgl2");
    const yazilimGl = testGl ? yazilimGlTespit(testGl) : true;
    testGl?.getExtension("WEBGL_lose_context")?.loseContext();

    const renderer = new THREE.WebGLRenderer({
      antialias: !yazilimGl,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    const dokunmatik = dokunmatikMi();
    renderer.setPixelRatio(yazilimGl ? 1 : Math.min(window.devicePixelRatio || 1, dokunmatik ? 1.5 : 2));
    renderer.shadowMap.enabled = !yazilimGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const ilkGenislik = Math.max(320, kapsayici.clientWidth || 960);
    const ilkYukseklik = Math.max(240, kapsayici.clientHeight || 540);
    renderer.setSize(ilkGenislik, ilkYukseklik, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";

    while (kapsayici.firstChild) kapsayici.removeChild(kapsayici.firstChild);
    kapsayici.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const { kubbe, bulutGrubu } = gokKubbesiKur(scene, dokular);
    ortamHaritasiKur(renderer, scene, kubbe, 0.6);

    const camera = new THREE.PerspectiveCamera(62, ilkGenislik / ilkYukseklik, 0.1, 150);
    camera.position.set(0, GOZ_YUKSEKLIGI, 6.8);

    // Işıklandırma (Sıcak ikindi güneşi + serin gökyüzü dolgusu)
    const gunes = new THREE.DirectionalLight(0xffe2b4, 2.6);
    gunes.position.set(12, 18, 10);
    if (renderer.shadowMap.enabled) {
      gunes.castShadow = true;
      const golgeBoyut = dokunmatik ? 1024 : 2048;
      gunes.shadow.mapSize.set(golgeBoyut, golgeBoyut);
      // Dar kamera: yalnız meydan ve çevre evler (±15) gölge haritasına girer
      gunes.shadow.camera.left = -15;
      gunes.shadow.camera.right = 15;
      gunes.shadow.camera.top = 15;
      gunes.shadow.camera.bottom = -15;
      gunes.shadow.camera.near = 8;
      gunes.shadow.camera.far = 52;
      gunes.shadow.bias = -0.0004;
      gunes.shadow.normalBias = 0.035;
    }
    scene.add(gunes);

    const gokIsigi = new THREE.HemisphereLight(0xb8d2ee, 0x74603f, 0.85);
    scene.add(gokIsigi);

    // 1. Çayır zemin + Uzak Anadolu tepeleri (Doğal dış çevre — iç mekan kutusu yok!)
    const otDoku = otDokusuUret();
    dokular.push(otDoku);
    const cayirMat = new THREE.MeshStandardMaterial({ map: otDoku, color: 0xdfe8b8, roughness: 0.95 });
    const cayirZemin = new THREE.Mesh(new THREE.CircleGeometry(70, 40), cayirMat);
    cayirZemin.rotation.x = -Math.PI / 2;
    cayirZemin.position.y = -0.02;
    scene.add(cayirZemin);

    const tepeMat = new THREE.MeshStandardMaterial({ color: 0x688b4e, roughness: 0.96 });
    for (let i = 0; i < 10; i++) {
      const aci = (i / 10) * Math.PI * 2;
      const uzaklik = 34 + (i % 3) * 6;
      const tepe = new THREE.Mesh(new THREE.SphereGeometry(12 + (i % 4) * 3, 14, 10), tepeMat);
      tepe.scale.set(1.5, 0.42, 1.1);
      tepe.position.set(Math.cos(aci) * uzaklik, -1.2, Math.sin(aci) * uzaklik);
      scene.add(tepe);
    }

    // 2. Dairesel Arnavut kaldırımlı Köy Meydanı zemini + traverten bordür
    const tasDoku = meydanTasDokusuUret(renderer, dokular);
    const meydanMat = new THREE.MeshStandardMaterial({
      map: tasDoku,
      roughness: 0.86,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const meydanZemin = new THREE.Mesh(new THREE.CircleGeometry(11.8, 48), meydanMat);
    meydanZemin.rotation.x = -Math.PI / 2;
    meydanZemin.position.y = 0.01;
    scene.add(meydanZemin);

    const bordurHalka = new THREE.Mesh(
      new THREE.TorusGeometry(11.85, 0.22, 8, 48),
      new THREE.MeshStandardMaterial({ color: 0xc2b59b, roughness: 0.85 })
    );
    bordurHalka.rotation.x = Math.PI / 2;
    bordurHalka.position.y = 0.08;
    scene.add(bordurHalka);

    // 3. Merkez Taş Şadırvan / Meydan Çeşmesi (Sol)
    const { grup: sadirvanGrup, suDamlalari, suDoku, suYuzeyi } = sadirvanOlustur(etkilesimNesneleri);
    dokular.push(suDoku);
    scene.add(sadirvanGrup);

    // 4. Ulu Çınar & Çınar Altı Sohbet Sediri + Sohbet Ehli (Sağ)
    const { grup: cinarGrup, yaprakGrubu } = uluCinarVeSedirOlustur(etkilesimNesneleri);
    scene.add(cinarGrup);

    const sohbetEhli = koylu3DKarakterOlustur({
      kaftanRenk: 0x065f46,
      kusakRenk: 0xf59e0b,
      baslikTuru: "sarik",
      baslikRenk: 0xfef3c7,
      boyOlcek: 1.02,
    });
    sohbetEhli.grup.position.set(3.85, 0, -1.75);
    sohbetEhli.grup.rotation.y = -0.55;
    scene.add(sohbetEhli.grup);

    // 5. Kuzey Duyuru Kürsüsü & Sancak Direkleri
    const duyuruGrup = new THREE.Group();
    duyuruGrup.position.set(-0.4, 0, -7.6);
    const ilanAhsapMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.78 });
    for (const dx of [-0.95, 0.95]) {
      const direk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.5, 8), ilanAhsapMat);
      direk.position.set(dx, 1.25, 0);
      duyuruGrup.add(direk);
    }
    const ilanDoku = duyuruMetniDokusuUret(renderer, dokular);
    const panoLevha = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 1.05, 0.1),
      new THREE.MeshStandardMaterial({ map: ilanDoku, roughness: 0.8 })
    );
    panoLevha.position.set(0, 1.58, 0.03);
    duyuruGrup.add(panoLevha);

    const panoSacak = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.14, 0.65), ilanAhsapMat);
    panoSacak.position.set(0, 2.25, 0.05);
    panoSacak.rotation.x = 0.18;
    duyuruGrup.add(panoSacak);

    // İki yanda Selçuklu turkuaz ve al sancak direkleri
    const sancakBezleri = [];
    [
      { x: -2.4, renk: 0x0e7490 },
      { x: 2.4, renk: 0xb91c1c },
    ].forEach((s) => {
      const sDirek = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 4.2, 8), ilanAhsapMat);
      sDirek.position.set(s.x, 2.1, -0.2);
      duyuruGrup.add(sDirek);
      const bez = new THREE.Mesh(
        new THREE.PlaneGeometry(0.85, 1.35, 6, 6),
        new THREE.MeshStandardMaterial({ color: s.renk, roughness: 0.75, side: THREE.DoubleSide })
      );
      bez.position.set(s.x + 0.44, 3.35, -0.2);
      duyuruGrup.add(bez);
      sancakBezleri.push(bez);
    });
    scene.add(duyuruGrup);

    // 6. Çevredeki Geleneksel Cumbalı Anadolu Köy Evleri & Ağaçlar
    const evKonumlari = [
      { aci: -2.35, r: 15.2, renk: 0xf5efe6, kiremit: 0x9a3412 },
      { aci: -1.62, r: 15.6, renk: 0xefe5d5, kiremit: 0x852d12 },
      { aci: -0.82, r: 15.0, renk: 0xf7f2e8, kiremit: 0xa33b18 },
      { aci: 0.75, r: 15.4, renk: 0xf2eadc, kiremit: 0x9a3412 },
      { aci: 2.38, r: 15.4, renk: 0xf5efe6, kiremit: 0x8c2f14 },
    ];
    for (const ek of evKonumlari) {
      const ev = cumbaliEvOlustur({ renkUst: ek.renk, kiremitRenk: ek.kiremit });
      ev.position.set(Math.sin(ek.aci) * ek.r, 0, Math.cos(ek.aci) * ek.r);
      ev.lookAt(0, 0, 0);
      scene.add(ev);
    }

    // Çevre servi ağaçları
    const serviYaprakMat = new THREE.MeshStandardMaterial({ color: 0x26582e, roughness: 0.88 });
    const serviGovdeMat = new THREE.MeshStandardMaterial({ color: 0x4a2e19, roughness: 0.9 });
    for (let i = 0; i < 12; i++) {
      const aci = (i / 12) * Math.PI * 2 + 0.22;
      if (Math.abs(aci) < 0.45) continue; // Güney giriş yolunu açık bırak
      const r = 17.5 + (i % 3) * 2.2;
      const servi = new THREE.Group();
      const sGovde = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.3, 7), serviGovdeMat);
      sGovde.position.y = 0.65;
      const sTac = new THREE.Mesh(new THREE.ConeGeometry(0.95, 4.4, 9), serviYaprakMat);
      sTac.position.y = 3.1;
      servi.add(sGovde, sTac);
      servi.position.set(Math.sin(aci) * r, 0, Math.cos(aci) * r);
      scene.add(servi);
    }

    // 7. MEYDAN MERKEZİ GÜNLÜK MİSAFİRLER (Dava Sahipleri veya Köye Gelen Göçmen Aile)
    const misafirGrup = new THREE.Group();
    misafirGrup.position.set(0, 0, -1.6);
    const misafirKarakterler = [];

    if (gunlukOlayHazir) {
      // Altlarına Anadolu halısı / kilimi
      const meydanHalisi = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.03, 1.7),
        new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.9 })
      );
      meydanHalisi.position.y = 0.025;
      misafirGrup.add(meydanHalisi);

      if (aktifOlayTuru === "dava") {
        const davaci1 = koylu3DKarakterOlustur({
          kaftanRenk: 0x1d4ed8,
          kusakRenk: 0xf59e0b,
          baslikTuru: "sarik",
          baslikRenk: 0xf8fafc,
        });
        davaci1.grup.position.set(-0.68, 0.03, 0);
        davaci1.grup.rotation.y = 0.35;
        misafirGrup.add(davaci1.grup);
        misafirKarakterler.push(davaci1);

        const davaci2 = koylu3DKarakterOlustur({
          kaftanRenk: 0x991b1b,
          kusakRenk: 0xd97706,
          baslikTuru: "bork",
          baslikRenk: 0x78350f,
        });
        davaci2.grup.position.set(0.68, 0.03, 0);
        davaci2.grup.rotation.y = -0.35;
        misafirGrup.add(davaci2.grup);
        misafirKarakterler.push(davaci2);

        // Ortada küçük ahşap rahle/kürsü ve ferman tomarı
        const rahle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.28, 0.88, 8),
          ilanAhsapMat
        );
        rahle.position.set(0, 0.46, 0.18);
        misafirGrup.add(rahle);
      } else {
        const yolcu1 = koylu3DKarakterOlustur({
          kaftanRenk: 0x3f6212,
          kusakRenk: 0xb45309,
          baslikTuru: "bork",
          baslikRenk: 0x57534e,
        });
        yolcu1.grup.position.set(-0.62, 0.03, 0);
        yolcu1.grup.rotation.y = 0.25;
        misafirGrup.add(yolcu1.grup);
        misafirKarakterler.push(yolcu1);

        const yolcu2 = koylu3DKarakterOlustur({
          kaftanRenk: 0x0f766e,
          kusakRenk: 0xfbbf24,
          baslikTuru: "yazma",
          baslikRenk: 0xfef3c7,
          boyOlcek: 0.96,
        });
        yolcu2.grup.position.set(0.62, 0.03, 0);
        yolcu2.grup.rotation.y = -0.25;
        misafirGrup.add(yolcu2.grup);
        misafirKarakterler.push(yolcu2);

        // Yolcu sandığı ve denk bohçası
        const sandik = new THREE.Mesh(
          new THREE.BoxGeometry(0.58, 0.42, 0.38),
          ilanAhsapMat
        );
        sandik.position.set(0, 0.24, 0.32);
        misafirGrup.add(sandik);
      }

      const misafirVurguKutu = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 2.2, 1.8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      misafirVurguKutu.position.y = 1.1;
      misafirVurguKutu.userData = { etkilesimTuru: "misafir" };
      misafirGrup.add(misafirVurguKutu);
      etkilesimNesneleri.push(misafirVurguKutu);
    }
    scene.add(misafirGrup);

    // Meydan çevresinde rüzgârda sallanan çim tutamları
    const otTutamDoku = otTutamiDokusuUret();
    dokular.push(otTutamDoku);
    const tutamGeo = new THREE.PlaneGeometry(0.8, 0.62);
    const tutamMat = new THREE.MeshStandardMaterial({ map: otTutamDoku, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 1 });
    const tutamlar = [];
    for (let i = 0; i < 64; i++) {
      const g = new THREE.Group();
      const a = new THREE.Mesh(tutamGeo, tutamMat);
      const b = new THREE.Mesh(tutamGeo, tutamMat);
      a.position.y = b.position.y = 0.3;
      b.rotation.y = Math.PI / 2;
      g.add(a, b);
      const aci = Math.random() * Math.PI * 2;
      const r = 12.3 + Math.random() * 6;
      g.position.set(Math.sin(aci) * r, 0, Math.cos(aci) * r);
      g.scale.setScalar(0.8 + Math.random() * 0.9);
      scene.add(g);
      tutamlar.push({ g, faz: Math.random() * 6 });
    }
    const tozGuncelle = tozZerreleriKur(scene, dokular);

    // Gölge: yakın çevredeki nesneler gölge atar/alır (zemin ve tepeler hariç)
    if (renderer.shadowMap.enabled) {
      scene.traverse((n) => {
        if (!n.isMesh || n.material?.visible === false || n.isSprite) return;
        if (n === kubbe || n === cayirZemin || n.geometry.type === "SphereGeometry" && n.scale.x > 1.4) return;
        if (n.material?.transparent && n.material?.alphaTest > 0) return; // çim tutamları
        const uzak = Math.hypot(n.getWorldPosition(_projMisafir).x, _projMisafir.z) > 19;
        n.castShadow = !uzak && n !== meydanZemin;
        n.receiveShadow = true;
      });
    }

    // 8. Dokunarak Yürüme Altın Hedef Halkası (Zemin üzerinde parlar)
    const hedefHalka = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.48, 28),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      })
    );
    hedefHalka.rotation.x = -Math.PI / 2;
    hedefHalka.position.y = 0.04;
    hedefHalka.visible = false;
    scene.add(hedefHalka);

    // ---------- BİRİNCİ ŞAHIS (FPS) HAREKET VE KAMERA DURUMU ----------
    const oyuncuDurum = {
      x: 0,
      z: 6.8,
      yaw: 0, // 0 = Kuzeye (-Z yönüne) bakış
      pitch: -0.04,
      hedefYaw: 0,
      hedefPitch: -0.04,
      adimFazi: 0,
      otoHedef: null, // { tur, x, z, bakX, bakZ }
      misafirOtoAcildi: false,
    };

    const tuslar = {};
    const raycaster = new THREE.Raycaster();

    hedefeYuruRef.current = (tur, hx, hz, bakX, bakZ) => {
      oyuncuDurum.otoHedef = { tur, x: hx, z: hz, bakX, bakZ };
      hedefHalka.position.set(hx, 0.045, hz);
      hedefHalka.visible = true;
      setOtoYuruyusBilgi(
        tur === "misafir"
          ? "Misafirlerin yanına yürüyorsun…"
          : tur === "cinar"
          ? "Ulu Çınar gölgesine yürüyorsun…"
          : tur === "cesme"
          ? "Meydan Çeşmesi'ne yürüyorsun…"
          : "Seçilen noktaya yürüyorsun…"
      );
    };

    // Kamera sürükleme & dokunarak yürüme (Tap-to-walk) dinleyicileri
    const bakisSurukleme = {
      aktif: false,
      pointerId: null,
      basX: 0,
      basY: 0,
      sonX: 0,
      sonY: 0,
      toplamKayma: 0,
    };

    const tuvalPointerDown = (e) => {
      if (bakisSurukleme.aktif) return;
      bakisSurukleme.aktif = true;
      bakisSurukleme.pointerId = e.pointerId;
      bakisSurukleme.basX = e.clientX;
      bakisSurukleme.basY = e.clientY;
      bakisSurukleme.sonX = e.clientX;
      bakisSurukleme.sonY = e.clientY;
      bakisSurukleme.toplamKayma = 0;
      renderer.domElement.setPointerCapture?.(e.pointerId);
    };

    const tuvalPointerMove = (e) => {
      if (!bakisSurukleme.aktif || e.pointerId !== bakisSurukleme.pointerId) return;
      const dx = e.clientX - bakisSurukleme.sonX;
      const dy = e.clientY - bakisSurukleme.sonY;
      bakisSurukleme.sonX = e.clientX;
      bakisSurukleme.sonY = e.clientY;
      bakisSurukleme.toplamKayma += Math.hypot(dx, dy);

      if (bakisSurukleme.toplamKayma > 5) {
        oyuncuDurum.hedefYaw -= dx * 0.0046;
        oyuncuDurum.hedefPitch = Math.max(
          -0.58,
          Math.min(0.58, oyuncuDurum.hedefPitch - dy * 0.0036)
        );
      }
    };

    const tuvalPointerUp = (e) => {
      if (!bakisSurukleme.aktif || e.pointerId !== bakisSurukleme.pointerId) return;
      bakisSurukleme.aktif = false;
      renderer.domElement.releasePointerCapture?.(e.pointerId);

      // Eğer sürükleme değil temiz bir dokunuş / tıklama ise -> Dokunulan yere veya kişilerin yanına yürü!
      if (bakisSurukleme.toplamKayma < 9) {
        const rect = renderer.domElement.getBoundingClientRect();
        _tikFare.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        _tikFare.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(_tikFare, camera);
        const vurulanlar = raycaster.intersectObjects(etkilesimNesneleri, false);
        if (vurulanlar.length > 0) {
          const tur = vurulanlar[0].object.userData?.etkilesimTuru;
          if (tur === "misafir") {
            hedefeYuruRef.current?.("misafir", 0, 0.85, 0, -1.6);
            return;
          }
          if (tur === "cinar") {
            hedefeYuruRef.current?.("cinar", 3.0, -0.7, 5.0, -2.3);
            return;
          }
          if (tur === "cesme") {
            hedefeYuruRef.current?.("cesme", -3.0, -0.6, -5.2, -2.2);
            return;
          }
        }

        // Zemine tıklandıysa tıklanan taş noktasına yürü
        if (raycaster.ray.intersectPlane(_zeminDuzlemi, _tikNoktasi)) {
          const r = Math.hypot(_tikNoktasi.x, _tikNoktasi.z);
          if (r <= MEYDAN_YARICAP + 1.5) {
            const sinirliOran = r > MEYDAN_YARICAP ? MEYDAN_YARICAP / r : 1;
            const hx = _tikNoktasi.x * sinirliOran;
            const hz = _tikNoktasi.z * sinirliOran;
            hedefeYuruRef.current?.("zemin", hx, hz, hx, hz);
          }
        }
      }
    };

    const tusBas = (e) => {
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        tuslar[e.code] = true;
        oyuncuDurum.otoHedef = null;
        hedefHalka.visible = false;
      }
    };
    const tusBirak = (e) => {
      tuslar[e.code] = false;
    };

    const boyutGuncelle = () => {
      if (!kapsayici) return;
      const w = Math.max(200, kapsayici.clientWidth);
      const h = Math.max(200, kapsayici.clientHeight);
      camera.aspect = w / h;
      // Dar (dik) ekranda görüş alanını genişlet: meydan kadrajdan taşmasın
      camera.fov = camera.aspect < 1 ? Math.min(82, 62 / Math.max(0.62, camera.aspect) ** 0.55) : 62;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    boyutGuncelle();
    const boyutGozlem = new ResizeObserver(boyutGuncelle);
    boyutGozlem.observe(kapsayici);

    const tuvalEl = renderer.domElement;
    tuvalEl.addEventListener("pointerdown", tuvalPointerDown);
    tuvalEl.addEventListener("pointermove", tuvalPointerMove);
    tuvalEl.addEventListener("pointerup", tuvalPointerUp);
    tuvalEl.addEventListener("pointercancel", tuvalPointerUp);
    window.addEventListener("keydown", tusBas);
    window.addEventListener("keyup", tusBirak);
    window.addEventListener("resize", boyutGuncelle);
    window.addEventListener("orientationchange", boyutGuncelle);

    if (!yazilimGl) {
      renderer.compile(scene, camera);
    }

    // 3D Dünya koordinatını ekran üzerindeki yüzen etikete yansıtır
    const etiketYansit = (el, dunyaVek, w, h) => {
      if (!el) return;
      dunyaVek.project(camera);
      if (dunyaVek.z > 1) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        return;
      }
      const sx = (dunyaVek.x * 0.5 + 0.5) * w;
      const sy = (-dunyaVek.y * 0.5 + 0.5) * h;
      const icerde = sx > 20 && sx < w - 20 && sy > 20 && sy < h - 20;
      el.style.opacity = icerde ? "1" : "0";
      el.style.pointerEvents = icerde ? "auto" : "none";
      el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%)`;
    };

    let oncekiYakin = null;
    const olcer = zamanOlcerKur();
    const zamanlayici = kareZamanlayiciOlustur(renderer.getContext(), yazilimGl);

    const kareCiz = () => {
      const dt = olcer.guncelle();
      const gecen = olcer.gecen();

      const joy = joystickRef.current;
      let ileriGiris = 0;
      let yanGiris = 0;

      if (joy.aktif && (Math.abs(joy.dx) > 0.04 || Math.abs(joy.dy) > 0.04)) {
        oyuncuDurum.otoHedef = null;
        hedefHalka.visible = false;
        ileriGiris = -joy.dy;
        // Mobil tek parmak rahatlığı için yatay joystick hem bakışı döndürür hem hafif yana süzülür
        oyuncuDurum.hedefYaw -= joy.dx * 1.85 * dt;
        yanGiris = joy.dx * 0.35;
      } else {
        if (tuslar.KeyW || tuslar.ArrowUp) ileriGiris += 1;
        if (tuslar.KeyS || tuslar.ArrowDown) ileriGiris -= 1;
        if (tuslar.KeyA) yanGiris -= 1;
        if (tuslar.KeyD) yanGiris += 1;
        if (tuslar.ArrowLeft) oyuncuDurum.hedefYaw += 1.9 * dt;
        if (tuslar.ArrowRight) oyuncuDurum.hedefYaw -= 1.9 * dt;
      }

      let hareketVar = false;

      // Otomatik Dokun-ve-Yürü (Tap-to-Walk)
      if (oyuncuDurum.otoHedef) {
        const h = oyuncuDurum.otoHedef;
        const dx = h.x - oyuncuDurum.x;
        const dz = h.z - oyuncuDurum.z;
        const uzaklik = Math.hypot(dx, dz);

        // Yürürken bakışı hedefe doğru yumuşakça çevir
        const bakDx = h.bakX - oyuncuDurum.x;
        const bakDz = h.bakZ - oyuncuDurum.z;
        if (Math.hypot(bakDx, bakDz) > 0.15) {
          const istenenYaw = Math.atan2(-bakDx, -bakDz);
          oyuncuDurum.hedefYaw =
            oyuncuDurum.yaw + aciFarkiNormalize(istenenYaw, oyuncuDurum.yaw);
          oyuncuDurum.hedefPitch = -0.03;
        }

        if (uzaklik > 0.25) {
          const adim = Math.min(uzaklik, 5.4 * dt);
          oyuncuDurum.x += (dx / uzaklik) * adim;
          oyuncuDurum.z += (dz / uzaklik) * adim;
          hareketVar = true;
        } else {
          // Hedefe varıldı!
          const varilanTur = h.tur;
          oyuncuDurum.otoHedef = null;
          hedefHalka.visible = false;
          setOtoYuruyusBilgi(null);

          if (varilanTur === "misafir" && geriCagrilarRef.current.gunlukOlayHazir) {
            geriCagrilarRef.current.onMisafirEtkilesim?.();
          } else if (varilanTur === "cinar") {
            geriCagrilarRef.current.onBilgiMesaji?.(
              "🌳 Ulu Çınar'ın gölgesine geldin! Çınar Altı Sohbeti'ne katılabilirsin."
            );
          } else if (varilanTur === "cesme") {
            geriCagrilarRef.current.onBilgiMesaji?.(
              "⛲ Meydan şadırvanının serin suyundan içtin, gönlün ferahladı!"
            );
          }
        }
      } else if (Math.abs(ileriGiris) > 0.01 || Math.abs(yanGiris) > 0.01) {
        _ileriYon.set(-Math.sin(oyuncuDurum.yaw), 0, -Math.cos(oyuncuDurum.yaw));
        _sagYon.set(Math.cos(oyuncuDurum.yaw), 0, -Math.sin(oyuncuDurum.yaw));
        _hareketVek.set(0, 0, 0);
        _hareketVek.addScaledVector(_ileriYon, ileriGiris);
        _hareketVek.addScaledVector(_sagYon, yanGiris);
        if (_hareketVek.lengthSq() > 1) _hareketVek.normalize();

        oyuncuDurum.x += _hareketVek.x * 3.9 * dt;
        oyuncuDurum.z += _hareketVek.z * 3.9 * dt;
        hareketVar = true;
      }

      // Engel ve sınır çarpışma kontrolü
      const tumEngeller = geriCagrilarRef.current.gunlukOlayHazir
        ? [...ENGEL_DAIRELERI, { x: 0, z: -1.6, r: 1.35 }]
        : ENGEL_DAIRELERI;

      for (const eng of tumEngeller) {
        const ex = oyuncuDurum.x - eng.x;
        const ez = oyuncuDurum.z - eng.z;
        const mes = Math.hypot(ex, ez);
        if (mes < eng.r && mes > 0.001) {
          oyuncuDurum.x = eng.x + (ex / mes) * eng.r;
          oyuncuDurum.z = eng.z + (ez / mes) * eng.r;
        }
      }

      const merkezMesafe = Math.hypot(oyuncuDurum.x, oyuncuDurum.z);
      if (merkezMesafe > MEYDAN_YARICAP) {
        oyuncuDurum.x = (oyuncuDurum.x / merkezMesafe) * MEYDAN_YARICAP;
        oyuncuDurum.z = (oyuncuDurum.z / merkezMesafe) * MEYDAN_YARICAP;
      }

      // İpeksi kamera bakış yumuşatma ve doğal yürüme baş salınımı (head-bob)
      oyuncuDurum.yaw = THREE.MathUtils.damp(oyuncuDurum.yaw, oyuncuDurum.hedefYaw, 11, dt);
      oyuncuDurum.pitch = THREE.MathUtils.damp(oyuncuDurum.pitch, oyuncuDurum.hedefPitch, 11, dt);

      if (hareketVar) {
        oyuncuDurum.adimFazi += dt * 9.2;
      }
      const basYaylanmaY = hareketVar ? Math.sin(oyuncuDurum.adimFazi) * 0.042 : 0;
      const basYaylanmaX = hareketVar ? Math.cos(oyuncuDurum.adimFazi * 0.5) * 0.018 : 0;

      camera.position.set(
        oyuncuDurum.x + basYaylanmaX,
        GOZ_YUKSEKLIGI + basYaylanmaY,
        oyuncuDurum.z
      );
      _kameraEuler.set(oyuncuDurum.pitch, oyuncuDurum.yaw, 0);
      camera.quaternion.setFromEuler(_kameraEuler);

      // Yakınlık algılama (Joystick / klavye ile misafirlerin yanına gelince otomatik selamlama)
      const misafirUzaklik = Math.hypot(oyuncuDurum.x - 0, oyuncuDurum.z - -1.6);
      const cinarUzaklik = Math.hypot(oyuncuDurum.x - 4.4, oyuncuDurum.z - -2.0);
      const cesmeUzaklik = Math.hypot(oyuncuDurum.x - -5.2, oyuncuDurum.z - -2.2);

      let yeniYakin = null;
      if (geriCagrilarRef.current.gunlukOlayHazir && misafirUzaklik < 2.95) {
        yeniYakin = "misafir";
        if (!oyuncuDurum.misafirOtoAcildi) {
          oyuncuDurum.misafirOtoAcildi = true;
          geriCagrilarRef.current.onMisafirEtkilesim?.();
        }
      } else {
        if (misafirUzaklik > 3.6) oyuncuDurum.misafirOtoAcildi = false;
        if (cinarUzaklik < 3.5) yeniYakin = "cinar";
        else if (cesmeUzaklik < 3.3) yeniYakin = "cesme";
      }

      if (yeniYakin !== oncekiYakin) {
        oncekiYakin = yeniYakin;
        setYakinHedef(yeniYakin);
      }

      // Sahne içi canlı animasyonlar: Şadırvan suyu, Ulu Çınar yaprakları, Sancaklar ve Misafir jestleri
      for (const sd of suDamlalari) {
        const t = ((gecen * 1.4 + sd.faz) % 1);
        const r = 0.36 + t * 0.52;
        sd.mesh.position.set(
          Math.cos(sd.aci) * r,
          1.54 - t * t * 0.62,
          Math.sin(sd.aci) * r
        );
      }

      yaprakGrubu.rotation.z = Math.sin(gecen * 1.1) * 0.028;
      yaprakGrubu.rotation.x = Math.cos(gecen * 0.85) * 0.02;

      for (let i = 0; i < sancakBezleri.length; i++) {
        sancakBezleri[i].rotation.y = Math.sin(gecen * 2.1 + i) * 0.14;
      }

      if (hedefHalka.visible) {
        const nabiz = 0.92 + Math.sin(gecen * 5.0) * 0.12;
        hedefHalka.scale.setScalar(nabiz);
      }

      misafirKarakterler.forEach((mk, idx) => {
        mk.solKol.rotation.x = Math.sin(gecen * 2.2 + idx * 1.5) * 0.22;
        mk.sagKol.rotation.x = -Math.sin(gecen * 1.9 + idx) * 0.18;
        // Oyuncu yaklaştıkça başlarını oyuncuya çevirsinler
        if (misafirUzaklik < 6.5) {
          mk.basGrup.rotation.y = Math.sin(gecen * 0.9 + idx) * 0.12;
        }
      });
      sohbetEhli.sagKol.rotation.x = -0.35 + Math.sin(gecen * 2.0) * 0.12;
      // Nefes alma / ağırlık verme: kişiler hafifçe salınır
      sohbetEhli.grup.rotation.z = Math.sin(gecen * 1.3) * 0.01;
      misafirKarakterler.forEach((mk, idx) => {
        mk.grup.rotation.z = Math.sin(gecen * 1.2 + idx * 2.1) * 0.012;
        mk.grup.position.y = 0.03 + Math.max(0, Math.sin(gecen * 1.7 + idx)) * 0.006;
      });

      // Şadırvan suyu: halka dalgaları yavaşça döner ve kayar
      suDoku.rotation = gecen * 0.06;
      suDoku.offset.set(Math.sin(gecen * 0.7) * 0.02, Math.cos(gecen * 0.5) * 0.02);
      suYuzeyi.position.y = 0.93 + Math.sin(gecen * 2.2) * 0.008;

      for (const o of tutamlar) o.g.rotation.z = Math.sin(gecen * 1.4 + o.faz) * 0.1;
      tozGuncelle(gecen, dt);
      bulutGrubu.rotation.y += dt * 0.004;

      renderer.render(scene, camera);

      // Yüzen 3D etiket konumlarını güncelle
      const w = kapsayici.clientWidth || ilkGenislik;
      const h = kapsayici.clientHeight || ilkYukseklik;

      _projMisafir.set(0, 2.25, -1.6);
      etiketYansit(misafirEtiketRef.current, _projMisafir, w, h);

      _projCinar.set(4.8, 3.75, -2.0);
      etiketYansit(cinarEtiketRef.current, _projCinar, w, h);

      _projCesme.set(-5.4, 3.45, -2.2);
      etiketYansit(cesmeEtiketRef.current, _projCesme, w, h);

      zamanlayici.sonraki(kareCiz);
    };

    zamanlayici.sonraki(kareCiz);

    return () => {
      zamanlayici.iptal();
      hedefeYuruRef.current = null;
      tuvalEl.removeEventListener("pointerdown", tuvalPointerDown);
      tuvalEl.removeEventListener("pointermove", tuvalPointerMove);
      tuvalEl.removeEventListener("pointerup", tuvalPointerUp);
      tuvalEl.removeEventListener("pointercancel", tuvalPointerUp);
      window.removeEventListener("keydown", tusBas);
      window.removeEventListener("keyup", tusBirak);
      window.removeEventListener("resize", boyutGuncelle);
      window.removeEventListener("orientationchange", boyutGuncelle);
      boyutGozlem.disconnect();
      olcer.birak();

      const dokuKumesi = new Set(dokular);
      scene.traverse((nesne) => {
        nesne.geometry?.dispose?.();
        if (nesne.material) {
          const mList = Array.isArray(nesne.material) ? nesne.material : [nesne.material];
          for (const m of mList) {
            for (const v of Object.values(m)) if (v?.isTexture) dokuKumesi.add(v);
            m.dispose();
          }
        }
      });
      for (const t of dokuKumesi) t?.dispose?.();
      scene.environment?.dispose?.();
      renderer.dispose();
      renderer.forceContextLoss?.();
      renderer.domElement.remove();
    };
  }, [gunlukOlayHazir, aktifOlayTuru]);

  // ---------- MOBİL SANAL JOYSTICK OLAY İŞLEYİCİLERİ ----------
  const joystickMerkezGuncelle = (e, tabanEl) => {
    const rect = tabanEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maksR = rect.width * 0.36;

    let vx = e.clientX - cx;
    let vy = e.clientY - cy;
    const uz = Math.hypot(vx, vy);
    if (uz > maksR) {
      vx = (vx / uz) * maksR;
      vy = (vy / uz) * maksR;
    }

    joystickRef.current.dx = vx / maksR;
    joystickRef.current.dy = vy / maksR;
    setJoyTopuz({ x: vx, y: vy, aktif: true });
  };

  const joyBaslat = (e) => {
    e.stopPropagation();
    const tabanEl = e.currentTarget;
    joystickRef.current.aktif = true;
    joystickRef.current.pointerId = e.pointerId;
    tabanEl.setPointerCapture?.(e.pointerId);
    joystickMerkezGuncelle(e, tabanEl);
  };

  const joyHareket = (e) => {
    if (!joystickRef.current.aktif || e.pointerId !== joystickRef.current.pointerId) return;
    e.stopPropagation();
    joystickMerkezGuncelle(e, e.currentTarget);
  };

  const joyBirak = (e) => {
    if (!joystickRef.current.aktif || e.pointerId !== joystickRef.current.pointerId) return;
    e.stopPropagation();
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    joystickRef.current = { aktif: false, pointerId: null, dx: 0, dy: 0 };
    setJoyTopuz({ x: 0, y: 0, aktif: false });
  };

  return (
    <div className="relative h-[64vh] min-h-[420px] max-h-[680px] kisa:h-[calc(100dvh-4.5rem)]! kisa:min-h-0! w-full overflow-hidden rounded-3xl bg-stone-950 shadow-2xl ring-2 ring-amber-500/40 select-none">
      {/* Three.js WebGL 3D Birinci Şahıs Sahnesi */}
      <div ref={tuvalKapsayiciRef} className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing" />

      {/* Üst Bilgi Şeridi (Görüş Alanını Kapatmayan İnce HUD) */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-wrap items-center justify-between gap-2">
        <div
          className={`ust-levha max-w-[34rem] rounded-xl px-3 py-1.5 text-[11px] font-semibold text-amber-100 transition-opacity duration-700 ${
            ipucuAcik ? "opacity-100" : "opacity-0"
          }`}
        >
          👁️ <b>Köy Meydanı:</b> Sol alttaki çubukla yürü, ekranı sürükleyerek etrafa bak, kişilere dokunup yanlarına git.
        </div>

        {otoYuruyusBilgi && (
          <div className="varak-dugme rounded-xl px-3 py-1 text-[11px] font-black">👣 {otoYuruyusBilgi}</div>
        )}
      </div>

      {/* 3D Sahne Üzeri Yüzen Karakter / Mekan Etiketleri (Tıklanınca Doğrudan Yanlarına Yürütür) */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {/* Meydan Misafirleri Etiketi */}
        <button
          ref={misafirEtiketRef}
          type="button"
          onClick={misafirlereYuru}
          style={{ left: 0, top: 0, opacity: 0 }}
          className="absolute flex flex-col items-center text-center transition-opacity duration-150"
        >
          {gunlukOlayHazir ? (
            <>
              <span className="ust-levha max-w-[220px] rounded-2xl px-3 py-1.5 text-[11px] font-bold text-amber-100">
                {diyalogAcik ? "💬 Seni dinliyorlar…" : misafirBaslik}
              </span>
              <span className="varak-dugme mt-1 max-w-[210px] truncate rounded-lg px-2.5 py-0.5 text-[10px]">
                👣 {misafirAltYazi}
              </span>
            </>
          ) : (
            <span className="ust-levha max-w-[220px] rounded-2xl px-3 py-1.5 text-[11px] font-semibold text-emerald-200">
              🔒 Bugünkü meydan görevi tamamlandı ({kalanSaat} sa sonra yeni görev açılır)
            </span>
          )}
        </button>

        {/* Ulu Çınar & Sohbet Sediri Etiketi */}
        <button
          ref={cinarEtiketRef}
          type="button"
          onClick={cinaraYuru}
          style={{ left: 0, top: 0, opacity: 0 }}
          className="ust-levha absolute rounded-xl px-3 py-1.5 text-[11px] font-black text-amber-200 hover:brightness-125"
        >
          🌳 Ulu Çınar &amp; Sohbet Sediri (Yanına Yürü)
        </button>

        {/* Meydan Şadırvanı Etiketi */}
        <button
          ref={cesmeEtiketRef}
          type="button"
          onClick={cesmeyeYuru}
          style={{ left: 0, top: 0, opacity: 0 }}
          className="ust-levha absolute rounded-xl px-2.5 py-1 text-[11px] font-bold text-sky-200 hover:brightness-125"
        >
          ⛲ Meydan Şadırvanı
        </button>
      </div>

      {/* SOL ALT: MOBİL SANAL JOYSTICK (Dokunmatik & Fare Destekli) */}
      <div className="absolute bottom-4 left-4 z-30 flex items-center gap-3">
        <div
          role="slider"
          aria-label="Yürüme Joystick Kontrolü"
          aria-valuenow={Math.round(joyTopuz.y)}
          tabIndex={0}
          onPointerDown={joyBaslat}
          onPointerMove={joyHareket}
          onPointerUp={joyBirak}
          onPointerCancel={joyBirak}
          style={{ touchAction: "none" }}
          className="ust-levha relative grid h-28 w-28 cursor-pointer place-items-center rounded-full ring-2 ring-amber-400/60"
        >
          <span className="pointer-events-none absolute top-1.5 text-[10px] font-black text-amber-300/75">▲</span>
          <span className="pointer-events-none absolute bottom-1.5 text-[10px] font-black text-amber-300/75">▼</span>
          <span className="pointer-events-none absolute left-2 text-[10px] font-black text-amber-300/75">◀</span>
          <span className="pointer-events-none absolute right-2 text-[10px] font-black text-amber-300/75">▶</span>

          <div className="pointer-events-none absolute h-14 w-14 rounded-full border border-amber-400/25 bg-stone-900/60" />

          <div
            style={{
              transform: `translate3d(${joyTopuz.x.toFixed(1)}px, ${joyTopuz.y.toFixed(1)}px, 0)`,
            }}
            className={`pointer-events-none grid h-11 w-11 place-items-center rounded-full shadow-lg ring-2 transition-colors ${
              joyTopuz.aktif
                ? "bg-amber-400 text-stone-950 ring-white"
                : "bg-amber-500/90 text-stone-950 ring-amber-200"
            }`}
          >
            <span className="text-xs font-black">👣</span>
          </div>
        </div>
      </div>

      {/* SAĞ ALT: YAKINLIK ETKİLEŞİM VE HIZLI ULAŞIM DÜĞMELERİ */}
      <div className="absolute right-4 bottom-4 z-30 flex flex-col items-end gap-2">
        {yakinHedef === "misafir" && gunlukOlayHazir && !diyalogAcik && (
          <button
            type="button"
            onClick={onMisafirEtkilesim}
            className="varak-dugme rounded-2xl px-4 py-2.5 text-xs sm:text-sm"
          >
            💬 Misafirlerle Konuş
          </button>
        )}

        {yakinHedef === "cinar" && (
          <button
            type="button"
            onClick={onCinarSohbetAc}
            className="varak-dugme rounded-2xl px-4 py-2.5 text-xs sm:text-sm"
          >
            🌳 Çınar Altı Sohbeti&apos;ne Katıl →
          </button>
        )}

        <div className="flex flex-wrap justify-end gap-1.5">
          {gunlukOlayHazir && (
            <button
              type="button"
              onClick={misafirlereYuru}
              className="ust-levha rounded-xl px-3 py-2 text-xs font-bold text-amber-200 hover:brightness-125"
            >
              👣 Misafirlerin Yanına Git
            </button>
          )}
          <button
            type="button"
            onClick={cinaraYuru}
            className="ust-levha rounded-xl px-3 py-2 text-xs font-bold text-emerald-200 hover:brightness-125"
          >
            🌳 Çınar&apos;a Yürü
          </button>
        </div>
      </div>

      {/* 3D OYUN EKRANI İÇİ POP-UP / DİYALOG KATMANI (Yukarıda veya aşağıda kalmaz, doğrudan ekran içinde açılır!) */}
      {children}
    </div>
  );
}
