import { getContainer } from "../src/infrastructure/container";
import { config } from "../src/infrastructure/config";

async function main() {
  console.log("[digest] Starting...");
  console.log(
    "[digest] linkBase:",
    config.baseUrl.includes("localhost")
      ? "LOCALHOST (BUG!)"
      : `PRODUCTION OK (${config.baseUrl})`
  );

  const container = getContainer();

  const { waitForPg } = await import("../src/infrastructure/db/postgres/client");
  await waitForPg();
  console.log("[digest] DB ready");

  // Dry-run: cek stories + base link tanpa mengirim email apa pun.
  if (process.env.DRY_RUN === "true") {
    const stories = await container.queries.getDigestStories(7);
    console.log(`[digest] DRY RUN: ${stories.length} stories siap dikirim`);
    process.exit(0);
  }

  const result = await container.digest.sendDigestEmails();
  console.log(JSON.stringify({ ok: true, ...result }));
}

main().catch((err) => {
  console.error("[digest] Failed:", err);
  process.exit(1);
});
