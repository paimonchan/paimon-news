// Definisi sumber berita Indonesia + feed RSS-nya (data, bukan logic).
// Feed yang gagal 10x berturut-turut otomatis dinonaktifkan oleh ingestion.

export interface FeedDef {
  url: string;
  category: string;
}

export interface SourceDef {
  slug: string;
  name: string;
  homepage: string;
  character: string; // deskripsi netral karakter media
  feeds: FeedDef[];
}

export const SOURCE_DEFS: SourceDef[] = [
  {
    slug: "antara",
    name: "Antara News",
    homepage: "https://www.antaranews.com",
    character: "Kantor berita negara (BUMN)",
    feeds: [
      { url: "https://www.antaranews.com/rss/terkini.xml", category: "terkini" },
      { url: "https://www.antaranews.com/rss/politik.xml", category: "politik" },
      { url: "https://www.antaranews.com/rss/ekonomi.xml", category: "ekonomi" },
      { url: "https://www.antaranews.com/rss/tekno.xml", category: "tekno" },
      { url: "https://www.antaranews.com/rss/dunia.xml", category: "dunia" },
    ],
  },
  {
    slug: "cnn",
    name: "CNN Indonesia",
    homepage: "https://www.cnnindonesia.com",
    character: "Media mainstream, afiliasi Trans Media",
    feeds: [
      { url: "https://www.cnnindonesia.com/nasional/rss", category: "nasional" },
      { url: "https://www.cnnindonesia.com/internasional/rss", category: "internasional" },
      { url: "https://www.cnnindonesia.com/ekonomi/rss", category: "ekonomi" },
      { url: "https://www.cnnindonesia.com/teknologi/rss", category: "teknologi" },
      { url: "https://www.cnnindonesia.com/olahraga/rss", category: "olahraga" },
      { url: "https://www.cnnindonesia.com/hiburan/rss", category: "hiburan" },
    ],
  },
  {
    slug: "cnbc",
    name: "CNBC Indonesia",
    homepage: "https://www.cnbcindonesia.com",
    character: "Fokus bisnis, pasar & ekonomi",
    feeds: [{ url: "https://www.cnbcindonesia.com/rss", category: "bisnis" }],
  },
  {
    slug: "tempo",
    name: "Tempo",
    homepage: "https://www.tempo.co",
    character: "Dikenal dengan jurnalisme investigatif",
    feeds: [
      { url: "https://rss.tempo.co/nasional", category: "nasional" },
      { url: "https://rss.tempo.co/internasional", category: "internasional" },
      { url: "https://rss.tempo.co/bisnis", category: "bisnis" },
      { url: "https://rss.tempo.co/tekno", category: "tekno" },
      { url: "https://rss.tempo.co/olahraga", category: "olahraga" },
    ],
  },
  {
    slug: "mediaindonesia",
    name: "Media Indonesia",
    homepage: "https://mediaindonesia.com",
    character: "Harian nasional (Media Group)",
    feeds: [{ url: "https://mediaindonesia.com/feed", category: "terkini" }],
  },
  {
    slug: "okezone",
    name: "Okezone",
    homepage: "https://www.okezone.com",
    character: "Media mainstream, bagian dari MNC Group",
    feeds: [
      { url: "https://sindikasi.okezone.com/index.php/rss/0/RSS2.0", category: "terkini" },
    ],
  },
  {
    slug: "tribun",
    name: "Tribunnews",
    homepage: "https://www.tribunnews.com",
    character: "Jaringan media nasional-regional (Kompas Gramedia)",
    feeds: [{ url: "https://www.tribunnews.com/rss", category: "terkini" }],
  },
  {
    slug: "detik",
    name: "detikcom",
    homepage: "https://www.detik.com",
    character: "Portal berita terbesar Indonesia (Trans Media)",
    feeds: [
      { url: "https://news.detik.com/rss", category: "news" },
      { url: "https://finance.detik.com/rss", category: "money" },
      { url: "https://inet.detik.com/rss", category: "inet" },
      { url: "https://sport.detik.com/rss", category: "sport" },
      { url: "https://hot.detik.com/rss", category: "hiburan" },
    ],
  },
  {
    slug: "sindonews",
    name: "SINDOnews",
    homepage: "https://www.sindonews.com",
    character: "Portal berita MNC Group",
    feeds: [{ url: "https://www.sindonews.com/rss", category: "terkini" }],
  },
  {
    slug: "rmol",
    name: "RMOL.id",
    homepage: "https://rmol.id",
    character: "Portal berita politik",
    feeds: [{ url: "https://rmol.id/rss", category: "politik" }],
  },
  {
    slug: "bbc",
    name: "BBC Indonesia",
    homepage: "https://www.bbc.com/indonesia",
    character: "Layanan publik Inggris berbahasa Indonesia",
    feeds: [{ url: "https://feeds.bbci.co.uk/indonesia/rss.xml", category: "internasional" }],
  },
];
