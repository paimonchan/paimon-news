import Link from "next/link";
import { CATEGORIES } from "@/domain/categorize";

export function CategoryNav({ active }: { active?: string }) {
  return (
    <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <NavChip href="/" label="Teratas" active={!active} />
      {CATEGORIES.filter((c) => c.slug !== "umum").map((c) => (
        <NavChip
          key={c.slug}
          href={`/kategori/${c.slug}`}
          label={c.label}
          active={active === c.slug}
        />
      ))}
    </div>
  );
}

function NavChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "border-amber-700 bg-amber-700 text-white"
          : "border-stone-300 text-stone-600 hover:border-amber-600 hover:text-amber-700 dark:border-stone-700 dark:text-stone-300 dark:hover:border-amber-500 dark:hover:text-amber-400"
      }`}
    >
      {label}
    </Link>
  );
}
