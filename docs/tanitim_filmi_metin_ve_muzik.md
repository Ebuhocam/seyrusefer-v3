# Seyrüsefer v3 — Tanıtım Filmi Rehberi (ElevenLabs Seslendirme & Müzik Komutları)

Bu dosya, `tanitim_filmi.mp4` (56 saniye, Full HD 1080p) tanıtım filmi için hazırlanmış **ElevenLabs seslendirme metnini**, **yapay zekâ müzik üretim komutlarını** ve sesleri videoya ekleme adımlarını içerir.

---

## 1. ElevenLabs İçin Önerilen Ses Ayarları
- **Model:** `Eleven Multilingual v2`
- **Ses Karakteri Önerisi:** Sıcak, güven veren, hikâye anlatıcısı tonunda erkek veya kadın Türkçe ses (ör. *Adam / Antoni / Rachel / Türkçe kütüphane seslerinden kalın-yumuşak belgesel tonu*)
- **Stability (Kararlılık):** `%55`
- **Similarity Boost (Benzerlik):** `%80`
- **Style Exaggeration (Stil/Duygu):** `%25`
- **Speed (Hız):** `0.95x – 1.00x` (56 saniyelik sahne akışıyla tam senkron için sakin ve tane tane)

---

## 2. ElevenLabs'e Tek Seferde Yapıştırılacak Saf Metin

> Aşağıdaki metindeki `...` ve `—` işaretleri ElevenLabs'in nefes alıp vurgu yapması için bilerek eklenmiştir. Olduğu gibi kopyalayıp yapıştırabilirsiniz (~120 kelime, ~54–56 saniye):

```text
Türkiye’nin ilk manevi gelişim ve aile oyunu... Seyrüsefer ile tanışın.

Çocukları ekran başında yalnızlaştıran oyunların aksine Seyrüsefer — anne, baba ve çocukları aynı gönülde buluşturan bir yuva kurar.

Köyün Habercisi her gün eve yeni bir aile mektubu getirir... Akşam sofrasında ailecek konuşulacak sıcacık sorular açar.

Kendi Evim’de telefonu ortaya koyun. Büyükler ve Küçükler, değerlerimizi öğreten Tabu, Sessiz Sinema ve Bilmecelerle muhabbette yarışsın.

Mektep’te sahih hadisler ve ilim videoları... Köy Camii’nde namaz bilinci... Ders Köşem’de gerçek emekle gelen huzur...

Tarlada ve taş ocağında alın teri... Köy Meydanı’nda adalet... Komşu evlerinde imece ve Ozan Dede’yle Anadolu kültürü...

Üçüncü seviyede açılan Birlik Meydanı’nda ise — kardeşlik, emanetli takas ve Sancak Talimi başlar.

Niyetten ihsana on levellik bir gönül yolculuğu... Seyrüsefer: Köyünü kur, ailenle büyü, birliğinle yüksel!
```

---

## 3. Sahne Sahne Zaman Kodlu Akış (56 Saniye)

| Zaman | Sahne | Görsel Vurgu | Okunacak Bölüm |
|---|---|---|---|
| **00:00 – 00:07** | Açılış: Köy Haritası | Binalar ve *Türkiye'nin İlk Manevi Gelişim ve Aile Oyunu* | *"Türkiye’nin ilk manevi gelişim ve aile oyunu... Seyrüsefer ile tanışın."* |
| **00:07 – 00:14** | Kendi Evim & Karakterler | 4 öğrenci karakteri ve *"Ailenle Bir Araya Gel"* vurgusu | *"Çocukları ekran başında yalnızlaştıran oyunların aksine Seyrüsefer — anne, baba ve çocukları aynı gönülde buluşturan bir yuva kurar."* |
| **00:14 – 00:22** | Haberci'nin Aile Mektubu | Haberci ve *Sofradaki Bereket* mektup kartı | *"Köyün Habercisi her gün eve yeni bir aile mektubu getirir... Akşam sofrasında ailecek konuşulacak sıcacık sorular açar."* |
| **00:22 – 00:30** | Aile Sofrası Oyunları | *Büyükler vs Küçükler*, Tabu, Sessiz Sinema, Bilmece | *"Kendi Evim’de telefonu ortaya koyun. Büyükler ve Küçükler, değerlerimizi öğreten Tabu, Sessiz Sinema ve Bilmecelerle muhabbette yarışsın."* |
| **00:30 – 00:37** | İlim, İbadet ve Ders Köşem | Mektep, Ulu Cami ve sunucu takipli Ders Köşem | *"Mektep’te sahih hadisler ve ilim videoları... Köy Camii’nde namaz bilinci... Ders Köşem’de gerçek emekle gelen huzur..."* |
| **00:37 – 00:44** | Emek, Adalet ve Kültür | Tarla, Halk Davaları, Komşu Evleri ve Ozan Dede | *"Tarlada ve taş ocağında alın teri... Köy Meydanı’nda adalet... Komşu evlerinde imece ve Ozan Dede’yle Anadolu kültürü..."* |
| **00:44 – 00:50** | Birlik Meydanı (Lv 3+) | Ulu Çınar, Ortak Çalışma, Takas, Haberleşme, Talimhane | *"Üçüncü seviyede açılan Birlik Meydanı’nda ise — kardeşlik, emanetli takas ve Sancak Talimi başlar."* |
| **00:50 – 00:56** | Kapanış & Davet | Genel Harita, 10 Karakter ve `seyrusefer.org` mührü | *"Niyetten ihsana on levellik bir gönül yolculuğu... Seyrüsefer: Köyünü kur, ailenle büyü, birliğinle yüksel!"* |

---

## 4. Yapay Zekâ Müzik Üretim Komutları (Suno AI / Udio / ElevenLabs)

> Müzik araçları İngilizce enstrüman ve atmosfer etiketlerini çok daha isabetli anladığı için komutlar İngilizce hazırlanmıştır. **Suno AI** kullanıyorsanız **"Instrumental"** (Sözsüz) seçeneğini açmayı unutmayın ki seslendirmenin üstüne vokal binmesin.

### Seçenek 1 (Önerilen): Sıcak Aile Masalı & Anadolu Akustik (En Dengeli Fon Müziği)
**Ne verir?** Ud, akustik gitar, sıcak yaylılar ve hafif ney dokunuşuyla hem çocukların hem anne-babaların seveceği huzurlu, samimi ve umut verici bir tanıtım müziği.

```text
Warm uplifting Turkish acoustic instrumental soundtrack, gentle Anatolian oud and soft ney flute melody over warm cinematic strings and light acoustic guitar fingerpicking, heartwarming family togetherness mood, peaceful spiritual atmosphere, moderate 88 BPM, inspiring crescendo at the end, no vocals, clean mix suitable for voiceover background
```

### Seçenek 2: Destansı Gönül Yolculuğu (Sinematik & Tarihsel Doku)
**Ne verir?** Selçuklu / Tezhip estetiğine yakışan, biraz daha görkemli ve heyecan uyandıran bir tanıtım tonu (Özellikle Birlik Meydanı ve Sancak Talimi vurgusunu öne çıkarmak isterseniz).

```text
Cinematic Anatolian orchestral instrumental, soulful ney flute and baglama saz motif layered with warm cello, soft bendir frame drum rhythm and sweeping ambient strings, noble spiritual journey feel, family-friendly and hopeful, 92 BPM, dynamic build from intimate opening to inspiring finale, strictly instrumental, no vocals
```

### Seçenek 3: Neşeli Aile Sofrası & Köy İmecesi (Daha Hareketli ve Sıcak)
**Ne verir?** Aile Sofrası Oyunları (Tabu, Sessiz Sinema, Bilmece) ve köy yaşamının neşesini öne çıkaran daha aydınlık, güler yüzlü bir arka plan müziği.

```text
Joyful heartwarming Turkish folk-inspired acoustic background music, playful pizzicato strings, gentle kanun and acoustic guitar, soft shaker and light percussion, cozy family game night and peaceful village morning vibe, bright D major mood, 96 BPM, no vocals, balanced midrange for narration
```

### ElevenLabs Sound Effects / ElevenLabs Music Kısa Komutu
ElevenLabs içinde doğrudan fon müziği üretecekseniz şu kısa komutu kullanabilirsiniz:

```text
Peaceful warm Turkish acoustic family soundtrack with soft oud, gentle ney flute and warm strings, uplifting spiritual journey mood, instrumental background music without vocals, 56 seconds
```

---

## 5. Seslendirme ve Müziği Tek Komutla Videoya Ekleme

ElevenLabs'ten indirdiğiniz ses dosyasını **`seslendirme.mp3`**, müzik yapay zekâsından indirdiğiniz müziği **`muzik.mp3`** adıyla proje ana klasörüne (`seyrusefer-v2`) koyun ve terminalde şu komutu çalıştırın:

```bash
node scripts/ses-birlestir.mjs
```

Bu komut müziğin sesini otomatik olarak arka plan seviyesine (%18) indirir, seslendirmeyi net biçimde öne çıkarır ve **`tanitim_filmi_sesli.mp4`** dosyasını hazırlar.
