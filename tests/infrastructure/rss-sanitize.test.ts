import { describe, expect, it } from "vitest";
import { sanitizeMalformedXml } from "@/infrastructure/rss/fetcher";
import Parser from "rss-parser";

const parser = new Parser();

describe("sanitizeMalformedXml", () => {
  it("memperbaiki atribut telanjang sehingga bisa diparse", async () => {
    const broken = `<?xml version="1.0"?>
      <rss version="2.0">
        <channel>
          <title>Feed Uji</title>
          <item>
            <title>Berita satu</title>
            <link>https://contoh.id/1</link>
            <guid isPermaLink>https://contoh.id/1</guid>
          </item>
        </channel>
      </rss>`;

    // versi mentah gagal diparse
    await expect(parser.parseString(broken)).rejects.toThrow();

    // setelah disanitasi berhasil
    const fixed = await parser.parseString(sanitizeMalformedXml(broken));
    expect(fixed.items).toHaveLength(1);
    expect(fixed.items[0].title).toBe("Berita satu");
  });

  it("tidak merusak XML yang sudah valid", async () => {
    const valid = `<?xml version="1.0"?>
      <rss version="2.0">
        <channel>
          <title>Feed</title>
          <item><title>A</title><link>https://contoh.id/a</link></item>
        </channel>
      </rss>`;

    const a = await parser.parseString(valid);
    const b = await parser.parseString(sanitizeMalformedXml(valid));
    expect(b.items).toHaveLength(a.items.length);
    expect(b.items[0].title).toBe("A");
  });
});
