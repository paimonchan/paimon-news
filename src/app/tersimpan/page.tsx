import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getContainer } from "@/infrastructure/container";
import { StoryCard } from "@/components/StoryCard";
import { logoutAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Tersimpan" };

export default async function TersimpanPage() {
  const container = getContainer();
  const user = await container.session.getSessionUser();
  if (!user) redirect("/login");

  const stories = await container.queries.getBookmarkedStories(user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tersimpan</h1>
          <p className="text-sm text-stone-500">{user.email}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-200/60 dark:border-stone-700 dark:hover:bg-stone-800"
          >
            Keluar
          </button>
        </form>
      </div>

      {stories.length === 0 ? (
        <p className="py-16 text-center text-stone-500">
          Belum ada peristiwa tersimpan. Tekan tombol “Simpan” di halaman peristiwa.
        </p>
      ) : (
        stories.map((s) => <StoryCard key={s.id} story={s} />)
      )}
    </div>
  );
}
