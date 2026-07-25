// Use case: retensi data — jaga database tetap ramping.

import type { ArticleRepository, AuthRepository, StoryRepository } from "./ports";

export interface CleanupResult {
  articlesDeleted: number;
  orphanStoriesDeleted: number;
  expiredTokens: number;
  expiredSessions: number;
}

export function makeCleanup(deps: {
  articleRepo: ArticleRepository;
  storyRepo: StoryRepository;
  authRepo: AuthRepository;
  articleDays: number;
}): { run(): Promise<CleanupResult> } {
  const { articleRepo, storyRepo, authRepo, articleDays } = deps;

  return {
    async run(): Promise<CleanupResult> {
      const [articlesDeleted, orphanStoriesDeleted, { tokens, sessions }] = await Promise.all([
        articleRepo.deleteOlderThanDays(articleDays),
        storyRepo.deleteOrphans(),
        authRepo.purgeExpired(),
      ]);

      if (articlesDeleted + orphanStoriesDeleted + tokens + sessions > 0) {
        console.log(
          `[cleanup] artikel=${articlesDeleted} story yatim=${orphanStoriesDeleted} token=${tokens} sesi=${sessions}`
        );
      }

      return {
        articlesDeleted,
        orphanStoriesDeleted,
        expiredTokens: tokens,
        expiredSessions: sessions,
      };
    },
  };
}
