import type { Queryable } from "@/infrastructure/db/queryable";
import { excerpt } from "@/domain/text";
import type {
  AnalysisRow,
  ArticleRow,
  SourceRow,
  StoryCard,
  StoryRow,
} from "@/domain/entities";

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

export function makeQueries(db: Queryable) {
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

  async function rowToCard(row: StoryRow): Promise<StoryCard> {
    const analysis = await db.get<Pick<AnalysisRow, "neutral_summary">>(
      "SELECT neutral_summary FROM story_analysis WHERE story_id = ?",
      row.id
    );

    const rep = await db.get<{ description: string | null; image_url: string | null }>(
      `SELECT a.description, a.image_url FROM story_articles sa
       JOIN articles a ON a.id = sa.article_id
       WHERE sa.story_id = ?
       ORDER BY (a.image_url IS NOT NULL) DESC, a.published_at DESC
       LIMIT 1`,
      row.id
    );

    return {
      id: row.id,
      title: row.title,
      category: row.category,
      updated_at: row.updated_at,
      article_count: row.article_count,
      source_count: row.source_count,
      hot_score: row.hot_score,
      image_url: rep?.image_url ?? null,
      summary: analysis?.neutral_summary ?? (excerpt(rep?.description, 240) || null),
      sources: await getStorySources(row.id),
    };
  }

  return {
    async getTopStories(page = 1, perPage = PER_PAGE, category?: string) {
      const where = category ? "WHERE s.category = ?" : "";
      const params: unknown[] = category ? [category] : [];

      const totalRow = await db.get<{ c: number }>(
        `SELECT COUNT(*) AS c FROM stories s ${where}`,
        ...params
      );

      const rows = await db.all<StoryRow>(
        `SELECT s.* FROM stories s ${where}
         ORDER BY s.hot_score DESC, s.updated_at DESC
         LIMIT ? OFFSET ?`,
        ...params,
        perPage,
        (page - 1) * perPage
      );

      return { stories: await Promise.all(rows.map(rowToCard)), total: totalRow?.c ?? 0 };
    },

    async getStoryDetail(id: number) {
      const story = await db.get<StoryRow>("SELECT * FROM stories WHERE id = ?", id);
      if (!story) return null;

      const analysis = (await db.get<AnalysisRow>("SELECT * FROM story_analysis WHERE story_id = ?", id)) ?? null;

      const articles = await db.all<
        StoryDetail["articles"][number]
      >(
        `SELECT a.*, s.name AS source_name, s.slug AS source_slug, s.character AS source_character
         FROM story_articles sa
         JOIN articles a ON a.id = sa.article_id
         JOIN sources s ON s.id = a.source_id
         WHERE sa.story_id = ?
         ORDER BY a.published_at DESC`,
        id
      );

      return { story, analysis, articles, sources: await getStorySources(id) };
    },

    async getLatestArticles(page = 1, perPage = PER_PAGE, category?: string) {
      const where = category ? "WHERE a.category = ?" : "";
      const params: unknown[] = category ? [category] : [];

      const totalRow = await db.get<{ c: number }>(
        `SELECT COUNT(*) AS c FROM articles a ${where}`,
        ...params
      );

      const articles = await db.all<LatestArticle>(
        `SELECT a.*, s.name AS source_name, s.slug AS source_slug
         FROM articles a JOIN sources s ON s.id = a.source_id
         ${where}
         ORDER BY a.published_at DESC
         LIMIT ? OFFSET ?`,
        ...params,
        perPage,
        (page - 1) * perPage
      );

      return { articles, total: totalRow?.c ?? 0 };
    },

    async searchAll(q: string, perPage = 30) {
      const escaped = q.replace(/[%_]/g, (m) => `\\${m}`);
      const like = `%${escaped}%`;

      const storyRows = await db.all<StoryRow>(
        `SELECT * FROM stories
         WHERE title LIKE ? ESCAPE '\\'
         ORDER BY hot_score DESC LIMIT 10`,
        like
      );

      const articles = await db.all<LatestArticle>(
        `SELECT a.*, s.name AS source_name, s.slug AS source_slug
         FROM articles a JOIN sources s ON s.id = a.source_id
         WHERE a.title LIKE ? ESCAPE '\\' OR a.description LIKE ? ESCAPE '\\'
         ORDER BY a.published_at DESC LIMIT ?`,
        like,
        like,
        perPage
      );

      return { stories: await Promise.all(storyRows.map(rowToCard)), articles };
    },

    async getDigestStories(limit = 7) {
      const rows = await db.all<StoryRow>(
        `SELECT * FROM stories
         WHERE updated_at >= datetime('now', '-24 hours')
         ORDER BY hot_score DESC LIMIT ?`,
        limit
      );
      return Promise.all(rows.map(rowToCard));
    },

    async getSourcesWithStats() {
      return db.all<SourceWithStats>(
        `SELECT s.*,
           (SELECT COUNT(*) FROM feeds f WHERE f.source_id = s.id AND f.active = 1) AS feed_count,
           (SELECT COUNT(*) FROM feeds f WHERE f.source_id = s.id AND f.error_count > 0) AS feed_errors,
           (SELECT COUNT(*) FROM articles a WHERE a.source_id = s.id) AS article_count,
           (SELECT MAX(f.last_fetched_at) FROM feeds f WHERE f.source_id = s.id) AS last_fetched_at
         FROM sources s
         ORDER BY s.name`
      ) as Promise<SourceWithStats[]>;
    },

    async getBookmarkedStories(userId: number) {
      const rows = await db.all<StoryRow>(
        `SELECT s.* FROM bookmarks b
         JOIN stories s ON s.id = b.story_id
         WHERE b.user_id = ?
         ORDER BY b.created_at DESC`,
        userId
      );
      return Promise.all(rows.map(rowToCard));
    },

    async getRelatedStories(storyId: number, category: string, limit = 4) {
      const rows = await db.all<StoryRow>(
        `SELECT * FROM stories
         WHERE category = ? AND id != ?
         ORDER BY hot_score DESC LIMIT ?`,
        category,
        storyId,
        limit
      );
      return Promise.all(rows.map(rowToCard));
    },

    async getCategoryCounts() {
      return db.all<{ category: string; c: number }>(
        `SELECT category, COUNT(*) AS c FROM stories
         WHERE updated_at >= datetime('now', '-48 hours')
         GROUP BY category`
      );
    },
  };
}

export type Queries = ReturnType<typeof makeQueries>;
