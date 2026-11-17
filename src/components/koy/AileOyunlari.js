"use client";
// =============================================================
// AİLE SOFRASI OYUNLARI (Kendi Evim)
// Ailecek, aynı ekranın başında oynanan üç oyun: Tabu, Sessiz Sinema, Bilmece.
// Oyunlar kaynak / puan ÖDÜLÜ VERMEZ: amaç ailenin bir araya gelmesi.
// Kart içerikleri bu dosyadadır; öğretmen yeni kart eklemek isterse listeye satır ekler.
// =============================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { sesCal } from "./ses";

const TUR_SURESI = 60; // saniye
const PAS_HAKKI = 3;

const TABU_KARTLARI = [
  { kelime: "Merhamet", yasak: ["Acımak", "Şefkat", "Sevgi", "Yardım"] },
  { kelime: "Sabır", yasak: ["Beklemek", "Dayanmak", "Acele", "Tahammül"] },
  { kelime: "Dürüstlük", yasak: ["Doğru", "Yalan", "Güven", "Söz"] },
  { kelime: "Paylaşmak", yasak: ["Vermek", "Bölmek", "Cömert", "Yardım"] },
  { kelime: "Komşu", yasak: ["Ev", "Kapı", "Mahalle", "Yan"] },
  { kelime: "Bayram", yasak: ["Şeker", "El öpmek", "Harçlık", "Tatil"] },
  { kelime: "Sadaka", yasak: ["Para", "Fakir", "Vermek", "Yardım"] },
  { kelime: "Cami", yasak: ["Namaz", "Minare", "Ezan", "İbadet"] },
  { kelime: "Ramazan", yasak: ["Oruç", "Ay", "İftar", "Sahur"] },
  { kelime: "İftar", yasak: ["Akşam", "Yemek", "Oruç", "Sofra"] },
  { kelime: "Sahur", yasak: ["Gece", "Kalkmak", "Yemek", "Oruç"] },
  { kelime: "Zekât", yasak: ["Zengin", "Mal", "Fakir", "Vermek"] },
  { kelime: "Hac", yasak: ["Kâbe", "Mekke", "Yolculuk", "İbadet"] },
  { kelime: "Kurban", yasak: ["Bayram", "Koyun", "Et", "Paylaşmak"] },
  { kelime: "Tevazu", yasak: ["Alçakgönüllü", "Kibir", "Büyüklenmek", "Mütevazı"] },
  { kelime: "Emanet", yasak: ["Korumak", "Güven", "Geri", "Saklamak"] },
  { kelime: "Selam", yasak: ["Merhaba", "Vermek", "Almak", "Aleyküm"] },
  { kelime: "Teşekkür", yasak: ["Sağ ol", "Minnet", "Nezaket", "Söylemek"] },
  { kelime: "Vefa", yasak: ["Unutmamak", "Dost", "Sadakat", "İyilik"] },
  { kelime: "Misafir", yasak: ["Gelmek", "Ağırlamak", "İkram", "Ev"] },
  { kelime: "Saygı", yasak: ["Büyük", "Değer", "Nezaket", "Sevgi"] },
  { kelime: "İmece", yasak: ["Köy", "Birlikte", "Çalışmak", "Yardım"] },
  { kelime: "Abdest", yasak: ["Su", "Yıkamak", "Namaz", "Temizlik"] },
  { kelime: "Ezan", yasak: ["Müezzin", "Minare", "Namaz", "Okumak"] },
  { kelime: "Güler yüz", yasak: ["Gülümsemek", "Mutlu", "Surat", "Neşe"] },
  { kelime: "Kardeş", yasak: ["Abla", "Ağabey", "Aile", "Anne"] },
  { kelime: "Dede", yasak: ["Torun", "Yaşlı", "Baba", "Nine"] },
  { kelime: "Kitap", yasak: ["Okumak", "Sayfa", "Yazar", "Kütüphane"] },
  { kelime: "Öğretmen", yasak: ["Okul", "Ders", "Öğrenci", "Sınıf"] },
  { kelime: "Çınar", yasak: ["Ağaç", "Gölge", "Yaprak", "Büyük"] },
  { kelime: "Kervan", yasak: ["Deve", "Yolculuk", "Tüccar", "Yol"] },
  { kelime: "Han", yasak: ["Kervan", "Yolcu", "Oda", "Konaklamak"] },
  { kelime: "Ozan", yasak: ["Saz", "Şiir", "Türkü", "Halk"] },
  { kelime: "Bakır ibrik", yasak: ["Su", "Dökmek", "Sulamak", "Kap"] },
  { kelime: "Hasat", yasak: ["Toplamak", "Tarla", "Ürün", "Buğday"] },
  { kelime: "Fidan", yasak: ["Ağaç", "Dikmek", "Küçük", "Toprak"] },
  { kelime: "Sofra", yasak: ["Yemek", "Masa", "Kurmak", "Aile"] },
  { kelime: "Mektup", yasak: ["Yazmak", "Zarf", "Posta", "Okumak"] },
  { kelime: "Söz vermek", yasak: ["Tutmak", "Yemin", "Güven", "Sözleşmek"] },
  { kelime: "Özür dilemek", yasak: ["Affet", "Pardon", "Hata", "Kusura bakma"] },
];

const SESSIZ_SINEMA_KARTLARI = [
  "Yaşlı bir komşunun pazar poşetlerini taşımak",
  "Kapıda misafir karşılamak",
  "Bayramda büyüklerin elini öpmek",
  "Bahçeye fidan dikmek",
  "Kuşlara yem vermek",
  "Sofrayı birlikte kurmak",
  "Hasta bir arkadaşı ziyaret etmek",
  "Sokak kedisine su koymak",
  "Kaybolan cüzdanı sahibine götürmek",
  "Ekmek hamuru yoğurmak",
  "Kuyudan su çekmek",
  "Çay demlemek",
  "Saz çalan bir ozan",
  "Tarlada çapa yapmak",
  "Odun kırmak",
  "Uçurtma uçurmak",
  "Dere kenarında balık tutmak",
  "Halı dokumak",
  "Bal toplayan arıcı",
  "Deveyle kervanda yolculuk",
  "Diş fırçalamak",
  "Yağmurda şemsiye açmak",
  "Bisiklet sürmek",
  "Kardeşine ödevinde yardım etmek",
  "Kitap okurken uyuyakalmak",
  "Çiçekleri sulamak",
  "Futbol maçında gol atmak",
  "Kar topu oynamak",
  "Bebek uyutmak",
  "Köy meydanında çınar altında sohbet",
];

const BILMECELER = [
  { soru: "Ak koyun, kara koyun, geçide yayılır.", cevap: "Gece ile gündüz" },
  { soru: "Yer altında yağlı kayış.", cevap: "Yılan" },
  { soru: "Kat kat kadife, içi dolu yakut.", cevap: "Nar" },
  { soru: "Dam üstünde un eler.", cevap: "Kar" },
  { soru: "Bir küçük fıçıcık, içinde iki türlü turşucuk.", cevap: "Yumurta" },
  { soru: "Verdikçe azalmam, aksine çoğalırım; paylaşanın gönlünde yer bulurum. Ben neyim?", cevap: "Sevgi" },
  { soru: "Görünmem ama taşınırım; birine bırakılırım, sahibine dönerim. Ben neyim?", cevap: "Emanet" },
  { soru: "Dilin ucundayım ama kalpten çıkarım; söylendiğimde iki kişi de sevinir. Ben neyim?", cevap: "Teşekkür" },
  { soru: "Kapıdan girer, tatlı söz isterim; gidince ardımdan güzel anılırım. Ben kimim?", cevap: "Misafir" },
  { soru: "Acele edenin elinden kaçarım, bekleyenin sofrasına konarım. Ben neyim?", cevap: "Sabır" },
  { soru: "Yalanla aram yoktur, söylediğim doğrudur; bana güvenen kaybetmez. Ben neyim?", cevap: "Dürüstlük" },
  { soru: "Köyde herkes bir olur, tek başına bitmeyen iş birlikte biter. Ben neyim?", cevap: "İmece" },
  { soru: "Gölgemde dinlenir, dalımda kuş öter; köyün en yaşlısıyım. Ben neyim?", cevap: "Çınar" },
  { soru: "Sabah erkenden sesim yükselir, minarede doğarım. Ben neyim?", cevap: "Ezan" },
  { soru: "Bir kelimeyim ama küsleri barıştırırım; söylemesi zor, faydası çoktur. Ben neyim?", cevap: "Özür" },
];

function karistir(dizi) {
  const a = [...dizi];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const OYUNLAR = [
  { id: "tabu", ikon: "🗣️", ad: "Tabu", aciklama: "Yasak kelimeleri söylemeden takımına anlat." },
  { id: "sinema", ikon: "🎭", ad: "Sessiz Sinema", aciklama: "Hiç konuşmadan, sadece hareketlerle anlat." },
  { id: "bilmece", ikon: "🧩", ad: "Bilmece", aciklama: "Sırayla sor, cevabı bulan bir sonrakini sorsun." },
];

/** Oyun alanını ekranın üstüne getirir (telefonda kart ve düğmeler görünür kalsın) */
function goruneGetir(el) {
  if (!el) return;
  window.requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
}

export default function AileOyunlari() {
  const [oyun, setOyun] = useState(null);
  const bolumRef = useRef(null);
  const oyunSec = (id) => {
    setOyun(id);
    goruneGetir(bolumRef.current);
  };

  return (
    <section id="aile-oyunlari" ref={bolumRef} className="tezhip scroll-mt-20 rounded-3xl p-4 text-amber-50 sm:p-5" aria-label="Aile Sofrası Oyunları">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-xl font-black text-amber-100">Aile Sofrası Oyunları</h3>
          <p className="text-xs text-amber-200/80">
            Ailenle bir araya gelin, telefonu ya da bilgisayarı ortaya koyun ve sırayla oynayın.
          </p>
        </div>
        {oyun && (
          <button
            type="button"
            onClick={() => setOyun(null)}
            className="ust-levha rounded-xl px-3 py-1.5 text-xs font-bold text-amber-200"
          >
            ← Oyun seç
          </button>
        )}
      </div>
      <div className="cetvel my-3" />

      {!oyun && (
        <div className="grid gap-2.5 sm:grid-cols-3">
          {OYUNLAR.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => oyunSec(o.id)}
              className="group flex items-center gap-3 rounded-2xl bg-stone-950/60 p-3 text-left ring-1 ring-amber-500/30 transition hover:bg-stone-900 hover:ring-amber-400/70 sm:flex-col sm:items-start"
            >
              <span className="text-3xl transition group-hover:scale-110" aria-hidden="true">
                {o.ikon}
              </span>
              <span>
                <span className="font-display block text-lg font-black text-amber-100">{o.ad}</span>
                <span className="block text-xs text-amber-200/80">{o.aciklama}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {oyun === "tabu" && <TakimliOyun tur="tabu" />}
      {oyun === "sinema" && <TakimliOyun tur="sinema" />}
      {oyun === "bilmece" && <Bilmece />}
    </section>
  );
}

// ---------- Tabu ve Sessiz Sinema: iki takımlı, süreli turlar ----------
function TakimliOyun({ tur }) {
  const tabu = tur === "tabu";
  const kaynak = tabu ? TABU_KARTLARI : SESSIZ_SINEMA_KARTLARI;
  const [takimlar, setTakimlar] = useState(["Büyükler", "Küçükler"]);
  const [puan, setPuan] = useState([0, 0]);
  const [sira, setSira] = useState(0); // hangi takım anlatıyor
  const [asama, setAsama] = useState("hazir"); // hazir | oyun | bitti
  const [deste, setDeste] = useState(() => karistir(kaynak));
  const [kartNo, setKartNo] = useState(0);
  const [kalan, setKalan] = useState(TUR_SURESI);
  const [pas, setPas] = useState(PAS_HAKKI);
  const [turSonuc, setTurSonuc] = useState({ bildi: 0, tabu: 0 });
  const bitisRef = useRef(0);
  const alanRef = useRef(null);

  // Süre: tur başladığında bitiş zamanı belirlenir, sayaç her 250 ms'de güncellenir
  useEffect(() => {
    if (asama !== "oyun") return undefined;
    const id = window.setInterval(() => {
      const k = Math.max(0, Math.ceil((bitisRef.current - Date.now()) / 1000));
      setKalan(k);
      if (k <= 0) {
        setAsama("bitti");
        sesCal("level");
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [asama]);

  const kart = deste[kartNo % deste.length];

  const sonrakiKart = () => {
    const yeni = kartNo + 1;
    if (yeni >= deste.length) {
      setDeste(karistir(kaynak));
      setKartNo(0);
    } else {
      setKartNo(yeni);
    }
  };

  const turuBaslat = () => {
    bitisRef.current = Date.now() + TUR_SURESI * 1000;
    setKalan(TUR_SURESI);
    setPas(PAS_HAKKI);
    setTurSonuc({ bildi: 0, tabu: 0 });
    setAsama("oyun");
    sonrakiKart();
    goruneGetir(alanRef.current);
  };

  const puanEkle = (fark) =>
    setPuan((p) => p.map((v, i) => (i === sira ? Math.max(0, v + fark) : v)));

  const bildi = () => {
    puanEkle(1);
    setTurSonuc((s) => ({ ...s, bildi: s.bildi + 1 }));
    sesCal("toplama");
    sonrakiKart();
  };
  const tabuOldu = () => {
    puanEkle(-1);
    setTurSonuc((s) => ({ ...s, tabu: s.tabu + 1 }));
    sesCal("hata");
    sonrakiKart();
  };
  const pasGec = () => {
    if (pas <= 0) return;
    setPas((p) => p - 1);
    sonrakiKart();
  };
  const siradakiTakim = () => {
    setSira((s) => 1 - s);
    setAsama("hazir");
  };

  const sureOrani = kalan / TUR_SURESI;

  return (
    <div ref={alanRef} className="scroll-mt-20 space-y-3">
      {/* Puan tablosu */}
      <div className="grid grid-cols-2 gap-2">
        {takimlar.map((ad, i) => (
          <div
            key={i}
            className={`rounded-2xl p-2.5 text-center ring-1 transition ${
              sira === i ? "bg-amber-500/15 ring-amber-400/70" : "bg-stone-950/50 ring-white/5"
            }`}
          >
            {asama === "hazir" && puan[0] === 0 && puan[1] === 0 ? (
              <input
                value={ad}
                maxLength={18}
                onChange={(e) => setTakimlar((t) => t.map((x, j) => (j === i ? e.target.value : x)))}
                aria-label={`${i + 1}. takımın adı`}
                className="w-full rounded-lg bg-stone-950/70 px-2 py-1 text-center text-sm font-bold text-amber-100 ring-1 ring-amber-500/25 focus:ring-amber-400"
              />
            ) : (
              <div className="truncate text-sm font-bold text-amber-100">{ad || `${i + 1}. Takım`}</div>
            )}
            <div className="font-display text-3xl font-black text-amber-300 tabular-nums">{puan[i]}</div>
          </div>
        ))}
      </div>

      {asama === "hazir" && (
        <div className="rounded-2xl bg-stone-950/50 p-4 text-center ring-1 ring-white/5">
          <p className="text-sm text-amber-100/90">
            Sıra <b className="text-amber-300">{takimlar[sira] || `${sira + 1}. Takım`}</b> takımında. Anlatacak kişi
            ekranı alsın; diğerleri ekranı görmesin.
          </p>
          <p className="mt-1 text-xs text-amber-200/70">
            {tabu
              ? `${TUR_SURESI} saniyen var. Kartın altındaki yasak kelimeleri söylersen −1 puan. ${PAS_HAKKI} pas hakkın var.`
              : `${TUR_SURESI} saniyen var. Hiç konuşmadan, sadece hareketlerle anlat. ${PAS_HAKKI} pas hakkın var.`}
          </p>
          <button type="button" onClick={turuBaslat} className="varak-dugme mt-3 rounded-2xl px-6 py-3 text-base">
            Turu başlat
          </button>
        </div>
      )}

      {asama === "oyun" && kart && (
        <div className="space-y-3">
          {/* Süre çubuğu */}
          <div className="flex items-center gap-2">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-950 ring-1 ring-white/5">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${
                  kalan <= 10 ? "bg-red-500" : "bg-emerald-400"
                }`}
                style={{ width: `${sureOrani * 100}%` }}
              />
            </div>
            <span className={`w-10 text-right font-black tabular-nums ${kalan <= 10 ? "text-red-400" : "text-amber-100"}`}>
              {kalan}s
            </span>
          </div>

          {/* Kart */}
          <div key={`${kartNo}-${kart.kelime ?? kart}`} className="parsomen levha-ac mx-auto max-w-sm rounded-2xl p-5 text-center">
            {tabu ? (
              <>
                <div className="text-3xl font-black">{kart.kelime}</div>
                <div className="my-3 h-px bg-amber-800/30" />
                <ul className="space-y-1 text-base font-semibold text-red-800">
                  {kart.yasak.map((y) => (
                    <li key={y}>{y}</li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="py-4 text-2xl leading-snug font-black">{kart}</div>
            )}
          </div>

          <div className={`grid gap-2 ${tabu ? "grid-cols-3" : "grid-cols-2"}`}>
            <button
              type="button"
              onClick={bildi}
              className="rounded-2xl bg-emerald-600 py-3 text-sm font-black text-white ring-1 ring-emerald-300/50 active:scale-95"
            >
              ✅ Bildi
            </button>
            <button
              type="button"
              onClick={pasGec}
              disabled={pas <= 0}
              className="rounded-2xl bg-stone-800 py-3 text-sm font-black text-amber-100 ring-1 ring-white/10 active:scale-95 disabled:opacity-40"
            >
              ⏭ Pas ({pas})
            </button>
            {tabu && (
              <button
                type="button"
                onClick={tabuOldu}
                className="rounded-2xl bg-red-600 py-3 text-sm font-black text-white ring-1 ring-red-300/50 active:scale-95"
              >
                ❌ Tabu
              </button>
            )}
          </div>
        </div>
      )}

      {asama === "bitti" && (
        <div className="rounded-2xl bg-stone-950/50 p-4 text-center ring-1 ring-amber-500/30">
          <p className="font-display text-2xl font-black text-amber-100">Süre doldu!</p>
          <p className="mt-1 text-sm text-amber-100/90">
            {takimlar[sira] || `${sira + 1}. Takım`} bu turda <b className="text-emerald-300">{turSonuc.bildi}</b> kart bildi
            {tabu && turSonuc.tabu > 0 ? (
              <>
                , <b className="text-red-400">{turSonuc.tabu}</b> kez tabuya yakalandı
              </>
            ) : null}
            .
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={siradakiTakim} className="varak-dugme rounded-2xl px-5 py-2.5 text-sm">
              Sıra {takimlar[1 - sira] || `${2 - sira}. Takım`} takımında
            </button>
            <button
              type="button"
              onClick={() => {
                setPuan([0, 0]);
                setSira(0);
                setAsama("hazir");
              }}
              className="ust-levha rounded-2xl px-4 py-2.5 text-sm font-bold text-amber-200"
            >
              Yeni oyun
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Bilmece ----------
function Bilmece() {
  const deste = useMemo(() => karistir(BILMECELER), []);
  const [no, setNo] = useState(0);
  const [acik, setAcik] = useState(false);
  const b = deste[no % deste.length];

  return (
    <div className="space-y-3">
      <div key={no} className="parsomen levha-ac mx-auto max-w-md rounded-2xl p-5 text-center">
        <div className="text-xs font-bold text-amber-900/70">
          Bilmece {(no % deste.length) + 1} / {deste.length}
        </div>
        <p className="mt-2 text-xl leading-snug font-bold">{b.soru}</p>
        <div className="my-3 h-px bg-amber-800/30" />
        {acik ? (
          <p className="text-2xl font-black text-emerald-800">{b.cevap}</p>
        ) : (
          <p className="text-sm text-amber-900/70">Herkes tahminini söylesin, sonra cevaba bakın.</p>
        )}
      </div>
      <div className="flex justify-center gap-2">
        {!acik ? (
          <button
            type="button"
            onClick={() => setAcik(true)}
            className="varak-dugme rounded-2xl px-5 py-2.5 text-sm"
          >
            Cevabı göster
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setAcik(false);
              setNo((n) => n + 1);
            }}
            className="varak-dugme rounded-2xl px-5 py-2.5 text-sm"
          >
            Sıradaki bilmece
          </button>
        )}
      </div>
    </div>
  );
}
