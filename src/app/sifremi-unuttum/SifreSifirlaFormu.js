"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import KartKabugu, { GIRDI_SINIFI } from "../KartKabugu";

async function istek(adres, govde) {
  const r = await fetch(adres, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(govde),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, ...j };
}

export default function SifreSifirlaFormu() {
  const router = useRouter();
  const [asama, setAsama] = useState("istek"); // istek | kod | bitti
  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [eposta, setEposta] = useState("");
  const [kod, setKod] = useState("");
  const [yeniSifre, setYeniSifre] = useState("");
  const [hata, setHata] = useState(null);
  const [bekliyor, setBekliyor] = useState(false);

  const calistir = async (is) => {
    setHata(null);
    setBekliyor(true);
    try {
      await is();
    } catch {
      setHata("Sunucuya ulaşılamadı.");
    } finally {
      setBekliyor(false);
    }
  };

  const kodIste = (e) => {
    e?.preventDefault();
    return calistir(async () => {
      const s = await istek("/api/auth/sifre/iste", { kullaniciAdi, eposta });
      if (!s.ok) return setHata(s.hata ?? "İstek gönderilemedi.");
      setAsama("kod");
    });
  };

  const yenile = (e) => {
    e.preventDefault();
    return calistir(async () => {
      const s = await istek("/api/auth/sifre/yenile", { kullaniciAdi, eposta, kod, yeniSifre });
      if (!s.ok) return setHata(s.hata ?? "Şifre değiştirilemedi.");
      setAsama("bitti");
    });
  };

  return (
    <KartKabugu baslik="Şifremi unuttum">
      {asama === "istek" && (
        <form onSubmit={kodIste} className="space-y-3">
          <p className="text-sm text-amber-100/90">
            Kullanıcı adını ve hesabına bağlı <b>doğrulanmış</b> e-posta adresini yaz; sana bir kod gönderelim.
          </p>
          <input required value={kullaniciAdi} onChange={(e) => setKullaniciAdi(e.target.value)} placeholder="Kullanıcı adı" autoComplete="username" autoCapitalize="none" className={GIRDI_SINIFI} />
          <input required type="email" value={eposta} onChange={(e) => setEposta(e.target.value)} placeholder="E-posta adresi" autoComplete="email" className={GIRDI_SINIFI} />
          {hata && <p className="rounded-xl bg-red-950/70 px-3 py-2 text-xs font-semibold text-red-200 ring-1 ring-red-500/40">{hata}</p>}
          <button type="submit" disabled={bekliyor} className="varak-dugme w-full rounded-2xl py-3 text-sm font-black">
            {bekliyor ? "Bekleyin…" : "📧 Kod gönder"}
          </button>
        </form>
      )}

      {asama === "kod" && (
        <form onSubmit={yenile} className="space-y-3">
          <p className="rounded-xl bg-emerald-950/60 px-3 py-2 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/40">
            Bilgiler doğruysa kod e-posta adresine gönderildi. Gelen kutunu ve spam klasörünü kontrol et.
          </p>
          <input
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={kod}
            onChange={(e) => setKod(e.target.value.replace(/\D/g, ""))}
            placeholder="______"
            autoComplete="one-time-code"
            className={`${GIRDI_SINIFI} text-center text-2xl tracking-[0.5em]`}
          />
          <input required type="password" value={yeniSifre} onChange={(e) => setYeniSifre(e.target.value)} placeholder="Yeni şifre (en az 6 karakter)" autoComplete="new-password" className={GIRDI_SINIFI} />
          {hata && <p className="rounded-xl bg-red-950/70 px-3 py-2 text-xs font-semibold text-red-200 ring-1 ring-red-500/40">{hata}</p>}
          <button type="submit" disabled={bekliyor || kod.length !== 6} className="varak-dugme w-full rounded-2xl py-3 text-sm font-black disabled:opacity-50">
            {bekliyor ? "Bekleyin…" : "🔑 Şifremi değiştir"}
          </button>
          <button type="button" onClick={kodIste} disabled={bekliyor} className="w-full py-1 text-xs font-semibold text-amber-200/80 underline hover:text-amber-100">
            Kodu tekrar gönder
          </button>
        </form>
      )}

      {asama === "bitti" && (
        <div className="space-y-3 text-center">
          <p className="text-sm text-amber-100">Şifren değişti. Yeni şifrenle giriş yapabilirsin.</p>
          <button type="button" onClick={() => router.replace("/giris")} className="varak-dugme w-full rounded-2xl py-3 text-sm font-black">
            🚪 Giriş yap
          </button>
        </div>
      )}

      {asama !== "bitti" && (
        <a href="/giris" className="mt-4 block text-center text-xs font-semibold text-amber-200/80 underline hover:text-amber-100">
          Girişe dön
        </a>
      )}
    </KartKabugu>
  );
}
