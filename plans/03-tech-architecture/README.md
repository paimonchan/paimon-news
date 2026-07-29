# 03 — Tech Architecture (Aktual)

## Stack Final
### Frontend & Backend
- **Next.js 16.2.11** (App Router) — SSR sekaligus API routes
- **TypeScript** strict
- **Tailwind CSS** styling

### Database
- **PostgreSQL (Supabase Free)** — produksi
- **SQLite (better-sqlite3)** — development lokal
- **Adapter layer** (`src/infrastructure/db/postgres/adapter.ts`) — translasi otomatis SQLite → PostgreSQL (`datetime()` → `NOW()`, `INSERT OR IGNORE` → `ON CONFLICT DO NOTHING`)

### Hosting
- **Vercel Hobby** ($0) — 60s timeout, 1M invocations/bulan
- **Supabase Free** ($0) — 500MB Postgres, 5GB egress

### Scheduler (Cron)
- **GitHub Actions** ($0) — 2000 min/bulan
  - `scripts/ingest.ts` — ambil RSS tiap 6 jam (langsung ke DB, bukan via Vercel cron)
  - `scripts/digest.ts` — kirim email harian jam 22:00 WIB
  - `keepalive` — ping /api/health tiap 5 menit (cegah Supabase auto-pause)

### Scraping Pipeline
```
[28 RSS Feed] → [fetchFeed dengan conditional GET] → [Normalize] → [Cluster (token-Jaccard)] → [Analysis (heuristik/AI)] → [Postgres DB]
```

### Analisis
- **Default:** Heuristic — common-sentence extraction + distinctive token analysis
- **Opsional:** AI (OpenAI-compatible, JSON mode) jika AI_API_KEY di-set

### Auth
- Magic link via email (Resend API)
- Stateless session via encrypted cookies (`next/headers`)
- Rate-limited token creation

### Email
- **Resend** — free 100 email/hari
- Fallback ke console.log jika RESEND_API_KEY tidak di-set

## Tech Diagram
```
┌──────────────────────────────────────────────────────────────┐
│                   GitHub Actions (Cron)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │ scripts/     │  │ scripts/     │  │ /api/health     │    │
│  │ ingest.ts    │  │ digest.ts    │  │ (keepalive)     │    │
│  │ (tiap 6 jam) │  │ (22:00 WIB)  │  │ (tiap 5 menit)  │    │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘    │
└─────────┼─────────────────┼───────────────────┼──────────────┘
          │                 │                   │
          ▼                 ▼                   │
┌──────────────────────────────────────────────┐│
│              Supabase Postgres               │◄┘
│  ┌─────────┐ ┌─────────┐ ┌───────────────┐   │
│  │stories  │ │articles │ │auth_tokens     │   │
│  │sources  │ │feeds    │ │sessions        │   │
│  │analysis │ │bookmarks│ │digest_sub      │   │
│  └─────────┘ └─────────┘ └───────────────┘   │
└─────────────────────┬────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────┐
│         Vercel (Next.js)         │
│  ┌────────┐  ┌────────┐  ┌────┐ │
│  │ /page  │  │/story/ │  │/api│ │
│  │(feed)  │  │[id]    │  │/*  │ │
│  └────────┘  └────────┘  └────┘ │
│   SSR + unstable_cache caching  │
└──────────────────────────────────┘
          │
          ▼
┌─────────────────────┐
│   Browser (User)    │
└─────────────────────┘
```
