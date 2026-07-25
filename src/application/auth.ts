// Use case: autentikasi magic-link (dengan rate limiting anti-spam).

import crypto from "node:crypto";
import type { AuthRepository, Mailer } from "./ports";

const TOKEN_MINUTES = 15;
const SESSION_DAYS = 30;
/** Maksimal permintaan tautan masuk per email per jam. */
const MAX_TOKENS_PER_HOUR = 3;

export class RateLimitError extends Error {
  constructor() {
    super("Terlalu banyak permintaan tautan masuk. Coba lagi dalam 1 jam.");
    this.name = "RateLimitError";
  }
}

export function makeAuth(deps: {
  authRepo: AuthRepository;
  mailer: Mailer;
  baseUrl: string;
}): {
  requestLogin(email: string): Promise<void>;
  verifyLoginToken(token: string): Promise<string | null>;
  sessionDays: number;
} {
  const { authRepo, mailer, baseUrl } = deps;

  return {
    sessionDays: SESSION_DAYS,

    async requestLogin(email: string): Promise<void> {
      const recent = authRepo.countRecentTokens(email, 1);
      if (recent >= MAX_TOKENS_PER_HOUR) {
        throw new RateLimitError();
      }

      const token = crypto.randomBytes(24).toString("hex");
      authRepo.createToken(token, email, TOKEN_MINUTES);

      const link = `${baseUrl}/api/auth/verify?token=${token}`;
      await mailer.send({
        to: email,
        subject: "Tautan masuk Lensa",
        html: `
          <div style="font-family:sans-serif;max-width:480px">
            <h2>Masuk ke Lensa</h2>
            <p>Klik tombol di bawah untuk masuk. Tautan berlaku ${TOKEN_MINUTES} menit.</p>
            <p><a href="${link}" style="display:inline-block;background:#b45309;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">Masuk ke Lensa</a></p>
            <p style="color:#666;font-size:13px">Jika kamu tidak meminta tautan ini, abaikan email ini.</p>
          </div>
        `,
        textFallback: `Masuk ke Lensa: ${link} (berlaku ${TOKEN_MINUTES} menit)`,
      });
    },

    async verifyLoginToken(token: string): Promise<string | null> {
      const sessionToken = crypto.randomBytes(24).toString("hex");
      const email = authRepo.consumeTokenAndCreateSession(token, sessionToken, SESSION_DAYS);
      return email ? sessionToken : null;
    },
  };
}
