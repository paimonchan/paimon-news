// Kategori berita terpadu + klasifier kata kunci Bahasa Indonesia. Murni.

export const CATEGORIES: { slug: string; label: string }[] = [
  { slug: "nasional", label: "Nasional" },
  { slug: "internasional", label: "Internasional" },
  { slug: "politik", label: "Politik" },
  { slug: "ekonomi", label: "Ekonomi" },
  { slug: "teknologi", label: "Teknologi" },
  { slug: "olahraga", label: "Olahraga" },
  { slug: "hiburan", label: "Hiburan" },
  { slug: "gaya-hidup", label: "Gaya Hidup" },
  { slug: "kesehatan", label: "Kesehatan" },
  { slug: "otomotif", label: "Otomotif" },
  { slug: "umum", label: "Umum" },
];

const CATEGORY_SET = new Set(CATEGORIES.map((c) => c.slug));

const FEED_CATEGORY_MAP: Record<string, string> = {
  nasional: "nasional",
  nusantara: "nasional",
  metro: "nasional",
  megapolitan: "nasional",
  daerah: "nasional",
  regional: "nasional",
  terkini: "umum",
  news: "umum",
  internasional: "internasional",
  dunia: "internasional",
  global: "internasional",
  politik: "politik",
  hukum: "politik",
  pemilu: "politik",
  ekonomi: "ekonomi",
  bisnis: "ekonomi",
  money: "ekonomi",
  finansial: "ekonomi",
  keuangan: "ekonomi",
  market: "ekonomi",
  investasi: "ekonomi",
  tekno: "teknologi",
  teknologi: "teknologi",
  inet: "teknologi",
  sains: "teknologi",
  digital: "teknologi",
  gadget: "teknologi",
  olahraga: "olahraga",
  sport: "olahraga",
  bola: "olahraga",
  sepakbola: "olahraga",
  hiburan: "hiburan",
  selebritas: "hiburan",
  seleb: "hiburan",
  entertainment: "hiburan",
  film: "hiburan",
  musik: "hiburan",
  lifestyle: "gaya-hidup",
  "gaya-hidup": "gaya-hidup",
  cantik: "gaya-hidup",
  gaya: "gaya-hidup",
  travel: "gaya-hidup",
  wisata: "gaya-hidup",
  kuliner: "gaya-hidup",
  food: "gaya-hidup",
  humaniora: "gaya-hidup",
  khazanah: "gaya-hidup",
  leisure: "gaya-hidup",
  kesehatan: "kesehatan",
  health: "kesehatan",
  otomotif: "otomotif",
  oto: "otomotif",
  umum: "umum",
};

const KEYWORDS: [string, string[]][] = [
  ["politik", ["pemilu", "pilpres", "pilgub", "pilkada", "prabowo", "presiden", "menteri", "kabinet", "dpr", "dprd", "partai", "koalisi", "kampanye", "kepala daerah", "gubernur", "wali kota", "bupati", "kpk", "korupsi", "undang", "ruu", "putusan mk", "mahkamah", "politik"]],
  ["ekonomi", ["rupiah", "dolar", "saham", "ihsg", "inflasi", "ekonomi", "bisnis", "bank indonesia", "suku bunga", "investasi", "harga", "ekspor", "impor", "dagang", "pasar", "umkm", "pajak", "kripto", "emas", "bbm", "pertamina", "tarif", "subsidi"]],
  ["internasional", ["amerika", "trump", "china", "rusia", "ukraina", "israel", "palestina", "gaza", "iran", "asing", "internasional", "pbb", "nato", "eropa", "jepang", "korea", "asean", "perang", "dunia"]],
  ["teknologi", ["ai", "kecerdasan buatan", "teknologi", "gadget", "smartphone", "aplikasi", "internet", "digital", "startup", "google", "apple", "microsoft", "openai", "samsung", "iphone", "android", "siber", "peretasan", "chip", "robot", "spacex", "elon musk"]],
  ["olahraga", ["sepak bola", "liga", "gol", "pertandingan", "pemain", "timnas", "badminton", "bulu tangkis", "olahraga", "atlet", "piala", "olimpiade", "motogp", "tinju", "basket", "voli", "pelatih", "stadion"]],
  ["hiburan", ["film", "musik", "konser", "artis", "selebriti", "drama", "sinetron", "lagu", "album", "aktor", "aktris", "penyanyi", "hiburan", "netflix", "kpop", "idol", "gosip"]],
  ["kesehatan", ["kesehatan", "penyakit", "virus", "dokter", "rumah sakit", "obat", "vaksin", "kanker", "diabetes", "diet", "nutrisi", "mental", "covid", "wabah"]],
  ["otomotif", ["mobil", "motor", "otomotif", "kendaraan", "toyota", "honda", "yamaha", "byd", "wuling", "mesin"]],
  ["nasional", ["indonesia", "jakarta", "jawa", "sumatera", "kalimantan", "sulawesi", "papua", "bali", "surabaya", "bandung", "medan", "semarang", "polri", "tni", "bnpb", "banjir", "gempa", "kebakaran", "kecelakaan", "nasional"]],
];

export function mapFeedCategory(feedCategory: string | null | undefined): string {
  if (!feedCategory) return "umum";
  const key = feedCategory.toLowerCase().trim();
  return FEED_CATEGORY_MAP[key] ?? "umum";
}

export function classifyByKeywords(text: string): string | null {
  const lower = ` ${text.toLowerCase()} `;
  let best: string | null = null;
  let bestScore = 0;
  for (const [cat, words] of KEYWORDS) {
    let score = 0;
    for (const w of words) {
      if (lower.includes(` ${w} `) || lower.includes(` ${w}`)) score += w.length > 5 ? 2 : 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  return bestScore >= 2 ? best : null;
}

export function resolveCategory(feedCategory: string | null | undefined, text: string): string {
  const fromFeed = mapFeedCategory(feedCategory);
  if (fromFeed !== "umum") return fromFeed;
  return classifyByKeywords(text) ?? "umum";
}

export function categoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? "Umum";
}

export function isValidCategory(slug: string): boolean {
  return CATEGORY_SET.has(slug);
}
