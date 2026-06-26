/**
 * lib/defaults.ts
 * ---------------
 * Sensible starting values for the per-tool inputs. With the shared profile
 * gone, each calculator seeds its own fields from these constants (all metric;
 * convert for display via lib/units.ts).
 */
export const DEFAULTS = {
  age: 30,
  sex: "male" as "male" | "female",
  bodyweightKg: 75,
  heightCm: 178,
  restingHR: 60,
};
