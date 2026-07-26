import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

function tokenize(s: string) {
  return new Set(s.toLowerCase().split(/\s+/).filter((t) => t.length > 2));
}
function overlap(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  const [sml, big] = a.size <= b.size ? [a, b] : [b, a];
  let inter = 0;
  for (const t of sml) if (big.has(t)) inter++;
  return inter / sml.size;
}

async function main() {
  // Intra-story overlap
  console.log("=== INTRA-STORY OVERLAP ===");
  const multi = await pool.query(
    `SELECT id, title, article_count, tokens_json FROM stories WHERE article_count >= 3 ORDER BY hot_score DESC LIMIT 5`
  );
  for (const ms of multi.rows) {
    const arts = await pool.query(
      `SELECT a.title FROM articles a JOIN story_articles sa ON sa.article_id = a.id WHERE sa.story_id = $1`,
      [ms.id]
    );
    const list = arts.rows.map((r: any) => ({ title: r.title, toks: tokenize(r.title) }));
    const storyToks = new Set(Object.keys(JSON.parse(ms.tokens_json || "{}")));
    let minSim = 1, maxSim = 0;
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const s = overlap(list[i].toks, list[j].toks);
        if (s < minSim) minSim = s;
        if (s > maxSim) maxSim = s;
      }
    console.log(`\nStory #${ms.id} (${ms.article_count} artikel): ${ms.title.slice(0, 80)}`);
    console.log(`  Min overlap antar artikel: ${minSim.toFixed(3)}, Max: ${maxSim.toFixed(3)}`);
    console.log(`  Story token count: ${storyToks.size}`);
    for (const t of list) {
      console.log(`  → ${overlap(t.toks, storyToks).toFixed(3)} | "${t.title.slice(0, 70)}"`);
    }
  }

  // Singleton vs artikel lain
  console.log("\n=== SINGLETON vs ARTIKEL LAIN ===");
  const singles = await pool.query(
    `SELECT s.id, s.title, s.category FROM stories s WHERE s.article_count = 1 ORDER BY s.hot_score DESC LIMIT 30`
  );
  const arts = await pool.query(
    `SELECT a.id, a.title, a.category, sa.story_id FROM articles a
     JOIN story_articles sa ON sa.article_id = a.id
     WHERE a.published_at >= NOW() - INTERVAL '24 hours' LIMIT 300`
  );

  let pairs = 0;
  for (const s of singles.rows) {
    const sToks = tokenize(s.title);
    for (const a of arts.rows) {
      if (a.story_id === s.id) continue;
      const sim = overlap(sToks, tokenize(a.title));
      if (sim >= 0.35) {
        pairs++;
        if (pairs <= 10)
          console.log(
            `  overlap=${sim.toFixed(2)} | story #${s.id} "${s.title.slice(0, 60)}"` +
            `\n              ↔ art #${a.id} (story #${a.story_id}) "${a.title.slice(0, 60)}"`
          );
      }
    }
  }
  console.log(`\n  Total pasangan overlap >= 0.35: ${pairs}`);

  // Cek apa ada grup artikel yg SAMA (token overlap tinggi) tapi beda story
  console.log("\n=== GRUP ARTIKEL SAMA TERPECAH ===");
  const allArts = await pool.query(
    `SELECT a.id, a.title, sa.story_id FROM articles a
     JOIN story_articles sa ON sa.article_id = a.id
     WHERE a.published_at >= NOW() - INTERVAL '24 hours' ORDER BY a.published_at DESC LIMIT 300`
  );
  type Art = { id: number; title: string; story_id: number; toks: Set<string> };
  const list: Art[] = allArts.rows.map((r: any) => ({ id: r.id, title: r.title, story_id: r.story_id, toks: tokenize(r.title) }));

  let clusters = 0;
  const seen = new Set<number>();
  for (let i = 0; i < list.length; i++) {
    if (seen.has(list[i].story_id)) continue;
    const friends = list.filter(
      (a2) =>
        a2.story_id !== list[i].story_id &&
        !seen.has(a2.story_id) &&
        overlap(list[i].toks, a2.toks) >= 0.40
    );
    if (friends.length > 0) {
      clusters++;
      if (clusters <= 5) {
        console.log(`\n  Grup #${clusters}: story #${list[i].story_id} ↔ story ${friends.map((f) => "#" + f.story_id).join(", ")}`);
        console.log(`    "${list[i].title.slice(0, 80)}"`);
        console.log(`    "${friends[0].title.slice(0, 80)}"`);
      }
    }
    seen.add(list[i].story_id);
  }
  console.log(`\n  Total grup terpecah (overlap>=0.4): ${clusters}`);

  await pool.end();
}
main().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
