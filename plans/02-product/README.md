# 02 — Product (Features & UX)

## Fitur yang Sudah Live
### Berita & Navigasi
- [x] Feed berita dari **28 RSS feed / 11 portal**
- [x] **Clustering** otomatis: artikel dari insiden yang sama dikelompokkan
- [x] **Ringkasan** netmap + perbandingan framing
- [x] **Blindspot detection**: sudut pandang yang dilewatkan tiap portal
- [x] Kategori: politik, ekonomi, teknologi, olahraga, hiburan, nasional, internasional, gaya hidup, kesehatan, otomotif, umum
- [x] **Hot score** sorting (popularitas)
- [x] Pencarian full-text
- [x] Pagination di /terkini

### Auth & Personalisasi
- [x] Magic link login via email (Resend)
- [x] Session cookie via next/headers
- [x] Bookmark / simpan cerita
- [x] Digest email harian (subscribe/unsubscribe)

### SEO
- [x] Open Graph tags (og:title, og:description, og:image, og:url)
- [x] Twitter Cards (summary_large_image)
- [x] JSON-LD NewsArticle
- [x] Sitemap.xml
- [x] Robots.txt
- [x] Canonical URL

### UI
- [x] Dark mode / light mode toggle
- [x] Mobile responsive
- [x] Inter font

## User Flow
1. User buka website → lihat feed **Top Stories** (diurutkan hot score)
2. Setiap card: **judul** → **ringkasan 2-3 paragraf** → **sumber** → **timestamp** → **kategori**
3. Klik card → detail peristiwa: ringkasan netral + perspektif tiap portal + blindspot
4. Filter kategori, cari, bookmark, subscribe digest

## UX Principles
- Mobile-first (berita dibaca di HP)
- Load time cepat (unstable_cache + Suspense)
- Dark mode
- Font nyaman (Inter)

## Fitur yang masih direncanakan
- [ ] Custom OG image generator (branded)
- [ ] FTS search (Postgres tsvector)
- [ ] next/image untuk optimasi gambar
- [ ] Premium tier
