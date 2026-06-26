"use client";

import { createContext, useContext } from "react";
import { useLocalStorage } from "./useLocalStorage";
import type { UnitSystem } from "./units";

/**
 * A single app-wide preference: the unit system. Each calculator is now
 * self-contained (you type your own stats), but units are a display choice
 * that should apply everywhere, so they live in one small persisted context.
 */
interface SettingsCtx {
  units: UnitSystem;
  setUnits: (u: UnitSystem) => void;
  hydrated: boolean;
}

const Ctx = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [units, setUnits, hydrated] = useLocalStorage<UnitSystem>(
    "vital.units",
    "metric"
  );
  return (
    <Ctx.Provider value={{ units, setUnits, hydrated }}>{children}</Ctx.Provider>
  );
}

export function useUnits() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUnits must be used within SettingsProvider");
  return ctx;
}
