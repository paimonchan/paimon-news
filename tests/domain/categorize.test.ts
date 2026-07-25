import { describe, expect, it } from "vitest";
import {
  categoryLabel,
  classifyByKeywords,
  isValidCategory,
  mapFeedCategory,
  resolveCategory,
} from "@/domain/categorize";

describe("mapFeedCategory", () => {
  it("memetakan kategori feed ke slug terpadu", () => {
    expect(mapFeedCategory("tekno")).toBe("teknologi");
    expect(mapFeedCategory("money")).toBe("ekonomi");
    expect(mapFeedCategory("bola")).toBe("olahraga");
    expect(mapFeedCategory("dunia")).toBe("internasional");
  });

  it("kategori tak dikenal → umum", () => {
    expect(mapFeedCategory("xyz")).toBe("umum");
    expect(mapFeedCategory(null)).toBe("umum");
  });
});

describe("classifyByKeywords", () => {
  it("mengenali berita politik", () => {
    expect(
      classifyByKeywords("Presiden Prabowo mengumumkan reshuffle kabinet di DPR kemarin")
    ).toBe("politik");
  });

  it("mengenali berita ekonomi", () => {
    expect(
      classifyByKeywords("Rupiah melemah, IHSG turun dan Bank Indonesia menahan suku bunga")
    ).toBe("ekonomi");
  });

  it("mengenali berita olahraga", () => {
    expect(
      classifyByKeywords("Timnas Indonesia menang pertandingan piala AFF semalam, gol menit akhir")
    ).toBe("olahraga");
  });

  it("teks ambigu → null", () => {
    expect(classifyByKeywords("hari ini cuaca cerah sekali")).toBeNull();
  });
});

describe("resolveCategory", () => {
  it("kategori feed valid menang atas keyword", () => {
    expect(resolveCategory("tekno", "presiden bertemu menteri")).toBe("teknologi");
  });

  it("fallback ke keyword bila feed umum", () => {
    expect(resolveCategory("terkini", "ihsg dan rupiah suku bunga ekonomi")).toBe("ekonomi");
  });
});

describe("label & validasi", () => {
  it("categoryLabel", () => {
    expect(categoryLabel("tekno")).toBe("Umum"); // bukan slug valid → fallback
    expect(categoryLabel("teknologi")).toBe("Teknologi");
  });

  it("isValidCategory", () => {
    expect(isValidCategory("politik")).toBe(true);
    expect(isValidCategory("politics")).toBe(false);
  });
});
