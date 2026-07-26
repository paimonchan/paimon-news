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

      // Fast-path: jika belum ada story sama sekali, bulk insert langsung
      if (stories.length === 0) {
        console.log(`[cluster] bulk-assign ${articles.length} artikel ke story baru...`);
        const t0 = Date.now();
        const storyRows = articles.map((a) => ({
          title: a.title,
          category: a.category,
          created_at: a.published_at ?? new Date().toISOString(),
          tokens_json: JSON.stringify(
            Object.fromEntries(
              [...(a.title_tokens ?? "").split(" ").filter(Boolean)].map((t) => [t, 1])
            )
          ),
        }));

        // Bulk insert stories
        const storyIds = await storyRepo.bulkInsert(storyRows);
        const now = new Date().toISOString();

        // Bulk link articles
        await storyRepo.bulkLinkArticles(
          articles.map((a, i) => ({
            story_id: storyIds[i],
            article_id: a.id,
            similarity: 1,
          }))
        );

        // Bulk recount
        await storyRepo.bulkRecount(storyIds);

        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`[cluster] bulk-assign selesai: ${articles.length} story dalam ${elapsed}s`);
        return { assigned: 0, created: articles.length };
      }

      // Inverted index: token -> indeks story (kandidat tanpa O(n*m) penuh)
      const tokenIndex = new Map<string, number[]>();
      stories.forEach((s, i) => {
        for (const t of s.tokenSet) {
          const list = tokenIndex.get(t);
          if (list) list.push(i);
          else tokenIndex.set(t, [i]);
        }
      });

      // Kumpulkan semua hasil matching di memory dulu — DB nanti sekali
      const matchedLinks: { story_id: number; article_id: number; similarity: number }[] = [];
      const storyNewTokens = new Map<number, string>();
      const newArticleItems: { article: (typeof articles)[0]; tokenMap: TokenMap; tokens: Set<string> }[] = [];

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
          matchedLinks.push({ story_id: best.id, article_id: article.id, similarity: Math.min(bestScore, 1) });
          // Merge token in-memory untuk story target
          const base = storyNewTokens.get(best.id) ?? best.tokens_json ?? "{}";
          const newMap = mergeTokens(parseTokenMap(base), tokens);
          const newTokens = JSON.stringify(newMap);
          storyNewTokens.set(best.id, newTokens);
          best.tokens_json = newTokens;
          best.tokenSet = new Set(Object.keys(newMap));
          assigned++;
        } else {
          newArticleItems.push({ article, tokenMap: Object.fromEntries([...tokens].map((t) => [t, 1])), tokens });
          created++;
        }
      }

      // Batch writes — total 5-6 query untuk semua artikel

      // 1. Link artikel yg cocok ke story exist
      if (matchedLinks.length > 0) {
        await storyRepo.bulkLinkArticles(matchedLinks);
      }

      // 2. Update recount + tokens untuk story yg nerima artikel baru
      const affectedStoryIds = [...storyNewTokens.keys()];
      if (affectedStoryIds.length > 0) {
        await storyRepo.bulkRecount(affectedStoryIds);
        await storyRepo.bulkUpdateTokens(
          affectedStoryIds.map((id) => ({ storyId: id, tokensJson: storyNewTokens.get(id)! }))
        );
      }

      // 3. Insert story baru + link artikelnya
      if (newArticleItems.length > 0) {
        const storyRows = newArticleItems.map((na) => ({
          title: na.article.title,
          category: na.article.category,
          created_at: na.article.published_at ?? new Date().toISOString(),
          tokens_json: JSON.stringify(na.tokenMap),
        }));

        const storyIds = await storyRepo.bulkInsert(storyRows);

        await storyRepo.bulkLinkArticles(
          newArticleItems.map((na, i) => ({
            story_id: storyIds[i],
            article_id: na.article.id,
            similarity: 1,
          }))
        );

        await storyRepo.bulkRecount(storyIds);

        // Update in-memory index untuk story baru
        for (let i = 0; i < newArticleItems.length; i++) {
          const na = newArticleItems[i];
          const fresh: StoryWithTokens = {
            id: storyIds[i],
            title: na.article.title,
            category: na.article.category,
            created_at: na.article.published_at ?? new Date().toISOString(),
            updated_at: na.article.published_at ?? new Date().toISOString(),
            article_count: 1,
            source_count: 1,
            hot_score: 0,
            tokens_json: JSON.stringify(na.tokenMap),
            tokenSet: na.tokens,
          };
          const idx = stories.push(fresh) - 1;
          for (const t of na.tokens) {
            const list = tokenIndex.get(t);
            if (list) list.push(idx);
            else tokenIndex.set(t, [idx]);
          }
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

      // Kumpulkan merge plan dulu — semua perbandingan di JS, DB nanti sekali
      const mergePlan: { targetId: number; sourceIds: number[]; mergedTokens: string }[] = [];

      for (let i = 0; i < stories.length; i++) {
        const a = stories[i];
        if (consumed.has(a.id)) continue;

        const candidates = new Set<number>();
        for (const t of a.tokenSet) {
          for (const j of tokenIndex.get(t) ?? []) {
            if (j > i) candidates.add(j);
          }
        }

        const toMerge: number[] = [];
        for (const j of candidates) {
          const b = stories[j];
          if (consumed.has(b.id)) continue;
          const sim = overlapCoefficient(a.tokenSet, b.tokenSet);
          if (sim >= MERGE_THRESHOLD) {
            toMerge.push(b.id);
            consumed.add(b.id);
            merged++;
            const newMap = mergeTokens(parseTokenMap(a.tokens_json), b.tokenSet);
            a.tokens_json = JSON.stringify(newMap);
            a.tokenSet = new Set(Object.keys(newMap));
          }
        }

        if (toMerge.length > 0) {
          mergePlan.push({ targetId: a.id, sourceIds: toMerge, mergedTokens: a.tokens_json ?? "{}" });
          console.log(`[cluster] story #${i} menyerap ${toMerge.length} story lain (total merged=${merged})`);
        }
      }

      // Eksekusi SEMUA merge dalam 4 query — bulKill
      if (mergePlan.length > 0) {
        await storyRepo.bulkMerge(mergePlan);
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
