/**
 * Client-side jump to another tool. The Shell keeps the active tool in sync
 * with /t/<id> and listens for popstate, so we push the URL and notify it.
 */
export function goToTool(id: string): void {
  try {
    window.history.pushState(null, "", `/t/${id}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  } catch {
    window.location.href = `/t/${id}`;
  }
}
