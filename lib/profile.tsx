"use client";

import { createContext, useContext } from "react";
import { useLocalStorage } from "./useLocalStorage";
import type { UnitSystem } from "./units";

/**
 * The shared user profile. Stored in localStorage so the user never re-enters
 * their stats. All physical quantities are kept in METRIC internally
 * (bodyweight kg, height cm); the unit system only affects display & input.
 */
export interface Profile {
  age: number;
  sex: "male" | "female";
  bodyweightKg: number;
  heightCm: number;
  restingHR: number;
  units: UnitSystem;
}

export const DEFAULT_PROFILE: Profile = {
  age: 30,
  sex: "male",
  bodyweightKg: 75,
  heightCm: 178,
  restingHR: 60,
  units: "metric",
};

interface ProfileCtx {
  profile: Profile;
  setProfile: (p: Profile | ((prev: Profile) => Profile)) => void;
  update: <K extends keyof Profile>(key: K, value: Profile[K]) => void;
  hydrated: boolean;
}

const Ctx = createContext<ProfileCtx | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile, hydrated] = useLocalStorage<Profile>(
    "vital.profile",
    DEFAULT_PROFILE
  );

  const update: ProfileCtx["update"] = (key, value) =>
    setProfile((prev) => ({ ...prev, [key]: value }));

  return (
    <Ctx.Provider value={{ profile, setProfile, update, hydrated }}>
      {children}
    </Ctx.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
