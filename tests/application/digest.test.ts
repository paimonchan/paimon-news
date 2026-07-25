import { describe, expect, it } from "vitest";
import { buildDigestHtml } from "@/application/digest";
import type { StoryCard } from "@/domain/entities";

function story(overrides: Partial<StoryCard>): StoryCard {
  return {
    id: 1,
    title: "Judul",
    category: "umum",
    updated_at: new Date().toISOString(),
    article_count: 1,
    source_count: 1,
    hot_score: 1,
    image_url: null,
    summary: null,
    sources: [],
    ...overrides,
  };
}

describe("buildDigestHtml", () => {
  it("meng-escape judul jahat dari RSS (anti HTML injection)", () => {
    const html = buildDigestHtml(
      [
        story({
          title: '<img src=x onerror="alert(document.cookie)">',
          summary: '<script>alert("x")</script>',
          sources: [{ slug: "x", name: "<b>Jahat</b>" }],
        }),
      ],
      "http://test",
      "token123"
    );

    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain("&lt;script&gt;");
  });

  it("menyertakan tautan berhenti berlangganan", () => {
    const html = buildDigestHtml([story({})], "http://test", "token123");
    expect(html).toContain("/berhenti?token=token123");
  });
});
