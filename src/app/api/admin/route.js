import { db } from "@/lib/sunucu/db";
import { gelistiriciIzni } from "@/lib/sunucu/oturum";
import { oyunAyarlariniGetir, levelAyariniKaydet, genelAyarlariKaydet } from "@/lib/sunucu/ayarlarDeposu";
import { govde, hata, oturumZorunlu } from "@/lib/sunucu/api";
import { BINALAR, LEVELLAR } from "@/lib/oyun/sabitler";
import { LEVEL_GOREVLERI, LEVEL_ICERIKLERI, SEYYAH_GOREVLERI } from "@/lib/oyun/gorevler";
import { KOY_DAVALARI, TURKU_HIKAYELERI } from "@/lib/oyun/hikayeler";

/** Varsayılanlarla birleştirilmiş tam yönetim verisini döner */
async function tamYonetimVerisi() {
  const kayitli = await oyunAyarlariniGetir();

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
    Array.isArray(kayitli.seyyahGorevleri) && kayitli.seyyahGorevleri.length > 0
      ? kayitli.seyyahGorevleri
      : SEYYAH_GOREVLERI;

  const turkuler =
    Array.isArray(kayitli.turkuler) && kayitli.turkuler.length > 0
      ? kayitli.turkuler
      : TURKU_HIKAYELERI;

  const davalar =
    Array.isArray(kayitli.davalar) && kayitli.davalar.length > 0
      ? kayitli.davalar
      : KOY_DAVALARI;

  const d = await db();
  const kullanicilar = await d
    .prepare(
      `SELECT k.id, k.kullanici_adi, k.ad, k.rol, k.olusturma,
              COALESCE(o.level, 1) AS level
         FROM kullanicilar k
         LEFT JOIN oyuncu_durumu o ON o.kullanici_id = k.id
        ORDER BY k.id ASC
        LIMIT 200`
    )
    .all();

  return {
    levellar,
    binalar,
    seyyahGorevleri,
    turkuler,
    davalar,
    kullanicilar: kullanicilar.results ?? [],
  };
}

export async function GET() {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  if (!gelistiriciIzni(kullanici)) return hata("Yönetici yetkisi gerekli", 403);
  return Response.json(await tamYonetimVerisi());
}

export async function POST(request) {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  if (!gelistiriciIzni(kullanici)) return hata("Yönetici yetkisi gerekli", 403);

  const g = await govde(request);

  if (g.islem === "levelKaydet") {
    const no = Number(g.levelNo);
    if (!no || no < 1 || no > 10) return hata("Geçersiz level numarası");
    const v = g.veri ?? {};
    const temizGorevler = (Array.isArray(v.gorevler) ? v.gorevler : []).map((gr, idx) => ({
      kod: String(gr.kod || `${gr.tur || "onay"}_${idx + 1}`).trim(),
      tur: String(gr.tur || "onay"),
      ad: String(gr.ad || "Görev").trim(),
      aciklama: String(gr.aciklama || "").trim(),
      hedef: Math.max(1, Number(gr.hedef) || 1),
      gunluk: !!gr.gunluk,
      bina: gr.bina || null,
    }));

    await levelAyariniKaydet(no, {
      gundem: String(v.gundem || `Level ${no}`).trim(),
      evre: ["bireysel", "birlik", "meydan"].includes(v.evre) ? v.evre : "bireysel",
      hedefGun: Math.max(1, Number(v.hedefGun) || 5),
      hedefler: v.hedefler ?? {},
      gorevler: temizGorevler,
      icerik: v.icerik ?? {},
    });
  } else if (g.islem === "genelKaydet") {
    await genelAyarlariKaydet({
      binalar: g.binalar ?? {},
      seyyahGorevleri: (Array.isArray(g.seyyahGorevleri) ? g.seyyahGorevleri : [])
        .map((s) => String(s).trim())
        .filter(Boolean),
      turkuler: Array.isArray(g.turkuler) ? g.turkuler : TURKU_HIKAYELERI,
      davalar: Array.isArray(g.davalar) ? g.davalar : KOY_DAVALARI,
    });
  } else if (g.islem === "kullaniciGuncelle") {
    const hedefId = Number(g.kullaniciId);
    const rol = ["ogrenci", "rehber", "admin"].includes(g.rol) ? g.rol : "ogrenci";
    const level = Math.min(10, Math.max(1, Number(g.level) || 1));
    const d = await db();
    await d.batch([
      d.prepare("UPDATE kullanicilar SET rol = ? WHERE id = ?").bind(rol, hedefId),
      d.prepare("UPDATE oyuncu_durumu SET level = ? WHERE kullanici_id = ?").bind(level, hedefId),
    ]);
  } else {
    return hata("Bilinmeyen yönetim işlemi");
  }

  return Response.json({ tamam: true, ...(await tamYonetimVerisi()) });
}
