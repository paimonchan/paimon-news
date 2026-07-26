export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL) return;

  try {
    const { waitForPg } = await import("@/infrastructure/db/postgres/client");
    await waitForPg();
    console.log("[boot] Database ready");

    const { getContainer } = await import("@/infrastructure/container");
    const container = getContainer();

    const { total } = await container.queries.getLatestArticles(1, 1);
    if (total === 0) {
      console.log("[boot] Database kosong — menjalankan ingestion pertama di background…");
      container.ingest
        .run()
        .then((r) =>
          console.log(`[boot] Ingestion pertama selesai: ${r.articlesNew} artikel baru.`)
        )
        .catch((err) => console.error("[boot] Ingestion pertama gagal:", err));
    }
  } catch (err) {
    console.error("[boot] Skip initialization:", String(err));
  }
}
