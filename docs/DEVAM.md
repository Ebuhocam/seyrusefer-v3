# Seyrüsefer v3 — Devam Notu (Handoff)

Son güncelleme: 17 Kasım 2026 (Claude sohbet oturumu → Claude Code'a devir)

Proje sahibi: Ebubekir Hoca (ortaokul DKAB öğretmeni). Kod yazmıyor, Türkçe konuşur; değişiklikleri sade Türkçeyle, ne işe yaradığını anlatarak açıkla. Komutları mümkünse sen çalıştır, onun yazması gerekiyorsa tam komutu ver.

## Referans dokümanlar
- [oyun_tasarim_dokumani.md](./oyun_tasarim_dokumani.md): oyun kuralları, 10 level, ekonomi
- [yol_haritasi.md](./yol_haritasi.md) · [kademeli_gelistirme_plani.md](./kademeli_gelistirme_plani.md)

## Yayın durumu (ÖNEMLİ)
- **Canlı:** https://seyrusefer.org ve www.seyrusefer.org → Cloudflare Worker `seyrusefer-v3` (17 Kasım'da eski `seyrusefer-app` Worker'ından devralındı; eski Worker ve eski `seyrusefer-db` silinmedi, dokunma).
- **Gizli ön izleme kapısı:** Worker'da `ONIZLEME_SIFRESI` secret'ı tanımlı → herkes "Köyümüz hazırlanıyor…" sayfasını görür (`src/app/Hazirlaniyor.js`, `src/lib/sunucu/onizleme.js`, `/api/onizleme`). Sağ alttaki soluk 🔒 ile şifre girilir, 60 günlük imzalı çerez. Siteyi herkese açmak için: `npx wrangler secret delete ONIZLEME_SIFRESI`. Yerelde secret yoksa kapı yoktur.
- **Bağlamalar:** D1 `seyrusefer-v3-db` (id `e23293e1-…`), R2 `seyrusefer-medya` (env.BUCKET, admin ses yüklemeleri), alan adları `wrangler.jsonc` → `routes`.
- **Geçişler:** 0001–0005 canlıda uygulandı. Yeni geçiş eklenirse: `npm run db:uzak`.
- **Derleme Windows'ta BOZUK çıkıyor** (OpenNext Windows'ta paketi yarım üretti → canlıda "Internal Server Error"). `npm run deploy`'u Windows'ta çalıştırma. Çözüm (kurulum aşamasında): GitHub `Ebuhocam/seyrusefer-v3` (dal `master`) → Cloudflare Workers Builds; build `npx opennextjs-cloudflare build`, deploy `npx wrangler deploy`. Hoca 17 Kasım gece `git add -A` yaptı; commit + push ve Cloudflare'de "Connect" adımı henüz doğrulanmadı. İlk iş: bunun çalıştığını kontrol et.
- `bun.lock` → `bun.lock.eski` yapıldı (OpenNext bun'ı seçip "bun bulunamadı" hatası veriyordu). `.gitignore`'da `bun.lock.eski` ve `open-next-paketi.zip` var.
- `public/sw.js` ve `public/service-worker.js`: eski sürümün service worker'ını ve önbelleğini temizleyip kendini kaldıran betik. Eski kullanıcılar temizlenene kadar kalsın.

## Alınan tasarım kararları (17 Kasım)
- **Ekonomi:** Bina bedelleri ~24 birim/gün/kaynak üretime göre yeniden dengelendi; 10 level ≈ 7–11 hafta. **`npm run denge`** (scripts/denge-testi.mjs) 4 öğrenci tipini gerçek kurallarla 10 level oynatır; bedel/görev değişince mutlaka çalıştır, "Tüm senaryolar oynanabilir ✓" bitmeli.
- **👥 İnsan harcanmaz**, "köyde en az N kişi" şartıdır (`SART_KAYNAKLARI`).
- **Tarla/taş ocağı her 20 saatte dolar** (`NOKTA_DOLUM_SAAT`). **İşçi hız değil verim verir:** yeni işçi, *bir sonraki ekimden* itibaren +%25; hazır bekleyen ürünü büyütmez (ilk gün Kıraathane'ye ulaşılamasın diye; ilk gün en fazla ~74 mahsul). Ekim anındaki işçi sayısı `sahaDurumu.tarlaIsci / madenIsci` içinde, D1'de `saha_*` satırlarının `envanter` sütununda saklanır.
- Yeni üretim alanı açılınca (ör. Lv2 Taş Ocağı) köye bedava bir usta gelir (tıkanmayı önler).
- **Gün sınırı Türkiye saati** (UTC+3, `trGunNo`, `oyunGunu`). Meydan olayı takvim gününe bağlı (gece yarısı yenilenir).
- Sınav/dava/namaz/meydan görevleri tek dokunuşla "yaptım" denemez (`BEYAN_GOREV_TURLERI`).
- **Haberci her gün mektup getirir** (`mektupGunu`, `mektupNo`, `mektupBugunAlindi`). Levelın ilk mektubu admin'deki aile mektubu, sonrakiler `GUNLUK_MEKTUPLAR` havuzu (12 mektup, her birinde "ailece konuşalım" sorusu). Aile görevi 3 gün (günde bir).
- **Niyet ve İhlas videosu** 2. gün hadisi okunmadan kilitli (`onKosul`). Video: YouTube IFrame API ile gömülür (`YoutubeOynatici.js`), ileri sarma korumalı, süre videodan alınır. Her levelın video bağlantısı ayrı girilir.
- **Rehber:** Tarla ve Orman ayrı adımlar; "Yapılacak İşler"de iş yapılmadan İlerle kilitli; ertesi gün "Tekrar hoş geldin"; "▾ Küçült" ile alt şeride iner, hedefe gidince kendiliğinden küçülür.
- **Aile Sofrası Oyunları** (Kendi Evim, `AileOyunlari.js`): Tabu (40 kart), Sessiz Sinema (30), Bilmece (15). Puan/kaynak vermez. İbadet ve kutsal şahsiyetler canlandırılmaz.
- Metinlerde "büyüklerini yanına çağır" değil "**ailenle bir araya gel**".
- **Oyun dikey oynanır**; yatay zorlama kaldırıldı (YatayMod.js kullanılmıyor, silinebilir). Yatayda `kisa:` Tailwind varyantı ile kompakt düzen var.
- **Harita:** zoom (tekerlek, iki parmak, + / − / Tümünü gör), işaretler `--isaret-olcek` ile küçülür. Gün/gece aydınlatması gerçek saate göre (`?saat=21` ile gece demosu). Nehir Kıraathane sağındaki kuru dere yatağında (`VadiDeresiKatmani`). Tarla ürünleri çizili tarlanın üstüne SVG ile (`TarlaUrunleri`), boş/yarı/dolu.
- **Ozan Dede sesi:** Admin → "Binalar, Ozan Dede & Haberci" → türkü başına "🎙️ MP3 yükle" (R2'ye gider, `/api/ses/[anahtar]`). Hoca AI ile seslendirtip yükleyecek. Ses yoksa tarayıcının en doğal Türkçe sesi.
- **Admin:** yalnızca `rol === "admin"` (veritabanına ilk kayıt olan hesap). Sınıf Durumu ve Çınar Altı Moderasyon sekmeleri var.
- **Tasarım dili "Tezhip":** lacivert mürekkep / altın varak / çini turkuazı / parşömen. Tailwind `stone/amber/emerald/red` globals.css'te bu paletle yeniden tanımlı. Yardımcı sınıflar: `tezhip`, `cetvel`, `parsomen`, `varak-dugme`, `ust-levha`, `levha-ac`. Yazı: Alegreya (başlık) + Alegreya Sans, yerel dosya (`src/app/fonts`). Tüm‑büyük harfli etiket kullanma.

## Açık işler / sıradaki adımlar
1. GitHub push + Cloudflare Workers Builds bağlantısını doğrula; ilk otomatik derlemenin başarılı olduğunu ve seyrusefer.org'un açıldığını kontrol et.
2. Gerçek telefonda doğrulanmayanlar: iki parmak zoom, Ozan Dede sesi/MP3, YouTube oynatıcı, 3D sahnelerde joystick + bakış aynı anda.
3. Kurulu evlerden baca dumanı / gece pencere ışığı yok (CanliKoySahnesi bina verisi almıyor; `binalar` prop'u eklenirse yapılabilir).
4. Doğrulanmamış uç durumlar: admin'de hatalı kayıttan sonra hata bandı, 9 kişilik birliğin dolması, bölge saldırısında beraberlik ekranı.

## Çalıştırma
- Yerel: `npm run dev` · yerel DB geçişleri: `npx wrangler d1 migrations apply seyrusefer-v3-db --local`
- Denge testi: `npm run denge` · Lint: `npx eslint src`
- Dev hileleri (yalnızca geliştirmede): POST `/api/oyun` `{eylem:"gelistirici", islem:"levelAyarla"|"kaynakEkle"|"zamanIlerlet"|"gorevleriIsaretle"|"sifirla", ...}`

## Faz 5 — Yeni öğrenci gibi baştan oynama (18 Kasım 2026)
1–3. gün arayüzden oynandı (Level 1 → Level 2 Ferman, Taş Ocağı ustası). Bulunan ve düzeltilenler:
- **Kıraathane 2. günde kurulamıyordu:** 3 günlük aile mektubu görevi bina şartıydı. Artık görevlerde `binaIcinEnAz: 1` var; bina için 1 okuma yeter, level atlamak için 3 gün gerekir (`binaSartiTamamMi`, `gorevler.js` + `Panel.js`).
- **Rehber sona gelince başa (Mektep'i kur) dönüyordu:** Sona "🎉 Level Atlamaya Hazırsın!" ve "🧭 Artık Köyün Sana Emanet!" adımları eklendi.
- **Rehber 3. gün hadisi atlıyordu:** Hadis adımı artık günlük (`tamam || bugunYapildi`). Üst levellarda o türde görev yoksa adım geçilir (`gorevYoksaVeyaTamam`), rehber takılmaz.
- **Haberci her gün Level 1'in ilk mektup başlığını gösteriyordu:** Başlık artık bugünün mektubu (`gununMektubu`).
- **Haberci adımı, mektup alınmadan "elinde" diyordu:** `mektupBugunAlindi` + `simdi`.
- **Üst bar Level 2'de iki satıra taşıyordu:** Sol grup tek satır, başlık kısalır; 320 px'de kaynak çubuğu kaydırılabilir.
- Küçük düzeltmeler: tanıtım-görüldü bayrağı, bildirim konumu, `sureYaz` süre yazımı, Çınar Altı meydan kurulana kadar salt okunur.
- **Açık not:** Level 2'de gelen bedava usta nüfusu 6/5 gösteriyor (Köy Evi 2 kurulunca düzelir).

## 18 Kasım 2026 — Faz A/B/C
- **Faz A:** Taş Ocağı 3 kaya; oynanan günlere göre sırayla kırma günü / Taş Avı (`TasAviOyunu.js`, `tasAvi`, `madenOyunModu`, kaynaklar satırı `maden_mod`). Her yerde "Tahta" → "Odun". Namaz görevi: günde en az bir vakit.
- **Faz B:** Kendi Evim → 📚 Ders Köşem (`DersCalismaKosesi.js`, `/api/ders`, tablo `ders_calisma`, ilk istekte kendiliğinden kurulur). Sayaç sunucu başlangıç saatine göre arka planda işler, öğrenci onaylar. En çok 60 dk. Günün her 30 dakikası +1 Huzur (günde en çok 4).
- **Faz C:** Komşu evleri (ev1–ev5) → 🏘️ Komşuyu Ziyaret Et (`KomsuEviTasarim.js`, `komsuEviGuzellestir`, kaynaklar satırları `komsu_ev1..5`). 3 oda × 3 seviye; her seviye +1 Huzur, ev tamamlanınca +2. Köy Meydanı'na 🕌 Köy Camii (namaz çetelesi).
- Cloudflare Workers Builds bağlı; `package-lock.json` Linux'ta üretilmeli (Windows kilidi `@emnapi` eksik bırakıyordu → `npm ci` hatası).

## 18 Kasım 2026 akşam — Birlik Meydanı (Faz 6 başlangıcı)
- Telefon performansı: `components/koy/grafikProfili.js` (piksel oranı, AA, gölge, 30 fps) tüm 3D sahnelerde.
- Birlik Alanı **Level 3**'te açılır (`BIRLIK_ACILIS_LEVEL = 3`). Çınar Altı köyden çıktı; Birlik Meydanı'nın ortasındaki Ulu Çınar'da, Level 3'teki herkese açık (`secim.tur === "cinarAlti"`).
- Yeni harita `public/assets/harita/birlik_alani.webp`; bina içleri `public/assets/mekanlar/*_ici.webp` + `BirlikMekanSahnesi.js` (tıklanır noktalar, yürüyen karakter).
- Binalar: Otağ (birlik), Ulu Cami (`CamiCemaatKutusu`), Medrese = Ortak Çalışma Salonu (`OrtakCalismaSalonu`, `/api/birlik/calisma`), Takas Merkezi (`TakasMerkezi`, `/api/birlik/takas`, emanetli teklif), Haberleşme Kulesi (birlik sohbeti + kötü söz filtresi `ekTablolar.kotuSozVarMi` + 🚩 şikâyet, 2 şikâyette gizlenir), Talimhane (`SancakTalimi`, `/api/birlik/talim`, `lib/oyun/talim.js`, soru bankası `lib/oyun/soruBankasi.js` 160 soru %50 DKAB).
- Yeni tablolar `lib/sunucu/ekTablolar.js` içinde ilk istekte kurulur (göç dosyası `migrations/0007_birlik_meydani.sql`).
- Eksik görseller: Talimhane ve Haberleşme Kulesi dış görünüşü (şimdilik oyun çadırı resmi / 🕊️ mühür).
