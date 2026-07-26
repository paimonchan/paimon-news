import Parser from "rss-parser";

export interface RssItem {
  title?: string;
  link?: string;
  guid?: string;
  isoDate?: string;
  pubDate?: string;
  creator?: string;
  author?: string;
  contentSnippet?: string;
  content?: string;
  "content:encoded"?: string;
  enclosure?: { url?: string };
  "media:content"?: { $?: { url?: string } } | { $?: { url?: string } }[];
  "media:thumbnail"?: { $?: { url?: string } } | { $?: { url?: string } }[];
}

export interface FetchFeedResult {
  /** 200 = konten baru, 304 = tidak berubah sejak fetch terakhir */
  status: 200 | 304;
  items: RssItem[];
  etag: string | null;
  lastModified: string | null;
}

const parser = new Parser<RssItem>({
  headers: { "User-Agent": userAgent() },
  customFields: { item: ["media:content", "media:thumbnail", "content:encoded"] },
});

function userAgent(): string {
  return "Mozilla/5.0 (compatible; LensaBot/1.0) RSS Reader";
}

/**
 * Perbaikan konservatif untuk XML malformed yang umum di feed Indonesia
 * (mis. atribut tanpa nilai: `<guid isPermaLink>` atau `length=>`).
 * Hanya dipakai sebagai fallback setelah parse normal gagal.
 */
export function sanitizeMalformedXml(xml: string): string {
  return xml.replace(/<([a-zA-Z_:][^<>]*)>/g, (tag) => {
    // lewati tag penutup, deklarasi, dan CDATA
    if (/^<\//.test(tag) || /^<\?/.test(tag) || /^<!/.test(tag)) return tag;
    // atribut telanjang: kata setelah spasi yang tidak diikuti "="
    return tag.replace(
      /\s+([a-zA-Z_:][\w.-]*)(?=(\s+[a-zA-Z_:][\w.-]*=)|\s*\/?>$)/g,
      ' $1=""'
    );
  });
}

function parseXml(xml: string): Promise<{ items?: RssItem[] }> {
  return parser.parseString(xml).catch(() => parser.parseString(sanitizeMalformedXml(xml)));
}

/** Fetch feed dengan conditional GET (ETag / Last-Modified) untuk hemat bandwidth. */
export async function fetchFeed(
  url: string,
  conditional?: { etag?: string | null; lastModified?: string | null }
): Promise<FetchFeedResult> {
  const headers: Record<string, string> = {
    "User-Agent": userAgent(),
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  };
  if (conditional?.etag) headers["If-None-Match"] = conditional.etag;
  if (conditional?.lastModified) headers["If-Modified-Since"] = conditional.lastModified;

  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(10000),
    redirect: "follow",
  });

  const etag = res.headers.get("etag");
  const lastModified = res.headers.get("last-modified");

  if (res.status === 304) {
    return { status: 304, items: [], etag: conditional?.etag ?? null, lastModified: conditional?.lastModified ?? null };
  }
  if (!res.ok) {
    throw new Error(`Status code ${res.status}`);
  }

  const xml = await res.text();
  const parsed = await parseXml(xml);

  return {
    status: 200,
    items: parsed.items ?? [],
    etag,
    lastModified,
  };
}
