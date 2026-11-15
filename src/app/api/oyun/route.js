import { db } from "@/lib/sunucu/db";
import { gelistiriciIzni } from "@/lib/sunucu/oturum";
import { durumGetir, durumOku, durumYaz, oyunSaati } from "@/lib/sunucu/oyunDeposu";
import { oyunAyarlariniGetir, tesvikOdulunuKontrolEt } from "@/lib/sunucu/ayarlarDeposu";
import { govde, hata, oturumZorunlu, oyunYaniti } from "@/lib/sunucu/api";
import { oyunGunu } from "@/lib/oyun/gorevler";
import {
  topla,
  isciAta,
  uretimEtkilesim,
  mektupTeslimAl,
  yukselt,
  levelAtla,
  gorevIlerlet,
  namazGuncelle,
  sinavDegerlendir,
  davaCoz,
  gocmenTeklifEt,
  gelistiriciEylemleri,
} from "@/lib/oyun/eylemler";

/** Oyuncunun güncel durumu */
export async function GET() {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;
  return oyunYaniti(kullanici, await durumGetir(kullanici.id));
}

export async function POST(request) {
  const { kullanici, yanit } = await oturumZorunlu();
  if (yanit) return yanit;

  const g = await govde(request);
  const [durum, ayarlar] = await Promise.all([durumGetir(kullanici.id), oyunAyarlariniGetir()]);
  const simdi = oyunSaati(durum);
  let sonuc;

  switch (g.eylem) {
    case "topla":
      sonuc = topla(durum, g.kaynak, simdi);
      break;
    case "isciAta":
      sonuc = isciAta(durum, g.kaynak, Number(g.degisim), simdi);
      break;
    case "uretimEtkilesim":
      sonuc = uretimEtkilesim(durum, g.kaynak, simdi);
      break;
    case "mektupAl":
      sonuc = mektupTeslimAl(durum);
      break;
    case "yukselt":
      sonuc = yukselt(durum, g.binaId, ayarlar);
      break;
    case "levelAtla":
      sonuc = levelAtla(durum, simdi, ayarlar);
      break;
    case "gorevTamamla":
      sonuc = gorevIlerlet(durum, String(g.gorevKodu ?? ""), simdi, ayarlar);
      break;
    case "namazIsaretle":
      sonuc = namazGuncelle(durum, g.vakit, g.deger, simdi, ayarlar);
      break;
    case "sinavCevapla":
      sonuc = sinavDegerlendir(durum, g.cevaplar, simdi, ayarlar);
      break;
    case "davaCoz":
      sonuc = davaCoz(durum, g.davaId, g.secenekIndeks, simdi, ayarlar);
      break;
    case "gocmenTeklifEt":
      sonuc = gocmenTeklifEt(durum, simdi);
      break;
    case "gelistirici": {
      if (!gelistiriciIzni(kullanici)) return hata("Yetkisiz", 403);
      const islem = Object.hasOwn(gelistiriciEylemleri, g.islem) ? gelistiriciEylemleri[g.islem] : null;
      if (!islem) return hata("Bilinmeyen geliştirici işlemi");
      if (g.islem === "sifirla") {
        const d = await db();
        await d.batch([
          d.prepare("DELETE FROM gorev_ilerlemesi WHERE kullanici_id = ?").bind(kullanici.id),
          d.prepare("DELETE FROM namaz_cetelesi WHERE kullanici_id = ?").bind(kullanici.id),
        ]);
      }
      sonuc = { durum: islem(durum, g, g.islem === "sifirla" ? Date.now() : simdi) };
      break;
    }
    default:
      return hata("Bilinmeyen eylem");
  }

  if (sonuc.hata) return Response.json({ hata: sonuc.hata }, { status: 409 });
  await durumYaz(kullanici.id, sonuc.durum, simdi, ayarlar);

  if (["gorevTamamla", "namazIsaretle", "sinavCevapla", "davaCoz"].includes(g.eylem)) {
    await tesvikOdulunuKontrolEt(kullanici.id, oyunGunu(simdi));
  }

  const guncel =
    g.eylem === "levelAtla" || g.eylem === "gelistirici" ? await durumOku(kullanici.id) : sonuc.durum;
  const ek = {};
  if (sonuc.miktar) ek.miktar = sonuc.miktar;
  if (sonuc.sonuc) ek.sonuc = sonuc.sonuc;
  return oyunYaniti(kullanici, guncel, ek, ayarlar);
}
