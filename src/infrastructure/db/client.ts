import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { runMigrations } from "./migrations";
import { seedSources } from "./seed";

export type Db = Database.Database;

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "lensa.db");

// Satu koneksi per proses (aman untuk hot-reload dev via globalThis).
const globalForDb = globalThis as unknown as { __lensaDb?: Db };

export function getDb(): Db {
  if (globalForDb.__lensaDb) return globalForDb.__lensaDb;
  const db = openDb(DB_PATH);
  globalForDb.__lensaDb = db;
  return db;
}

/** Buka DB di path mana pun (dipakai juga oleh test dengan ':memory:'). */
export function openDb(dbPath: string): Db {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  seedSources(db);
  return db;
}
