"use client";
import { useCallback, useEffect, useState } from "react";
import { BIRLIK_ACILIS_LEVEL, ALAN_MUCADELESI_LEVEL, BIRLIK_BINALARI, KAYNAKLAR } from "@/lib/oyun/sabitler";

const SANCAK_RENKLERI = ["#d97706", "#059669", "#2563eb", "#dc2626", "#7c3aed", "#0d9488"];
const KASA_KAYNAKLARI = ["erzak", "kereste", "tas"];

export function BirlikPaneli({ oyun, varsayilanSekme = "birlik", seciliBolgeId = null, binaId = null }) {
  const { durum } = oyun;
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [sekme, setSekme] = useState(varsayilanSekme); // 'birlik' | 'sohbet' | 'fetih'
  const [ad, setAd] = useState("");
  const [slogan, setSlogan] = useState("");
  const [renk, setRenk] = useState(SANCAK_RENKLERI[0]);
  const [bagisKaynak, setBagisKaynak] = useState("erzak");
  const [bagisMiktar, setBagisMiktar] = useState(50);
  const [sohbetMetni, setSohbetMetni] = useState("");

  const yukle = useCallback(() => {
    setYukleniyor(true);
    fetch("/api/birlik")
      .then((r) => r.json())
      .then((j) => {
        setVeri(j);
        setYukleniyor(false);
      })
      .catch(() => setYukleniyor(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    yukle();
  }, [yukle]);

  const islemYap = async (govde, basariMesaji) => {
    const r = await fetch("/api/birlik", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(govde),
    });
    const j = await r.json();
    if (!r.ok) {
      oyun.setMesaj({ tur: "hata", metin: j.hata ?? "İşlem başarısız" });
      return false;
    }
    setVeri({ birlik: j.birlik, acikBirlikler: j.acikBirlikler, bolgeler: j.bolgeler });
    oyun.veriUygula(j);
    if (basariMesaji) oyun.setMesaj({ tur: "tamam", metin: basariMesaji });
    return true;
  };

  if (durum.level < BIRLIK_ACILIS_LEVEL) {
    return (
      <div className="rounded-2xl bg-stone-950/70 p-5 text-center">
        <div className="text-3xl">🤝</div>
        <h3 className="mt-2 text-base font-black text-amber-200">Birlik Alanı Level {BIRLIK_ACILIS_LEVEL}&apos;te Açılır</h3>
        <p className="mt-1 text-xs text-amber-200/70">
          Köyünün bireysel inşasını tamamlayıp Level {BIRLIK_ACILIS_LEVEL}&apos;e ulaştığında arkadaşlarınla Birlik Alanı&apos;na geçebilir, ortak vergi kasasına katkıda bulunabilir ve Birlik Otağı&apos;nda mesajlaşabilirsin.
        </p>
      </div>
    );
  }

  if (yukleniyor || !veri) {
    return <p className="p-4 text-center text-xs text-amber-200/70">Birlik bilgileri yükleniyor…</p>;
  }

  const { birlik, acikBirlikler, bolgeler } = veri;
  const birlikBinaTanim = binaId ? BIRLIK_BINALARI[binaId] : null;
  const birlikBinaSeviye = binaId && birlik ? birlik.binalar?.[binaId] ?? 1 : 1;
  const birlikBinaHedef = birlikBinaSeviye + 1;
  const birlikBinaBedel = birlikBinaTanim?.bedel?.[birlikBinaHedef] ?? null;

  return (
    <div className="space-y-3">
      {/* Eğer Birlik Alanı'ndaki belirli bir binadan açıldıysa ortak bina yükseltme kartı */}
      {birlik && birlikBinaTanim && (
        <div className="rounded-2xl bg-stone-950/85 p-3.5 ring-1 ring-amber-500/40">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                🏕️ Birlik Külliyesi Binası · Seviye {birlikBinaSeviye}/{birlikBinaTanim.maksSeviye}
              </span>
              <h3 className="text-sm font-black text-amber-100">{birlikBinaTanim.ad}</h3>
              <p className="text-[11px] text-amber-200/75">{birlikBinaTanim.aciklama}</p>
            </div>
            {birlikBinaBedel ? (
              <button
                type="button"
                onClick={() =>
                  islemYap(
                    { eylem: "binaYukselt", binaId },
                    `${birlikBinaTanim.ad} Seviye ${birlikBinaHedef}'e yükseltildi!`
                  )
                }
                className="shrink-0 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 px-3 py-2 text-xs font-black text-white shadow"
              >
                ⬆️ Lv.{birlikBinaHedef} Yükselt
                <span className="block text-[10px] font-normal text-emerald-100">
                  {Object.entries(birlikBinaBedel)
                    .map(([k, m]) => `${KAYNAKLAR[k].ikon}${m}`)
                    .join(" ")}
                </span>
              </button>
            ) : (
              <span className="shrink-0 rounded-xl bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-200">
                🏆 Maks. Seviye
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 rounded-xl bg-stone-950/70 p-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => setSekme("birlik")}
          className={`rounded-lg py-2 ${sekme === "birlik" ? "bg-amber-500 text-stone-900" : "text-amber-200/70"}`}
        >
          🏦 Vergi &amp; Üyeler
        </button>
        <button
          type="button"
          onClick={() => setSekme("sohbet")}
          className={`rounded-lg py-2 ${sekme === "sohbet" ? "bg-amber-500 text-stone-900" : "text-amber-200/70"}`}
        >
          💬 Otağ Sohbeti
        </button>
        <button
          type="button"
          onClick={() => setSekme("fetih")}
          className={`rounded-lg py-2 ${sekme === "fetih" ? "bg-amber-500 text-stone-900" : "text-amber-200/70"}`}
        >
          🚩 Sancak Haritası
        </button>
      </div>

      {sekme === "fetih" ? (
        <AlanMucadelesiGorunumu
          oyun={oyun}
          birlik={birlik}
          bolgeler={bolgeler}
          seciliBolgeId={seciliBolgeId}
          islemYap={islemYap}
        />
      ) : !birlik ? (
        <div className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              islemYap({ eylem: "kur", ad, slogan, renk }, "Birliğin kuruldu!");
            }}
            className="space-y-2.5 rounded-2xl bg-stone-950/75 p-4 ring-1 ring-amber-500/30"
          >
            <h3 className="text-sm font-black text-amber-200">🏕️ Yeni Birlik Kur</h3>
            <input
              required
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              placeholder="Birlik adı (örn: Alperenler, İhlas Kervanı)"
              className="w-full rounded-xl bg-stone-900 px-3 py-2 text-xs text-amber-50 ring-1 ring-stone-700"
            />
            <input
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              placeholder="Birlik parolası / sloganı"
              className="w-full rounded-xl bg-stone-900 px-3 py-2 text-xs text-amber-50 ring-1 ring-stone-700"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-200/80">Sancak Rengi:</span>
              {SANCAK_RENKLERI.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRenk(r)}
                  className={`h-6 w-6 rounded-full ${renk === r ? "ring-2 ring-white scale-110" : "opacity-70"}`}
                  style={{ backgroundColor: r }}
                />
              ))}
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 py-2.5 text-xs font-black text-stone-900"
            >
              🤝 Birliği Kur
            </button>
          </form>

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300/80">
              Açık Birlikler ({acikBirlikler.length})
            </h3>
            {acikBirlikler.length === 0 ? (
              <p className="rounded-xl bg-stone-950/50 p-3 text-center text-xs text-stone-400">
                Henüz kurulmuş birlik yok. İlk birliği sen kur!
              </p>
            ) : (
              acikBirlikler.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-2xl bg-stone-950/75 p-3 ring-1 ring-stone-800"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="grid h-8 w-8 place-items-center rounded-xl text-sm font-black text-white"
                      style={{ backgroundColor: b.renk }}
                    >
                      🚩
                    </span>
                    <div>
                      <p className="text-xs font-black text-amber-100">{b.ad}</p>
                      <p className="text-[11px] text-amber-200/70">
                        {b.slogan || "Birlikte rahmet vardır"} · {b.uye_sayisi} üye
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => islemYap({ eylem: "katil", birlikId: b.id }, `${b.ad} birliğine katıldın!`)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white"
                  >
                    Katıl
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : sekme === "sohbet" ? (
        <div className="space-y-3">
          <div className="rounded-2xl bg-stone-950/80 p-3.5 ring-1 ring-amber-500/30">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              💬 {birlik.ad} · Birlik Otağı İstişare Meclisi
            </h4>
            <p className="mt-0.5 text-[11px] text-amber-200/70">
              Birlik kardeşlerinle görevleri, namaz çetelesini ve Genel Harita stratejinizi burada konuşabilirsin.
            </p>
          </div>

          <div className="max-h-60 space-y-2 overflow-y-auto rounded-2xl bg-stone-950/90 p-3 ring-1 ring-stone-800">
            {!birlik.mesajlar || birlik.mesajlar.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-400">
                Birlik Otağı&apos;nda henüz mesaj yok. İlk selamı sen ver!
              </p>
            ) : (
              birlik.mesajlar.map((m) => {
                const benim = m.kullanici_id === oyun.kullanici?.id;
                return (
                  <div
                    key={m.id}
                    className={`rounded-xl px-3 py-2 text-xs ${
                      benim
                        ? "ml-6 bg-amber-500/20 text-amber-50 ring-1 ring-amber-400/40"
                        : "mr-6 bg-stone-900 text-amber-100 ring-1 ring-stone-800"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-amber-300/80">
                      <b>{m.yazar_ad}</b>
                      <span>{new Date(m.olusturma).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="mt-1 leading-relaxed">{m.mesaj}</p>
                  </div>
                );
              })
            )}
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (sohbetMetni.trim().length < 2) return;
              const ok = await islemYap({ eylem: "mesajYaz", mesaj: sohbetMetni }, "Mesajın Birlik Otağı'na iletildi!");
              if (ok) setSohbetMetni("");
            }}
            className="flex gap-1.5"
          >
            <input
              value={sohbetMetni}
              onChange={(e) => setSohbetMetni(e.target.value)}
              placeholder="Birlik kardeşlerine mesaj yaz…"
              className="flex-1 rounded-xl bg-stone-950 px-3 py-2 text-xs text-amber-50 ring-1 ring-stone-700"
            />
            <button
              type="submit"
              disabled={sohbetMetni.trim().length < 2}
              className="rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 px-4 py-2 text-xs font-black text-stone-900 disabled:from-stone-700 disabled:to-stone-800 disabled:text-stone-400"
            >
              Gönder
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Birlik Başlığı */}
          <div className="rounded-2xl bg-stone-950/80 p-3.5 ring-1 ring-amber-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="grid h-10 w-10 place-items-center rounded-xl text-lg shadow"
                  style={{ backgroundColor: birlik.renk }}
                >
                  🚩
                </span>
                <div>
                  <h3 className="text-base font-black text-amber-100">{birlik.ad}</h3>
                  <p className="text-xs text-amber-200/70">{birlik.slogan || "Kardeşlik ve İhlas Birliği"}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="block rounded-xl bg-emerald-900/50 px-2.5 py-1 text-xs font-black text-emerald-200 ring-1 ring-emerald-500/40">
                  ⚡ %{birlik.disiplinOrani} Disiplin
                </span>
                <span className="mt-1 block text-[10px] text-amber-300/80">
                  🕌 Bugün {birlik.namazToplam ?? 0} vakit namaz
                </span>
              </div>
            </div>

            {birlik.gelenTesvikler?.length > 0 && (
              <div className="mt-3 space-y-1 rounded-xl bg-amber-500/15 p-2.5 text-xs text-amber-100 ring-1 ring-amber-400/40">
                {birlik.gelenTesvikler.map((t) => (
                  <p key={t.id}>
                    💪 <b>{t.gonderen_ad}</b> bugün sana <i>&ldquo;Haydi Kardeşim!&rdquo;</i> teşviki gönderdi!{" "}
                    {t.karsilandi ? "✅ (Karşılandı +10 puan)" : "(Bugün bir görev tamamla, ikiniz de +10 puan kazanın!)"}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Birlik Kasası & Ortak Vergi */}
          <div className="rounded-2xl bg-stone-950/75 p-3.5 ring-1 ring-stone-800">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-300/80">
              🏦 Ortak Vergi &amp; Birlik Kasası
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              {KASA_KAYNAKLARI.map((k) => {
                const t = KAYNAKLAR[k];
                return (
                  <div key={k} className="rounded-xl bg-stone-900 p-2">
                    <span className="text-base">{t.ikon}</span>
                    <p className="text-[11px] text-amber-200/70">{t.ad}</p>
                    <p className="text-sm font-black tabular-nums text-amber-50">{birlik.kasa[k] ?? 0}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <select
                value={bagisKaynak}
                onChange={(e) => setBagisKaynak(e.target.value)}
                className="rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-bold text-amber-100 ring-1 ring-stone-700"
              >
                {KASA_KAYNAKLARI.map((k) => {
                  const t = KAYNAKLAR[k];
                  return (
                    <option key={k} value={k}>
                      {t.ikon} {t.ad} (Senin: {durum.envanter[k] ?? 0})
                    </option>
                  );
                })}
              </select>
              <input
                type="number"
                min={10}
                step={10}
                value={bagisMiktar}
                onChange={(e) => setBagisMiktar(Number(e.target.value))}
                className="w-20 rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-bold text-amber-100 ring-1 ring-stone-700"
              />
              <button
                type="button"
                onClick={() =>
                  islemYap(
                    { eylem: "bagis", kaynak: bagisKaynak, miktar: bagisMiktar },
                    "Ortak vergi/katkı birlik kasasına eklendi!"
                  )
                }
                className="flex-1 rounded-lg bg-gradient-to-b from-amber-400 to-amber-600 px-3 py-1.5 text-xs font-black text-stone-900"
              >
                🎁 Vergi / Katkı Ver
              </button>
            </div>
          </div>

          {/* Üyeler ve Kardeşlik Teşviki */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300/80">
              👥 Birlik Kardeşleri ({birlik.uyeler.length})
            </h4>
            {birlik.uyeler.map((u) => {
              const kendisi = u.id === oyun.kullanici?.id;
              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-xl bg-stone-950/75 px-3 py-2 text-xs ring-1 ring-stone-800"
                >
                  <div>
                    <p className="font-bold text-amber-100">
                      {u.ad} <span className="text-amber-300/70">· Lv.{u.level}</span>
                      {u.id === birlik.liderId && <span className="ml-1 text-amber-400">👑</span>}
                    </p>
                    <p className="text-[11px] text-amber-200/70">
                      Katkı: <b>{u.katkiPuani}</b> p · Vergi: <b>{u.bagisToplam}</b> · 🕌 {u.bugunNamaz ?? 0}/5 ·{" "}
                      {u.bugunAktif ? (
                        <span className="text-emerald-300">✅ Aktif</span>
                      ) : (
                        <span className="text-stone-400">⏳ Bekleniyor</span>
                      )}
                    </p>
                  </div>
                  {!kendisi && !u.bugunAktif && (
                    <button
                      type="button"
                      disabled={u.bugunTesvikEdildi}
                      onClick={() =>
                        islemYap(
                          { eylem: "tesvik", aliciId: u.id },
                          `${u.ad} kardeşine 'Haydi Kardeşim!' teşviki gönderildi!`
                        )
                      }
                      className="rounded-lg bg-sky-600 px-2.5 py-1 text-[11px] font-black text-white disabled:bg-stone-800 disabled:text-stone-400"
                    >
                      {u.bugunTesvikEdildi ? "Gönderildi" : "💪 Teşvik Et"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() =>
              confirm("Birlikten ayrılmak istediğine emin misin?") && islemYap({ eylem: "ayril" }, "Birlikten ayrıldın.")
            }
            className="w-full rounded-xl bg-stone-800 py-2 text-xs font-bold text-red-300 hover:bg-red-950/60"
          >
            Birlikten Ayrıl
          </button>
        </div>
      )}
    </div>
  );
}

function AlanMucadelesiGorunumu({ oyun, birlik, bolgeler, seciliBolgeId, islemYap }) {
  const acik = oyun.durum.level >= ALAN_MUCADELESI_LEVEL;

  if (!acik) {
    return (
      <div className="rounded-2xl bg-stone-950/75 p-5 text-center">
        <div className="text-3xl">🚩</div>
        <h3 className="mt-2 text-base font-black text-amber-200">
          Genel Sancak Haritası Level {ALAN_MUCADELESI_LEVEL}&apos;da Açılır
        </h3>
        <p className="mt-1 text-xs text-amber-200/70">
          Level {ALAN_MUCADELESI_LEVEL}&apos;ya ulaştığında birliğinle birlikte 6 stratejik bölgede sancağı dalgalandırmak için mücadele edebilirsin!
        </p>
      </div>
    );
  }

  const siraliBolgeler = seciliBolgeId
    ? [...bolgeler].sort((a, b) => (a.id === seciliBolgeId ? -1 : b.id === seciliBolgeId ? 1 : 0))
    : bolgeler;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-amber-500/10 p-3 text-xs text-amber-100 ring-1 ring-amber-500/30">
        <b>⚔️ Nasıl Çalışır?</b> Bir bölgeye hamle yapmak için <b>Birlik Kasası&apos;ndan</b> kaynak harcanır. Hamlenin gücü, birliğindeki kardeşlerinin <b>günlük görev ve namaz disiplini (%{birlik?.disiplinOrani ?? 0})</b> ile çarpılır!
      </div>

      <div className="space-y-2.5">
        {siraliBolgeler.map((b) => {
          const vurgulu = b.id === seciliBolgeId;
          return (
            <div
              key={b.id}
              className={`rounded-2xl bg-stone-950/80 p-3.5 ring-1 ${
                vurgulu ? "ring-2 ring-amber-400 shadow-lg" : "ring-stone-800"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-black text-amber-100">
                    {b.ikon} {b.ad}
                  </h4>
                  <p className="text-[11px] text-amber-200/70">
                    Temel Güç: <b>+{b.temelGuc}</b> · Bedel:{" "}
                    {Object.entries(b.bedel)
                      .map(([k, m]) => `${KAYNAKLAR[k].ikon}${m}`)
                      .join(" · ")}
                  </p>
                </div>
                {b.lider ? (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-black text-white shadow"
                    style={{ backgroundColor: b.lider.renk }}
                  >
                    🚩 {b.lider.ad} ({b.lider.guc})
                  </span>
                ) : (
                  <span className="rounded-full bg-stone-800 px-2.5 py-0.5 text-[11px] text-stone-400">Sahipsiz</span>
                )}
              </div>

              {b.siralama?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  {b.siralama.map((s, idx) => (
                    <span key={s.birlik_id} className="rounded-md bg-stone-900 px-2 py-0.5 text-amber-200/90">
                      #{idx + 1} {s.birlik_ad}: <b>{s.guc}</b>
                    </span>
                  ))}
                </div>
              )}

              {birlik && (
                <button
                  type="button"
                  onClick={() =>
                    islemYap({ eylem: "fetihHamlesi", bolgeId: b.id }, `${b.ad} bölgesine birlik hamlesi yapıldı!`)
                  }
                  className="mt-2.5 w-full rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 py-2 text-xs font-black text-stone-900 shadow"
                >
                  ⚔️ Birlik Kasasıyla Hamle Yap ({b.ad})
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
