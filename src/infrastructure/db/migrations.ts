import type Database from "better-sqlite3";

type Db = Database.Database;

interface Migration {
  version: number;
  name: string;
  up: (db: Db) => void;
}

/**
 * Migrasi berurutan via PRAGMA user_version.
 * Tambah migrasi baru = tambah entri di akhir array. Jangan ubah yang lama.
 */
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "schema awal",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS sources (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          slug TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          homepage TEXT,
          character TEXT,
          active INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS feeds (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_id INTEGER NOT NULL REFERENCES sources(id),
          url TEXT UNIQUE NOT NULL,
          category TEXT NOT NULL DEFAULT 'terkini',
          active INTEGER NOT NULL DEFAULT 1,
          last_fetched_at TEXT,
          last_status INTEGER,
          error_count INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS articles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_id INTEGER NOT NULL REFERENCES sources(id),
          feed_id INTEGER REFERENCES feeds(id),
          guid TEXT,
          url TEXT NOT NULL,
          url_hash TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          image_url TEXT,
          author TEXT,
          category TEXT NOT NULL DEFAULT 'umum',
          published_at TEXT,
          fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
          title_tokens TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
        CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category, published_at DESC);
        CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source_id, published_at DESC);

        CREATE TABLE IF NOT EXISTS stories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'umum',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          article_count INTEGER NOT NULL DEFAULT 0,
          source_count INTEGER NOT NULL DEFAULT 0,
          hot_score REAL NOT NULL DEFAULT 0,
          tokens_json TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_stories_hot ON stories(hot_score DESC);
        CREATE INDEX IF NOT EXISTS idx_stories_category ON stories(category, updated_at DESC);

        CREATE TABLE IF NOT EXISTS story_articles (
          story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
          article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
          similarity REAL NOT NULL DEFAULT 1,
          PRIMARY KEY (story_id, article_id)
        );
        CREATE INDEX IF NOT EXISTS idx_story_articles_article ON story_articles(article_id);

        CREATE TABLE IF NOT EXISTS story_analysis (
          story_id INTEGER PRIMARY KEY REFERENCES stories(id) ON DELETE CASCADE,
          neutral_summary TEXT,
          facts_json TEXT,
          perspectives_json TEXT,
          blindspot TEXT,
          method TEXT NOT NULL DEFAULT 'heuristic',
          model TEXT,
          generated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          last_login_at TEXT
        );

        CREATE TABLE IF NOT EXISTS auth_tokens (
          token TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          used INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bookmarks (
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (user_id, story_id)
        );

        CREATE TABLE IF NOT EXISTS digest_subscriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          active INTEGER NOT NULL DEFAULT 1,
          unsubscribe_token TEXT UNIQUE NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
    },
  },
  {
    version: 2,
    name: "conditional-get feed + token usage analisis",
    up: (db) => {
      db.exec(`
        ALTER TABLE feeds ADD COLUMN etag TEXT;
        ALTER TABLE feeds ADD COLUMN last_modified TEXT;
        ALTER TABLE story_analysis ADD COLUMN input_tokens INTEGER;
        ALTER TABLE story_analysis ADD COLUMN output_tokens INTEGER;
      `);
    },
  },
  {
    version: 3,
    name: "created_at di auth_tokens untuk rate limiting",
    up: (db) => {
      db.exec(`
        ALTER TABLE auth_tokens ADD COLUMN created_at TEXT;
        UPDATE auth_tokens SET created_at = datetime(expires_at, '-15 minutes') WHERE created_at IS NULL;
      `);
    },
  },
];

export function runMigrations(db: Db): void {
  const current = db.pragma("user_version", { simple: true }) as number;
  const pending = MIGRATIONS.filter((m) => m.version > current).sort(
    (a, b) => a.version - b.version
  );

  for (const migration of pending) {
    const tx = db.transaction(() => {
      migration.up(db);
      db.pragma(`user_version = ${migration.version}`);
    });
    tx();
    console.log(`[db] Migrasi v${migration.version} (${migration.name}) diterapkan.`);
  }
}
