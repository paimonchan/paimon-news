// Use case: autentikasi magic-link (dengan rate limiting anti-spam).

import crypto from "node:crypto";
import type { AuthRepository, Mailer } from "./ports";
import { emailLayout, bulletproofButton } from "@/infrastructure/mail/template";

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
      const recent = await authRepo.countRecentTokens(email, 1);
      if (recent >= MAX_TOKENS_PER_HOUR) {
        throw new RateLimitError();
      }

      const token = crypto.randomBytes(24).toString("hex");
      await authRepo.createToken(token, email, TOKEN_MINUTES);

      const link = `${baseUrl}/api/auth/verify?token=${token}`;
      await mailer.send({
        to: email,
        subject: "Tautan masuk Lensa",
        html: emailLayout({
          preheader: "Klik tombol di bawah untuk masuk ke Lensa. Tautan berlaku 15 menit.",
          title: "Masuk ke Lensa",
          content: `
            <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#44403c;font-size:14px;line-height:1.7;margin:0 0 20px;">
              Klik tombol di bawah untuk masuk ke akun kamu. Tautan berlaku <strong>${TOKEN_MINUTES} menit</strong> dan hanya bisa dipakai sekali.
            </p>
            <p style="margin:0 0 24px;">
              ${bulletproofButton(link, "Masuk ke Lensa →")}
            </p>
            <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#a8a29e;font-size:12px;line-height:1.6;margin:0;">
              Jika tombol tidak berfungsi, salin tautan ini ke browser:<br />
              <a href="${link}" style="color:#b45309;word-break:break-all;">${link}</a>
            </p>
            <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#a8a29e;font-size:12px;line-height:1.6;margin:16px 0 0;">
              Jika kamu tidak meminta tautan ini, abaikan email ini.
            </p>
          `,
          footerNote: "Lensa — keamanan akun kamu adalah prioritas kami.",
        }),
        textFallback: `Masuk ke Lensa: ${link} (berlaku ${TOKEN_MINUTES} menit)`,
      });
    },

    async verifyLoginToken(token: string): Promise<string | null> {
      const sessionToken = crypto.randomBytes(24).toString("hex");
      const email = await authRepo.consumeTokenAndCreateSession(token, sessionToken, SESSION_DAYS);
      return email ? sessionToken : null;
    },
  };
}
