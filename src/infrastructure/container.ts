// Composition root — satu-satunya tempat semua dependency dirangkai.
// App layer (pages/routes/actions) mengimpor use case dari sini, bukan dari infra langsung.

import { config } from "./config";
import { getDb } from "./db/client";
import {
  makeAnalysisRepository,
  makeArticleRepository,
  makeAuthRepository,
  makeBookmarkRepository,
  makeDigestRepository,
  makeFeedRepository,
  makeStoryRepository,
} from "./db/repositories";
import { makeClustering } from "@/application/clustering";
import { makeAnalysis } from "@/application/analysis";
import { makeCleanup } from "@/application/cleanup";
import { makeIngest } from "@/application/ingest";
import { makeAuth } from "@/application/auth";
import { makeDigest } from "@/application/digest";
import { makeQueries } from "@/application/queries";
import { makeSessionService } from "./auth/next-session";
import { chatJson } from "./ai/client";
import { fetchFeed } from "./rss/fetcher";
import { sendMail } from "./mail/sender";

function build() {
  const db = getDb();

  // repositories (infrastructure)
  const feedRepo = makeFeedRepository(db);
  const articleRepo = makeArticleRepository(db);
  const storyRepo = makeStoryRepository(db);
  const analysisRepo = makeAnalysisRepository(db);
  const authRepo = makeAuthRepository(db);
  const bookmarkRepo = makeBookmarkRepository(db);
  const digestRepo = makeDigestRepository(db);

  // ports → implementasi
  const mailer = { send: sendMail };
  const aiClient = {
    chatJson,
    configured: () => config.ai.configured,
    model: () => config.ai.model,
  };

  // use cases (application)
  const transact = (fn: () => void) => db.transaction(fn)();
  const clustering = makeClustering({ articleRepo, storyRepo, transact });
  const analysis = makeAnalysis({ analysisRepo, storyRepo, ai: aiClient });
  const cleanup = makeCleanup({
    articleRepo,
    storyRepo,
    authRepo,
    articleDays: config.retention.articleDays,
  });
  const ingest = makeIngest({
    feedRepo,
    articleRepo,
    fetcher: fetchFeed,
    clustering,
    analysis,
    cleanup,
  });
  const auth = makeAuth({ authRepo, mailer, baseUrl: config.baseUrl });
  const queries = makeQueries(db);
  const digest = makeDigest({
    digestRepo,
    mailer,
    baseUrl: config.baseUrl,
    getDigestStories: queries.getDigestStories,
  });
  const session = makeSessionService(authRepo, auth.sessionDays);

  return {
    ingest,
    clustering,
    analysis,
    cleanup,
    auth,
    digest,
    session,
    queries,
    repos: { bookmarkRepo, digestRepo },
  };
}

export type Container = ReturnType<typeof build>;

// Singleton per proses (aman untuk hot-reload via globalThis).
const globalForContainer = globalThis as unknown as { __lensaContainer?: Container };

export function getContainer(): Container {
  if (!globalForContainer.__lensaContainer) {
    globalForContainer.__lensaContainer = build();
  }
  return globalForContainer.__lensaContainer;
}
