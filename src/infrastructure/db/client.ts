import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { runMigrations } from "./migrations";
import { seedSources } from "./seed";
import { makeSqliteQueryable } from "./sqlite-adapter";
import type { Queryable } from "./queryable";

export type Db = Database.Database;
export type { Queryable };

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "lensa.db");

const globalForDb = globalThis as unknown as { __lensaDb?: Queryable; __lensaRawDb?: Db };

export function getDb(): Queryable {
  if (globalForDb.__lensaDb) return globalForDb.__lensaDb;
  const raw = openDbRaw(DB_PATH);
  const q = makeSqliteQueryable(raw);
  globalForDb.__lensaRawDb = raw;
  globalForDb.__lensaDb = q;
  return q;
}

export function openDb(dbPath: string): Queryable {
  const raw = openDbRaw(dbPath);
  return makeSqliteQueryable(raw);
}

function openDbRaw(dbPath: string): Db {
  if (dbPath !== ":memory:") {
    try {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    } catch {
      // Serverless (Vercel etc.) — fallback ke in-memory
      const mem = new Database(":memory:");
      mem.pragma("journal_mode = WAL");
      mem.pragma("foreign_keys = ON");
      runMigrations(mem);
      seedSources(mem);
      return mem;
    }
  }
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  seedSources(db);
  return db;
}
