import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  excerpt,
  jaccard,
  normalizeText,
  normalizeUrl,
  overlapCoefficient,
  sentences,
  stripHtml,
  tokenize,
} from "@/domain/text";

describe("stripHtml", () => {
  it("menghapus tag dan script", () => {
    expect(stripHtml("<p>Halo <b>dunia</b></p><script>alert(1)</script>")).toBe(
      "Halo dunia"
    );
  });

  it("decode entity dasar", () => {
    expect(stripHtml("A &amp; B &quot;C&quot;")).toBe('A & B "C"');
  });
});

describe("escapeHtml", () => {
  it("meng-escape karakter berbahaya untuk email HTML", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
    );
  });

  it("meng-escape ampersand lebih dulu", () => {
    expect(escapeHtml("A & <B>")).toBe("A &amp; &lt;B&gt;");
  });
});

describe("normalizeText + tokenize", () => {
  it("lowercase, buang tanda baca & stopwords Bahasa Indonesia", () => {
    const tokens = tokenize("Prabowo dan Gibran menghadiri rapat di Istana!");
    expect(tokens.has("prabowo")).toBe(true);
    expect(tokens.has("gibran")).toBe(true);
    expect(tokens.has("dan")).toBe(false); // stopword
    expect(tokens.has("di")).toBe(false); // stopword
  });

  it("membuang token pendek dan angka murni", () => {
    const tokens = tokenize("AI 2026 naik 15 persen");
    expect(tokens.has("ai")).toBe(false); // < 3 huruf
    expect(tokens.has("2026")).toBe(false); // angka murni
    expect(tokens.has("persen")).toBe(true);
  });
});

describe("kemiripan", () => {
  it("jaccard: himpunan identik = 1, disjoint = 0", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
    expect(jaccard(new Set(["a"]), new Set(["b"]))).toBe(0);
  });

  it("overlapCoefficient toleran judul beda panjang", () => {
    const pendek = new Set(["gempa", "aceh", "korban"]);
    const panjang = new Set(["gempa", "aceh", "korban", "bmkg", "evakuasi", "warga"]);
    expect(overlapCoefficient(pendek, panjang)).toBe(1); // semua token pendek tercakup
    expect(jaccard(pendek, panjang)).toBeLessThan(1);
  });
});

describe("normalizeUrl", () => {
  it("membuang parameter tracking", () => {
    expect(normalizeUrl("https://x.id/berita-1?utm_source=rss&utm_medium=feed&page=2")).toBe(
      "https://x.id/berita-1?page=2"
    );
  });

  it("membuang hash dan trailing slash", () => {
    expect(normalizeUrl("https://x.id/a/#komentar")).toBe("https://x.id/a");
  });
});

describe("sentences", () => {
  it("memecah kalimat dan membuang yang terlalu pendek", () => {
    const s = sentences("Ok. Gempa berkekuatan 5,2 mengguncang Aceh pagi ini. Warga berhamburan.");
    expect(s).toHaveLength(1);
    expect(s[0]).toContain("Gempa");
  });
});

describe("excerpt", () => {
  it("memotong tanpa memutus kata", () => {
    const out = excerpt("kata satu dua tiga empat lima enam tujuh", 20);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(21);
  });
});
