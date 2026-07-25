// Use case: digest harian — HTML email + pengiriman ke pelanggan.

import type { DigestRepository, Mailer } from "./ports";
import type { StoryCard } from "@/domain/entities";
import { escapeHtml } from "@/domain/text";

export function buildDigestHtml(
  stories: StoryCard[],
  baseUrl: string,
  unsubscribeToken?: string
): string {
  const items = stories
    .map(
      (s, i) => `
      <div style="margin:0 0 24px;padding:0 0 20px;border-bottom:1px solid #eee">
        <div style="font-size:12px;color:#b45309;font-weight:600;text-transform:uppercase;letter-spacing:.05em">
          #${i + 1} &middot; ${s.source_count} sumber
        </div>
        <a href="${baseUrl}/story/${s.id}"
           style="font-size:17px;font-weight:700;color:#111;text-decoration:none;line-height:1.35">
          ${escapeHtml(s.title)}
        </a>
        ${s.summary ? `<p style="color:#444;font-size:14px;line-height:1.6;margin:8px 0 6px">${escapeHtml(s.summary)}</p>` : ""}
        <div style="font-size:12px;color:#888">
          ${s.sources.map((src) => escapeHtml(src.name)).join(" &middot; ")}
        </div>
      </div>`
    )
    .join("");

  const unsub =
    unsubscribeToken != null
      ? `<p style="color:#999;font-size:12px;margin-top:32px">
           <a href="${baseUrl}/berhenti?token=${encodeURIComponent(unsubscribeToken)}">Berhenti berlangganan</a>
         </p>`
      : "";

  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <h1 style="font-size:22px;margin:0 0 4px">&#9749; Digest Lensa</h1>
      <p style="color:#666;margin:0 0 28px;font-size:14px">
        ${stories.length} peristiwa terpanas 24 jam terakhir &mdash; satu peristiwa, semua sudut pandang.
      </p>
      ${items}
      ${unsub}
    </div>`;
}

export function makeDigest(deps: {
  digestRepo: DigestRepository;
  mailer: Mailer;
  baseUrl: string;
  getDigestStories: (limit: number) => StoryCard[];
}): {
  sendDigestEmails(): Promise<{ sent: number; failed: number }>;
  subscribe(email: string, userId: number | null): Promise<void>;
} {
  const { digestRepo, mailer, baseUrl, getDigestStories } = deps;

  return {
    async sendDigestEmails() {
      const stories = getDigestStories(7);
      if (stories.length === 0) return { sent: 0, failed: 0 };

      const subscribers = digestRepo.listActive();
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
      digestRepo.upsertSubscription(email, userId, token);

      await mailer.send({
        to: email,
        subject: "Berlangganan Digest Lensa aktif",
        html: `
          <div style="font-family:sans-serif;max-width:480px">
            <h2>Selamat datang di Digest Lensa &#9749;</h2>
            <p>Mulai besok pagi, kamu akan menerima ringkasan 7 berita terpanas dari berbagai sumber &mdash; netral, tanpa noise.</p>
            <p style="color:#666;font-size:13px">
              Tidak merasa mendaftar?
              <a href="${baseUrl}/berhenti?token=${token}">Berhenti berlangganan</a>.
            </p>
          </div>
        `,
        textFallback: "Langganan Digest Lensa aktif. Terima kasih!",
      });
    },
  };
}
