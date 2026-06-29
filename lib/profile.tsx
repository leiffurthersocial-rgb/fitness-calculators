"use client";

import { createContext, useContext } from "react";
import { useLocalStorage } from "./useLocalStorage";
import {
  weightFromKg,
  weightToKg,
  lengthFromCm,
  lengthToCm,
  type UnitSystem,
} from "./units";
import type { TrainingLevel } from "./formulas";

/**
 * A small, opt-in shared profile: the stats almost every calculator asks for.
 * Stored once (in metric, like the rest of the app) and persisted to
 * localStorage, so you enter your age/sex/height/weight/body-fat once and every
 * tool auto-fills. Tools that take a *load* (rep-max, plate loading) keep their
 * own inputs — only true personal stats live here.
 */
/** The big-four lifts (kg 1RM) plus max pull-ups (reps). 0 = not entered. */
export interface ProfileLifts {
  squat: number;
  bench: number;
  deadlift: number;
  ohp: number;
  pullups: number;
}

export interface Profile {
  age: number;
  sex: "male" | "female";
  heightCm: number;
  weightKg: number;
  bodyFatPct: number;
  restingHR: number;
  experience: TrainingLevel;
  // Optional performance & health stats (0 = not entered). Stored once and
  // shared by the strength, athlete-score and biological-age tools.
  vo2max: number; // ml/kg/min
  waistCm: number; // for waist-to-height & biological age
  lifts: ProfileLifts;
}

export const DEFAULT_LIFTS: ProfileLifts = {
  squat: 0,
  bench: 0,
  deadlift: 0,
  ohp: 0,
  pullups: 0,
};

export const DEFAULT_PROFILE: Profile = {
  age: 30,
  sex: "male",
  heightCm: 178,
  weightKg: 75,
  bodyFatPct: 15,
  restingHR: 60,
  experience: "intermediate",
  vo2max: 0,
  waistCm: 0,
  lifts: DEFAULT_LIFTS,
};

/**
 * Fill in any keys a stored profile is missing (older saves predate the
 * lifts / VO₂max / waist fields), so consumers always see a complete shape.
 */
function normalizeProfile(raw: Profile): Profile {
  return {
    ...DEFAULT_PROFILE,
    ...raw,
    lifts: { ...DEFAULT_LIFTS, ...(raw?.lifts ?? {}) },
  };
}

interface ProfileCtx {
  profile: Profile;
  /** Merge a partial update into the profile. */
  patch: (p: Partial<Profile>) => void;
  /** Merge a partial update into the saved lifts. */
  patchLifts: (p: Partial<ProfileLifts>) => void;
  hydrated: boolean;
}

const Ctx = createContext<ProfileCtx | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [stored, setProfile, hydrated] = useLocalStorage<Profile>(
    "vital.profile",
    DEFAULT_PROFILE
  );
  const profile = normalizeProfile(stored);
  const patch = (p: Partial<Profile>) => setProfile({ ...profile, ...p });
  const patchLifts = (p: Partial<ProfileLifts>) =>
    setProfile({ ...profile, lifts: { ...profile.lifts, ...p } });
  return (
    <Ctx.Provider value={{ profile, patch, patchLifts, hydrated }}>
      {children}
    </Ctx.Provider>
  );
}

export function useProfile(): ProfileCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}

/**
 * Bodyweight as a [displayValue, setter] pair in the active unit system, so a
 * tool can drop it straight into a NumberInput. Stored internally in kg; we
 * round the display to 0.1 so unit conversions don't show ugly long decimals
 * while still allowing decimal entry.
 */
export function useWeightField(units: UnitSystem): [number, (v: number) => void] {
  const { profile, patch } = useProfile();
  const display = Number(weightFromKg(profile.weightKg, units).toFixed(1));
  return [display, (v: number) => patch({ weightKg: weightToKg(v, units) })];
}

/** Height as a unit-aware [displayValue, setter] pair (see useWeightField). */
export function useHeightField(units: UnitSystem): [number, (v: number) => void] {
  const { profile, patch } = useProfile();
  const display = Number(lengthFromCm(profile.heightCm, units).toFixed(1));
  return [display, (v: number) => patch({ heightCm: lengthToCm(v, units) })];
}
