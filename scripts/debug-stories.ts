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

  console.log("\n=== CEK KOLOM articles ===");
  const cols = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'articles' ORDER BY ordinal_position
  `);
  console.log(`  kolom: ${cols.rows.map(r => r.column_name).join(", ")}`);

  console.log("\n=== ARTIKEL TERTUA YANG BELUM MASUK STORY ===");
  const unassigned = await pool.query(`
    SELECT COUNT(*) AS cnt FROM articles a
    LEFT JOIN story_articles sa ON sa.article_id = a.id
    WHERE sa.story_id IS NULL
  `);
  console.log(`  ${unassigned.rows[0].cnt} artikel tanpa story`);

  if (Number(unassigned.rows[0].cnt) > 0) {
    const sample = await pool.query(`
      SELECT a.id, a.title, a.source_id, a.published_at, a.category
      FROM articles a
      LEFT JOIN story_articles sa ON sa.article_id = a.id
      WHERE sa.story_id IS NULL
      ORDER BY a.published_at DESC LIMIT 5
    `);
    for (const r of sample.rows) {
      console.log(`  #${r.id} [src=${r.source_id}] ${r.title.slice(0, 100)}`);
    }
  }

  console.log("\n=== SAMPLE SINGLETONS — cek judul mirip (di JS, tanpa pg_trgm) ===");
  // Ambil 30 singleton terbaru, bandingkan overlap token pairwise
  const raw = await pool.query(`
    SELECT s.id, s.title FROM stories s
    WHERE s.article_count = 1
    ORDER BY s.hot_score DESC LIMIT 30
  `);
  const titles = raw.rows.map((r: any) => ({ id: r.id, tokens: new Set((r.title as string).toLowerCase().split(/\s+/).filter(Boolean)) }));
  let found = 0;
  for (let i = 0; i < titles.length && found < 5; i++) {
    for (let j = i + 1; j < titles.length && found < 5; j++) {
      const [small, big] = titles[i].tokens.size <= titles[j].tokens.size ? [titles[i], titles[j]] : [titles[j], titles[i]];
      let inter = 0;
      for (const t of small.tokens) if (big.tokens.has(t)) inter++;
      const overlap = inter / small.tokens.size;
      if (overlap >= 0.3) {
        console.log(`  overlap=${overlap.toFixed(2)} — #${titles[i].id} vs #${titles[j].id}`);
        console.log(`    → ${raw.rows.find((r: any) => r.id === titles[i].id)?.title.slice(0, 80)}`);
        console.log(`    → ${raw.rows.find((r: any) => r.id === titles[j].id)?.title.slice(0, 80)}`);
        found++;
      }
    }
  }
  if (found === 0) console.log("  Tidak ada pasangan dengan overlap >= 0.3 di sample 30 ini");

  await pool.end();
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
