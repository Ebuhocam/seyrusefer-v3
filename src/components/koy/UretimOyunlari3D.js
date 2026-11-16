"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { ORMAN_KESIF_BOLGELERI } from "@/lib/oyun/sabitler";

// =============================================================
// SEYRÜSEFER v3 — 3D ÜRETİM MİNİ OYUNLARI MOTORU (Three.js)
// 1. TasOcagi3DSahnesi: 6 Bağımsız 3D Kaya, Kazma Darbesi, Çatlak & Parçacık Dağılma Fizikleri
// 2. OrmanKesifVeKesimSahnesi: İşçi Başına 2 Seferlik Keşif Haritası + 3D Kurumuş Ağaç Kesme & Devrilme
// 3. TarlaFPS3DSahnesi: 6 Bağımsız Parsel + FPS Oyuncu Kolu & Bakır Su İbriği Sulama + Elle Hasat
// =============================================================

// ---------- WEBGL PERFORMANS & YAZILIM RENDERER KORUMASI ----------
function yazilimGlTespit(gl) {
  try {
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const rendererAdi = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "";
    return /SwiftShader|llvmpipe|Software/i.test(String(rendererAdi));
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
          timerId = window.setTimeout(yokla, 16);
          return;
        }
        gl2.deleteSync(sync);
        timerId = window.setTimeout(fn, 80);
      };
      timerId = window.setTimeout(yokla, 16);
    } else {
      timerId = window.setTimeout(fn, 85);
    }
  };

  const iptal = () => {
    durdu = true;
    cancelAnimationFrame(rafId);
    clearTimeout(timerId);
  };

  return { sonraki, iptal };
}

function sahneTemizle(scene, renderer, dokular = []) {
  scene.traverse((nesne) => {
    if (nesne.geometry) nesne.geometry.dispose();
    if (nesne.material) {
      const materyaller = Array.isArray(nesne.material) ? nesne.material : [nesne.material];
      for (const m of materyaller) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    }
  });
  for (const t of dokular) t?.dispose?.();
  if (scene.environment) scene.environment.dispose();
  renderer.dispose();
}

function studyoIsikKur(renderer, scene, gokyuzuRenk = 0xdbeafe, sisRenk = 0xcbd5e1, sisYogunluk = 0.032) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const oda = new RoomEnvironment();
  scene.environment = pmrem.fromScene(oda, 0.04).texture;
  scene.environmentIntensity = 0.48;
  oda.dispose?.();
  pmrem.dispose();

  scene.background = new THREE.Color(gokyuzuRenk);
  scene.fog = new THREE.FogExp2(sisRenk, sisYogunluk);

  const gunes = new THREE.DirectionalLight(0xfff4d6, 2.2);
  gunes.position.set(6, 10, 5);
  scene.add(gunes);

  const gokIsigi = new THREE.HemisphereLight(0xdbeafe, 0x5c4732, 0.85);
  scene.add(gokIsigi);

  return { gunes, gokIsigi };
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

    if (tur === "kazma") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(920, t0);
      osc.frequency.exponentialRampToValueAtTime(210, t0 + 0.13);
      gain.gain.setValueAtTime(0.22, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.16);
    } else if (tur === "parcalanma" || tur === "devrilme") {
      const uzunluk = Math.floor(ctx.sampleRate * 0.36);
      const buf = ctx.createBuffer(1, uzunluk, ctx.sampleRate);
      const veri = buf.getChannelData(0);
      for (let i = 0; i < uzunluk; i++) {
        veri[i] = (Math.random() * 2 - 1) * Math.exp(-i / (uzunluk * 0.35));
      }
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
    } else if (tur === "balta") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(240, t0);
      osc.frequency.exponentialRampToValueAtTime(68, t0 + 0.12);
      gain.gain.setValueAtTime(0.24, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.13);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.14);
    } else if (tur === "su") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(420 + Math.random() * 220, t0);
      osc.frequency.exponentialRampToValueAtTime(760, t0 + 0.08);
      gain.gain.setValueAtTime(0.06, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.1);
    } else if (tur === "hasat") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, t0);
      osc.frequency.exponentialRampToValueAtTime(780, t0 + 0.12);
      gain.gain.setValueAtTime(0.18, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.15);
    }
  } catch {
    // Ses bağlamı kısıtlıysa sessizce devam et
  }
}

// ---------- PROSEDÜREL CANVAS DOKULARI ----------
function kayaDokusuUret(anaRenk = "#78716c") {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = anaRenk;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 420; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 2 + Math.random() * 12;
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.08)" : "rgba(15,12,10,0.13)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function toprakDokusuUret(kuru = true) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = kuru ? "#7c5838" : "#3f2815";
  ctx.fillRect(0, 0, 256, 256);
  // Karık çizgileri
  for (let y = 0; y < 256; y += 32) {
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(0, y, 256, 10);
    ctx.fillStyle = "rgba(255,235,200,0.07)";
    ctx.fillRect(0, y + 12, 256, 6);
  }
  for (let i = 0; i < 350; i++) {
    ctx.fillStyle = i % 2 === 0 ? "rgba(30,18,8,0.18)" : "rgba(210,175,130,0.11)";
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 3 + Math.random() * 4, 3 + Math.random() * 4);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function kabukDokusuUret() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#5c4028";
  ctx.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = i % 2 === 0 ? "rgba(28,18,10,0.32)" : "rgba(155,120,85,0.18)";
    ctx.fillRect(Math.random() * 128, Math.random() * 256, 3, 18 + Math.random() * 28);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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

function kazmaModeliOlustur() {
  const grup = new THREE.Group();
  const sapMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.72 });
  const demirMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.78, roughness: 0.32 });
  const ucMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.88, roughness: 0.2 });

  const sap = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.55, 10), sapMat);
  sap.position.y = 0.72;
  grup.add(sap);

  const bilezik = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), demirMat);
  bilezik.position.y = 1.42;
  grup.add(bilezik);

  const solKol = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.58, 8), demirMat);
  solKol.rotation.z = Math.PI / 2 + 0.18;
  solKol.position.set(-0.32, 1.4, 0);
  grup.add(solKol);

  const sagKol = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.58, 8), ucMat);
  sagKol.rotation.z = -Math.PI / 2 - 0.18;
  sagKol.position.set(0.32, 1.4, 0);
  grup.add(sagKol);

  return grup;
}

function kayaKutlesiOlustur(kayaBilgi, doku) {
  const kok = new THREE.Group();
  const govdeGrup = new THREE.Group();
  kok.add(govdeGrup);

  const anaMat = new THREE.MeshStandardMaterial({
    map: doku,
    color: new THREE.Color(kayaBilgi.renk),
    roughness: 0.86,
    metalness: 0.08,
    flatShading: true,
  });
  const damarMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(kayaBilgi.damarRenk),
    emissive: new THREE.Color(kayaBilgi.damarRenk),
    emissiveIntensity: 0.16,
    roughness: 0.35,
    metalness: 0.55,
    flatShading: true,
  });
  const catlakMat = new THREE.MeshBasicMaterial({ color: 0x140d08 });

  // Ana çok-yüzlü kaya kütleleri (4 parça birleşik derinlikli kaya)
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

  // Cevher / taş damarı kristalleri
  for (let i = 0; i < 3; i++) {
    const kGeo = new THREE.OctahedronGeometry(0.18 + i * 0.03, 0);
    const kMesh = new THREE.Mesh(kGeo, damarMat);
    const aci = i * 2.1 + kayaBilgi.id;
    kMesh.position.set(Math.cos(aci) * 0.55, 0.58 + i * 0.16, Math.sin(aci) * 0.52);
    kMesh.rotation.set(aci, i, 0.4);
    govdeGrup.add(kMesh);
  }

  // Çatlak çizgileri (1. ve 2. darbede görünür hale gelir)
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
  govdeGrup.add(catlaklar1);
  govdeGrup.add(catlaklar2);

  // Zemin temas gölgesi + kazılmış temel izi
  const golge = new THREE.Mesh(
    new THREE.CircleGeometry(1.05, 20),
    new THREE.MeshBasicMaterial({ color: 0x1c1917, transparent: true, opacity: 0.42 })
  );
  golge.rotation.x = -Math.PI / 2;
  golge.position.y = 0.02;
  kok.add(golge);

  const kalinti = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), anaMat);
    m.position.set(Math.cos(i * 1.6) * 0.45, 0.09, Math.sin(i * 1.6) * 0.42);
    kalinti.add(m);
  }
  kalinti.visible = false;
  kok.add(kalinti);

  return { kok, govdeGrup, catlaklar1, catlaklar2, kalinti, anaMat, tiklanabilirParcalar };
}

export function TasOcagi3DSahnesi({ oyun }) {
  const kapsayiciRef = useRef(null);
  const sahneApiRef = useRef(null);
  const noktalar = oyun.sahaNoktalari("tas");
  const [vurusSayilari, setVurusSayilari] = useState({});
  const [aktifMesaj, setAktifMesaj] = useState(
    "⛏️ Sahadaki 6 ayrı 3D kayadan istediğin birine tıkla! Her kaya bağımsız parçalanır (3 kazma darbesi)."
  );
  const [isleniyorId, setIsleniyorId] = useState(null);

  const noktalarRef = useRef(noktalar);
  useEffect(() => {
    noktalarRef.current = noktalar;
    const api = sahneApiRef.current;
    if (!api) return;
    for (const n of noktalar) {
      const kNesne = api.kayalar[n.id];
      if (!kNesne) continue;
      if (!kNesne.parcalaniyor) {
        kNesne.govdeGrup.visible = n.hazir;
        kNesne.kalinti.visible = !n.hazir;
        if (n.hazir && (vurusSayilari[n.id] ?? 0) === 0) {
          kNesne.catlaklar1.visible = false;
          kNesne.catlaklar2.visible = false;
        }
      }
    }
  }, [noktalar, vurusSayilari]);

  const kayaDarbeVur = useCallback(
    async (kayaId) => {
      if (oyun.bekliyor || isleniyorId != null) return;
      const guncelNokta = noktalarRef.current.find((n) => n.id === kayaId);
      if (!guncelNokta) return;
      if (!guncelNokta.hazir) {
        setAktifMesaj(
          `⏳ ${guncelNokta.ad} şu an yeniden oluşuyor (~${guncelNokta.kalanDakika ?? 60} dk). Diğer sağlam kayaları kırabilirsin!`
        );
        return;
      }

      const api = sahneApiRef.current;
      const mevcutVurus = (vurusSayilari[kayaId] ?? 0) + 1;
      api?.kazmaSalla(kayaId, mevcutVurus >= 3);

      if (mevcutVurus < 3) {
        sesCal("kazma");
        setVurusSayilari((prev) => ({ ...prev, [kayaId]: mevcutVurus }));
        if (api?.kayalar[kayaId]) {
          api.kayalar[kayaId].catlaklar1.visible = mevcutVurus >= 1;
          api.kayalar[kayaId].catlaklar2.visible = mevcutVurus >= 2;
        }
        setAktifMesaj(
          mevcutVurus === 1
            ? `💥 ${guncelNokta.ad} sarsıldı ve ilk çatlaklar oluştu! (1/3 Darbe)`
            : `⚡ ${guncelNokta.ad} derinlemesine çatladı! Parçalamak için son 1 kazma darbesi vur! (2/3 Darbe)`
        );
        return;
      }

      // 3. Darbe: Kaya taş bloklarına ayrılarak parçalanır!
      sesCal("parcalanma");
      setIsleniyorId(kayaId);
      setVurusSayilari((prev) => ({ ...prev, [kayaId]: 0 }));
      api?.kayaPatlat(kayaId);

      const sonuc = await oyun.sahaHasat("tas", kayaId);
      setIsleniyorId(null);
      if (sonuc?.mesaj) {
        setAktifMesaj(`${sonuc.mesaj} Diğer sağlam kayalardan devam edebilirsin!`);
      }
    },
    [oyun, isleniyorId, vurusSayilari]
  );

  const darbeRef = useRef(kayaDarbeVur);
  useEffect(() => {
    darbeRef.current = kayaDarbeVur;
  }, [kayaDarbeVur]);

  useEffect(() => {
    const el = kapsayiciRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    const gl = renderer.getContext();
    const yazilimGl = yazilimGlTespit(gl);
    renderer.setPixelRatio(yazilimGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(el.clientWidth || 800, el.clientHeight || 450);
    el.innerHTML = "";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    studyoIsikKur(renderer, scene, 0xc7d2fe, 0xa8a29e, 0.028);

    const camera = new THREE.PerspectiveCamera(44, (el.clientWidth || 800) / (el.clientHeight || 450), 0.1, 80);
    camera.position.set(0, 5.4, 8.2);
    camera.lookAt(0, 0.5, 0.1);

    const dokular = [];
    const zeminDoku = kayaDokusuUret("#57534e");
    zeminDoku.wrapS = THREE.RepeatWrapping;
    zeminDoku.wrapT = THREE.RepeatWrapping;
    zeminDoku.repeat.set(6, 4);
    dokular.push(zeminDoku);

    // Taş Ocağı Tabanı ve Kanyon Kayalık Duvarları
    const zemin = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 18),
      new THREE.MeshStandardMaterial({ map: zeminDoku, color: 0x78716c, roughness: 0.94 })
    );
    zemin.rotation.x = -Math.PI / 2;
    scene.add(zemin);

    // Arka plan kanyon tepeleri
    const yamaMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.92, flatShading: true });
    for (let i = -4; i <= 4; i++) {
      const tepe = new THREE.Mesh(new THREE.ConeGeometry(2.2 + Math.abs(i % 2) * 0.8, 3.8 + (i % 3) * 0.7, 6), yamaMat);
      tepe.position.set(i * 2.4, 1.6, -5.2 - Math.abs(i) * 0.25);
      tepe.rotation.y = i * 0.6;
      scene.add(tepe);
    }

    // 6 Bağımsız 3D Kaya Grubu
    const kayalar = {};
    const rayHedefleri = [];
    for (const kKonum of KAYA_KONUMLARI_3D) {
      const kBilgi = noktalarRef.current.find((x) => x.id === kKonum.id) ?? {
        id: kKonum.id,
        renk: "#78716c",
        damarRenk: "#fbbf24",
        hazir: true,
      };
      const doku = kayaDokusuUret(kBilgi.renk);
      dokular.push(doku);
      const model = kayaKutlesiOlustur(kBilgi, doku);
      model.kok.position.set(kKonum.x, 0, kKonum.z);
      model.kok.scale.setScalar(kKonum.olcek);
      model.govdeGrup.visible = Boolean(kBilgi.hazir);
      model.kalinti.visible = !kBilgi.hazir;
      scene.add(model.kok);

      kayalar[kKonum.id] = {
        ...model,
        x: kKonum.x,
        z: kKonum.z,
        sarsinti: 0,
        parcalaniyor: false,
      };
      rayHedefleri.push(...model.tiklanabilirParcalar);
    }

    // 3D Kazma
    const kazma = kazmaModeliOlustur();
    kazma.visible = false;
    scene.add(kazma);
    const kazmaDurum = { aktif: false, sure: 0, hedefX: 0, hedefZ: 0, parcala: false };

    // Parçalanan Taş Blokları & Kıvılcım Partikül Havuzu
    const parcalar = [];
    const blokGeo = new THREE.DodecahedronGeometry(0.22, 0);
    const kivilcimGeo = new THREE.OctahedronGeometry(0.07, 0);
    const kivilcimMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

    const kivilcimCikar = (x, y, z, adet = 10) => {
      for (let i = 0; i < adet; i++) {
        const m = new THREE.Mesh(kivilcimGeo, kivilcimMat);
        m.position.set(x, y, z);
        scene.add(m);
        const aci = Math.random() * Math.PI * 2;
        const hiz = 2.0 + Math.random() * 3.5;
        parcalar.push({
          mesh: m,
          vx: Math.cos(aci) * hiz,
          vy: 2.2 + Math.random() * 3.2,
          vz: Math.sin(aci) * hiz,
          rx: 5,
          ry: 6,
          omur: 0.45 + Math.random() * 0.25,
          maksOmur: 0.7,
        });
      }
    };

    const kayaPatlat = (id) => {
      const k = kayalar[id];
      if (!k) return;
      k.parcalaniyor = true;
      k.govdeGrup.visible = false;
      k.kalinti.visible = true;

      for (let i = 0; i < 16; i++) {
        const m = new THREE.Mesh(blokGeo, k.anaMat);
        m.scale.set(0.7 + Math.random() * 0.8, 0.6 + Math.random() * 0.7, 0.7 + Math.random() * 0.8);
        m.position.set(
          k.x + (Math.random() - 0.5) * 0.8,
          0.45 + Math.random() * 0.7,
          k.z + (Math.random() - 0.5) * 0.8
        );
        scene.add(m);
        const aci = (i / 16) * Math.PI * 2 + Math.random() * 0.4;
        const hiz = 2.2 + Math.random() * 3.6;
        parcalar.push({
          mesh: m,
          vx: Math.cos(aci) * hiz,
          vy: 3.4 + Math.random() * 3.5,
          vz: Math.sin(aci) * hiz,
          rx: (Math.random() - 0.5) * 10,
          ry: (Math.random() - 0.5) * 10,
          omur: 1.35,
          maksOmur: 1.35,
        });
      }
      window.setTimeout(() => {
        if (kayalar[id]) kayalar[id].parcalaniyor = false;
      }, 900);
    };

    const kazmaSalla = (id) => {
      const k = kayalar[id];
      if (!k) return;
      kazmaDurum.aktif = true;
      kazmaDurum.sure = 0;
      kazmaDurum.hedefX = k.x + 0.85;
      kazmaDurum.hedefZ = k.z + 0.55;
      kazma.visible = true;
      k.sarsinti = 1.0;
      kivilcimCikar(k.x, 0.95, k.z + 0.35, 9);
    };

    sahneApiRef.current = { kayalar, kazmaSalla, kayaPatlat };

    // Raycaster ile 3D Kaya Tıklama
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const fareVek = new THREE.Vector2();

    const tuvalTikla = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      fareVek.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      fareVek.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(fareVek, camera);
      const kesisimler = raycaster.intersectObjects(rayHedefleri, false);
      if (kesisimler.length > 0) {
        const secilenId = kesisimler[0].object.userData?.kayaId;
        if (secilenId && kayalar[secilenId]?.govdeGrup.visible) {
          darbeRef.current?.(secilenId);
        }
      }
    };
    renderer.domElement.addEventListener("pointerdown", tuvalTikla);

    const boyutlandir = () => {
      if (!el) return;
      const w = el.clientWidth || 800;
      const h = el.clientHeight || 450;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(boyutlandir);
    ro.observe(el);

    let kameraSarsinti = 0;
    let sonZaman = performance.now();
    const zamanlayici = kareZamanlayiciOlustur(gl, yazilimGl);

    const ciz = () => {
      const simdiMs = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (simdiMs - sonZaman) * 0.001));
      sonZaman = simdiMs;

      // Kazma darbe animasyonu
      if (kazmaDurum.aktif) {
        kazmaDurum.sure += dt * 4.6;
        const p = Math.min(1, kazmaDurum.sure);
        kazma.position.set(kazmaDurum.hedefX, 0.55, kazmaDurum.hedefZ);
        const aci = p < 0.45 ? -0.6 + (p / 0.45) * 1.85 : 1.25 - ((p - 0.45) / 0.55) * 1.4;
        kazma.rotation.set(0, -0.35, aci);
        if (p >= 0.42 && p <= 0.52) kameraSarsinti = 0.12;
        if (kazmaDurum.sure >= 1) {
          kazmaDurum.aktif = false;
          kazma.visible = false;
        }
      }

      // Kaya sarsıntısı
      for (const k of Object.values(kayalar)) {
        if (k.sarsinti > 0.01) {
          k.sarsinti = Math.max(0, k.sarsinti - dt * 3.8);
          const salinim = Math.sin(simdiMs * 0.065) * 0.11 * k.sarsinti;
          k.govdeGrup.position.x = salinim;
          k.govdeGrup.rotation.z = salinim * 0.45;
        } else {
          k.govdeGrup.position.x = 0;
          k.govdeGrup.rotation.z = 0;
        }
      }

      // Parçacık fizikleri (yerçekimi + zemin sekmesi)
      for (let i = parcalar.length - 1; i >= 0; i--) {
        const pr = parcalar[i];
        pr.omur -= dt;
        if (pr.omur <= 0) {
          scene.remove(pr.mesh);
          parcalar.splice(i, 1);
          continue;
        }
        pr.vy -= 14.5 * dt;
        pr.mesh.position.x += pr.vx * dt;
        pr.mesh.position.y += pr.vy * dt;
        pr.mesh.position.z += pr.vz * dt;
        pr.mesh.rotation.x += pr.rx * dt;
        pr.mesh.rotation.y += pr.ry * dt;
        if (pr.mesh.position.y < 0.14) {
          pr.mesh.position.y = 0.14;
          pr.vy = Math.abs(pr.vy) * 0.42;
          pr.vx *= 0.76;
          pr.vz *= 0.76;
        }
        const olcekAzalma = Math.min(1, pr.omur / 0.35);
        pr.mesh.scale.multiplyScalar(olcekAzalma < 1 ? 0.96 : 1);
      }

      // Kamera mikro sarsıntı
      if (kameraSarsinti > 0.005) {
        kameraSarsinti *= 0.82;
        camera.position.x = (Math.random() - 0.5) * kameraSarsinti;
        camera.position.y = 5.4 + (Math.random() - 0.5) * kameraSarsinti;
      } else {
        camera.position.x = 0;
        camera.position.y = 5.4;
      }

      renderer.render(scene, camera);
      zamanlayici.sonraki(ciz);
    };

    ciz();

    return () => {
      zamanlayici.iptal();
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", tuvalTikla);
      sahneTemizle(scene, renderer, dokular);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-stone-950/95 px-4 py-2.5 text-xs font-bold text-amber-100 ring-1 ring-amber-400/50">
        {aktifMesaj}
      </div>

      {/* 3D WebGL Taş Ocağı Sahnesi */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl bg-stone-950 shadow-2xl ring-2 ring-amber-500/40">
        <div ref={kapsayiciRef} className="h-full w-full cursor-crosshair" />
        <div className="pointer-events-none absolute top-3 left-3 rounded-xl bg-stone-950/90 px-3 py-1.5 text-[11px] font-black text-amber-200 ring-1 ring-amber-400/40">
          ⛰️ 3D Taş Ocağı · Kayaların Üzerine Tıklayarak Kazma Vur (3 Vuruşta Parçalanır)
        </div>
      </div>

      {/* 6 Bağımsız Kaya Durum Kartları */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {noktalar.map((k) => {
          const vurus = vurusSayilari[k.id] ?? 0;
          return (
            <button
              key={k.id}
              type="button"
              disabled={!k.hazir || oyun.bekliyor || isleniyorId != null}
              onClick={() => kayaDarbeVur(k.id)}
              className={`flex flex-col items-center rounded-2xl p-2.5 text-center ring-1 transition ${
                k.hazir
                  ? "bg-stone-900/95 text-amber-100 ring-amber-400/50 hover:bg-stone-800"
                  : "bg-stone-950/75 text-stone-500 ring-stone-800"
              }`}
            >
              <span className="text-[11px] font-black">{k.ad}</span>
              <span className="mt-1 text-[10px] font-bold">
                {k.hazir ? (
                  <span className="text-emerald-300">
                    ⛏️ {vurus > 0 ? `Çatladı (${vurus}/3)` : `Sağlam (+${k.miktar} 🧱)`}
                  </span>
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
function KurumusAgac3DSahnesi({ bolgeAd, odulMiktar, onKesimTamam, bekliyor }) {
  const kapsayiciRef = useRef(null);
  const sahneApiRef = useRef(null);
  const [vurus, setVurus] = useState(0);
  const [devrildi, setDevrildi] = useState(false);

  const baltaVur = useCallback(async () => {
    if (bekliyor || devrildi) return;
    const yeni = vurus + 1;
    setVurus(yeni);
    sahneApiRef.current?.baltaSalla(yeni);

    if (yeni < 3) {
      sesCal("balta");
      return;
    }

    sesCal("devrilme");
    setDevrildi(true);
    window.setTimeout(() => {
      onKesimTamam?.();
    }, 1150);
  }, [bekliyor, devrildi, vurus, onKesimTamam]);

  const baltaRef = useRef(baltaVur);
  useEffect(() => {
    baltaRef.current = baltaVur;
  }, [baltaVur]);

  useEffect(() => {
    const el = kapsayiciRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    const gl = renderer.getContext();
    const yazilimGl = yazilimGlTespit(gl);
    renderer.setPixelRatio(yazilimGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(el.clientWidth || 800, el.clientHeight || 450);
    el.innerHTML = "";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    studyoIsikKur(renderer, scene, 0xdcfce7, 0xbbf7d0, 0.03);

    const camera = new THREE.PerspectiveCamera(42, (el.clientWidth || 800) / (el.clientHeight || 450), 0.1, 70);
    camera.position.set(0, 2.7, 6.2);
    camera.lookAt(0, 1.55, 0);

    const kabukDoku = kabukDokusuUret();
    const dokular = [kabukDoku];

    // Orman Açıklığı Zemini
    const zemin = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 20),
      new THREE.MeshStandardMaterial({ color: 0x365314, roughness: 0.95 })
    );
    zemin.rotation.x = -Math.PI / 2;
    scene.add(zemin);

    // Arka plan canlı çam silüetleri
    const camMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.88, flatShading: true });
    const govdeArkaMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    for (let i = -4; i <= 4; i++) {
      if (i === 0) continue;
      const g = new THREE.Group();
      const kutuk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.2, 6), govdeArkaMat);
      kutuk.position.y = 0.6;
      const tac1 = new THREE.Mesh(new THREE.ConeGeometry(0.95, 2.2, 7), camMat);
      tac1.position.y = 2.0;
      const tac2 = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.8, 7), camMat);
      tac2.position.y = 3.1;
      g.add(kutuk, tac1, tac2);
      g.position.set(i * 1.9, 0, -3.2 - (Math.abs(i) % 2) * 1.1);
      scene.add(g);
    }

    // Merkezdeki 3D Kurumuş Ağaç (Alt Kütük + Devrilen Üst Gövde & Kuru Dallar)
    const kuruMat = new THREE.MeshStandardMaterial({
      map: kabukDoku,
      color: 0x785638,
      roughness: 0.9,
      flatShading: true,
    });
    const icOdunMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.72 });

    const altKutuk = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.48, 0.78, 10), kuruMat);
    altKutuk.position.y = 0.39;
    scene.add(altKutuk);

    // Kesim çentiği (her balta vuruşunda büyür)
    const centik = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.52), icOdunMat);
    centik.position.set(0.22, 0.74, 0);
    centik.visible = false;
    scene.add(centik);

    const mentese = new THREE.Group();
    mentese.position.set(-0.18, 0.76, 0);
    scene.add(mentese);

    const ustGovde = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.35, 2.85, 10), kuruMat);
    ustGovde.position.set(0.18, 1.42, 0);
    ustGovde.layers.enable(1);
    mentese.add(ustGovde);

    const dalBilgileri = [
      { y: 1.9, rotZ: -0.78, rotY: 0.3, boy: 1.3 },
      { y: 2.25, rotZ: 0.72, rotY: -0.4, boy: 1.2 },
      { y: 2.55, rotZ: -0.58, rotY: 1.4, boy: 1.0 },
      { y: 2.75, rotZ: 0.62, rotY: 2.3, boy: 0.95 },
    ];
    for (const d of dalBilgileri) {
      const dal = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, d.boy, 7), kuruMat);
      dal.position.set(0.18, d.y, 0);
      dal.rotation.z = d.rotZ;
      dal.rotation.y = d.rotY;
      dal.translateY(d.boy * 0.42);
      dal.layers.enable(1);
      mentese.add(dal);
    }

    // 3D Oduncu Baltası
    const balta = new THREE.Group();
    const sap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.065, 1.35, 10),
      new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 })
    );
    sap.position.y = 0.65;
    const bas = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.28, 0.09),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.28 })
    );
    bas.position.set(-0.18, 1.2, 0);
    const agiz = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.3, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.16 })
    );
    agiz.position.set(-0.42, 1.2, 0);
    balta.add(sap, bas, agiz);
    balta.visible = false;
    scene.add(balta);

    // Odun Yongası Partikülleri
    const yongalar = [];
    const yongaGeo = new THREE.BoxGeometry(0.13, 0.05, 0.08);
    const baltaDurum = { aktif: false, sure: 0, devriliyor: false, devrilmeHizi: 0, sarsinti: 0 };

    const yongaFirlat = (adet = 12) => {
      for (let i = 0; i < adet; i++) {
        const m = new THREE.Mesh(yongaGeo, icOdunMat);
        m.position.set(0.25, 0.82, (Math.random() - 0.5) * 0.3);
        scene.add(m);
        yongalar.push({
          mesh: m,
          vx: 1.4 + Math.random() * 2.8,
          vy: 1.8 + Math.random() * 2.6,
          vz: (Math.random() - 0.5) * 2.6,
          rx: (Math.random() - 0.5) * 12,
          omur: 0.75,
        });
      }
    };

    sahneApiRef.current = {
      baltaSalla: (darbeNo) => {
        baltaDurum.aktif = true;
        baltaDurum.sure = 0;
        baltaDurum.sarsinti = 1.0;
        balta.visible = true;
        centik.visible = true;
        centik.scale.set(1, darbeNo * 0.75, 1);
        yongaFirlat(darbeNo >= 3 ? 20 : 11);
        if (darbeNo >= 3) {
          baltaDurum.devriliyor = true;
          baltaDurum.devrilmeHizi = 0.35;
        }
      },
    };

    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const fare = new THREE.Vector2();
    const tikla = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      fare.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      fare.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(fare, camera);
      if (raycaster.intersectObjects(mentese.children, false).length > 0) {
        baltaRef.current?.();
      }
    };
    renderer.domElement.addEventListener("pointerdown", tikla);

    const boyutlandir = () => {
      const w = el.clientWidth || 800;
      const h = el.clientHeight || 450;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(boyutlandir);
    ro.observe(el);

    let sonZaman = performance.now();
    const zamanlayici = kareZamanlayiciOlustur(gl, yazilimGl);

    const ciz = () => {
      const simdiMs = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (simdiMs - sonZaman) * 0.001));
      sonZaman = simdiMs;

      if (baltaDurum.aktif) {
        baltaDurum.sure += dt * 4.8;
        const p = Math.min(1, baltaDurum.sure);
        balta.position.set(1.25 - Math.sin(p * Math.PI) * 0.65, 0.78, 0.45);
        balta.rotation.set(0.3, -0.4, Math.PI / 2 - Math.sin(p * Math.PI) * 0.85);
        if (baltaDurum.sure >= 1) {
          baltaDurum.aktif = false;
          balta.visible = false;
        }
      }

      if (baltaDurum.devriliyor) {
        baltaDurum.devrilmeHizi += 4.2 * dt;
        mentese.rotation.z = Math.min(Math.PI / 2.06, mentese.rotation.z + baltaDurum.devrilmeHizi * dt);
      } else if (baltaDurum.sarsinti > 0.01) {
        baltaDurum.sarsinti = Math.max(0, baltaDurum.sarsinti - dt * 3.5);
        mentese.rotation.z = Math.sin(simdiMs * 0.06) * 0.07 * baltaDurum.sarsinti;
      }

      for (let i = yongalar.length - 1; i >= 0; i--) {
        const y = yongalar[i];
        y.omur -= dt;
        if (y.omur <= 0) {
          scene.remove(y.mesh);
          yongalar.splice(i, 1);
          continue;
        }
        y.vy -= 13 * dt;
        y.mesh.position.x += y.vx * dt;
        y.mesh.position.y = Math.max(0.05, y.mesh.position.y + y.vy * dt);
        y.mesh.position.z += y.vz * dt;
        y.mesh.rotation.z += y.rx * dt;
      }

      renderer.render(scene, camera);
      zamanlayici.sonraki(ciz);
    };

    ciz();

    return () => {
      zamanlayici.iptal();
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", tikla);
      sahneTemizle(scene, renderer, dokular);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-amber-950/90 px-4 py-3 text-xs text-amber-100 ring-1 ring-amber-400">
        <div>
          <span className="font-black text-amber-300">🪓 Kurumuş Ağaç Bulundu: {bolgeAd}</span>
          <p className="mt-0.5 text-amber-100/85">
            3D kurumuş ağacın gövdesine veya aşağıdaki butona tıklayarak baltayla vurup devir (+{odulMiktar} 🌲 Tahta).
          </p>
        </div>
        <button
          type="button"
          disabled={bekliyor || devrildi}
          onClick={baltaVur}
          className="rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 px-5 py-2.5 text-xs font-black text-stone-950 shadow-lg hover:brightness-110 disabled:opacity-50"
        >
          {devrildi ? "🌲 Ağaç Devrildi! Tahtalar Toplanıyor…" : `🪓 Balta Vur (${vurus}/3)`}
        </button>
      </div>

      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl bg-stone-950 shadow-2xl ring-2 ring-amber-500/40">
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

  const bolgeAra = async (bolge) => {
    if (oyun.bekliyor || aramaYapiliyorId != null) return;
    if ((sefer.maske & (1 << bolge.id)) !== 0) return;

    if (sefer.kalanSefer <= 0) {
      setBilgiNotu(
        `⚠️ Bugünkü tüm keşif seferlerini (${sefer.maksSefer}/${sefer.maksSefer}) tamamladın! Yukarıdan yeni kalıcı oduncu görevlendirerek anında +2 sefer hakkı kazanabilirsin.`
      );
      return;
    }

    setAramaYapiliyorId(bolge.id);
    const sonuc = await oyun.ormanKesif(bolge.id);
    setAramaYapiliyorId(null);

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
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Sefer Hakkı & Bilgi Çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-stone-950/95 px-4 py-3 ring-1 ring-amber-400/40">
        <p className="text-xs font-bold text-amber-100">{bilgiNotu}</p>
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-emerald-950/90 px-3 py-1.5 text-xs font-black text-emerald-300 ring-1 ring-emerald-400/50">
            🧭 Kalan Keşif Seferi: {sefer.kalanSefer} / {sefer.maksSefer} ({sefer.isci} İşçi × 2)
          </span>
        </div>
      </div>

      {/* İnteraktif Orman Keşif Haritası */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl bg-stone-950 shadow-2xl ring-2 ring-amber-500/40 select-none">
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

  const sapMat = new THREE.MeshStandardMaterial({ color: 0x2f855a, roughness: 0.72 });
  const yaprakMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.68 });

  // Ana fide gövdesi & yapraklar
  const govde = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.52, 8), sapMat);
  govde.position.y = 0.26;
  fideGrup.add(govde);

  for (let i = 0; i < 4; i++) {
    const yaprak = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), yaprakMat);
    yaprak.scale.set(1.4, 0.28, 0.85);
    const aci = (i * Math.PI) / 2 + 0.4;
    yaprak.position.set(Math.cos(aci) * 0.16, 0.24 + (i % 2) * 0.14, Math.sin(aci) * 0.16);
    yaprak.rotation.z = Math.cos(aci) * -0.35;
    fideGrup.add(yaprak);
  }

  if (tur === "domates") {
    const herek = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.026, 0.85, 6),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.88 })
    );
    herek.position.set(-0.07, 0.42, -0.04);
    kok.add(herek);
  }

  // Büyüyen Sebze / Meyve Grubu (Elle tıklanıp toplanabilir!)
  const meyveGrup = new THREE.Group();
  let meyveGeo;
  let meyveMat;

  if (tur === "domates") {
    meyveGeo = new THREE.SphereGeometry(0.145, 14, 12);
    meyveMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.24, metalness: 0.06 });
  } else if (tur === "bugday") {
    meyveGeo = new THREE.ConeGeometry(0.09, 0.36, 8);
    meyveMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.55 });
  } else if (tur === "salatalik") {
    meyveGeo = new THREE.CapsuleGeometry(0.065, 0.22, 6, 10);
    meyveMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.38 });
  } else if (tur === "biber") {
    meyveGeo = new THREE.ConeGeometry(0.075, 0.28, 10);
    meyveMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.28 });
  } else if (tur === "karpuz") {
    meyveGeo = new THREE.SphereGeometry(0.21, 14, 12);
    meyveGeo.scale(1.22, 0.92, 1.0);
    meyveMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.32 });
  } else {
    // Mısır koçanı
    meyveGeo = new THREE.CylinderGeometry(0.075, 0.09, 0.28, 10);
    meyveMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 });
  }

  const anaMeyve = new THREE.Mesh(meyveGeo, meyveMat);
  if (tur === "biber") anaMeyve.rotation.x = Math.PI;
  anaMeyve.layers.enable(1);
  anaMeyve.userData = { bitkiIndeks: indeks };
  meyveGrup.add(anaMeyve);

  meyveGrup.position.set(0.08, tur === "karpuz" ? 0.2 : 0.42, 0.1);
  meyveGrup.scale.setScalar(0.01);
  kok.add(meyveGrup);

  fideGrup.scale.setScalar(0.45);
  return { kok, fideGrup, meyveGrup, anaMeyve };
}

function bakirIbrikOlustur() {
  const ibrikKok = new THREE.Group();

  const bakirMat = new THREE.MeshStandardMaterial({
    color: 0xc86d3b,
    metalness: 0.78,
    roughness: 0.28,
  });
  const pirincMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.65,
    roughness: 0.34,
  });

  // Geleneksel Anadolu Bakır Su İbriği (Mavi kol silindiri YOK; doğrudan sahnede fidelerin üzerinde!)
  const profilNoktalari = [
    new THREE.Vector2(0.01, 0.0),
    new THREE.Vector2(0.17, 0.02),
    new THREE.Vector2(0.26, 0.20),
    new THREE.Vector2(0.23, 0.38),
    new THREE.Vector2(0.10, 0.54),
    new THREE.Vector2(0.085, 0.68),
    new THREE.Vector2(0.13, 0.76),
  ];
  const ibrikGovde = new THREE.Mesh(new THREE.LatheGeometry(profilNoktalari, 20), bakirMat);
  ibrikGovde.position.y = -0.32;
  ibrikKok.add(ibrikGovde);

  // Zarif kubbeli kapak + alem
  const kapak = new THREE.Mesh(new THREE.ConeGeometry(0.115, 0.16, 16), pirincMat);
  kapak.position.y = 0.52;
  ibrikKok.add(kapak);

  const alem = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), pirincMat);
  alem.position.y = 0.62;
  ibrikKok.add(alem);

  // Sol tarafa (-X) uzanan su dökme emziği (rotation.z > 0 olduğunda doğrudan aşağı fidelere bakar)
  const emzikEgrisi = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.17, -0.06, 0),
    new THREE.Vector3(-0.37, 0.12, 0),
    new THREE.Vector3(-0.52, 0.26, 0),
  ]);
  const emzik = new THREE.Mesh(new THREE.TubeGeometry(emzikEgrisi, 14, 0.028, 10, false), bakirMat);
  ibrikKok.add(emzik);

  const emzikAgzi = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 8, 12), pirincMat);
  emzikAgzi.position.set(-0.52, 0.26, 0);
  emzikAgzi.rotation.y = Math.PI / 2;
  ibrikKok.add(emzikAgzi);

  const emzikUcu = new THREE.Object3D();
  emzikUcu.position.set(-0.54, 0.26, 0);
  ibrikKok.add(emzikUcu);

  // Pirinç kulp
  const kulpEgrisi = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.10, 0.34, 0),
    new THREE.Vector3(0.32, 0.22, 0),
    new THREE.Vector3(0.22, -0.10, 0),
  ]);
  const kulp = new THREE.Mesh(new THREE.TubeGeometry(kulpEgrisi, 12, 0.024, 8, false), pirincMat);
  ibrikKok.add(kulp);

  return { ibrikKok, emzikUcu };
}

function TarlaYakinCekimFPS({ parsel, onHasatTamam, onGeriDon, bekliyor }) {
  const kapsayiciRef = useRef(null);
  const sahneApiRef = useRef(null);
  const onHasatTamamRef = useRef(onHasatTamam);
  // Evre: "kuru" -> "sulaniyor" -> "olgun" -> "toplaniyor" -> "tamam"
  const [evre, setEvre] = useState("kuru");
  const [toplananAdet, setToplananAdet] = useState(0);

  useEffect(() => {
    onHasatTamamRef.current = onHasatTamam;
  }, [onHasatTamam]);

  const sulamayiBaslat = useCallback(() => {
    if (evre !== "kuru") return;
    setEvre("sulaniyor");
    sahneApiRef.current?.sulamaBaslat();
  }, [evre]);

  const hepsiniElleTopla = useCallback(() => {
    if (evre !== "olgun") return;
    setEvre("toplaniyor");
    sahneApiRef.current?.siraylaElleTopla();
  }, [evre]);

  useEffect(() => {
    const el = kapsayiciRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    const gl = renderer.getContext();
    const yazilimGl = yazilimGlTespit(gl);
    renderer.setPixelRatio(yazilimGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(el.clientWidth || 800, el.clientHeight || 450);
    el.innerHTML = "";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    studyoIsikKur(renderer, scene, 0xbae6fd, 0xd9f99d, 0.022);

    const camera = new THREE.PerspectiveCamera(46, (el.clientWidth || 800) / (el.clientHeight || 450), 0.1, 60);
    camera.position.set(0, 2.45, 3.45);
    camera.lookAt(0, 0.25, -0.15);
    scene.add(camera);

    const toprakDoku = toprakDokusuUret(true);
    const dokular = [toprakDoku];

    // Çevredeki yeşil tarla çayırı
    const cayir = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 22),
      new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.94 })
    );
    cayir.rotation.x = -Math.PI / 2;
    cayir.position.y = -0.04;
    scene.add(cayir);

    // Yakın çekim 3D Toprak Ocağı / Karığı (Sulanınca koyulaşır ve nemlenir)
    const toprakMat = new THREE.MeshStandardMaterial({
      map: toprakDoku,
      color: new THREE.Color(0x9a6b43),
      roughness: 0.95,
    });
    const karikYatak = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.22, 2.3), toprakMat);
    karikYatak.position.set(0, 0.08, -0.15);
    karikYatak.layers.enable(1);
    karikYatak.userData = { toprakMi: true };
    scene.add(karikYatak);

    // Ahşap/taş karık kenar bordürleri
    const ahsapMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
    const arkaTahta = new THREE.Mesh(new THREE.BoxGeometry(3.96, 0.28, 0.12), ahsapMat);
    arkaTahta.position.set(0, 0.14, -1.32);
    scene.add(arkaTahta);

    const onTahta = new THREE.Mesh(new THREE.BoxGeometry(3.96, 0.22, 0.10), ahsapMat);
    onTahta.position.set(0, 0.11, 1.02);
    scene.add(onTahta);

    // 6 Fide & Büyüyen Mahsul (Arka sıra z=-0.58, Ön sıra z=+0.35)
    const bitkiKonumlari = [
      [-1.15, -0.58],
      [0.0, -0.60],
      [1.15, -0.58],
      [-1.08, 0.35],
      [0.0, 0.36],
      [1.08, 0.35],
    ];
    const bitkiler = bitkiKonumlari.map(([bx, bz], idx) => {
      const b = bitkiModeliOlustur(parsel.tur, idx);
      b.kok.position.set(bx, 0.18, bz);
      scene.add(b.kok);
      return { ...b, toplandi: false, ucuyor: false, ucusP: 0, basPos: new THREE.Vector3() };
    });

    // Sol Ön Hasat Sepeti (Toplanan sebzeler buraya uçar)
    const sepetGrup = new THREE.Group();
    const sepetMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8, side: THREE.DoubleSide });
    const sepetGovde = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.26, 0.36, 16, 1, true), sepetMat);
    const sepetTaban = new THREE.Mesh(new THREE.CircleGeometry(0.26, 16), sepetMat);
    sepetTaban.rotation.x = -Math.PI / 2;
    sepetTaban.position.y = -0.17;
    const sepetCember = new THREE.Mesh(new THREE.TorusGeometry(0.40, 0.025, 8, 20), ahsapMat);
    sepetCember.rotation.x = Math.PI / 2;
    sepetCember.position.y = 0.18;
    sepetGrup.add(sepetGovde, sepetTaban, sepetCember);
    sepetGrup.position.set(-1.58, 0.22, 1.32);
    scene.add(sepetGrup);

    // Dünya uzayında (scene içinde!) Bakır Su İbriği:
    // Başlangıçta sağ ön kenarda dik durur; sulama başlayınca tam fidelerin üstüne kalkıp su döker!
    const { ibrikKok, emzikUcu } = bakirIbrikOlustur();
    const dinlenmePos = new THREE.Vector3(1.62, 0.38, 1.24);
    ibrikKok.position.copy(dinlenmePos);
    ibrikKok.scale.setScalar(0.88);
    ibrikKok.layers.enable(1);
    emzikUcu.layers.enable(1);
    scene.add(ibrikKok);

    // 3D Su Damlaları Havuzu
    const damlaGeo = new THREE.SphereGeometry(0.036, 7, 7);
    const damlaMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.88,
      roughness: 0.08,
      metalness: 0.12,
    });
    const damlalar = [];
    const dunyaEmzikVek = new THREE.Vector3();
    const kuruRenk = new THREE.Color(0x9a6b43);
    const islakRenk = new THREE.Color(0x3f2511);

    const anim = {
      mod: "bekle", // "bekle" | "sula" | "olgun"
      sulamaIlerleme: 0,
      damlaSayac: 0,
      siradakiKuyruk: [],
      kuyrukZaman: 0,
    };

    const tekMeyveTopla = (indeks) => {
      const b = bitkiler[indeks];
      if (!b || b.toplandi || b.ucuyor) return;
      b.ucuyor = true;
      b.ucusP = 0;
      b.meyveGrup.getWorldPosition(b.basPos);
      scene.attach(b.meyveGrup);
      sesCal("hasat");
    };

    sahneApiRef.current = {
      sulamaBaslat: () => {
        if (anim.mod !== "bekle") return;
        anim.mod = "sula";
        anim.sulamaIlerleme = 0;
      },
      siraylaElleTopla: () => {
        anim.siradakiKuyruk = bitkiler
          .map((b, idx) => (!b.toplandi && !b.ucuyor ? idx : -1))
          .filter((idx) => idx >= 0);
        anim.kuyrukZaman = 0;
      },
    };

    // Raycaster: Toprağa veya ibriğe tıklayınca sula, olgun sebzeye tıklayınca sepete topla!
    const raycaster = new THREE.Raycaster();
    const fare = new THREE.Vector2();
    const tikla = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      fare.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      fare.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(fare, camera);

      if (anim.mod === "bekle") {
        const kes = raycaster.intersectObjects([karikYatak, ibrikKok], true);
        if (kes.length > 0) {
          setEvre("sulaniyor");
          anim.mod = "sula";
          anim.sulamaIlerleme = 0;
        }
      } else if (anim.mod === "olgun") {
        const meyveMeshleri = bitkiler.filter((b) => !b.toplandi && !b.ucuyor).map((b) => b.anaMeyve);
        const kes = raycaster.intersectObjects(meyveMeshleri, false);
        if (kes.length > 0) {
          const idx = kes[0].object.userData?.bitkiIndeks;
          if (idx != null) tekMeyveTopla(idx);
        }
      }
    };
    renderer.domElement.addEventListener("pointerdown", tikla);

    const boyutlandir = () => {
      const w = el.clientWidth || 800;
      const h = el.clientHeight || 450;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(boyutlandir);
    ro.observe(el);

    let hasatBildirildi = false;
    let sonZaman = performance.now();
    const zamanlayici = kareZamanlayiciOlustur(gl, yazilimGl);

    const ciz = () => {
      const simdiMs = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (simdiMs - sonZaman) * 0.001));
      sonZaman = simdiMs;

      if (anim.mod === "bekle") {
        // İbrik hafifçe nefes alır gibi davetkâr salınır
        ibrikKok.position.y = dinlenmePos.y + Math.sin(simdiMs * 0.003) * 0.025;
      } else if (anim.mod === "sula") {
        anim.sulamaIlerleme = Math.min(1, anim.sulamaIlerleme + dt * 0.40);
        const p = anim.sulamaIlerleme;

        // 0..0.12: kalkış, 0.12..0.52: arka fide sırası (-1.15 -> +1.15, z=-0.58),
        // 0.52..0.90: ön fide sırası (+1.12 -> -1.12, z=+0.35), 0.90..1.0: yerine iniş
        let hedefX = 0;
        let hedefZ = -0.58;
        let kalkis = 1;

        if (p < 0.12) {
          kalkis = p / 0.12;
          hedefX = -1.15;
          hedefZ = -0.58;
        } else if (p < 0.52) {
          const u = (p - 0.12) / 0.40;
          hedefX = THREE.MathUtils.lerp(-1.15, 1.15, u);
          hedefZ = -0.58;
        } else if (p < 0.90) {
          const u = (p - 0.52) / 0.38;
          hedefX = THREE.MathUtils.lerp(1.12, -1.12, u);
          hedefZ = 0.35;
        } else {
          kalkis = Math.max(0, (1 - p) / 0.10);
          hedefX = -1.12;
          hedefZ = 0.35;
        }

        // rotation.z = +0.60 iken emzikUcu ibrikKok'un (-0.58, -0.09, 0) sol-altında kalır;
        // ibrikKok'u (hedefX + 0.58, 1.24, hedefZ) noktasına koyunca su TAM FİDENİN ÜSTÜNE dökülür!
        const aktifX = THREE.MathUtils.lerp(dinlenmePos.x, hedefX + 0.58, kalkis);
        const aktifY = THREE.MathUtils.lerp(dinlenmePos.y, 1.24, kalkis);
        const aktifZ = THREE.MathUtils.lerp(dinlenmePos.z, hedefZ, kalkis);

        ibrikKok.position.set(aktifX, aktifY, aktifZ);
        ibrikKok.rotation.set(0, 0, kalkis * 0.60);

        // Toprak ıslanır ve fideler büyüyüp olgun mahsul verir
        toprakMat.color.lerpColors(kuruRenk, islakRenk, p);
        toprakMat.roughness = 0.95 - p * 0.42;

        for (const b of bitkiler) {
          const fideOlcek = 0.45 + p * 0.62;
          b.fideGrup.scale.setScalar(fideOlcek);
          const meyveOlcek = Math.max(0.01, (p - 0.22) / 0.78);
          b.meyveGrup.scale.setScalar(meyveOlcek);
        }

        // Emzik ucundan doğrudan karıktaki fidelere dökülen su damlaları
        if (kalkis > 0.65) {
          anim.damlaSayac += dt;
          if (anim.damlaSayac > 0.032) {
            anim.damlaSayac = 0;
            sesCal("su");
            emzikUcu.getWorldPosition(dunyaEmzikVek);
            for (let k = 0; k < 3; k++) {
              const dm = new THREE.Mesh(damlaGeo, damlaMat);
              dm.position.copy(dunyaEmzikVek);
              dm.position.x += (Math.random() - 0.5) * 0.05;
              dm.position.z += (Math.random() - 0.5) * 0.05;
              scene.add(dm);
              damlalar.push({
                mesh: dm,
                vx: -0.18 + (Math.random() - 0.5) * 0.22,
                vy: -1.45 - Math.random() * 0.45,
                vz: (Math.random() - 0.5) * 0.22,
              });
            }
          }
        }

        if (p >= 1) {
          anim.mod = "olgun";
          ibrikKok.position.copy(dinlenmePos);
          ibrikKok.rotation.set(0, 0, 0);
          setEvre("olgun");
        }
      } else if (anim.mod === "olgun") {
        if (anim.siradakiKuyruk.length > 0) {
          anim.kuyrukZaman -= dt;
          if (anim.kuyrukZaman <= 0) {
            const siradaki = anim.siradakiKuyruk.shift();
            tekMeyveTopla(siradaki);
            anim.kuyrukZaman = 0.18;
          }
        }
      }

      // Dökülen su damlalarının toprağa düşüşü
      for (let i = damlalar.length - 1; i >= 0; i--) {
        const d = damlalar[i];
        d.vy -= 9.8 * dt;
        d.mesh.position.x += d.vx * dt;
        d.mesh.position.y += d.vy * dt;
        d.mesh.position.z += d.vz * dt;
        if (d.mesh.position.y <= 0.19) {
          scene.remove(d.mesh);
          damlalar.splice(i, 1);
        }
      }

      // Toplanan sebzelerin sepete kavisli uçuşu
      let bitenSayisi = 0;
      for (let i = 0; i < bitkiler.length; i++) {
        const b = bitkiler[i];
        if (b.toplandi) {
          bitenSayisi++;
          continue;
        }
        if (b.ucuyor) {
          b.ucusP = Math.min(1, b.ucusP + dt * 2.6);
          const u = b.ucusP;
          const hedefX = sepetGrup.position.x + ((i % 3) - 1) * 0.11;
          const hedefY = sepetGrup.position.y + 0.04;
          const hedefZ = sepetGrup.position.z + (Math.floor(i / 3) - 0.5) * 0.1;

          b.meyveGrup.position.x = THREE.MathUtils.lerp(b.basPos.x, hedefX, u);
          b.meyveGrup.position.z = THREE.MathUtils.lerp(b.basPos.z, hedefZ, u);
          b.meyveGrup.position.y =
            THREE.MathUtils.lerp(b.basPos.y, hedefY, u) + Math.sin(u * Math.PI) * 0.85;
          b.meyveGrup.rotation.y += dt * 5;

          if (u >= 1) {
            b.ucuyor = false;
            b.toplandi = true;
            bitenSayisi++;
            setToplananAdet(bitenSayisi);
          }
        }
      }

      if (bitenSayisi === bitkiler.length && !hasatBildirildi) {
        hasatBildirildi = true;
        setEvre("tamam");
        window.setTimeout(() => {
          onHasatTamamRef.current?.();
        }, 420);
      }

      renderer.render(scene, camera);
      zamanlayici.sonraki(ciz);
    };

    ciz();

    return () => {
      zamanlayici.iptal();
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", tikla);
      sahneTemizle(scene, renderer, dokular);
    };
  }, [parsel.id, parsel.tur]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-stone-950/95 px-4 py-3 ring-1 ring-amber-400/50">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onGeriDon}
            className="rounded-xl bg-stone-800 px-3 py-1.5 text-xs font-black text-amber-200 hover:bg-stone-700"
          >
            ← 3 Parsele Dön
          </button>
          <div>
            <h4 className="text-xs font-black text-amber-100 sm:text-sm">
              🌱 {parsel.ad} · Yakın Çekim 3D Sulama ve Hasat (+{parsel.miktar} 🌾 Mahsul)
            </h4>
            <p className="text-[11px] text-amber-200/80">
              {evre === "kuru"
                ? "1. Adım: Toprağa veya sağdaki bakır ibriğe tıklayarak fideleri sula!"
                : evre === "sulaniyor"
                ? "💧 Bakır ibrik fidelerin üzerinde gezinerek toprağı suluyor ve mahsuller büyüyor…"
                : evre === "olgun"
                ? `2. Adım: Yetişen ${parsel.mahsulAd} mahsullerine tek tek tıkla veya sağdaki butonla hepsini sepete topla (${toplananAdet}/6)!`
                : "✅ Tüm mahsuller sepete toplandı!"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {evre === "kuru" && (
            <button
              type="button"
              onClick={sulamayiBaslat}
              className="animate-bounce rounded-2xl bg-gradient-to-b from-sky-400 to-sky-600 px-5 py-2.5 text-xs font-black text-stone-950 shadow-lg ring-2 ring-sky-200 hover:brightness-110"
            >
              💧 İbriği Kaldır & Fideleri Sula
            </button>
          )}
          {evre === "olgun" && (
            <button
              type="button"
              disabled={bekliyor}
              onClick={hepsiniElleTopla}
              className="animate-bounce rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 py-2.5 text-xs font-black text-stone-950 shadow-lg ring-2 ring-emerald-200 hover:brightness-110"
            >
              🌾 Hepsini Sepete Topla ({toplananAdet}/6)
            </button>
          )}
        </div>
      </div>

      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl bg-stone-950 shadow-2xl ring-2 ring-amber-500/40">
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
    "🌾 Tarlada 3 bereketli parsel var! İstediğin parsele tıklayıp 3D sahnede bakır ibrikle sulayabilir veya sağ üstteki 'Hepsini Topla' butonuyla tüm hazır parselleri tek tıkla hasat edebilirsin."
  );

  const aktifParsel = parseller.find((p) => p.id === seciliParselId && p.hazir) ?? null;

  if (aktifParsel) {
    return (
      <TarlaYakinCekimFPS
        parsel={aktifParsel}
        bekliyor={oyun.bekliyor}
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-stone-950/95 px-4 py-3 text-xs font-bold text-amber-100 ring-1 ring-amber-400/40">
        <span className="flex-1">{bilgi}</span>
        <button
          type="button"
          disabled={hazirParseller.length === 0 || oyun.bekliyor}
          onClick={async () => {
            const sonuc = await oyun.sahaHepsiniTopla("erzak");
            if (sonuc?.mesaj) setBilgi(sonuc.mesaj);
          }}
          className="shrink-0 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-4 py-2.5 text-xs font-black text-stone-950 shadow-lg ring-2 ring-emerald-200 transition hover:brightness-110 disabled:from-stone-800 disabled:to-stone-800 disabled:text-stone-500 disabled:ring-stone-700"
        >
          {hazirParseller.length > 0
            ? `🌾 Hepsini Topla (${hazirParseller.length}/${parseller.length} Parsel · +${toplamHazirMahsul} Mahsul)`
            : "⏳ Tüm Parseller Yetişiyor"}
        </button>
      </div>

      {/* 3 Ayrı Sebze/Meyve Parseli Genel Görünümü */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl bg-stone-950 shadow-2xl ring-2 ring-amber-500/40 select-none">
        <img
          src="/assets/mekanlar/tarla_sahne.webp"
          alt="Tarla 3 Sebze ve Meyve Parseli"
          draggable={false}
          className="h-full w-full object-cover"
        />

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
