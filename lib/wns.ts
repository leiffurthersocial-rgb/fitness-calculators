/**
 * lib/wns.ts
 * ----------
 * Chris Beardsley's Weekly Net Stimulus (WNS) model for hypertrophy.
 *
 *   WNS = Σ Workout Hypertrophy Stimulus − Weekly Atrophy Effect
 *       = Σ S(effective sets per workout) − (uncovered time × atrophy rate)
 *
 * - Workout Hypertrophy Stimulus S(n): growth from one workout, in arbitrary
 *   units where one hard set = 1. More sets add stimulus with diminishing
 *   returns (dose-response from Schoenfeld 2017 or Pelland 2024).
 * - Each workout's elevated-growth window lasts the "stimulus duration"
 *   (~36–48 h). Time in the week not covered by any window is atrophy time.
 * - The atrophy rate is calibrated from the maintenance literature: one
 *   workout of ~3 hard sets per week maintains muscle, i.e. its stimulus
 *   exactly cancels the atrophy over the rest of the week.
 * - Effective sets follow Beardsley's stimulating-reps model: a set to
 *   failure yields ~5 stimulating reps, each rep in reserve removes one.
 */

export type WnsCurve = "schoenfeld" | "pelland" | "average";

export const WNS_CURVES: { value: WnsCurve; label: string; note: string }[] = [
  { value: "schoenfeld", label: "Schoenfeld", note: "Steep diminishing returns: 6 sets ≈ 2× one set" },
  { value: "pelland", label: "Pelland", note: "Gentle diminishing returns: 6 sets ≈ 4× one set" },
  { value: "average", label: "Average", note: "Midway between the two datasets" },
];

/** Exponent b in S(n) = n^b, fitted so S(6) = 2 (Schoenfeld) or 4 (Pelland). */
const EXPONENT: Record<"schoenfeld" | "pelland", number> = {
  schoenfeld: Math.log(2) / Math.log(6),
  pelland: Math.log(4) / Math.log(6),
};

/** Stimulating reps in a set taken to failure (Beardsley). */
export const STIMULATING_REPS_AT_FAILURE = 5;

export const HOURS_PER_WEEK = 168;
export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Fraction of a full-stimulus set achieved when stopping `rir` reps short. */
export function setEffectiveness(rir: number): number {
  const r = Math.max(0, rir);
  return Math.max(0, STIMULATING_REPS_AT_FAILURE - r) / STIMULATING_REPS_AT_FAILURE;
}

/** Workout hypertrophy stimulus (arbitrary units, 1 set to failure = 1). */
export function workoutStimulus(effectiveSets: number, curve: WnsCurve = "schoenfeld"): number {
  if (!(effectiveSets > 0)) return 0;
  if (curve === "average") {
    return (workoutStimulus(effectiveSets, "schoenfeld") + workoutStimulus(effectiveSets, "pelland")) / 2;
  }
  // Below one set the stimulus scales linearly (continuous at n = 1).
  if (effectiveSets < 1) return effectiveSets;
  return Math.pow(effectiveSets, EXPONENT[curve]);
}

export interface WnsOptions {
  curve: WnsCurve;
  /** Hours the post-workout growth stimulus lasts (36–48 typical). */
  stimulusHours: number;
  /** Hard sets, once per week, that exactly maintain muscle. */
  maintenanceSets: number;
  /** Average reps in reserve on working sets. */
  rir: number;
}

export const DEFAULT_WNS_OPTIONS: WnsOptions = {
  curve: "schoenfeld",
  stimulusHours: 48,
  maintenanceSets: 3,
  rir: 0,
};

/** Atrophy per hour, calibrated so maintenance volume once a week nets zero. */
export function atrophyRatePerHour(o: Pick<WnsOptions, "curve" | "stimulusHours" | "maintenanceSets">): number {
  const atrophyHours = HOURS_PER_WEEK - clampHours(o.stimulusHours);
  return workoutStimulus(o.maintenanceSets, o.curve) / atrophyHours;
}

function clampHours(h: number): number {
  return Math.min(96, Math.max(12, h || 48));
}

/** Hour-by-hour coverage of the week by post-workout stimulus windows. */
export function coverage(schedule: number[], stimulusHours: number): boolean[] {
  const d = clampHours(stimulusHours);
  const covered = new Array<boolean>(HOURS_PER_WEEK).fill(false);
  schedule.forEach((sets, day) => {
    if (!(sets > 0)) return;
    for (let h = 0; h < d; h++) covered[(day * 24 + h) % HOURS_PER_WEEK] = true;
  });
  return covered;
}

export interface WnsResult {
  /** Weekly net stimulus (arbitrary units). >0 growth, ≈0 maintain, <0 loss. */
  wns: number;
  /** Σ workout hypertrophy stimuli. */
  weeklyStimulus: number;
  /** Atrophy rate × uncovered time. */
  atrophyEffect: number;
  atrophyRatePerDay: number;
  uncoveredHours: number;
  frequency: number;
  totalSets: number;
  totalEffectiveSets: number;
  sessions: { day: number; sets: number; effectiveSets: number; stimulus: number }[];
  /** Covered hours per weekday (0–24), for the timeline. */
  coveredByDay: number[];
}

/** Score a weekly schedule: `schedule[i]` = hard sets for the muscle on day i (Mon = 0). */
export function weeklyNetStimulus(schedule: number[], opts: Partial<WnsOptions> = {}): WnsResult {
  const o = { ...DEFAULT_WNS_OPTIONS, ...opts };
  const eff = setEffectiveness(o.rir);
  const sessions = schedule
    .map((sets, day) => {
      const effectiveSets = Math.max(0, sets) * eff;
      return { day, sets: Math.max(0, sets), effectiveSets, stimulus: workoutStimulus(effectiveSets, o.curve) };
    })
    .filter((s) => s.sets > 0);

  // Only workouts that actually stimulate growth open a stimulus window.
  const cov = coverage(schedule.map((sets) => sets * eff), o.stimulusHours);
  const uncoveredHours = cov.filter((c) => !c).length;
  const rate = atrophyRatePerHour(o);
  const weeklyStimulus = sessions.reduce((a, s) => a + s.stimulus, 0);
  const atrophyEffect = uncoveredHours * rate;

  const coveredByDay = Array.from({ length: 7 }, (_, d) =>
    cov.slice(d * 24, d * 24 + 24).filter(Boolean).length
  );

  return {
    wns: weeklyStimulus - atrophyEffect,
    weeklyStimulus,
    atrophyEffect,
    atrophyRatePerDay: rate * 24,
    uncoveredHours,
    frequency: sessions.length,
    totalSets: sessions.reduce((a, s) => a + s.sets, 0),
    totalEffectiveSets: sessions.reduce((a, s) => a + s.effectiveSets, 0),
    sessions,
    coveredByDay,
  };
}

/** Spread `weeklySets` evenly over `frequency` sessions, spaced across the week. */
export function evenSchedule(weeklySets: number, frequency: number): number[] {
  const f = Math.min(7, Math.max(1, Math.round(frequency)));
  const out = new Array<number>(7).fill(0);
  for (let i = 0; i < f; i++) out[Math.floor((i * 7) / f)] = weeklySets / f;
  return out;
}

export type WnsVerdict = "growth" | "maintenance" | "loss";

/** Within ±0.05 units of zero counts as maintenance. */
export function wnsVerdict(wns: number): WnsVerdict {
  if (wns > 0.05) return "growth";
  if (wns < -0.05) return "loss";
  return "maintenance";
}

/**
 * The calculator form of the model (as on wnscalculator.com): the same
 * effective sets every workout, sessions spread evenly through the week.
 *
 *   WNS = frequency × S(sets per workout) − atrophy days × daily atrophy rate
 *   atrophy days = max(0, 7 − frequency × stimulus duration in days)
 */
export function weeklyNetStimulusSimple(
  frequency: number,
  setsPerSession: number,
  opts: Partial<WnsOptions> = {}
): WnsResult {
  const o = { ...DEFAULT_WNS_OPTIONS, ...opts };
  const f = Math.min(7, Math.max(0, Math.round(frequency)));
  const sets = Math.max(0, setsPerSession);
  const effectiveSets = sets * setEffectiveness(o.rir);
  const stimulus = workoutStimulus(effectiveSets, o.curve);
  const active = f > 0 && stimulus > 0;
  const d = clampHours(o.stimulusHours);

  const uncoveredHours = active ? Math.max(0, HOURS_PER_WEEK - f * d) : HOURS_PER_WEEK;
  const rate = atrophyRatePerHour(o);
  const weeklyStimulus = f * stimulus;
  const atrophyEffect = uncoveredHours * rate;

  // Evenly spaced start hours; windows only overlap once f × d ≥ 168, so the
  // drawn timeline always agrees with the formula above.
  const starts = Array.from({ length: f }, (_, i) => Math.round((i * HOURS_PER_WEEK) / Math.max(1, f)));
  const covered = new Array<boolean>(HOURS_PER_WEEK).fill(false);
  if (active) starts.forEach((s) => { for (let h = 0; h < d; h++) covered[(s + h) % HOURS_PER_WEEK] = true; });

  return {
    wns: weeklyStimulus - atrophyEffect,
    weeklyStimulus,
    atrophyEffect,
    atrophyRatePerDay: rate * 24,
    uncoveredHours,
    frequency: f,
    totalSets: f * sets,
    totalEffectiveSets: f * effectiveSets,
    sessions: starts.map((s) => ({ day: Math.floor(s / 24), sets, effectiveSets, stimulus })),
    coveredByDay: Array.from({ length: 7 }, (_, i) => covered.slice(i * 24, i * 24 + 24).filter(Boolean).length),
  };
}
