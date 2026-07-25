import { describe, expect, it } from "vitest";
import {
  MAX_STORY_TOKENS,
  hotScore,
  mergeTokens,
  parseTokenMap,
} from "@/domain/scoring";

describe("mergeTokens", () => {
  it("menghitung frekuensi dan membatasi jumlah token", () => {
    const existing: Record<string, number> = {};
    for (let i = 0; i < 50; i++) existing[`token${i}`] = 1;

    const merged = mergeTokens(existing, new Set(["baru", "token0"]));
    expect(Object.keys(merged).length).toBeLessThanOrEqual(MAX_STORY_TOKENS);
    expect(merged["token0"]).toBe(2); // frekuensi naik
  });
});

describe("hotScore", () => {
  it("story multi-sumber mengalahkan artikel banyak dari 1 sumber", () => {
    const multiSumber = hotScore({ articleCount: 6, sourceCount: 4, ageHours: 2 });
    const satuSumber = hotScore({ articleCount: 15, sourceCount: 1, ageHours: 2 });
    expect(multiSumber).toBeGreaterThan(satuSumber);
  });

  it("meluruh seiring waktu", () => {
    const baru = hotScore({ articleCount: 5, sourceCount: 3, ageHours: 1 });
    const lama = hotScore({ articleCount: 5, sourceCount: 3, ageHours: 48 });
    expect(baru).toBeGreaterThan(lama);
  });

  it("umur negatif tidak menghasilkan boost ekstra", () => {
    const a = hotScore({ articleCount: 1, sourceCount: 1, ageHours: -5 });
    const b = hotScore({ articleCount: 1, sourceCount: 1, ageHours: 0 });
    expect(a).toBeCloseTo(b);
  });
});

describe("parseTokenMap", () => {
  it("toleran JSON rusak", () => {
    expect(parseTokenMap("{rusak")).toEqual({});
    expect(parseTokenMap(null)).toEqual({});
    expect(parseTokenMap('{"a":1}')).toEqual({ a: 1 });
  });
});
