<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deploy Plan — Zero Cost (Vercel + Supabase + GitHub Actions)

## Arsitektur

```
Browser ──► Vercel Hobby ($0) ──► Supabase Free ($0)
                  ▲
                  │
        GitHub Actions ($0) ── cron */15 ──► /api/cron/ingest?batchSize=7 (×4)
                              ── cron 22:00 ─► /api/cron/digest
                              ── cron */5  ──► /api/health (keep-alive)

Semua $0/bulan:
- Vercel Hobby: 60s timeout, 1M invocations/bulan, 100GB bandwidth
- Supabase Free: 500MB Postgres, 5GB egress, auto-pause after 1wk idle
- GitHub Actions: 2000 min/bulan, cron unlimited
```

## Langkah

### 1. Supabase Free — Buat Database

1. Buka https://supabase.com → Sign up / Login
2. Create project → nama `paimon-news`, region Singapore (sgd-1), password simpan
3. Proses tunggu ~2 menit
4. Setelah jadi → Project Settings → Database → Connection string (URI)
   - Copy: `postgresql://postgres:xxxxx@db.xxxxx.supabase.co:5432/postgres`
5. Simpan ke Vercel sebagai `DATABASE_URL`

### 2. Vercel — Deploy & Set Env

1. `npx vercel --prod`
2. Set env vars di dashboard:
   ```
   DATABASE_URL=postgresql://...
   CRON_SECRET=<random-string>
   BASE_URL=https://paimon-news.vercel.app
   ```
3. Set `NODE_ENV=production`
4. AI & Mail opsional (kosongkan untuk fallback console)

### 3. Create .github/workflows/ingest.yml

```yaml
name: Ingest Berita
on:
  schedule:
    - cron: '*/15 * * * *'
  workflow_dispatch:

jobs:
  ingest:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        batch: [0, 1, 2, 3]
    steps:
      - run: |
          curl -s -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "${{ secrets.BASE_URL }}/api/cron/ingest?batchSize=7&batch=${{ matrix.batch }}" \
            --max-time 55
```

### 4. Create .github/workflows/digest.yml

```yaml
name: Kirim Digest
on:
  schedule:
    - cron: '15 15 * * *'  # 22:00 WIB (UTC+7) = 15:00 UTC
  workflow_dispatch:
jobs:
  digest:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -s -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "${{ secrets.BASE_URL }}/api/cron/digest" --max-time 55
```

### 5. Create .github/workflows/keepalive.yml

```yaml
name: Keepalive Supabase
on:
  schedule:
    - cron: '*/5 * * * *'  # tiap 5 menit cegah pause
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -s "${{ secrets.BASE_URL }}/api/health" --max-time 10
```

### 6. Buat endpoint /api/health

`src/app/api/health/route.ts` — query simple `SELECT 1`, return 200.
Supabase Free auto-pause setelah 7 hari idle. Keepalive tiap 5 menit mencegah ini.

### 7. GitHub Secrets

Set di Settings → Secrets and variables → Actions:
- `CRON_SECRET` — sama dengan yang di Vercel
- `BASE_URL` — URL Vercel (https://...)

## Catatan

- 500MB database Supabase cukup untuk ~50.000 artikel + analysis + metadata
- 60s timeout Vercel Hobby cukup untuk 7 feed (FETCH_CONCURRENCY=4)
- 4 parallel batch calls via GitHub Actions matrix: total 28 feed/15 menit
- Vercel Hobby tidak boleh untuk komersial (personal project OK)
- Migrasi ke Pro ($20/bulan) jika butuh >500MB DB atau >60s timeout
