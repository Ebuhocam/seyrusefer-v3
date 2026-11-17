import { db } from "@/lib/sunucu/db";
import {
  oyunAyarlariniGetir,
  levelAyariniKaydet,
  levelAyariniSil,
  genelAyarlariKaydet,
  genelAyarlariOku,
  ayarKayitBilgisi,
  turkiyeGunBasi,
  BIRLIK_UYE_SINIRI_ARALIK,
  BIRLIK_UYE_SINIRI_VARSAYILAN,
} from "@/lib/sunucu/ayarlarDeposu";
import { govde, hata, oturumZorunlu } from "@/lib/sunucu/api";
import { BINALAR, LEVELLAR, KAYNAKLAR } from "@/lib/oyun/sabitler";
import { GOREV_TURLERI, LEVEL_GOREVLERI, LEVEL_ICERIKLERI, SEYYAH_GOREVLERI, levelGorevTanimlari } from "@/lib/oyun/gorevler";
import { TURKU_HIKAYELERI } from "@/lib/oyun/hikayeler";

const GUN_MS = 24 * 60 * 60 * 1000;
const KAYNAK_KODLARI = Object.keys(KAYNAKLAR);
const BEDEL_TAVAN = 100000;

/** Yönetim yalnızca "admin" rolündeki öğretmene açıktır (geliştirme ortamında bile öğrenciler giremez) */
const yoneticiMi = (kullanici) => kullanici?.rol === "admin";

// ---------- DOĞRULAMA ----------

class DogrulamaHatasi extends Error {}
const bozuk = (mesaj) => {
  throw new DogrulamaHatasi(mesaj);
};

function metinAlani(deger, ad, { enAz = 0, enCok = 200 } = {}) {
  const s = String(deger ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  if (s.length < enAz) bozuk(enAz <= 1 ? `${ad} boş bırakılamaz.` : `${ad} en az ${enAz} karakter olmalı.`);
  if (s.length > enCok) bozuk(`${ad} en fazla ${enCok} karakter olabilir (şu an ${s.length}).`);
  return s;
}

function tamSayi(deger, ad, en_az, en_cok) {
  const n = Number(deger);
  if (deger === "" || deger === null || deger === undefined || !Number.isFinite(n) || !Number.isInteger(n)) {
    bozuk(`${ad} tam sayı olmalı.`);
  }
  if (n < en_az || n > en_cok) bozuk(`${ad} ${en_az} ile ${en_cok} arasında olmalı (şu an ${n}).`);
  return n;
}

function adresAlani(deger, ad) {
  const s = String(deger ?? "").trim();
  if (!s) return "";
  if (s.length > 400) bozuk(`${ad} çok uzun.`);
  if (!/^(https?:\/\/|\/)[^\s<>"']+$/i.test(s)) bozuk(`${ad} geçerli bir adres olmalı (https://… ile başlamalı).`);
  return s;
}

/** Bir binanın (kayıtlı ayarlarla birleşmiş) açılış levelı */
function etkinAcilis(binaId, seviye, binaAyarlari) {
  const ozel = binaAyarlari?.[binaId]?.acilis?.[seviye];
  return Number(ozel ?? BINALAR[binaId]?.acilis?.[seviye] ?? 1) || 1;
}

function levelDogrula(no, v, binaAyarlari) {
  if (!v || typeof v !== "object") bozuk("Level bilgisi okunamadı.");
  const gundem = metinAlani(v.gundem, "Gündem başlığı", { enAz: 1, enCok: 60 });
  const evre = ["bireysel", "birlik", "meydan"].includes(v.evre) ? v.evre : bozuk("Evre seçimi geçersiz.");
  const hedefGun = tamSayi(v.hedefGun, "Hedef süre (gün)", 1, 60);

  const hedefler = {};
  for (const [binaId, seviyeHam] of Object.entries(v.hedefler ?? {})) {
    const bina = BINALAR[binaId];
    if (!bina) bozuk(`"${binaId}" diye bir bina yok; hedef listesinden çıkarılmalı.`);
    const seviye = tamSayi(seviyeHam, `${bina.ad} hedef seviyesi`, 1, bina.maksSeviye);
    if (etkinAcilis(binaId, seviye, binaAyarlari) > no) {
      bozuk(
        `${bina.ad} Seviye ${seviye}, Level ${etkinAcilis(binaId, seviye, binaAyarlari)}'de açılıyor; Level ${no} için hedef olamaz. Hedefi düşürün ya da binanın açılış levelını (Binalar sekmesi) değiştirin.`
      );
    }
    hedefler[binaId] = seviye;
  }

  const gorevler = [];
  const kodlar = new Set();
  (Array.isArray(v.gorevler) ? v.gorevler : []).forEach((gr, idx) => {
    const sira = `${idx + 1}. görev`;
    const tur = Object.hasOwn(GOREV_TURLERI, gr?.tur) ? gr.tur : bozuk(`${sira}: görev türü geçersiz.`);
    const ad = metinAlani(gr.ad, `${sira} başlığı`, { enAz: 1, enCok: 100 });
    const hedef = tamSayi(gr.hedef, `${sira} (${ad}) hedefi`, 1, 100);
    let bina = gr.bina || null;
    if (bina !== null && !BINALAR[bina]) bozuk(`${sira} (${ad}): anahtar bina geçersiz.`);
    let kod = String(gr.kod ?? "").trim();
    if (!/^[A-Za-z0-9_]{1,40}$/.test(kod)) kod = tur === "onay" ? `gorev_${Date.now().toString(36)}${idx}` : tur;
    if (kodlar.has(kod)) {
      bozuk(`${sira} (${ad}): aynı levelda iki tane "${GOREV_TURLERI[tur].ad}" görevi olamaz. İkincisini "Özel Görev / Etkinlik" türüne çevirin.`);
    }
    kodlar.add(kod);
    gorevler.push({
      kod,
      tur,
      ad,
      aciklama: metinAlani(gr.aciklama, `${sira} açıklaması`, { enCok: 400 }),
      hedef,
      gunluk: !!gr.gunluk,
      bina,
    });
  });
  if (gorevler.length === 0) bozuk("Bir level en az 1 görev içermeli; yoksa öğrenciler görevsiz level atlar.");

  const ic = v.icerik ?? {};
  const hadisler = [];
  (Array.isArray(ic.hadisler) ? ic.hadisler : []).forEach((h, i) => {
    const metin = String(h?.metin ?? "").trim();
    const kaynak = String(h?.kaynak ?? "").trim();
    if (!metin && !kaynak) return; // tamamen boş satırlar sessizce atılır
    hadisler.push({
      metin: metinAlani(metin, `${i + 1}. hadis metni`, { enAz: 1, enCok: 600 }),
      kaynak: metinAlani(kaynak, `${i + 1}. hadis kaynağı`, { enCok: 150 }),
    });
  });

  const video = {
    baslik: metinAlani(ic.video?.baslik, "Video başlığı", { enCok: 120 }),
    ozet: metinAlani(ic.video?.ozet, "Video özeti", { enCok: 600 }),
    url: adresAlani(ic.video?.url, "Video dosyası adresi"),
    sureSn: tamSayi(ic.video?.sureSn ?? 15, "Video süresi (sn)", 5, 3600),
  };
  const aile = {
    baslik: metinAlani(ic.aile?.baslik, "Aile mektubu başlığı", { enCok: 120 }),
    metin: metinAlani(ic.aile?.metin, "Aile mektubu metni", { enCok: 2000 }),
    soru: metinAlani(ic.aile?.soru, "Aile istişare sorusu", { enCok: 300 }),
  };
  const gundemSorusu = metinAlani(ic.gundemSorusu, "Meydan tartışma sorusu", { enCok: 300 });

  const sinav = (Array.isArray(ic.sinav) ? ic.sinav : []).map((s, i) => {
    const n = `${i + 1}. sınav sorusu`;
    const soru = metinAlani(s?.soru, `${n} metni`, { enAz: 1, enCok: 300 });
    const secenekler = [0, 1, 2, 3].map((k) =>
      metinAlani(s?.secenekler?.[k], `${n}: ${"ABCD"[k]} şıkkı`, { enAz: 1, enCok: 200 })
    );
    if (new Set(secenekler.map((x) => x.toLocaleLowerCase("tr"))).size < 4) {
      bozuk(`${n}: şıklar birbirinden farklı olmalı.`);
    }
    const dogru = Number(s?.dogru);
    if (!Number.isInteger(dogru) || dogru < 0 || dogru > 3) bozuk(`${n}: doğru cevap A, B, C ya da D olarak seçilmeli.`);
    return { soru, secenekler, dogru };
  });

  return { gundem, evre, hedefGun, hedefler, gorevler, icerik: { hadisler, video, aile, gundemSorusu, sinav } };
}

function binalarDogrula(ham) {
  const sonuc = {};
  for (const [binaId, tanim] of Object.entries(BINALAR)) {
    const g = ham?.[binaId];
    if (!g) continue;
    const baslangic = (tanim.baslangicSeviye ?? 0) + 1;
    const acilis = {};
    const bedel = {};
    let oncekiAcilis = 0;
    for (let s = baslangic; s <= tanim.maksSeviye; s++) {
      const etiket = `${tanim.ad} Seviye ${s}`;
      const a = tamSayi(g.acilis?.[s] ?? tanim.acilis?.[s] ?? 1, `${etiket} açılış leveli`, 1, 10);
      if (a < oncekiAcilis) bozuk(`${etiket}: açılış leveli, bir önceki seviyeden (Level ${oncekiAcilis}) önce olamaz.`);
      oncekiAcilis = a;
      acilis[s] = a;
      const b = {};
      for (const k of KAYNAK_KODLARI) {
        const ad = k === "insan" ? "En az nüfus şartı" : KAYNAKLAR[k].ad;
        const m = tamSayi(g.bedel?.[s]?.[k] ?? 0, `${etiket} · ${ad}`, 0, k === "insan" ? 500 : BEDEL_TAVAN);
        if (m > 0) b[k] = m;
      }
      bedel[s] = b;
    }
    sonuc[binaId] = { acilis, bedel };
  }
  return sonuc;
}

function genelDogrula(g, mevcut) {
  const seyyahGorevleri = (Array.isArray(g.seyyahGorevleri) ? g.seyyahGorevleri : [])
    .map((s, i) => ({ s: String(s ?? "").trim(), i }))
    .filter((x) => x.s)
    .map((x) => metinAlani(x.s, `${x.i + 1}. Haberci görevi`, { enCok: 250 }));
  if (seyyahGorevleri.length === 0) bozuk("Haberci görev havuzunda en az 1 görev olmalı.");

  const turkuler = (Array.isArray(g.turkuler) ? g.turkuler : []).map((t, i) => {
    const n = `${i + 1}. türkü hikâyesi`;
    return {
      id: String(t?.id || `turku_${Date.now()}_${i}`).slice(0, 60),
      level: tamSayi(t?.level ?? 1, `${n} leveli`, 1, 10),
      baslik: metinAlani(t?.baslik, `${n} başlığı`, { enAz: 1, enCok: 120 }),
      turkuAdi: metinAlani(t?.turkuAdi, `${n} türkü adı`, { enAz: 1, enCok: 120 }),
      anlatim: metinAlani(t?.anlatim, `${n} anlatımı`, { enAz: 1, enCok: 3000 }),
      sesUrl: adresAlani(t?.sesUrl, `${n} ses adresi`),
      odev: metinAlani(t?.odev, `${n} gönül ödevi`, { enCok: 400 }),
    };
  });

  const uyeSiniri = tamSayi(
    g.birlik?.uyeSiniri ?? mevcut.birlik?.uyeSiniri ?? BIRLIK_UYE_SINIRI_VARSAYILAN,
    "Birlik üye sınırı",
    BIRLIK_UYE_SINIRI_ARALIK.en_az,
    BIRLIK_UYE_SINIRI_ARALIK.en_cok
  );

  const yeni = {
    ...mevcut, // davalar gibi bu ekranda düzenlenmeyen ayarlar korunur
    binalar: binalarDogrula(g.binalar),
    seyyahGorevleri,
    turkuler,
    birlik: { uyeSiniri },
  };
  return yeni;
}

// ---------- VERİ ----------

async function sinifDurumu(kayitli) {
  const d = await db();
  const haftaBasi = turkiyeGunBasi() - 6 * GUN_MS;
  const satirlar = await d
    .prepare(
      `SELECT k.id, k.ad, k.kullanici_adi, k.rol, COALESCE(o.level, 1) AS level,
              (SELECT MAX(guncelleme) FROM gorev_ilerlemesi WHERE kullanici_id = k.id) AS gorev_son,
              (SELECT MAX(guncelleme) FROM namaz_cetelesi WHERE kullanici_id = k.id) AS namaz_son,
              (SELECT MAX(olusturma) FROM oturumlar WHERE kullanici_id = k.id) AS son_giris,
              (SELECT COUNT(*) FROM gorev_ilerlemesi WHERE kullanici_id = k.id AND tamamlandi >= ?1) AS hafta_tamam,
              (SELECT COUNT(*) FROM gorev_ilerlemesi WHERE kullanici_id = k.id AND level = COALESCE(o.level, 1) AND tamamlandi IS NOT NULL) AS level_tamam,
              (SELECT b.ad FROM birlik_uyeleri u JOIN birlikler b ON b.id = u.birlik_id WHERE u.kullanici_id = k.id) AS birlik_ad
         FROM kullanicilar k
         LEFT JOIN oyuncu_durumu o ON o.kullanici_id = k.id
        WHERE k.rol <> 'admin'
        ORDER BY k.ad COLLATE NOCASE ASC
        LIMIT 300`
    )
    .bind(haftaBasi)
    .all();

  return (satirlar.results ?? []).map((s) => {
    const sonEtkinlik = Math.max(Number(s.gorev_son) || 0, Number(s.namaz_son) || 0) || null;
    return {
      id: s.id,
      ad: s.ad,
      kullaniciAdi: s.kullanici_adi,
      level: s.level,
      sonEtkinlik,
      sonGiris: s.son_giris ?? null,
      haftaGorev: s.hafta_tamam ?? 0,
      levelGorevTamam: Math.min(s.level_tamam ?? 0, levelGorevTanimlari(s.level, kayitli).length),
      levelGorevToplam: levelGorevTanimlari(s.level, kayitli).length,
      birlik: s.birlik_ad ?? null,
    };
  });
}

async function moderasyonVerisi() {
  const d = await db();
  const satirlar = await d
    .prepare(
      `SELECT p.id, p.gizli, p.icerik, p.olusturma, k.ad AS yazar_ad, k.kullanici_adi AS yazar_kullanici,
              (SELECT COUNT(*) FROM meydan_sikayetler s WHERE s.paylasim_id = p.id AND s.durum = 'bekliyor') AS bekleyen,
              (SELECT GROUP_CONCAT(sk.ad || ': ' || s.sebep, ' | ')
                 FROM meydan_sikayetler s JOIN kullanicilar sk ON sk.id = s.kullanici_id
                WHERE s.paylasim_id = p.id AND s.durum = 'bekliyor') AS sebepler
         FROM meydan_paylasimlari p
         JOIN kullanicilar k ON k.id = p.kullanici_id
        WHERE p.gizli = 1 OR EXISTS (SELECT 1 FROM meydan_sikayetler s WHERE s.paylasim_id = p.id AND s.durum = 'bekliyor')
        ORDER BY bekleyen DESC, p.olusturma DESC
        LIMIT 60`
    )
    .all();
  return (satirlar.results ?? []).map((p) => {
    let metin = String(p.icerik ?? "");
    let medya = "";
    try {
      const z = JSON.parse(metin);
      if (z && typeof z.metin === "string") {
        metin = z.metin;
        medya = z.medyaUrl || "";
      }
    } catch {
      // düz metin
    }
    return {
      id: p.id,
      gizli: !!p.gizli,
      metin,
      medya,
      olusturma: p.olusturma,
      yazar: p.yazar_ad,
      yazarKullanici: p.yazar_kullanici,
      bekleyen: p.bekleyen,
      sebepler: p.sebepler ?? "",
    };
  });
}

/** Varsayılanlarla birleştirilmiş tam yönetim verisini döner */
async function tamYonetimVerisi() {
  const [kayitli, kayitBilgisi] = await Promise.all([oyunAyarlariniGetir(), ayarKayitBilgisi()]);

  const levellar = {};
  for (const l of LEVELLAR) {
    const ozel = kayitli.levellar?.[l.no] ?? {};
    const vIcerik = LEVEL_ICERIKLERI[l.no] ?? LEVEL_ICERIKLERI[1];
    const oIcerik = ozel.icerik ?? {};
    levellar[l.no] = {
      no: l.no,
      gundem: ozel.gundem ?? l.gundem,
      evre: ozel.evre ?? l.evre,
      hedefGun: Number(ozel.hedefGun ?? l.hedefGun) || 5,
      hedefler: ozel.hedefler ?? l.hedefler,
      gorevler: Array.isArray(ozel.gorevler) ? ozel.gorevler : LEVEL_GOREVLERI[l.no] ?? [],
      icerik: {
        hadisler: Array.isArray(oIcerik.hadisler) ? oIcerik.hadisler : vIcerik.hadisler ?? [],
        video: { ...vIcerik.video, ...(oIcerik.video ?? {}) },
        aile: { ...vIcerik.aile, ...(oIcerik.aile ?? {}) },
        gundemSorusu: oIcerik.gundemSorusu ?? vIcerik.gundemSorusu ?? "",
        sinav: Array.isArray(oIcerik.sinav) ? oIcerik.sinav : vIcerik.sinav ?? [],
      },
      ozellestirilmis: Object.hasOwn(kayitBilgisi, `level_${l.no}`),
    };
  }

  const binalar = {};
  for (const [id, t] of Object.entries(BINALAR)) {
    const ozel = kayitli.binalar?.[id] ?? {};
    binalar[id] = {
      ad: t.ad,
      maksSeviye: t.maksSeviye,
      baslangicSeviye: t.baslangicSeviye ?? 0,
      acilis: { ...t.acilis, ...(ozel.acilis ?? {}) },
      bedel: { ...t.bedel, ...(ozel.bedel ?? {}) },
    };
  }

  const seyyahGorevleri =
    Array.isArray(kayitli.seyyahGorevleri) && kayitli.seyyahGorevleri.length > 0 ? kayitli.seyyahGorevleri : SEYYAH_GOREVLERI;
  const turkuler = Array.isArray(kayitli.turkuler) && kayitli.turkuler.length > 0 ? kayitli.turkuler : TURKU_HIKAYELERI;

  const d = await db();
  const [kullanicilar, sinif, moderasyon] = await Promise.all([
    d
      .prepare(
        `SELECT k.id, k.kullanici_adi, k.ad, k.rol, k.olusturma, COALESCE(o.level, 1) AS level
           FROM kullanicilar k LEFT JOIN oyuncu_durumu o ON o.kullanici_id = k.id
          ORDER BY k.id ASC LIMIT 300`
      )
      .all(),
    sinifDurumu(kayitli),
    moderasyonVerisi(),
  ]);

  return {
    levellar,
    binalar,
    seyyahGorevleri,
    turkuler,
    birlik: { uyeSiniri: kayitli.birlik?.uyeSiniri ?? BIRLIK_UYE_SINIRI_VARSAYILAN, ...BIRLIK_UYE_SINIRI_ARALIK },
    binaOzellestirilmis: Object.keys(kayitli.binalar ?? {}).length > 0,
    kullanicilar: kullanicilar.results ?? [],
    sinif,
    moderasyon,
    simdi: Date.now(),
  };
}

export async function GET() {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  if (!yoneticiMi(kullanici)) return hata("Bu sayfa yalnızca öğretmen (yönetici) hesabına açıktır.", 403);
  return Response.json(await tamYonetimVerisi());
}

export async function POST(request) {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  if (!yoneticiMi(kullanici)) return hata("Bu işlem yalnızca öğretmen (yönetici) hesabına açıktır.", 403);

  const g = await govde(request);

  try {
    if (g.islem === "levelKaydet") {
      const no = Number(g.levelNo);
      if (!Number.isInteger(no) || no < 1 || no > 10) return hata("Geçersiz level numarası.");
      const kayitli = await oyunAyarlariniGetir();
      await levelAyariniKaydet(no, levelDogrula(no, g.veri, kayitli.binalar));
    } else if (g.islem === "levelSifirla") {
      const no = Number(g.levelNo);
      if (!Number.isInteger(no) || no < 1 || no > 10) return hata("Geçersiz level numarası.");
      await levelAyariniSil(no);
    } else if (g.islem === "genelKaydet") {
      await genelAyarlariKaydet(genelDogrula(g, await genelAyarlariOku()));
    } else if (g.islem === "binalariSifirla") {
      const mevcut = await genelAyarlariOku();
      const { binalar: _atilan, ...kalan } = mevcut;
      void _atilan;
      await genelAyarlariKaydet(kalan);
    } else if (g.islem === "kullaniciGuncelle") {
      const hedefId = Number(g.kullaniciId);
      const d = await db();
      const hedef = await d.prepare("SELECT id, rol FROM kullanicilar WHERE id = ?").bind(hedefId).first();
      if (!hedef) return hata("Bu kullanıcı bulunamadı.", 404);
      if (!["ogrenci", "rehber", "admin"].includes(g.rol)) return hata("Rol geçersiz.");
      if (hedef.id === kullanici.id && g.rol !== "admin") {
        return hata("Kendi yönetici yetkini kaldıramazsın; yoksa bu panele bir daha giremezdin.");
      }
      const level = tamSayi(g.level, "Level", 1, 10);
      await d.batch([
        d.prepare("UPDATE kullanicilar SET rol = ? WHERE id = ?").bind(g.rol, hedefId),
        d.prepare("UPDATE oyuncu_durumu SET level = ? WHERE kullanici_id = ?").bind(level, hedefId),
      ]);
    } else if (g.islem === "moderasyon") {
      const d = await db();
      const id = Number(g.paylasimId);
      const p = await d.prepare("SELECT id FROM meydan_paylasimlari WHERE id = ?").bind(id).first();
      if (!p) return hata("Bu paylaşım zaten silinmiş.", 404);
      if (g.karar === "gizle") {
        await d.batch([
          d.prepare("UPDATE meydan_paylasimlari SET gizli = 1 WHERE id = ?").bind(id),
          d.prepare("UPDATE meydan_sikayetler SET durum = 'kapandi' WHERE paylasim_id = ?").bind(id),
        ]);
      } else if (g.karar === "yayinda") {
        await d.batch([
          d.prepare("UPDATE meydan_paylasimlari SET gizli = 0 WHERE id = ?").bind(id),
          d.prepare("UPDATE meydan_sikayetler SET durum = 'kapandi' WHERE paylasim_id = ?").bind(id),
        ]);
      } else if (g.karar === "geriAc") {
        await d.prepare("UPDATE meydan_paylasimlari SET gizli = 0 WHERE id = ?").bind(id).run();
      } else if (g.karar === "sil") {
        await d.batch([
          d.prepare("DELETE FROM meydan_begeniler WHERE paylasim_id = ?").bind(id),
          d.prepare("DELETE FROM meydan_sikayetler WHERE paylasim_id = ?").bind(id),
          d.prepare("DELETE FROM meydan_yorumlar WHERE paylasim_id = ?").bind(id),
          d.prepare("DELETE FROM meydan_paylasimlari WHERE id = ?").bind(id),
        ]);
      } else {
        return hata("Bilinmeyen karar.");
      }
    } else {
      return hata("Bilinmeyen yönetim işlemi.");
    }
  } catch (e) {
    if (e instanceof DogrulamaHatasi) return hata(e.message, 422);
    throw e;
  }

  return Response.json({ tamam: true, ...(await tamYonetimVerisi()) });
}
