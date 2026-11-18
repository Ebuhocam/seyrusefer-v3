"use client";

import { useCallback, useEffect, useState } from "react";

const ETIKET = {
  erzak: "🌾 Mahsul",
  kereste: "🌲 Odun",
  tas: "🧱 Taş",
};
const KAYNAKLAR = ["erzak", "kereste", "tas"];

const etiket = (k) => ETIKET[k] ?? k;

export default function TakasMerkezi({ oyun }) {
  const [veri, setVeri] = useState(undefined);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [verKaynak, setVerKaynak] = useState("kereste");
  const [alKaynak, setAlKaynak] = useState("tas");
  const [verMiktar, setVerMiktar] = useState("10");
  const [alMiktar, setAlMiktar] = useState("10");
  const [onay, setOnay] = useState(null); // `${islem}:${id}`

  const envanter = oyun?.durum?.envanter ?? {};
  const benimId = oyun?.kullanici?.id;

  const yenile = useCallback(() => {
    return fetch("/api/birlik/takas", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setVeri(j))
      .catch(() => {});
  }, []);

  useEffect(() => {
    yenile();
  }, [yenile]);

  const sinir = veri?.sinirlar ?? {
    enCokMiktar: 200,
    acikTeklifSiniri: 3,
    enCokOran: 3,
  };

  async function gonder(govde) {
    setYukleniyor(true);
    try {
      const r = await fetch("/api/birlik/takas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(govde),
      });
      const j = await r.json();
      if (!r.ok || j.hata) {
        oyun.setMesaj({ tur: "hata", metin: j.hata ?? "İşlem yapılamadı." });
        await yenile();
        return;
      }
      if (j.oyun) oyun.veriUygula(j.oyun);
      if (j.mesaj) oyun.setMesaj({ tur: "tamam", metin: j.mesaj });
      setVeri(j);
      setOnay(null);
    } catch {
      oyun.setMesaj({ tur: "hata", metin: "Bağlantı kurulamadı." });
      await yenile();
    } finally {
      setYukleniyor(false);
    }
  }

  const kabuk =
    "scroll-mt-24 rounded-3xl bg-stone-950/85 p-4 ring-1 ring-amber-500/30 sm:p-5";

  if (veri === undefined) {
    return (
      <section id="takas" className={kabuk}>
        <h2 className="font-display text-xl text-amber-100">🤝 Takas Merkezi</h2>
        <p className="mt-2 text-sm text-amber-200/70">Pano hazırlanıyor…</p>
      </section>
    );
  }

  if (!veri.birlik) {
    return (
      <section id="takas" className={kabuk}>
        <h2 className="font-display text-xl text-amber-100">🤝 Takas Merkezi</h2>
        <div className="mt-3 rounded-2xl bg-stone-900/80 p-4 ring-1 ring-stone-700">
          <p className="text-sm text-amber-100">
            Takas için önce bir birliğe katıl.
          </p>
        </div>
      </section>
    );
  }

  // doğrulama
  const vm = Number(verMiktar);
  const am = Number(alMiktar);
  const sahip = Number(envanter[verKaynak] ?? 0);
  const acikSayi = (veri.teklifler ?? []).filter((t) => t.benim).length;
  let uyari = "";
  if (verKaynak === alKaynak) uyari = "Aynı kaynağı takas edemezsin.";
  else if (!Number.isInteger(vm) || !Number.isInteger(am) || vm < 1 || am < 1)
    uyari = "Miktarlar tam sayı olmalı.";
  else if (vm > sinir.enCokMiktar || am > sinir.enCokMiktar)
    uyari = `Miktar 1 ile ${sinir.enCokMiktar} arasında olmalı.`;
  else if (vm > sinir.enCokOran * am || am > sinir.enCokOran * vm)
    uyari = `Adil takas: bir taraf diğerinin en çok ${sinir.enCokOran} katı olabilir.`;
  else if (vm > sahip) uyari = `Depoda yeterli ${etiket(verKaynak)} yok.`;
  else if (acikSayi >= sinir.acikTeklifSiniri)
    uyari = `En fazla ${sinir.acikTeklifSiniri} açık teklifin olabilir.`;
  const gecerli = !uyari;

  function verKaynakDegis(k) {
    setVerKaynak(k);
    if (k === alKaynak) setAlKaynak(KAYNAKLAR.find((x) => x !== k));
  }
  function alKaynakDegis(k) {
    setAlKaynak(k);
    if (k === verKaynak) setVerKaynak(KAYNAKLAR.find((x) => x !== k));
  }

  const alan =
    "rounded-xl bg-stone-900 px-3 py-2 text-sm text-amber-100 ring-1 ring-stone-700 focus:outline-none focus:ring-amber-400";

  return (
    <section id="takas" className={kabuk}>
      <h2 className="font-display text-xl text-amber-100">
        🤝 Takas Merkezi · {veri.birlik.ad}
      </h2>

      <form
        className="mt-3 rounded-2xl bg-stone-900/80 p-3 ring-1 ring-stone-700"
        onSubmit={(e) => {
          e.preventDefault();
          if (!gecerli || yukleniyor) return;
          gonder({
            islem: "teklifVer",
            verKaynak,
            verMiktar: vm,
            alKaynak,
            alMiktar: am,
          });
        }}
      >
        <h3 className="font-display text-lg text-amber-100">📦 Yeni Teklif</h3>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-amber-200/70">Veriyorum</p>
            <div className="mt-1 flex gap-2">
              <select
                className={`${alan} min-w-0 flex-1`}
                value={verKaynak}
                onChange={(e) => verKaynakDegis(e.target.value)}
                disabled={yukleniyor}
              >
                {KAYNAKLAR.map((k) => (
                  <option key={k} value={k}>
                    {etiket(k)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={sinir.enCokMiktar}
                className={`${alan} w-24`}
                value={verMiktar}
                onChange={(e) => setVerMiktar(e.target.value)}
                disabled={yukleniyor}
              />
            </div>
            <p className="mt-1 text-xs text-amber-200/60">
              Depoda: {sahip} {etiket(verKaynak)}
            </p>
          </div>
          <div>
            <p className="text-xs text-amber-200/70">İstiyorum</p>
            <div className="mt-1 flex gap-2">
              <select
                className={`${alan} min-w-0 flex-1`}
                value={alKaynak}
                onChange={(e) => alKaynakDegis(e.target.value)}
                disabled={yukleniyor}
              >
                {KAYNAKLAR.map((k) => (
                  <option key={k} value={k}>
                    {etiket(k)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={sinir.enCokMiktar}
                className={`${alan} w-24`}
                value={alMiktar}
                onChange={(e) => setAlMiktar(e.target.value)}
                disabled={yukleniyor}
              />
            </div>
            <p className="mt-1 text-xs text-amber-200/60">
              Depoda: {Number(envanter[alKaynak] ?? 0)} {etiket(alKaynak)}
            </p>
          </div>
        </div>

        {gecerli ? (
          <p className="mt-3 text-sm text-emerald-300">
            Kardeşlerine {vm} {etiket(verKaynak)} verip {am} {etiket(alKaynak)}{" "}
            istiyorsun.
          </p>
        ) : (
          <p className="mt-3 text-sm text-red-300">{uyari}</p>
        )}

        <button
          type="submit"
          disabled={!gecerli || yukleniyor}
          className="varak-dugme varak-isilti mt-3 rounded-xl px-4 py-2 text-sm disabled:opacity-50"
        >
          {yukleniyor ? "Gönderiliyor…" : "Teklifi Panoya As"}
        </button>
      </form>

      <div className="mt-4 rounded-2xl bg-stone-900/80 p-3 ring-1 ring-stone-700">
        <h3 className="font-display text-lg text-amber-100">📜 Teklif Panosu</h3>
        {(veri.teklifler ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-amber-200/70">
            Panoda teklif yok. İlk teklifi sen as!
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {veri.teklifler.map((t) => {
              const benim = t.benim || (benimId != null && t.veren_id === benimId);
              const yetmez = Number(envanter[t.al_kaynak] ?? 0) < t.al_miktar;
              const islem = benim ? "iptal" : "kabulEt";
              const anahtar = `${islem}:${t.id}`;
              const onayda = onay === anahtar;
              return (
                <li
                  key={t.id}
                  className={`rounded-xl bg-stone-950/60 p-3 ring-1 ${
                    benim ? "ring-amber-400/60" : "ring-stone-700"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-amber-100">
                      <span className="font-semibold">{t.veren_ad}</span>: veriyor{" "}
                      {t.ver_miktar} {etiket(t.ver_kaynak)} → istiyor{" "}
                      {t.al_miktar} {etiket(t.al_kaynak)}
                    </p>
                    {benim && (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">
                        Senin teklifin
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {onayda ? (
                      <>
                        <span className="text-xs text-amber-200">
                          {benim ? "Teklifi geri çekmek istiyor musun?" : "Takası onaylıyor musun?"}
                        </span>
                        <button
                          type="button"
                          disabled={yukleniyor}
                          onClick={() => gonder({ islem, teklifId: t.id })}
                          className="varak-dugme varak-isilti rounded-xl px-4 py-2 text-sm disabled:opacity-50"
                        >
                          Evet
                        </button>
                        <button
                          type="button"
                          disabled={yukleniyor}
                          onClick={() => setOnay(null)}
                          className="rounded-xl px-4 py-2 text-sm text-amber-200 ring-1 ring-stone-700 disabled:opacity-50"
                        >
                          Vazgeç
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={yukleniyor || (!benim && yetmez)}
                          onClick={() => setOnay(anahtar)}
                          className={
                            benim
                              ? "rounded-xl px-4 py-2 text-sm text-red-200 ring-1 ring-red-500/50 disabled:opacity-50"
                              : "varak-dugme varak-isilti rounded-xl px-4 py-2 text-sm disabled:opacity-50"
                          }
                        >
                          {benim ? "Geri Çek" : "🤝 Kabul Et"}
                        </button>
                        {!benim && yetmez && (
                          <span className="text-xs text-red-300">
                            Yetersiz: {t.al_miktar} {etiket(t.al_kaynak)} gerekli
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-stone-900/80 p-3 ring-1 ring-stone-700">
        <h3 className="font-display text-lg text-amber-100">🔁 Son Takaslar</h3>
        {(veri.sonTakaslar ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-amber-200/70">Henüz takas yapılmadı.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-xs text-amber-200">
            {veri.sonTakaslar.map((s) => (
              <li key={s.id}>
                {s.veren_ad} → {s.alan_ad}: {s.ver_miktar} {etiket(s.ver_kaynak)}{" "}
                ⇄ {s.al_miktar} {etiket(s.al_kaynak)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-xs text-amber-200/70">
        Teklifin kabul edilene kadar verdiğin kaynak emanette durur; geri
        çekersen depona döner. Adil takas: bir taraf diğerinin en çok{" "}
        {sinir.enCokOran} katı olabilir.
      </p>
    </section>
  );
}
