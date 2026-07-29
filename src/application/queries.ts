import type { Queryable } from "@/infrastructure/db/queryable";
import { excerpt } from "@/domain/text";
import type {
  AnalysisRow,
  ArticleRow,
  SourceRow,
  StoryCard,
  StoryRow,
} from "@/domain/entities";
import { cache as reactCache } from "react";
import { unstable_cache as nextCache } from "next/cache";

export const PER_PAGE = 20;

interface StorySourceRow {
  slug: string;
  name: string;
}

export interface LatestArticle extends ArticleRow {
  source_name: string;
  source_slug: string;
}

export interface StoryDetail {
  story: StoryRow;
  analysis: AnalysisRow | null;
  articles: (ArticleRow & {
    source_name: string;
    source_slug: string;
    source_character: string | null;
  })[];
  sources: StorySourceRow[];
}

export interface SourceWithStats extends SourceRow {
  feed_count: number;
  feed_errors: number;
  article_count: number;
  last_fetched_at: string | null;
}

function sqlIn(items: number[]): string {
  return items.map(() => "?").join(",");
}

export function makeQueries(db: Queryable, ftsEnabled = false) {
  /** Batch: ubah banyak StoryRow → StoryCard dalam 2 query, bukan 3×N */
  async function rowsToCards(rows: StoryRow[]): Promise<StoryCard[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);

    // Batch query 1: semua analysis untuk stories ini
    const analyses = await db.all<{ story_id: number; neutral_summary: string }>(
      `SELECT story_id, neutral_summary FROM story_analysis WHERE story_id IN (${sqlIn(ids)})`,
      ...ids
    );
    const analysisMap = new Map(analyses.map((a) => [a.story_id, a.neutral_summary]));

    // Batch query 2: representative article (image + description) per story
    const reps = await db.all<{
      story_id: number;
      image_url: string | null;
      description: string | null;
    }>(
      `SELECT sa.story_id, a.image_url, a.description
       FROM story_articles sa
       JOIN articles a ON a.id = sa.article_id
       WHERE sa.story_id IN (${sqlIn(ids)})
       ORDER BY a.image_url IS NOT NULL DESC, a.published_at DESC`,
      ...ids
    );
    const repMap = new Map<number, { image_url: string | null; description: string | null }>();
    for (const r of reps) {
      if (!repMap.has(r.story_id)) repMap.set(r.story_id, r);
    }

    // Batch query 3: sources per story
    const allSources = await db.all<{ story_id: number; slug: string; name: string }>(
      `SELECT sa.story_id, s.slug, s.name
       FROM story_articles sa
       JOIN articles a ON a.id = sa.article_id
       JOIN sources s ON s.id = a.source_id
       WHERE sa.story_id IN (${sqlIn(ids)})
       ORDER BY s.name`,
      ...ids
    );
    const sourceMap = new Map<number, StorySourceRow[]>();
    for (const s of allSources) {
      if (!sourceMap.has(s.story_id)) sourceMap.set(s.story_id, []);
      sourceMap.get(s.story_id)!.push(s);
    }

    return rows.map((row) => {
      const rep = repMap.get(row.id);
      const summary = analysisMap.get(row.id) ?? null;
      return {
        id: row.id,
        title: row.title,
        category: row.category,
        updated_at: row.updated_at,
        article_count: row.article_count,
        source_count: row.source_count,
        hot_score: row.hot_score,
        image_url: rep?.image_url ?? null,
        summary: summary ?? (excerpt(rep?.description, 240) || null),
        sources: sourceMap.get(row.id) ?? [],
      };
    });
  }

  /** Helper: ambil sources untuk satu story */
  async function getStorySources(storyId: number): Promise<StorySourceRow[]> {
    return db.all<StorySourceRow>(
      `SELECT DISTINCT s.slug, s.name
       FROM story_articles sa
       JOIN articles a ON a.id = sa.article_id
       JOIN sources s ON s.id = a.source_id
       WHERE sa.story_id = ?
       ORDER BY s.name`,
      storyId
    );
  }

  // ── raw query implementations (no cache, no dedup) ──
  const raw = {
    async getTopStories(page = 1, perPage = PER_PAGE, category?: string) {
      const where = category ? "WHERE s.category = ?" : "";
      const params: unknown[] = category ? [category] : [];
      const totalRow = await db.get<{ c: number }>(
        `SELECT COUNT(*) AS c FROM stories s ${where}`, ...params
      );
      const rows = await db.all<StoryRow>(
        `SELECT s.* FROM stories s ${where}
         ORDER BY s.hot_score DESC, s.updated_at DESC
         LIMIT ? OFFSET ?`,
        ...params, perPage, (page - 1) * perPage
      );
      return { stories: await rowsToCards(rows), total: totalRow?.c ?? 0 };
    },

    async getStoryDetail(id: number) {
      const story = await db.get<StoryRow>("SELECT * FROM stories WHERE id = ?", id);
      if (!story) return null;
      const analysis = (await db.get<AnalysisRow>("SELECT * FROM story_analysis WHERE story_id = ?", id)) ?? null;
      const articles = await db.all<StoryDetail["articles"][number]>(
        `SELECT a.*, s.name AS source_name, s.slug AS source_slug, s.character AS source_character
         FROM story_articles sa JOIN articles a ON a.id = sa.article_id
         JOIN sources s ON s.id = a.source_id
         WHERE sa.story_id = ? ORDER BY a.published_at DESC`, id
      );
      return { story, analysis, articles, sources: await getStorySources(id) };
    },

    async getLatestArticles(page = 1, perPage = PER_PAGE, category?: string) {
      const where = category ? "WHERE a.category = ?" : "";
      const params: unknown[] = category ? [category] : [];
      const totalRow = await db.get<{ c: number }>(
        `SELECT COUNT(*) AS c FROM articles a ${where}`, ...params
      );
      const articles = await db.all<LatestArticle>(
        `SELECT a.*, s.name AS source_name, s.slug AS source_slug
         FROM articles a JOIN sources s ON s.id = a.source_id
         ${where} ORDER BY a.published_at DESC LIMIT ? OFFSET ?`,
        ...params, perPage, (page - 1) * perPage
      );
      return { articles, total: totalRow?.c ?? 0 };
    },

    async searchAll(q: string, perPage = 30) {
      if (ftsEnabled) {
        // PostgreSQL tsvector full-text search
        const storyRows = await db.all<StoryRow>(
          `SELECT * FROM stories
           WHERE to_tsvector('indonesian', search_text) @@ plainto_tsquery('indonesian', ?)
           ORDER BY hot_score DESC LIMIT 10`, q
        );
        const articles = await db.all<LatestArticle>(
          `SELECT a.*, s.name AS source_name, s.slug AS source_slug
           FROM articles a JOIN sources s ON s.id = a.source_id
           WHERE to_tsvector('indonesian', a.search_text) @@ plainto_tsquery('indonesian', ?)
           ORDER BY a.published_at DESC LIMIT ?`, q, perPage
        );
        return { stories: await rowsToCards(storyRows), articles };
      }
      // SQLite fallback: LIKE search
      const escaped = q.replace(/[%_]/g, (m) => `\\${m}`);
      const like = `%${escaped}%`;
      const storyRows = await db.all<StoryRow>(
        `SELECT * FROM stories WHERE title LIKE ? ESCAPE '\\' ORDER BY hot_score DESC LIMIT 10`, like
      );
      const articles = await db.all<LatestArticle>(
        `SELECT a.*, s.name AS source_name, s.slug AS source_slug
         FROM articles a JOIN sources s ON s.id = a.source_id
         WHERE a.title LIKE ? ESCAPE '\\' OR a.description LIKE ? ESCAPE '\\'
         ORDER BY a.published_at DESC LIMIT ?`, like, like, perPage
      );
      return { stories: await rowsToCards(storyRows), articles };
    },

    async getDigestStories(limit = 7) {
      const rows = await db.all<StoryRow>(
        `SELECT * FROM stories WHERE updated_at >= datetime('now', '-24 hours')
         ORDER BY hot_score DESC LIMIT ?`, limit
      );
      return rowsToCards(rows);
    },

    async getSourcesWithStats() {
      return db.all<SourceWithStats>(
        `SELECT s.*,
           (SELECT COUNT(*) FROM feeds f WHERE f.source_id = s.id AND f.active = 1) AS feed_count,
           (SELECT COUNT(*) FROM feeds f WHERE f.source_id = s.id AND f.error_count > 0) AS feed_errors,
           (SELECT COUNT(*) FROM articles a WHERE a.source_id = s.id) AS article_count,
           (SELECT MAX(f.last_fetched_at) FROM feeds f WHERE f.source_id = s.id) AS last_fetched_at
         FROM sources s ORDER BY s.name`
      ) as Promise<SourceWithStats[]>;
    },

    async getBookmarkedStories(userId: number) {
      const rows = await db.all<StoryRow>(
        `SELECT s.* FROM bookmarks b JOIN stories s ON s.id = b.story_id
         WHERE b.user_id = ? ORDER BY b.created_at DESC`, userId
      );
      return rowsToCards(rows);
    },

    async getRelatedStories(storyId: number, category: string, limit = 4) {
      const rows = await db.all<StoryRow>(
        `SELECT * FROM stories WHERE category = ? AND id != ?
         ORDER BY hot_score DESC LIMIT ?`, category, storyId, limit
      );
      return rowsToCards(rows);
    },

    async getCategoryCounts() {
      return db.all<{ category: string; c: number }>(
        `SELECT category, COUNT(*) AS c FROM stories
         WHERE updated_at >= datetime('now', '-48 hours') GROUP BY category`
      );
    },
  };

  // ── cached layer: React.cache() for request dedup + nextCache for cross-request persistence ──
  return {
    getTopStories: reactCache(
      nextCache(
        (page = 1, perPage = PER_PAGE, category?: string) => raw.getTopStories(page, perPage, category),
        ['query-top-stories'],
        { revalidate: 300, tags: ['stories'] }
      )
    ),

    getStoryDetail: reactCache(
      nextCache(
        (id: number) => raw.getStoryDetail(id),
        ['query-story-detail'],
        { revalidate: 600, tags: ['stories'] }
      )
    ),

    getLatestArticles: reactCache(
      nextCache(
        (page = 1, perPage = PER_PAGE, category?: string) => raw.getLatestArticles(page, perPage, category),
        ['query-latest-articles'],
        { revalidate: 60, tags: ['articles'] }
      )
    ),

    searchAll: reactCache(
      (q: string, perPage = 30) => raw.searchAll(q, perPage)
    ),

    getDigestStories: reactCache(
      (limit = 7) => raw.getDigestStories(limit)
    ),

    getSourcesWithStats: nextCache(
      () => raw.getSourcesWithStats(),
      ['query-sources'],
      { revalidate: 3600, tags: ['sources'] }
    ),

    getBookmarkedStories: (userId: number) => raw.getBookmarkedStories(userId),

    getRelatedStories: reactCache(
      nextCache(
        (storyId: number, category: string, limit = 4) => raw.getRelatedStories(storyId, category, limit),
        ['query-related-stories'],
        { revalidate: 600, tags: ['stories'] }
      )
    ),

    getCategoryCounts: reactCache(
      nextCache(
        () => raw.getCategoryCounts(),
        ['query-category-counts'],
        { revalidate: 300, tags: ['stories'] }
      )
    ),
  };
}

export type Queries = ReturnType<typeof makeQueries>;
