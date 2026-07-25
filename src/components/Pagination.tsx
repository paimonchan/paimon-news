import Link from "next/link";

export function Pagination({
  page,
  total,
  perPage,
  basePath,
}: {
  page: number;
  total: number;
  perPage: number;
  basePath: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return null;

  const sep = basePath.includes("?") ? "&" : "?";

  return (
    <nav className="mt-8 flex items-center justify-center gap-2 text-sm">
      {page > 1 && (
        <Link
          href={`${basePath}${sep}page=${page - 1}`}
          className="rounded-lg border border-stone-300 px-3 py-1.5 hover:bg-stone-200/60 dark:border-stone-700 dark:hover:bg-stone-800"
        >
          ← Sebelumnya
        </Link>
      )}
      <span className="px-2 text-stone-500">
        {page} / {totalPages}
      </span>
      {page < totalPages && (
        <Link
          href={`${basePath}${sep}page=${page + 1}`}
          className="rounded-lg border border-stone-300 px-3 py-1.5 hover:bg-stone-200/60 dark:border-stone-700 dark:hover:bg-stone-800"
        >
          Berikutnya →
        </Link>
      )}
    </nav>
  );
}
