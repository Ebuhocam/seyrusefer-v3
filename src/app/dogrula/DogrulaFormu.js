"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import KartKabugu, { GIRDI_SINIFI } from "../KartKabugu";

async function istek(adres, govde) {
  const r = await fetch(adres, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(govde ?? {}),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, ...j };
}

export default function DogrulaFormu({ eposta: ilkEposta, eskiHesap, kosulOnayli }) {
  const router = useRouter();
  const [eposta, setEposta] = useState(ilkEposta);
  const [adresAsamasi, setAdresAsamasi] = useState(!ilkEposta); // true: e-posta yazılıyor, false: kod giriliyor
  const [kod, setKod] = useState("");
  const [kabul, setKabul] = useState(kosulOnayli);
  const [mesaj, setMesaj] = useState(null);
  const [hata, setHata] = useState(null);
  const [bekliyor, setBekliyor] = useState(false);

  const kodIste = async (yeniAdres) => {
    setHata(null);
    setMesaj(null);
    setBekliyor(true);
    try {
      const s = await istek("/api/auth/eposta/gonder", {
        eposta: yeniAdres ? eposta : undefined,
        kosulKabul: kabul,
      });
      if (!s.ok) return setHata(s.hata ?? "Kod gönderilemedi.");
      setEposta(s.eposta ?? eposta);
      setAdresAsamasi(false);
      setMesaj(`Kod ${s.eposta ?? eposta} adresine gönderildi. Gelen kutunu ve spam klasörünü kontrol et.`);
    } catch {
      setHata("Sunucuya ulaşılamadı.");
    } finally {
      setBekliyor(false);
    }
  };

  const dogrula = async (e) => {
    e.preventDefault();
    setHata(null);
    setBekliyor(true);
    try {
      const s = await istek("/api/auth/eposta/dogrula", { kod });
      if (!s.ok) return setHata(s.hata ?? "Doğrulanamadı.");
      router.replace("/");
      router.refresh();
    } catch {
      setHata("Sunucuya ulaşılamadı.");
    } finally {
      setBekliyor(false);
    }
  };

  const gec = async () => {
    const s = await istek("/api/auth/eposta/gec");
    if (s.ok) {
      router.replace("/");
      router.refresh();
    } else {
      setHata(s.hata ?? "Geçilemedi.");
    }
  };

  const cikis = async () => {
    await fetch("/api/auth/cikis", { method: "POST" });
    router.replace("/giris");
    router.refresh();
  };

  return (
    <KartKabugu baslik="E-postanı doğrula">
      {adresAsamasi ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            kodIste(true);
          }}
          className="space-y-3"
        >
          <p className="text-sm text-amber-100/90">
            {eskiHesap
              ? "Hesabını korumak ve şifreni unutursan sıfırlayabilmek için bir e-posta adresi ekle. Veli e-postası da olabilir."
              : "E-posta adresini yaz, sana 6 haneli bir kod gönderelim."}
          </p>
          <input
            required
            type="email"
            value={eposta}
            onChange={(e) => setEposta(e.target.value)}
            placeholder="ornek@eposta.com"
            autoComplete="email"
            className={GIRDI_SINIFI}
          />
          {!kosulOnayli && (
            <label className="flex items-start gap-2 text-xs text-amber-100/90">
              <input type="checkbox" checked={kabul} onChange={(e) => setKabul(e.target.checked)} className="mt-0.5 h-4 w-4 accent-amber-400" />
              <span>
                <a href="/kullanim-kosullari" target="_blank" className="font-bold underline">Kullanım Koşulları</a> ve{" "}
                <a href="/gizlilik" target="_blank" className="font-bold underline">Gizlilik Bildirimi</a>&apos;ni okudum, kabul ediyorum (18 yaşından küçükler için velimin bilgisi dahilindedir).
              </span>
            </label>
          )}
          {hata && <p className="rounded-xl bg-red-950/70 px-3 py-2 text-xs font-semibold text-red-200 ring-1 ring-red-500/40">{hata}</p>}
          <button type="submit" disabled={bekliyor || (!kosulOnayli && !kabul)} className="varak-dugme w-full rounded-2xl py-3 text-sm font-black disabled:opacity-50">
            {bekliyor ? "Bekleyin…" : "📧 Kod gönder"}
          </button>
          {eskiHesap && (
            <button type="button" onClick={gec} className="w-full py-1 text-xs font-semibold text-amber-200/80 underline hover:text-amber-100">
              Şimdilik geç (7 gün sonra tekrar sorarız)
            </button>
          )}
        </form>
      ) : (
        <form onSubmit={dogrula} className="space-y-3">
          <p className="text-sm text-amber-100/90">
            <b>{eposta}</b> adresine 6 haneli bir kod gönderdik. Kodu aşağıya yaz.
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
          {mesaj && <p className="rounded-xl bg-emerald-950/60 px-3 py-2 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/40">{mesaj}</p>}
          {hata && <p className="rounded-xl bg-red-950/70 px-3 py-2 text-xs font-semibold text-red-200 ring-1 ring-red-500/40">{hata}</p>}
          <button type="submit" disabled={bekliyor || kod.length !== 6} className="varak-dugme w-full rounded-2xl py-3 text-sm font-black disabled:opacity-50">
            {bekliyor ? "Bekleyin…" : "✅ Doğrula"}
          </button>
          <div className="flex items-center justify-between text-xs font-semibold text-amber-200/80">
            <button type="button" onClick={() => kodIste(false)} disabled={bekliyor} className="underline hover:text-amber-100">
              Kodu tekrar gönder
            </button>
            <button type="button" onClick={() => { setAdresAsamasi(true); setHata(null); setMesaj(null); }} className="underline hover:text-amber-100">
              Adresi değiştir
            </button>
          </div>
        </form>
      )}
      <button type="button" onClick={cikis} className="mt-4 w-full text-center text-[11px] font-semibold text-amber-300/60 hover:text-amber-200">
        Çıkış yap
      </button>
    </KartKabugu>
  );
}
