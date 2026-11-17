// =============================================================
// SEYRÜSEFER — DENGE VE KURGU TESTİ
// Çalıştırma:  npm run denge
// Gerçek oyun kurallarını (src/lib/oyun) kullanarak bir öğrencinin 10 leveli
// baştan sona oynayışını gün gün canlandırır. Bir levelda tıkanma olursa
// veya toplam süre hedefin (≈11 hafta) çok dışına çıkarsa hata verir.
// Bedelleri / görevleri değiştirdikten sonra mutlaka çalıştırın.
// =============================================================
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Uzantısız göreli importları (./sabitler gibi) Node'un çözebilmesi için küçük yükleyici
register(
  "data:text/javascript," +
    encodeURIComponent(`
      export async function resolve(s, c, n) {
        if (s.startsWith(".") && !/\\.[a-z]+$/.test(s)) { try { return await n(s + ".js", c); } catch {} }
        return n(s, c);
      }`),
  pathToFileURL("./")
);

const kok = new URL("../src/lib/oyun/", import.meta.url);
const E = await import(new URL("eylemler.js", kok));
const K = await import(new URL("kurallar.js", kok));
const S = await import(new URL("sabitler.js", kok));
const G = await import(new URL("gorevler.js", kok));
const H = await import(new URL("hikayeler.js", kok));

const SAAT = 3600_000;
const GUN = 24 * SAAT;

function oyna({ devamsizlik = 7, isciKullan = true, tohum = 1, sessiz = true } = {}) {
  // Tekrarlanabilir rastgelelik
  let t = tohum;
  Math.random = () => ((t = (t * 1664525 + 1013904223) >>> 0) / 2 ** 32);

  let simdi = Date.UTC(2026, 8, 14, 14, 0, 0); // TSİ 17.00, okul çıkışı
  let d = E.baslangicDurumu(simdi);
  const dene = (sonuc) => {
    if (sonuc && !sonuc.hata && sonuc.durum) {
      d = sonuc.durum;
      return true;
    }
    return false;
  };
  const levelGunleri = {};
  const kayit = [];
  let gun = 0;
  let levelBaslangic = 0;

  while (gun < 400) {
    gun++;
    simdi += GUN + ((gun % 3) - 1) * SAAT; // her gün biraz farklı saatte girer
    if (devamsizlik && gun % devamsizlik === 0) continue; // o gün oyuna girmedi

    // --- 1) Üretim: hazır her şeyi topla
    dene(E.sahaHepsiniTopla(d, "erzak", simdi));
    dene(E.sahaHepsiniTopla(d, "tas", simdi));
    for (let b = 0; b < 12; b++) {
      const sefer = K.ormanSeferBilgisi(d, simdi);
      if (sefer.aktifBolge >= 0) dene(E.ormanAgacKes(d, simdi));
      if (K.ormanSeferBilgisi(d, simdi).kalanSefer <= 0) break;
      dene(E.ormanKesifYap(d, b, simdi));
    }
    if (K.ormanSeferBilgisi(d, simdi).aktifBolge >= 0) dene(E.ormanAgacKes(d, simdi));

    // --- 2) İşçi: boşta insan varsa en az işçili açık sahaya ver
    if (isciKullan) {
      for (let i = 0; i < 4; i++) {
        const acik = ["erzak", "kereste", "tas"].filter((k) => K.kaynakAcikMi(k, d.level));
        acik.sort((a, b) => (d.isciler[a] ?? 0) - (d.isciler[b] ?? 0));
        if (!dene(E.isciAta(d, acik[0], 1, simdi))) break;
      }
    } else if (K.kaynakAcikMi("tas", d.level) && (d.isciler.tas ?? 0) === 0) {
      dene(E.isciAta(d, "tas", 1, simdi));
    }

    for (let tur = 0; tur < 3; tur++) {
      // --- 3) Görevler
      for (const g of G.levelGorevListesi(d.level, d.gorevIlerlemesi, false, simdi)) {
        if (g.tamam) continue;
        if (g.tur === "namaz") {
          for (const v of G.NAMAZ_VAKITLERI) dene(E.namazGuncelle(d, v.kod, true, simdi));
        } else if (g.tur === "sinav") {
          dene(E.sinavDegerlendir(d, G.levelIcerigi(d.level).sinav.map((s) => s.dogru), simdi));
        } else if (g.tur === "dava") {
          const dava = H.koyDavalariListesi().find((x) => !d.cozulenDavalar.includes(x.id));
          if (dava) {
            const enIyi = dava.secenekler.reduce((e, s, i, a) => (s.mutluluk > a[e].mutluluk ? i : e), 0);
            dene(E.davaCoz(d, dava.id, enIyi, simdi));
          }
        } else if (g.tur === "meydan_paylasim" || g.tur === "meydan_yorum") {
          if ((d.binalar.sosyalmeydan ?? 0) >= 1) {
            for (let i = g.yapilan; i < g.hedef; i++) dene(E.gorevIlerlet(d, g.kod, simdi));
          }
        } else {
          if (g.tur === "aile") dene(E.mektupTeslimAl(d, simdi));
          dene(E.gorevIlerlet(d, g.kod, simdi, null, true));
        }
      }

      // --- 4) Nüfus: yolcu davet et, yer yoksa ev kur
      const hedefNufus = Math.max(
        0,
        ...Object.keys(K.levelDurumu(d.level, d.binalar).hedefler.reduce((o, h) => ({ ...o, [h.binaId]: 1 }), {})).map(
          (id) => E.gorevKontrol(d) && K.binaDurumu(id, E.gorevKontrol(d)).nufusSarti || 0
        )
      );
      if (d.envanter.insan < hedefNufus + 2) {
        if (S.toplamKonutKapasitesi(d.binalar) <= d.envanter.insan) {
          for (const ev of S.EV_IDLERI) if (dene(E.yukselt(d, ev))) break;
        }
        dene(E.gocmenTeklifEt(d, simdi, false));
        dene(E.gocmenTeklifEt(d, simdi, true));
      }

      // --- 5) Level hedef binaları
      for (const h of K.levelDurumu(d.level, d.binalar).hedefler) {
        if (!h.tamam) dene(E.yukselt(d, h.binaId));
      }

      // --- 6) Level atla
      if (E.levelAtlanabilirMi(d)) {
        levelGunleri[d.level] = gun - levelBaslangic;
        levelBaslangic = gun;
        dene(E.levelAtla(d, simdi));
      }
    }

    const son = d.level === S.LEVELLAR.length;
    const l = K.levelDurumu(d.level, d.binalar);
    if (son && l.binalarTamam && G.tumLevelGorevleriTamamMi(d.level, d.gorevIlerlemesi)) {
      levelGunleri[d.level] = gun - levelBaslangic;
      break;
    }
    if (!sessiz) kayit.push(`gün ${gun}: Lv${d.level} ${JSON.stringify(d.envanter)} işçi ${JSON.stringify(d.isciler)}`);
    if (gun - levelBaslangic > 60) {
      const eksik = G.levelGorevListesi(d.level, d.gorevIlerlemesi, false, simdi).filter((g) => !g.tamam).map((g) => g.kod);
      return { tikandi: true, level: d.level, gun, eksikGorev: eksik, hedefler: l.hedefler, envanter: d.envanter, levelGunleri };
    }
  }
  return { tikandi: false, toplamGun: gun, levelGunleri, envanter: d.envanter, isciler: d.isciler, kayit };
}

const senaryolar = [
  { ad: "Düzenli öğrenci (haftada 1 gün girmiyor, işçi görevlendiriyor)", ayar: { devamsizlik: 7, isciKullan: true }, enAz: 55, enCok: 95 },
  { ad: "Her gün giren öğrenci", ayar: { devamsizlik: 0, isciKullan: true }, enAz: 50, enCok: 85 },
  { ad: "İşçi görevlendirmeyi hiç keşfetmeyen öğrenci", ayar: { devamsizlik: 7, isciKullan: false }, enAz: 55, enCok: 135 },
  { ad: "3 günde 1 girmeyen öğrenci", ayar: { devamsizlik: 3, isciKullan: true }, enAz: 60, enCok: 150 },
];

let hata = false;
for (const s of senaryolar) {
  const sonuclar = [1, 7, 42].map((tohum) => oyna({ ...s.ayar, tohum }));
  console.log(`\n■ ${s.ad}`);
  for (const r of sonuclar) {
    if (r.tikandi) {
      hata = true;
      console.log(`  ✗ TIKANDI → Level ${r.level}, gün ${r.gun}. Eksik görev: ${r.eksikGorev.join(", ") || "-"} | hedefler: ${JSON.stringify(r.hedefler)} | envanter: ${JSON.stringify(r.envanter)}`);
      continue;
    }
    const uygun = r.toplamGun >= s.enAz && r.toplamGun <= s.enCok;
    if (!uygun) hata = true;
    console.log(
      `  ${uygun ? "✓" : "✗"} ${r.toplamGun} gün (≈${(r.toplamGun / 7).toFixed(1)} hafta) | level başına gün: ${Object.values(r.levelGunleri).join(" · ")}`
    );
  }
}
console.log(hata ? "\nSONUÇ: Denge bozuk veya tıkanma var ✗" : "\nSONUÇ: Tüm senaryolar oynanabilir ✓");
process.exit(hata ? 1 : 0);
