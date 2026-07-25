import { openDb } from "@/infrastructure/db/client";
import {
  makeAnalysisRepository,
  makeArticleRepository,
  makeAuthRepository,
  makeBookmarkRepository,
  makeDigestRepository,
  makeFeedRepository,
  makeStoryRepository,
} from "@/infrastructure/db/repositories";
import type { NewArticle } from "@/domain/entities";
import crypto from "node:crypto";

export function makeTestRepos() {
  const db = openDb(":memory:");
  return {
    db,
    feedRepo: makeFeedRepository(db),
    articleRepo: makeArticleRepository(db),
    storyRepo: makeStoryRepository(db),
    analysisRepo: makeAnalysisRepository(db),
    authRepo: makeAuthRepository(db),
    bookmarkRepo: makeBookmarkRepository(db),
    digestRepo: makeDigestRepository(db),
  };
}

export async function firstSourceId(db: ReturnType<typeof openDb>): Promise<number> {
  const row = await db.get<{ id: number }>("SELECT id FROM sources ORDER BY id LIMIT 1");
  return row!.id;
}

export function makeArticle(overrides: Partial<NewArticle> & { source_id: number }): NewArticle {
  const url = overrides.url ?? `https://contoh.id/berita/${crypto.randomUUID()}`;
  return {
    feed_id: null,
    guid: null,
    url,
    url_hash: crypto.createHash("sha1").update(url).digest("hex"),
    title: overrides.title ?? "Judul berita uji",
    description: overrides.description ?? null,
    image_url: null,
    author: null,
    category: overrides.category ?? "umum",
    published_at: overrides.published_at ?? new Date().toISOString(),
    title_tokens: overrides.title_tokens ?? "",
    ...overrides,
  };
}

export function makeMailerSpy() {
  const sent: { to: string; subject: string }[] = [];
  return {
    sent,
    send: async (opts: { to: string; subject: string }) => {
      sent.push({ to: opts.to, subject: opts.subject });
      return { sent: true };
    },
  };
}
