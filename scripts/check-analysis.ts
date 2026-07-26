import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

  const cnt = await pool.query("SELECT COUNT(*) AS cnt FROM story_analysis");
  console.log("Total analysis:", cnt.rows[0].cnt);

  const sample = await pool.query(`
    SELECT sa.story_id, sa.method, sa.model, sa.input_tokens, sa.output_tokens,
           s.title, s.article_count
    FROM story_analysis sa
    JOIN stories s ON s.id = sa.story_id
    ORDER BY sa.generated_at DESC LIMIT 5
  `);
  for (const r of sample.rows) {
    console.log(
      `  #${r.story_id} [${r.method}] ${r.model || "-"} | in:${r.input_tokens || 0} out:${r.output_tokens || 0} | "${(r.title as string).slice(0, 70)}"`
    );
  }

  await pool.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
