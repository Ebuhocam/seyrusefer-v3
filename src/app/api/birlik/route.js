import { db } from "@/lib/sunucu/db";
import { durumGetir, oyunSaati } from "@/lib/sunucu/oyunDeposu";
import { oyunAyarlariniGetir, sonGunler, BIRLIK_UYE_SINIRI_VARSAYILAN } from "@/lib/sunucu/ayarlarDeposu";
import { govde, hata, oturumZorunlu, oyunYaniti } from "@/lib/sunucu/api";
import { BIRLIK_ACILIS_LEVEL, ALAN_MUCADELESI_LEVEL, BIRLIK_BINALARI, BOLGELER, KAYNAKLAR } from "@/lib/oyun/sabitler";
import { bedelKontrol } from "@/lib/oyun/kurallar";
import { oyunGunu } from "@/lib/oyun/gorevler";

// Birlik kasası yalnızca bu üç kaynağı tutar (👥 İnsan bağışlanamaz, harcanamaz)
const KASA_KAYNAKLARI = ["erzak", "kereste", "tas"];
const EN_AZ_BAGIS = 10;
const EN_COK_BAGIS = 100000;
const DISIPLIN_GUN = 7;
const MESAJ_ARALIK_MS = 3000;
const SANCAK_RENGI_VARSAYILAN = "#d97706";

/** Görünmez/kontrol karakterlerini atar, boşlukları sadeleştirir */
function temizMetin(v, cokSatir = false) {
  let s = String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "");
  s = cokSatir ? s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n") : s.replace(/\s+/g, " ");
  return s.trim();
}

const kucukHarf = (s) => String(s).toLocaleLowerCase("tr");

/** Sadece kasada tutulan kaynakların pozitif tam sayı bedelini döner */
function kasaBedeli(bedel) {
  const sonuc = {};
  for (const k of KASA_KAYNAKLARI) {
    const m = Math.floor(Number(bedel?.[k]) || 0);
    sonuc[k] = m > 0 ? m : 0;
  }
  return sonuc;
}

const bedelMetni = (bedel) =>
  KASA_KAYNAKLARI.filter((k) => bedel[k] > 0)
    .map((k) => `${bedel[k]} ${KAYNAKLAR[k]?.ad ?? k}`)
    .join(", ");

const eksikMetni = (eksik) =>
  Object.entries(eksik)
    .map(([k, m]) => `${m} ${KAYNAKLAR[k]?.ad ?? k}`)
    .join(", ");

/**
 * Birliğin son 7 günlük manevi disiplini.
 * Bir üye, o gün en az bir vakit namaz işaretlediyse veya bir görev ilerlettiyse "aktif" sayılır.
 * Disiplin = aktif (üye × gün) sayısı / (üye sayısı × 7).
 */
async function haftalikDisiplinGetir(d, birlikId, bugun) {
  const gunler = sonGunler(bugun, DISIPLIN_GUN);
  const yer = gunler.map(() => "?").join(",");
  const [namaz, gorev, uyeler] = await d.batch([
    d
      .prepare(
        `SELECT nc.kullanici_id AS kid, nc.tarih AS gun
           FROM namaz_cetelesi nc
           JOIN birlik_uyeleri u ON u.kullanici_id = nc.kullanici_id
          WHERE u.birlik_id = ? AND nc.tarih IN (${yer})
            AND (nc.sabah + nc.ogle + nc.ikindi + nc.aksam + nc.yatsi) > 0`
      )
      .bind(birlikId, ...gunler),
    d
      .prepare(
        `SELECT DISTINCT gi.kullanici_id AS kid, gi.son_gun AS gun
           FROM gorev_ilerlemesi gi
           JOIN birlik_uyeleri u ON u.kullanici_id = gi.kullanici_id
          WHERE u.birlik_id = ? AND gi.son_gun IN (${yer})`
      )
      .bind(birlikId, ...gunler),
    d.prepare("SELECT kullanici_id AS kid FROM birlik_uyeleri WHERE birlik_id = ?").bind(birlikId),
  ]);

  const aktifGunler = {};
  for (const u of uyeler.results ?? []) aktifGunler[u.kid] = new Set();
  for (const s of [...(namaz.results ?? []), ...(gorev.results ?? [])]) {
    aktifGunler[s.kid]?.add(s.gun);
  }
  const uyeSayisi = Object.keys(aktifGunler).length;
  const toplamAktif = Object.values(aktifGunler).reduce((t, kume) => t + kume.size, 0);
  const oran = uyeSayisi ? Math.round((toplamAktif / (uyeSayisi * DISIPLIN_GUN)) * 100) : 0;
  return {
    oran,
    uyeGunleri: Object.fromEntries(Object.entries(aktifGunler).map(([kid, kume]) => [kid, kume.size])),
  };
}

/** Bir hamlenin kazandıracağı güç: bölgenin temel gücü × son 7 günlük disiplin oranı */
const hamleGucu = (bolge, disiplinYuzde) => Math.round(((Number(bolge.temelGuc) || 0) * disiplinYuzde) / 100);

async function birlikDurumuGetir(kullaniciId, bugun, ayarlar = null) {
  const d = await db();
  const uyeSiniri = ayarlar?.birlik?.uyeSiniri ?? BIRLIK_UYE_SINIRI_VARSAYILAN;
  const uyelik = await d
    .prepare(
      `SELECT b.id, b.ad, b.slogan, b.renk, b.lider_id, b.erzak, b.kereste, b.tas,
              u.bagis_toplam, u.katki_puani
         FROM birlik_uyeleri u
         JOIN birlikler b ON b.id = u.birlik_id
        WHERE u.kullanici_id = ?`
    )
    .bind(kullaniciId)
    .first();

  // Tüm bölgelerin sıralaması. Eşitlikte o güce ÖNCE ulaşan birlik sancağı elinde tutar.
  const hamleler = await d
    .prepare(
      `SELECT h.bolge_id, h.birlik_id, h.guc, h.hamle_sayisi, h.guncelleme,
              b.ad AS birlik_ad, b.renk AS birlik_renk
         FROM bolge_hamleleri h
         JOIN birlikler b ON b.id = h.birlik_id
        WHERE h.guc > 0
        ORDER BY h.guc DESC, h.guncelleme ASC, h.birlik_id ASC`
    )
    .all();

  const bolgeHaritasi = {};
  for (const h of hamleler.results ?? []) {
    (bolgeHaritasi[h.bolge_id] ??= []).push(h);
  }

  const disiplin = uyelik ? await haftalikDisiplinGetir(d, uyelik.id, bugun) : { oran: 0, uyeGunleri: {} };
  const kasa = uyelik ? { erzak: uyelik.erzak, kereste: uyelik.kereste, tas: uyelik.tas } : null;

  const bolgeler = BOLGELER.map((b) => {
    const siralama = bolgeHaritasi[b.id] ?? [];
    const lider = siralama[0] ?? null;
    const bizimSira = uyelik ? siralama.findIndex((s) => s.birlik_id === uyelik.id) : -1;
    const bizim = bizimSira >= 0 ? siralama[bizimSira] : null;
    const bedel = kasaBedeli(b.bedel);
    return {
      ...b,
      bedel: Object.fromEntries(Object.entries(bedel).filter(([, m]) => m > 0)),
      lider: lider ? { birlikId: lider.birlik_id, ad: lider.birlik_ad, renk: lider.birlik_renk, guc: lider.guc } : null,
      bizimGuc: bizim?.guc ?? 0,
      bizimSira: bizimSira >= 0 ? bizimSira + 1 : null,
      bizde: !!uyelik && lider?.birlik_id === uyelik.id,
      // Sancağı almak için gereken güç farkı (eşitlikte ilk ulaşan tuttuğu için +1)
      liderFarki: lider && uyelik && lider.birlik_id !== uyelik.id ? lider.guc - (bizim?.guc ?? 0) + 1 : 0,
      tahminiGuc: uyelik ? hamleGucu(b, disiplin.oran) : 0,
      kasaYeterli: kasa ? bedelKontrol(bedel, kasa).yeterli : false,
      siralama: siralama.slice(0, 5),
    };
  });

  if (!uyelik) {
    const acikBirlikler = await d
      .prepare(
        `SELECT b.id, b.ad, b.slogan, b.renk, COUNT(u.kullanici_id) AS uye_sayisi,
                (SELECT k.ad FROM kullanicilar k WHERE k.id = b.lider_id) AS lider_ad
           FROM birlikler b
           LEFT JOIN birlik_uyeleri u ON u.birlik_id = b.id
          GROUP BY b.id
          ORDER BY uye_sayisi DESC, b.id DESC
          LIMIT 60`
      )
      .all();
    return {
      birlik: null,
      uyeSiniri,
      acikBirlikler: (acikBirlikler.results ?? []).map((b) => ({ ...b, dolu: b.uye_sayisi >= uyeSiniri })),
      bolgeler,
    };
  }

  const [uyeler, gonderilenTesvikler, gelenTesvikler, binalarSor, mesajlarSor] = await d.batch([
    d
      .prepare(
        `SELECT k.id, k.ad, k.kullanici_adi, COALESCE(od.level, 1) AS level,
                u.bagis_toplam, u.katki_puani, u.katilma,
                COALESCE(nc.sabah + nc.ogle + nc.ikindi + nc.aksam + nc.yatsi, 0) AS bugun_namaz,
                EXISTS(
                  SELECT 1 FROM gorev_ilerlemesi gi
                   WHERE gi.kullanici_id = k.id AND gi.son_gun = ?2
                  UNION
                  SELECT 1 FROM namaz_cetelesi nc2
                   WHERE nc2.kullanici_id = k.id AND nc2.tarih = ?2
                     AND (nc2.sabah + nc2.ogle + nc2.ikindi + nc2.aksam + nc2.yatsi) > 0
                ) AS bugun_aktif
           FROM birlik_uyeleri u
           JOIN kullanicilar k ON k.id = u.kullanici_id
           LEFT JOIN oyuncu_durumu od ON od.kullanici_id = k.id
           LEFT JOIN namaz_cetelesi nc ON nc.kullanici_id = k.id AND nc.tarih = ?2
          WHERE u.birlik_id = ?1
          ORDER BY u.katki_puani DESC, u.bagis_toplam DESC, u.katilma ASC`
      )
      .bind(uyelik.id, bugun),
    d
      .prepare("SELECT alici_id FROM birlik_tesvikler WHERE gonderen_id = ? AND gun = ?")
      .bind(kullaniciId, bugun),
    d
      .prepare(
        `SELECT t.id, t.karsilandi, k.ad AS gonderen_ad
           FROM birlik_tesvikler t
           JOIN kullanicilar k ON k.id = t.gonderen_id
          WHERE t.alici_id = ?1 AND t.gun = ?2 AND t.birlik_id = ?3`
      )
      .bind(kullaniciId, bugun, uyelik.id),
    d.prepare("SELECT bina_id, seviye FROM birlik_binalari WHERE birlik_id = ?").bind(uyelik.id),
    d
      .prepare(
        `SELECT m.id, m.kullanici_id, m.mesaj, m.olusturma, k.ad AS yazar_ad
           FROM birlik_mesajlari m
           JOIN kullanicilar k ON k.id = m.kullanici_id
          WHERE m.birlik_id = ?
          ORDER BY m.olusturma DESC, m.id DESC
          LIMIT 40`
      )
      .bind(uyelik.id),
  ]);

  const tesvikEdilenler = new Set((gonderilenTesvikler.results ?? []).map((t) => t.alici_id));
  const uyeListesi = (uyeler.results ?? []).map((u) => ({
    id: u.id,
    ad: u.ad,
    kullaniciAdi: u.kullanici_adi,
    level: u.level,
    bagisToplam: u.bagis_toplam,
    katkiPuani: u.katki_puani,
    bugunNamaz: u.bugun_namaz ?? 0,
    bugunAktif: !!u.bugun_aktif,
    aktifGun7: disiplin.uyeGunleri[u.id] ?? 0,
    bugunTesvikEdildi: tesvikEdilenler.has(u.id),
  }));

  const binalar = Object.fromEntries(Object.keys(BIRLIK_BINALARI).map((k) => [k, 1]));
  for (const b of binalarSor.results ?? []) {
    if (BIRLIK_BINALARI[b.bina_id]) binalar[b.bina_id] = b.seviye;
  }

  const aktifSayisi = uyeListesi.filter((u) => u.bugunAktif).length;
  const disiplinOrani = uyeListesi.length ? Math.round((aktifSayisi / uyeListesi.length) * 100) : 0;
  const namazToplam = uyeListesi.reduce((t, u) => t + (u.bugunNamaz || 0), 0);

  return {
    birlik: {
      id: uyelik.id,
      ad: uyelik.ad,
      slogan: uyelik.slogan,
      renk: uyelik.renk,
      liderId: uyelik.lider_id,
      benLider: uyelik.lider_id === kullaniciId,
      kasa,
      binalar,
      mesajlar: (mesajlarSor.results ?? []).reverse(),
      namazToplam,
      disiplinOrani, // bugün aktif olan üyelerin oranı
      haftalikDisiplin: disiplin.oran, // son 7 gün — fetih gücünü bu belirler
      uyeSiniri,
      uyeler: uyeListesi,
      gelenTesvikler: gelenTesvikler.results ?? [],
    },
    uyeSiniri,
    acikBirlikler: [],
    bolgeler,
  };
}

export async function GET() {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  const [durum, ayarlar] = await Promise.all([durumGetir(kullanici.id), oyunAyarlariniGetir()]);
  const bugun = oyunGunu(oyunSaati(durum));
  return Response.json(await birlikDurumuGetir(kullanici.id, bugun, ayarlar));
}

const degisen = (sonuc) => Number(sonuc?.meta?.changes ?? 0);

export async function POST(request) {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;

  const g = await govde(request);
  let [durum, ayarlar] = await Promise.all([durumGetir(kullanici.id), oyunAyarlariniGetir()]);
  const simdi = oyunSaati(durum);
  const bugun = oyunGunu(simdi);
  const uyeSiniri = ayarlar?.birlik?.uyeSiniri ?? BIRLIK_UYE_SINIRI_VARSAYILAN;
  const d = await db();
  const ek = {};

  const uyelikGetir = () =>
    d
      .prepare(
        `SELECT u.birlik_id, b.lider_id, b.ad
           FROM birlik_uyeleri u JOIN birlikler b ON b.id = u.birlik_id
          WHERE u.kullanici_id = ?`
      )
      .bind(kullanici.id)
      .first();

  // Birlikten ayrılmak her zaman mümkündür (örn. öğretmen leveli düşürdüyse öğrenci birlikte kilitli kalmasın)
  if (g.eylem !== "ayril" && durum.level < BIRLIK_ACILIS_LEVEL) {
    return hata(`Birlik Alanı Level ${BIRLIK_ACILIS_LEVEL}'te açılır. Önce köyünü biraz daha geliştir!`, 403);
  }

  if (g.eylem === "kur") {
    const ad = temizMetin(g.ad);
    const slogan = temizMetin(g.slogan).slice(0, 80);
    const renk = typeof g.renk === "string" && /^#[0-9a-fA-F]{6}$/.test(g.renk) ? g.renk : SANCAK_RENGI_VARSAYILAN;
    if (ad.length < 3 || ad.length > 28) return hata("Birlik adı 3 ile 28 karakter arasında olmalı.");
    if (!/[\p{L}]/u.test(ad)) return hata("Birlik adında en az bir harf olmalı.");

    if (await uyelikGetir()) return hata("Zaten bir birliğin üyesisin. Yeni birlik kurmak için önce ayrılmalısın.");

    const adlar = await d.prepare("SELECT ad FROM birlikler").all();
    if ((adlar.results ?? []).some((b) => kucukHarf(b.ad) === kucukHarf(ad))) {
      return hata("Bu birlik adı zaten kullanılıyor. Başka bir ad dener misin?", 409);
    }

    // Birlik ve kurucu üyeliği tek işlemde yazılır: biri başarısız olursa diğeri de geri alınır
    const an = Date.now();
    try {
      await d.batch([
        d
          .prepare("INSERT INTO birlikler (ad, slogan, renk, lider_id, olusturma) VALUES (?, ?, ?, ?, ?)")
          .bind(ad, slogan, renk, kullanici.id, an),
        d
          .prepare(
            `INSERT INTO birlik_uyeleri (kullanici_id, birlik_id, katilma)
             SELECT ?1, id, ?2 FROM birlikler WHERE ad = ?3`
          )
          .bind(kullanici.id, an, ad),
      ]);
    } catch {
      return hata("Birlik kurulamadı: bu ad az önce alınmış ya da zaten bir birliktesin.", 409);
    }
  } else if (g.eylem === "katil") {
    const birlikId = Number(g.birlikId);
    if (!Number.isInteger(birlikId)) return hata("Birlik bulunamadı.", 404);
    const b = await d.prepare("SELECT id, ad FROM birlikler WHERE id = ?").bind(birlikId).first();
    if (!b) return hata("Bu birlik artık yok. Listeyi yenileyip başka bir birlik seçebilirsin.", 404);
    if (await uyelikGetir()) return hata("Zaten bir birliğin üyesisin.");

    // Kontenjan kontrolü ve ekleme tek SQL ifadesinde: aynı anda gelen istekler sınırı aşamaz
    let eklendi = 0;
    try {
      const s = await d
        .prepare(
          `INSERT INTO birlik_uyeleri (kullanici_id, birlik_id, katilma)
           SELECT ?1, ?2, ?3
            WHERE (SELECT COUNT(*) FROM birlik_uyeleri WHERE birlik_id = ?2) < ?4`
        )
        .bind(kullanici.id, birlikId, Date.now(), uyeSiniri)
        .run();
      eklendi = degisen(s);
    } catch {
      return hata("Zaten bir birliğin üyesisin.");
    }
    if (!eklendi) return hata(`${b.ad} birliği dolu (en fazla ${uyeSiniri} kişi). Başka bir birliğe katılabilir ya da kendi birliğini kurabilirsin.`, 409);

    // Üyesi kalmamış (sahipsiz) bir birliğe katılan ilk kişi lider olur
    await d
      .prepare(
        `UPDATE birlikler SET lider_id = ?1
          WHERE id = ?2 AND lider_id NOT IN (SELECT kullanici_id FROM birlik_uyeleri WHERE birlik_id = ?2)`
      )
      .bind(kullanici.id, birlikId)
      .run();
  } else if (g.eylem === "ayril") {
    const uyelik = await uyelikGetir();
    if (!uyelik) return hata("Herhangi bir birliğe üye değilsin.");

    await d.batch([
      d.prepare("DELETE FROM birlik_uyeleri WHERE kullanici_id = ?").bind(kullanici.id),
      // Lider ayrıldıysa liderlik, birlikte en uzun süredir bulunan üyeye geçer
      d
        .prepare(
          `UPDATE birlikler
              SET lider_id = COALESCE(
                    (SELECT kullanici_id FROM birlik_uyeleri WHERE birlik_id = ?1 ORDER BY katilma ASC, kullanici_id ASC LIMIT 1),
                    lider_id)
            WHERE id = ?1 AND lider_id = ?2`
        )
        .bind(uyelik.birlik_id, kullanici.id),
      // Son üye de ayrıldıysa birlik (kasası, binaları, sancakları ve sohbetiyle) dağılır
      d
        .prepare("DELETE FROM birlikler WHERE id = ?1 AND NOT EXISTS (SELECT 1 FROM birlik_uyeleri WHERE birlik_id = ?1)")
        .bind(uyelik.birlik_id),
    ]);
  } else if (g.eylem === "uyeCikar" || g.eylem === "liderDevret") {
    const hedefId = Number(g.uyeId);
    const uyelik = await uyelikGetir();
    if (!uyelik) return hata("Önce bir birliğe katılmalısın.");
    if (uyelik.lider_id !== kullanici.id) return hata("Bunu yalnızca birlik lideri yapabilir.", 403);
    if (!Number.isInteger(hedefId) || hedefId === kullanici.id) return hata("Geçersiz üye.");
    const hedef = await d
      .prepare("SELECT 1 FROM birlik_uyeleri WHERE kullanici_id = ? AND birlik_id = ?")
      .bind(hedefId, uyelik.birlik_id)
      .first();
    if (!hedef) return hata("Bu öğrenci senin birliğinde değil.", 404);

    if (g.eylem === "uyeCikar") {
      await d
        .prepare("DELETE FROM birlik_uyeleri WHERE kullanici_id = ? AND birlik_id = ?")
        .bind(hedefId, uyelik.birlik_id)
        .run();
    } else {
      await d
        .prepare("UPDATE birlikler SET lider_id = ?1 WHERE id = ?2 AND lider_id = ?3")
        .bind(hedefId, uyelik.birlik_id, kullanici.id)
        .run();
    }
  } else if (g.eylem === "bagis") {
    const kaynak = g.kaynak;
    const miktar = Number(g.miktar);
    if (!KASA_KAYNAKLARI.includes(kaynak)) return hata("Kasaya yalnızca Mahsul, Odun veya Taş bağışlanabilir.");
    if (!Number.isInteger(miktar) || miktar < EN_AZ_BAGIS || miktar > EN_COK_BAGIS) {
      return hata(`Bağış miktarı en az ${EN_AZ_BAGIS} olmalı ve tam sayı girilmeli.`);
    }
    const uyelik = await uyelikGetir();
    if (!uyelik) return hata("Önce bir birliğe katılmalısın.");
    if ((durum.envanter[kaynak] ?? 0) < miktar) {
      return hata(`Deponda o kadar ${KAYNAKLAR[kaynak].ad} yok (şu an ${durum.envanter[kaynak] ?? 0}).`);
    }

    // Depodan düşme "yeterliyse düş" koşuluyla tek SQL ifadesidir; kasaya ekleme yalnızca düşme
    // gerçekleştiyse (changes() = 1) yapılır. Aynı anda iki kez gönderilen bağış, kaynağı çoğaltamaz.
    const [dusme] = await d.batch([
      d
        .prepare(
          `UPDATE kaynaklar SET envanter = envanter - ?1
            WHERE kullanici_id = ?2 AND kaynak = ?3 AND envanter >= ?1`
        )
        .bind(miktar, kullanici.id, kaynak),
      d
        .prepare(`UPDATE birlikler SET ${kaynak} = ${kaynak} + ?1 WHERE changes() = 1 AND id = ?2`)
        .bind(miktar, uyelik.birlik_id),
      d
        .prepare(
          `UPDATE birlik_uyeleri SET bagis_toplam = bagis_toplam + ?1, katki_puani = katki_puani + ?2
            WHERE changes() = 1 AND kullanici_id = ?3`
        )
        .bind(miktar, Math.floor(miktar / 10), kullanici.id),
    ]);
    if (!degisen(dusme)) return hata("Deponda yeterli kaynak kalmamış. Sayfayı yenileyip tekrar dener misin?", 409);
    durum = await durumGetir(kullanici.id);
  } else if (g.eylem === "mesajYaz") {
    const mesaj = temizMetin(g.mesaj, true);
    if (mesaj.length < 2 || mesaj.length > 280) return hata("Mesaj 2 ile 280 karakter arasında olmalı.");

    const uyelik = await uyelikGetir();
    if (!uyelik) return hata("Önce bir birliğe katılmalısın.");

    const son = await d
      .prepare("SELECT mesaj, olusturma FROM birlik_mesajlari WHERE kullanici_id = ? ORDER BY olusturma DESC LIMIT 1")
      .bind(kullanici.id)
      .first();
    if (son && Date.now() - son.olusturma < MESAJ_ARALIK_MS) {
      return hata("Biraz yavaş 🙂 Yeni mesaj için birkaç saniye bekle.", 429);
    }
    if (son && son.mesaj === mesaj && Date.now() - son.olusturma < 10 * 60 * 1000) {
      return hata("Aynı mesajı az önce yazdın.", 429);
    }

    // Sohbet mesajı katkı puanı vermez (mesaj yağdırarak puan kasılamaz)
    await d
      .prepare("INSERT INTO birlik_mesajlari (birlik_id, kullanici_id, mesaj, olusturma) VALUES (?, ?, ?, ?)")
      .bind(uyelik.birlik_id, kullanici.id, mesaj, Date.now())
      .run();
  } else if (g.eylem === "mesajSil") {
    const mesajId = Number(g.mesajId);
    const uyelik = await uyelikGetir();
    if (!uyelik) return hata("Önce bir birliğe katılmalısın.");
    const s = await d
      .prepare(
        `DELETE FROM birlik_mesajlari
          WHERE id = ?1 AND birlik_id = ?2 AND (kullanici_id = ?3 OR ?4 = 1)`
      )
      .bind(mesajId, uyelik.birlik_id, kullanici.id, uyelik.lider_id === kullanici.id ? 1 : 0)
      .run();
    if (!degisen(s)) return hata("Bu mesajı silemezsin (yalnızca kendi mesajını ya da liderysen birliğin mesajlarını silebilirsin).", 403);
  } else if (g.eylem === "binaYukselt") {
    const binaId = g.binaId;
    const tanim = typeof binaId === "string" && Object.hasOwn(BIRLIK_BINALARI, binaId) ? BIRLIK_BINALARI[binaId] : null;
    if (!tanim) return hata("Geçersiz birlik binası.");

    const veri = await birlikDurumuGetir(kullanici.id, bugun, ayarlar);
    if (!veri.birlik) return hata("Önce bir birliğe katılmalısın.");

    const mevcutSeviye = veri.birlik.binalar?.[binaId] ?? 1;
    if (mevcutSeviye >= tanim.maksSeviye) return hata("Bu birlik binası zaten en üst seviyede.");

    const hedefSeviye = mevcutSeviye + 1;
    if (!tanim.bedel?.[hedefSeviye]) return hata("Bu seviye için bedel tanımlı değil; öğretmenine haber ver.");
    const bedel = kasaBedeli(tanim.bedel[hedefSeviye]);
    const kontrol = bedelKontrol(bedel, veri.birlik.kasa);
    if (!kontrol.yeterli) {
      return hata(`Birlik kasasında yeterli kaynak yok. Eksik: ${eksikMetni(kontrol.eksik)}. Kardeşlerinle kasaya bağış yapın!`);
    }

    // Ödeme; "kasa yeterli VE bina hâlâ aynı seviyede" koşuluyla tek ifadedir. Seviye yalnızca ödeme
    // gerçekleştiyse yükselir. Çift tıklama iki kez ödetemez, kasa eksiye düşemez.
    const [odeme] = await d.batch([
      d
        .prepare(
          `UPDATE birlikler SET erzak = erzak - ?1, kereste = kereste - ?2, tas = tas - ?3
            WHERE id = ?4 AND erzak >= ?1 AND kereste >= ?2 AND tas >= ?3
              AND COALESCE((SELECT seviye FROM birlik_binalari WHERE birlik_id = ?4 AND bina_id = ?5), 1) = ?6`
        )
        .bind(bedel.erzak, bedel.kereste, bedel.tas, veri.birlik.id, binaId, mevcutSeviye),
      d
        .prepare(
          `INSERT INTO birlik_binalari (birlik_id, bina_id, seviye)
           SELECT ?1, ?2, ?3 WHERE changes() = 1
           ON CONFLICT(birlik_id, bina_id) DO UPDATE SET seviye = excluded.seviye`
        )
        .bind(veri.birlik.id, binaId, hedefSeviye),
      d
        .prepare("UPDATE birlik_uyeleri SET katki_puani = katki_puani + 20 WHERE changes() = 1 AND kullanici_id = ?")
        .bind(kullanici.id),
    ]);
    if (!degisen(odeme)) {
      return hata("Yükseltme yapılamadı: kasa az önce değişti ya da bina zaten yükseltildi. Tekrar bakar mısın?", 409);
    }
    ek.bildirim = `${tanim.ad} Seviye ${hedefSeviye} oldu! Kasadan ${bedelMetni(bedel)} harcandı.`;
  } else if (g.eylem === "tesvik") {
    const aliciId = Number(g.aliciId);
    if (!Number.isInteger(aliciId) || aliciId === kullanici.id) return hata("Kendine teşvik gönderemezsin 🙂");

    const veri = await birlikDurumuGetir(kullanici.id, bugun, ayarlar);
    if (!veri.birlik) return hata("Önce bir birliğe katılmalısın.");
    const alici = veri.birlik.uyeler.find((u) => u.id === aliciId);
    if (!alici) return hata("Sadece kendi birliğindeki arkadaşlarını teşvik edebilirsin.", 403);
    if (alici.bugunTesvikEdildi) return hata("Bu arkadaşına bugün zaten teşvik gönderdin.");
    if (alici.bugunAktif) return hata(`${alici.ad} bugün görevine başlamış bile. Teşvik, henüz başlamamış kardeşler içindir.`);

    // Puan gönderirken değil, arkadaşın o gün görev yapınca ikinize birden yazılır (tesvikOdulunuKontrolEt)
    const s = await d
      .prepare(
        "INSERT OR IGNORE INTO birlik_tesvikler (birlik_id, gonderen_id, alici_id, gun, olusturma) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(veri.birlik.id, kullanici.id, aliciId, bugun, Date.now())
      .run();
    if (!degisen(s)) return hata("Bu arkadaşına bugün zaten teşvik gönderdin.");
  } else if (g.eylem === "fetihHamlesi") {
    if (durum.level < ALAN_MUCADELESI_LEVEL) {
      return hata(`Genel Harita Level ${ALAN_MUCADELESI_LEVEL}'da açılır. Biraz daha sabır!`, 403);
    }
    const bolge = BOLGELER.find((b) => b.id === g.bolgeId);
    if (!bolge) return hata("Geçersiz bölge.");

    const veri = await birlikDurumuGetir(kullanici.id, bugun, ayarlar);
    if (!veri.birlik) return hata("Hamle yapabilmek için önce bir birliğe katılmalısın.");

    const bedel = kasaBedeli(bolge.bedel);
    const kontrol = bedelKontrol(bedel, veri.birlik.kasa);
    if (!kontrol.yeterli) {
      return hata(`Birlik kasasında bu hamle için yeterli kaynak yok. Eksik: ${eksikMetni(kontrol.eksik)}.`);
    }

    // Güç = bölgenin temel gücü × birliğin son 7 günlük görev/namaz disiplini.
    // Kaynak tek başına yetmez: disiplin sıfırsa hamle güç kazandırmaz, bu yüzden kasa da harcatılmaz.
    const kazanilanGuc = hamleGucu(bolge, veri.birlik.haftalikDisiplin);
    if (kazanilanGuc <= 0) {
      return hata(
        "Birliğin son 7 günde hiç görev ya da namaz işaretlememiş; hamlenin gücü 0 olurdu. Önce kardeşlerinle günlük görevleri yapın, sonra sancağa yürüyün!"
      );
    }

    const an = Date.now();
    const [odeme] = await d.batch([
      d
        .prepare(
          `UPDATE birlikler SET erzak = erzak - ?1, kereste = kereste - ?2, tas = tas - ?3
            WHERE id = ?4 AND erzak >= ?1 AND kereste >= ?2 AND tas >= ?3`
        )
        .bind(bedel.erzak, bedel.kereste, bedel.tas, veri.birlik.id),
      d
        .prepare(
          `INSERT INTO bolge_hamleleri (bolge_id, birlik_id, guc, hamle_sayisi, guncelleme)
           SELECT ?1, ?2, ?3, 1, ?4 WHERE changes() = 1
           ON CONFLICT(bolge_id, birlik_id) DO UPDATE SET
             guc = bolge_hamleleri.guc + excluded.guc,
             hamle_sayisi = bolge_hamleleri.hamle_sayisi + 1,
             guncelleme = excluded.guncelleme`
        )
        .bind(bolge.id, veri.birlik.id, kazanilanGuc, an),
      d
        .prepare("UPDATE birlik_uyeleri SET katki_puani = katki_puani + 15 WHERE changes() = 1 AND kullanici_id = ?")
        .bind(kullanici.id),
    ]);
    if (!degisen(odeme)) {
      return hata("Hamle yapılamadı: kasa az önce başka bir işte kullanıldı. Kasaya bakıp tekrar dener misin?", 409);
    }

    const sonrasi = await birlikDurumuGetir(kullanici.id, bugun, ayarlar);
    const b = sonrasi.bolgeler.find((x) => x.id === bolge.id);
    const oncekiLider = veri.bolgeler.find((x) => x.id === bolge.id)?.lider ?? null;
    const sancakAlindi = !!b?.bizde && oncekiLider?.birlikId !== veri.birlik.id;
    const liderGucu = b?.lider?.guc ?? 0;
    // Sonuç: aldi (sancak bizde, yeni) | guclendi (zaten bizdeydi) | esit (liderle eşit; önce ulaşan tutar) | geride
    const sonuc = b?.bizde ? (sancakAlindi ? "aldi" : "guclendi") : (b?.bizimGuc ?? 0) === liderGucu ? "esit" : "geride";
    ek.hamleSonucu = {
      sonuc,
      harcanan: bedel,
      bolgeId: bolge.id,
      bolgeAd: bolge.ad,
      kazanilanGuc,
      disiplin: veri.birlik.haftalikDisiplin,
      toplamGuc: b?.bizimGuc ?? kazanilanGuc,
      bizde: !!b?.bizde,
      sancakAlindi,
      oncekiSahip: sancakAlindi ? oncekiLider?.ad ?? null : null,
      lider: b?.lider?.ad ?? null,
      liderFarki: b?.liderFarki ?? 0,
    };
    ek.bildirim = b?.bizde
      ? sancakAlindi
        ? `🚩 ${bolge.ad} artık sizin! +${kazanilanGuc} güç ile sancağı diktiniz.`
        : `🚩 ${bolge.ad} sancağınız güçlendi: +${kazanilanGuc} güç (toplam ${b.bizimGuc}).`
      : `⚔️ +${kazanilanGuc} güç kazandınız ama ${bolge.ad} hâlâ ${b?.lider?.ad ?? "başka bir birlik"} elinde. Sancak için ${b?.liderFarki ?? "?"} güç daha gerekli.`;
    return oyunYaniti(kullanici, durum, { ...sonrasi, ...ek }, ayarlar);
  } else {
    return hata("Bilinmeyen birlik eylemi.");
  }

  const guncelBirlik = await birlikDurumuGetir(kullanici.id, bugun, ayarlar);
  return oyunYaniti(kullanici, durum, { ...guncelBirlik, ...ek }, ayarlar);
}
