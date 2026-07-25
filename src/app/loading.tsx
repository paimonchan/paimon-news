export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-6">
      <div className="mb-6 h-9 w-2/3 max-w-md rounded-lg bg-stone-200 dark:bg-stone-800" />
      <div className="mb-4 h-56 rounded-2xl bg-stone-200 dark:bg-stone-800" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="mb-3 space-y-2 border-b border-stone-100 pb-4 dark:border-stone-800">
          <div className="h-4 w-3/4 rounded bg-stone-200 dark:bg-stone-800" />
          <div className="h-3 w-full rounded bg-stone-100 dark:bg-stone-900" />
          <div className="h-3 w-2/3 rounded bg-stone-100 dark:bg-stone-900" />
        </div>
      ))}
    </div>
  );
}
