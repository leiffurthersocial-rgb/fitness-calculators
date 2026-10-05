import Link from "next/link";
import { TOOL_GROUPS } from "@/lib/tools";

export default function NotFound() {
  const featured = TOOL_GROUPS[0].tools.slice(0, 4);
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-16 sm:px-6">
      <div className="swiss-label flex items-center gap-3 text-accent-600 dark:text-accent-400">
        <span>404</span>
        <span aria-hidden className="h-px flex-1 bg-[var(--line)]" />
      </div>
      <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Page not found</h1>
      <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
        That tool doesn&apos;t exist, or its link has changed. Try one of these instead:
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {featured.map((t) => (
          <Link key={t.id} href={`/t/${t.id}`} className="btn rounded-lg p-4">
            <span className="block font-semibold">{t.name} →</span>
            <span className="mt-0.5 block text-sm text-zinc-600 dark:text-zinc-400">{t.blurb}</span>
          </Link>
        ))}
      </div>
      <Link href="/" className="mt-8 text-sm font-semibold text-accent-600 underline underline-offset-4 dark:text-accent-400">
        Go to the home page
      </Link>
    </main>
  );
}
