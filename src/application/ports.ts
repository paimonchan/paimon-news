// Ports — kontrak antara application layer dan infrastructure.
// Application hanya bergantung pada interface ini, bukan pada SQLite/Resend/OpenAI langsung.

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
  listActive(): FeedRow[];
  listActiveBatch(offset: number, limit: number): FeedRow[];
  markSuccess(id: number, conditional: { etag: string | null; lastModified: string | null }): void;
  markNotModified(id: number): void;
  markFailure(id: number): void;
}

export interface ArticleRepository {
  insertIgnore(article: NewArticle): number;
  findUnassignedSince(hoursBack: number): ArticleRow[];
  deleteOlderThanDays(days: number): number;
}

export interface StoryRepository {
  findRecent(hoursBack: number): StoryRow[];
  insert(title: string, category: string, at: string, tokensJson: string): number;
  linkArticle(storyId: number, articleId: number, similarity: number): void;
  recount(storyId: number): void;
  updateTokens(storyId: number, tokensJson: string): void;
  reassignLinks(fromStoryId: number, toStoryId: number): void;
  moveAnalysisIfAbsent(fromStoryId: number, toStoryId: number): void;
  delete(storyId: number): void;
  listForHotRefresh(hoursBack: number): Pick<StoryRow, "id" | "article_count" | "source_count" | "updated_at">[];
  updateHotScore(storyId: number, score: number): void;
  deleteOrphans(): number;
  findById(storyId: number): StoryRow | undefined;
}

export interface ArticleWithSource extends ArticleRow {
  source_name: string;
  source_slug: string;
  source_character: string | null;
}

export interface AnalysisRepository {
  get(storyId: number): AnalysisRow | undefined;
  upsert(analysis: AnalysisUpsert): void;
  findStaleStoryIds(limit: number): number[];
  findArticlesByStory(storyId: number): ArticleWithSource[];
}

export interface AuthRepository {
  countRecentTokens(email: string, withinHours: number): number;
  createToken(token: string, email: string, expiresInMinutes: number): void;
  /** Atomik: tandai token terpakai + upsert user + buat sesi. Null jika token invalid. */
  consumeTokenAndCreateSession(token: string, sessionToken: string, sessionDays: number): string | null;
  findUserBySession(sessionToken: string): UserRow | null;
  deleteSession(sessionToken: string): void;
  purgeExpired(): { tokens: number; sessions: number };
}

export interface BookmarkRepository {
  isBookmarked(userId: number, storyId: number): boolean;
  /** Toggle; mengembalikan status baru (true = tersimpan). */
  toggle(userId: number, storyId: number): boolean;
}

export interface DigestRepository {
  upsertSubscription(email: string, userId: number | null, unsubscribeToken: string): void;
  deactivateByToken(token: string): number;
  listActive(): { email: string; unsubscribe_token: string }[];
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
