import Link from "next/link";
import { getContainer } from "@/infrastructure/container";
import { PER_PAGE } from "@/application/queries";
import { StoryCard } from "@/components/StoryCard";
import { CategoryNav } from "@/components/CategoryNav";
import { Pagination } from "@/components/Pagination";
import { SubscribeForm } from "@/components/SubscribeForm";
import { ingestNowAction } from "./actions";
import { categoryLabel } from "@/domain/categorize";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; ingested?: string }>;
}) {
  const { page: pageStr, ingested } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const { queries } = getContainer();
  const { stories, total } = queries.getTopStories(page);
  const categoryCounts = queries.getCategoryCounts();

  const [feature, ...rest] = stories;
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <CategoryNav />

      {ingested && (
        <p className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          ✓ Ingestion selesai — feed diperbarui.
        </p>
      )}

      {stories.length === 0 ? (
        <EmptyState isDev={isDev} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <div>
            {feature && <StoryCard story={feature} feature />}
            <div className="mt-2">
              {rest.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
            <Pagination page={page} total={total} perPage={PER_PAGE} basePath="/" />
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/40">
              <h2 className="font-bold">☕ Digest Pagi</h2>
              <p className="mt-1 mb-3 text-sm text-stone-600 dark:text-stone-300">
                7 peristiwa terpanas tiap pagi, langsung ke email kamu. Netral, tanpa
                noise.
              </p>
              <SubscribeForm back="/" compact />
            </section>

            <section className="rounded-2xl border border-stone-200 p-5 dark:border-stone-800">
              <h2 className="mb-3 font-bold">Peristiwa per kategori</h2>
              <div className="space-y-1.5">
                {categoryCounts
                  .sort((a, b) => b.c - a.c)
                  .slice(0, 8)
                  .map((row) => (
                    <Link
                      key={row.category}
                      href={`/kategori/${row.category}`}
                      className="flex items-center justify-between text-sm hover:text-amber-700 dark:hover:text-amber-400"
                    >
                      <span>{categoryLabel(row.category)}</span>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                        {row.c}
                      </span>
                    </Link>
                  ))}
              </div>
            </section>

            <section className="rounded-2xl border border-stone-200 p-5 text-sm text-stone-600 dark:border-stone-800 dark:text-stone-400">
              <h2 className="mb-2 font-bold text-stone-800 dark:text-stone-100">
                Cara baca Lensa
              </h2>
              <ol className="list-decimal space-y-1.5 pl-4">
                <li>Satu kartu = satu peristiwa dari banyak portal.</li>
                <li>Buka untuk bandingkan judul & framing tiap sumber.</li>
                <li>Ringkasan netral merangkum fakta yang disepakati.</li>
              </ol>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

function EmptyState({ isDev }: { isDev: boolean }) {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <p className="text-5xl">📰</p>
      <h1 className="mt-4 text-2xl font-bold">Feed masih kosong</h1>
      <p className="mt-2 text-stone-500 dark:text-stone-400">
        Lensa sedang mengumpulkan berita dari berbagai sumber. Proses pertama biasanya
        butuh 30–60 detik.
      </p>
      {isDev && (
        <form action={ingestNowAction} className="mt-6">
          <button
            type="submit"
            className="rounded-lg bg-amber-700 px-5 py-2.5 font-semibold text-white hover:bg-amber-800"
          >
            ↻ Ambil berita sekarang
          </button>
        </form>
      )}
    </div>
  );
}
