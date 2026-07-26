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
import type { Queryable } from "./queryable";

export function makeFeedRepository(db: Queryable): FeedRepository {
  return {
    listActive: () => db.all<FeedRow>("SELECT * FROM feeds WHERE active = 1 ORDER BY id"),

    listActiveBatch: (offset, limit) =>
      db.all<FeedRow>("SELECT * FROM feeds WHERE active = 1 ORDER BY id LIMIT ? OFFSET ?", limit, offset),

    markSuccess: async (id, { etag, lastModified }) => {
      await db.run(
        `UPDATE feeds SET last_fetched_at = datetime('now'), last_status = 200, error_count = 0,
           etag = COALESCE(?, etag), last_modified = COALESCE(?, last_modified)
         WHERE id = ?`,
        etag,
        lastModified,
        id
      );
    },

    markNotModified: async (id) => {
      await db.run(
        "UPDATE feeds SET last_fetched_at = datetime('now'), last_status = 304, error_count = 0 WHERE id = ?",
        id
      );
    },

    markFailure: async (id) => {
      await db.run(
        "UPDATE feeds SET last_fetched_at = datetime('now'), last_status = 500, error_count = error_count + 1 WHERE id = ?",
        id
      );
      await db.run("UPDATE feeds SET active = 0 WHERE id = ? AND error_count >= 10", id);
    },

    bulkMarkSuccess: async (items) => {
      if (items.length === 0) return;
      const ph = items.map(() => "(?::int, ?::text, ?::text)").join(", ");
      const vals = items.flatMap((i) => [i.id, i.etag, i.lastModified]);
      await db.run(
        `UPDATE feeds SET
           last_fetched_at = NOW(), last_status = 200, error_count = 0,
           etag = COALESCE(mp.etag, feeds.etag),
           last_modified = COALESCE(mp.last_modified, feeds.last_modified)
         FROM (VALUES ${ph}) AS mp(id, etag, last_modified)
         WHERE feeds.id = mp.id`,
        ...vals
      );
    },

    bulkMarkNotModified: async (ids) => {
      if (ids.length === 0) return;
      const ph = ids.map(() => "?").join(", ");
      await db.run(
        `UPDATE feeds SET last_fetched_at = NOW(), last_status = 304, error_count = 0 WHERE id IN (${ph})`,
        ...ids
      );
    },

    bulkMarkFailure: async (ids) => {
      if (ids.length === 0) return;
      const ph = ids.map(() => "?").join(", ");
      await db.run(
        `UPDATE feeds SET last_fetched_at = NOW(), last_status = 500, error_count = error_count + 1 WHERE id IN (${ph})`,
        ...ids
      );
      await db.run(
        `UPDATE feeds SET active = 0 WHERE id IN (${ph}) AND error_count >= 10`,
        ...ids
      );
    },
  };
}

export function makeArticleRepository(db: Queryable): ArticleRepository {
  return {
    insertIgnore: async (article: NewArticle) => {
      const result = await db.run(
        `INSERT INTO articles
           (source_id, feed_id, guid, url, url_hash, title, description, image_url, author, category, published_at, title_tokens)
         VALUES
           (@source_id, @feed_id, @guid, @url, @url_hash, @title, @description, @image_url, @author, @category, @published_at, @title_tokens)
         ON CONFLICT(url_hash) DO NOTHING`,
        article
      );
      return result.changes;
    },

    bulkInsertIgnore: async (articles: NewArticle[]) => {
      if (articles.length === 0) return 0;

      const cols = [
        "source_id", "feed_id", "guid", "url", "url_hash",
        "title", "description", "image_url", "author",
        "category", "published_at", "title_tokens",
      ];

      const rows = articles
        .map(() => cols.map(() => "?").join(", "))
        .map((r, i) => (i === 0 ? `(${r})` : `(${r})`))
        .join(", ");

      const params: unknown[] = [];
      for (const a of articles) {
        params.push(
          a.source_id, a.feed_id, a.guid, a.url, a.url_hash,
          a.title, a.description, a.image_url, a.author,
          a.category, a.published_at, a.title_tokens
        );
      }

      const result = await db.run(
        `INSERT INTO articles (${cols.join(", ")})
         VALUES ${rows}
         ON CONFLICT(url_hash) DO NOTHING`,
        ...params
      );
      return result.changes;
    },

    findUnassignedSince: (hoursBack) =>
      db.all<ArticleRow>(
        hoursBack > 0
          ? `SELECT a.* FROM articles a
             LEFT JOIN story_articles sa ON sa.article_id = a.id
             WHERE sa.article_id IS NULL
               AND a.published_at >= datetime('now', '-${Math.floor(hoursBack)} hours')
             ORDER BY a.published_at ASC`
          : `SELECT a.* FROM articles a
             LEFT JOIN story_articles sa ON sa.article_id = a.id
             WHERE sa.article_id IS NULL
             ORDER BY a.published_at ASC`
      ),

    deleteOlderThanDays: async (days) => {
      const result = await db.run(
        `DELETE FROM articles WHERE published_at < datetime('now', '-${Math.floor(days)} days')`
      );
      return result.changes;
    },
  };
}

export function makeStoryRepository(db: Queryable): StoryRepository {
  return {
    findRecent: (hoursBack) =>
      hoursBack > 0
        ? db.all<StoryRow>(
            `SELECT * FROM stories
             WHERE updated_at >= datetime('now', '-${Math.floor(hoursBack)} hours')`
          )
        : db.all<StoryRow>("SELECT * FROM stories"),

    insert: async (title, category, at, tokensJson) => {
      const result = await db.run(
        `INSERT INTO stories (title, category, created_at, updated_at, tokens_json)
         VALUES (?, ?, ?, ?, ?)`,
        title,
        category,
        at,
        at,
        tokensJson
      );
      return result.lastInsertRowid ?? 0;
    },

    bulkInsert: async (rows) => {
      if (rows.length === 0) return [];

      const cols = ["title", "category", "created_at", "updated_at", "tokens_json"];
      const ids: number[] = [];

      // Batch per 500 biar query size gak kebesaran
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const rowsSql = batch.map(() => cols.map(() => "?").join(", ")).join("), (");
        const values: unknown[] = [];
        for (const r of batch) {
          values.push(r.title, r.category, r.created_at, r.created_at, r.tokens_json);
        }
        const result = await db.all<{ id: number }>(
          `INSERT INTO stories (${cols.join(", ")})
           VALUES (${rowsSql})
           RETURNING id`,
          ...values
        );
        for (const r of result) ids.push(r.id);
      }

      return ids;
    },

    linkArticle: async (storyId, articleId, similarity) => {
      await db.run(
        "INSERT OR IGNORE INTO story_articles (story_id, article_id, similarity) VALUES (?, ?, ?)",
        storyId,
        articleId,
        similarity
      );
    },

    bulkLinkArticles: async (links) => {
      if (links.length === 0) return;

      const rows = links.map(() => "(?, ?, ?)").join(", ");
      const values: unknown[] = [];
      for (const l of links) {
        values.push(l.story_id, l.article_id, l.similarity);
      }
      await db.run(
        `INSERT OR IGNORE INTO story_articles (story_id, article_id, similarity)
         VALUES ${rows}`,
        ...values
      );
    },

    bulkRecount: async (storyIds) => {
      if (storyIds.length === 0) return;

      // Update article_count, source_count, updated_at untuk semua story sekaligus
      await db.run(
        `UPDATE stories SET
           article_count = (SELECT COUNT(*) FROM story_articles sa WHERE sa.story_id = stories.id),
           source_count  = (SELECT COUNT(DISTINCT a.source_id) FROM story_articles sa
                            JOIN articles a ON a.id = sa.article_id WHERE sa.story_id = stories.id),
           updated_at    = COALESCE((SELECT MAX(a.published_at) FROM story_articles sa
                            JOIN articles a ON a.id = sa.article_id WHERE sa.story_id = stories.id), updated_at)
         WHERE id IN (${storyIds.map(() => "?").join(", ")})`,
        ...storyIds
      );
    },

    recount: async (storyId) => {
      await db.run(
        `UPDATE stories SET
           article_count = (SELECT COUNT(*) FROM story_articles WHERE story_id = @id),
           source_count  = (SELECT COUNT(DISTINCT a.source_id) FROM story_articles sa
                            JOIN articles a ON a.id = sa.article_id WHERE sa.story_id = @id),
           updated_at    = COALESCE((SELECT MAX(a.published_at) FROM story_articles sa
                            JOIN articles a ON a.id = sa.article_id WHERE sa.story_id = @id), updated_at)
         WHERE id = @id`,
        { id: storyId }
      );
    },

    updateTokens: async (storyId, tokensJson) => {
      await db.run("UPDATE stories SET tokens_json = ? WHERE id = ?", tokensJson, storyId);
    },

    bulkUpdateTokens: async (updates) => {
      if (updates.length === 0) return;
      const caseWhen = updates.map(() => "WHEN ? THEN ?").join(" ");
      const vals = updates.flatMap((u) => [u.storyId, u.tokensJson]);
      const ids = updates.map((u) => u.storyId);
      const ph = ids.map(() => "?").join(", ");
      await db.run(
        `UPDATE stories SET tokens_json = CASE id ${caseWhen} ELSE tokens_json END WHERE id IN (${ph})`,
        ...vals,
        ...ids
      );
    },

    reassignLinks: async (fromStoryId, toStoryId) => {
      // Hapus dulu link yg bentrok, baru pindahkan sisanya
      await db.run(
        "DELETE FROM story_articles WHERE story_id = ? AND article_id IN (SELECT article_id FROM story_articles WHERE story_id = ?)",
        toStoryId,
        fromStoryId
      );
      await db.run(
        "UPDATE story_articles SET story_id = ? WHERE story_id = ?",
        toStoryId,
        fromStoryId
      );
    },

    bulkReassignLinks: async (fromStoryIds, toStoryId) => {
      if (fromStoryIds.length === 0) return;
      const ph = fromStoryIds.map(() => "?").join(", ");
      await db.run(
        `DELETE FROM story_articles WHERE story_id = ? AND article_id IN
         (SELECT article_id FROM story_articles WHERE story_id IN (${ph}))`,
        toStoryId,
        ...fromStoryIds
      );
      await db.run(
        `UPDATE story_articles SET story_id = ? WHERE story_id IN (${ph})`,
        toStoryId,
        ...fromStoryIds
      );
    },

    moveAnalysisIfAbsent: async (fromStoryId, toStoryId) => {
      const has = await db.get<{ story_id: number }>(
        "SELECT story_id FROM story_analysis WHERE story_id = ?",
        toStoryId
      );
      if (!has) {
        await db.run(
          "UPDATE OR IGNORE story_analysis SET story_id = ? WHERE story_id = ?",
          toStoryId,
          fromStoryId
        );
      }
    },

    delete: async (storyId) => {
      await db.run("DELETE FROM stories WHERE id = ?", storyId);
    },

    bulkMerge: async (merges) => {
      if (merges.length === 0) return;

      // Flatten semua (source_id, target_id) pairs
      const pairs: [number, number][] = [];
      for (const m of merges) {
        for (const src of m.sourceIds) pairs.push([src, m.targetId]);
      }
      if (pairs.length === 0) return;

      const allSourceIds = pairs.map((p) => p[0]);
      const allTargetIds = [...new Set(merges.map((m) => m.targetId))];

      // 1. DELETE konflik: hapus link target yg artikelnya udah ada di source
      const pairPh = pairs.map(() => "(?::int, ?::int)").join(", ");
      const pairVals = pairs.flat();

      await db.run(
        `DELETE FROM story_articles sa
         USING (VALUES ${pairPh}) AS mp(source_id, target_id)
         WHERE sa.story_id = mp.target_id
           AND EXISTS (SELECT 1 FROM story_articles sa2 WHERE sa2.story_id = mp.source_id AND sa2.article_id = sa.article_id)`,
        ...pairVals
      );

      // 2. UPDATE reassign: pindahin semua artikel source → target
      await db.run(
        `UPDATE story_articles sa
         SET story_id = mp.target_id
         FROM (VALUES ${pairPh}) AS mp(source_id, target_id)
         WHERE sa.story_id = mp.source_id`,
        ...pairVals
      );

      // 3. UPDATE recount + tokens untuk semua target (CASE untuk tokens yg beda tiap story)
      const caseWhen = merges.map(() => "WHEN ? THEN ?").join(" ");
      const caseVals = merges.flatMap((m) => [m.targetId, m.mergedTokens]);
      const targetPh = allTargetIds.map(() => "?").join(", ");

      await db.run(
        `UPDATE stories SET
           article_count = (SELECT COUNT(*) FROM story_articles WHERE story_id = stories.id),
           source_count  = (SELECT COUNT(DISTINCT a.source_id) FROM story_articles sa
                             JOIN articles a ON a.id = sa.article_id WHERE sa.story_id = stories.id),
           updated_at    = COALESCE((SELECT MAX(a.published_at) FROM story_articles sa
                             JOIN articles a ON a.id = sa.article_id WHERE sa.story_id = stories.id), updated_at),
           tokens_json = CASE id ${caseWhen} ELSE tokens_json END
         WHERE id IN (${targetPh})`,
        ...caseVals,
        ...allTargetIds
      );

      // 4. DELETE semua source story
      const srcPh = allSourceIds.map(() => "?").join(", ");
      await db.run(`DELETE FROM stories WHERE id IN (${srcPh})`, ...allSourceIds);
    },

    bulkDelete: async (storyIds) => {
      if (storyIds.length === 0) return;
      const ph = storyIds.map(() => "?").join(", ");
      await db.run(`DELETE FROM stories WHERE id IN (${ph})`, ...storyIds);
    },

    listForHotRefresh: (hoursBack) =>
      db.all<Pick<StoryRow, "id" | "article_count" | "source_count" | "updated_at">>(
        `SELECT id, article_count, source_count, updated_at FROM stories
         WHERE updated_at >= datetime('now', '-${Math.floor(hoursBack)} hours')`
      ),

    updateHotScore: async (storyId, score) => {
      await db.run("UPDATE stories SET hot_score = ? WHERE id = ?", score, storyId);
    },

    bulkRefreshHotScores: async (hoursBack) => {
      const where = hoursBack > 0 ? `WHERE updated_at >= NOW() - INTERVAL '${Math.floor(hoursBack)} hours'` : "";
      const result = await db.run(
        `UPDATE stories SET hot_score =
           source_count * 3 + article_count * 0.8
           + 8 * EXP(-EXTRACT(EPOCH FROM (NOW() - updated_at)) / 36000)
         ${where}`
      );
      return result.changes;
    },

    deleteOrphans: async () => {
      const result = await db.run(
        `DELETE FROM stories WHERE NOT EXISTS
           (SELECT 1 FROM story_articles sa WHERE sa.story_id = stories.id)`
      );
      return result.changes;
    },

    findById: (storyId) =>
      db.get<StoryRow>("SELECT * FROM stories WHERE id = ?", storyId),
  };
}

export function makeAnalysisRepository(db: Queryable): AnalysisRepository {
  return {
    get: (storyId) =>
      db.get<AnalysisRow>("SELECT * FROM story_analysis WHERE story_id = ?", storyId),

    upsert: async (a: AnalysisUpsert) => {
      await db.run(
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
           generated_at = excluded.generated_at`,
        {
          story_id: a.story_id,
          neutral_summary: a.neutral_summary,
          facts_json: JSON.stringify(a.facts),
          perspectives_json: JSON.stringify(a.perspectives),
          blindspot: a.blindspot,
          method: a.method,
          model: a.model,
          input_tokens: a.input_tokens ?? null,
          output_tokens: a.output_tokens ?? null,
        }
      );
    },

    findStaleStoryIds: async (limit) => {
      const rows = await db.all<{ id: number }>(
        `SELECT s.id FROM stories s
         LEFT JOIN story_analysis an ON an.story_id = s.id
         WHERE s.updated_at >= datetime('now', '-48 hours')
           AND s.article_count >= 2
           AND an.story_id IS NULL
         ORDER BY s.hot_score DESC
         LIMIT ?`,
        limit
      );
      return rows.map((row) => row.id);
    },

    findArticlesByStory: (storyId) =>
      db.all<ArticleWithSource>(
        `SELECT a.*, s.name AS source_name, s.slug AS source_slug, s.character AS source_character
         FROM story_articles sa
         JOIN articles a ON a.id = sa.article_id
         JOIN sources s ON s.id = a.source_id
         WHERE sa.story_id = ?
         ORDER BY a.published_at DESC`,
        storyId
      ),
  };
}

export function makeAuthRepository(db: Queryable): AuthRepository {
  return {
    countRecentTokens: async (email, withinHours) => {
      const row = await db.get<{ c: number }>(
        `SELECT COUNT(*) AS c FROM auth_tokens
         WHERE email = ? AND created_at >= datetime('now', '-${Math.floor(withinHours)} hours')`,
        email
      );
      return row?.c ?? 0;
    },

    createToken: async (token, email, expiresInMinutes) => {
      await db.run(
        "INSERT INTO auth_tokens (token, email, expires_at, created_at) VALUES (?, ?, datetime('now', ?), datetime('now'))",
        token,
        email,
        `+${Math.floor(expiresInMinutes)} minutes`
      );
    },

    consumeTokenAndCreateSession: async (token, sessionToken, sessionDays) => {
      const row = await db.get<{ token: string; email: string }>(
        "SELECT token, email FROM auth_tokens WHERE token = ? AND used = 0 AND expires_at >= datetime('now')",
        token
      );
      if (!row) return null;

      await db.run("UPDATE auth_tokens SET used = 1 WHERE token = ?", token);
      await db.run(
        `INSERT INTO users (email, last_login_at) VALUES (?, datetime('now'))
         ON CONFLICT(email) DO UPDATE SET last_login_at = datetime('now')`,
        row.email
      );
      const user = await db.get<{ id: number }>("SELECT id FROM users WHERE email = ?", row.email);
      if (user) {
        await db.run(
          "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', ?))",
          sessionToken,
          user.id,
          `+${Math.floor(sessionDays)} days`
        );
        return row.email;
      }
      return null;
    },

    findUserBySession: async (sessionToken) => {
      const u = await db.get<UserRow>(
        `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at >= datetime('now')`,
        sessionToken
      );
      return u ?? null;
    },

    deleteSession: async (sessionToken) => {
      await db.run("DELETE FROM sessions WHERE token = ?", sessionToken);
    },

    purgeExpired: async () => {
      const tokens = await db.run(
        "DELETE FROM auth_tokens WHERE expires_at < datetime('now', '-1 day')"
      );
      const sessions = await db.run("DELETE FROM sessions WHERE expires_at < datetime('now')");
      return { tokens: tokens.changes, sessions: sessions.changes };
    },
  };
}

export function makeBookmarkRepository(db: Queryable): BookmarkRepository {
  return {
    isBookmarked: async (userId, storyId) => {
      const row = await db.get<{ 1: number }>(
        "SELECT 1 FROM bookmarks WHERE user_id = ? AND story_id = ?",
        userId,
        storyId
      );
      return Boolean(row);
    },

    toggle: async (userId, storyId) => {
      const existing = await db.get<{ 1: number }>(
        "SELECT 1 FROM bookmarks WHERE user_id = ? AND story_id = ?",
        userId,
        storyId
      );
      if (existing) {
        await db.run("DELETE FROM bookmarks WHERE user_id = ? AND story_id = ?", userId, storyId);
        return false;
      }
      await db.run(
        "INSERT OR IGNORE INTO bookmarks (user_id, story_id) VALUES (?, ?)",
        userId,
        storyId
      );
      return true;
    },
  };
}

export function makeDigestRepository(db: Queryable): DigestRepository {
  return {
    upsertSubscription: async (email, userId, unsubscribeToken) => {
      await db.run(
        `INSERT INTO digest_subscriptions (email, user_id, unsubscribe_token)
         VALUES (?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET active = 1`,
        email,
        userId,
        unsubscribeToken
      );
    },

    deactivateByToken: async (token) => {
      const result = await db.run(
        "UPDATE digest_subscriptions SET active = 0 WHERE unsubscribe_token = ?",
        token
      );
      return result.changes;
    },

    listActive: () =>
      db.all<{ email: string; unsubscribe_token: string }>(
        "SELECT email, unsubscribe_token FROM digest_subscriptions WHERE active = 1"
      ),
  };
}
