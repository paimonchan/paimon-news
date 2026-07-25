# 09 — Operations

## Hosting & Infrastructure
| Item | Opsi | Estimasi Biaya | Notes |
|------|------|---------------|-------|
| VPS | Hetzner / DigitalOcean / Linode | ~$5-10/bln | Untuk MVP |
| Domain | Niagahoster / Cloudflare | ~150-200rb/thn | |
| Database | PostgreSQL (via VPS / Supabase) | $0-10/bln | |
| LLM API | OpenRouter / DeepSeek / lokal via Ollama | ? | Tergantung volume |
| CDN | Cloudflare Free | $0 | |

## Monitoring
- [ ] **Uptime monitoring** — UptimeRobot / BetterStack (free)
- [ ] **Error tracking** — Sentry (self-hosted / free tier)
- [ ] **Logging** — Grafana / Loki / sederhana pakai file log
- [ ] **Usage analytics** — Plausible / Umami (privacy-friendly)

## Maintenance
- [ ] Update scraping rules saat sumber berubah layout
- [ ] Rotate User-Agent / proxy kalau diblokir
- [ ] Database backup (otomatis)
- [ ] Update dependencies (security patches)
- [ ] Monitor token usage LLM (budget control)

## Scalability Plan
- **MVP:** Single VPS + SQLite
- **Growth:** Separate DB server + Redis cache
- **Scale:** Microservices / serverless untuk scraping & summarization

## BCP / Disaster Recovery
- [ ] Database backup harian (automated)
- [ ] Source code di GitHub (udah)
- [ ] Restart policy: auto-restart via systemd / docker
