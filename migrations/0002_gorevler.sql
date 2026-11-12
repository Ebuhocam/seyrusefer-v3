-- Seyrüsefer v3 — Faz 4: Görevler, Namaz Çetelesi ve Sosyal Meydan

ALTER TABLE gorev_ilerlemesi ADD COLUMN son_gun TEXT;

CREATE TABLE namaz_cetelesi (
  kullanici_id INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  tarih        TEXT    NOT NULL,                  -- YYYY-MM-DD (oyun saatine göre)
  sabah        INTEGER NOT NULL DEFAULT 0,
  ogle         INTEGER NOT NULL DEFAULT 0,
  ikindi       INTEGER NOT NULL DEFAULT 0,
  aksam        INTEGER NOT NULL DEFAULT 0,
  yatsi        INTEGER NOT NULL DEFAULT 0,
  guncelleme   INTEGER NOT NULL,
  PRIMARY KEY (kullanici_id, tarih)
);

CREATE TABLE meydan_paylasimlari (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  kullanici_id INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  level        INTEGER NOT NULL,
  icerik       TEXT    NOT NULL,
  olusturma    INTEGER NOT NULL
);
CREATE INDEX idx_meydan_level ON meydan_paylasimlari(level, olusturma DESC);

CREATE TABLE meydan_yorumlar (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  paylasim_id  INTEGER NOT NULL REFERENCES meydan_paylasimlari(id) ON DELETE CASCADE,
  kullanici_id INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  icerik       TEXT    NOT NULL,
  olusturma    INTEGER NOT NULL
);
CREATE INDEX idx_yorum_paylasim ON meydan_yorumlar(paylasim_id, olusturma ASC);
