import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { PER_PAGE } from "@/application/queries";
import { formatWIB } from "@/app/_lib/format";
import { Pagination } from "@/components/Pagination";
import { SourceAvatar } from "@/components/SourceChip";
import { CategoryNav } from "@/components/CategoryNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Berita Terkini" };

export default async function TerkiniPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const { articles, total } = await getContainer().queries.getLatestArticles(page);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <CategoryNav />
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Arus Terkini</h1>
      <p className="mb-4 text-sm text-stone-500">
        Semua artikel mentah dari seluruh sumber, diurutkan dari yang terbaru.
      </p>

      {articles.length === 0 ? (
        <p className="py-16 text-center text-stone-500">Belum ada artikel masuk.</p>
      ) : (
        <>
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
          <Pagination page={page} total={total} perPage={PER_PAGE} basePath="/terkini" />
        </>
      )}
    </div>
  );
}
