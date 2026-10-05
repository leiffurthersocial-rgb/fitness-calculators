import type { QA } from "@/lib/toolContent";

/** Short FAQ shown under a tool, also good for search rich-results. */
export default function Faq({ items }: { items?: QA[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="neu rounded-3xl p-5 sm:p-6">
      <h2 className="swiss-label mb-4 flex items-center gap-2 text-zinc-500">
        <span aria-hidden className="h-2 w-2 bg-accent-500" />
        FAQ
      </h2>
      <dl className="divide-y divide-zinc-300/70 dark:divide-zinc-700/70">
        {items.map((qa) => (
          <div key={qa.q} className="py-3 first:pt-0 last:pb-0">
            <dt className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{qa.q}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{qa.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
