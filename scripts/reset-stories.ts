import { getPg, waitForPg } from "../src/infrastructure/db/postgres/client";

async function main() {
  console.log("[reset] Starting...");
  await waitForPg();

  const pg = getPg();

  const delSa = await pg.run("DELETE FROM story_articles");
  console.log(`[reset] story_articles: ${delSa.changes} deleted`);

  const delSt = await pg.run("DELETE FROM story_analysis");
  console.log(`[reset] story_analysis: ${delSt.changes} deleted`);

  const delS = await pg.run("DELETE FROM stories");
  console.log(`[reset] stories: ${delS.changes} deleted`);

  console.log("[reset] Done. Now run ingest to re-cluster all articles.");
}

main().catch((err) => {
  console.error("[reset] Failed:", err);
  process.exit(1);
});
