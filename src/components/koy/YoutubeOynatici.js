"use client";
// =============================================================
// YOUTUBE OYNATICI (ileri sarma korumalı)
// YouTube'un resmi IFrame Player API'si ile gömülür. Öğrencinin en çok nereye kadar
// izlediği tutulur; ileri sarılırsa o noktaya geri döner. Video gerçekten sonuna
// kadar izlenince onBitti() çağrılır. Süre videonun kendisinden alınır.
// =============================================================
import { useEffect, useRef } from "react";

/** youtube.com/watch?v=, youtu.be/, /shorts/, /embed/ adreslerinden video kimliğini çıkarır */
export function youtubeKimligi(url) {
  if (!url) return null;
  try {
    const u = new URL(String(url).trim());
    const host = u.hostname.replace(/^(www\.|m\.)/, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "music.youtube.com") {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const m = u.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/);
      return m ? m[1] : null;
    }
  } catch {
    return null;
  }
  return null;
}

let apiSozu = null;
function youtubeApiYukle() {
  if (typeof window === "undefined") return Promise.reject(new Error("tarayıcı yok"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiSozu) return apiSozu;
  apiSozu = new Promise((coz, reddet) => {
    const onceki = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      onceki?.();
      coz(window.YT);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => {
      apiSozu = null;
      reddet(new Error("YouTube yüklenemedi"));
    };
    document.head.appendChild(s);
  });
  return apiSozu;
}

/**
 * @param {{ videoId: string, onIlerleme?: (izlenenSn: number, sureSn: number) => void,
 *           onBitti?: () => void, onUyari?: (metin: string) => void, onHata?: (metin: string) => void }} p
 */
export default function YoutubeOynatici({ videoId, onIlerleme, onBitti, onUyari, onHata }) {
  const kutuRef = useRef(null);
  const geriCagrilar = useRef({ onIlerleme, onBitti, onUyari, onHata });
  useEffect(() => {
    geriCagrilar.current = { onIlerleme, onBitti, onUyari, onHata };
  });

  useEffect(() => {
    let oynatici = null;
    let zamanlayici = null;
    let iptal = false;
    let enCok = 0;
    let bittiBildirildi = false;

    const bittiMi = (sure) => sure > 0 && enCok >= sure - 2;

    youtubeApiYukle()
      .then((YT) => {
        if (iptal || !kutuRef.current) return;
        const hedef = document.createElement("div");
        kutuRef.current.appendChild(hedef);
        oynatici = new YT.Player(hedef, {
          videoId,
          host: "https://www.youtube-nocookie.com",
          width: "100%",
          height: "100%",
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1, disablekb: 1, fs: 1 },
          events: {
            onError: () => geriCagrilar.current.onHata?.("Video açılamadı. Bağlantı yanlış olabilir ya da video gömülmeye kapalı olabilir."),
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.ENDED) {
                const sure = oynatici.getDuration?.() ?? 0;
                if (bittiMi(sure)) {
                  if (!bittiBildirildi) {
                    bittiBildirildi = true;
                    geriCagrilar.current.onIlerleme?.(sure, sure);
                    geriCagrilar.current.onBitti?.();
                  }
                } else {
                  oynatici.seekTo(enCok, true);
                  geriCagrilar.current.onUyari?.("İleri sarma yapılamaz; videoyu sırasıyla izlemelisin.");
                }
              }
            },
          },
        });
        zamanlayici = window.setInterval(() => {
          if (!oynatici?.getCurrentTime) return;
          const t = oynatici.getCurrentTime();
          const sure = oynatici.getDuration?.() ?? 0;
          if (t > enCok + 2.5) {
            oynatici.seekTo(enCok, true);
            geriCagrilar.current.onUyari?.("İleri sarma yapılamaz; videoyu sırasıyla izlemelisin.");
            return;
          }
          enCok = Math.max(enCok, t);
          geriCagrilar.current.onIlerleme?.(enCok, sure);
          if (!bittiBildirildi && bittiMi(sure)) {
            bittiBildirildi = true;
            geriCagrilar.current.onBitti?.();
          }
        }, 500);
      })
      .catch(() => geriCagrilar.current.onHata?.("YouTube'a ulaşılamadı. İnternet bağlantını kontrol et."));

    const kutu = kutuRef.current;
    return () => {
      iptal = true;
      if (zamanlayici) window.clearInterval(zamanlayici);
      try {
        oynatici?.destroy?.();
      } catch {
        // oynatıcı zaten kapanmış olabilir
      }
      if (kutu) kutu.innerHTML = "";
    };
  }, [videoId]);

  return <div ref={kutuRef} className="aspect-video w-full overflow-hidden rounded-xl bg-black [&>iframe]:h-full [&>iframe]:w-full" />;
}
