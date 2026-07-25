import { describe, expect, it } from "vitest";
import { makeCleanup } from "@/application/cleanup";
import { firstSourceId, makeArticle, makeTestRepos } from "../helpers";

describe("retensi data", () => {
  it("menghapus artikel lebih tua dari batas, menyisakan yang baru", () => {
    const { db, articleRepo, storyRepo, authRepo } = makeTestRepos();
    const sourceId = firstSourceId(db);

    const old = makeArticle({
      source_id: sourceId,
      published_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    });
    const fresh = makeArticle({ source_id: sourceId });
    articleRepo.insertIgnore(old);
    articleRepo.insertIgnore(fresh);

    const cleanup = makeCleanup({ articleRepo, storyRepo, authRepo, articleDays: 30 });
    const result = cleanup.run();

    expect(result.articlesDeleted).toBe(1);
    const remaining = db.prepare("SELECT COUNT(*) AS c FROM articles").get() as { c: number };
    expect(remaining.c).toBe(1);
  });

  it("menghapus story yatim (tanpa artikel)", () => {
    const { db, articleRepo, storyRepo, authRepo } = makeTestRepos();
    const storyId = storyRepo.insert("Story kosong", "umum", new Date().toISOString(), "{}");

    const cleanup = makeCleanup({ articleRepo, storyRepo, authRepo, articleDays: 30 });
    const result = cleanup.run();

    expect(result.orphanStoriesDeleted).toBe(1);
    expect(storyRepo.findById(storyId)).toBeUndefined();
  });

  it("membersihkan token & sesi kedaluwarsa", () => {
    const { db, articleRepo, storyRepo, authRepo } = makeTestRepos();
    db.prepare(
      "INSERT INTO auth_tokens (token, email, expires_at, created_at) VALUES ('t1', 'a@b.id', datetime('now', '-2 days'), datetime('now', '-3 days'))"
    ).run();
    db.prepare(
      "INSERT INTO users (email) VALUES ('a@b.id') ON CONFLICT(email) DO NOTHING"
    ).run();
    const userId = (db.prepare("SELECT id FROM users WHERE email = 'a@b.id'").get() as { id: number }).id;
    db.prepare(
      "INSERT INTO sessions (token, user_id, expires_at) VALUES ('s1', ?, datetime('now', '-1 day'))"
    ).run(userId);

    const cleanup = makeCleanup({ articleRepo, storyRepo, authRepo, articleDays: 30 });
    const result = cleanup.run();

    expect(result.expiredTokens).toBe(1);
    expect(result.expiredSessions).toBe(1);
  });
});
