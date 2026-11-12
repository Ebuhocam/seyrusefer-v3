"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GirisFormu() {
  const router = useRouter();
  const [kip, setKip] = useState("giris"); // 'giris' | 'kayit'
  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [ad, setAd] = useState("");
  const [sifre, setSifre] = useState("");
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
        body: JSON.stringify({ kullaniciAdi, sifre, ad }),
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

  return (
    <main className="relative fixed inset-0 grid place-items-center overflow-auto bg-[#1f3315] p-4 text-amber-50">
      <img
        src="/assets/harita/koy.webp"
        alt=""
        className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-25 blur-[2px]"
      />

      <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-stone-800/95 to-stone-900/95 p-6 shadow-2xl ring-1 ring-amber-500/40 backdrop-blur">
        <div className="mb-5 text-center">
          <img src="/assets/binalar/otag1.webp" alt="Otağ" className="mx-auto mb-2 h-20 object-contain drop-shadow-lg" />
          <h1 className="text-2xl font-black tracking-tight text-amber-200">Seyrüsefer</h1>
          <p className="text-xs text-amber-200/70">Köyünü kur, gündemini yaşa, birliğinle yüksel</p>
        </div>

        <div className="mb-4 grid grid-cols-2 rounded-xl bg-stone-950/60 p-1 text-sm font-bold">
          <button
            type="button"
            onClick={() => {
              setKip("giris");
              setHata(null);
            }}
            className={`rounded-lg py-2 transition ${kip === "giris" ? "bg-amber-500 text-stone-900" : "text-amber-200/70"}`}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => {
              setKip("kayit");
              setHata(null);
            }}
            className={`rounded-lg py-2 transition ${kip === "kayit" ? "bg-amber-500 text-stone-900" : "text-amber-200/70"}`}
          >
            Yeni Köy Kur
          </button>
        </div>

        <form onSubmit={gonder} className="space-y-3">
          {kip === "kayit" && (
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-amber-200/80">Adın Soyadın</span>
              <input
                required
                value={ad}
                onChange={(e) => setAd(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                autoComplete="name"
                className="w-full rounded-xl bg-stone-950/80 px-3.5 py-2.5 text-sm text-amber-50 ring-1 ring-stone-700 focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </label>
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
              className="w-full rounded-xl bg-stone-950/80 px-3.5 py-2.5 text-sm text-amber-50 ring-1 ring-stone-700 focus:ring-2 focus:ring-amber-400 focus:outline-none"
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
              className="w-full rounded-xl bg-stone-950/80 px-3.5 py-2.5 text-sm text-amber-50 ring-1 ring-stone-700 focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </label>

          {hata && <p className="rounded-xl bg-red-950/70 px-3 py-2 text-xs font-semibold text-red-200 ring-1 ring-red-500/40">{hata}</p>}

          <button
            type="submit"
            disabled={yukleniyor}
            className="w-full rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 py-3 font-black text-stone-900 shadow-lg disabled:opacity-50"
          >
            {yukleniyor ? "Bekleyin…" : kip === "kayit" ? "🏕️ Köyümü Kur" : "🚪 Köyüme Gir"}
          </button>
        </form>
      </div>
    </main>
  );
}
