"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sesCal } from "./ses";

const SURE = 45;
const HEDEF_PUAN = 20;
const MAX_ACI = (70 * Math.PI) / 180;

// Taş türleri: deger = puan, rb = temel yarıçap (px), hiz = çekme hızı çarpanı
const TURLER = {
  kucuk: { deger: 1, rb: 14, hiz: 1.0 },
  orta: { deger: 3, rb: 24, hiz: 0.55 },
  buyuk: { deger: 7, rb: 38, hiz: 0.3 },
  kehribar: { deger: 5, rb: 13, hiz: 1.15 },
  kutuk: { deger: 0, rb: 30, hiz: 0.22 },
};

function sureYaz(dk) {
  if (dk == null || !Number.isFinite(dk) || dk <= 0) return "kısa süre";
  const s = Math.floor(dk / 60);
  const d = Math.round(dk % 60);
  if (s <= 0) return `${Math.max(1, d)} dakika`;
  if (d === 0) return `${s} saat`;
  return `${s} saat ${d} dakika`;
}

function tohum(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function kenarlar(n, rnd, oynak) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    const r = 1 + (rnd() - 0.5) * oynak;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

function tasUret(tur, x, y, sc) {
  const T = TURLER[tur];
  const rnd = Math.random;
  const s = {
    tur,
    x,
    y,
    rb: T.rb * (0.9 + rnd() * 0.2),
    r: 0,
    rot: rnd() * Math.PI * 2,
    pts: tur === "kehribar" ? [[0, -1.1], [0.8, -0.3], [0.65, 0.7], [0, 1.05], [-0.65, 0.7], [-0.8, -0.3]] : kenarlar(tur === "buyuk" ? 11 : tur === "orta" ? 9 : 8, rnd, 0.3),
    det: [],
  };
  s.r = s.rb * sc;
  if (tur === "orta") {
    for (let i = 0; i < 2; i++) {
      const a = rnd() * Math.PI * 2;
      s.det.push([Math.cos(a) * 0.6, Math.sin(a) * 0.6, Math.cos(a + 2.4) * 0.3, Math.sin(a + 2.4) * 0.3]);
    }
  } else if (tur === "buyuk") {
    for (let i = 0; i < 3; i++) {
      const a = rnd() * Math.PI;
      s.det.push([Math.cos(a) * 0.7, Math.sin(a) * 0.7 - 0.2, -Math.cos(a) * 0.5, -Math.sin(a) * 0.5 + 0.2]);
    }
    for (let i = 0; i < 6; i++) s.det.push([(rnd() - 0.5) * 1.3, (rnd() - 0.5) * 1.3]);
  }
  return s;
}

function yolla(ctx, pts, r) {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0] * r, p[1] * r) : ctx.lineTo(p[0] * r, p[1] * r)));
  ctx.closePath();
}

function tasCiz(ctx, s, sc) {
  const r = s.r;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rot);
  const lw = Math.max(1, 1.5 * sc);
  if (s.tur === "kutuk") {
    const w = r * 1.0;
    const h = r * 0.65;
    ctx.fillStyle = "#6b4423";
    ctx.beginPath();
    ctx.roundRect(-w, -h, w * 2, h * 2, h * 0.5);
    ctx.fill();
    ctx.strokeStyle = "rgba(30,15,5,0.5)";
    ctx.lineWidth = lw;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-w * 0.8, i * h * 0.5);
      ctx.lineTo(w * 0.6, i * h * 0.5 + h * 0.08);
      ctx.stroke();
    }
    ctx.fillStyle = "#c79a5e";
    ctx.beginPath();
    ctx.ellipse(w * 0.85, 0, h * 0.45, h * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7a4e22";
    for (let k = 0.3; k < 1; k += 0.3) {
      ctx.beginPath();
      ctx.ellipse(w * 0.85, 0, h * 0.45 * k, h * 0.95 * k, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.roundRect(-w, -h, w * 2, h * 2, h * 0.5);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const renk = {
    kucuk: ["#c4c8d0", "#7d828c"],
    orta: ["#939aa8", "#464a56"],
    buyuk: ["#7a7078", "#34303a"],
    kehribar: ["#ffe08a", "#d9791a"],
  }[s.tur];
  const gr = ctx.createLinearGradient(-r, -r, r, r);
  gr.addColorStop(0, renk[0]);
  gr.addColorStop(1, renk[1]);
  ctx.fillStyle = gr;
  yolla(ctx, s.pts, r);
  ctx.fill();
  // parlama
  ctx.save();
  ctx.translate(-r * 0.12, -r * 0.18);
  ctx.fillStyle = s.tur === "kehribar" ? "rgba(255,255,230,0.45)" : "rgba(255,255,255,0.2)";
  yolla(ctx, s.pts, r * 0.6);
  ctx.fill();
  ctx.restore();
  // detaylar
  if (s.tur === "orta") {
    ctx.strokeStyle = "rgba(20,20,30,0.7)";
    ctx.lineWidth = lw;
    s.det.forEach((d) => {
      ctx.beginPath();
      ctx.moveTo(d[0] * r, d[1] * r);
      ctx.lineTo((d[0] + d[2]) * 0.6 * r, (d[1] + d[3]) * 0.6 * r);
      ctx.lineTo(d[2] * r, d[3] * r);
      ctx.stroke();
    });
  } else if (s.tur === "buyuk") {
    ctx.strokeStyle = "rgba(235,215,200,0.55)";
    ctx.lineWidth = lw * 1.2;
    for (let i = 0; i < 3; i++) {
      const d = s.det[i];
      ctx.beginPath();
      ctx.moveTo(d[0] * r, d[1] * r);
      ctx.quadraticCurveTo(0, d[3] * r * 0.2, d[2] * r, d[3] * r);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(15,12,20,0.55)";
    for (let i = 3; i < s.det.length; i++) {
      ctx.beginPath();
      ctx.arc(s.det[i][0] * r, s.det[i][1] * r, Math.max(1, r * 0.05), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (s.tur === "kehribar") {
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, -r * 0.3);
    ctx.lineTo(r * 0.8, -r * 0.3);
    ctx.moveTo(0, -r * 1.1);
    ctx.lineTo(0, r * 1.05);
    ctx.stroke();
  }
  // gölge çizgisi
  ctx.strokeStyle = "rgba(0,0,0,0.38)";
  ctx.lineWidth = lw;
  yolla(ctx, s.pts, r);
  ctx.stroke();
  ctx.restore();
}

function arkaPlanCiz(w, h, dpr, sc, gY) {
  const cv = document.createElement("canvas");
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  const c = cv.getContext("2d");
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rnd = tohum(1453);
  // gökyüzü
  const sk = c.createLinearGradient(0, 0, 0, gY);
  sk.addColorStop(0, "#1e1b4b");
  sk.addColorStop(1, "#7a5a8a");
  c.fillStyle = sk;
  c.fillRect(0, 0, w, gY + 2);
  // uzak tepeler
  c.fillStyle = "#3b2f63";
  c.beginPath();
  c.moveTo(0, gY);
  for (let x = 0; x <= w; x += 12) c.lineTo(x, gY - (10 + 8 * Math.sin(x / (60 * sc)) + 6 * Math.sin(x / (23 * sc) + 1)) * sc);
  c.lineTo(w, gY);
  c.fill();
  // toprak katmanları
  const kat = ["#7d5533", "#6c4628", "#5b3a21", "#4b2f1a", "#3d2615"];
  const kh = (h - gY) / kat.length;
  kat.forEach((renk, i) => {
    const y0 = gY + kh * i;
    const g = c.createLinearGradient(0, y0, 0, y0 + kh);
    g.addColorStop(0, renk);
    g.addColorStop(1, kat[Math.min(kat.length - 1, i + 1)]);
    c.fillStyle = g;
    c.fillRect(0, y0, w, kh + 1);
    c.strokeStyle = "rgba(255,220,170,0.16)";
    c.lineWidth = 2 * sc;
    c.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const y = y0 + Math.sin(x / (38 * sc) + i * 1.7) * 3 * sc + Math.sin(x / (15 * sc)) * 1.5 * sc;
      if (x === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
  });
  // çim şeridi
  c.fillStyle = "#4f7a3a";
  c.beginPath();
  c.moveTo(0, gY - 3 * sc);
  for (let x = 0; x <= w; x += 8) c.lineTo(x, gY - 3 * sc + Math.sin(x / (14 * sc)) * 2 * sc);
  c.lineTo(w, gY + 7 * sc);
  c.lineTo(0, gY + 7 * sc);
  c.fill();
  // çakıllar
  for (let i = 0; i < 70; i++) {
    const x = rnd() * w;
    const y = gY + 14 * sc + rnd() * (h - gY - 14 * sc);
    const r = (1.5 + rnd() * 3) * sc;
    c.fillStyle = rnd() > 0.5 ? "rgba(200,180,150,0.28)" : "rgba(20,10,0,0.28)";
    c.beginPath();
    c.ellipse(x, y, r * 1.4, r, rnd() * 3, 0, Math.PI * 2);
    c.fill();
  }
  // kökler
  c.strokeStyle = "rgba(230,200,150,0.22)";
  c.lineWidth = 1.5 * sc;
  for (let i = 0; i < 9; i++) {
    const x = rnd() * w;
    const y = gY + 8 * sc + rnd() * (h - gY) * 0.7;
    c.beginPath();
    c.moveTo(x, y);
    c.bezierCurveTo(x + 20 * sc, y + 10 * sc, x - 15 * sc, y + 28 * sc, x + 10 * sc, y + 42 * sc);
    c.stroke();
  }
  return cv;
}

export default function TasAviOyunu({ oyun }) {
  const noktalar = oyun?.sahaNoktalari?.("tas") ?? [];
  const hazirlar = noktalar.filter((n) => n.hazir);
  const temel = hazirlar.reduce((t, n) => t + (Number(n.miktar) || 0), 0);
  const kalanlar = noktalar.map((n) => n.kalanDakika).filter((k) => typeof k === "number");
  const enAz = kalanlar.length ? Math.min(...kalanlar) : null;
  const iscilerSayi = Math.max(1, Math.floor(Number(oyun?.durum?.isciler?.tas ?? 1)) || 1);

  const [faz, setFaz] = useState("baslangic"); // baslangic | oyun | bitti
  const [hud, setHud] = useState({ sure: SURE, puan: 0 });
  const [temelKilit, setTemelKilit] = useState(0);
  const [bitis, setBitis] = useState({ puan: 0, oran: 0.5 });
  const [sonuc, setSonuc] = useState(null);
  const [hata, setHata] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);

  const oyunRef = useRef(oyun);
  const gonderRef = useRef(false);
  const oranRef = useRef(0.5);
  const isciRef = useRef(iscilerSayi);
  const wrapRef = useRef(null);
  const cvRef = useRef(null);

  useEffect(() => {
    oyunRef.current = oyun;
    isciRef.current = iscilerSayi;
  });

  const gonder = useCallback(async (oran) => {
    if (gonderRef.current) return;
    gonderRef.current = true;
    setHata(false);
    setYukleniyor(true);
    let r = null;
    try {
      r = await oyunRef.current.tasAvi(oran);
    } catch {
      r = null;
    }
    setYukleniyor(false);
    if (r) setSonuc(r);
    else {
      gonderRef.current = false;
      setHata(true);
    }
  }, []);

  const baslat = () => {
    setTemelKilit(temel);
    setHud({ sure: SURE, puan: 0 });
    setSonuc(null);
    setHata(false);
    gonderRef.current = false;
    setFaz("oyun");
  };

  useEffect(() => {
    if (faz !== "oyun") return undefined;
    const wrap = wrapRef.current;
    const cv = cvRef.current;
    if (!wrap || !cv) return undefined;
    const ctx = cv.getContext("2d");
    const azHareket = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const g = {
      w: 0, h: 0, dpr: 1, sc: 1, gY: 0, px: 0, py: 0, L0: 0,
      stones: [], bg: null,
      phase: 0, len: 0, state: "swing", curAng: 0, grabbed: null, reelHiz: 0,
      time: SURE, puan: 0, parts: [], floats: [], bitti: false,
      last: 0, hudT: 0, hudS: "",
    };

    const boyutla = () => {
      const w = Math.max(240, Math.floor(wrap.clientWidth || 320));
      const h = Math.round(w < 520 ? w * 1.25 : w * 0.625);
      if (w === g.w && h === g.h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const eskiW = g.w;
      const eskiH = g.h;
      g.sc = Math.min(1.2, Math.max(0.55, w / 700));
      g.w = w;
      g.h = h;
      g.dpr = dpr;
      g.gY = h * 0.2;
      g.px = w / 2;
      g.py = g.gY - 40 * g.sc;
      g.L0 = 14 * g.sc;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.height = `${h}px`;
      if (eskiW) {
        const rx = w / eskiW;
        const ry = h / eskiH;
        g.stones.forEach((s) => {
          s.x *= rx;
          s.y *= ry;
          s.r = s.rb * g.sc;
        });
        g.len = Math.max(g.L0, g.len * ry);
        g.parts = [];
        g.floats = [];
      }
      g.bg = arkaPlanCiz(w, h, dpr, g.sc, g.gY);
    };

    const tasDagit = () => {
      const { w, h, sc, gY } = g;
      const liste = [
        ...Array(2).fill("buyuk"),
        ...Array(4).fill("orta"),
        ...Array(2).fill("kehribar"),
        ...Array(1 + (Math.random() > 0.5 ? 1 : 0)).fill("kutuk"),
        ...Array(4).fill("kucuk"),
      ];
      const bosluk = 7 * sc;
      for (const tur of liste) {
        const r = TURLER[tur].rb * 1.1 * sc;
        for (let deneme = 0; deneme < 250; deneme++) {
          const x = r + 6 + Math.random() * (w - 2 * r - 12);
          const y = gY + h * 0.1 + r + Math.random() * (h - gY - h * 0.1 - 2 * r - 6);
          if (g.stones.every((o) => Math.hypot(o.x - x, o.y - y) > o.r * 1.1 + r + bosluk)) {
            g.stones.push(tasUret(tur, x, y, sc));
            break;
          }
        }
      }
    };

    const toz = (x, y, n) => {
      if (azHareket) return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = (20 + Math.random() * 60) * g.sc;
        g.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, t: 0.5 + Math.random() * 0.3, m: 0.8, r: (1.5 + Math.random() * 2.5) * g.sc });
      }
    };

    const ates = () => {
      if (g.state !== "swing" || g.time <= 0 || g.bitti) return;
      g.state = "out";
    };

    const guncelle = (dt) => {
      const atis = g.h * 0.95;
      const isciCarpan = 1 + Math.min(0.6, 0.12 * (isciRef.current - 1));
      if (!g.bitti && g.time > 0) g.time = Math.max(0, g.time - dt);

      if (g.state === "swing") {
        g.phase += dt * 1.7;
        g.curAng = MAX_ACI * Math.sin(g.phase);
        g.len = g.L0;
      } else if (g.state === "out") {
        g.len += atis * dt;
        const tx = g.px + Math.sin(g.curAng) * g.len;
        const ty = g.py + Math.cos(g.curAng) * g.len;
        const hit = g.stones.find((s) => Math.hypot(s.x - tx, s.y - ty) < s.r + 5 * g.sc);
        if (hit) {
          g.grabbed = hit;
          g.reelHiz = atis * TURLER[hit.tur].hiz * isciCarpan;
          g.state = "in";
          toz(tx, ty, 9);
        } else if (tx < 0 || tx > g.w || ty > g.h) {
          g.reelHiz = atis * 1.5;
          g.state = "in";
        }
      } else if (g.state === "in") {
        g.len -= g.reelHiz * dt;
        const s = g.grabbed;
        if (s) {
          const d = s.r * 0.8 + 4 * g.sc;
          s.x = g.px + Math.sin(g.curAng) * (g.len + d);
          s.y = g.py + Math.cos(g.curAng) * (g.len + d);
        }
        if (g.len <= g.L0) {
          g.len = g.L0;
          if (s) {
            const deger = TURLER[s.tur].deger;
            g.stones = g.stones.filter((o) => o !== s);
            g.puan += deger;
            g.floats.push({ x: g.px + 26 * g.sc, y: g.py + 6 * g.sc, t: 1.1, txt: deger > 0 ? `+${deger}` : "Kütük!" });
            toz(g.px, g.py + g.L0, 8);
            if (deger > 0) {
              try {
                sesCal("toplama");
              } catch {
                // ses önemsiz
              }
            }
          }
          g.grabbed = null;
          g.state = "swing";
        }
      }

      g.parts.forEach((p) => {
        p.t -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 120 * dt;
      });
      g.parts = g.parts.filter((p) => p.t > 0);
      g.floats.forEach((f) => {
        f.t -= dt;
        f.y -= 28 * g.sc * dt;
      });
      g.floats = g.floats.filter((f) => f.t > 0);

      if (g.state === "swing" && !g.bitti) {
        const kalan = g.stones.some((s) => s.tur !== "kutuk");
        if (g.time <= 0 || !kalan) g.bitti = true;
      }
    };

    const cizKurek = () => {
      const { px, py, gY, sc } = g;
      ctx.fillStyle = "#5b3a1c";
      ctx.fillRect(px - 64 * sc, gY - 4 * sc, 128 * sc, 9 * sc);
      ctx.fillStyle = "#8a5a2b";
      ctx.fillRect(px - 22 * sc, py, 6 * sc, gY - py);
      ctx.fillRect(px + 16 * sc, py, 6 * sc, gY - py);
      ctx.fillRect(px - 32 * sc, py - 6 * sc, 64 * sc, 8 * sc);
      ctx.strokeStyle = "#6b4423";
      ctx.lineWidth = 3 * sc;
      ctx.beginPath();
      ctx.moveTo(px - 19 * sc, gY - 6 * sc);
      ctx.lineTo(px + 19 * sc, py + 8 * sc);
      ctx.moveTo(px + 19 * sc, gY - 6 * sc);
      ctx.lineTo(px - 19 * sc, py + 8 * sc);
      ctx.stroke();
      // tambur
      ctx.fillStyle = "#3d2615";
      ctx.beginPath();
      ctx.arc(px, py, 9 * sc, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#d9a441";
      ctx.lineWidth = 2 * sc;
      ctx.stroke();
      // işçi
      const mx = px - 46 * sc;
      const ay = gY - 4 * sc;
      ctx.fillStyle = "#2d2a55";
      ctx.fillRect(mx - 6 * sc, ay - 12 * sc, 5 * sc, 12 * sc);
      ctx.fillRect(mx + 1 * sc, ay - 12 * sc, 5 * sc, 12 * sc);
      ctx.fillStyle = "#5b54c4";
      ctx.beginPath();
      ctx.roundRect(mx - 8 * sc, ay - 32 * sc, 16 * sc, 22 * sc, 4 * sc);
      ctx.fill();
      ctx.strokeStyle = "#e0b48a";
      ctx.lineWidth = 3.5 * sc;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(mx + 6 * sc, ay - 27 * sc);
      ctx.lineTo(px - 14 * sc, py + 10 * sc);
      ctx.stroke();
      ctx.lineCap = "butt";
      ctx.fillStyle = "#e0b48a";
      ctx.beginPath();
      ctx.arc(mx, ay - 39 * sc, 6.5 * sc, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d9a441";
      ctx.beginPath();
      ctx.arc(mx, ay - 41 * sc, 7 * sc, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(mx - 9 * sc, ay - 41.5 * sc, 18 * sc, 2.5 * sc);
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.arc(mx + 2.5 * sc, ay - 39 * sc, 0.9 * sc, 0, Math.PI * 2);
      ctx.fill();
    };

    const cizKanca = () => {
      const { px, py, sc } = g;
      const tx = px + Math.sin(g.curAng) * g.len;
      const ty = py + Math.cos(g.curAng) * g.len;
      ctx.strokeStyle = "#e6d5a8";
      ctx.lineWidth = 2 * sc;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(-g.curAng);
      ctx.strokeStyle = "#d5d9e2";
      ctx.lineWidth = 3 * sc;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 11 * sc);
      ctx.moveTo(0, 2 * sc);
      ctx.quadraticCurveTo(-11 * sc, 4 * sc, -8 * sc, 14 * sc);
      ctx.moveTo(0, 2 * sc);
      ctx.quadraticCurveTo(11 * sc, 4 * sc, 8 * sc, 14 * sc);
      ctx.stroke();
      ctx.fillStyle = "#8a8f9c";
      ctx.beginPath();
      ctx.arc(0, 0, 3.2 * sc, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.lineCap = "butt";
    };

    const ciz = () => {
      ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
      ctx.clearRect(0, 0, g.w, g.h);
      if (g.bg) ctx.drawImage(g.bg, 0, 0, g.w, g.h);
      g.stones.forEach((s) => tasCiz(ctx, s, g.sc));
      cizKurek();
      cizKanca();
      g.parts.forEach((p) => {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.t / p.m));
        ctx.fillStyle = "#d8c3a0";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.font = `bold ${Math.round(16 * g.sc + 6)}px sans-serif`;
      ctx.textAlign = "center";
      g.floats.forEach((f) => {
        ctx.globalAlpha = Math.max(0, Math.min(1, f.t / 0.6));
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(30,20,60,0.85)";
        ctx.strokeText(f.txt, f.x, f.y);
        ctx.fillStyle = f.txt === "Kütük!" ? "#d6b58a" : "#fde68a";
        ctx.fillText(f.txt, f.x, f.y);
      });
      ctx.globalAlpha = 1;
    };

    boyutla();
    tasDagit();

    let raf = 0;
    let bitirildi = false;
    const kare = (t) => {
      raf = requestAnimationFrame(kare);
      const dt = g.last ? Math.min(0.05, (t - g.last) / 1000) : 0.016;
      g.last = t;
      guncelle(dt);
      ciz();
      g.hudT += dt;
      if (g.hudT >= 0.2) {
        g.hudT = 0;
        const sure = Math.ceil(g.time);
        const anahtar = `${sure}|${g.puan}`;
        if (anahtar !== g.hudS) {
          g.hudS = anahtar;
          setHud({ sure, puan: g.puan });
        }
      }
      if (g.bitti && !bitirildi) {
        bitirildi = true;
        cancelAnimationFrame(raf);
        const p = g.puan;
        // Hedefe ulaşan %100 alır; hedefin 1,5 katına kadar fazlası %130'a çıkarır
        const oran = Math.min(
          1.3,
          0.5 + 0.5 * Math.min(1, p / HEDEF_PUAN) + 0.3 * Math.min(1, Math.max(0, p - HEDEF_PUAN) / (HEDEF_PUAN * 0.5))
        );
        oranRef.current = oran;
        setHud({ sure: 0, puan: p });
        setBitis({ puan: p, oran });
        setFaz("bitti");
        gonder(oran);
      }
    };
    raf = requestAnimationFrame(kare);

    const ro = new ResizeObserver(() => boyutla());
    ro.observe(wrap);

    const tus = (e) => {
      if (e.code === "Space" || e.code === "ArrowDown") {
        e.preventDefault();
        ates();
      }
    };
    const dokun = (e) => {
      e.preventDefault();
      ates();
    };
    window.addEventListener("keydown", tus);
    cv.addEventListener("pointerdown", dokun);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", tus);
      cv.removeEventListener("pointerdown", dokun);
    };
  }, [faz, gonder]);

  const kutu = "tezhip overflow-hidden rounded-3xl p-3 sm:p-4";
  const dugme = "varak-dugme varak-isilti rounded-xl px-4 py-2 text-sm";

  // Sonuç her durumda önceliklidir (sunucu taşları kullanılmış sayabilir)
  if (faz === "bitti") {
    const tahmin = Math.round(temelKilit * bitis.oran);
    return (
      <div className={kutu}>
        <div className="rounded-2xl bg-stone-900/80 p-4 text-center text-amber-100">
          <h3 className="font-display text-xl text-amber-200">🪝 Taş Avı</h3>
          <p className="mt-2 text-sm">
            Puanın: <b>{bitis.puan}</b> / Hedef {HEDEF_PUAN} · Verim %{Math.round(bitis.oran * 100)}
          </p>
          <p className="mt-1 text-sm text-amber-200">Tahmini ödül: {tahmin} 🧱</p>
          {sonuc ? (
            <div className="mt-4 rounded-xl bg-stone-900/80 p-3">
              <p className="font-display text-lg text-amber-200">+{sonuc.miktar} Taş depoya eklendi!</p>
              {sonuc.mesaj ? <p className="mt-1 text-sm">{sonuc.mesaj}</p> : null}
              <p className="mt-2 text-sm text-amber-100">Yarın Taş Ocağı&apos;nda yine kazma günü.</p>
            </div>
          ) : hata ? (
            <div className="mt-4">
              <p className="text-sm text-amber-200">Sonuç gönderilemedi. Tekrar deneyelim mi?</p>
              <button type="button" className={`${dugme} mt-2`} disabled={yukleniyor || oyun?.bekliyor} onClick={() => gonder(oranRef.current)}>
                Tekrar Dene
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-amber-200">Taşlar depoya taşınıyor…</p>
          )}
        </div>
      </div>
    );
  }

  if (faz === "baslangic" && hazirlar.length === 0) {
    return (
      <div className={kutu}>
        <div className="rounded-2xl bg-stone-900/80 p-4 text-center text-amber-100">
          <h3 className="font-display text-xl text-amber-200">⛏️ Taş Ocağı dinleniyor</h3>
          <p className="mt-2 text-sm">Yeni taşlar ~{sureYaz(enAz)} sonra hazır.</p>
        </div>
      </div>
    );
  }

  if (faz === "baslangic") {
    return (
      <div className={kutu}>
        <div className="rounded-2xl bg-stone-900/80 p-4 text-center text-amber-100">
          <h3 className="font-display text-2xl text-amber-200">🪝 Taş Avı</h3>
          <ul className="mx-auto mt-3 max-w-md space-y-1 text-left text-sm">
            <li>• Küçük taş az puan verir ama hızlı gelir.</li>
            <li>• Büyük taş çok puan verir ama yavaş çekilir.</li>
            <li>• Kütük vakit kaybettirir, dikkat et!</li>
          </ul>
          <p className="mt-3 text-sm text-amber-200">
            Bugünkü taş verimi: {temel} 🧱 (başarına göre %50–%130)
          </p>
          {iscilerSayi > 1 ? <p className="mt-1 text-xs text-amber-200">👷 {iscilerSayi} işçi: kanca daha hızlı çekiliyor</p> : null}
          <button type="button" className={`${dugme} mt-4 px-6 py-3 text-base`} onClick={baslat}>
            Kancayı Hazırla ve Başla
          </button>
        </div>
      </div>
    );
  }

  const ilerleme = Math.min(100, (hud.puan / HEDEF_PUAN) * 100);
  return (
    <div className={kutu}>
      <div className="mb-2 rounded-2xl bg-stone-900/80 px-3 py-2 text-amber-100">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="font-display text-lg text-amber-200">⏱ {hud.sure}</span>
          <span className="text-sm">
            Puan: {hud.puan} / Hedef {HEDEF_PUAN}
          </span>
          <span className="text-xs text-amber-200">Taş Avı · Kancayı at: ekrana dokun</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/40">
          <div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${ilerleme}%` }} />
        </div>
        {iscilerSayi > 1 ? <p className="mt-1 text-xs text-amber-200">👷 {iscilerSayi} işçi: kanca daha hızlı çekiliyor</p> : null}
      </div>
      <div ref={wrapRef} className="w-full">
        <canvas
          ref={cvRef}
          aria-label="Taş Avı oyun alanı: kancayı atmak için dokun"
          className="block w-full cursor-pointer select-none rounded-2xl"
          style={{ touchAction: "manipulation" }}
        />
      </div>
    </div>
  );
}
