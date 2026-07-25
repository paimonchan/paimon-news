import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { SubscribeForm } from "@/components/SubscribeForm";
import { StoryCard } from "@/components/StoryCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Digest Harian" };

export default async function DigestPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const stories = getContainer().queries.getDigestStories(7);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/40">
        <h1 className="text-2xl font-bold tracking-tight">☕ Digest Lensa</h1>
        <p className="mt-2 max-w-xl text-stone-600 dark:text-stone-300">
          Setiap pagi, kami kirim 7 peristiwa terpanas 24 jam terakhir — lengkap dengan
          ringkasan netral dan perbandingan sudut pandang. Cukup 5 menit untuk tahu apa
          yang terjadi di Indonesia.
        </p>
        <div className="mt-4 max-w-md">
          <SubscribeForm back="/digest" />
        </div>
        {ok && (
          <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            ✓ Berhasil! Cek email kamu untuk konfirmasi.
          </p>
        )}
        {error === "email" && (
          <p className="mt-3 text-sm font-medium text-red-600">Alamat email tidak valid.</p>
        )}
      </div>

      <h2 className="mb-2 text-lg font-bold tracking-tight">
        Pratinjau digest hari ini
      </h2>
      <p className="mb-4 text-sm text-stone-500">
        Ini yang akan kamu terima besok pagi:
      </p>

      {stories.length === 0 ? (
        <p className="py-12 text-center text-stone-500">
          Belum ada peristiwa dalam 24 jam terakhir.
        </p>
      ) : (
        stories.map((s) => <StoryCard key={s.id} story={s} />)
      )}
    </div>
  );
}
