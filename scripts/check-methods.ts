import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
pool
  .query("SELECT method, COUNT(*) as cnt FROM story_analysis GROUP BY method")
  .then((r) => {
    console.log("methods:", JSON.stringify(r.rows));
    return pool.end();
  })
  .catch((e) => {
    console.error(e);
    pool.end();
  });
