-- Seyrüsefer v3 — Faz 5 (Admin Level Tasarım Merkezi) & Faz 6 (Birlik ve Alan Mücadelesi)

-- 1. Oyun Ayarları ve Level Tasarım Merkezi (JSON tabanlı esnek yapılandırma)
-- anahtar: 'genel_ayarlar' (bina bedelleri, seyyah görevleri) veya 'level_1' .. 'level_10'
CREATE TABLE oyun_ayarlari (
  anahtar    TEXT    PRIMARY KEY,
  deger_json TEXT    NOT NULL,
  guncelleme INTEGER NOT NULL
);

-- 2. Birlikler (Level 4+)
CREATE TABLE birlikler (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ad         TEXT    NOT NULL UNIQUE,
  slogan     TEXT    NOT NULL DEFAULT '',
  renk       TEXT    NOT NULL DEFAULT '#d97706',
  lider_id   INTEGER NOT NULL REFERENCES kullanicilar(id),
  erzak      INTEGER NOT NULL DEFAULT 0,
  kereste    INTEGER NOT NULL DEFAULT 0,
  tas        INTEGER NOT NULL DEFAULT 0,
  olusturma  INTEGER NOT NULL
);

CREATE TABLE birlik_uyeleri (
  kullanici_id  INTEGER PRIMARY KEY REFERENCES kullanicilar(id) ON DELETE CASCADE,
  birlik_id     INTEGER NOT NULL REFERENCES birlikler(id) ON DELETE CASCADE,
  bagis_toplam  INTEGER NOT NULL DEFAULT 0,
  katki_puani   INTEGER NOT NULL DEFAULT 0,
  katilma       INTEGER NOT NULL
);
CREATE INDEX idx_birlik_uyeleri_birlik ON birlik_uyeleri(birlik_id);

-- 3. Kardeşlik Teşviki ("Haydi Kardeşim!")
CREATE TABLE birlik_tesvikler (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  birlik_id     INTEGER NOT NULL REFERENCES birlikler(id) ON DELETE CASCADE,
  gonderen_id   INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  alici_id      INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  gun           TEXT    NOT NULL,                 -- YYYY-MM-DD (oyun gününe göre)
  karsilandi    INTEGER NOT NULL DEFAULT 0,       -- alıcı o gün görev yapınca 1 olur ve ikisine de katkı puanı yazar
  olusturma     INTEGER NOT NULL,
  UNIQUE(gonderen_id, alici_id, gun)
);
CREATE INDEX idx_tesvik_alici ON birlik_tesvikler(alici_id, gun);

-- 4. Alan Mücadelesi (Level 6+) — Bölgeler ve Birlik Hamleleri
CREATE TABLE bolge_hamleleri (
  bolge_id   TEXT    NOT NULL,
  birlik_id  INTEGER NOT NULL REFERENCES birlikler(id) ON DELETE CASCADE,
  guc        INTEGER NOT NULL DEFAULT 0,
  hamle_sayisi INTEGER NOT NULL DEFAULT 0,
  guncelleme INTEGER NOT NULL,
  PRIMARY KEY (bolge_id, birlik_id)
);
CREATE INDEX idx_bolge_guc ON bolge_hamleleri(bolge_id, guc DESC);
