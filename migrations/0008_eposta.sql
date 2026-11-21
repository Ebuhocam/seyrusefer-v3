-- E-posta doğrulama, şifre sıfırlama ve kullanım koşulları onayı.
-- Uzak veritabanına uygula: npm run db:uzak  (siteyi göndermeden ÖNCE)
ALTER TABLE kullanicilar ADD COLUMN eposta TEXT;
ALTER TABLE kullanicilar ADD COLUMN eposta_dogrulandi INTEGER NOT NULL DEFAULT 0;
ALTER TABLE kullanicilar ADD COLUMN kosul_onay INTEGER;           -- koşulları kabul zamanı (ms); NULL = eski hesap
CREATE INDEX idx_kullanicilar_eposta ON kullanicilar(eposta);

CREATE TABLE eposta_kodlari (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  kullanici_id INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  eposta       TEXT    NOT NULL,
  amac         TEXT    NOT NULL,                 -- dogrula | sifre
  kod_hash     TEXT    NOT NULL,                 -- 6 haneli kodun SHA-256'sı
  bitis        INTEGER NOT NULL,
  deneme       INTEGER NOT NULL DEFAULT 0,
  olusturma    INTEGER NOT NULL
);
CREATE INDEX idx_eposta_kodlari ON eposta_kodlari(kullanici_id, amac);
CREATE INDEX idx_eposta_kodlari_eposta ON eposta_kodlari(eposta, olusturma);
