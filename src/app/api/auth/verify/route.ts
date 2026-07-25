import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { getContainer } from "@/infrastructure/container";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) redirect("/login?error=invalid");

  const container = getContainer();
  const sessionToken = await container.auth.verifyLoginToken(token!);
  if (!sessionToken) redirect("/login?error=expired");

  await container.session.setSessionCookie(sessionToken);
  redirect("/");
}
