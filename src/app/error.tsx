"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ui] error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-5xl">⚠️</p>
      <h1 className="mt-4 text-2xl font-bold">Terjadi kesalahan</h1>
      <p className="mt-2 text-stone-500">
        Maaf, ada gangguan saat memuat halaman. Coba muat ulang.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-amber-700 px-5 py-2.5 font-semibold text-white hover:bg-amber-800"
      >
        Muat ulang
      </button>
    </div>
  );
}
