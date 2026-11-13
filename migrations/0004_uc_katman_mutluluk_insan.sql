-- Seyrüsefer v3 — 3 Katmanlı Harita, Mutluluk, İnsan Kaynağı, Kıraathane ve Birlik Otağı

ALTER TABLE oyuncu_durumu ADD COLUMN mutluluk INTEGER NOT NULL DEFAULT 60;
ALTER TABLE oyuncu_durumu ADD COLUMN insan INTEGER NOT NULL DEFAULT 5;
ALTER TABLE oyuncu_durumu ADD COLUMN cozulen_davalar TEXT NOT NULL DEFAULT '[]';
ALTER TABLE oyuncu_durumu ADD COLUMN son_gocmen_kontrol INTEGER NOT NULL DEFAULT 0;

-- Birlik Alanı (2. Katman) Ortak Binaları: otag, cami, medrese, takasmerkezi, oyuncadiri
CREATE TABLE birlik_binalari (
  birlik_id INTEGER NOT NULL REFERENCES birlikler(id) ON DELETE CASCADE,
  bina_id   TEXT    NOT NULL,
  seviye    INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (birlik_id, bina_id)
);

-- Birlik Otağı Sohbet ve İstişare Mesajları
CREATE TABLE birlik_mesajlari (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  birlik_id    INTEGER NOT NULL REFERENCES birlikler(id) ON DELETE CASCADE,
  kullanici_id INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  mesaj        TEXT    NOT NULL,
  olusturma    INTEGER NOT NULL
);
CREATE INDEX idx_birlik_mesajlari ON birlik_mesajlari(birlik_id, olusturma DESC);
