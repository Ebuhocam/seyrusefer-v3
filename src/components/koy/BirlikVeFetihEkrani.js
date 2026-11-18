"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BIRLIK_ACILIS_LEVEL, ALAN_MUCADELESI_LEVEL, BIRLIK_BINALARI, KAYNAKLAR, sayiyaEk } from "@/lib/oyun/sabitler";

const SANCAK_RENKLERI = ["#d97706", "#059669", "#2563eb", "#dc2626", "#7c3aed", "#0d9488"];
const KASA_KAYNAKLARI = ["erzak", "kereste", "tas"];

const bedelYazisi = (bedel) =>
  Object.entries(bedel ?? {})
    .filter(([, m]) => m > 0)
    .map(([k, m]) => `${KAYNAKLAR[k]?.ikon ?? ""}${m}`)
    .join(" ");

/** Tek dokunuşla geri alınamayan işlemler için satır içi iki adımlı onay (window.confirm yerine) */
function OnayliDugme({ etiket, soru, onayEtiketi = "Evet", onOnay, mesgul, sinif = "", onaySinif = "" }) {
  const [soruyor, setSoruyor] = useState(false);
  if (!soruyor) {
    return (
      <button type="button" disabled={mesgul} onClick={() => setSoruyor(true)} className={sinif}>
        {etiket}
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-red-950/80 px-2 py-1 ring-1 ring-red-400/50">
      <span className="text-[11px] font-bold text-red-100">{soru}</span>
      <button
        type="button"
        disabled={mesgul}
        onClick={() => {
          setSoruyor(false);
          onOnay();
        }}
        className={`rounded-md bg-red-600 px-2 py-1 text-[11px] font-black text-white hover:bg-red-500 ${onaySinif}`}
      >
        {onayEtiketi}
      </button>
      <button type="button" onClick={() => setSoruyor(false)} className="rounded-md bg-stone-800 px-2 py-1 text-[11px] font-bold text-stone-200">
        Vazgeç
      </button>
    </span>
  );
}

export function BirlikPaneli({ oyun, varsayilanSekme = "birlik", seciliBolgeId = null, binaId = null }) {
  const { durum } = oyun;
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hataMetni, setHataMetni] = useState("");
  const [mesgul, setMesgul] = useState(false);
  const mesgulRef = useRef(false);
  const [sekme, setSekme] = useState(varsayilanSekme); // 'birlik' | 'sohbet' | 'fetih'
  const [ad, setAd] = useState("");
  const [slogan, setSlogan] = useState("");
  const [renk, setRenk] = useState(SANCAK_RENKLERI[0]);
  const [bagisKaynak, setBagisKaynak] = useState("erzak");
  const [bagisMiktar, setBagisMiktar] = useState(50);
  const [sohbetMetni, setSohbetMetni] = useState("");
  const [sonHamle, setSonHamle] = useState(null);
  const [formHatasi, setFormHatasi] = useState("");

  const yukle = useCallback(() => {
    setYukleniyor(true);
    setHataMetni("");
    fetch("/api/birlik")
      .then((r) => {
        if (!r.ok) throw new Error("hata");
        return r.json();
      })
      .then((j) => {
        setVeri(j);
        setYukleniyor(false);
      })
      .catch(() => {
        setHataMetni("Birlik bilgileri alınamadı. İnternetini kontrol edip tekrar dener misin?");
        setYukleniyor(false);
      });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    yukle();
  }, [yukle]);

  /** Her işlem tek seferde çalışır (çift dokunuş ikinci istek göndermez); sonuç ya da hata mutlaka kullanıcıya gösterilir */
  const islemYap = async (govde, basariMesaji) => {
    if (mesgulRef.current) return false;
    mesgulRef.current = true;
    setMesgul(true);
    try {
      const r = await fetch("/api/birlik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(govde),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const metin = j.hata ?? "İşlem başarısız oldu.";
        oyun.setMesaj({ tur: "hata", metin });
        setFormHatasi(metin);
        if (r.status === 404 || r.status === 409) yukle(); // liste eskimiş olabilir
        return false;
      }
      setFormHatasi("");
      setVeri({ birlik: j.birlik, acikBirlikler: j.acikBirlikler, bolgeler: j.bolgeler, uyeSiniri: j.uyeSiniri });
      oyun.veriUygula(j);
      if (j.hamleSonucu) setSonHamle(j.hamleSonucu);
      const metin = j.bildirim ?? basariMesaji;
      if (metin) oyun.setMesaj({ tur: "tamam", metin });
      return true;
    } catch {
      oyun.setMesaj({ tur: "hata", metin: "Sunucuya ulaşılamadı. Biraz sonra tekrar dene." });
      return false;
    } finally {
      mesgulRef.current = false;
      setMesgul(false);
    }
  };

  if (durum.level < BIRLIK_ACILIS_LEVEL) {
    return (
      <div className="parsomen rounded-2xl p-5 text-center">
        <div className="text-3xl">🤝</div>
        <h3 className="mt-2 text-base font-black text-amber-200">Birlik Alanı Level {BIRLIK_ACILIS_LEVEL}&apos;te Açılır</h3>
        <p className="mt-1 text-xs text-amber-200/70">
          Köyünün bireysel inşasını tamamlayıp Level {BIRLIK_ACILIS_LEVEL}&apos;e ulaştığında arkadaşlarınla Birlik Alanı&apos;na geçebilir, ortak vergi kasasına katkıda bulunabilir ve Birlik Otağı&apos;nda mesajlaşabilirsin.
        </p>
      </div>
    );
  }

  if (hataMetni) {
    return (
      <div className="rounded-2xl bg-red-950/60 p-4 text-center text-xs text-red-100 ring-1 ring-red-400/40">
        <p>{hataMetni}</p>
        <button type="button" onClick={yukle} className="varak-dugme mt-3 rounded-xl px-4 py-2 text-xs font-black">
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (yukleniyor || !veri) {
    return <p className="p-4 text-center text-xs text-amber-200/70">Birlik bilgileri yükleniyor…</p>;
  }

  const { birlik, acikBirlikler, bolgeler } = veri;
  const uyeSiniri = veri.uyeSiniri ?? birlik?.uyeSiniri ?? 8;
  const birlikBinaTanim = binaId ? BIRLIK_BINALARI[binaId] : null;
  const birlikBinaSeviye = binaId && birlik ? birlik.binalar?.[binaId] ?? 1 : 1;
  const birlikBinaHedef = birlikBinaSeviye + 1;
  const birlikBinaBedel = birlikBinaTanim?.bedel?.[birlikBinaHedef] ?? null;
  const binaKasaYeterli = !!birlik && !!birlikBinaBedel && Object.entries(birlikBinaBedel).every(([k, m]) => (birlik.kasa?.[k] ?? 0) >= m);
  const ben = oyun.kullanici?.id;
  // Birliği olmayan öğrenci için "sohbet" yerine kurma/katılma ekranı gösterilir; sekme vurgusu da onunla uyumlu olsun
  const aktifSekme = !birlik && sekme === "sohbet" ? "birlik" : sekme;

  return (
    <div className="space-y-3">
      {/* Birlik Alanı'ndaki belirli bir binadan açıldıysa ortak bina yükseltme kartı */}
      {birlikBinaTanim && (
        <div className="tezhip rounded-2xl bg-stone-950/85 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-amber-300">
                🏕️ Birlik Külliyesi Binası · Seviye {birlikBinaSeviye}/{birlikBinaTanim.maksSeviye}
              </span>
              <h3 className="text-sm font-black text-amber-100">{birlikBinaTanim.ad}</h3>
              <p className="text-[11px] text-amber-200/75">{birlikBinaTanim.aciklama}</p>
              {!birlik && <p className="mt-1 text-[11px] font-bold text-amber-300">Yükseltmek için önce bir birliğe katılmalısın.</p>}
            </div>
            {birlikBinaBedel ? (
              <button
                type="button"
                disabled={mesgul || !birlik || !binaKasaYeterli}
                onClick={() =>
                  islemYap({ eylem: "binaYukselt", binaId }, `${birlikBinaTanim.ad} seviye ${sayiyaEk(birlikBinaHedef)} yükseltildi!`)
                }
                className="varak-dugme shrink-0 rounded-xl px-3 py-2 text-xs font-black disabled:opacity-50"
              >
                ⬆️ Lv.{birlikBinaHedef} Yükselt
                <span className="block text-[11px] font-normal">{bedelYazisi(birlikBinaBedel)}</span>
              </button>
            ) : (
              <span className="shrink-0 rounded-xl bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-200">🏆 Maks. Seviye</span>
            )}
          </div>
          {birlik && birlikBinaBedel && !binaKasaYeterli && (
            <p className="mt-2 rounded-lg bg-stone-900 px-2.5 py-1.5 text-[11px] text-amber-200/80">
              Birlik kasasında yeterli kaynak yok. Kasada: {bedelYazisi(birlik.kasa)}. Kardeşlerinle kasaya bağış yapın!
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 rounded-xl bg-stone-950/70 p-1 text-xs font-bold">
        {[
          ["birlik", "🏦 Vergi & Üyeler"],
          ["sohbet", "🕊️ Haberleşme"],
          ["fetih", "🚩 Sancak Haritası"],
        ].map(([kod, etiket]) => (
          <button
            key={kod}
            type="button"
            onClick={() => setSekme(kod)}
            className={`rounded-lg py-2 ${aktifSekme === kod ? "varak-dugme" : "text-amber-200/70"}`}
          >
            {etiket}
          </button>
        ))}
      </div>

      {aktifSekme === "fetih" ? (
        <AlanMucadelesiGorunumu
          oyun={oyun}
          birlik={birlik}
          bolgeler={bolgeler}
          seciliBolgeId={seciliBolgeId}
          islemYap={islemYap}
          mesgul={mesgul}
          sonHamle={sonHamle}
          kapatHamle={() => setSonHamle(null)}
        />
      ) : !birlik ? (
        <div className="space-y-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const temiz = ad.trim();
              if (temiz.length < 3) return setFormHatasi("Birlik adı en az 3 karakter olmalı.");
              await islemYap({ eylem: "kur", ad: temiz, slogan, renk }, "Birliğin kuruldu! Şimdi arkadaşlarını davet edebilirsin.");
            }}
            className="tezhip space-y-2.5 rounded-2xl bg-stone-950/75 p-4"
          >
            <h3 className="text-sm font-black text-amber-200">🏕️ Yeni Birlik Kur</h3>
            <input
              required
              maxLength={28}
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              placeholder="Birlik adı (örn: Alperenler, İhlas Kervanı)"
              className="w-full rounded-xl bg-stone-900 px-3 py-2 text-xs text-amber-50 ring-1 ring-stone-700"
            />
            <input
              maxLength={80}
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              placeholder="Birlik parolası / sloganı (isteğe bağlı)"
              className="w-full rounded-xl bg-stone-900 px-3 py-2 text-xs text-amber-50 ring-1 ring-stone-700"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-200/80">Sancak Rengi:</span>
              {SANCAK_RENKLERI.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-label={`Sancak rengi ${r}`}
                  onClick={() => setRenk(r)}
                  className={`h-6 w-6 rounded-full ${renk === r ? "ring-2 ring-white scale-110" : "opacity-70"}`}
                  style={{ backgroundColor: r }}
                />
              ))}
            </div>
            {formHatasi && <p className="rounded-lg bg-red-950/70 px-2.5 py-1.5 text-[11px] font-bold text-red-100">{formHatasi}</p>}
            <button type="submit" disabled={mesgul} className="varak-dugme w-full rounded-xl py-2.5 text-xs font-black disabled:opacity-50">
              🤝 Birliği Kur
            </button>
          </form>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-amber-300/80">Açık Birlikler ({acikBirlikler.length})</h3>
            {acikBirlikler.length === 0 ? (
              <p className="rounded-xl bg-stone-950/50 p-3 text-center text-xs text-stone-400">Henüz kurulmuş birlik yok. İlk birliği sen kur!</p>
            ) : (
              acikBirlikler.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-2xl bg-stone-950/75 p-3 ring-1 ring-stone-800">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-xl text-sm font-black text-white" style={{ backgroundColor: b.renk }}>
                      🚩
                    </span>
                    <div>
                      <p className="text-xs font-black text-amber-100">{b.ad}</p>
                      <p className="text-[11px] text-amber-200/70">
                        {b.slogan || "Birlikte rahmet vardır"} · {b.uye_sayisi}/{uyeSiniri} üye{b.lider_ad ? ` · 👑 ${b.lider_ad}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={mesgul || b.dolu}
                    onClick={() => islemYap({ eylem: "katil", birlikId: b.id }, `${b.ad} birliğine katıldın!`)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white disabled:bg-stone-800 disabled:text-stone-400"
                  >
                    {b.dolu ? "Dolu" : "Katıl"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : aktifSekme === "sohbet" ? (
        <div className="space-y-3">
          <div className="tezhip rounded-2xl bg-stone-950/80 p-3.5">
            <h4 className="text-xs font-bold text-amber-300">💬 {birlik.ad} · Birlik Otağı İstişare Meclisi</h4>
            <p className="mt-0.5 text-[11px] text-amber-200/70">
              Birlik kardeşlerinle görevleri, namaz çetelesini ve Sancak Talimi stratejinizi burada konuşabilirsin. Güzel ve saygılı konuşalım; kırıcı sözler gönderilmez, rahatsız eden mesajı 🚩 ile şikâyet edebilirsin.
            </p>
          </div>

          <div className="max-h-60 space-y-2 overflow-y-auto rounded-2xl bg-stone-950/90 p-3 ring-1 ring-stone-800">
            {!birlik.mesajlar || birlik.mesajlar.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-400">Haberleşme Kulesi&apos;nde henüz mesaj yok. İlk selamı sen ver!</p>
            ) : (
              birlik.mesajlar.map((m) => {
                const benim = m.kullanici_id === ben;
                const silebilir = benim || birlik.benLider;
                return (
                  <div
                    key={m.id}
                    className={`rounded-xl px-3 py-2 text-xs ${
                      benim ? "ml-6 bg-amber-500/20 text-amber-50 ring-1 ring-amber-400/40" : "mr-6 bg-stone-900 text-amber-100 ring-1 ring-stone-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-amber-300/80">
                      <b>{m.yazar_ad}</b>
                      <span className="flex items-center gap-2">
                        {new Date(m.olusturma).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                        {silebilir && (
                          <OnayliDugme
                            etiket="🗑"
                            soru="Silinsin mi?"
                            onayEtiketi="Sil"
                            mesgul={mesgul}
                            sinif="text-stone-400 hover:text-red-300"
                            onOnay={() => islemYap({ eylem: "mesajSil", mesajId: m.id }, "Mesaj silindi.")}
                          />
                        )}
                        {!benim && (
                          <OnayliDugme
                            etiket="🚩"
                            soru="Şikâyet edilsin mi?"
                            onayEtiketi="Şikâyet Et"
                            mesgul={mesgul}
                            sinif="text-stone-400 hover:text-amber-300"
                            onOnay={() => islemYap({ eylem: "mesajSikayet", mesajId: m.id }, "Şikâyetin alındı.")}
                          />
                        )}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed">{m.mesaj}</p>
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
            className="space-y-1"
          >
            <div className="flex gap-1.5">
              <input
                value={sohbetMetni}
                maxLength={280}
                onChange={(e) => setSohbetMetni(e.target.value)}
                placeholder="Birlik kardeşlerine mesaj yaz…"
                className="flex-1 rounded-xl bg-stone-950 px-3 py-2 text-xs text-amber-50 ring-1 ring-stone-700"
              />
              <button
                type="submit"
                disabled={mesgul || sohbetMetni.trim().length < 2}
                className="varak-dugme rounded-xl px-4 py-2 text-xs font-black disabled:opacity-50"
              >
                Gönder
              </button>
            </div>
            <p className="text-right text-[11px] text-stone-400">{sohbetMetni.length}/280</p>
          </form>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Birlik Başlığı */}
          <div className="tezhip rounded-2xl bg-stone-950/80 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-xl text-lg shadow" style={{ backgroundColor: birlik.renk }}>
                  🚩
                </span>
                <div>
                  <h3 className="text-base font-black text-amber-100">{birlik.ad}</h3>
                  <p className="text-xs text-amber-200/70">{birlik.slogan || "Kardeşlik ve İhlas Birliği"}</p>
                  <p className="text-[11px] text-amber-300/80">
                    👥 {birlik.uyeler.length}/{uyeSiniri} kardeş
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="block rounded-xl bg-emerald-900/50 px-2.5 py-1 text-xs font-black text-emerald-200 ring-1 ring-emerald-500/40">
                  ⚡ Haftalık Disiplin %{birlik.haftalikDisiplin}
                </span>
                <span className="mt-1 block text-[11px] text-amber-300/80">
                  Bugün aktif: %{birlik.disiplinOrani} · 🕌 {birlik.namazToplam ?? 0} vakit
                </span>
              </div>
            </div>

            {birlik.gelenTesvikler?.length > 0 && (
              <div className="mt-3 space-y-1 rounded-xl bg-amber-500/15 p-2.5 text-xs text-amber-100 ring-1 ring-amber-400/40">
                {birlik.gelenTesvikler.map((t) => (
                  <p key={t.id}>
                    💪 <b>{t.gonderen_ad}</b> bugün sana <i>&ldquo;Haydi Kardeşim!&rdquo;</i> teşviki gönderdi!{" "}
                    {t.karsilandi ? "✅ (Karşılandı, +10 puan)" : "(Bugün bir görev tamamla, ikiniz de +10 puan kazanın!)"}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Birlik Kasası & Ortak Vergi */}
          <div className="rounded-2xl bg-stone-950/75 p-3.5 ring-1 ring-stone-800">
            <h4 className="mb-2 text-xs font-bold text-amber-300/80">🏦 Ortak Vergi &amp; Birlik Kasası</h4>
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

            {(() => {
              const eldeki = durum.envanter[bagisKaynak] ?? 0;
              const gecerli = Number.isInteger(bagisMiktar) && bagisMiktar >= 10 && bagisMiktar <= eldeki;
              return (
                <>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <select
                      value={bagisKaynak}
                      onChange={(e) => setBagisKaynak(e.target.value)}
                      className="rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-bold text-amber-100 ring-1 ring-stone-700"
                    >
                      {KASA_KAYNAKLARI.map((k) => (
                        <option key={k} value={k}>
                          {KAYNAKLAR[k].ikon} {KAYNAKLAR[k].ad} (Senin: {durum.envanter[k] ?? 0})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={10}
                      step={10}
                      value={bagisMiktar}
                      onChange={(e) => setBagisMiktar(Math.floor(Number(e.target.value)))}
                      className="w-20 rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-bold text-amber-100 ring-1 ring-stone-700"
                    />
                    <button
                      type="button"
                      disabled={mesgul || !gecerli}
                      onClick={() => islemYap({ eylem: "bagis", kaynak: bagisKaynak, miktar: bagisMiktar }, "Katkın birlik kasasına eklendi, teşekkürler!")}
                      className="varak-dugme flex-1 rounded-lg px-3 py-1.5 text-xs font-black disabled:opacity-50"
                    >
                      🎁 Vergi / Katkı Ver
                    </button>
                  </div>
                  {!gecerli && (
                    <p className="mt-1.5 text-[11px] text-amber-200/70">
                      {bagisMiktar < 10 || !Number.isInteger(bagisMiktar)
                        ? "En az 10 birim bağışlayabilirsin."
                        : `Deponda o kadar ${KAYNAKLAR[bagisKaynak].ad} yok.`}
                    </p>
                  )}
                </>
              );
            })()}
          </div>

          {/* Üyeler ve Kardeşlik Teşviki */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-amber-300/80">
              👥 Birlik Kardeşleri ({birlik.uyeler.length}/{uyeSiniri})
            </h4>
            {birlik.uyeler.map((u) => {
              const kendisi = u.id === ben;
              return (
                <div key={u.id} className="space-y-1.5 rounded-xl bg-stone-950/75 px-3 py-2 text-xs ring-1 ring-stone-800">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-amber-100">
                        {u.ad} <span className="text-amber-300/70">· Lv.{u.level}</span>
                        {u.id === birlik.liderId && <span className="ml-1 text-amber-400">👑</span>}
                      </p>
                      <p className="text-[11px] text-amber-200/70">
                        Katkı: <b>{u.katkiPuani}</b> p · Vergi: <b>{u.bagisToplam}</b> · 🕌 {u.bugunNamaz ?? 0}/5 · Bu hafta <b>{u.aktifGun7}</b>/7 gün{" "}
                        {u.bugunAktif ? <span className="text-emerald-300">✅ Bugün aktif</span> : <span className="text-stone-400">⏳ Bekleniyor</span>}
                      </p>
                    </div>
                    {!kendisi && !u.bugunAktif && (
                      <button
                        type="button"
                        disabled={mesgul || u.bugunTesvikEdildi}
                        onClick={() => islemYap({ eylem: "tesvik", aliciId: u.id }, `${u.ad} kardeşine 'Haydi Kardeşim!' teşviki gönderildi!`)}
                        className="shrink-0 rounded-lg bg-sky-600 px-2.5 py-1 text-[11px] font-black text-white disabled:bg-stone-800 disabled:text-stone-400"
                      >
                        {u.bugunTesvikEdildi ? "Gönderildi" : "💪 Teşvik Et"}
                      </button>
                    )}
                  </div>
                  {birlik.benLider && !kendisi && (
                    <div className="flex flex-wrap gap-1.5">
                      <OnayliDugme
                        etiket="👑 Lider Yap"
                        soru={`${u.ad} lider olsun mu?`}
                        onayEtiketi="Evet, devret"
                        mesgul={mesgul}
                        sinif="rounded-md bg-stone-800 px-2 py-1 text-[11px] font-bold text-amber-200"
                        onOnay={() => islemYap({ eylem: "liderDevret", uyeId: u.id }, `Liderlik ${u.ad} kardeşine devredildi.`)}
                      />
                      <OnayliDugme
                        etiket="Birlikten Çıkar"
                        soru={`${u.ad} çıkarılsın mı?`}
                        onayEtiketi="Evet, çıkar"
                        mesgul={mesgul}
                        sinif="rounded-md bg-stone-800 px-2 py-1 text-[11px] font-bold text-red-300"
                        onOnay={() => islemYap({ eylem: "uyeCikar", uyeId: u.id }, `${u.ad} birlikten çıkarıldı.`)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <OnayliDugme
            etiket="Birlikten Ayrıl"
            soru={birlik.uyeler.length === 1 ? "Son üyesin: birlik dağılır. Emin misin?" : "Birlikten ayrılmak istediğine emin misin?"}
            onayEtiketi="Evet, Ayrıl"
            mesgul={mesgul}
            sinif="w-full rounded-xl bg-stone-800 py-2 text-xs font-bold text-red-300 hover:bg-red-950/60"
            onOnay={() => islemYap({ eylem: "ayril" }, "Birlikten ayrıldın.")}
          />
        </div>
      )}
    </div>
  );
}

const SONUC_BASLIKLARI = {
  aldi: { ikon: "🏆", baslik: "Sancağı aldınız!", sinif: "bg-emerald-900/50 ring-emerald-400/60 text-emerald-100" },
  guclendi: { ikon: "🚩", baslik: "Sancağınız güçlendi", sinif: "bg-emerald-900/40 ring-emerald-500/50 text-emerald-100" },
  esit: { ikon: "⚖️", baslik: "Berabere: güç eşit", sinif: "bg-amber-900/40 ring-amber-400/50 text-amber-100" },
  geride: { ikon: "⚔️", baslik: "Henüz yetmedi", sinif: "bg-red-950/60 ring-red-400/50 text-red-100" },
};

function AlanMucadelesiGorunumu({ oyun, birlik, bolgeler, seciliBolgeId, islemYap, mesgul, sonHamle, kapatHamle }) {
  const acik = oyun.durum.level >= ALAN_MUCADELESI_LEVEL;

  if (!acik) {
    return (
      <div className="parsomen rounded-2xl p-5 text-center">
        <div className="text-3xl">🚩</div>
        <h3 className="mt-2 text-base font-black text-amber-200">Genel Sancak Haritası Level {ALAN_MUCADELESI_LEVEL}&apos;da Açılır</h3>
        <p className="mt-1 text-xs text-amber-200/70">
          Level {ALAN_MUCADELESI_LEVEL}&apos;ya ulaştığında birliğinle birlikte 6 stratejik bölgede sancağı dalgalandırmak için mücadele edebilirsin!
        </p>
      </div>
    );
  }

  const siraliBolgeler = seciliBolgeId
    ? [...bolgeler].sort((a, b) => (a.id === seciliBolgeId ? -1 : b.id === seciliBolgeId ? 1 : 0))
    : bolgeler;
  const haftalik = birlik?.haftalikDisiplin ?? 0;
  const sonuc = sonHamle ? SONUC_BASLIKLARI[sonHamle.sonuc] ?? SONUC_BASLIKLARI.geride : null;

  return (
    <div className="space-y-3">
      <div className="tezhip rounded-2xl bg-stone-950/70 p-3 text-xs text-amber-100">
        <b>⚔️ Nasıl çalışır?</b> Bir bölgeye hamle için <b>Birlik Kasası&apos;ndan</b> kaynak harcanır. Hamlenin gücü, bölgenin temel gücü ile
        birliğinin <b>son 7 günlük görev ve namaz disiplininin (%{haftalik})</b> çarpımıdır. Aynı güce erişen birliklerde bölgeye önce ulaşan sancağı tutar.
        {birlik && (
          <span className="mt-1 block text-amber-200/80">
            Kasa: {KASA_KAYNAKLARI.map((k) => `${KAYNAKLAR[k].ikon}${birlik.kasa[k] ?? 0}`).join("  ")}
          </span>
        )}
      </div>

      {!birlik && (
        <p className="rounded-xl bg-amber-500/15 p-3 text-center text-xs font-bold text-amber-100 ring-1 ring-amber-400/40">
          Hamle yapabilmek için önce bir birliğe katılmalı ya da kendi birliğini kurmalısın (🏦 Vergi &amp; Üyeler sekmesi).
        </p>
      )}

      {sonHamle && sonuc && (
        <div className={`rounded-2xl p-3.5 text-xs ring-2 ${sonuc.sinif}`} role="status">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-black">
              {sonuc.ikon} {sonuc.baslik} · {sonHamle.bolgeAd}
            </h4>
            <button type="button" onClick={kapatHamle} className="text-[11px] font-bold opacity-80 hover:opacity-100">
              Kapat ✕
            </button>
          </div>
          <p className="mt-1">
            Kasadan harcanan: {bedelYazisi(sonHamle.harcanan)} · Kazanılan güç: <b>+{sonHamle.kazanilanGuc}</b> (disiplin %{sonHamle.disiplin}) · Birliğinin bu bölgedeki toplam gücü:{" "}
            <b>{sonHamle.toplamGuc}</b>
          </p>
          <p className="mt-1">
            {sonHamle.sonuc === "aldi" &&
              `🚩 Sancak artık sizin${sonHamle.oncekiSahip ? ` (önceki sahip: ${sonHamle.oncekiSahip})` : ""}!`}
            {sonHamle.sonuc === "guclendi" && "Sancak zaten sizdeydi; gücünüz arttı, rakipler için çıta yükseldi."}
            {sonHamle.sonuc === "esit" &&
              `Gücünüz ${sonHamle.lider ?? "lider"} birliğiyle eşit. Bölgeye önce ulaşan sancağı tuttuğu için sancak onlarda; sancağı almak için ${sonHamle.liderFarki} güç daha gerekli.`}
            {sonHamle.sonuc === "geride" &&
              `Sancak hâlâ ${sonHamle.lider ?? "başka bir birlik"} elinde. Sancağı almak için ${sonHamle.liderFarki} güç daha gerekli; kardeşlerinle görevleri yapıp disiplini yükseltin.`}
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {siraliBolgeler.map((b) => {
          const vurgulu = b.id === seciliBolgeId;
          const bizde = b.bizde;
          const hamleNedeni = !birlik
            ? "Birliğe katıl"
            : !b.kasaYeterli
              ? "Kasa yetmiyor"
              : b.tahminiGuc <= 0
                ? "Disiplin 0: önce görev yapın"
                : null;
          return (
            <div key={b.id} className={`rounded-2xl bg-stone-950/80 p-3.5 ring-1 ${vurgulu ? "ring-2 ring-amber-400 shadow-lg" : "ring-stone-800"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black text-amber-100">
                    {b.ikon} {b.ad}
                  </h4>
                  <p className="text-[11px] text-amber-200/70">
                    Temel güç: <b>{b.temelGuc}</b> · Hamle bedeli: {bedelYazisi(b.bedel)}
                  </p>
                </div>
                {b.lider ? (
                  <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-black text-white shadow" style={{ backgroundColor: b.lider.renk }}>
                    🚩 {b.lider.ad} ({b.lider.guc})
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-stone-800 px-2.5 py-0.5 text-[11px] text-stone-400">Sahipsiz</span>
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
                <p className="mt-2 text-[11px] text-amber-200/80">
                  {bizde
                    ? `✅ Sancak sizde. Bu bölgedeki gücünüz: ${b.bizimGuc}.`
                    : b.lider
                      ? `Sancağı almak için ${b.liderFarki} güç daha gerekli (sizin gücünüz: ${b.bizimGuc}).`
                      : "Bu bölge sahipsiz: ilk hamleyi yapan sancağı alır."}{" "}
                  Bu hamle yaklaşık <b>+{b.tahminiGuc}</b> güç verir.
                </p>
              )}

              {birlik && (
                <button
                  type="button"
                  disabled={mesgul || !!hamleNedeni}
                  onClick={() => islemYap({ eylem: "fetihHamlesi", bolgeId: b.id })}
                  className="varak-dugme mt-2 w-full rounded-xl py-2 text-xs font-black disabled:opacity-50"
                >
                  {hamleNedeni ? `⚔️ ${hamleNedeni}` : `⚔️ Birlik Kasasıyla Hamle Yap (${b.ad})`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
