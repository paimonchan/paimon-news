import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { timeAgo } from "@/app/_lib/format";
import { SourceAvatar } from "@/components/SourceChip";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Daftar Sumber" };

export default async function SumberPage() {
  const sources = await getContainer().queries.getSourcesWithStats();
  const totalArticles = sources.reduce((acc, s) => acc + s.article_count, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Gateway {sources.length} Sumber</h1>
      <p className="mt-1 mb-6 text-sm text-stone-500">
        Lensa memantau {sources.length} portal berita Indonesia secara berkala —{" "}
        {totalArticles.toLocaleString("id-ID")} artikel terkumpul sejauh ini.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {sources.map((s) => (
          <div
            key={s.slug}
            className="flex items-start gap-3 rounded-2xl border border-stone-200 p-4 dark:border-stone-800"
          >
            <SourceAvatar slug={s.slug} name={s.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <a
                  href={s.homepage ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold hover:text-amber-700 dark:hover:text-amber-400"
                >
                  {s.name}
                </a>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    s.feed_errors === 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                  }`}
                >
                  {s.feed_errors === 0 ? "aktif" : `${s.feed_errors} feed bermasalah`}
                </span>
              </div>
              {s.character && <p className="text-xs text-stone-400">{s.character}</p>}
              <p className="mt-1.5 text-xs text-stone-500">
                {s.article_count.toLocaleString("id-ID")} artikel · {s.feed_count} feed
                {s.last_fetched_at && ` · diperbarui ${timeAgo(s.last_fetched_at)}`}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm text-stone-400">
        Ingin menambah sumber?         Edit daftar di{" "}
        <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs dark:bg-stone-800">
          src/infrastructure/db/source-defs.ts
        </code>
        .
      </p>
    </div>
  );
}
