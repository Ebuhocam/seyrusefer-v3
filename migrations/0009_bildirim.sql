-- Günlük hatırlatma bildirimleri: kullanıcıların cihaz (FCM) kodları.
-- Uzak veritabanına uygula: npm run db:uzak  (siteyi göndermeden ÖNCE)
CREATE TABLE bildirim_tokenlari (
  token        TEXT    PRIMARY KEY,               -- FCM kayıt kodu (cihaz/tarayıcı başına)
  kullanici_id INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  olusturma    INTEGER NOT NULL,
  son_gorulme  INTEGER NOT NULL
);
CREATE INDEX idx_bildirim_kullanici ON bildirim_tokenlari(kullanici_id);
