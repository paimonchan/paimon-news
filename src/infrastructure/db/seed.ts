import type Database from "better-sqlite3";
import { SOURCE_DEFS } from "./source-defs";

type Db = Database.Database;

/** Idempoten: sumber/feed baru di SOURCE_DEFS otomatis ditambahkan saat boot. */
export function seedSources(db: Db): void {
  const upsertSource = db.prepare(
    `INSERT INTO sources (slug, name, homepage, character) VALUES (?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET name = excluded.name, homepage = excluded.homepage, character = excluded.character`
  );
  const insertFeed = db.prepare(
    "INSERT INTO feeds (source_id, url, category) VALUES (?, ?, ?) ON CONFLICT(url) DO NOTHING"
  );
  const getSourceId = db.prepare("SELECT id FROM sources WHERE slug = ?");

  let added = 0;
  const tx = db.transaction(() => {
    for (const def of SOURCE_DEFS) {
      upsertSource.run(def.slug, def.name, def.homepage, def.character);
      const { id: sourceId } = getSourceId.get(def.slug) as { id: number };
      for (const feed of def.feeds) {
        added += insertFeed.run(sourceId, feed.url, feed.category).changes;
      }
    }
  });
  tx();
  if (added > 0) {
    console.log(`[db] Seed ${SOURCE_DEFS.length} sumber (${added} feed baru).`);
  }
}
