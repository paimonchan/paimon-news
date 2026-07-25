import type {
  AnalysisRepository,
  ArticleRepository,
  ArticleWithSource,
  AuthRepository,
  BookmarkRepository,
  DigestRepository,
  FeedRepository,
  StoryRepository,
} from "@/application/ports";
import type {
  AnalysisRow,
  AnalysisUpsert,
  ArticleRow,
  FeedRow,
  NewArticle,
  StoryRow,
  UserRow,
} from "@/domain/entities";
import type { Db } from "./client";

export function makeFeedRepository(db: Db): FeedRepository {
  return {
    listActive: () =>
      db.prepare("SELECT * FROM feeds WHERE active = 1 ORDER BY id").all() as FeedRow[],

    listActiveBatch: (offset, limit) =>
      db
        .prepare("SELECT * FROM feeds WHERE active = 1 ORDER BY id LIMIT ? OFFSET ?")
        .all(limit, offset) as FeedRow[],

    markSuccess: (id, { etag, lastModified }) => {
      db.prepare(
        `UPDATE feeds SET last_fetched_at = datetime('now'), last_status = 200, error_count = 0,
           etag = COALESCE(?, etag), last_modified = COALESCE(?, last_modified)
         WHERE id = ?`
      ).run(etag, lastModified, id);
    },

    markNotModified: (id) => {
      db.prepare(
        "UPDATE feeds SET last_fetched_at = datetime('now'), last_status = 304, error_count = 0 WHERE id = ?"
      ).run(id);
    },

    markFailure: (id) => {
      db.prepare(
        "UPDATE feeds SET last_fetched_at = datetime('now'), last_status = 500, error_count = error_count + 1 WHERE id = ?"
      ).run(id);
      db.prepare("UPDATE feeds SET active = 0 WHERE id = ? AND error_count >= 10").run(id);
    },
  };
}

export function makeArticleRepository(db: Db): ArticleRepository {
  const insert = db.prepare(`
    INSERT INTO articles
      (source_id, feed_id, guid, url, url_hash, title, description, image_url, author, category, published_at, title_tokens)
    VALUES
      (@source_id, @feed_id, @guid, @url, @url_hash, @title, @description, @image_url, @author, @category, @published_at, @title_tokens)
    ON CONFLICT(url_hash) DO NOTHING
  `);

  return {
    insertIgnore: (article: NewArticle) => insert.run(article).changes,

    findUnassignedSince: (hoursBack) =>
      db
        .prepare(
          `SELECT a.* FROM articles a
           LEFT JOIN story_articles sa ON sa.article_id = a.id
           WHERE sa.article_id IS NULL
             AND a.published_at >= datetime('now', '-${Math.floor(hoursBack)} hours')
           ORDER BY a.published_at ASC`
        )
        .all() as ArticleRow[],

    deleteOlderThanDays: (days) =>
      db
        .prepare(
          `DELETE FROM articles WHERE published_at < datetime('now', '-${Math.floor(days)} days')`
        )
        .run().changes,
  };
}

export function makeStoryRepository(db: Db): StoryRepository {
  const insertLink = db.prepare(
    "INSERT OR IGNORE INTO story_articles (story_id, article_id, similarity) VALUES (?, ?, ?)"
  );
  const insertStory = db.prepare(
    `INSERT INTO stories (title, category, created_at, updated_at, tokens_json)
     VALUES (?, ?, ?, ?, ?)`
  );
  const updateTokens = db.prepare("UPDATE stories SET tokens_json = ? WHERE id = ?");
  const updateHot = db.prepare("UPDATE stories SET hot_score = ? WHERE id = ?");

  return {
    findRecent: (hoursBack) =>
      db
        .prepare(
          `SELECT * FROM stories
           WHERE updated_at >= datetime('now', '-${Math.floor(hoursBack)} hours')`
        )
        .all() as StoryRow[],

    insert: (title, category, at, tokensJson) =>
      Number(insertStory.run(title, category, at, at, tokensJson).lastInsertRowid),

    linkArticle: (storyId, articleId, similarity) => {
      insertLink.run(storyId, articleId, similarity);
    },

    recount: (storyId) => {
      db.prepare(
        `UPDATE stories SET
           article_count = (SELECT COUNT(*) FROM story_articles WHERE story_id = @id),
           source_count  = (SELECT COUNT(DISTINCT a.source_id) FROM story_articles sa
                            JOIN articles a ON a.id = sa.article_id WHERE sa.story_id = @id),
           updated_at    = COALESCE((SELECT MAX(a.published_at) FROM story_articles sa
                            JOIN articles a ON a.id = sa.article_id WHERE sa.story_id = @id), updated_at)
         WHERE id = @id`
      ).run({ id: storyId });
    },

    updateTokens: (storyId, tokensJson) => updateTokens.run(tokensJson, storyId),

    reassignLinks: (fromStoryId, toStoryId) => {
      db.prepare("UPDATE OR IGNORE story_articles SET story_id = ? WHERE story_id = ?").run(
        toStoryId,
        fromStoryId
      );
      db.prepare("DELETE FROM story_articles WHERE story_id = ?").run(fromStoryId);
    },

    moveAnalysisIfAbsent: (fromStoryId, toStoryId) => {
      const has = db
        .prepare("SELECT story_id FROM story_analysis WHERE story_id = ?")
        .get(toStoryId);
      if (!has) {
        db.prepare(
          "UPDATE OR IGNORE story_analysis SET story_id = ? WHERE story_id = ?"
        ).run(toStoryId, fromStoryId);
      }
    },

    delete: (storyId) => {
      db.prepare("DELETE FROM stories WHERE id = ?").run(storyId);
    },

    listForHotRefresh: (hoursBack) =>
      db
        .prepare(
          `SELECT id, article_count, source_count, updated_at FROM stories
           WHERE updated_at >= datetime('now', '-${Math.floor(hoursBack)} hours')`
        )
        .all() as Pick<StoryRow, "id" | "article_count" | "source_count" | "updated_at">[],

    updateHotScore: (storyId, score) => updateHot.run(score, storyId),

    deleteOrphans: () =>
      db
        .prepare(
          `DELETE FROM stories WHERE NOT EXISTS
             (SELECT 1 FROM story_articles sa WHERE sa.story_id = stories.id)`
        )
        .run().changes,

    findById: (storyId) =>
      db.prepare("SELECT * FROM stories WHERE id = ?").get(storyId) as StoryRow | undefined,
  };
}

export function makeAnalysisRepository(db: Db): AnalysisRepository {
  return {
    get: (storyId) =>
      db.prepare("SELECT * FROM story_analysis WHERE story_id = ?").get(storyId) as
        | AnalysisRow
        | undefined,

    upsert: (a: AnalysisUpsert) => {
      db.prepare(
        `INSERT INTO story_analysis
           (story_id, neutral_summary, facts_json, perspectives_json, blindspot, method, model, input_tokens, output_tokens, generated_at)
         VALUES (@story_id, @neutral_summary, @facts_json, @perspectives_json, @blindspot, @method, @model, @input_tokens, @output_tokens, datetime('now'))
         ON CONFLICT(story_id) DO UPDATE SET
           neutral_summary = excluded.neutral_summary,
           facts_json = excluded.facts_json,
           perspectives_json = excluded.perspectives_json,
           blindspot = excluded.blindspot,
           method = excluded.method,
           model = excluded.model,
           input_tokens = excluded.input_tokens,
           output_tokens = excluded.output_tokens,
           generated_at = excluded.generated_at`
      ).run({
        story_id: a.story_id,
        neutral_summary: a.neutral_summary,
        facts_json: JSON.stringify(a.facts),
        perspectives_json: JSON.stringify(a.perspectives),
        blindspot: a.blindspot,
        method: a.method,
        model: a.model,
        input_tokens: a.input_tokens ?? null,
        output_tokens: a.output_tokens ?? null,
      });
    },

    findStaleStoryIds: (limit) =>
      (
        db
          .prepare(
            `SELECT s.id FROM stories s
             LEFT JOIN story_analysis an ON an.story_id = s.id
             WHERE s.updated_at >= datetime('now', '-48 hours')
               AND s.article_count >= 1
               AND (an.story_id IS NULL OR an.generated_at <= datetime('now', '-6 hours'))
             ORDER BY s.hot_score DESC
             LIMIT ?`
          )
          .all(limit) as { id: number }[]
      ).map((row) => row.id),

    findArticlesByStory: (storyId) =>
      db
        .prepare(
          `SELECT a.*, s.name AS source_name, s.slug AS source_slug, s.character AS source_character
           FROM story_articles sa
           JOIN articles a ON a.id = sa.article_id
           JOIN sources s ON s.id = a.source_id
           WHERE sa.story_id = ?
           ORDER BY a.published_at DESC`
        )
        .all(storyId) as ArticleWithSource[],
  };
}

export function makeAuthRepository(db: Db): AuthRepository {
  return {
    countRecentTokens: (email, withinHours) =>
      (
        db
          .prepare(
            `SELECT COUNT(*) AS c FROM auth_tokens
             WHERE email = ? AND created_at >= datetime('now', '-${Math.floor(withinHours)} hours')`
          )
          .get(email) as { c: number }
      ).c,

    createToken: (token, email, expiresInMinutes) => {
      db.prepare(
        "INSERT INTO auth_tokens (token, email, expires_at, created_at) VALUES (?, ?, datetime('now', ?), datetime('now'))"
      ).run(token, email, `+${Math.floor(expiresInMinutes)} minutes`);
    },

    consumeTokenAndCreateSession: (token, sessionToken, sessionDays) => {
      let email: string | null = null;
      const tx = db.transaction(() => {
        const row = db
          .prepare(
            "SELECT token, email FROM auth_tokens WHERE token = ? AND used = 0 AND expires_at >= datetime('now')"
          )
          .get(token) as { token: string; email: string } | undefined;
        if (!row) return;

        db.prepare("UPDATE auth_tokens SET used = 1 WHERE token = ?").run(token);
        db.prepare(
          `INSERT INTO users (email, last_login_at) VALUES (?, datetime('now'))
           ON CONFLICT(email) DO UPDATE SET last_login_at = datetime('now')`
        ).run(row.email);
        const user = db.prepare("SELECT id FROM users WHERE email = ?").get(row.email) as {
          id: number;
        };
        db.prepare(
          "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', ?))"
        ).run(sessionToken, user.id, `+${Math.floor(sessionDays)} days`);
        email = row.email;
      });
      tx();
      return email;
    },

    findUserBySession: (sessionToken) =>
      db
        .prepare(
          `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
           WHERE s.token = ? AND s.expires_at >= datetime('now')`
        )
        .get(sessionToken) as UserRow | null ?? null,

    deleteSession: (sessionToken) => {
      db.prepare("DELETE FROM sessions WHERE token = ?").run(sessionToken);
    },

    purgeExpired: () => {
      const tokens = db
        .prepare("DELETE FROM auth_tokens WHERE expires_at < datetime('now', '-1 day')")
        .run().changes;
      const sessions = db
        .prepare("DELETE FROM sessions WHERE expires_at < datetime('now')")
        .run().changes;
      return { tokens, sessions };
    },
  };
}

export function makeBookmarkRepository(db: Db): BookmarkRepository {
  return {
    isBookmarked: (userId, storyId) =>
      Boolean(
        db
          .prepare("SELECT 1 FROM bookmarks WHERE user_id = ? AND story_id = ?")
          .get(userId, storyId)
      ),

    toggle: (userId, storyId) => {
      const existing = db
        .prepare("SELECT 1 FROM bookmarks WHERE user_id = ? AND story_id = ?")
        .get(userId, storyId);
      if (existing) {
        db.prepare("DELETE FROM bookmarks WHERE user_id = ? AND story_id = ?").run(
          userId,
          storyId
        );
        return false;
      }
      db.prepare("INSERT OR IGNORE INTO bookmarks (user_id, story_id) VALUES (?, ?)").run(
        userId,
        storyId
      );
      return true;
    },
  };
}

export function makeDigestRepository(db: Db): DigestRepository {
  return {
    upsertSubscription: (email, userId, unsubscribeToken) => {
      db.prepare(
        `INSERT INTO digest_subscriptions (email, user_id, unsubscribe_token)
         VALUES (?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET active = 1`
      ).run(email, userId, unsubscribeToken);
    },

    deactivateByToken: (token) =>
      db
        .prepare("UPDATE digest_subscriptions SET active = 0 WHERE unsubscribe_token = ?")
        .run(token).changes,

    listActive: () =>
      db
        .prepare(
          "SELECT email, unsubscribe_token FROM digest_subscriptions WHERE active = 1"
        )
        .all() as { email: string; unsubscribe_token: string }[],
  };
}
