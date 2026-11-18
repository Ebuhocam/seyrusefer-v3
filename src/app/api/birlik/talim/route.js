import { db } from "@/lib/sunucu/db";
import { durumGetir, oyunSaati } from "@/lib/sunucu/oyunDeposu";
import { govde, hata, oturumZorunlu } from "@/lib/sunucu/api";
import { BIRLIK_ACILIS_LEVEL } from "@/lib/oyun/sabitler";
import { trGunNo } from "@/lib/oyun/kurallar";
import { oyunGunu } from "@/lib/oyun/gorevler";
import {
  TALIM_ARAZILERI,
  TALIM_GUNLUK_TEMEL_HAK,
  TALIM_HUCRELERI,
  TALIM_SORU_SAYISI,
  TALIM_SORU_SURE_SN,
  talimHaftasi,
  talimHucresi,
} from "@/lib/oyun/talim";
import { SORU_BANKASI } from "@/lib/oyun/soruBankasi";
import { ekTablolariHazirla, uyelikBul } from "@/lib/sunucu/ekTablolar";

const SORU_HARITASI = new Map(SORU_BANKASI.map((s) => [s.id, s]));
const DUELLO_PAY_MS = 25_000; // ağ gecikmesi payı

/**
 * Günlük talim hakkı: 1 temel + bugün görev yaptıysa +1 + en az bir vakit namaz işaretlediyse +1
 * + Ders Köşesi'nde bugün en az 30 dk çalıştıysa +1 (en çok 4). Görevini yapan öğrenci güçlenir.
 */
async function haklariHesapla(d, kullaniciId, durum, simdi) {
  const gunNo = trGunNo(simdi);
  const bugun = oyunGunu(simdi);
  const gorevYapti = Object.values(durum.gorevIlerlemesi ?? {}).some((g) => g?.sonGun === bugun);
  const namazKildi = Object.values(durum.bugunNamaz ?? {}).some(Boolean);
  const [ders, kullanim] = await d.batch([
    d
      .prepare(`SELECT COALESCE(SUM(dakika), 0) AS t FROM ders_calisma WHERE kullanici_id = ?1 AND gun = ?2 AND bitis IS NOT NULL`)
      .bind(kullaniciId, gunNo),
    d.prepare(`SELECT kullanilan FROM talim_kullanim WHERE kullanici_id = ?1 AND gun = ?2`).bind(kullaniciId, gunNo),
  ]);
  const dersYapti = Number(ders.results?.[0]?.t ?? 0) >= 30;
  const kaynaklar = { temel: TALIM_GUNLUK_TEMEL_HAK, gorev: gorevYapti ? 1 : 0, namaz: namazKildi ? 1 : 0, ders: dersYapti ? 1 : 0 };
  const toplam = Object.values(kaynaklar).reduce((a, b) => a + b, 0);
  const kullanilan = Number(kullanim.results?.[0]?.kullanilan ?? 0);
  return { gunNo, toplam, kullanilan, kalan: Math.max(0, toplam - kullanilan), kaynaklar };
}

async function haritaDurumu(d, kullaniciId, uyelik, durum, simdi) {
  const gunNo = trGunNo(simdi);
  const hafta = talimHaftasi(gunNo);
  const [sahipler, gecen] = await d.batch([
    d
      .prepare(
        `SELECT tb.hucre, tb.birlik_id, tb.takviye, tb.guncelleme, b.ad AS birlik_ad, b.renk, k.ad AS alan_ad
           FROM talim_bolgeleri tb
           JOIN birlikler b ON b.id = tb.birlik_id
           LEFT JOIN kullanicilar k ON k.id = tb.kullanici_id
          WHERE tb.hafta = ?1`
      )
      .bind(hafta),
    d
      .prepare(
        `SELECT tb.birlik_id, b.ad, b.renk, COUNT(*) AS sayi FROM talim_bolgeleri tb JOIN birlikler b ON b.id = tb.birlik_id
          WHERE tb.hafta = ?1 GROUP BY tb.birlik_id ORDER BY sayi DESC LIMIT 1`
      )
      .bind(hafta - 1),
  ]);
  const sahipHarita = new Map((sahipler.results ?? []).map((r) => [r.hucre, r]));
  const hucreler = TALIM_HUCRELERI.map((h) => {
    const s = sahipHarita.get(h.id);
    return {
      ...h,
      hedef: TALIM_ARAZILERI[h.arazi].hedef,
      sahip: s ? { birlikId: s.birlik_id, ad: s.birlik_ad, renk: s.renk, takviye: s.takviye, alan: s.alan_ad, zaman: s.guncelleme } : null,
    };
  });
  const sayac = new Map();
  for (const h of hucreler) {
    if (!h.sahip) continue;
    const e = sayac.get(h.sahip.birlikId) ?? { birlikId: h.sahip.birlikId, ad: h.sahip.ad, renk: h.sahip.renk, sayi: 0 };
    e.sayi += 1;
    sayac.set(h.sahip.birlikId, e);
  }
  const siralama = [...sayac.values()].sort((a, b) => b.sayi - a.sayi);
  // Pazartesiye kalan gün (hafta sonunda sıfırlanır)
  const haftaBitisGun = hafta * 7 - 3 + 7;
  return {
    hafta,
    kalanGun: Math.max(1, haftaBitisGun - gunNo),
    hucreler,
    siralama,
    gecenHaftaSancaktari: gecen.results?.[0] ?? null,
    benimBirlik: uyelik ? { id: uyelik.birlik_id, ad: uyelik.ad, renk: uyelik.renk } : null,
    haklar: await haklariHesapla(d, kullaniciId, durum, simdi),
    kurallar: { soruSayisi: TALIM_SORU_SAYISI, soruSureSn: TALIM_SORU_SURE_SN, araziler: TALIM_ARAZILERI },
  };
}

/** Zorluk listesine göre, yarısı Din Kültürü olacak şekilde rastgele soru seçer */
function sorulariSec(zorluklar) {
  const secilen = [];
  const kullanildi = new Set();
  const dinSirasi = zorluklar.map((_, i) => i % 2 === 0); // 1., 3., 5. soru din; 2., 4. genel (rastgele karıştırılır)
  if (Math.random() < 0.5) dinSirasi.reverse();
  zorluklar.forEach((z, i) => {
    const kategori = dinSirasi[i] ? "din" : "genel";
    let aday = SORU_BANKASI.filter((s) => s.kategori === kategori && s.zorluk === z && !kullanildi.has(s.id));
    if (!aday.length) aday = SORU_BANKASI.filter((s) => s.kategori === kategori && !kullanildi.has(s.id));
    const s = aday[Math.floor(Math.random() * aday.length)];
    kullanildi.add(s.id);
    secilen.push(s);
  });
  return secilen.sort(() => Math.random() - 0.5);
}

export async function GET() {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  const d = await db();
  await ekTablolariHazirla(d);
  const durum = await durumGetir(kullanici.id);
  const uyelik = await uyelikBul(d, kullanici.id);
  return Response.json(await haritaDurumu(d, kullanici.id, uyelik, durum, oyunSaati(durum)));
}

export async function POST(request) {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  const g = await govde(request);
  const d = await db();
  await ekTablolariHazirla(d);
  const durum = await durumGetir(kullanici.id);
  const simdi = oyunSaati(durum);
  if ((durum.level ?? 1) < BIRLIK_ACILIS_LEVEL) return hata(`Talimhane Level ${BIRLIK_ACILIS_LEVEL}'te açılır.`, 403);
  const uyelik = await uyelikBul(d, kullanici.id);
  if (!uyelik) return hata("Sancak Talimi için önce bir birliğe katılmalısın.");
  const an = Date.now();

  if (g.islem === "basla") {
    const hucre = talimHucresi(String(g.hucre ?? ""));
    if (!hucre) return hata("Geçersiz bölge");
    const haklar = await haklariHesapla(d, kullanici.id, durum, simdi);
    if (haklar.kalan <= 0) {
      return hata("Bugünkü talim hakların bitti. Hadis oku, namazını işaretle ya da 30 dk ders çalış; yeni hak kazan!", 429);
    }
    const sorular = sorulariSec(TALIM_ARAZILERI[hucre.arazi].zorluklar);
    await d.batch([
      d
        .prepare(
          `INSERT INTO talim_kullanim (kullanici_id, gun, kullanilan) VALUES (?1, ?2, 1)
           ON CONFLICT(kullanici_id, gun) DO UPDATE SET kullanilan = kullanilan + 1`
        )
        .bind(kullanici.id, haklar.gunNo),
      d
        .prepare(
          `INSERT INTO talim_duello (kullanici_id, hucre, hafta, sorular, baslangic) VALUES (?1, ?2, ?3, ?4, ?5)
           ON CONFLICT(kullanici_id) DO UPDATE SET hucre = ?2, hafta = ?3, sorular = ?4, baslangic = ?5`
        )
        .bind(kullanici.id, hucre.id, talimHaftasi(haklar.gunNo), JSON.stringify(sorular.map((s) => s.id)), an),
    ]);
    return Response.json({
      duello: {
        hucre,
        sorular: sorular.map((s) => ({ id: s.id, kategori: s.kategori, konu: s.konu, soru: s.soru, secenekler: s.secenekler })),
        soruSureSn: TALIM_SORU_SURE_SN,
      },
      ...(await haritaDurumu(d, kullanici.id, uyelik, durum, simdi)),
    });
  }

  if (g.islem === "bitir") {
    const duello = await d.prepare(`SELECT * FROM talim_duello WHERE kullanici_id = ?1`).bind(kullanici.id).first();
    if (!duello) return hata("Süren bir düello yok.");
    await d.prepare(`DELETE FROM talim_duello WHERE kullanici_id = ?1`).bind(kullanici.id).run();
    const ids = JSON.parse(duello.sorular);
    const cevaplar = Array.isArray(g.cevaplar) ? g.cevaplar : [];
    const sureAsildi = an - Number(duello.baslangic) > TALIM_SORU_SAYISI * TALIM_SORU_SURE_SN * 1000 + DUELLO_PAY_MS;
    const anahtar = ids.map((id, i) => {
      const s = SORU_HARITASI.get(id);
      const verilen = Number.isInteger(cevaplar[i]) ? cevaplar[i] : -1;
      return { id, dogru: s?.dogru ?? -1, verilen, dogruMu: !sureAsildi && s && verilen === s.dogru };
    });
    const dogruSayisi = anahtar.filter((a) => a.dogruMu).length;
    const hucre = talimHucresi(duello.hucre);
    const gunNo = trGunNo(simdi);
    const hafta = talimHaftasi(gunNo);
    let sonuc = { tur: "kaybetti" };

    if (hucre && Number(duello.hafta) === hafta) {
      const mevcut = await d
        .prepare(`SELECT birlik_id, takviye FROM talim_bolgeleri WHERE hafta = ?1 AND hucre = ?2`)
        .bind(hafta, hucre.id)
        .first();
      const temelHedef = TALIM_ARAZILERI[hucre.arazi].hedef;
      const kendiBolgemiz = mevcut && mevcut.birlik_id === uyelik.birlik_id;
      // Başka birliğin takviye ettiği bölge 1 doğru daha ister (en çok 5)
      const hedef = kendiBolgemiz ? Math.min(5, Math.max(4, temelHedef)) : Math.min(5, temelHedef + (mevcut?.takviye ? 1 : 0));
      if (dogruSayisi >= hedef) {
        if (kendiBolgemiz) {
          await d
            .prepare(`UPDATE talim_bolgeleri SET takviye = 1, guncelleme = ?3 WHERE hafta = ?1 AND hucre = ?2`)
            .bind(hafta, hucre.id, an)
            .run();
          sonuc = { tur: "takviye" };
        } else {
          await d
            .prepare(
              `INSERT INTO talim_bolgeleri (hafta, hucre, birlik_id, kullanici_id, takviye, guncelleme) VALUES (?1, ?2, ?3, ?4, 0, ?5)
               ON CONFLICT(hafta, hucre) DO UPDATE SET birlik_id = ?3, kullanici_id = ?4, takviye = 0, guncelleme = ?5`
            )
            .bind(hafta, hucre.id, uyelik.birlik_id, kullanici.id, an)
            .run();
          sonuc = { tur: mevcut ? "geri_aldi" : "fethetti" };
        }
        // Birlik katkı puanı: fetih +2, takviye +1
        await d
          .prepare(`UPDATE birlik_uyeleri SET katki_puani = katki_puani + ?2 WHERE kullanici_id = ?1`)
          .bind(kullanici.id, sonuc.tur === "takviye" ? 1 : 2)
          .run();
      }
      sonuc = { ...sonuc, hedef };
    }

    return Response.json({
      sonuc: { ...sonuc, dogruSayisi, soruSayisi: ids.length, sureAsildi, anahtar },
      ...(await haritaDurumu(d, kullanici.id, uyelik, durum, simdi)),
    });
  }

  return hata("Geçersiz işlem");
}
