// Use case: ingestion — ambil RSS → normalisasi → simpan → cluster → analisis → cleanup.

import crypto from "node:crypto";
import type {
  ArticleRepository,
  FeedFetcher,
  FeedRepository,
} from "./ports";
import type { ClusteringUseCase } from "./clustering";
import type { AnalysisUseCase } from "./analysis";
import type { CleanupResult } from "./cleanup";
import type { FeedRow, IngestResult, NewArticle } from "@/domain/entities";
import { resolveCategory } from "@/domain/categorize";
import { normalizeUrl, stripHtml, tokenize } from "@/domain/text";
import type { RssItem } from "@/infrastructure/rss/fetcher";

const MAX_AGE_DAYS = 7;
const FETCH_CONCURRENCY = 4;

export interface IngestOptions {
  /** Batasi jumlah feed per panggilan (untuk lingkungan serverless dengan batas durasi). */
  batchSize?: number;
  /** Indeks batch (0-based) bila batchSize dipakai. */
  batchIndex?: number;
  analyze?: boolean;
}

export interface FullIngestResult extends IngestResult {
  clustered: { assigned: number; created: number; merged: number };
  analyzed: number;
  cleanup: CleanupResult;
}

function extractImage(item: RssItem): string | null {
  if (item.enclosure?.url) return item.enclosure.url;
  const pick = (
    m: RssItem["media:content"]
  ): string | null => {
    if (!m) return null;
    if (Array.isArray(m)) return m[0]?.$?.url ?? null;
    return m.$?.url ?? null;
  };
  const fromMedia = pick(item["media:content"]) ?? pick(item["media:thumbnail"]);
  if (fromMedia) return fromMedia;
  const html = item["content:encoded"] ?? item.content ?? "";
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

function parseDate(item: RssItem): string | null {
  const raw = item.isoDate ?? item.pubDate;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function mapItemToArticle(item: RssItem, feed: FeedRow): NewArticle | null {
  const title = stripHtml(item.title ?? "").trim();
  const link = item.link ?? item.guid;
  if (!title || !link) return null;

  const url = normalizeUrl(link);
  if (!url.startsWith("http")) return null;

  const publishedAt = parseDate(item) ?? new Date().toISOString();
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 3600 * 1000;
  if (new Date(publishedAt).getTime() < cutoff) return null;

  const description = stripHtml(
    item.contentSnippet ?? item["content:encoded"] ?? item.content ?? ""
  ).slice(0, 1500);

  return {
    source_id: feed.source_id,
    feed_id: feed.id,
    guid: item.guid ?? null,
    url,
    url_hash: crypto.createHash("sha1").update(url).digest("hex"),
    title,
    description: description || null,
    image_url: extractImage(item),
    author: item.creator ?? item.author ?? null,
    category: resolveCategory(feed.category, `${title} ${description}`),
    published_at: publishedAt,
    title_tokens: [...tokenize(title)].join(" "),
  };
}

export function makeIngest(deps: {
  feedRepo: FeedRepository;
  articleRepo: ArticleRepository;
  fetcher: FeedFetcher;
  clustering: ClusteringUseCase;
  analysis: AnalysisUseCase;
  cleanup: { run(): Promise<CleanupResult> };
}): { run(options?: IngestOptions): Promise<FullIngestResult> } {
  const { feedRepo, articleRepo, fetcher, clustering, analysis, cleanup } = deps;

  async function fetchOne(feed: FeedRow): Promise<{ added: number; skipped304: boolean; error?: string }> {
    try {
      const result = await fetcher(feed.url, {
        etag: feed.etag,
        lastModified: feed.last_modified,
      });

      if (result.status === 304) {
        await feedRepo.markNotModified(feed.id);
        return { added: 0, skipped304: true };
      }

      let added = 0;
      for (const item of result.items) {
        const article = mapItemToArticle(item, feed);
        if (article) added += await articleRepo.insertIgnore(article);
      }

      await feedRepo.markSuccess(feed.id, { etag: result.etag, lastModified: result.lastModified });
      return { added, skipped304: false };
    } catch (err) {
      await feedRepo.markFailure(feed.id);
      const message = err instanceof Error ? err.message : String(err);
      return { added: 0, skipped304: false, error: `Feed #${feed.id} (${feed.url}): ${message}` };
    }
  }

  return {
    async run(options: IngestOptions = {}): Promise<FullIngestResult> {
      const feeds =
        options.batchSize != null
          ? await feedRepo.listActiveBatch(
              (options.batchIndex ?? 0) * options.batchSize,
              options.batchSize
            )
          : await feedRepo.listActive();

      const result: IngestResult = {
        feedsOk: 0,
        feedsSkipped304: 0,
        feedsFailed: 0,
        articlesNew: 0,
        errors: [],
      };

      for (let i = 0; i < feeds.length; i += FETCH_CONCURRENCY) {
        const batch = feeds.slice(i, i + FETCH_CONCURRENCY);
        const settled = await Promise.all(batch.map(fetchOne));
        for (const r of settled) {
          result.articlesNew += r.added;
          if (r.error) {
            result.feedsFailed++;
            result.errors.push(r.error);
          } else if (r.skipped304) {
            result.feedsSkipped304++;
          } else {
            result.feedsOk++;
          }
        }
      }

      const clusterStats = await clustering.assignNewArticles();
      const merged = await clustering.mergeSimilarStories();
      await clustering.refreshHotScores();

      const cleanupResult = await cleanup.run();

      let analyzed = 0;
      if (options.analyze !== false) {
        analyzed = await analysis.analyzeTopStories(8);
      }

      console.log(
        `[ingest] feed ok=${result.feedsOk} skip304=${result.feedsSkipped304} gagal=${result.feedsFailed} ` +
          `artikel baru=${result.articlesNew} cluster:+${clusterStats.created}/~${clusterStats.assigned}/-${merged} analisis=${analyzed}`
      );

      return {
        ...result,
        clustered: { ...clusterStats, merged },
        analyzed,
        cleanup: cleanupResult,
      };
    },
  };
}
