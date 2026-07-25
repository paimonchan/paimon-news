import { toggleBookmarkAction } from "@/app/actions";

export function BookmarkButton({
  storyId,
  bookmarked,
  back,
}: {
  storyId: number;
  bookmarked: boolean;
  back: string;
}) {
  return (
    <form action={toggleBookmarkAction}>
      <input type="hidden" name="storyId" value={storyId} />
      <input type="hidden" name="back" value={back} />
      <button
        type="submit"
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
          bookmarked
            ? "border-amber-600 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            : "border-stone-300 text-stone-600 hover:bg-stone-200/60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={bookmarked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        {bookmarked ? "Tersimpan" : "Simpan"}
      </button>
    </form>
  );
}
