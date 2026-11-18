"use client";
import { useEffect, useRef, useState } from "react";
import {
  ARSALAR,
  NOKTALAR,
  BINALAR,
  BIRLIK_BINALARI,
  BIRLIK_MEYDANI_CINAR,
  BOLGELER,
  KAYNAKLAR,
  BIRLIK_ACILIS_LEVEL,
  ALAN_MUCADELESI_LEVEL,
  toplamKonutKapasitesi,
} from "@/lib/oyun/sabitler";
import { kaynakAcikMi, meydanOlayDurumu, mektupBugunAlindi } from "@/lib/oyun/kurallar";
import { useOyun } from "@/lib/oyun/useOyun";
import UstBar from "./UstBar";
import Kutlama from "./Kutlama";
import Panel from "./Panel";
import GelistiriciPaneli from "./GelistiriciPaneli";
import RehberKarakter, { REHBER_ADIMLARI, ilkEksikRehberAdimi } from "./RehberKarakter";
import CanliKoySahnesi from "./CanliKoySahnesi";

const HARITA_ORAN = 1710 / 920;
const ZOOM_ENCOK = 2.2;

/**
 * Bir köy binasında şu an oyuncunun yapabileceği görev veya hazır inşa/yükseltme sayısını döner.
 * Kırmızı yuvarlak bildirim rozeti (1, 2...) için kullanılır.
 */
function binaBildirimSayisi(id, oyun) {
  const { durum, gorevler, aktifIcerik } = oyun;
  const seviye = durum.binalar?.[id] ?? 0;
  const bilgi = oyun.binaBilgisi(id);
  const mektepKurulu = (durum.binalar?.mektep ?? 0) >= 1;

  // Köy Meydanı Level 1'den itibaren açıktır; Mektep kurulduktan sonra günlük dava / paylaşım görevi varsa "1" rozeti göster
  if (id === "sosyalmeydan" && mektepKurulu) {
    let meydanSayi = 0;
    const gunlukDavaAcik = meydanOlayDurumu(durum, oyun.simdi).hazir;
    for (const g of gorevler) {
      if (g.tamam) continue;
      if (g.tur === "dava" && gunlukDavaAcik) {
        meydanSayi += 1;
      } else if (g.tur === "meydan_paylasim" || g.tur === "meydan_yorum") {
        meydanSayi += 1;
      }
    }
    if (bilgi.yapilabilir) meydanSayi += 1;
    return meydanSayi;
  }

  // Henüz inşa edilmemiş arsa: Tüm inşa şartları ve kaynakları hazırsa kırmızı "1" göster!
  if (seviye === 0) {
    if (BINALAR[id]?.konut) {
      // Ek konutlarda sadece köyde hiç boş yatak kalmadıysa ilk uygun konutu işaretle
      const bosYatak = toplamKonutKapasitesi(durum.binalar) - (durum.envanter?.insan ?? 5);
      if (bosYatak > 0) return 0;
      const ilkBosEv = ["ev1", "ev2", "ev3", "ev4", "ev5"].find((e) => (durum.binalar?.[e] ?? 0) === 0);
      return id === ilkBosEv && bilgi.yapilabilir ? 1 : 0;
    }
    return bilgi.yapilabilir ? 1 : 0;
  }

  let sayi = 0;

  if (id === "mektep") {
    for (const g of gorevler) {
      if (g.tamam) continue;
      if (g.tur === "hadis" && !g.bugunYapildi) sayi += 1;
      else if (g.tur === "video") sayi += 1;
      else if (g.tur === "sinav" && (aktifIcerik?.sinav?.length ?? 0) > 0) sayi += 1;
    }
    if (bilgi.yapilabilir) sayi += 1;
    return sayi;
  }

  if (id === "kiraathane" && mektepKurulu) {
    for (const g of gorevler) {
      if (!g.tamam && g.tur === "turku") sayi += 1;
    }
    if (bilgi.yapilabilir) sayi += 1;
    return sayi;
  }

  if (id === "kendi_evim" && mektepKurulu) {
    const aileEksik = gorevler.some((g) => g.tur === "aile" && !g.tamam && !g.bugunYapildi);
    const mektupEvde = mektupBugunAlindi(durum, oyun.simdi);
    if (aileEksik && mektupEvde) sayi += 1;
    return sayi;
  }

  if (id === "otag") {
    return bilgi.yapilabilir ? 1 : 0;
  }

  return 0;
}

/**
 * Sabit harita noktaları (Haberci, Pano) için sayısal görev rozeti (1, 2...).
 */
function noktaGorevSayisi(id, oyun) {
  const { durum, gorevler } = oyun;
  const mektepKurulu = (durum.binalar?.mektep ?? 0) >= 1;

  if (id === "pano") {
    const onayGorevi = mektepKurulu ? gorevler.filter((g) => g.tur === "onay" && !g.tamam && !g.bugunYapildi).length : 0;
    return (oyun.levelAtlanabilir ? 1 : 0) + onayGorevi;
  }

  if (id === "haberci") {
    let sayi = 0;
    // Haberci her gün yeni bir mektup getirir
    if (mektepKurulu && !mektupBugunAlindi(durum, oyun.simdi)) {
      sayi += 1;
    }
    if (mektepKurulu) {
      const seyyahHazir = gorevler.some((g) => g.tur === "seyyah" && !g.tamam && !g.bugunYapildi);
      if (seyyahHazir) sayi += 1;
    }
    return sayi;
  }

  return 0;
}

export default function KoyHaritasi({ baslangic }) {
  const oyun = useOyun(baslangic);
  const kaydirRef = useRef(null);
  const suruklemeRef = useRef({
    aktif: false,
    hareketEtti: false,
    basX: 0,
    basY: 0,
    sol: 0,
    ust: 0,
  });
  const [surukleniyor, setSurukleniyor] = useState(false);
  // Yakınlaştırma durumu ref'te tutulur (hareket sırasında yeniden çizim yok); yüzde yalnızca düğmeler için
  const zoomRef = useRef({ z: 1, hedef: 1, anc: { x: 0, y: 0, u: 0.5, v: 0.5 }, tikEngel: 0 });
  const [zoomGosterge, setZoomGosterge] = useState(100);
  const [katman, setKatman] = useState("koy"); // 'koy' | 'birlik' | 'harita'
  const [secim, setSecim] = useState(null); // { tur: 'bina'|'nokta'|'birlikBina'|'bolge'|'birlik', id }
  const [birlikOzeti, setBirlikOzeti] = useState(null);
  const [duzenle, setDuzenle] = useState(false);
  const [koordinat, setKoordinat] = useState(null);
  const [rehberAcik, setRehberAcik] = useState(
    () => (baslangic?.durum?.binalar?.mektep ?? 0) === 0 || (baslangic?.durum?.level ?? 1) === 1
  );
  const [rehberAdimIndeks, setRehberAdimIndeks] = useState(() =>
    ilkEksikRehberAdimi(
      baslangic?.durum ?? {},
      [],
      (baslangic?.durum?.binalar?.mektep ?? 0) === 0
    )
  );

  const hamRehberAdimi = REHBER_ADIMLARI[rehberAdimIndeks] ?? REHBER_ADIMLARI[0];
  // Rehber bir adımı o güne göre değiştirirse (ör. ertesi gün "Tekrar hoş geldin"), haritadaki
  // "Buraya Tıkla" işaretleri ve kamera rehberin gösterdiği hedefleri kullanır
  const [rehberGorunenHedefler, setRehberGorunenHedefler] = useState(null);
  const [rehberKucuk, setRehberKucuk] = useState(false);
  const aktifRehberAdimi =
    rehberGorunenHedefler && rehberGorunenHedefler.kod === hamRehberAdimi.kod
      ? { ...hamRehberAdimi, hedefler: rehberGorunenHedefler.hedefler }
      : hamRehberAdimi;

  // Tanıtım turunu bir kez geçen öğrenci, sayfayı yenileyince turu baştan görmesin (cihazda hatırlanır)
  useEffect(() => {
    let gorulmus = false;
    try {
      gorulmus = window.localStorage.getItem("seyrusefer_tanitim_goruldu") === "1";
    } catch {
      // tarayıcı hafızası kapalıysa tur her seferinde gösterilir
    }
    const bolum = REHBER_ADIMLARI[rehberAdimIndeks]?.bolum;
    // Açılışta görev adımını bugünün durumuna göre yeniden seç (ör. yeni günde önce Haberci'nin mektubu)
    if ((gorulmus && bolum === "tanitim") || bolum === "gorev") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRehberAdimIndeks(ilkEksikRehberAdimi(oyun.durum, oyun.gorevler, false, oyun.simdi));
    }
    // yalnızca açılışta bir kez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (REHBER_ADIMLARI[rehberAdimIndeks]?.bolum !== "gorev") return;
    try {
      window.localStorage.setItem("seyrusefer_tanitim_goruldu", "1");
    } catch {
      // saklanamazsa sorun değil
    }
  }, [rehberAdimIndeks]);

  // Bina inşa edildiğinde (ör. Mektep kurulduğunda) veya görev/level ilerlediğinde rehber açıksa sıradaki adıma otomatik geçsin
  useEffect(() => {
    if (!oyun.hazir || !rehberAcik) return;
    const adim = REHBER_ADIMLARI[rehberAdimIndeks];
    if (adim?.bolum === "gorev" && adim.tamamMi?.(oyun.durum, oyun.gorevler, oyun.simdi)) {
      const yeniIndeks = ilkEksikRehberAdimi(oyun.durum, oyun.gorevler, false, oyun.simdi);
      if (yeniIndeks !== rehberAdimIndeks) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRehberAdimIndeks(yeniIndeks);
      }
    }
  }, [oyun.hazir, oyun.durum, oyun.gorevler, oyun.simdi, rehberAcik, rehberAdimIndeks]);

  const rehberKameraHedefleri = rehberAcik && katman === "koy" ? aktifRehberAdimi?.hedefler ?? [] : [];
  const rehberHedefleri =
    rehberAcik && katman === "koy" && aktifRehberAdimi?.bolum === "gorev"
      ? aktifRehberAdimi?.hedefler ?? []
      : [];
  const ilkRehberHedefi = rehberKameraHedefleri[0] ?? null;

  // ---- YAKINLAŞTIRMA: harita kutusunun gerçek boyutu değişir, kaydırma alanı onunla büyür/küçülür ----
  useEffect(() => {
    const el = kaydirRef.current;
    if (!oyun.hazir || !el) return undefined;
    const kap = el.querySelector("[data-harita-kap]");
    const harita = el.querySelector("[data-harita-tuval]");
    if (!kap || !harita) return undefined;
    const k = zoomRef.current;
    let raf = 0;
    let atalet = 0;

    const sinirlar = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const w0 = Math.max(cw, ch * HARITA_ORAN);
      const h0 = w0 / HARITA_ORAN;
      const sigar = Math.min(cw / w0, ch / h0) * 0.94;
      return { w0, enAz: Math.min(1, sigar), enCok: ZOOM_ENCOK };
    };
    const sinirla = (z) => {
      const s = sinirlar();
      return Math.min(s.enCok, Math.max(s.enAz, z));
    };
    k.sinirlar = sinirlar;

    // Haritanın (0-1, 0-1) noktası ekrandaki x,y'de kalacak şekilde boyutu uygula
    const uygula = (z, anc) => {
      const s = sinirlar();
      k.z = z;
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      // Uzaklaştıkça kenar boşlukları küçülür: harita ekrana sığınca etrafta boşluk kalmaz
      const oran = z >= 1 ? 1 : Math.max(0, (z - s.enAz) / (1 - s.enAz));
      kap.style.paddingLeft = kap.style.paddingRight = `${cw * 0.18 * oran}px`;
      kap.style.paddingTop = kap.style.paddingBottom = `${ch * 0.28 * oran}px`;
      kap.style.minWidth = `${s.w0 * z + cw * 0.36 * oran}px`;
      harita.style.width = `${s.w0 * z}px`;
      // Uzaklaştıkça işaretler (düğmeler, etiketler, kilitler) de haritayla birlikte küçülür
      harita.style.setProperty("--isaret-olcek", String(Math.max(0.4, Math.min(1, z))));
      // Düzeni zorla oku, sonra odak noktasını sabitle
      const sol = harita.offsetLeft + anc.u * harita.offsetWidth - anc.x;
      const ust = harita.offsetTop + anc.v * harita.offsetHeight - anc.y;
      el.scrollLeft = sol;
      el.scrollTop = ust;
    };
    const ankaral = (x, y) => {
      const sol = el.scrollLeft + x - harita.offsetLeft;
      const ust = el.scrollTop + y - harita.offsetTop;
      return { x, y, u: sol / harita.offsetWidth, v: ust / harita.offsetHeight };
    };
    const dongu = () => {
      raf = 0;
      const fark = k.hedef - k.z;
      const yeni = Math.abs(fark) < 0.002 ? k.hedef : k.z + fark * 0.3;
      uygula(yeni, k.anc);
      if (yeni !== k.hedef) raf = requestAnimationFrame(dongu);
      else bildir();
    };
    let bildirZaman = 0;
    const bildir = () => {
      clearTimeout(bildirZaman);
      bildirZaman = setTimeout(() => setZoomGosterge(Math.round(k.z * 100)), 120);
    };
    const hedefeGit = (z, x, y) => {
      k.hedef = sinirla(z);
      k.anc = ankaral(x, y);
      if (!raf) raf = requestAnimationFrame(dongu);
    };
    k.hedefeGit = hedefeGit;
    k.tumunuGor = () => {
      const s = sinirlar();
      k.hedef = s.enAz;
      k.anc = { x: el.clientWidth / 2, y: el.clientHeight / 2, u: 0.5, v: 0.5 };
      if (!raf) raf = requestAnimationFrame(dongu);
    };
    k.merkez = (carpan) => hedefeGit(k.hedef * carpan, el.clientWidth / 2, el.clientHeight / 2);

    // Fare tekeri (ve ctrl+tekerlek = dokunmatik yüzey çimdiği): imlecin olduğu yere yakınlaş
    const tekerlek = (e) => {
      const fareTekeri = e.deltaX === 0 && (e.deltaMode === 1 || (Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40));
      if (!e.ctrlKey && !fareTekeri) return; // dokunmatik yüzeyde iki parmak kaydırma normal kayar
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      const carpan = Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015));
      const r = el.getBoundingClientRect();
      hedefeGit(k.hedef * carpan, e.clientX - r.left, e.clientY - r.top);
      bildir();
    };

    // Dokunmatik: tek parmak kaydır (ivmeli), iki parmak çimdik
    let t = null; // { mod: 'kaydir'|'cimdik', ... }
    const mesafe = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const dokunBasla = (e) => {
      cancelAnimationFrame(atalet);
      if (e.touches.length >= 2) {
        const a = e.touches[0];
        const b = e.touches[1];
        const r = el.getBoundingClientRect();
        const mx = (a.clientX + b.clientX) / 2 - r.left;
        const my = (a.clientY + b.clientY) / 2 - r.top;
        k.hedef = k.z;
        t = { mod: "cimdik", d0: Math.max(mesafe(a, b), 1), z0: k.z, anc: ankaral(mx, my) };
        k.tikEngel = performance.now() + 100000;
      } else if (e.touches.length === 1) {
        const a = e.touches[0];
        t = { mod: "kaydir", x: a.clientX, y: a.clientY, sl: el.scrollLeft, st: el.scrollTop, hareket: false, vx: 0, vy: 0, zm: performance.now(), px: a.clientX, py: a.clientY };
      }
    };
    const dokunHareket = (e) => {
      if (!t) return;
      if (t.mod === "cimdik" && e.touches.length >= 2) {
        e.preventDefault();
        const a = e.touches[0];
        const b = e.touches[1];
        const r = el.getBoundingClientRect();
        t.mx = (a.clientX + b.clientX) / 2 - r.left;
        t.my = (a.clientY + b.clientY) / 2 - r.top;
        t.z = sinirla(t.z0 * (mesafe(a, b) / t.d0));
        if (!t.raf) {
          t.raf = requestAnimationFrame(() => {
            t.raf = 0;
            k.hedef = t.z;
            uygula(t.z, { ...t.anc, x: t.mx, y: t.my });
          });
        }
      } else if (t.mod === "kaydir" && e.touches.length === 1) {
        const a = e.touches[0];
        const dx = a.clientX - t.x;
        const dy = a.clientY - t.y;
        if (!t.hareket && Math.hypot(dx, dy) > 8) t.hareket = true;
        if (t.hareket) {
          e.preventDefault();
          el.scrollLeft = t.sl - dx;
          el.scrollTop = t.st - dy;
          const simdi = performance.now();
          const dt = Math.max(simdi - t.zm, 1);
          t.vx = 0.8 * t.vx + 0.2 * ((a.clientX - t.px) / dt);
          t.vy = 0.8 * t.vy + 0.2 * ((a.clientY - t.py) / dt);
          t.px = a.clientX;
          t.py = a.clientY;
          t.zm = simdi;
        }
      }
    };
    const dokunBitir = (e) => {
      if (!t) return;
      const eski = t;
      if (e.touches.length === 0) {
        t = null;
        if (eski.mod === "cimdik") {
          cancelAnimationFrame(eski.raf);
          k.tikEngel = performance.now() + 400;
          bildir();
        } else if (eski.hareket) {
          k.tikEngel = performance.now() + 400;
          let vx = eski.vx;
          let vy = eski.vy;
          if (performance.now() - eski.zm < 80 && Math.hypot(vx, vy) > 0.15) {
            let onceki = performance.now();
            const adim = (simdi) => {
              const dt = Math.min(simdi - onceki, 32);
              onceki = simdi;
              el.scrollLeft -= vx * dt;
              el.scrollTop -= vy * dt;
              vx *= 0.94;
              vy *= 0.94;
              if (Math.hypot(vx, vy) > 0.02) atalet = requestAnimationFrame(adim);
            };
            atalet = requestAnimationFrame(adim);
          }
        } else {
          k.tikEngel = 0;
        }
      } else if (eski.mod === "cimdik") {
        // Bir parmak kalktı: kalan parmakla kaydırmaya geç (çimdik bitişi tıklamayı engeller)
        const a = e.touches[0];
        cancelAnimationFrame(eski.raf);
        k.tikEngel = performance.now() + 400;
        t = { mod: "kaydir", x: a.clientX, y: a.clientY, sl: el.scrollLeft, st: el.scrollTop, hareket: true, vx: 0, vy: 0, zm: performance.now(), px: a.clientX, py: a.clientY };
        bildir();
      }
    };
    const yenidenBoyut = () => {
      const z = sinirla(k.z);
      k.hedef = z;
      uygula(z, ankaral(el.clientWidth / 2, el.clientHeight / 2));
      bildir();
    };

    el.addEventListener("wheel", tekerlek, { passive: false });
    el.addEventListener("touchstart", dokunBasla, { passive: true });
    // Hareket/bitiş belgeden dinlenir: parmak altındaki öğe yeniden çizilip DOM'dan kalksa bile jest sürer
    document.addEventListener("touchmove", dokunHareket, { passive: false });
    document.addEventListener("touchend", dokunBitir);
    document.addEventListener("touchcancel", dokunBitir);
    window.addEventListener("resize", yenidenBoyut);
    // Katman/oyun yenilenince önceki zoom korunur
    if (k.z !== 1) uygula(k.z, ankaral(el.clientWidth / 2, el.clientHeight / 2));
    return () => {
      el.removeEventListener("wheel", tekerlek);
      el.removeEventListener("touchstart", dokunBasla);
      document.removeEventListener("touchmove", dokunHareket);
      document.removeEventListener("touchend", dokunBitir);
      document.removeEventListener("touchcancel", dokunBitir);
      window.removeEventListener("resize", yenidenBoyut);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(atalet);
      clearTimeout(bildirZaman);
    };
  }, [oyun.hazir]);

  // Harita açılışta veya rehber adımı değiştiğinde hedefe yumuşakça yaklaşır
  useEffect(() => {
    const el = kaydirRef.current;
    const haritaEl = el?.querySelector("[data-harita-tuval]");
    if (!el || !haritaEl || !oyun.hazir) return;
    let hedefX = ARSALAR.otag.x;
    let hedefY = ARSALAR.otag.y;
    if (ilkRehberHedefi) {
      const k =
        ilkRehberHedefi.tur === "bina"
          ? ARSALAR[ilkRehberHedefi.id]
          : NOKTALAR[ilkRehberHedefi.id];
      if (k) {
        hedefX = k.x;
        hedefY = k.y;
      }
    }
    const haritaSol = haritaEl.offsetLeft + (hedefX / 100) * haritaEl.clientWidth;
    const haritaUst = haritaEl.offsetTop + (hedefY / 100) * haritaEl.clientHeight;
    const rehberBuyuk = rehberAcik && !rehberKucuk;
    const dikeyOfset = rehberBuyuk ? el.clientHeight * 0.32 : el.clientHeight * 0.5;
    // Kamera haritanın kenarlarını aşmasın: boş zemin yerine her zaman harita görünsün
    const ustBarPayi = 64;
    const enAzSol = haritaEl.offsetLeft;
    const enCokSol = haritaEl.offsetLeft + haritaEl.clientWidth - el.clientWidth;
    const enAzUst = haritaEl.offsetTop - ustBarPayi;
    const enCokUst = haritaEl.offsetTop + haritaEl.clientHeight - el.clientHeight * (rehberBuyuk ? 0.66 : 1);
    const sinirla = (v, a, b) => (b < a ? (a + b) / 2 : Math.min(b, Math.max(a, v)));
    el.scrollTo({
      left: Math.max(0, sinirla(haritaSol - el.clientWidth / 2, enAzSol, enCokSol)),
      top: Math.max(0, sinirla(haritaUst - dikeyOfset, enAzUst, enCokUst)),
      behavior: "smooth",
    });
  }, [oyun.hazir, katman, ilkRehberHedefi, rehberAcik, rehberKucuk]);

  // 2. veya 3. katmana geçildiğinde birlik binaları ve bölge liderlerini çek
  useEffect(() => {
    if (katman === "koy") return;
    let iptal = false;
    fetch("/api/birlik")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!iptal && j) setBirlikOzeti(j);
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, [katman, secim]);

  if (!oyun.hazir) {
    return (
      <main className="fixed inset-0 grid place-items-center bg-stone-950 text-amber-100" style={{ backgroundImage: "var(--orgu)" }}>
        <div className="flex flex-col items-center gap-4">
          <span
            className="block h-14 w-14 animate-spin"
            style={{ background: "var(--yildiz) center / contain no-repeat", animationDuration: "3s" }}
            aria-hidden="true"
          />
          <p className="font-display text-xl font-bold">Köyün hazırlanıyor…</p>
        </div>
      </main>
    );
  }

  const { durum } = oyun;

  const katmanDegistir = (yeniKatman) => {
    if (yeniKatman === "birlik" && durum.level < BIRLIK_ACILIS_LEVEL) {
      oyun.setMesaj({
        tur: "hata",
        metin: `🏕️ Birlik Alanı Level ${BIRLIK_ACILIS_LEVEL}'te açılır!`,
      });
      setSecim({ tur: "birlik", sekme: "birlik" });
      return;
    }
    if (yeniKatman === "harita" && durum.level < ALAN_MUCADELESI_LEVEL) {
      oyun.setMesaj({
        tur: "hata",
        metin: `🗺️ Genel Sancak Haritası Level ${ALAN_MUCADELESI_LEVEL}'da açılır!`,
      });
      setSecim({ tur: "birlik", sekme: "fetih" });
      return;
    }
    setSecim(null);
    setKatman(yeniKatman);
  };

  // Web'de fareyle basılı tutarak haritayı sürükleme
  const fareBas = (e) => {
    if (e.button !== 0) return;
    const el = kaydirRef.current;
    if (!el) return;
    suruklemeRef.current = {
      aktif: true,
      hareketEtti: false,
      basX: e.clientX,
      basY: e.clientY,
      sol: el.scrollLeft,
      ust: el.scrollTop,
    };
  };

  const fareHareket = (e) => {
    const s = suruklemeRef.current;
    const el = kaydirRef.current;
    if (!s.aktif || !el) return;
    const dx = e.clientX - s.basX;
    const dy = e.clientY - s.basY;
    if (!s.hareketEtti && Math.hypot(dx, dy) > 6) {
      s.hareketEtti = true;
      setSurukleniyor(true);
    }
    if (s.hareketEtti) {
      e.preventDefault();
      el.scrollLeft = s.sol - dx;
      el.scrollTop = s.ust - dy;
    }
  };

  const fareBirak = () => {
    if (!suruklemeRef.current.aktif) return;
    suruklemeRef.current.aktif = false;
    setSurukleniyor(false);
  };

  const suruklemeTikEngelle = (e) => {
    if (performance.now() < zoomRef.current.tikEngel) {
      // Çimdik/dokunmatik kaydırma sonrası binalar yanlışlıkla açılmasın
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    if (suruklemeRef.current.hareketEtti) {
      e.stopPropagation();
      e.preventDefault();
      suruklemeRef.current.hareketEtti = false;
    }
  };

  const haritaTikla = (e) => {
    if (suruklemeRef.current.hareketEtti) return;
    if (!duzenle) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (((e.clientX - r.left) / r.width) * 100).toFixed(1);
    const y = (((e.clientY - r.top) / r.height) * 100).toFixed(1);
    setKoordinat({ x, y });
  };

  const bolgeVerileri = birlikOzeti?.bolgeler ?? BOLGELER;
  const birlikBinalari = birlikOzeti?.birlik?.binalar ?? {};
  const tarlaDolumOzeti = oyun.dolum("erzak");
  const arkaPlanHarita =
    katman === "birlik"
      ? "/assets/harita/birlik_alani.webp"
      : katman === "harita"
      ? "/assets/harita/genel_harita.webp"
      : "/assets/harita/koy.webp";

  const mektupBekliyor = !mektupBugunAlindi(durum, oyun.simdi);

  return (
    <main className="fixed inset-0 overflow-hidden bg-stone-950 select-none">
      <div
        ref={kaydirRef}
        onMouseDown={fareBas}
        onMouseMove={fareHareket}
        onMouseUp={fareBirak}
        onMouseLeave={fareBirak}
        onClickCapture={suruklemeTikEngelle}
        className={`absolute inset-0 overflow-auto overscroll-none touch-none ${
          surukleniyor ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div
          data-harita-kap="true"
          className="relative flex items-center justify-center px-[18vw] py-[28dvh]"
          style={{
            minWidth: `calc(max(100vw, calc(100dvh * ${HARITA_ORAN})) + 36vw)`,
            minHeight: "100dvh",
            background:
              "var(--orgu), radial-gradient(circle at center, #1b2946 0%, #111b31 60%, #0d1628 100%)",
          }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(ellipse_at_top,_rgba(214,211,209,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(214,211,209,0.22),_transparent_55%)]" />

          <div
            data-harita-tuval="true"
            className="relative overflow-hidden rounded-[2.75rem] shadow-[0_0_90px_rgba(0,0,0,0.85)] ring-2 ring-amber-500/50 outline outline-4 outline-offset-4 outline-stone-950"
            style={{ width: `max(100vw, calc(100dvh * ${HARITA_ORAN}))`, aspectRatio: "1710 / 920" }}
            onClick={haritaTikla}
          >
            {/* Orijinal Tam Çözünürlüklü Harita Zemini */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={arkaPlanHarita}
              alt="Seyrüsefer Haritası"
              draggable={false}
              className="pointer-events-none block h-full w-full object-cover select-none"
            />

            {/* Akan Göksu Nehri (GLSL Shader), Salınan Ağaçlar ve 2 Yavaş Köylü (Y-Derinlik Sıralamalı) */}
            {katman === "koy" && <TarlaUrunleri evre={oyun.dolum("erzak")?.evre} />}
            <CanliKoySahnesi
              katman={katman}
              insanSayisi={durum.envanter?.insan ?? 5}
              aktif={!secim}
            />

            {/* Harita Kenarları Yumuşak Sis Geçişi */}
            <div
              className="pointer-events-none absolute inset-0 z-[190]"
              style={{
                boxShadow: "inset 0 0 65px 28px rgba(13, 22, 40, 0.78)",
              }}
            />

            {/* ================= 1. KATMAN: KENDİ KÖYÜM ================= */}
            {katman === "koy" && (
              <>
                {/* Köy Binaları (Y-Derinliği: zIndex = Math.round(a.y * 2) -> Köylüler arkadan/önden doğru geçer) */}
                {Object.entries(ARSALAR).map(([id, a]) => {
                  const seviye = durum.binalar[id] ?? 0;
                  const bilgi = oyun.binaBilgisi(id);
                  const bildirimSayisi = binaBildirimSayisi(id, oyun);
                  const rehberVurgulu = rehberHedefleri.some((h) => h.tur === "bina" && h.id === id);
                  const kameraOdakli = rehberKameraHedefleri.some((h) => h.tur === "bina" && h.id === id);
                  return seviye > 0 ? (
                    <button
                      key={id}
                      type="button"
                      aria-label={BINALAR[id].ad}
                      onClick={() => setSecim({ tur: "bina", id })}
                      className="group absolute transition-transform duration-200 hover:scale-[1.04]"
                      style={{
                        left: `${a.x}%`,
                        top: `${a.y}%`,
                        width: `${a.genislik}%`,
                        transform: "translate(-50%, -78%)",
                        zIndex: rehberVurgulu || kameraOdakli ? 240 : Math.round(a.y * 2),
                      }}
                    >
                      {rehberVurgulu && (
                        <span className="harita-etiket pointer-events-none absolute -top-9 left-1/2 z-30 -translate-x-1/2 animate-bounce whitespace-nowrap rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-stone-950 shadow-xl ring-2 ring-white">
                          👇 Buraya Tıkla!
                        </span>
                      )}
                      {bildirimSayisi > 0 && (
                        <span
                          title={`${bildirimSayisi} yapılacak görev`}
                          className="harita-etiket pointer-events-none absolute top-1 right-1 z-30 grid h-6 min-w-6 place-items-center rounded-full bg-red-600 px-1.5 text-xs font-black text-white shadow-[0_4px_12px_rgba(220,38,38,0.85)] ring-2 ring-white"
                        >
                          {bildirimSayisi}
                        </span>
                      )}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={BINALAR[id].gorsel(seviye)}
                        alt={BINALAR[id].ad}
                        draggable={false}
                        className={`block h-auto w-full drop-shadow-[0_10px_10px_rgba(0,0,0,0.45)] select-none ${
                          rehberVurgulu || kameraOdakli ? "brightness-110" : ""
                        }`}
                      />
                      <span className="harita-etiket absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-stone-900/92 px-2.5 py-0.5 text-[11px] font-bold text-amber-100 shadow-md ring-1 ring-amber-500/60 transition-transform duration-150 group-hover:scale-105 group-hover:ring-amber-300">
                        {BINALAR[id].ad} · {BINALAR[id].konut ? `${seviye}. Kat` : `Lv.${seviye}`}
                        {bilgi.yapilabilir && <span className="ml-1 text-emerald-300">▲</span>}
                      </span>
                    </button>
                  ) : (
                    <BosArsa
                      key={id}
                      id={id}
                      a={a}
                      bilgi={bilgi}
                      bildirimSayisi={bildirimSayisi}
                      rehberVurgulu={rehberVurgulu}
                      kameraOdakli={kameraOdakli}
                      onClick={() => setSecim({ tur: "bina", id })}
                    />
                  );
                })}

                {/* Sabit Noktalar: Pano, Tarla, Orman, Taş Ocağı ve Atlı Haberci Görseli */}
                {Object.entries(NOKTALAR).map(([id, n]) => {
                  const acik = n.kaynak ? kaynakAcikMi(n.kaynak, durum.level) : (n.acilisLevel ?? 1) <= durum.level;
                  const dBilgi = n.kaynak ? oyun.dolum(n.kaynak) : null;
                  const bekleyen = dBilgi?.biriken ?? 0;
                  const dolumOrani = dBilgi?.dolumOrani ?? 0;
                  const kapasite = dBilgi?.kapasite ?? 24;
                  const dolu = n.kaynak && acik && bekleyen >= kapasite;
                  const uretimUnlem = Boolean(n.kaynak && acik && (dBilgi?.hazirAdet ?? 0) > 0);
                  const noktaSayi = noktaGorevSayisi(id, oyun);
                  const rehberVurgulu = rehberHedefleri.some((h) => h.tur === "nokta" && h.id === id);
                  const kameraOdakli = rehberKameraHedefleri.some((h) => h.tur === "nokta" && h.id === id);

                  // Haberci: taş kaideden arındırılmış kendi atlı haberci görseli (seyyaherkek.webp)
                  if (id === "haberci") {
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-label={n.ad}
                        onClick={() => setSecim({ tur: "nokta", id })}
                        className="harita-isaret group absolute flex flex-col items-center transition-transform duration-200 hover:-translate-y-1 hover:scale-105"
                        style={{
                          left: `${n.x}%`,
                          top: `${n.y}%`,
                          width: "5.2%",
                          minWidth: "62px",
                          transform: "translate(-50%, -84%)",
                          zIndex: rehberVurgulu || kameraOdakli ? 245 : Math.round(n.y * 2),
                        }}
                      >
                        {rehberVurgulu ? (
                          <span className="mb-1 animate-bounce whitespace-nowrap rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-stone-950 shadow-xl ring-2 ring-white">
                            👇 Buraya Tıkla!
                          </span>
                        ) : (
                          mektupBekliyor && (
                            <span className="mb-0.5 whitespace-nowrap rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black text-stone-950 shadow-lg ring-1 ring-white">
                              ✉️ Mektup Var
                            </span>
                          )
                        )}
                        <div className="relative w-full">
                          {noktaSayi > 0 && (
                            <span
                              title={`${noktaSayi} yapılacak görev`}
                              className="pointer-events-none absolute -top-1 -right-1 z-30 grid h-6 min-w-6 place-items-center rounded-full bg-red-600 px-1.5 text-xs font-black text-white shadow-[0_4px_12px_rgba(220,38,38,0.85)] ring-2 ring-white"
                            >
                              {noktaSayi}
                            </span>
                          )}
                          {/* Toynak altı doğal toprak gölgesi */}
                          <span className="pointer-events-none absolute bottom-1 left-1/2 h-3.5 w-4/5 -translate-x-1/2 rounded-full bg-stone-950/45 blur-[2px]" />
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={n.gorsel || "/assets/binalar/seyyaherkek.webp"}
                            alt="Köy Habercisi"
                            draggable={false}
                            style={{
                              animation: "haberciNefes 3.4s ease-in-out infinite",
                              transformOrigin: "50% 92%",
                            }}
                            className="relative z-10 block h-auto w-full drop-shadow-[0_6px_8px_rgba(0,0,0,0.45)] select-none"
                          />
                        </div>
                        <span className="-mt-0.5 whitespace-nowrap rounded-full bg-stone-900/95 px-2.5 py-0.5 text-[11px] font-black text-amber-100 shadow ring-1 ring-amber-500/60">
                          {n.ad}
                        </span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={id}
                      type="button"
                      aria-label={n.ad}
                      onClick={() => setSecim({ tur: "nokta", id })}
                      className="harita-isaret group absolute flex flex-col items-center transition-transform duration-150 hover:-translate-y-1"
                      style={{
                        left: `${n.x}%`,
                        top: `${n.y}%`,
                        transform: "translate(-50%, -50%)",
                        zIndex: rehberVurgulu || kameraOdakli ? 245 : Math.round(n.y * 2) + 8,
                      }}
                    >
                      {rehberVurgulu && (
                        <span className="mb-1 animate-bounce whitespace-nowrap rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-stone-950 shadow-xl ring-2 ring-white">
                          👇 Buraya Tıkla!
                        </span>
                      )}

                      {n.kaynak && acik && (
                        <div className="mb-1 flex flex-col items-center rounded-xl bg-stone-950/95 px-2.5 py-1 shadow-lg ring-1 ring-amber-400/50">
                          <span
                            className={`text-[10px] font-black tabular-nums ${
                              dolu
                                ? "text-emerald-300"
                                : bekleyen > 0
                                ? "text-amber-200"
                                : "text-stone-400"
                            }`}
                          >
                            {n.kaynak === "erzak"
                              ? `${KAYNAKLAR.erzak.ikon} ${dBilgi?.hazirAdet ?? 0}/${dBilgi?.toplamAdet ?? 3} Parsel`
                              : n.kaynak === "kereste"
                              ? `🧭 ${dBilgi?.hazirAdet ?? 0}/${dBilgi?.toplamAdet ?? 2} Sefer`
                              : `${KAYNAKLAR.tas.ikon} ${dBilgi?.hazirAdet ?? 0}/${dBilgi?.toplamAdet ?? 6} Kaya`}
                          </span>
                          <div className="mt-0.5 h-1.5 w-16 overflow-hidden rounded-full bg-stone-800">
                            <div
                              className={`h-full transition-all ${
                                dolu ? "bg-emerald-400" : bekleyen > 0 ? "bg-amber-400" : "bg-stone-600"
                              }`}
                              style={{ width: `${dolumOrani}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {id === "pano" && oyun.levelAtlanabilir && (
                        <span className="mb-1 animate-bounce rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-black text-white">
                          Level Atla!
                        </span>
                      )}

                      {false ? (
                        <div className="relative">
                          {uretimUnlem && (
                            <span
                              title="Hasat edilmeye hazır mahsul var!"
                              className="pointer-events-none absolute -top-2 -right-2 z-30 grid h-6 w-6 place-items-center rounded-full bg-red-600 text-xs font-black text-white shadow-[0_4px_12px_rgba(220,38,38,0.85)] ring-2 ring-white"
                            >
                              !
                            </span>
                          )}
                          <div
                            className={`relative h-16 w-24 overflow-hidden rounded-2xl shadow-xl ring-2 transition-transform duration-150 group-hover:scale-105 sm:h-20 sm:w-28 ${
                              rehberVurgulu || kameraOdakli ? "ring-4 ring-amber-300" : "ring-amber-400/70"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src="/assets/binalar/tarla_bos.webp"
                              alt="Tarla"
                              draggable={false}
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute right-1 bottom-1 rounded bg-stone-950/90 px-1.5 py-0.5 text-[9px] font-black text-amber-200">
                              {dBilgi?.evre === "dolu"
                                ? "🌾 Tam Dolu"
                                : dBilgi?.evre === "yari"
                                ? "🌱 Yeşeriyor"
                                : "🟫 Boş"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          {(uretimUnlem || noktaSayi > 0) && (
                            <span
                              title={uretimUnlem ? "Üretim alanında işlem hazır!" : `${noktaSayi} yapılacak görev`}
                              className="pointer-events-none absolute -top-2 -right-2 z-30 grid h-6 min-w-6 place-items-center rounded-full bg-red-600 px-1.5 text-xs font-black text-white shadow-[0_4px_12px_rgba(220,38,38,0.85)] ring-2 ring-white"
                            >
                              {uretimUnlem ? "!" : noktaSayi}
                            </span>
                          )}
                          <span
                            className={`grid h-11 w-11 place-items-center rounded-2xl text-xl shadow-[0_8px_12px_rgba(0,0,0,0.55)] ring-2 transition-transform duration-150 group-hover:scale-110 sm:h-12 sm:w-12 sm:text-2xl ${
                              rehberVurgulu || kameraOdakli
                                ? "scale-125 bg-amber-400 text-stone-950 ring-4 ring-white"
                                : acik
                                ? "bg-stone-900/90 ring-amber-400 group-hover:bg-stone-800"
                                : "bg-stone-700/80 ring-stone-500 grayscale"
                            }`}
                          >
                            {acik ? n.ikon : "🔒"}
                          </span>
                        </div>
                      )}

                      <span className="mt-1 rounded-full bg-stone-900/95 px-2.5 py-0.5 text-[11px] font-black text-amber-100 shadow ring-1 ring-amber-500/50">
                        {n.ad}
                      </span>
                    </button>
                  );
                })}
              </>
            )}

            {/* ================= 2. KATMAN: BİRLİK ALANI (KÜLLİYE) ================= */}
            {katman === "birlik" && (
              <>
                {Object.entries(BIRLIK_BINALARI).map(([id, b]) => {
                  const seviye = birlikBinalari[id] ?? 1;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-label={b.ad}
                      onClick={() => setSecim({ tur: "birlikBina", id })}
                      className="group absolute transition-transform duration-200 hover:scale-105"
                      style={{
                        left: `${b.x}%`,
                        top: `${b.y}%`,
                        width: `${b.genislik}%`,
                        transform: "translate(-50%, -65%)",
                        zIndex: Math.round(b.y * 2),
                      }}
                    >
                      {b.gorsel ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={b.gorsel(seviye)}
                          alt={b.ad}
                          draggable={false}
                          className="block h-auto w-full drop-shadow-[0_10px_12px_rgba(0,0,0,0.5)] select-none"
                        />
                      ) : (
                        // Dış görseli henüz olmayan bina: arsada tezhipli bir mühür
                        <span className="harita-isaret mx-auto grid aspect-square w-3/4 place-items-center rounded-full bg-stone-900/90 text-3xl shadow-xl ring-2 ring-amber-400/80">
                          {b.ikon ?? "🏛️"}
                        </span>
                      )}
                      <span className="harita-etiket absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-stone-900/95 px-2.5 py-0.5 text-xs font-black text-amber-100 shadow-lg ring-1 ring-amber-400/70 transition-transform duration-150 group-hover:scale-105">
                        {b.ad} · Lv.{seviye}
                      </span>
                    </button>
                  );
                })}

                {/* Birlik Meydanı: Ulu Çınar altında herkese açık Çınar Altı sohbeti */}
                <button
                  type="button"
                  aria-label="Birlik Meydanı · Çınar Altı"
                  onClick={() => setSecim({ tur: "cinarAlti", id: "cinar" })}
                  className="group absolute -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-105"
                  style={{ left: `${BIRLIK_MEYDANI_CINAR.x}%`, top: `${BIRLIK_MEYDANI_CINAR.y}%`, zIndex: 205 }}
                >
                  <span className="harita-isaret flex flex-col items-center gap-0.5 rounded-2xl bg-emerald-700/90 px-3 py-1.5 text-emerald-50 shadow-xl ring-2 ring-amber-300/80">
                    <span className="text-xl" aria-hidden="true">🌳</span>
                    <span className="whitespace-nowrap text-[11px] font-black">Çınar Altı Sohbeti</span>
                  </span>
                </button>

                <div className="pointer-events-none absolute bottom-4 left-1/2 z-[210] -translate-x-1/2 rounded-2xl bg-stone-950/90 px-4 py-2 text-center text-xs text-amber-100 shadow-xl ring-1 ring-amber-500/50">
                  {birlikOzeti?.birlik ? (
                    <span>
                      🚩 <b>{birlikOzeti.birlik.ad}</b> Külliyesi · 🕌 Bugün{" "}
                      <b>{birlikOzeti.birlik.namazToplam ?? 0}</b> vakit namaz · ⚡ Disiplin{" "}
                      <b>%{birlikOzeti.birlik.disiplinOrani}</b>
                    </span>
                  ) : (
                    <span>
                      🏕️ Bir birliğe katılmak veya yeni birlik kurmak için ortadaki{" "}
                      <b>Birlik Otağı</b>&apos;na tıkla!
                    </span>
                  )}
                </div>
              </>
            )}

            {/* ================= 3. KATMAN: GENEL SANCAK HARİTASI ================= */}
            {katman === "harita" && (
              <>
                {bolgeVerileri.map((b) => {
                  const koordinatBilgisi = BOLGELER.find((x) => x.id === b.id) ?? b;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSecim({ tur: "bolge", id: b.id })}
                      className="harita-isaret group absolute flex flex-col items-center"
                      style={{
                        left: `${koordinatBilgisi.x}%`,
                        top: `${koordinatBilgisi.y}%`,
                        transform: "translate(-50%, -50%)",
                        zIndex: 210,
                      }}
                    >
                      {b.lider ? (
                        <span
                          className="mb-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-black text-white shadow-lg ring-1 ring-white/50"
                          style={{ backgroundColor: b.lider.renk }}
                        >
                          🚩 {b.lider.ad} ({b.lider.guc})
                        </span>
                      ) : (
                        <span className="mb-1 whitespace-nowrap rounded-full bg-stone-900/90 px-2 py-0.5 text-[10px] font-bold text-amber-200 ring-1 ring-amber-500/40">
                          ⚔️ Sahipsiz Sancak
                        </span>
                      )}

                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-900/90 text-2xl shadow-xl ring-2 ring-amber-400 transition-transform group-hover:scale-110">
                        {b.ikon}
                      </span>
                      <span className="mt-1 whitespace-nowrap rounded-lg bg-stone-950/90 px-2.5 py-0.5 text-xs font-black text-amber-100 shadow ring-1 ring-amber-500/50">
                        {b.ad}
                      </span>
                    </button>
                  );
                })}

                <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-2xl bg-stone-950/90 px-4 py-2 text-center text-xs text-amber-100 shadow-xl ring-1 ring-amber-500/50">
                  🗺️ <b>Genel Sancak Haritası:</b> Bir bölgeye tıklayarak birlik kasasındaki kaynaklar ve manevi disiplin gücünüzle hamle yapın!
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <UstBar
        oyun={oyun}
        katman={katman}
        onKatmanSec={katmanDegistir}
        onLevelTikla={() => setSecim({ tur: "nokta", id: "pano" })}
        rehberAcik={rehberAcik}
        onRehberAcKapat={() => {
          if (!rehberAcik) {
            setRehberAdimIndeks(ilkEksikRehberAdimi(durum, oyun.gorevler, false, oyun.simdi));
            setKatman("koy");
            setRehberAcik(true);
          } else {
            setRehberAcik(false);
          }
        }}
      />

      {!secim && katman === "koy" && (
        <RehberKarakter
          acik={rehberAcik}
          adimIndeks={rehberAdimIndeks}
          setAdimIndeks={setRehberAdimIndeks}
          onKapat={() => setRehberAcik(false)}
          onHedefSec={(hedef) => {
            if (hedef) setSecim({ tur: hedef.tur, id: hedef.id });
          }}
          durum={durum}
          gorevler={oyun.gorevler}
          simdi={oyun.simdi}
          onGorunenHedefler={setRehberGorunenHedefler}
          onKucukDegisti={setRehberKucuk}
        />
      )}

      <div
        className="fixed right-2 bottom-2 z-[240] flex flex-col items-end gap-1.5 sm:right-3 sm:bottom-3"
        role="group"
        aria-label="Harita yakınlaştırma"
      >
        <button
          type="button"
          onClick={() => zoomRef.current.merkez?.(1.35)}
          disabled={zoomGosterge >= ZOOM_ENCOK * 100 - 1}
          aria-label="Haritayı yakınlaştır"
          className="ust-levha grid h-11 w-11 place-items-center rounded-2xl text-2xl leading-none font-black text-amber-100 disabled:opacity-40"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomRef.current.merkez?.(1 / 1.35)}
          aria-label="Haritayı uzaklaştır"
          className="ust-levha grid h-11 w-11 place-items-center rounded-2xl text-2xl leading-none font-black text-amber-100"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => zoomRef.current.tumunuGor?.()}
          aria-label="Tüm haritayı gör"
          className="ust-levha flex h-11 min-w-11 items-center justify-center rounded-2xl px-3 text-xs font-black text-amber-100 kisa:px-0! kisa:text-xl"
        >
          <span className="kisa:hidden">Tümünü gör</span>
          <span aria-hidden="true" className="hidden kisa:inline">⤢</span>
        </button>
      </div>

      {oyun.mesaj && (
        <div
          key={oyun.mesaj.metin}
          role="status"
          className={`levha-ac fixed top-[6.75rem] left-1/2 z-[450] sm:top-[4.5rem] flex max-w-[92vw] -translate-x-1/2 items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold shadow-[0_12px_30px_rgba(0,0,0,0.5)] ring-1 ${
            oyun.mesaj.tur === "hata"
              ? "bg-red-700 text-white ring-red-400/60"
              : oyun.mesaj.tur === "bilgi"
              ? "bg-stone-900 text-amber-100 ring-amber-400/70"
              : "bg-emerald-700 text-white ring-emerald-300/60"
          }`}
        >
          <span aria-hidden="true">{oyun.mesaj.tur === "hata" ? "⚠️" : oyun.mesaj.tur === "bilgi" ? "📜" : "✨"}</span>
          <span>{oyun.mesaj.metin}</span>
        </div>
      )}

      <Kutlama oyun={oyun} />

      {secim && (
        <Panel
          secim={secim}
          oyun={oyun}
          onSecimDegistir={setSecim}
          kapat={() => {
            setSecim(null);
            if (rehberAcik) {
              setRehberAdimIndeks(ilkEksikRehberAdimi(oyun.durum, oyun.gorevler, false, oyun.simdi));
            }
          }}
        />
      )}

      {oyun.gelistirici && (
        <GelistiriciPaneli
          oyun={oyun}
          duzenle={duzenle}
          setDuzenle={setDuzenle}
          onSifirlandi={() => {
            setSecim(null);
            setKatman("koy");
            setRehberAcik(true);
            setRehberAdimIndeks(0);
          }}
        />
      )}

      {duzenle && koordinat && (
        <div className="fixed bottom-4 left-1/2 z-[300] -translate-x-1/2 rounded-lg bg-black/85 px-4 py-2 font-mono text-sm text-lime-300">
          x: {koordinat.x}% · y: {koordinat.y}%
        </div>
      )}
    </main>
  );
}

function BosArsa({ id, a, bilgi, bildirimSayisi = 0, rehberVurgulu = false, kameraOdakli = false, onClick }) {
  const meydanMi = id === "sosyalmeydan";
  const insaEdilebilir = bilgi.levelYeterli || meydanMi;
  return (
    <button
      type="button"
      onClick={onClick}
      className="harita-isaret group absolute flex flex-col items-center transition-transform duration-200 hover:-translate-y-1 hover:scale-110"
      style={{
        left: `${a.x}%`,
        top: `${a.y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: rehberVurgulu || kameraOdakli ? 245 : Math.round(a.y * 2),
      }}
    >
      {rehberVurgulu && (
        <span className="mb-1.5 animate-bounce whitespace-nowrap rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-stone-950 shadow-xl ring-2 ring-white">
          👇 Buraya Tıkla!
        </span>
      )}
      <div className="relative">
        {bildirimSayisi > 0 && (
          <span
            title={meydanMi ? `${bildirimSayisi} yapılacak görev` : "İnşa edilmeye hazır!"}
            className="pointer-events-none absolute -top-2 -right-2 z-30 grid h-6 min-w-6 place-items-center rounded-full bg-red-600 px-1.5 text-xs font-black text-white shadow-[0_4px_12px_rgba(220,38,38,0.85)] ring-2 ring-white"
          >
            {bildirimSayisi}
          </span>
        )}
        <span
          className={`grid h-10 w-10 place-items-center rounded-full text-lg shadow-lg ring-2 ${
            rehberVurgulu || kameraOdakli
              ? "scale-125 bg-emerald-500 ring-4 ring-amber-300"
              : bilgi.yapilabilir
              ? "animate-pulse bg-emerald-600 ring-emerald-200"
              : meydanMi
              ? "bg-stone-900/90 ring-amber-400 group-hover:bg-stone-800"
              : insaEdilebilir
              ? "bg-amber-600/90 ring-amber-200"
              : "bg-stone-800/70 ring-stone-400"
          }`}
        >
          {meydanMi ? "⚖️" : insaEdilebilir ? "🔨" : "🔒"}
        </span>
      </div>
      <span className="mt-0.5 whitespace-nowrap rounded bg-stone-900/90 px-2 py-0.5 text-[10px] font-bold text-amber-100 ring-1 ring-amber-500/40">
        {BINALAR[id].ad}
        {!insaEdilebilir && ` · Lv.${bilgi.gerekenLevel}`}
      </span>
    </button>
  );
}

// =============================================================
// TARLA ÜRÜNLERİ — haritadaki çizili tarlanın üstüne, tarlanın kendi izometrik açısıyla
// filiz (yarı) ya da başak (dolu) çizer. Boşken çizimdeki sürülmüş toprak görünür.
// SVG, harita resmiyle aynı viewBox (1376x768) ve aynı "cover" kırpmasını kullanır.
// =============================================================
const TARLA_KOSELERI = { ust: [200, 354], sag: [316, 420], alt: [150, 526], sol: [22, 452] };

function tarlaNoktasi(u, v) {
  const { ust, sag, alt, sol } = TARLA_KOSELERI;
  const x = (1 - u) * (1 - v) * ust[0] + u * (1 - v) * sag[0] + u * v * alt[0] + (1 - u) * v * sol[0];
  const y = (1 - u) * (1 - v) * ust[1] + u * (1 - v) * sag[1] + u * v * alt[1] + (1 - u) * v * sol[1];
  return [x, y];
}

// Sabit dizilim: her çizimde aynı (sözde rastgele) kaymalar
const TARLA_BITKILERI = (() => {
  const liste = [];
  let t = 7;
  const r = () => ((t = (t * 9301 + 49297) % 233280) / 233280);
  const SIRA = 16;
  const SUTUN = 22;
  for (let i = 0; i < SIRA; i++) {
    const v = 0.06 + (i / (SIRA - 1)) * 0.88;
    if (v > 0.46 && v < 0.54) continue; // ortadaki sulama arkı
    for (let j = 0; j < SUTUN; j++) {
      const u = 0.05 + (j / (SUTUN - 1)) * 0.9 + (r() - 0.5) * 0.02;
      if (u > 0.455 && u < 0.53) continue; // çapraz sulama arkı
      const [x, y] = tarlaNoktasi(u, v);
      liste.push({ x, y, b: 1.05 + r() * 0.35, e: (r() - 0.5) * 0.6 });
    }
  }
  return liste.sort((a, b) => a.y - b.y);
})();

function TarlaUrunleri({ evre }) {
  if (evre !== "yari" && evre !== "dolu") return null;
  const dolu = evre === "dolu";
  return (
    <svg
      viewBox="0 0 1376 768"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 7 }}
    >
      <g className={dolu ? "tarla-basak" : undefined}>
        {TARLA_BITKILERI.map((p, i) =>
          dolu ? (
            <g key={i} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${p.b.toFixed(2)})`}>
              <path d={`M0 0 Q${p.e} -6 ${p.e * 2} -11`} stroke="#6b4a12" strokeWidth="1.1" fill="none" />
              <ellipse cx={p.e * 2} cy="-12.5" rx="1.9" ry="3.6" fill="#e7b93b" stroke="#6b4a12" strokeWidth="0.7" />
              <path d={`M-0.3 -4 q-2.4 -1 -3.4 -3.2 M0.3 -5 q2.4 -1 3.2 -3.4`} stroke="#a77d1d" strokeWidth="0.8" fill="none" />
            </g>
          ) : (
            <g key={i} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${p.b.toFixed(2)})`}>
              <path d="M0 0 Q-1.6 -3 -3.6 -4.6 M0 0 Q1.4 -3.6 3.8 -5.4 M0 0 L0.2 -3.4" stroke="#2f5b1e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <path d="M0 0 Q-1.6 -3 -3.6 -4.6 M0 0 Q1.4 -3.6 3.8 -5.4" stroke="#7cc04a" strokeWidth="0.8" fill="none" strokeLinecap="round" />
            </g>
          )
        )}
      </g>
    </svg>
  );
}
