import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-stone-200 dark:border-stone-800">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-stone-500 sm:grid-cols-3 dark:text-stone-400">
        <div>
          <p className="mb-2 text-base font-bold text-stone-800 dark:text-stone-100">
            <span className="text-amber-700 dark:text-amber-500">Lensa</span>
          </p>
          <p className="max-w-xs leading-relaxed">
            Gateway berita Indonesia. Satu peristiwa dari banyak portal dibandingkan
            berdampingan — kamu yang menilai.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="mb-1 font-semibold text-stone-700 dark:text-stone-200">Navigasi</p>
          <Link href="/terkini" className="hover:text-amber-700">Berita Terkini</Link>
          <Link href="/digest" className="hover:text-amber-700">Digest Harian</Link>
          <Link href="/sumber" className="hover:text-amber-700">Daftar Sumber</Link>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="mb-1 font-semibold text-stone-700 dark:text-stone-200">Catatan</p>
          <p className="leading-relaxed">
            Semua konten milik penerbit asal. Lensa hanya merangkum dan menautkan ke
            sumber asli.
          </p>
        </div>
      </div>
    </footer>
  );
}
