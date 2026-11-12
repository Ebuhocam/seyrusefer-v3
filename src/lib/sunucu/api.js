import "server-only";
import { aktifKullanici, gelistiriciIzni } from "./oturum";
import { oyunSaati } from "./oyunDeposu";

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
  const kullanici = await aktifKullanici();
  return kullanici ? { kullanici } : { yanit: hata("Oturum bulunamadı", 401) };
}

/** İstemciye giden standart oyun yanıtı */
export const oyunYaniti = (kullanici, durum, ek = {}) =>
  Response.json({
    kullanici: { ad: kullanici.ad, kullaniciAdi: kullanici.kullanici_adi, rol: kullanici.rol },
    durum,
    sunucuSaati: oyunSaati(durum),
    gelistirici: gelistiriciIzni(kullanici),
    ...ek,
  });
