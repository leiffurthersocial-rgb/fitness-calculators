import type { Source } from "@/lib/toolContent";

/** Reference list shown under a tool — turns estimates into cited info. */
export default function Sources({ items }: { items?: Source[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="mt-8 border-t border-zinc-100 pt-4 dark:border-zinc-800">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Sources &amp; methods
      </h2>
      <ul className="space-y-1">
        {items.map((s) => (
          <li key={s.url} className="text-sm">
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-600 hover:underline dark:text-accent-400"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
