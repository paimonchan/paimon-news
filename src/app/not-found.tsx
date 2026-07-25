import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-5xl">🔍</p>
      <h1 className="mt-4 text-2xl font-bold">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-stone-500">
        Peristiwa ini mungkin sudah lewat dari jendela waktu Lensa.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-amber-700 px-5 py-2.5 font-semibold text-white hover:bg-amber-800"
      >
        Kembali ke beranda
      </Link>
    </div>
  );
}
