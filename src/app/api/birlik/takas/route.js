import { db } from "@/lib/sunucu/db";
import { durumGetir, durumYaz } from "@/lib/sunucu/oyunDeposu";
import { govde, hata, oturumZorunlu, oyunYaniti } from "@/lib/sunucu/api";
import { BIRLIK_ACILIS_LEVEL } from "@/lib/oyun/sabitler";
import { ekTablolariHazirla, uyelikBul } from "@/lib/sunucu/ekTablolar";

// Takas Merkezi: birlik kardeşleri arasında kaynak takası.
// Teklif veren kaynağı teklif anında "emanete" bırakır (envanterinden düşer); iptalde geri alır.
const KAYNAKLAR = { erzak: "Mahsul", kereste: "Odun", tas: "Taş" };
const EN_COK_MIKTAR = 200;
const ACIK_TEKLIF_SINIRI = 3;
const EN_COK_ORAN = 3; // bir taraf diğerinin en çok 3 katı olabilir (çocuklar birbirini kandırmasın)

const tamSayi = (v) => Math.floor(Number(v) || 0);

async function liste(d, birlikId, kullaniciId) {
  const [acik, gecmis] = await d.batch([
    d
      .prepare(
        `SELECT t.id, t.veren_id, k.ad AS veren_ad, t.ver_kaynak, t.ver_miktar, t.al_kaynak, t.al_miktar, t.olusturma
           FROM takas_teklifleri t JOIN kullanicilar k ON k.id = t.veren_id
          WHERE t.birlik_id = ?1 AND t.durum = 'acik' ORDER BY t.olusturma DESC LIMIT 40`
      )
      .bind(birlikId),
    d
      .prepare(
        `SELECT t.id, k1.ad AS veren_ad, k2.ad AS alan_ad, t.ver_kaynak, t.ver_miktar, t.al_kaynak, t.al_miktar, t.kapanis
           FROM takas_teklifleri t
           JOIN kullanicilar k1 ON k1.id = t.veren_id
           LEFT JOIN kullanicilar k2 ON k2.id = t.alan_id
          WHERE t.birlik_id = ?1 AND t.durum = 'tamam' ORDER BY t.kapanis DESC LIMIT 10`
      )
      .bind(birlikId),
  ]);
  return {
    teklifler: (acik.results ?? []).map((t) => ({ ...t, benim: t.veren_id === kullaniciId })),
    sonTakaslar: gecmis.results ?? [],
    kaynakAdlari: KAYNAKLAR,
    sinirlar: { enCokMiktar: EN_COK_MIKTAR, acikTeklifSiniri: ACIK_TEKLIF_SINIRI, enCokOran: EN_COK_ORAN },
  };
}

export async function GET() {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  const d = await db();
  await ekTablolariHazirla(d);
  const uyelik = await uyelikBul(d, kullanici.id);
  if (!uyelik) return Response.json({ birlik: null });
  return Response.json({ birlik: { id: uyelik.birlik_id, ad: uyelik.ad }, ...(await liste(d, uyelik.birlik_id, kullanici.id)) });
}

export async function POST(request) {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  const g = await govde(request);
  const d = await db();
  await ekTablolariHazirla(d);
  let durum = await durumGetir(kullanici.id);
  if ((durum.level ?? 1) < BIRLIK_ACILIS_LEVEL) return hata(`Takas Merkezi Level ${BIRLIK_ACILIS_LEVEL}'te açılır.`, 403);
  const uyelik = await uyelikBul(d, kullanici.id);
  if (!uyelik) return hata("Takas için önce bir birliğe katılmalısın.");
  const an = Date.now();
  let mesaj = "";

  if (g.islem === "teklifVer") {
    const ver = String(g.verKaynak ?? "");
    const al = String(g.alKaynak ?? "");
    const verMiktar = tamSayi(g.verMiktar);
    const alMiktar = tamSayi(g.alMiktar);
    if (!KAYNAKLAR[ver] || !KAYNAKLAR[al] || ver === al) return hata("Farklı iki kaynak seçmelisin.");
    if (verMiktar < 1 || alMiktar < 1 || verMiktar > EN_COK_MIKTAR || alMiktar > EN_COK_MIKTAR) {
      return hata(`Miktarlar 1 ile ${EN_COK_MIKTAR} arasında olmalı.`);
    }
    if (verMiktar > alMiktar * EN_COK_ORAN || alMiktar > verMiktar * EN_COK_ORAN) {
      return hata(`Adil takas: bir taraf diğerinin en çok ${EN_COK_ORAN} katı olabilir.`);
    }
    const acikSayi = await d
      .prepare(`SELECT COUNT(*) AS n FROM takas_teklifleri WHERE veren_id = ?1 AND durum = 'acik'`)
      .bind(kullanici.id)
      .first();
    if (Number(acikSayi?.n ?? 0) >= ACIK_TEKLIF_SINIRI) return hata(`Aynı anda en çok ${ACIK_TEKLIF_SINIRI} açık teklifin olabilir.`);
    if ((durum.envanter?.[ver] ?? 0) < verMiktar) return hata(`Yeterli ${KAYNAKLAR[ver]} yok.`);
    durum = { ...durum, envanter: { ...durum.envanter, [ver]: durum.envanter[ver] - verMiktar } };
    await durumYaz(kullanici.id, durum);
    await d
      .prepare(
        `INSERT INTO takas_teklifleri (birlik_id, veren_id, ver_kaynak, ver_miktar, al_kaynak, al_miktar, durum, olusturma)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'acik', ?7)`
      )
      .bind(uyelik.birlik_id, kullanici.id, ver, verMiktar, al, alMiktar, an)
      .run();
    mesaj = `📦 Teklifin panoya asıldı: ${verMiktar} ${KAYNAKLAR[ver]} → ${alMiktar} ${KAYNAKLAR[al]}`;
  } else if (g.islem === "kabulEt" || g.islem === "iptal") {
    const t = await d.prepare(`SELECT * FROM takas_teklifleri WHERE id = ?1 AND durum = 'acik'`).bind(tamSayi(g.teklifId)).first();
    if (!t || t.birlik_id !== uyelik.birlik_id) return hata("Bu teklif artık yok.", 404);

    if (g.islem === "iptal") {
      if (t.veren_id !== kullanici.id) return hata("Yalnızca kendi teklifini geri çekebilirsin.", 403);
      const s = await d
        .prepare(`UPDATE takas_teklifleri SET durum = 'iptal', kapanis = ?2 WHERE id = ?1 AND durum = 'acik'`)
        .bind(t.id, an)
        .run();
      if (Number(s?.meta?.changes ?? 0) !== 1) return hata("Bu teklif artık yok.", 409);
      durum = { ...durum, envanter: { ...durum.envanter, [t.ver_kaynak]: (durum.envanter[t.ver_kaynak] ?? 0) + t.ver_miktar } };
      await durumYaz(kullanici.id, durum);
      mesaj = "↩️ Teklifin geri çekildi, kaynakların depona döndü.";
    } else {
      if (t.veren_id === kullanici.id) return hata("Kendi teklifini kabul edemezsin.");
      if ((durum.envanter?.[t.al_kaynak] ?? 0) < t.al_miktar) return hata(`Bu takas için ${t.al_miktar} ${KAYNAKLAR[t.al_kaynak]} gerekiyor.`);
      const verenUyelik = await uyelikBul(d, t.veren_id);
      if (!verenUyelik || verenUyelik.birlik_id !== uyelik.birlik_id) {
        // Teklif sahibi birlikten ayrılmışsa teklif kapanır, emanet sahibine döner
        await d.prepare(`UPDATE takas_teklifleri SET durum = 'iptal', kapanis = ?2 WHERE id = ?1 AND durum = 'acik'`).bind(t.id, an).run();
        const veren = await durumGetir(t.veren_id);
        await durumYaz(t.veren_id, { ...veren, envanter: { ...veren.envanter, [t.ver_kaynak]: (veren.envanter[t.ver_kaynak] ?? 0) + t.ver_miktar } });
        return hata("Teklif sahibi birlikten ayrılmış; teklif kapandı.", 409);
      }
      const s = await d
        .prepare(`UPDATE takas_teklifleri SET durum = 'tamam', alan_id = ?2, kapanis = ?3 WHERE id = ?1 AND durum = 'acik'`)
        .bind(t.id, kullanici.id, an)
        .run();
      if (Number(s?.meta?.changes ?? 0) !== 1) return hata("Başka bir kardeşin bu teklifi az önce kabul etti.", 409);
      durum = {
        ...durum,
        envanter: {
          ...durum.envanter,
          [t.al_kaynak]: (durum.envanter[t.al_kaynak] ?? 0) - t.al_miktar,
          [t.ver_kaynak]: (durum.envanter[t.ver_kaynak] ?? 0) + t.ver_miktar,
        },
      };
      await durumYaz(kullanici.id, durum);
      const veren = await durumGetir(t.veren_id);
      await durumYaz(t.veren_id, { ...veren, envanter: { ...veren.envanter, [t.al_kaynak]: (veren.envanter[t.al_kaynak] ?? 0) + t.al_miktar } });
      mesaj = `🤝 Takas tamam! +${t.ver_miktar} ${KAYNAKLAR[t.ver_kaynak]} aldın, ${t.al_miktar} ${KAYNAKLAR[t.al_kaynak]} verdin.`;
    }
  } else {
    return hata("Geçersiz işlem");
  }

  const oyun = await (await oyunYaniti(kullanici, durum)).json();
  return Response.json({ birlik: { id: uyelik.birlik_id, ad: uyelik.ad }, ...(await liste(d, uyelik.birlik_id, kullanici.id)), mesaj, oyun });
}
