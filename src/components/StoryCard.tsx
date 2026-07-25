import Link from "next/link";
import { excerpt } from "@/domain/text";
import { timeAgo } from "@/app/_lib/format";
import { categoryLabel } from "@/domain/categorize";
import type { StoryCard as StoryCardType } from "@/domain/entities";
import { SourceAvatar } from "./SourceChip";

export function StoryCard({
  story,
  feature = false,
}: {
  story: StoryCardType;
  feature?: boolean;
}) {
  const shownSources = story.sources.slice(0, 5);
  const extra = story.sources.length - shownSources.length;

  if (feature) {
    return (
      <article className="group overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <Link href={`/story/${story.id}`} className="block">
          {story.image_url && (
            <div className="aspect-[21/9] w-full overflow-hidden bg-stone-200 dark:bg-stone-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={story.image_url}
                alt=""
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />
            </div>
          )}
          <div className="p-5 sm:p-7">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {categoryLabel(story.category)}
              </span>
              <span className="text-stone-400">{timeAgo(story.updated_at)}</span>
            </div>
            <h2 className="text-xl font-bold leading-snug tracking-tight group-hover:text-amber-800 sm:text-2xl dark:group-hover:text-amber-400">
              {story.title}
            </h2>
            {story.summary && (
              <p className="mt-3 leading-relaxed text-stone-600 dark:text-stone-300">
                {excerpt(story.summary, 260)}
              </p>
            )}
            <SourceStrip
              shownSources={shownSources}
              extra={extra}
              sourceCount={story.source_count}
              articleCount={story.article_count}
            />
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className="group border-b border-stone-200 py-4 dark:border-stone-800">
      <Link href={`/story/${story.id}`} className="flex gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-xs">
            <span className="font-semibold text-amber-700 dark:text-amber-500">
              {categoryLabel(story.category)}
            </span>
            <span className="text-stone-400">{timeAgo(story.updated_at)}</span>
          </div>
          <h3 className="font-bold leading-snug tracking-tight group-hover:text-amber-800 dark:group-hover:text-amber-400">
            {story.title}
          </h3>
          {story.summary && (
            <p className="mt-1 line-clamp-2 text-sm text-stone-600 dark:text-stone-400">
              {story.summary}
            </p>
          )}
          <SourceStrip
            shownSources={shownSources}
            extra={extra}
            sourceCount={story.source_count}
            articleCount={story.article_count}
          />
        </div>
        {story.image_url && (
          <div className="hidden h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-stone-200 sm:block dark:bg-stone-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={story.image_url}
              alt=""
              referrerPolicy="no-referrer"
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </Link>
    </article>
  );
}

function SourceStrip({
  shownSources,
  extra,
  sourceCount,
  articleCount,
}: {
  shownSources: { slug: string; name: string }[];
  extra: number;
  sourceCount: number;
  articleCount: number;
}) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <div className="flex -space-x-1.5">
        {shownSources.map((s) => (
          <span key={s.slug} className="rounded-full ring-2 ring-white dark:ring-stone-900">
            <SourceAvatar slug={s.slug} name={s.name} />
          </span>
        ))}
      </div>
      <p className="text-xs text-stone-500 dark:text-stone-400">
        <span className="font-semibold text-stone-700 dark:text-stone-200">
          {sourceCount} sumber
        </span>
        {extra > 0 && ` (+${extra})`} · {articleCount} artikel · bandingkan sudut pandang →
      </p>
    </div>
  );
}
