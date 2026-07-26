import { getContainer } from "@/infrastructure/container";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getContainer().db;
    await db.get("SELECT 1");
    return Response.json({ status: "ok", db: "connected" });
  } catch (error) {
    return Response.json(
      { status: "error", message: String(error) },
      { status: 500 }
    );
  }
}
