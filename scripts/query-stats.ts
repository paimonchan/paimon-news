import { Pool } from "pg";
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const [a, b, c] = await Promise.all([
    pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE article_count=1) AS singleton, ROUND(AVG(article_count),2) AS avg, COUNT(*) FILTER (WHERE article_count>=2) AS multi FROM stories"),
    pool.query("SELECT article_count, COUNT(*) AS cnt FROM stories GROUP BY article_count ORDER BY article_count"),
    pool.query("SELECT source_count, COUNT(*) AS cnt FROM stories GROUP BY source_count ORDER BY source_count"),
  ]);
  console.log("TOTAL:", a.rows[0].total, "| Singleton:", a.rows[0].singleton, "("+(Number(a.rows[0].singleton)/Number(a.rows[0].total)*100).toFixed(0)+"%) | Multi:", a.rows[0].multi, "| Avg:", a.rows[0].avg);
  console.log("Distribusi artikel:"); b.rows.forEach((r: any) => console.log("  "+r.article_count+" -> "+r.cnt));
  console.log("Distribusi sumber:"); c.rows.forEach((r: any) => console.log("  "+r.source_count+" -> "+r.cnt));
  await pool.end();
}
main();
