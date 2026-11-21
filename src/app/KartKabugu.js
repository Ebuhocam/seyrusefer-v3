// Giriş, doğrulama, şifre sıfırlama ve yasal sayfalar için ortak zemin + kart.
export default function KartKabugu({ baslik, genis = false, children }) {
  return (
    <main className="fixed inset-0 grid place-items-center overflow-auto bg-stone-950 p-4 text-amber-50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/harita/koy.webp"
        alt=""
        className="giris-harita pointer-events-none fixed inset-0 h-full w-full object-cover opacity-50"
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(13,22,40,0.35), rgba(13,22,40,0.92) 75%), linear-gradient(180deg, rgba(13,22,40,0.6), transparent 30%, transparent 70%, rgba(13,22,40,0.85))",
        }}
      />
      <div className={`tezhip levha-ac relative my-6 w-full rounded-[1.75rem] p-6 sm:p-8 ${genis ? "max-w-2xl" : "max-w-sm"}`}>
        <h1 className="giris-baslik mb-1 text-center text-3xl leading-tight font-black sm:text-4xl">{baslik}</h1>
        <div className="cetvel mx-auto my-3 w-3/4" />
        {children}
      </div>
    </main>
  );
}

export const GIRDI_SINIFI =
  "w-full rounded-xl bg-stone-950/80 px-3.5 py-2.5 text-sm text-amber-50 ring-1 ring-amber-500/25 placeholder:text-stone-400 focus:ring-2 focus:ring-amber-400 focus:outline-none";
