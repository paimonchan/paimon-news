import type { Queryable } from "../queryable";

const SCHEMA_VERSION = 3;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS _migrations (
  version INTEGER PRIMARY KEY
);

INSERT INTO _migrations (version) VALUES (${SCHEMA_VERSION})
ON CONFLICT (version) DO NOTHING;

CREATE TABLE IF NOT EXISTS sources (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  homepage TEXT,
  character TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS feeds (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES sources(id),
  url TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL DEFAULT 'terkini',
  active INTEGER NOT NULL DEFAULT 1,
  last_fetched_at TIMESTAMPTZ,
  last_status INTEGER,
  error_count INTEGER NOT NULL DEFAULT 0,
  etag TEXT,
  last_modified TEXT
);

CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
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
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title_tokens TEXT
);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source_id, published_at DESC);

CREATE TABLE IF NOT EXISTS stories (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'umum',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  input_tokens INTEGER,
  output_tokens INTEGER,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, story_id)
);

CREATE TABLE IF NOT EXISTS digest_subscriptions (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  active INTEGER NOT NULL DEFAULT 1,
  unsubscribe_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export async function runPgMigrations(db: Queryable): Promise<void> {
  let current = 0;
  try {
    const row = await db.get<{ version: number }>(
      "SELECT version FROM _migrations ORDER BY version DESC LIMIT 1"
    );
    current = row?.version ?? 0;
  } catch {
    // _migrations belum ada — fresh database
  }
  if (current < SCHEMA_VERSION) {
    await db.run(SCHEMA_SQL);
    console.log(`[pg] Migrasi v${SCHEMA_VERSION} (schema awal) diterapkan.`);
  }
}
