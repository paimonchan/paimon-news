// Template email bersama — Lensa design system.
// Best practice email: layout table-based (bukan flex/grid), inline style,
// bulletproof button (border-radius + padding di <a>), MSO conditional untuk Outlook.

import { escapeHtml } from "@/domain/text";

// ── Design tokens ──────────────────────────────────────────────
const COLORS = {
  bg: "#f5f4f0", // hangat, stone
  card: "#ffffff",
  ink: "#1c1917", // stone-900
  body: "#44403c", // stone-700
  muted: "#a8a29e", // stone-400
  accent: "#d97706", // amber-600
  accentDark: "#92400e", // amber-800
  border: "#e7e5e4", // stone-200
  link: "#b45309", // amber-700
};

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// ── Helpers ────────────────────────────────────────────────────
export function bulletproofButton(href: string, label: string, opts: { secondary?: boolean } = {}) {
  const bg = opts.secondary ? "#ffffff" : COLORS.accent;
  const fg = opts.secondary ? COLORS.link : "#ffffff";
  const border = opts.secondary ? `border:1px solid ${COLORS.border};` : "";
  return `
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
      href="${href}" style="height:44px;v-text-anchor:middle;" arcsize="12%" stroke="${opts.secondary ? "f" : "t"}" fillcolor="${bg}">
      <w:anchorlock/>
      <center style="color:${fg};font-family:${FONT_STACK};font-size:14px;font-weight:600">${label}</center>
    </v:roundrect>
    <![endif]-->
    <a href="${href}" style="display:inline-block;background:${bg};color:${fg};padding:12px 28px;border-radius:8px;text-decoration:none;font-family:${FONT_STACK};font-size:14px;font-weight:600;${border}">
      ${label}
    </a>`;
}

// ── Layout utama (header + body + footer) ──────────────────────
export function emailLayout(opts: {
  preheader: string;
  title: string;
  content: string;
  footerNote?: string;
}): string {
  const { preheader, title, content, footerNote } = opts;
  return `<!DOCTYPE html>
<html lang="id" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    /* Hanya untuk klien yang support <style> (Apple Mail, mobile) */
    .preheader { display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; mso-hide:all; font-size:1px; line-height:1px; overflow:hidden; }
    @media only screen and (max-width:600px) {
      .container { width:100% !important; }
      .content { padding:24px 20px !important; }
      .story-block { padding:20px 0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.bg};">
  <div class="preheader" style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;mso-hide:all;font-size:1px;line-height:1px;overflow:hidden;">${escapeHtml(preheader)}</div>

  <!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.bg}"><tr><td align="center"><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.bg};padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;margin:0 auto;background-color:${COLORS.card};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(28,25,23,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:${COLORS.ink};padding:28px 32px;">
              <div style="font-family:${FONT_STACK};font-size:20px;font-weight:800;letter-spacing:.12em;color:#ffffff;">LENSA</div>
              <div style="font-family:${FONT_STACK};font-size:12px;color:${COLORS.muted};margin-top:2px;letter-spacing:.02em;">Satu peristiwa, semua sudut pandang</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="content" style="padding:32px;">
              <div style="font-family:${FONT_STACK};font-size:24px;font-weight:700;color:${COLORS.ink};line-height:1.3;margin-bottom:8px;">${title}</div>
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:${COLORS.bg};padding:20px 32px;border-top:1px solid ${COLORS.border};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:${FONT_STACK};font-size:12px;color:${COLORS.muted};line-height:1.6;">
                    ${footerNote ?? "Lensa — news gateway Indonesia"}
                    <br />Kamu menerima email ini karena berlangganan Digest Lensa.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</body>
</html>`;
}

// ── Komponen: satu cerita untuk digest ─────────────────────────
export function storyBlock(
  story: { id: number; title: string; summary: string | null; sources: { name: string }[]; source_count: number },
  index: number,
  baseUrl: string
): string {
  const rank = index + 1;
  return `
  <div class="story-block" style="padding:20px 0;border-top:1px solid ${COLORS.border};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="36" valign="top" style="font-family:${FONT_STACK};font-size:26px;font-weight:800;color:${COLORS.accent};line-height:1;">${rank}</td>
        <td valign="top" style="padding-left:12px;">
          <a href="${baseUrl}/story/${story.id}"
             style="font-family:${FONT_STACK};font-size:17px;font-weight:700;color:${COLORS.ink};text-decoration:none;line-height:1.4;">
            ${escapeHtml(story.title)}
          </a>
          ${story.summary ? `<p style="font-family:${FONT_STACK};color:${COLORS.body};font-size:14px;line-height:1.65;margin:8px 0 6px;">${escapeHtml(story.summary)}</p>` : ""}
          <div style="font-family:${FONT_STACK};font-size:12px;color:${COLORS.muted};">
            ${story.sources.map((s) => escapeHtml(s.name)).join(" &middot; ")}
          </div>
        </td>
      </tr>
    </table>
  </div>`;
}

// ── Komponen: tautan berhenti berlangganan ─────────────────────
export function unsubscribeLink(baseUrl: string, token: string): string {
  return `
  <div style="font-family:${FONT_STACK};font-size:12px;color:${COLORS.muted};margin-top:28px;padding-top:16px;border-top:1px solid ${COLORS.border};line-height:1.7;">
    Tidak ingin menerima digest lagi?
    <a href="${baseUrl}/berhenti?token=${encodeURIComponent(token)}" style="color:${COLORS.link};text-decoration:underline;">Berhenti berlangganan</a>
  </div>`;
}
