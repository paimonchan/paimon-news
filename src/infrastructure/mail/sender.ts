// Pengiriman email via Resend. Tanpa RESEND_API_KEY, email dicetak ke konsol (mode dev).

import { config } from "@/infrastructure/config";

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  textFallback?: string;
}

export async function sendMail(opts: MailOptions): Promise<{ sent: boolean }> {
  if (!config.mail.configured) {
    console.log("──────────────────────────────────────────────");
    console.log(`[mail:dev] Kepada : ${opts.to}`);
    console.log(`[mail:dev] Subjek : ${opts.subject}`);
    if (opts.textFallback) console.log(`[mail:dev] Isi    : ${opts.textFallback}`);
    console.log("──────────────────────────────────────────────");
    return { sent: false };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(config.mail.resendApiKey);
    const { error } = await resend.emails.send({
      from: config.mail.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) {
      console.error("[mail] gagal:", error);
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error("[mail] gagal:", err instanceof Error ? err.message : err);
    return { sent: false };
  }
}
