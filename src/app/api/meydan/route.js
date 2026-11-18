import { db } from "@/lib/sunucu/db";
import { durumGetir, durumYaz, oyunSaati } from "@/lib/sunucu/oyunDeposu";
import { oyunAyarlariniGetir, tesvikOdulunuKontrolEt, turkiyeGunBasi } from "@/lib/sunucu/ayarlarDeposu";
import { govde, hata, oturumZorunlu, oyunYaniti } from "@/lib/sunucu/api";
import { gorevIlerlet } from "@/lib/oyun/eylemler";
import { oyunGunu } from "@/lib/oyun/gorevler";
import { BIRLIK_ACILIS_LEVEL, KARAKTER_KODLARI } from "@/lib/oyun/sabitler";

// Çınar Altı kuralları (kötüye kullanımı ve ödül avcılığını önlemek için)
const PAYLASIM_ODUL_GUNLUK = 3; // günde ilk 3 paylaşım Huzur ve görev ilerlemesi kazandırır
const PAYLASIM_TAVAN_GUNLUK = 10; // bundan fazlası hiç kabul edilmez
const YORUM_ODUL_GUNLUK = 6;
const YORUM_TAVAN_GUNLUK = 30;
const BEGENI_ODUL_GUNLUK = 10; // bir öğrencinin günde en fazla 10 beğenisi Huzur kazandırır
const BEGENI_ALINAN_ODUL_GUNLUK = 10; // bir öğrenci beğeniden günde en fazla +10 Huzur kazanır
const PAYLASIM_ARALIK_MS = 20_000;
const YORUM_ARALIK_MS = 5_000;
const GIZLEME_SIKAYET_SAYISI = 3; // 3 ayrı öğrencinin şikâyeti paylaşımı akıştan kaldırır

function temizMetin(v) {
  const s = String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "");
  return s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

const degisen = (sonuc) => Number(sonuc?.meta?.changes ?? 0);
const KIMLIK = /^[A-Za-z0-9_-]+$/;

/**
 * Yalnızca gerçek YouTube / Instagram bağlantılarını kabul eder ve standart biçime çevirir.
 * Gömme (embed) adresi istemciden değil, burada sunucuda üretilir.
 * @returns {{tur:string, url:string, embed:string}|null}
 */
function medyaCoz(ham) {
  const metin = String(ham ?? "").trim();
  if (!metin || metin.length > 300) return null;
  let u;
  try {
    u = new URL(metin);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password) return null;
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, "");
  const parcalar = u.pathname.split("/").filter(Boolean);

  let ytId = null;
  if (host === "youtu.be") ytId = parcalar[0] ?? null;
  else if (host === "youtube.com") {
    if (parcalar[0] === "watch") ytId = u.searchParams.get("v");
    else if (["shorts", "embed", "live"].includes(parcalar[0])) ytId = parcalar[1] ?? null;
  }
  if (ytId !== null) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(ytId)) return null;
    return {
      tur: "youtube",
      url: `https://www.youtube.com/watch?v=${ytId}`,
      embed: `https://www.youtube.com/embed/${ytId}`,
    };
  }

  if (host === "instagram.com") {
    const i = parcalar.findIndex((x) => ["p", "reel", "reels", "tv"].includes(x));
    const kod = i >= 0 ? parcalar[i + 1] : null;
    if (kod && i <= 1 && /^[A-Za-z0-9_-]{5,30}$/.test(kod) && KIMLIK.test(kod)) {
      const tip = parcalar[i] === "reels" ? "reel" : parcalar[i];
      return {
        tur: "instagram",
        url: `https://www.instagram.com/${tip}/${kod}/`,
        embed: `https://www.instagram.com/${tip}/${kod}/embed`,
      };
    }
  }
  return null;
}

function icerikCoz(hamIcerik) {
  const dizge = String(hamIcerik ?? "");
  if (dizge.startsWith("{")) {
    try {
      const veri = JSON.parse(dizge);
      if (veri && typeof veri.metin === "string") {
        return {
          metin: veri.metin,
          kategori: veri.kategori === "serbest" ? "serbest" : "gundem",
          altTur: veri.altTur || "soz",
          medyaUrl: medyaCoz(veri.medyaUrl)?.url ?? "",
        };
      }
    } catch {
      // düz metin olarak devam et
    }
  }
  return {
    metin: dizge,
    kategori: "gundem",
    altTur: "soz",
    medyaUrl: "",
  };
}

async function paylasimlariGetir(aktifKullaniciId) {
  const d = await db();

  // Öğretmenin ya da şikâyetlerin gizlediği paylaşımlar akışa hiç girmez
  const paylasimlar = await d
    .prepare(
      `SELECT p.id, p.kullanici_id AS yazar_id, p.level, p.icerik, p.olusturma,
              k.ad AS yazar_ad, k.kullanici_adi AS yazar_kullanici,
              COALESCE(od.level, 1) AS yazar_level,
              COALESCE(od.mutluluk, 60) AS yazar_mutluluk,
              COALESCE(kr.envanter, 0) AS yazar_karakter_idx
         FROM meydan_paylasimlari p
         JOIN kullanicilar k ON k.id = p.kullanici_id
         LEFT JOIN oyuncu_durumu od ON od.kullanici_id = p.kullanici_id
         LEFT JOIN kaynaklar kr ON kr.kullanici_id = p.kullanici_id AND kr.kaynak = 'oyuncu_karakter'
        WHERE p.gizli = 0
        ORDER BY p.olusturma DESC
        LIMIT 35`
    )
    .all();

  if (!paylasimlar.results.length) return [];

  const idler = paylasimlar.results.map((p) => p.id);
  const yerTutucular = idler.map(() => "?").join(",");

  const [yorumlar, begeniler, benSikayet] = await d.batch([
    d
      .prepare(
        `SELECT y.id, y.paylasim_id, y.kullanici_id AS yazar_id, y.icerik, y.olusturma,
                k.ad AS yazar_ad, k.kullanici_adi AS yazar_kullanici,
                COALESCE(kr.envanter, 0) AS yazar_karakter_idx
           FROM meydan_yorumlar y
           JOIN kullanicilar k ON k.id = y.kullanici_id
           LEFT JOIN kaynaklar kr ON kr.kullanici_id = y.kullanici_id AND kr.kaynak = 'oyuncu_karakter'
          WHERE y.paylasim_id IN (${yerTutucular})
          ORDER BY y.olusturma ASC`
      )
      .bind(...idler),
    d
      .prepare(
        `SELECT paylasim_id, kullanici_id
           FROM meydan_begeniler
          WHERE aktif = 1 AND paylasim_id IN (${yerTutucular})`
      )
      .bind(...idler),
    d
      .prepare(`SELECT paylasim_id FROM meydan_sikayetler WHERE kullanici_id = ? AND paylasim_id IN (${yerTutucular})`)
      .bind(aktifKullaniciId, ...idler),
  ]);

  const yorumHaritasi = {};
  for (const y of yorumlar.results) {
    (yorumHaritasi[y.paylasim_id] ??= []).push({
      ...y,
      yazar_karakter: KARAKTER_KODLARI[y.yazar_karakter_idx] ?? "alp",
    });
  }

  const begeniSayiHaritasi = {};
  const benBegendimHaritasi = {};
  for (const b of begeniler.results) {
    begeniSayiHaritasi[b.paylasim_id] = (begeniSayiHaritasi[b.paylasim_id] ?? 0) + 1;
    if (b.kullanici_id === aktifKullaniciId) {
      benBegendimHaritasi[b.paylasim_id] = true;
    }
  }
  const bildirdiklerim = new Set(benSikayet.results.map((x) => x.paylasim_id));

  return paylasimlar.results.map((p) => {
    const cozulmus = icerikCoz(p.icerik);
    const medya = medyaCoz(cozulmus.medyaUrl);
    return {
      id: p.id,
      level: p.level,
      olusturma: p.olusturma,
      yazar_id: p.yazar_id,
      yazar_ad: p.yazar_ad,
      yazar_kullanici: p.yazar_kullanici,
      yazar_level: p.yazar_level,
      yazar_mutluluk: p.yazar_mutluluk,
      yazar_karakter: KARAKTER_KODLARI[p.yazar_karakter_idx] ?? "alp",
      icerik: cozulmus.metin,
      kategori: cozulmus.kategori,
      altTur: cozulmus.altTur,
      medyaUrl: medya?.url ?? "",
      medyaTur: medya?.tur ?? null,
      medyaEmbed: medya?.embed ?? null, // sunucuda üretilmiş güvenli gömme adresi
      begeniSayisi: begeniSayiHaritasi[p.id] ?? 0,
      benBegendim: Boolean(benBegendimHaritasi[p.id]),
      benBildirdim: bildirdiklerim.has(p.id),
      yorumlar: yorumHaritasi[p.id] ?? [],
    };
  });
}

export async function GET() {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  return Response.json({ paylasimlar: await paylasimlariGetir(kullanici.id) });
}

export async function POST(request) {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;

  const { tur, icerik, paylasimId, kategori, altTur, medyaUrl, sebep } = await govde(request);
  const d = await db();

  let [durum, ayarlar] = await Promise.all([durumGetir(kullanici.id), oyunAyarlariniGetir()]);
  const simdi = oyunSaati(durum);
  const an = Date.now();
  const gunBasi = turkiyeGunBasi(an); // günlük sınırlar gerçek Türkiye gününe göre

  // Çınar Altı, Birlik Meydanı'ndadır: Level 3'e ulaşmayan öğrenci işlem yapamaz (arayüzü atlayıp API'yi çağırsa da)
  if ((durum.level ?? 1) < BIRLIK_ACILIS_LEVEL) {
    return hata(`Çınar Altı, Birlik Meydanı'nda Level ${BIRLIK_ACILIS_LEVEL}'te açılır.`, 403);
  }

  const cevap = async (ek = {}) =>
    oyunYaniti(kullanici, durum, { paylasimlar: await paylasimlariGetir(kullanici.id), ...ek }, ayarlar);

  // 1. BEĞENİ (aç/kapat). Huzur ödülü yalnızca bir paylaşımın İLK beğenisinde, kendi paylaşımı değilse ve günlük sınırlar içindeyse verilir.
  if (tur === "begeni") {
    const p = await d
      .prepare("SELECT id, kullanici_id FROM meydan_paylasimlari WHERE id = ? AND gizli = 0")
      .bind(Number(paylasimId))
      .first();
    if (!p) return hata("Bu paylaşım artık yok.", 404);

    const mevcut = await d
      .prepare("SELECT aktif FROM meydan_begeniler WHERE paylasim_id = ? AND kullanici_id = ?")
      .bind(p.id, kullanici.id)
      .first();

    let bildirim = null;
    if (mevcut) {
      // Satır silinmez: beğeniyi geri alıp yeniden beğenerek tekrar ödül toplanamaz
      await d
        .prepare("UPDATE meydan_begeniler SET aktif = ? WHERE paylasim_id = ? AND kullanici_id = ?")
        .bind(mevcut.aktif ? 0 : 1, p.id, kullanici.id)
        .run();
    } else {
      const kendisi = p.kullanici_id === kullanici.id ? 1 : 0;
      const [ekle, huzur] = await d.batch([
        d
          .prepare("INSERT OR IGNORE INTO meydan_begeniler (paylasim_id, kullanici_id, olusturma, aktif) VALUES (?, ?, ?, 1)")
          .bind(p.id, kullanici.id, an),
        d
          .prepare(
            `UPDATE oyuncu_durumu SET mutluluk = MIN(100, COALESCE(mutluluk, 60) + 1)
              WHERE changes() = 1 AND ?4 = 0 AND kullanici_id = ?1
                AND (SELECT COUNT(*) FROM meydan_begeniler WHERE kullanici_id = ?2 AND olusturma >= ?3) <= ?5
                AND (SELECT COUNT(*) FROM meydan_begeniler b JOIN meydan_paylasimlari mp ON mp.id = b.paylasim_id
                      WHERE mp.kullanici_id = ?1 AND b.kullanici_id <> ?1 AND b.olusturma >= ?3) <= ?6`
          )
          .bind(p.kullanici_id, kullanici.id, gunBasi, kendisi, BEGENI_ODUL_GUNLUK, BEGENI_ALINAN_ODUL_GUNLUK),
      ]);
      if (degisen(ekle) && degisen(huzur)) bildirim = "💛 Beğendin! Yazarın köy huzuru arttı.";
    }
    return cevap(bildirim ? { bildirim } : {});
  }

  // 2. ŞİKÂYET: her öğrenci bir paylaşımı bir kez bildirebilir; 3 ayrı bildirim paylaşımı akıştan kaldırır
  if (tur === "sikayet") {
    const p = await d
      .prepare("SELECT id, kullanici_id FROM meydan_paylasimlari WHERE id = ? AND gizli = 0")
      .bind(Number(paylasimId))
      .first();
    if (!p) return hata("Bu paylaşım artık yok.", 404);
    if (p.kullanici_id === kullanici.id) return hata("Kendi paylaşımını bildiremezsin; istersen silmesi için öğretmenine söyleyebilirsin.");

    const temizSebep = temizMetin(sebep || "Uygunsuz içerik").slice(0, 200) || "Uygunsuz içerik";
    const s = await d
      .prepare("INSERT OR IGNORE INTO meydan_sikayetler (paylasim_id, kullanici_id, sebep, olusturma, durum) VALUES (?, ?, ?, ?, 'bekliyor')")
      .bind(p.id, kullanici.id, temizSebep, an)
      .run();
    if (!degisen(s)) return hata("Bu paylaşımı zaten bildirdin. Öğretmenin inceleyecek, teşekkürler!");

    await d
      .prepare(
        `UPDATE meydan_paylasimlari SET gizli = 1
          WHERE id = ?1 AND (SELECT COUNT(*) FROM meydan_sikayetler WHERE paylasim_id = ?1 AND durum = 'bekliyor') >= ?2`
      )
      .bind(p.id, GIZLEME_SIKAYET_SAYISI)
      .run();

    return cevap({ bildirim: "🚩 Bildirimin öğretmenine iletildi. Köyümüzün huzurunu koruduğun için teşekkürler!" });
  }

  if (tur !== "paylasim" && tur !== "yorum") return hata("Geçersiz işlem türü");

  const metin = temizMetin(icerik);
  const enAz = tur === "paylasim" ? 3 : 2;
  const enCok = tur === "paylasim" ? 600 : 300;
  if (metin.length < enAz || metin.length > enCok) {
    return hata(`Yazın ${enAz} ile ${enCok} karakter arasında olmalı (şu an ${metin.length}).`);
  }

  // 3. YENİ PAYLAŞIM
  if (tur === "paylasim") {
    const secilenKategori = kategori === "serbest" ? "serbest" : "gundem";
    const secilenAltTur = ["soz", "hikaye", "ani", "dua", "video"].includes(altTur) ? altTur : "soz";

    let medya = null;
    if (String(medyaUrl ?? "").trim()) {
      medya = medyaCoz(medyaUrl);
      if (!medya) return hata("Yalnızca youtube.com, youtu.be veya instagram.com bağlantıları paylaşılabilir.");
    }
    if (secilenAltTur === "video" && !medya) {
      return hata("Video paylaşmak için geçerli bir YouTube veya Instagram bağlantısı eklemelisin.");
    }

    const son = await d
      .prepare("SELECT icerik, olusturma FROM meydan_paylasimlari WHERE kullanici_id = ? ORDER BY olusturma DESC LIMIT 1")
      .bind(kullanici.id)
      .first();
    if (son && an - son.olusturma < PAYLASIM_ARALIK_MS) {
      return hata("Biraz yavaş 🙂 Yeni paylaşım için birkaç saniye bekle.", 429);
    }
    if (son && an - son.olusturma < 10 * 60_000 && icerikCoz(son.icerik).metin === metin) {
      return hata("Aynı paylaşımı az önce yaptın.", 429);
    }

    const zarf = JSON.stringify({
      v: 1,
      metin,
      kategori: secilenKategori,
      altTur: secilenAltTur,
      medyaUrl: medya?.url ?? "",
    });
    const eklenen = await d
      .prepare("INSERT INTO meydan_paylasimlari (kullanici_id, level, icerik, olusturma) VALUES (?, ?, ?, ?)")
      .bind(kullanici.id, durum.level, zarf, an)
      .run();
    const yeniId = Number(eklenen?.meta?.last_row_id ?? 0);

    // Bugünkü kaçıncı paylaşımım? (kendi id'm dahil, paralel isteklerde de sıra benzersizdir)
    const sira = (
      await d
        .prepare("SELECT COUNT(*) AS n FROM meydan_paylasimlari WHERE kullanici_id = ? AND olusturma >= ? AND id <= ?")
        .bind(kullanici.id, gunBasi, yeniId)
        .first()
    )?.n ?? 1;
    if (sira > PAYLASIM_TAVAN_GUNLUK) {
      await d.prepare("DELETE FROM meydan_paylasimlari WHERE id = ?").bind(yeniId).run();
      return hata(`Bugün en fazla ${PAYLASIM_TAVAN_GUNLUK} paylaşım yapabilirsin. Yarın yine buradayız!`, 429);
    }

    if (sira > PAYLASIM_ODUL_GUNLUK) {
      return cevap({
        bildirim: `Paylaşımın yayında! (Günde ilk ${PAYLASIM_ODUL_GUNLUK} paylaşım Huzur kazandırır; yarın yenisi başlar.)`,
      });
    }

    // Gündem içi paylaşım Köy Huzuru +3, serbest paylaşım +1
    const huzurArtisi = secilenKategori === "gundem" ? 3 : 1;
    durum = { ...durum, mutluluk: Math.min(100, (durum.mutluluk ?? 60) + huzurArtisi) };
    const ilerlet = gorevIlerlet(durum, "meydan_paylasim", simdi, ayarlar);
    if (ilerlet.durum) durum = ilerlet.durum;
    await durumYaz(kullanici.id, durum);
    await tesvikOdulunuKontrolEt(kullanici.id, oyunGunu(simdi));
    return cevap({ bildirim: `Paylaşımın yayında! Köy huzuru +${huzurArtisi} 🌿` });
  }

  // 4. YORUM
  const p = await d.prepare("SELECT id FROM meydan_paylasimlari WHERE id = ? AND gizli = 0").bind(Number(paylasimId)).first();
  if (!p) return hata("Bu paylaşım artık yok.", 404);

  const sonYorum = await d
    .prepare("SELECT paylasim_id, icerik, olusturma FROM meydan_yorumlar WHERE kullanici_id = ? ORDER BY olusturma DESC LIMIT 1")
    .bind(kullanici.id)
    .first();
  if (sonYorum && an - sonYorum.olusturma < YORUM_ARALIK_MS) {
    return hata("Biraz yavaş 🙂 Yeni yorum için birkaç saniye bekle.", 429);
  }
  if (sonYorum && sonYorum.paylasim_id === p.id && sonYorum.icerik === metin && an - sonYorum.olusturma < 10 * 60_000) {
    return hata("Aynı yorumu az önce yazdın.", 429);
  }

  const eklenen = await d
    .prepare("INSERT INTO meydan_yorumlar (paylasim_id, kullanici_id, icerik, olusturma) VALUES (?, ?, ?, ?)")
    .bind(p.id, kullanici.id, metin, an)
    .run();
  const yeniId = Number(eklenen?.meta?.last_row_id ?? 0);
  const sira = (
    await d
      .prepare("SELECT COUNT(*) AS n FROM meydan_yorumlar WHERE kullanici_id = ? AND olusturma >= ? AND id <= ?")
      .bind(kullanici.id, gunBasi, yeniId)
      .first()
  )?.n ?? 1;
  if (sira > YORUM_TAVAN_GUNLUK) {
    await d.prepare("DELETE FROM meydan_yorumlar WHERE id = ?").bind(yeniId).run();
    return hata(`Bugün en fazla ${YORUM_TAVAN_GUNLUK} yorum yazabilirsin. Yarın devam!`, 429);
  }
  if (sira > YORUM_ODUL_GUNLUK) {
    return cevap({ bildirim: "Yorumun eklendi! (Bugünkü yorum ödül sınırına ulaştın.)" });
  }

  const ilerlet = gorevIlerlet(durum, "meydan_yorum", simdi, ayarlar);
  if (ilerlet.durum) {
    durum = ilerlet.durum;
    await durumYaz(kullanici.id, durum);
  }
  await tesvikOdulunuKontrolEt(kullanici.id, oyunGunu(simdi));
  return cevap();
}
