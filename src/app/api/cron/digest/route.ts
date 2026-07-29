import { NextRequest } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { cronAuthorized } from "../_auth";

/**
 * @deprecated Digest sekarang jalan langsung dari GitHub Actions via scripts/digest.ts
 *             (lihat .github/workflows/digest.yml).
 *             Endpoint ini dipertahankan untuk backward compatibility saja.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await getContainer().digest.sendDigestEmails();
  return Response.json({ ok: true, ...result });
}
