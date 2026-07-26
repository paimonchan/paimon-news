import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

  console.log("=== STORY STATS ===");
  const stats = await pool.query(`
    SELECT
      COUNT(*) AS total_stories,
      COUNT(*) FILTER (WHERE article_count = 1) AS singleton,
      COUNT(*) FILTER (WHERE article_count >= 2) AS multi_source,
      ROUND(AVG(article_count), 2) AS avg_articles,
      ROUND(AVG(source_count), 2) AS avg_sources,
      MAX(article_count) AS max_articles,
      COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '24 hours') AS stories_24h
    FROM stories
  `);
  console.log(JSON.stringify(stats.rows[0], null, 2));

  console.log("\n=== DISTRIBUSI ARTICLE COUNT ===");
  const dist = await pool.query(`
    SELECT article_count, COUNT(*) AS cnt
    FROM stories GROUP BY article_count ORDER BY article_count
  `);
  for (const r of dist.rows) {
    const bar = "█".repeat(Math.min(Number(r.cnt) / 5, 80));
    console.log(`  ${String(r.article_count).padStart(3)} artikel → ${String(r.cnt).padStart(5)} story ${bar}`);
  }

  console.log("\n=== SOURCE DISTRIBUTION ===");
  const src = await pool.query(`
    SELECT source_count, COUNT(*) AS cnt
    FROM stories GROUP BY source_count ORDER BY source_count
  `);
  for (const r of src.rows) {
    const bar = "█".repeat(Math.min(Number(r.cnt) / 5, 80));
    console.log(`  ${String(r.source_count).padStart(3)} sumber → ${String(r.cnt).padStart(5)} story ${bar}`);
  }

  console.log("\n=== SAMPLE SINGLETON STORIES (10 terbaru) ===");
  const single = await pool.query(`
    SELECT s.id, s.title, s.category, s.hot_score, s.created_at
    FROM stories s
    WHERE s.article_count = 1
    ORDER BY s.hot_score DESC LIMIT 10
  `);
  for (const r of single.rows) {
    console.log(`  #${r.id} [${r.category}] ${r.title.slice(0, 100)} (hot=${r.hot_score})`);
  }

  console.log("\n=== SAMPLE STORIES WITH 2+ ARTICLES (10 teratas) ===");
  const multi = await pool.query(`
    SELECT s.id, s.title, s.article_count, s.source_count, s.category, s.hot_score
    FROM stories s
    WHERE s.article_count >= 2
    ORDER BY s.hot_score DESC LIMIT 10
  `);
  for (const r of multi.rows) {
    console.log(`  #${r.id} [${r.category}] ${r.title.slice(0, 100)} (${r.article_count} artikel, ${r.source_count} sumber, hot=${r.hot_score})`);
  }

  console.log("\n=== ARTIKEL TERTUA YANG BELUM MASUK STORY ===");
  const unassigned = await pool.query(`
    SELECT COUNT(*) AS cnt FROM articles WHERE story_id IS NULL
  `);
  console.log(`  ${unassigned.rows[0].cnt} artikel tanpa story`);

  if (Number(unassigned.rows[0].cnt) > 0) {
    const sample = await pool.query(`
      SELECT id, title, source_id, published_at, category
      FROM articles WHERE story_id IS NULL
      ORDER BY published_at DESC LIMIT 5
    `);
    for (const r of sample.rows) {
      console.log(`  #${r.id} [src=${r.source_id}] ${r.title.slice(0, 100)}`);
    }
  }

  console.log("\n=== TOTAL ARTICLES ===");
  const tot = await pool.query("SELECT COUNT(*) FROM articles");
  console.log(`  ${tot.rows[0].count} total artikel`);

  console.log("\n=== CURRENT OVERLAP THRESHOLDS ===");
  console.log(`  ATTACH_THRESHOLD = 0.55 (artikel → story)`);
  console.log(`  MERGE_THRESHOLD  = 0.60 (story → story)`);
  console.log(`  CATEGORY_BONUS   = 0.08`);
  console.log(`  MAX_STORY_TOKENS = 40`);

  await pool.end();
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
