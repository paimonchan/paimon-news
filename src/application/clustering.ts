// Use case: clustering artikel → story (peristiwa).
// Algoritma murni di domain/scoring.ts + domain/text.ts; modul ini orkestrasi lewat ports.

import type { ArticleRepository, StoryRepository } from "./ports";
import type { StoryRow } from "@/domain/entities";
import { overlapCoefficient, tokenize } from "@/domain/text";
import {
  ARTICLE_WINDOW_HOURS,
  ATTACH_THRESHOLD,
  MERGE_THRESHOLD,
  SAME_CATEGORY_BONUS,
  STORY_WINDOW_HOURS,
  TokenMap,
  hotScore,
  mergeTokens,
  parseTokenMap,
} from "@/domain/scoring";

interface StoryWithTokens extends StoryRow {
  tokenSet: Set<string>;
}

function withTokens(story: StoryRow): StoryWithTokens {
  const map = parseTokenMap(story.tokens_json);
  return {
    ...story,
    tokenSet: Object.keys(map).length > 0 ? new Set(Object.keys(map)) : tokenize(story.title),
  };
}

export interface ClusteringUseCase {
  assignNewArticles(): Promise<{ assigned: number; created: number }>;
  mergeSimilarStories(): Promise<number>;
  refreshHotScores(): Promise<void>;
}

export function makeClustering(deps: {
  articleRepo: ArticleRepository;
  storyRepo: StoryRepository;
}): ClusteringUseCase {
  const { articleRepo, storyRepo } = deps;

  async function loadRecentStories(): Promise<StoryWithTokens[]> {
    return (await storyRepo.findRecent(STORY_WINDOW_HOURS)).map(withTokens);
  }

  return {
    async assignNewArticles() {
      const articles = await articleRepo.findUnassignedSince(ARTICLE_WINDOW_HOURS);
      if (articles.length === 0) return { assigned: 0, created: 0 };

      const stories = await loadRecentStories();

      // Inverted index: token -> indeks story (kandidat tanpa O(n*m) penuh)
      const tokenIndex = new Map<string, number[]>();
      stories.forEach((s, i) => {
        for (const t of s.tokenSet) {
          const list = tokenIndex.get(t);
          if (list) list.push(i);
          else tokenIndex.set(t, [i]);
        }
      });

      let assigned = 0;
      let created = 0;

      for (const article of articles) {
        const tokens = new Set((article.title_tokens ?? "").split(" ").filter(Boolean));
        if (tokens.size === 0) continue;

        const candidateIdx = new Set<number>();
        for (const t of tokens) {
          for (const i of tokenIndex.get(t) ?? []) candidateIdx.add(i);
        }

        let best: StoryWithTokens | null = null;
        let bestScore = 0;
        for (const i of candidateIdx) {
          const s = stories[i];
          let score = overlapCoefficient(tokens, s.tokenSet);
          if (s.category === article.category) score += SAME_CATEGORY_BONUS;
          if (score > bestScore) {
            bestScore = score;
            best = s;
          }
        }

        if (best && bestScore >= ATTACH_THRESHOLD) {
          await storyRepo.linkArticle(best.id, article.id, Math.min(bestScore, 1));
          await storyRepo.recount(best.id);
          const newMap = mergeTokens(parseTokenMap(best.tokens_json), tokens);
          await storyRepo.updateTokens(best.id, JSON.stringify(newMap));
          best.tokens_json = JSON.stringify(newMap);
          best.tokenSet = new Set(Object.keys(newMap));
          assigned++;
        } else {
          const now = article.published_at ?? new Date().toISOString();
          const tokenMap: TokenMap = Object.fromEntries([...tokens].map((t) => [t, 1]));
          const storyId = await storyRepo.insert(
            article.title,
            article.category,
            now,
            JSON.stringify(tokenMap)
          );
          await storyRepo.linkArticle(storyId, article.id, 1);
          await storyRepo.recount(storyId);

          const fresh: StoryWithTokens = {
            id: storyId,
            title: article.title,
            category: article.category,
            created_at: now,
            updated_at: now,
            article_count: 1,
            source_count: 1,
            hot_score: 0,
            tokens_json: JSON.stringify(tokenMap),
            tokenSet: tokens,
          };
          const idx = stories.push(fresh) - 1;
          for (const t of tokens) {
            const list = tokenIndex.get(t);
            if (list) list.push(idx);
            else tokenIndex.set(t, [idx]);
          }
          created++;
        }
      }

      return { assigned, created };
    },

    async mergeSimilarStories() {
      const stories = (await loadRecentStories()).filter((s) => s.article_count > 0);
      const t0 = Date.now();
      console.log(`[cluster] merge: ${stories.length} stories to compare`);
      let merged = 0;
      const consumed = new Set<number>();

      // Inverted index agar kandidat merge tidak O(n²) penuh
      const tokenIndex = new Map<string, number[]>();
      stories.forEach((s, i) => {
        for (const t of s.tokenSet) {
          const list = tokenIndex.get(t);
          if (list) list.push(i);
          else tokenIndex.set(t, [i]);
        }
      });

      for (let i = 0; i < stories.length; i++) {
        const a = stories[i];
        if (consumed.has(a.id)) continue;

        const candidates = new Set<number>();
        for (const t of a.tokenSet) {
          for (const j of tokenIndex.get(t) ?? []) {
            if (j > i) candidates.add(j);
          }
        }

        let mergedIntoA = 0;
        for (const j of candidates) {
          const b = stories[j];
          if (consumed.has(b.id)) continue;
          const sim = overlapCoefficient(a.tokenSet, b.tokenSet);
          if (sim >= MERGE_THRESHOLD) {
            await storyRepo.reassignLinks(b.id, a.id);
            await storyRepo.moveAnalysisIfAbsent(b.id, a.id);
            await storyRepo.delete(b.id);
            const newMap = mergeTokens(parseTokenMap(a.tokens_json), b.tokenSet);
            await storyRepo.updateTokens(a.id, JSON.stringify(newMap));
            await storyRepo.recount(a.id);
            a.tokens_json = JSON.stringify(newMap);
            a.tokenSet = new Set(Object.keys(newMap));
            consumed.add(b.id);
            merged++;
            mergedIntoA++;
          }
        }
        if (mergedIntoA > 0) {
          console.log(`[cluster] story #${i} menyerap ${mergedIntoA} story lain (total merged=${merged})`);
        }
      }
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`[cluster] merge selesai: ${merged} tergabung dalam ${elapsed}s`);
      return merged;
    },

    async refreshHotScores() {
      const t0 = Date.now();
      const cnt = await storyRepo.bulkRefreshHotScores(72);
      console.log(`[cluster] hot score refresh: ${cnt} story diupdate dalam ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    },
  };
}
