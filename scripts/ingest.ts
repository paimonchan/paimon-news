import { getContainer } from "../src/infrastructure/container";

async function main() {
  console.log("[ingest] Starting...");

  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const stats = await pool.query(
    "SELECT (SELECT COUNT(*) FROM articles) AS articles, (SELECT COUNT(*) FROM stories) AS stories, (SELECT COUNT(*) FROM story_articles) AS sa"
  );
  console.log("[ingest] DB stats before:", JSON.stringify(stats.rows[0]));
  await pool.end();

  const container = getContainer();

  // Wait for DB (Postgres auto-migrate/seed runs async)
  const { waitForPg } = await import("../src/infrastructure/db/postgres/client");
  await waitForPg();

  console.log("[ingest] DB ready, running ingest...");

  const result = await Promise.race([
    container.ingest.run({ analyze: false }),
    new Promise<never>((_, reject) => {
      const t = setTimeout(() => reject(new Error("TIMEOUT: ingest > 600 detik")), 600_000);
      t.unref();
    }),
  ]);

  console.log(JSON.stringify({ ok: true, ...result }));
}

main().catch((err) => {
  console.error("[ingest] Failed:", err);
  process.exit(1);
});
