import type {
  AnalysisRow,
  AnalysisUpsert,
  ArticleRow,
  FeedRow,
  NewArticle,
  StoryRow,
  UserRow,
} from "@/domain/entities";
import type { ChatMessage, AiResult } from "@/infrastructure/ai/client";
import type { FetchFeedResult } from "@/infrastructure/rss/fetcher";
import type { MailOptions } from "@/infrastructure/mail/sender";

export interface FeedRepository {
  listActive(): Promise<FeedRow[]>;
  listActiveBatch(offset: number, limit: number): Promise<FeedRow[]>;
  markSuccess(id: number, conditional: { etag: string | null; lastModified: string | null }): Promise<void>;
  markNotModified(id: number): Promise<void>;
  markFailure(id: number): Promise<void>;
}

export interface ArticleRepository {
  insertIgnore(article: NewArticle): Promise<number>;
  bulkInsertIgnore(articles: NewArticle[]): Promise<number>;
  findUnassignedSince(hoursBack: number): Promise<ArticleRow[]>;
  deleteOlderThanDays(days: number): Promise<number>;
}

export interface StoryInsertRow {
  title: string;
  category: string;
  created_at: string;
  tokens_json: string;
}

export interface StoryArticleLink {
  story_id: number;
  article_id: number;
  similarity: number;
}

export interface StoryRepository {
  findRecent(hoursBack: number): Promise<StoryRow[]>;
  insert(title: string, category: string, at: string, tokensJson: string): Promise<number>;
  bulkInsert(rows: StoryInsertRow[]): Promise<number[]>;
  linkArticle(storyId: number, articleId: number, similarity: number): Promise<void>;
  bulkLinkArticles(links: StoryArticleLink[]): Promise<void>;
  recount(storyId: number): Promise<void>;
  bulkRecount(storyIds: number[]): Promise<void>;
  updateTokens(storyId: number, tokensJson: string): Promise<void>;
  reassignLinks(fromStoryId: number, toStoryId: number): Promise<void>;
  moveAnalysisIfAbsent(fromStoryId: number, toStoryId: number): Promise<void>;
  delete(storyId: number): Promise<void>;
  listForHotRefresh(hoursBack: number): Promise<Pick<StoryRow, "id" | "article_count" | "source_count" | "updated_at">[]>;
  updateHotScore(storyId: number, score: number): Promise<void>;
  bulkRefreshHotScores(hoursBack: number): Promise<number>;
  deleteOrphans(): Promise<number>;
  findById(storyId: number): Promise<StoryRow | undefined>;
}

export interface ArticleWithSource extends ArticleRow {
  source_name: string;
  source_slug: string;
  source_character: string | null;
}

export interface AnalysisRepository {
  get(storyId: number): Promise<AnalysisRow | undefined>;
  upsert(analysis: AnalysisUpsert): Promise<void>;
  findStaleStoryIds(limit: number): Promise<number[]>;
  findArticlesByStory(storyId: number): Promise<ArticleWithSource[]>;
}

export interface AuthRepository {
  countRecentTokens(email: string, withinHours: number): Promise<number>;
  createToken(token: string, email: string, expiresInMinutes: number): Promise<void>;
  consumeTokenAndCreateSession(token: string, sessionToken: string, sessionDays: number): Promise<string | null>;
  findUserBySession(sessionToken: string): Promise<UserRow | null>;
  deleteSession(sessionToken: string): Promise<void>;
  purgeExpired(): Promise<{ tokens: number; sessions: number }>;
}

export interface BookmarkRepository {
  isBookmarked(userId: number, storyId: number): Promise<boolean>;
  toggle(userId: number, storyId: number): Promise<boolean>;
}

export interface DigestRepository {
  upsertSubscription(email: string, userId: number | null, unsubscribeToken: string): Promise<void>;
  deactivateByToken(token: string): Promise<number>;
  listActive(): Promise<{ email: string; unsubscribe_token: string }[]>;
}

export type Mailer = { send(opts: MailOptions): Promise<{ sent: boolean }> };

export type AiClient = {
  chatJson<T>(messages: ChatMessage[]): Promise<AiResult<T> | null>;
  configured(): boolean;
  model(): string;
};

export type FeedFetcher = (
  url: string,
  conditional?: { etag?: string | null; lastModified?: string | null }
) => Promise<FetchFeedResult>;
