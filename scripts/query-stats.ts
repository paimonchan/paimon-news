import { Pool } from "pg";
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const r = await pool.query("SELECT COUNT(*) AS total, ROUND(COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '7 days') / 7.0, 1) AS per_day, ROUND(AVG(article_count), 1) AS avg_articles, COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '24 hours') AS today FROM stories");
  console.log(JSON.stringify(r.rows[0]));
  await pool.end();
}
main();
