import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContainer } from "@/infrastructure/container";
import { PER_PAGE } from "@/application/queries";
import { categoryLabel, isValidCategory } from "@/domain/categorize";
import { StoryCard } from "@/components/StoryCard";
import { CategoryNav } from "@/components/CategoryNav";
import { Pagination } from "@/components/Pagination";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: categoryLabel(slug) };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  if (!isValidCategory(slug)) notFound();

  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const { stories, total } = await getContainer().queries.getTopStories(page, PER_PAGE, slug);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <CategoryNav active={slug} />
      <h1 className="mb-4 text-2xl font-bold tracking-tight">{categoryLabel(slug)}</h1>

      {stories.length === 0 ? (
        <p className="py-16 text-center text-stone-500">
          Belum ada peristiwa di kategori ini. Coba kategori lain atau kembali nanti.
        </p>
      ) : (
        <>
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
          <Pagination
            page={page}
            total={total}
            perPage={PER_PAGE}
            basePath={`/kategori/${slug}`}
          />
        </>
      )}
    </div>
  );
}
