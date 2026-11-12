-- Seyrüsefer v3 — ilk şema
-- Zamanlar milisaniye cinsinden UNIX zamanı (INTEGER) olarak tutulur.

CREATE TABLE kullanicilar (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  kullanici_adi TEXT    NOT NULL UNIQUE,          -- küçük harf, a-z 0-9 _ .
  sifre_hash    TEXT    NOT NULL,                 -- pbkdf2$iterasyon$tuz$hash
  ad            TEXT    NOT NULL,                 -- görünen ad
  rol           TEXT    NOT NULL DEFAULT 'ogrenci', -- ogrenci | rehber | admin
  olusturma     INTEGER NOT NULL
);

CREATE TABLE oturumlar (
  token_hash   TEXT    PRIMARY KEY,               -- çerezdeki token'ın SHA-256'sı
  kullanici_id INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  bitis        INTEGER NOT NULL,
  olusturma    INTEGER NOT NULL
);
CREATE INDEX idx_oturumlar_kullanici ON oturumlar(kullanici_id);

CREATE TABLE oyuncu_durumu (
  kullanici_id   INTEGER PRIMARY KEY REFERENCES kullanicilar(id) ON DELETE CASCADE,
  level          INTEGER NOT NULL DEFAULT 1,
  gorevler_tamam INTEGER NOT NULL DEFAULT 0,      -- Faz 4'e kadar geliştirici bayrağı
  zaman_kaydirma INTEGER NOT NULL DEFAULT 0,      -- geliştirici: "zamanda ileri git" (ms)
  guncelleme     INTEGER NOT NULL
);

CREATE TABLE binalar (
  kullanici_id INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  bina_id      TEXT    NOT NULL,
  seviye       INTEGER NOT NULL,
  PRIMARY KEY (kullanici_id, bina_id)
);

-- Envanter + üretim alanının son toplanma zamanı (NULL = alan henüz açılmadı)
CREATE TABLE kaynaklar (
  kullanici_id INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  kaynak       TEXT    NOT NULL,                  -- erzak | kereste | tas
  envanter     INTEGER NOT NULL DEFAULT 0,
  son_toplama  INTEGER,
  PRIMARY KEY (kullanici_id, kaynak)
);

-- Faz 4'te doldurulacak: level görevlerinin ilerlemesi
CREATE TABLE gorev_ilerlemesi (
  kullanici_id INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  level        INTEGER NOT NULL,
  gorev_kodu   TEXT    NOT NULL,
  ilerleme     INTEGER NOT NULL DEFAULT 0,
  tamamlandi   INTEGER,                           -- tamamlanma zamanı (ms) ya da NULL
  guncelleme   INTEGER NOT NULL,
  PRIMARY KEY (kullanici_id, level, gorev_kodu)
);
