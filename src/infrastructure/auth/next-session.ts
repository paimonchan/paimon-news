// Adapter Next.js untuk sesi — satu-satunya modul auth yang menyentuh next/headers.

import { cookies } from "next/headers";
import type { AuthRepository } from "@/application/ports";
import type { UserRow } from "@/domain/entities";

const SESSION_COOKIE = "lensa_session";

export function makeSessionService(authRepo: AuthRepository, sessionDays: number) {
  return {
    async getSessionUser(): Promise<UserRow | null> {
      const store = await cookies();
      const token = store.get(SESSION_COOKIE)?.value;
      if (!token) return null;
      return await authRepo.findUserBySession(token);
    },

    async setSessionCookie(sessionToken: string): Promise<void> {
      const store = await cookies();
      store.set(SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: sessionDays * 24 * 3600,
      });
    },

    async destroySession(): Promise<void> {
      const store = await cookies();
      const token = store.get(SESSION_COOKIE)?.value;
      if (token) await authRepo.deleteSession(token);
      store.delete(SESSION_COOKIE);
    },
  };
}

export type SessionService = ReturnType<typeof makeSessionService>;
