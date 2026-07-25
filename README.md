# Lensa — Satu Peristiwa, Semua Sudut Pandang

> **Lensa** is an Indonesian news gateway that automatically clusters same-event stories from 11 major news portals and presents them side-by-side, revealing each outlet's unique framing, blindspots, and narrative bias.

## Fitur

- **Clustering otomatis**: Artikel dari 28 RSS feed dikelompokkan per peristiwa pakai token-Jaccard overlap
- **Perbandingan framing**: Ringkasan netral vs perspektif tiap portal, plus blindspot detection
- **Analisis dual-mode**: AI (OpenAI-compatible, JSON mode) atau heuristic fallback (common-sentence + distinctive tokens)
- **11 portal berita**: Detik, CNN Indonesia, Tempo, CNBC, Media Indonesia, Antara, Tribun, Okezone, Sindonews, RMOL, BBC Indonesia
- **Auth magic-link**: Login tanpa password, cukup email
- **Digest email**: Ringkasan harian dengan subscribe/unsubscribe
- **Bookmark**: Simpan cerita untuk dibaca nanti
- **Pencarian**: Cari berita dari semua portal
- **Dark mode**: Toggle tema terang/gelap
- **Sitemap & RSS**: Siap untuk SEO dan indexer

## Arsitektur

```
src/
├── domain/          # Pure business logic (no deps, zero imports from outside)
│   ├── entities.ts  # Core types (Article, Story, Source, etc.)
│   ├── text.ts      # stripHtml, tokenize, jaccard, normalize, etc.
│   ├── categorize.ts# Category classifier (keyword-based)
│   └── scoring.ts   # hotScore, thresholds (0.55 attach, 0.6 merge)
├── application/     # Use cases (depends only on domain + ports)
│   ├── ports.ts     # Interfaces: Repository, Mailer, AiClient, FeedFetcher
│   ├── ingest.ts    # Orchestrates RSS → normalize → save → cluster → analyze → cleanup
│   ├── clustering.ts# assignNewArticles + mergeSimilarStories + refreshHotScores
│   ├── analysis.ts  # analyzeStory (AI or heuristic) + concurrency control
│   ├── auth.ts      # requestLogin (rate-limited) + verifyLoginToken
│   ├── digest.ts    # buildDigestHtml + sendDigestEmails + subscribe
│   ├── cleanup.ts   # Retention: stale articles, orphan stories, expired sessions
│   └── queries.ts   # Read-model query functions (getTopStories, search, etc.)
├── infrastructure/  # Adapters (DB, RSS, AI, Mail, Auth, Config, DI)
│   ├── config.ts    # Centralized env reading
│   ├── container.ts # Composition root (getContainer)
│   ├── db/          # SQLite via better-sqlite3, migrations v1-v3, seed, source-defs
│   ├── rss/         # Feed fetcher with conditional GET + malformed XML fix
│   ├── ai/          # chatJson<T> (OpenAI-compatible or null fallback)
│   ├── mail/        # Resend or console fallback
│   └── auth/        # Session cookie management via next/headers
├── app/             # Next.js App Router pages + API routes
│   ├── page.tsx     # Home (top stories feed)
│   ├── story/[id]   # Story detail: summary, perspectives, timeline, blindspot
│   ├── kategori/[slug]# Category filter
│   ├── terkini/     # Latest with pagination
│   ├── cari/        # Full-text search
│   ├── digest/      # Subscribe/unsubscribe digest
│   ├── login/       # Magic link login
│   ├── tersimpan/   # Bookmarked stories (login required)
│   ├── sumber/      # All sources with article counts
│   ├── berhenti/    # Unsubscribe confirmation
│   ├── api/cron/ingest  # Cron endpoint (auth via CRON_SECRET)
│   ├── api/cron/digest  # Daily digest sender
│   └── api/auth/verify  # Magic link verification
├── components/      # Shared React components
│   ├── SiteHeader, SiteFooter, ThemeProvider, ThemeToggle
│   ├── StoryCard, SourceChip, CategoryNav, Pagination
│   ├── SubscribeForm, BookmarkButton
└── instrumentation.ts  # Auto-ingest on first boot (empty DB)
```

**Alur data:**

```
RSS Feed → fetcher (conditional GET) → normalisasi → simpan ke SQLite
       → clustering (assign + merge + hot score) → analysis (AI/heuristik)
       → cleanup (retensi 30 hari)
```

## Setup

### Prasyarat

- Node.js ≥ 20.x
- npm

### Instalasi

```bash
git clone https://github.com/paimonchan/paimon-news.git
cd paimon-news
npm install
```

### Konfigurasi

Salin `.env.example` ke `.env.local`:

```bash
cp .env.example .env.local
```

**Variabel wajib:**
| Variabel | Default | Keterangan |
|---|---|---|
| `CRON_SECRET` | (required) | Secret untuk amankan endpoint cron |
| `BASE_URL` | http://localhost:3000 | URL publik (untuk tautan email) |

**Variabel opsional — AI analysis:**
| Variabel | Default | Keterangan |
|---|---|---|
| `AI_API_KEY` | — | API key (OpenAI / OpenRouter / Groq / DeepSeek dll.) |
| `AI_BASE_URL` | https://api.openai.com/v1 | Base URL provider AI |
| `AI_MODEL` | gpt-4o-mini | Model AI untuk analisis framing |

Tanpa AI key, analisis tetap berjalan pakai heuristic (common-sentence extraction + distinctive-token scoring).

**Variabel opsional — Email:**
| Variabel | Default | Keterangan |
|---|---|---|
| `RESEND_API_KEY` | — | API key Resend untuk kirim email |
| `MAIL_FROM` | Lensa <onboarding@resend.dev> | Pengirim email |

Tanpa Resend key, email dicetak ke console.

### Development

```bash
npm run dev
```

Buka http://localhost:3000.

### Testing

```bash
npm test        # 42 test (domain, application, infrastructure)
npm run test    # sama
```

### Build

```bash
npm run build
```

## Deploy

### Vercel

```bash
npm i -g vercel
vercel --prod
```

Set environment variables di dashboard Vercel (lihat `.env.example`).

**Catatan:**
- SQLite bersifat ephemeral di Vercel (data hilang tiap redeploy). Untuk produksi serius, migrasikan ke Postgres (Supabase/Neon) — skema sudah kompatibel.
- Vercel Hobby hanya mengizinkan cron harian. Untuk interval lebih sering, gunakan scheduler eksternal (cron-job.org, GitHub Actions) yang memanggil:
  ```
  curl -H "Authorization: Bearer $CRON_SECRET" https://domainmu/api/cron/ingest
  ```

### PostgreSQL Migration Path

1. Buat database di Supabase/Neon
2. Ganti implementasi `src/infrastructure/db/` dari better-sqlite3 ke `@vercel/postgres` atau `pg`
3. Interface di `src/application/ports.ts` tetap sama — clean architecture menjamin zero perubahan di domain/application layer

## Cron

| Endpoint | Jadwal | Deskripsi |
|---|---|---|
| `/api/cron/ingest` | Tiap 15 menit | Fetch RSS, cluster, analyze, cleanup |
| `/api/cron/digest` | 22:00 WIB | Kirim digest email ke subscriber |

Keduanya dilindungi oleh `CRON_SECRET` (header `Authorization: Bearer <secret>`).

## Teknologi

- **Framework**: Next.js 16 (App Router, Turbopack, Server Actions)
- **Bahasa**: TypeScript
- **Database**: SQLite via better-sqlite3 (migrasi v1-v3)
- **UI**: Tailwind CSS v4, next-themes
- **Testing**: Vitest
- **AI**: OpenAI-compatible API (opsional, fallback heuristic)
- **Email**: Resend (opsional, fallback console)

## Struktur Data

9 tabel SQLite:
- `sources` — Portal berita (Detik, CNN, dll.)
- `feeds` — RSS feed per portal
- `articles` — Artikel individual dari feed
- `stories` — Cluster cerita (satu peristiwa)
- `story_articles` — Mapping article → story
- `story_analysis` — Hasil analisis framing per story
- `auth_tokens` — Magic link tokens (exp: 15 menit, rate limit max 3/jam)
- `sessions` — Cookie sessions
- `digest_subscribers` — Email subscriber digest
- `bookmarks` — Bookmark user per story

## Lisensi

MIT
