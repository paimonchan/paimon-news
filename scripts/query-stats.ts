import { Pool } from "pg";
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const [cnt, sample, storyStats] = await Promise.all([
    pool.query("SELECT COUNT(*) AS cnt FROM story_analysis"),
    pool.query("SELECT sa.story_id, sa.method, sa.model, sa.input_tokens, sa.output_tokens, s.title, s.article_count FROM story_analysis sa JOIN stories s ON s.id = sa.story_id ORDER BY sa.generated_at DESC LIMIT 5"),
    pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE article_count=1) AS singleton, ROUND(AVG(article_count),2) AS avg, COUNT(*) FILTER (WHERE article_count>=2) AS multi FROM stories"),
  ]);
  console.log("Story stats:", JSON.stringify(storyStats.rows[0]));
  console.log("Total analysis:", cnt.rows[0].cnt);
  console.log("Sample:");
  for (const r of sample.rows) {
    console.log("  #"+r.story_id, "["+r.method+"]", r.model, "| in:"+r.input_tokens, "out:"+r.output_tokens, "|", (r.title as string).slice(0,70));
  }
  await pool.end();
}
main();
