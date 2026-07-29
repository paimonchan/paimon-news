# Optimization Sprint — Performance & SEO

## Goal
Speed up Lensa web & improve SEO discoverability.

## Sesi 1 — Performance (Done)
- [x] Batch query rowToCard — eliminate N+1 (62→3 query/homepage)
- [x] ISR story page + sumber + sitemap (revalidate)
- [x] SiteHeader non-blocking (Suspense)
- [x] Hapus `force-dynamic` redundant

## Sesi 2 — SEO (Done)
- [x] Open Graph di story page (og:title, og:description, og:image, og:url, og:type=article)
- [x] Twitter Cards (summary_large_image)
- [x] JSON-LD NewsArticle (eligible Google News)
- [x] Default OG + Twitter di layout + metadataBase + robots

## Sesi 3 — Image & Config (Done)
- [x] Image remotePatterns di next.config.ts (11 portal + CDN)
- [x] Canonical URL via metadataBase + openGraph.url

## Future
- [ ] FTS search (SQLite FTS5 / Postgres tsvector)
- [ ] Migrasi <img> ke next/image untuk optimasi
- [ ] Custom OG image generator (Lensa branded)
