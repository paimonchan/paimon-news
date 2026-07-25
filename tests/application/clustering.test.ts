import { describe, expect, it } from "vitest";
import { makeClustering } from "@/application/clustering";
import { tokenize } from "@/domain/text";
import { firstSourceId, makeArticle, makeTestRepos } from "../helpers";

function setup() {
  const repos = makeTestRepos();
  const clustering = makeClustering({
    articleRepo: repos.articleRepo,
    storyRepo: repos.storyRepo,
  });
  return { ...repos, clustering };
}

async function insertSimilarPair(repos: ReturnType<typeof makeTestRepos>) {
  const s1 = await firstSourceId(repos.db);
  const s2 = (
    await repos.db.get<{ id: number }>("SELECT id FROM sources WHERE id != ? LIMIT 1", s1)
  )!;

  const t1 = "Gempa berkekuatan 5,2 mengguncang Aceh pagi ini";
  const t2 = "Gempa 5,2 guncang Aceh pagi ini, warga panik";

  await repos.articleRepo.insertIgnore(
    makeArticle({
      source_id: s1,
      title: t1,
      category: "nasional",
      title_tokens: [...tokenize(t1)].join(" "),
    })
  );
  await repos.articleRepo.insertIgnore(
    makeArticle({
      source_id: s2.id,
      title: t2,
      category: "nasional",
      title_tokens: [...tokenize(t2)].join(" "),
    })
  );
}

describe("clustering", () => {
  it("artikel serupa dari sumber berbeda masuk story yang sama", async () => {
    const repos = setup();
    await insertSimilarPair(repos);

    const stats = await repos.clustering.assignNewArticles();
    expect(stats.created).toBe(1);
    expect(stats.assigned).toBe(1);

    const stories = await repos.storyRepo.findRecent(48);
    expect(stories).toHaveLength(1);
    expect(stories[0].article_count).toBe(2);
    expect(stories[0].source_count).toBe(2);
  });

  it("artikel sangat berbeda membuat story baru", async () => {
    const repos = setup();
    await insertSimilarPair(repos);

    const s1 = await firstSourceId(repos.db);
    const t3 = "Harga saham teknologi anjlok di bursa Amerika";
    await repos.articleRepo.insertIgnore(
      makeArticle({
        source_id: s1,
        title: t3,
        category: "ekonomi",
        title_tokens: [...tokenize(t3)].join(" "),
      })
    );

    await repos.clustering.assignNewArticles();
    const stories = await repos.storyRepo.findRecent(48);
    expect(stories).toHaveLength(2);
  });

  it("hot score story segar lebih tinggi dari story lama", async () => {
    const repos = setup();
    await insertSimilarPair(repos);
    await repos.clustering.assignNewArticles();
    await repos.clustering.refreshHotScores();

    const stories = await repos.storyRepo.findRecent(48);
    expect(stories[0].hot_score).toBeGreaterThan(0);
  });
});
