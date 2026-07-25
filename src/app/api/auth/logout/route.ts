import { redirect } from "next/navigation";
import { getContainer } from "@/infrastructure/container";

export const dynamic = "force-dynamic";

export async function GET() {
  await getContainer().session.destroySession();
  redirect("/");
}
