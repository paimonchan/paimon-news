import type { Queryable } from "../queryable";
import { SOURCE_DEFS } from "../source-defs";

export async function seedPgSources(db: Queryable): Promise<void> {
  for (const def of SOURCE_DEFS) {
    const existing = await db.get<{ id: number }>("SELECT id FROM sources WHERE slug = $1", def.slug);
    if (existing) {
      await db.run(
        "UPDATE sources SET name = $1, homepage = $2, character = $3 WHERE slug = $4",
        def.name,
        def.homepage,
        def.character,
        def.slug
      );
    } else {
      const r = await db.run(
        "INSERT INTO sources (slug, name, homepage, character) VALUES ($1, $2, $3, $4)",
        def.slug,
        def.name,
        def.homepage,
        def.character
      );
    }

    const src = await db.get<{ id: number }>("SELECT id FROM sources WHERE slug = $1", def.slug);
    if (!src) continue;

    for (const feed of def.feeds) {
      await db.run(
        "INSERT INTO feeds (source_id, url, category) VALUES ($1, $2, $3) ON CONFLICT(url) DO NOTHING",
        src.id,
        feed.url,
        feed.category
      );
    }
  }
  console.log(`[pg] Seed ${SOURCE_DEFS.length} sumber.`);
}
