import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContainer } from "@/infrastructure/container";
import { formatWIB, timeAgo } from "@/app/_lib/format";
import { categoryLabel } from "@/domain/categorize";
import type { Perspective } from "@/domain/entities";
import { StoryCard } from "@/components/StoryCard";
import { BookmarkButton } from "@/components/BookmarkButton";
import { SourceAvatar } from "@/components/SourceChip";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = getContainer().queries.getStoryDetail(Number(id));
  if (!detail) return { title: "Peristiwa tidak ditemukan" };
  return {
    title: detail.story.title,
    description: detail.analysis?.neutral_summary ?? undefined,
  };
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const storyId = Number(id);
  if (!Number.isInteger(storyId)) notFound();

  const container = getContainer();
  const detail = container.queries.getStoryDetail(storyId);
  if (!detail) notFound();

  const { story, analysis, articles } = detail;
  const user = await container.session.getSessionUser();
  const bookmarked = user
    ? container.repos.bookmarkRepo.isBookmarked(user.id, storyId)
    : false;

  const perspectives: Perspective[] = analysis?.perspectives_json
    ? (JSON.parse(analysis.perspectives_json) as Perspective[])
    : [];
  const facts: string[] = analysis?.facts_json
    ? (JSON.parse(analysis.facts_json) as string[])
    : [];
  const related = container.queries.getRelatedStories(story.id, story.category);

  // satu artikel terbaru per sumber untuk perbandingan judul
  const perSource = articles.filter(
    (a, i, arr) => arr.findIndex((b) => b.source_slug === a.source_slug) === i
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <nav className="mb-4 text-sm text-stone-500">
        <Link href="/" className="hover:text-amber-700">Beranda</Link>
        <span className="mx-1.5">/</span>
        <Link href={`/kategori/${story.category}`} className="hover:text-amber-700">
          {categoryLabel(story.category)}
        </Link>
      </nav>

      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          {categoryLabel(story.category)}
        </span>
        <span className="text-stone-400">diperbarui {timeAgo(story.updated_at)}</span>
        {analysis?.method === "ai" && (
          <span className="rounded-full border border-violet-300 px-2 py-0.5 text-violet-700 dark:border-violet-800 dark:text-violet-300">
            ✦ Analisis AI
          </span>
        )}
      </div>

      <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
        {story.title}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="text-sm text-stone-500">
          {story.source_count} sumber · {story.article_count} artikel
        </p>
        <BookmarkButton storyId={story.id} bookmarked={bookmarked} back={`/story/${story.id}`} />
      </div>

      {/* Ringkasan netral */}
      {analysis?.neutral_summary && (
        <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-500">
            <span className="text-amber-600">◆</span> Ringkasan netral
          </h2>
          <p className="leading-relaxed text-stone-700 dark:text-stone-200">
            {analysis.neutral_summary}
          </p>

          {facts.length > 0 && (
            <div className="mt-4 border-t border-stone-100 pt-4 dark:border-stone-800">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">
                Fakta yang disepakati banyak sumber
              </h3>
              <ul className="space-y-1.5">
                {facts.map((fact, i) => (
                  <li key={i} className="flex gap-2 text-sm text-stone-600 dark:text-stone-300">
                    <span className="text-emerald-600">✓</span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Perbandingan perspektif */}
      <section className="mt-8">
        <h2 className="mb-1 text-xl font-bold tracking-tight">Sudut pandang tiap sumber</h2>
        <p className="mb-4 text-sm text-stone-500">
          Peristiwa yang sama — penekanan yang berbeda. Klik untuk membaca di sumber asli.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {perspectives.map((p) => (
            <PerspectiveCard key={p.source} perspective={p} />
          ))}
        </div>

        {perspectives.length === 0 && (
          <div className="grid gap-3">
            {perSource.map((a) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-xl border border-stone-200 p-4 hover:border-amber-400 dark:border-stone-800 dark:hover:border-amber-700"
              >
                <SourceAvatar slug={a.source_slug} name={a.source_name} />
                <div>
                  <p className="text-xs font-semibold text-stone-500">{a.source_name}</p>
                  <p className="font-medium leading-snug">{a.title}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Blindspot */}
      {analysis?.blindspot && (
        <section className="mt-8 rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-900 dark:bg-violet-950/30">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
            ⌖ Blindspot — apa yang tidak disinggung sebagian sumber
          </h2>
          <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
            {analysis.blindspot}
          </p>
        </section>
      )}

      {/* Timeline semua artikel */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold tracking-tight">Semua liputan ({articles.length})</h2>
        <div className="space-y-0.5">
          {articles.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-stone-100 dark:hover:bg-stone-900"
            >
              <SourceAvatar slug={a.source_slug} name={a.source_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium group-hover:text-amber-800 dark:group-hover:text-amber-400">
                  {a.title}
                </p>
                <p className="text-xs text-stone-400">
                  {a.source_name} · {formatWIB(a.published_at)}
                </p>
              </div>
              <span className="text-stone-300 group-hover:text-amber-600">↗</span>
            </a>
          ))}
        </div>
      </section>

      {/* Terkait */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-2 text-xl font-bold tracking-tight">Peristiwa terkait</h2>
          {related.map((s) => (
            <StoryCard key={s.id} story={s} />
          ))}
        </section>
      )}
    </div>
  );
}

function PerspectiveCard({ perspective: p }: { perspective: Perspective }) {
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-amber-400 hover:shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:hover:border-amber-700"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-bold">{p.source}</p>
        <span className="text-stone-300 transition group-hover:text-amber-600">↗</span>
      </div>
      {p.character && (
        <p className="mb-2 text-[11px] text-stone-400">{p.character}</p>
      )}
      <p className="mb-2 text-sm font-medium leading-snug text-stone-800 dark:text-stone-100">
        “{p.headline}”
      </p>
      {p.emphasis && (
        <p className="mb-1.5 text-xs text-stone-500">
          <span className="font-semibold text-stone-600 dark:text-stone-300">Menekankan:</span>{" "}
          {p.emphasis}
        </p>
      )}
      {p.framing && (
        <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">{p.framing}</p>
      )}
    </a>
  );
}
