import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * AI Studio Node.js 22 ortamı için Cloudflare D1 uyumlu yerel SQLite adaptörü.
 * Veriler geçici konteyner diskinde (/tmp/seyrusefer-v3.sqlite) tutulur ve
 * migrations/ klasöründeki şema dosyaları otomatik uygulanır.
 */

function parametreleriTemizle(degerler) {
  return degerler.map((v) => {
    if (v === undefined) return null;
    if (typeof v === "boolean") return v ? 1 : 0;
    return v;
  });
}

function ifadeOlustur(veritabani, sql, bagliDegerler = []) {
  return {
    bind(...yeniDegerler) {
      return ifadeOlustur(veritabani, sql, parametreleriTemizle(yeniDegerler));
    },
    async first(sutunAdi) {
      const satir = veritabani.prepare(sql).get(...bagliDegerler);
      if (!satir) return null;
      const duz = { ...satir };
      return sutunAdi ? (duz[sutunAdi] ?? null) : duz;
    },
    async all() {
      const satirlar = veritabani.prepare(sql).all(...bagliDegerler);
      return {
        results: satirlar.map((s) => ({ ...s })),
        success: true,
      };
    },
    async run() {
      const sonuc = veritabani.prepare(sql).run(...bagliDegerler);
      return {
        results: [],
        success: true,
        meta: {
          changes: Number(sonuc?.changes ?? 0),
          last_row_id: Number(sonuc?.lastInsertRowid ?? 0),
        },
      };
    },
  };
}

function migrasyonlariUygula(veritabani) {
  veritabani.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      ad TEXT PRIMARY KEY,
      zaman INTEGER NOT NULL
    );
  `);

  const klasor = path.join(process.cwd(), "migrations");
  if (!fs.existsSync(klasor)) return;

  const dosyalar = fs
    .readdirSync(klasor)
    .filter((d) => d.endsWith(".sql"))
    .sort();

  for (const dosya of dosyalar) {
    const uygulandi = veritabani.prepare("SELECT 1 FROM _migrations WHERE ad = ?").get(dosya);
    if (uygulandi) continue;

    const icerik = fs.readFileSync(path.join(klasor, dosya), "utf8");
    veritabani.exec(icerik);
    veritabani.prepare("INSERT INTO _migrations (ad, zaman) VALUES (?, ?)").run(dosya, Date.now());
  }
}

function baglantiAl() {
  if (globalThis.__seyruseferD1Adapter) {
    return globalThis.__seyruseferD1Adapter;
  }

  if (typeof process !== "undefined" && typeof process.emitWarning === "function" && !process.__sqliteUyariGizlendi) {
    const orijinalUyari = process.emitWarning.bind(process);
    process.emitWarning = (uyari, ...argumanlar) => {
      const metin = typeof uyari === "string" ? uyari : uyari?.message || "";
      const tur = typeof argumanlar[0] === "string" ? argumanlar[0] : argumanlar[0]?.type || uyari?.name || "";
      if (tur === "ExperimentalWarning" || String(metin).includes("SQLite")) {
        return;
      }
      return orijinalUyari(uyari, ...argumanlar);
    };
    process.__sqliteUyariGizlendi = true;
  }

  const sqlite = process.getBuiltinModule("node:sqlite");
  const dosyaYolu = process.env.SQLITE_DB_PATH || "/tmp/seyrusefer-v3.sqlite";

  let veritabani;
  try {
    veritabani = new sqlite.DatabaseSync(dosyaYolu);
    veritabani.exec("PRAGMA journal_mode = WAL;");
    veritabani.exec("PRAGMA busy_timeout = 5000;");
  } catch {
    console.warn("[AI Studio] Dosya tabanlı SQLite açılamadı, bellek içi veritabanı kullanılıyor.");
    veritabani = new sqlite.DatabaseSync(":memory:");
  }

  veritabani.exec("PRAGMA foreign_keys = ON;");
  migrasyonlariUygula(veritabani);

  const adaptor = {
    prepare(sql) {
      return ifadeOlustur(veritabani, sql);
    },
    async batch(ifadeler) {
      const sonuclar = [];
      veritabani.exec("BEGIN IMMEDIATE");
      try {
        for (const ifade of ifadeler) {
          sonuclar.push(await ifade.all());
        }
        veritabani.exec("COMMIT");
      } catch (hata) {
        try {
          veritabani.exec("ROLLBACK");
        } catch {
          // geri alma hatasını yut
        }
        throw hata;
      }
      return sonuclar;
    },
    async exec(sql) {
      veritabani.exec(sql);
      return { count: 1, duration: 0 };
    },
  };

  globalThis.__seyruseferD1Adapter = adaptor;
  return adaptor;
}

export async function db() {
  return baglantiAl();
}
