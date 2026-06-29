import type { QA } from "@/lib/toolContent";

/** Short FAQ shown under a tool, also good for search rich-results. */
export default function Faq({ items }: { items?: QA[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="mt-6 border-t border-zinc-100 pt-4 dark:border-zinc-800">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        FAQ
      </h2>
      <dl className="space-y-3">
        {items.map((qa) => (
          <div key={qa.q}>
            <dt className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {qa.q}
            </dt>
            <dd className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {qa.a}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
