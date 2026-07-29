import { getContainer } from "../src/infrastructure/container";

async function main() {
  console.log("[digest] Starting...");

  const container = getContainer();

  const { waitForPg } = await import("../src/infrastructure/db/postgres/client");
  await waitForPg();
  console.log("[digest] DB ready");

  const result = await container.digest.sendDigestEmails();
  console.log(JSON.stringify({ ok: true, ...result }));
}

main().catch((err) => {
  console.error("[digest] Failed:", err);
  process.exit(1);
});
