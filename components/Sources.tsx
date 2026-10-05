import type { Source } from "@/lib/toolContent";

/** Reference list shown under a tool — turns estimates into cited info. */
export default function Sources({ items }: { items?: Source[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="neu rounded-3xl p-5 sm:p-6">
      <h2 className="swiss-label mb-4 flex items-center gap-2 text-zinc-500">
        <span aria-hidden className="h-2 w-2 bg-accent-500" />
        Sources &amp; methods
      </h2>
      <ol className="space-y-2.5">
        {items.map((s, i) => (
          <li key={s.url} className="flex gap-3 text-sm">
            <span className="w-5 shrink-0 tabular-nums text-zinc-400">{String(i + 1).padStart(2, "0")}</span>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-700 underline decoration-accent-500/40 underline-offset-4 hover:decoration-accent-500 dark:text-zinc-200"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
