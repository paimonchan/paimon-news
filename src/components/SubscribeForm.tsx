import { subscribeDigestAction } from "@/app/actions";

export function SubscribeForm({ back = "/digest", compact = false }: { back?: string; compact?: boolean }) {
  return (
    <form
      action={subscribeDigestAction}
      className={compact ? "flex gap-2" : "flex flex-col gap-2 sm:flex-row"}
    >
      <input type="hidden" name="back" value={back} />
      <input
        type="email"
        name="email"
        required
        placeholder="alamat@email.com"
        className="h-10 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 text-sm outline-none focus:border-amber-600 dark:border-stone-700 dark:bg-stone-900"
      />
      <button
        type="submit"
        className="h-10 shrink-0 whitespace-nowrap rounded-lg bg-amber-700 px-4 text-sm font-semibold text-white transition hover:bg-amber-800"
      >
        {compact ? "Langganan" : "Langganan Digest"}
      </button>
    </form>
  );
}
