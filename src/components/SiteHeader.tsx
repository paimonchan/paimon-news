import Link from "next/link";
import { getContainer } from "@/infrastructure/container";
import { ThemeToggle } from "./ThemeToggle";

export async function SiteHeader() {
  const user = await getContainer().session.getSessionUser();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-stone-50/90 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-5">
        <Link href="/" className="flex items-baseline gap-1.5 font-bold tracking-tight">
          <span className="text-xl text-amber-700 dark:text-amber-500">Lensa</span>
          <span className="hidden text-[11px] font-normal text-stone-500 sm:inline">
            semua sudut pandang
          </span>
        </Link>

        <nav className="hidden items-center gap-4 text-sm font-medium text-stone-600 dark:text-stone-300 md:flex">
          <Link href="/terkini" className="hover:text-amber-700 dark:hover:text-amber-500">
            Terkini
          </Link>
          <Link href="/kategori/politik" className="hover:text-amber-700 dark:hover:text-amber-500">
            Politik
          </Link>
          <Link href="/kategori/ekonomi" className="hover:text-amber-700 dark:hover:text-amber-500">
            Ekonomi
          </Link>
          <Link href="/kategori/teknologi" className="hover:text-amber-700 dark:hover:text-amber-500">
            Teknologi
          </Link>
          <Link href="/digest" className="hover:text-amber-700 dark:hover:text-amber-500">
            Digest
          </Link>
          <Link href="/sumber" className="hover:text-amber-700 dark:hover:text-amber-500">
            Sumber
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <form action="/cari" method="get" className="hidden sm:block">
            <input
              type="search"
              name="q"
              placeholder="Cari berita…"
              className="h-9 w-40 rounded-full border border-stone-300 bg-white px-3 text-sm outline-none transition focus:w-56 focus:border-amber-600 dark:border-stone-700 dark:bg-stone-900"
            />
          </form>
          <ThemeToggle />
          {user ? (
            <Link
              href="/tersimpan"
              title={`Masuk sebagai ${user.email}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-700 text-xs font-bold text-white"
            >
              {user.email.slice(0, 2).toUpperCase()}
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium hover:bg-stone-200/60 dark:border-stone-700 dark:hover:bg-stone-800"
            >
              Masuk
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
