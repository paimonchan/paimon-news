import { initials, sourceHue } from "@/app/_lib/format";

export function SourceAvatar({ slug, name }: { slug: string; name: string }) {
  const hue = sourceHue(slug);
  return (
    <span
      title={name}
      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ backgroundColor: `hsl(${hue} 55% 42%)` }}
    >
      {initials(name)}
    </span>
  );
}

export function SourceChip({ slug, name }: { slug: string; name: string }) {
  const hue = sourceHue(slug);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
      style={{
        borderColor: `hsl(${hue} 40% 70%)`,
        color: `hsl(${hue} 50% 32%)`,
        backgroundColor: `hsl(${hue} 60% 96%)`,
      }}
    >
      {name}
    </span>
  );
}
