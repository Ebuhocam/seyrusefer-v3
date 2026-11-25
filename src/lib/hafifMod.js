// =============================================================
// HAFİF MOD — akıllı tahta, eski tablet ve zayıf telefonlar için
// <html class="hafif"> olunca: harita efektleri durur, bulanık cam / gölge / sonsuz animasyonlar kapanır,
// 3D sahneler en düşük kalitede çizilir.
// localStorage "seyrusefer_hafif":
//   "1"  kullanıcı açtı      "0"  kullanıcı kapattı
//   "oto1" ölçüm yavaş buldu  "oto0:<zaman>" ölçüm hızlı buldu (7 gün sonra yeniden ölçülür)
// Adres çubuğunda ?hafif=1 / ?hafif=0 ile de açılıp kapatılabilir (öğretmen akıllı tahtada).
// =============================================================
export const HAFIF_ANAHTAR = "seyrusefer_hafif";
export const HAFIF_OLAY = "seyrusefer-hafif";

// Sayfa boyanmadan önce <head> içinde çalışır (göz kırpması olmasın)
export const HAFIF_BASLANGIC_BETIGI = `try{var k="${HAFIF_ANAHTAR}",v=localStorage.getItem(k),q=location.search;if(q.indexOf("hafif=1")>-1){v="1";localStorage.setItem(k,v)}else if(q.indexOf("hafif=0")>-1){v="0";localStorage.setItem(k,v)}if(v==="1"||v==="oto1")document.documentElement.classList.add("hafif")}catch(e){}`;

export function hafifMi() {
  return typeof document !== "undefined" && document.documentElement.classList.contains("hafif");
}

export function hafifKaydiOku() {
  try {
    return localStorage.getItem(HAFIF_ANAHTAR);
  } catch {
    return null;
  }
}

/** kaynak: "kullanici" (düğme) veya "oto" (ölçüm) */
export function hafifAyarla(acik, kaynak = "kullanici") {
  document.documentElement.classList.toggle("hafif", acik);
  try {
    localStorage.setItem(HAFIF_ANAHTAR, kaynak === "kullanici" ? (acik ? "1" : "0") : acik ? "oto1" : `oto0:${Date.now()}`);
  } catch {
    // depolama kapalıysa yalnızca bu oturum için geçerli
  }
  window.dispatchEvent(new Event(HAFIF_OLAY));
}

export function hafifAbone(cb) {
  window.addEventListener(HAFIF_OLAY, cb);
  return () => window.removeEventListener(HAFIF_OLAY, cb);
}
