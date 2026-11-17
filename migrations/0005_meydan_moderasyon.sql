-- Seyrüsefer v3 — Çınar Altı (Sosyal Meydan) beğeni, şikâyet ve moderasyon şeması
--
-- Bu iki tablo daha önce API içinde "CREATE TABLE IF NOT EXISTS" ile çalışma anında
-- oluşturuluyordu. Artık şemanın parçası; eski kurulumlarda tablo zaten varsa
-- aynı sütunlarla atlanır, yeni sütunlar ALTER ile eklenir.

CREATE TABLE IF NOT EXISTS meydan_begeniler (
  paylasim_id  INTEGER NOT NULL,
  kullanici_id INTEGER NOT NULL,
  olusturma    INTEGER NOT NULL,
  PRIMARY KEY (paylasim_id, kullanici_id)
);

CREATE TABLE IF NOT EXISTS meydan_sikayetler (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  paylasim_id  INTEGER NOT NULL,
  kullanici_id INTEGER NOT NULL,
  sebep        TEXT    NOT NULL,
  olusturma    INTEGER NOT NULL
);

-- Beğeniyi geri alıp tekrar beğenerek Huzur kasmayı engellemek için:
-- satır silinmez, aktif = 0 yapılır; Huzur ödülü yalnızca satır ilk oluştuğunda verilir.
ALTER TABLE meydan_begeniler ADD COLUMN aktif INTEGER NOT NULL DEFAULT 1;

-- Şikâyet durumu: 'bekliyor' | 'kapandi' (öğretmen inceledi)
ALTER TABLE meydan_sikayetler ADD COLUMN durum TEXT NOT NULL DEFAULT 'bekliyor';

-- Aynı öğrenci aynı paylaşımı yalnızca bir kez şikâyet edebilir
DELETE FROM meydan_sikayetler
 WHERE id NOT IN (SELECT MIN(id) FROM meydan_sikayetler GROUP BY paylasim_id, kullanici_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sikayet_tekil ON meydan_sikayetler(paylasim_id, kullanici_id);
CREATE INDEX IF NOT EXISTS idx_sikayet_durum ON meydan_sikayetler(durum, olusturma DESC);

-- Öğretmenin (veya 3 ayrı şikâyetin) akıştan kaldırdığı paylaşımlar: 0 = görünür, 1 = gizli
ALTER TABLE meydan_paylasimlari ADD COLUMN gizli INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_meydan_yazar ON meydan_paylasimlari(kullanici_id, olusturma DESC);
CREATE INDEX IF NOT EXISTS idx_yorum_yazar ON meydan_yorumlar(kullanici_id, olusturma DESC);
