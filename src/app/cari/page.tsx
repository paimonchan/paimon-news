import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { formatWIB } from "@/app/_lib/format";
import { StoryCard } from "@/components/StoryCard";
import { SourceAvatar } from "@/components/SourceChip";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Cari" };

export default async function CariPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const { stories, articles } = query
    ? await getContainer().queries.searchAll(query)
    : { stories: [], articles: [] };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Cari</h1>
      <form action="/cari" method="get" className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Ketik kata kunci… mis. rupiah, pilkada, AI"
          autoFocus
          className="h-11 w-full rounded-xl border border-stone-300 bg-white px-4 outline-none focus:border-amber-600 dark:border-stone-700 dark:bg-stone-900"
        />
      </form>

      {query && (
        <p className="mb-4 text-sm text-stone-500">
          {stories.length + articles.length} hasil untuk “{query}”
        </p>
      )}

      {stories.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">
            Peristiwa
          </h2>
          {stories.map((s) => (
            <StoryCard key={s.id} story={s} />
          ))}
        </section>
      )}

      {articles.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">
            Artikel
          </h2>
          <div className="divide-y divide-stone-200 dark:divide-stone-800">
            {articles.map((a) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 py-3"
              >
                <SourceAvatar slug={a.source_slug} name={a.source_name} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug group-hover:text-amber-800 dark:group-hover:text-amber-400">
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
      )}

      {query && stories.length === 0 && articles.length === 0 && (
        <p className="py-16 text-center text-stone-500">
          Tidak ada hasil untuk “{query}”. Coba kata kunci lain.
        </p>
      )}
    </div>
  );
}
