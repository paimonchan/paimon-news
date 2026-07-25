import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { config } from "@/infrastructure/config";

/** Verifikasi secret cron dengan perbandingan timing-safe. */
export function cronAuthorized(request: NextRequest): boolean {
  // Di development, izinkan tanpa secret agar mudah dites
  if (config.isDev) return true;

  const secret = config.cronSecret;
  if (!secret) return false;

  const bearer = request.headers.get("authorization");
  const provided =
    bearer?.startsWith("Bearer ") ? bearer.slice(7) : request.nextUrl.searchParams.get("secret");

  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
