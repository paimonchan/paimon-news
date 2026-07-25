# 03 — Tech Architecture

## Stack Options

### Frontend
- [ ] **Next.js / Nuxt** — SSR bagus untuk SEO berita
- [ ] **SvelteKit** — lightweight, fast
- [ ] **Astro** — static-first, cocok content site
- [ ] Lainnya: ...

### Backend
- [ ] **FastAPI (Python)** — cocok untuk ML/AI integration
- [ ] **Node.js (Express/Hono)** — ringan, cepat
- [ ] **Go** — performa scraping tinggi
- [ ] Lainnya: ...

### Database
- [ ] **PostgreSQL** — relational, mature
- [ ] **SQLite** — simple untuk MVP
- [ ] **MongoDB** — flexible schema

## Scraping Pipeline
```
[Sumber Berita] → [Scraper] → [Parser/Normalizer] → [LLM Summary] → [Database] → [API/Web]
```

### Scraping Approach
- [ ] **RSS/Atom feeds** — recommended (legal, terstruktur)
- [ ] **HTML scraping** (BeautifulSoup / Playwright) — untuk yg gak punya RSS
- [ ] **API pihak ketiga** — NewsAPI, Bing News, etc.

### Anti-Blocking Strategy
- Rotate User-Agent
- Rate limiting (jangan banjiri server sumber)
- Proxy rotation (kalau perlu)

## Summarization Engine
- **Model LLM lokal** (Llama, Mistral via Ollama/vLLM) — gratis, privasi
- **API LLM** (OpenAI, Claude, DeepSeek) — lebih akurat, ada biaya
- **Hybrid** — pakai lokal untuk daily, API untuk deep dive

## Infrastructure
- **VPS** (DigitalOcean, Linode, Hetzner)
- **Cloud** (AWS/GCP/Azure — scalable tapi lebih mahal)
- **Serverless** (Cloudflare Workers + Pages — cocok untuk skala kecil)

## Tech Diagram (Basic)
```
┌─────────────┐    ┌──────────┐    ┌─────────────┐    ┌──────────┐
│ RSS Feeds   │───▶│ Scraper  │───▶│ LLM Summary │───▶│ Database │
│ HTML Scrape │    │ Scheduler│    │ Engine      │    │          │
└─────────────┘    └──────────┘    └─────────────┘    └────┬─────┘
                                                            │
                     ┌──────────┐    ┌──────────┐           │
                     │ Web UI   │◀───│ API      │◀──────────┘
                     │ (Next.js)│    │ (FastAPI)│
                     └──────────┘    └──────────┘
```
