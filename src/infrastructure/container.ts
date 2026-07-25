import { config } from "./config";
import { getDb } from "./db/client";
import { getPg } from "./db/postgres/client";
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
  const db = config.databaseUrl ? getPg() : getDb();

  const feedRepo = makeFeedRepository(db);
  const articleRepo = makeArticleRepository(db);
  const storyRepo = makeStoryRepository(db);
  const analysisRepo = makeAnalysisRepository(db);
  const authRepo = makeAuthRepository(db);
  const bookmarkRepo = makeBookmarkRepository(db);
  const digestRepo = makeDigestRepository(db);

  const mailer = { send: sendMail };
  const aiClient = {
    chatJson,
    configured: () => config.ai.configured,
    model: () => config.ai.model,
  };

  const clustering = makeClustering({ articleRepo, storyRepo });
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
    db,
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

const globalForContainer = globalThis as unknown as { __lensaContainer?: Container };

export function getContainer(): Container {
  if (!globalForContainer.__lensaContainer) {
    globalForContainer.__lensaContainer = build();
  }
  return globalForContainer.__lensaContainer;
}
