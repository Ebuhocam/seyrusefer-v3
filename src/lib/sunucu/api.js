import "server-only";
import { aktifKullanici, gelistiriciIzni } from "./oturum";
import { oyunSaati } from "./oyunDeposu";
import { oyunAyarlariniGetir } from "./ayarlarDeposu";
import { onizlemeIzniVar } from "./onizleme";

export const hata = (mesaj, status = 400) => Response.json({ hata: mesaj }, { status });

/** JSON gövdesini güvenle okur */
export async function govde(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

/** Oturum yoksa 401 yanıtı, varsa kullanıcıyı döner */
export async function oturumZorunlu() {
  if (!(await onizlemeIzniVar())) return { yanit: hata("Site hazırlanıyor.", 403) };
  const kullanici = await aktifKullanici();
  return kullanici ? { kullanici } : { yanit: hata("Oturum bulunamadı", 401) };
}

/** İstemciye giden standart oyun yanıtı */
export async function oyunYaniti(kullanici, durum, ek = {}, hazirAyarlar = null) {
  const ayarlar = hazirAyarlar ?? (await oyunAyarlariniGetir());
  return Response.json({
    kullanici: { id: kullanici.id, ad: kullanici.ad, kullaniciAdi: kullanici.kullanici_adi, rol: kullanici.rol },
    durum,
    ayarlar,
    sunucuSaati: oyunSaati(durum),
    gelistirici: gelistiriciIzni(kullanici),
    ...ek,
  });
}

/** Kayıt / giriş gibi oturumsuz uçlar için ön izleme kapısı kontrolü (kapalıysa 403 yanıtı döner) */
export async function onizlemeKontrol() {
  return (await onizlemeIzniVar()) ? null : hata("Site hazırlanıyor.", 403);
}
