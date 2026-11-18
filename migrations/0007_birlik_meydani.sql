-- Birlik Meydanı: Takas Merkezi, Sancak Talimi (Talimhane), Haberleşme şikâyetleri.
-- Not: Bu tablolar uygulama tarafından ilk istekte de (CREATE TABLE IF NOT EXISTS) kurulur.
CREATE TABLE IF NOT EXISTS takas_teklifleri (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  birlik_id INTEGER NOT NULL,
  veren_id INTEGER NOT NULL,
  ver_kaynak TEXT NOT NULL,
  ver_miktar INTEGER NOT NULL,
  al_kaynak TEXT NOT NULL,
  al_miktar INTEGER NOT NULL,
  durum TEXT NOT NULL DEFAULT 'acik',
  alan_id INTEGER,
  olusturma INTEGER NOT NULL,
  kapanis INTEGER
);
CREATE INDEX IF NOT EXISTS takas_birlik_durum ON takas_teklifleri (birlik_id, durum, olusturma DESC);
CREATE TABLE IF NOT EXISTS talim_bolgeleri (
  hafta INTEGER NOT NULL,
  hucre TEXT NOT NULL,
  birlik_id INTEGER NOT NULL,
  kullanici_id INTEGER NOT NULL,
  takviye INTEGER NOT NULL DEFAULT 0,
  guncelleme INTEGER NOT NULL,
  PRIMARY KEY (hafta, hucre)
);
CREATE TABLE IF NOT EXISTS talim_kullanim (
  kullanici_id INTEGER NOT NULL,
  gun INTEGER NOT NULL,
  kullanilan INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (kullanici_id, gun)
);
CREATE TABLE IF NOT EXISTS talim_duello (
  kullanici_id INTEGER PRIMARY KEY,
  hucre TEXT NOT NULL,
  hafta INTEGER NOT NULL,
  sorular TEXT NOT NULL,
  baslangic INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS birlik_mesaj_sikayet (
  mesaj_id INTEGER NOT NULL,
  kullanici_id INTEGER NOT NULL,
  olusturma INTEGER NOT NULL,
  PRIMARY KEY (mesaj_id, kullanici_id)
);
