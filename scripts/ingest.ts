import { getContainer } from "../src/infrastructure/container";

async function main() {
  console.log("[ingest] Starting...");

  const container = getContainer();

  // Wait for DB (Postgres auto-migrate/seed runs async)
  const { waitForPg } = await import("../src/infrastructure/db/postgres/client");
  await waitForPg();

  console.log("[ingest] DB ready, running ingest...");

  const result = await Promise.race([
    container.ingest.run({ analyze: false }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT: ingest > 300 detik")), 300_000)
    ),
  ]);

  console.log(JSON.stringify({ ok: true, ...result }));
}

main().catch((err) => {
  console.error("[ingest] Failed:", err);
  process.exit(1);
});
