import { NextRequest } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { cronAuthorized } from "../_auth";

/**
 * @deprecated Ingest sekarang jalan langsung dari GitHub Actions via scripts/ingest.ts
 *             (lihat .github/workflows/ingest.yml).
 *             Endpoint ini dipertahankan untuk backward compatibility — jangan dihapus
 *             sampai semua workflow lama selesai migrasi.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Batas durasi function (Vercel: sesuaikan plan; lokal/VPS tidak berpengaruh)
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const batchSize = params.has("batchSize") ? Number(params.get("batchSize")) : undefined;
  const batchIndex = params.has("batch") ? Number(params.get("batch")) : undefined;

  const started = Date.now();
  const result = await getContainer().ingest.run({
    batchSize: Number.isFinite(batchSize) ? batchSize : undefined,
    batchIndex: Number.isFinite(batchIndex) ? batchIndex : undefined,
  });

  return Response.json({ ok: true, durationMs: Date.now() - started, ...result });
}
