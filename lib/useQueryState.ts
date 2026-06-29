"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Mirror a small set of a tool's inputs into the URL query string so the
 * current link reproduces the setup (e.g. /t/diet-planner?goal=lose&pace=fast).
 * Reads any present params once on mount (avoiding a hydration mismatch by
 * seeding from defaults first), then writes via history.replaceState — no
 * navigation, no scroll jump. Profile stats are deliberately NOT routed here,
 * so a shared link never overwrites the viewer's saved profile.
 */
export function useQueryState<T extends Record<string, string | number>>(
  defaults: T
): [T, (patch: Partial<T>) => void] {
  const [state, setState] = useState<T>(defaults);
  const keys = useRef(Object.keys(defaults));

  // Hydrate from the URL once on mount.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const out = { ...defaults };
    let changed = false;
    for (const k of keys.current) {
      const v = sp.get(k);
      if (v != null && v !== "") {
        (out as Record<string, string | number>)[k] =
          typeof defaults[k] === "number" ? Number(v) : v;
        changed = true;
      }
    }
    if (changed) setState(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (p: Partial<T>) => {
    setState((prev) => {
      const next = { ...prev, ...p };
      const sp = new URLSearchParams(window.location.search);
      for (const k of keys.current) {
        sp.set(k, String((next as Record<string, string | number>)[k]));
      }
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}?${sp.toString()}`
      );
      return next;
    });
  };

  return [state, patch];
}
