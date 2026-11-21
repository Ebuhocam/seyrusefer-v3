"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { KARAKTERLER } from "@/lib/oyun/sabitler";

export default function GirisFormu() {
  const router = useRouter();
  const [kip, setKip] = useState("giris"); // 'giris' | 'kayit'
  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [ad, setAd] = useState("");
  const [sifre, setSifre] = useState("");
  const [cinsiyet, setCinsiyet] = useState("erkek"); // 'erkek' | 'kiz'
  const [karakter, setKarakter] = useState("ahmet");
  const [eposta, setEposta] = useState("");
  const [kosulKabul, setKosulKabul] = useState(false);
  const [hata, setHata] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const gonder = async (e) => {
    e.preventDefault();
    setHata(null);
    setYukleniyor(true);
    try {
      const adres = kip === "kayit" ? "/api/auth/kayit" : "/api/auth/giris";
      const r = await fetch(adres, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kullaniciAdi, sifre, ad, cinsiyet, karakter, eposta, kosulKabul }),
      });
      const j = await r.json();
      if (!r.ok) {
        setHata(j.hata ?? "İşlem başarısız.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setHata("Sunucuya ulaşılamadı.");
    } finally {
      setYukleniyor(false);
    }
  };

  const cinsiyetKarakterleri = Object.values(KARAKTERLER).filter((k) => k.cinsiyet === cinsiyet);

  return (
    <main className="fixed inset-0 grid place-items-center overflow-auto bg-stone-950 p-4 text-amber-50">
      {/* Arka planda köy haritası yavaşça süzülür */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/harita/koy.webp"
        alt=""
        className="giris-harita pointer-events-none fixed inset-0 h-full w-full object-cover opacity-60"
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(13,22,40,0.35), rgba(13,22,40,0.92) 75%), linear-gradient(180deg, rgba(13,22,40,0.6), transparent 30%, transparent 70%, rgba(13,22,40,0.85))",
        }}
      />

      <div
        className={`tezhip levha-ac relative my-6 w-full rounded-[1.75rem] p-6 transition-all sm:p-8 ${
          kip === "kayit" ? "max-w-xl" : "max-w-sm"
        }`}
      >
        <div className="mb-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/binalar/otag1.webp" alt="" className="mx-auto -mt-2 mb-1 h-24 object-contain drop-shadow-[0_12px_14px_rgba(0,0,0,0.6)]" />
          <h1 className="giris-baslik text-5xl leading-none font-black sm:text-6xl">Seyrüsefer</h1>
          <div className="cetvel mx-auto my-3 w-3/4" />
          <p className="font-display text-base text-amber-100/85 italic">Köyünü kur, gündemini yaşa, birliğinle yüksel</p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-stone-950/70 p-1 text-sm font-bold ring-1 ring-amber-500/20">
          <button
            type="button"
            onClick={() => {
              setKip("giris");
              setHata(null);
            }}
            className={`rounded-xl py-2.5 transition ${kip === "giris" ? "varak-dugme" : "text-amber-200/75 hover:text-amber-100"}`}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => {
              setKip("kayit");
              setHata(null);
            }}
            className={`rounded-xl py-2.5 transition ${kip === "kayit" ? "varak-dugme" : "text-amber-200/75 hover:text-amber-100"}`}
          >
            Yeni Köy Kur
          </button>
        </div>

        <form onSubmit={gonder} className="space-y-3">
          {kip === "kayit" && (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-amber-200/80">Adın Soyadın</span>
                <input
                  required
                  value={ad}
                  onChange={(e) => setAd(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz / Elif Kaya"
                  autoComplete="name"
                  className="w-full rounded-xl bg-stone-950/80 px-3.5 py-2.5 text-sm text-amber-50 ring-1 ring-amber-500/25 placeholder:text-stone-400 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </label>

              {/* Cinsiyet Seçimi */}
              <div>
                <span className="mb-1 block text-xs font-bold text-amber-200/80">Cinsiyetin</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCinsiyet("erkek");
                      setKarakter("ahmet");
                    }}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black ring-1 transition ${
                      cinsiyet === "erkek"
                        ? "varak-dugme ring-0"
                        : "bg-stone-950/70 text-amber-100 ring-stone-700 hover:bg-stone-900"
                    }`}
                  >
                    <span>👦</span>
                    <span>Erkek</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCinsiyet("kiz");
                      setKarakter("elif");
                    }}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black ring-1 transition ${
                      cinsiyet === "kiz"
                        ? "varak-dugme ring-0"
                        : "bg-stone-950/70 text-amber-100 ring-stone-700 hover:bg-stone-900"
                    }`}
                  >
                    <span>👧</span>
                    <span>Kız</span>
                  </button>
                </div>
              </div>

              {/* Oyun Karakteri Seçimi (5 Erkek veya 5 Kız Özgün Ortaokul Karakteri) */}
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-200/90">
                    Karakterini seç (sonra da değiştirebilirsin)
                  </span>
                  <span className="text-[10px] font-semibold text-amber-300/75">
                    {cinsiyet === "kiz" ? "3 Başörtülü · 2 Açık Saçlı" : "5 Özgün Ortaokul Karakteri"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {cinsiyetKarakterleri.map((k) => {
                    const secili = karakter === k.id;
                    return (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => setKarakter(k.id)}
                        className={`group flex flex-col items-center rounded-2xl p-2 text-center ring-2 transition ${
                          secili
                            ? "bg-gradient-to-b from-amber-500/30 to-amber-600/15 text-amber-100 ring-amber-400 shadow-lg"
                            : "bg-stone-950/75 text-stone-300 ring-stone-800 hover:bg-stone-900 hover:ring-amber-500/40"
                        }`}
                      >
                        <div className="relative flex h-20 w-full items-end justify-center rounded-xl bg-gradient-to-b from-stone-800/80 to-stone-950/90 p-1 ring-1 ring-amber-400/25">
                          <img
                            src={k.gorsel}
                            alt={k.ad}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.65)] transition-transform duration-200 group-hover:scale-105"
                          />
                        </div>
                        <span className="mt-1.5 text-xs font-black text-amber-100">{k.ad}</span>
                        <span className="line-clamp-2 min-h-[1.6rem] text-[10px] leading-tight text-amber-300/85">
                          {k.unvan}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-amber-200/80">Kullanıcı Adı</span>
            <input
              required
              value={kullaniciAdi}
              onChange={(e) => setKullaniciAdi(e.target.value)}
              placeholder="ahmet_12"
              autoComplete="username"
              autoCapitalize="none"
              className="w-full rounded-xl bg-stone-950/80 px-3.5 py-2.5 text-sm text-amber-50 ring-1 ring-amber-500/25 placeholder:text-stone-400 focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-amber-200/80">Şifre</span>
            <input
              required
              type="password"
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              placeholder="En az 6 karakter"
              autoComplete={kip === "kayit" ? "new-password" : "current-password"}
              className="w-full rounded-xl bg-stone-950/80 px-3.5 py-2.5 text-sm text-amber-50 ring-1 ring-amber-500/25 placeholder:text-stone-400 focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </label>

          {kip === "kayit" && (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-amber-200/80">E-posta (veli e-postası olabilir)</span>
                <input
                  required
                  type="email"
                  value={eposta}
                  onChange={(e) => setEposta(e.target.value)}
                  placeholder="ornek@eposta.com"
                  autoComplete="email"
                  className="w-full rounded-xl bg-stone-950/80 px-3.5 py-2.5 text-sm text-amber-50 ring-1 ring-amber-500/25 placeholder:text-stone-400 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
                <span className="mt-1 block text-[11px] text-amber-300/75">Sana 6 haneli bir doğrulama kodu göndereceğiz. Şifreni unutursan da bu adresle sıfırlarsın.</span>
              </label>
              <label className="flex items-start gap-2 text-xs text-amber-100/90">
                <input
                  type="checkbox"
                  checked={kosulKabul}
                  onChange={(e) => setKosulKabul(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-amber-400"
                />
                <span>
                  <a href="/kullanim-kosullari" target="_blank" className="font-bold underline">Kullanım Koşulları</a> ve{" "}
                  <a href="/gizlilik" target="_blank" className="font-bold underline">Gizlilik Bildirimi</a>&apos;ni okudum, kabul ediyorum.
                  18 yaşından küçüksem velimin bilgisi dahilindedir.
                </span>
              </label>
            </>
          )}

          {hata && <p className="rounded-xl bg-red-950/70 px-3 py-2 text-xs font-semibold text-red-200 ring-1 ring-red-500/40">{hata}</p>}

          <button
            type="submit"
            disabled={yukleniyor || (kip === "kayit" && !kosulKabul)}
            className="varak-dugme varak-isilti w-full rounded-2xl py-3.5 text-base"
          >
            {yukleniyor ? "Bekleyin…" : kip === "kayit" ? "🏕️ Köyümü Kur" : "🚪 Köyüme Gir"}
          </button>
          {kip === "giris" && (
            <a href="/sifremi-unuttum" className="block pt-1 text-center text-xs font-semibold text-amber-200/80 underline hover:text-amber-100">
              Şifremi unuttum
            </a>
          )}
        </form>
      </div>
    </main>
  );
}
