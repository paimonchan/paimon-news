import { describe, expect, it } from "vitest";
import { makeCleanup } from "@/application/cleanup";
import { firstSourceId, makeArticle, makeTestRepos } from "../helpers";

describe("retensi data", () => {
  it("menghapus artikel lebih tua dari batas, menyisakan yang baru", async () => {
    const { db, articleRepo, storyRepo, authRepo } = makeTestRepos();
    const sourceId = await firstSourceId(db);

    const old = makeArticle({
      source_id: sourceId,
      published_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    });
    const fresh = makeArticle({ source_id: sourceId });
    await articleRepo.insertIgnore(old);
    await articleRepo.insertIgnore(fresh);

    const cleanup = makeCleanup({ articleRepo, storyRepo, authRepo, articleDays: 30 });
    const result = await cleanup.run();

    expect(result.articlesDeleted).toBe(1);
    const remaining = await db.get<{ c: number }>("SELECT COUNT(*) AS c FROM articles");
    expect(remaining?.c).toBe(1);
  });

  it("menghapus story yatim (tanpa artikel)", async () => {
    const { db, articleRepo, storyRepo, authRepo } = makeTestRepos();
    const storyId = await storyRepo.insert("Story kosong", "umum", new Date().toISOString(), "{}");

    const cleanup = makeCleanup({ articleRepo, storyRepo, authRepo, articleDays: 30 });
    const result = await cleanup.run();

    expect(result.orphanStoriesDeleted).toBe(1);
    expect(await storyRepo.findById(storyId)).toBeUndefined();
  });

  it("membersihkan token & sesi kedaluwarsa", async () => {
    const { db, articleRepo, storyRepo, authRepo } = makeTestRepos();
    await db.run(
      "INSERT INTO auth_tokens (token, email, expires_at, created_at) VALUES ('t1', 'a@b.id', datetime('now', '-2 days'), datetime('now', '-3 days'))"
    );
    await db.run(
      "INSERT INTO users (email) VALUES ('a@b.id') ON CONFLICT(email) DO NOTHING"
    );
    const user = await db.get<{ id: number }>("SELECT id FROM users WHERE email = 'a@b.id'");
    await db.run(
      "INSERT INTO sessions (token, user_id, expires_at) VALUES ('s1', ?, datetime('now', '-1 day'))",
      user!.id
    );

    const cleanup = makeCleanup({ articleRepo, storyRepo, authRepo, articleDays: 30 });
    const result = await cleanup.run();

    expect(result.expiredTokens).toBe(1);
    expect(result.expiredSessions).toBe(1);
  });
});
