// Read model — query khusus kebutuhan UI (sisi baca CQRS pragmatis).
// Sengaja melewati repository: query di sini sangat spesifik tampilan dan hanya-baca.

import type { Db } from "@/infrastructure/db/client";
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

export function makeQueries(db: Db) {
  function getStorySources(storyId: number): StorySourceRow[] {
    return db
      .prepare(
        `SELECT DISTINCT s.slug, s.name
         FROM story_articles sa
         JOIN articles a ON a.id = sa.article_id
         JOIN sources s ON s.id = a.source_id
         WHERE sa.story_id = ?
         ORDER BY s.name`
      )
      .all(storyId) as StorySourceRow[];
  }

  function rowToCard(row: StoryRow): StoryCard {
    const analysis = db
      .prepare("SELECT neutral_summary FROM story_analysis WHERE story_id = ?")
      .get(row.id) as Pick<AnalysisRow, "neutral_summary"> | undefined;

    const rep = db
      .prepare(
        `SELECT a.description, a.image_url FROM story_articles sa
         JOIN articles a ON a.id = sa.article_id
         WHERE sa.story_id = ?
         ORDER BY (a.image_url IS NOT NULL) DESC, a.published_at DESC
         LIMIT 1`
      )
      .get(row.id) as { description: string | null; image_url: string | null } | undefined;

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
      sources: getStorySources(row.id),
    };
  }

  return {
    getTopStories(page = 1, perPage = PER_PAGE, category?: string) {
      const where = category ? "WHERE s.category = ?" : "";
      const params = category ? [category] : [];

      const total = (
        db.prepare(`SELECT COUNT(*) AS c FROM stories s ${where}`).get(...params) as {
          c: number;
        }
      ).c;

      const rows = db
        .prepare(
          `SELECT s.* FROM stories s ${where}
           ORDER BY s.hot_score DESC, s.updated_at DESC
           LIMIT ? OFFSET ?`
        )
        .all(...params, perPage, (page - 1) * perPage) as StoryRow[];

      return { stories: rows.map(rowToCard), total };
    },

    getStoryDetail(id: number): StoryDetail | null {
      const story = db.prepare("SELECT * FROM stories WHERE id = ?").get(id) as
        | StoryRow
        | undefined;
      if (!story) return null;

      const analysis =
        (db.prepare("SELECT * FROM story_analysis WHERE story_id = ?").get(id) as
          | AnalysisRow
          | undefined) ?? null;

      const articles = db
        .prepare(
          `SELECT a.*, s.name AS source_name, s.slug AS source_slug, s.character AS source_character
           FROM story_articles sa
           JOIN articles a ON a.id = sa.article_id
           JOIN sources s ON s.id = a.source_id
           WHERE sa.story_id = ?
           ORDER BY a.published_at DESC`
        )
        .all(id) as StoryDetail["articles"];

      return { story, analysis, articles, sources: getStorySources(id) };
    },

    getLatestArticles(page = 1, perPage = PER_PAGE, category?: string) {
      const where = category ? "WHERE a.category = ?" : "";
      const params = category ? [category] : [];

      const total = (
        db.prepare(`SELECT COUNT(*) AS c FROM articles a ${where}`).get(...params) as {
          c: number;
      }
      ).c;

      const articles = db
        .prepare(
          `SELECT a.*, s.name AS source_name, s.slug AS source_slug
           FROM articles a JOIN sources s ON s.id = a.source_id
           ${where}
           ORDER BY a.published_at DESC
           LIMIT ? OFFSET ?`
        )
        .all(...params, perPage, (page - 1) * perPage) as LatestArticle[];

      return { articles, total };
    },

    searchAll(q: string, perPage = 30) {
      const escaped = q.replace(/[%_]/g, (m) => `\\${m}`);
      const like = `%${escaped}%`;

      const storyRows = db
        .prepare(
          `SELECT * FROM stories
           WHERE title LIKE ? ESCAPE '\\'
           ORDER BY hot_score DESC LIMIT 10`
        )
        .all(like) as StoryRow[];

      const articles = db
        .prepare(
          `SELECT a.*, s.name AS source_name, s.slug AS source_slug
           FROM articles a JOIN sources s ON s.id = a.source_id
           WHERE a.title LIKE ? ESCAPE '\\' OR a.description LIKE ? ESCAPE '\\'
           ORDER BY a.published_at DESC LIMIT ?`
        )
        .all(like, like, perPage) as LatestArticle[];

      return { stories: storyRows.map(rowToCard), articles };
    },

    getDigestStories(limit = 7): StoryCard[] {
      const rows = db
        .prepare(
          `SELECT * FROM stories
           WHERE updated_at >= datetime('now', '-24 hours')
           ORDER BY hot_score DESC LIMIT ?`
        )
        .all(limit) as StoryRow[];
      return rows.map(rowToCard);
    },

    getSourcesWithStats(): SourceWithStats[] {
      return db
        .prepare(
          `SELECT s.*,
             (SELECT COUNT(*) FROM feeds f WHERE f.source_id = s.id AND f.active = 1) AS feed_count,
             (SELECT COUNT(*) FROM feeds f WHERE f.source_id = s.id AND f.error_count > 0) AS feed_errors,
             (SELECT COUNT(*) FROM articles a WHERE a.source_id = s.id) AS article_count,
             (SELECT MAX(f.last_fetched_at) FROM feeds f WHERE f.source_id = s.id) AS last_fetched_at
           FROM sources s
           ORDER BY s.name`
        )
        .all() as SourceWithStats[];
    },

    getBookmarkedStories(userId: number): StoryCard[] {
      const rows = db
        .prepare(
          `SELECT s.* FROM bookmarks b
           JOIN stories s ON s.id = b.story_id
           WHERE b.user_id = ?
           ORDER BY b.created_at DESC`
        )
        .all(userId) as StoryRow[];
      return rows.map(rowToCard);
    },

    getRelatedStories(storyId: number, category: string, limit = 4): StoryCard[] {
      const rows = db
        .prepare(
          `SELECT * FROM stories
           WHERE category = ? AND id != ?
           ORDER BY hot_score DESC LIMIT ?`
        )
        .all(category, storyId, limit) as StoryRow[];
      return rows.map(rowToCard);
    },

    getCategoryCounts(): { category: string; c: number }[] {
      return db
        .prepare(
          `SELECT category, COUNT(*) AS c FROM stories
           WHERE updated_at >= datetime('now', '-48 hours')
           GROUP BY category`
        )
        .all() as { category: string; c: number }[];
    },
  };
}

export type Queries = ReturnType<typeof makeQueries>;
