-- Kendi Evim · Ders Çalışma Köşesi: öğrencinin odaklı çalışma oturumları
CREATE TABLE IF NOT EXISTS ders_calisma (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kullanici_id INTEGER NOT NULL,
  gun INTEGER NOT NULL,            -- Türkiye takvim günü numarası (trGunNo)
  tur TEXT NOT NULL,               -- kitap | odev | tekrar
  hedef_dakika INTEGER NOT NULL,
  dakika INTEGER NOT NULL DEFAULT 0,
  baslangic INTEGER NOT NULL,      -- gerçek saat (ms)
  bitis INTEGER                    -- tamamlanınca dolar
);
CREATE INDEX IF NOT EXISTS ders_calisma_kullanici_gun ON ders_calisma (kullanici_id, gun);
