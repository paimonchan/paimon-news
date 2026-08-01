// Use case: digest harian — HTML email + pengiriman ke pelanggan.

import crypto from "node:crypto";
import type { DigestRepository, Mailer } from "./ports";
import type { StoryCard } from "@/domain/entities";
import { emailLayout, storyBlock, unsubscribeLink } from "@/infrastructure/mail/template";

export function buildDigestHtml(
  stories: StoryCard[],
  baseUrl: string,
  unsubscribeToken?: string
): string {
  const items = stories.map((s, i) => storyBlock(s, i, baseUrl)).join("");

  const unsub =
    unsubscribeToken != null ? unsubscribeLink(baseUrl, unsubscribeToken) : "";

  const topTitles = stories.slice(0, 3).map((s) => s.title).join(" · ");

  return emailLayout({
    preheader: `${stories.length} peristiwa terpanas 24 jam terakhir — ${topTitles}`,
    title: `Digest pagi, ${stories.length} peristiwa terpanas`,
    content: `
      <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#44403c;font-size:14px;line-height:1.7;margin:0 0 8px;">
        Satu peristiwa, semua sudut pandang. Berikut ${stories.length} peristiwa yang paling banyak diberitakan 24 jam terakhir &mdash; dirangkum netral, tanpa bias.
      </p>
      ${items}
      ${unsub}
    `,
    footerNote: "Dikirim otomatis oleh Lensa.",
  });
}

export function makeDigest(deps: {
  digestRepo: DigestRepository;
  mailer: Mailer;
  baseUrl: string;
  getDigestStories: (limit: number) => Promise<StoryCard[]>;
}): {
  sendDigestEmails(): Promise<{ sent: number; failed: number }>;
  subscribe(email: string, userId: number | null): Promise<void>;
} {
  const { digestRepo, mailer, baseUrl, getDigestStories } = deps;

  return {
    async sendDigestEmails() {
      const stories = await getDigestStories(7);
      if (stories.length === 0) return { sent: 0, failed: 0 };

      const subscribers = await digestRepo.listActive();
      let sent = 0;
      let failed = 0;

      for (const sub of subscribers) {
        const res = await mailer.send({
          to: sub.email,
          subject: `☕ Digest Lensa: ${stories[0]?.title.slice(0, 60) ?? "Berita hari ini"}`,
          html: buildDigestHtml(stories, baseUrl, sub.unsubscribe_token),
          textFallback: `Digest Lensa hari ini: ${stories.map((s) => s.title).join(" | ")}`,
        });
        if (res.sent) sent++;
        else failed++;
      }
      return { sent, failed };
    },

    async subscribe(email: string, userId: number | null) {
      const token = crypto.randomUUID().replace(/-/g, "");
      await digestRepo.upsertSubscription(email, userId, token);

      await mailer.send({
        to: email,
        subject: "Langganan Digest Lensa aktif",
        html: emailLayout({
          preheader: "Kamu terdaftar di Digest Lensa. Mulai besok pagi, ringkasan 7 berita terpanas masuk ke inbox kamu.",
          title: "Selamat datang di Lensa 👋",
          content: `
            <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#44403c;font-size:14px;line-height:1.7;margin:0 0 16px;">
              Terima kasih sudah berlangganan <strong>Digest Lensa</strong>. Setiap pagi, kamu akan menerima ringkasan
              7 berita terpanas dari berbagai portal &mdash; dirangkum netral, lengkap dengan sudut pandang tiap media.
            </p>
            <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#44403c;font-size:14px;line-height:1.7;margin:0 0 24px;">
              Baca berita hari ini kapan saja di <a href="${baseUrl}" style="color:#b45309;">lensa</a>.
            </p>
          `,
          footerNote: "Tidak merasa mendaftar?",
        }),
        textFallback: "Langganan Digest Lensa aktif. Terima kasih!",
      });
    },
  };
}
