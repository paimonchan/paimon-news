// Kebijakan clustering & ranking — angka-angka inti produk ada di sini agar mudah dituning & ditest.

/** Threshold kemiripan untuk memasang artikel ke story yang sudah ada. */
export const ATTACH_THRESHOLD = 0.55;

/** Threshold kemiripan untuk menggabungkan dua story. */
export const MERGE_THRESHOLD = 0.6;

/** Bonus skor jika kategori artikel sama dengan story. */
export const SAME_CATEGORY_BONUS = 0.08;

/** Story hanya menerima artikel baru dalam jendela waktu ini (jam). */
export const STORY_WINDOW_HOURS = 48;

/** Artikel lebih tua dari ini tidak di-cluster sama sekali (jam). */
export const ARTICLE_WINDOW_HOURS = 72;

/** Jumlah token maksimal yang disimpan per story. */
export const MAX_STORY_TOKENS = 40;

export type TokenMap = Record<string, number>;

/** Gabungkan token artikel baru ke peta token story, potong ke yang paling sering. */
export function mergeTokens(existing: TokenMap, extra: Set<string>): TokenMap {
  const merged = { ...existing };
  for (const t of extra) merged[t] = (merged[t] ?? 0) + 1;
  const entries = Object.entries(merged)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_STORY_TOKENS);
  return Object.fromEntries(entries);
}

/**
 * Skor panas story:
 * - tiap sumber unik = 3 poin (sinyal terkuat: banyak portal meliput)
 * - tiap artikel = 0.8 poin
 * - boost keterbaruan: 8 * e^(-umurJam/10), meluruh halus
 */
export function hotScore(input: {
  articleCount: number;
  sourceCount: number;
  ageHours: number;
}): number {
  const recencyBoost = 8 * Math.exp(-Math.max(0, input.ageHours) / 10);
  return input.sourceCount * 3 + input.articleCount * 0.8 + recencyBoost;
}

export function parseTokenMap(tokensJson: string | null): TokenMap {
  if (!tokensJson) return {};
  try {
    return JSON.parse(tokensJson) as TokenMap;
  } catch {
    return {};
  }
}
