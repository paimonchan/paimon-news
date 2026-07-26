import { NextRequest } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { cronAuthorized } from "../_auth";

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
