/**
 * lib/hub.ts
 * ----------
 * The Hypertrophy Hub's forecasting layer. Pure functions that combine the
 * profile, a lift log, a rated routine and a nutrition plan into:
 *
 *  - lift estimates (e1RM, strength level) and progression forecasts,
 *  - a per-muscle physique forecast ("biceps under-trained", "chest on track"),
 *  - balance insights (push/pull, upper/lower) and overall projections.
 *
 * Everything here is an estimate built on group averages; individual response
 * to training varies a lot (some people gain 2–3× the average, some little).
 */

import {
  classifyLift,
  e1rmFromSet,
  ffmi,
  ffmiCategory,
  liftStandards,
  type Lift,
  type TrainingLevel,
} from "./formulas";
import { EXERCISE_BY_ID, MUSCLES, MUSCLE_BY_ID, bestExercisesFor, type MuscleId } from "./exercises";
import type { RoutineRating } from "./routine";
import type { PhysiqueGoal, PhysiquePlan } from "./physique";

/* ---- Lift log ---- */

export interface LiftEntry {
  id: string;
  exerciseId: string;
  /** Load in kg (for pull-ups/chin-ups/dips: added weight). */
  weightKg: number;
  reps: number;
  rir: number;
}

/** Exercises we can rank against strength standards, as a share of a base lift's 1RM. */
const STANDARD_MAP: Record<string, { base: Exclude<Lift, "pullup">; scale: number }> = {
  "bench-press": { base: "bench", scale: 1 },
  "smith-bench": { base: "bench", scale: 1 },
  "incline-bench": { base: "bench", scale: 0.85 },
  "close-grip-bench": { base: "bench", scale: 0.9 },
  "db-bench": { base: "bench", scale: 0.38 }, // per dumbbell
  "incline-db": { base: "bench", scale: 0.33 }, // per dumbbell
  squat: { base: "squat", scale: 1 },
  "front-squat": { base: "squat", scale: 0.82 },
  deadlift: { base: "deadlift", scale: 1 },
  rdl: { base: "deadlift", scale: 0.75 },
  sldl: { base: "deadlift", scale: 0.72 },
  "hip-thrust": { base: "deadlift", scale: 1 },
  ohp: { base: "ohp", scale: 1 },
  "db-shoulder-press": { base: "ohp", scale: 0.42 }, // per dumbbell
  "barbell-row": { base: "bench", scale: 0.85 },
  "pendlay-row": { base: "bench", scale: 0.8 },
  "barbell-curl": { base: "bench", scale: 0.5 },
  "ez-curl": { base: "bench", scale: 0.5 },
  skullcrusher: { base: "bench", scale: 0.4 },
};

/** Exercises where the logged weight is added to bodyweight. */
const BODYWEIGHT_LIFTS = new Set(["pull-up", "chin-up", "dips", "triceps-dip"]);

/** Common lifts offered first in the hub's lift picker. */
export const FEATURED_LIFTS = [
  "bench-press", "squat", "deadlift", "ohp", "incline-db", "pull-up", "barbell-row",
  "rdl", "hip-thrust", "lat-pulldown", "barbell-curl", "leg-press",
];

export interface LiftEstimate {
  entry: LiftEntry;
  name: string;
  /** Estimated 1RM of the logged load (kg). For bodyweight lifts: added load. */
  e1rm: number;
  level: string | null;
  percentile: number | null;
  /** 1RM (same basis as e1rm) at months 0, 1, 2, … horizon. */
  forecast: number[];
  /** Plain-language next-session target (double progression). */
  next: string;
}

const MONTHLY_RATE: Record<TrainingLevel, number> = { beginner: 0.04, intermediate: 0.012, advanced: 0.005 };
const GOAL_RATE: Record<PhysiqueGoal, number> = { build: 1, recomp: 0.7, cut: 0.35 };
/** Without standards, assume this much headroom above the current e1RM. */
const HEADROOM: Record<TrainingLevel, number> = { beginner: 1.9, intermediate: 1.45, advanced: 1.15 };

export interface HubContext {
  sex: "male" | "female";
  age: number;
  weightKg: number;
  heightCm: number;
  bodyFatPct: number;
  level: TrainingLevel;
  goal: PhysiqueGoal;
  /** Rated routine (evidence mode) or null if none is selected. */
  rating: RoutineRating | null;
}

/** How well the routine trains an exercise's prime movers (0.3–1). */
function trainingFactor(exerciseId: string, rating: RoutineRating | null): number {
  if (!rating) return 0.75;
  const prime = Object.entries(EXERCISE_BY_ID[exerciseId]?.muscles ?? {})
    .filter(([, c]) => c === 1)
    .map(([m]) => rating.muscles.find((x) => x.muscle === m)?.score ?? 0);
  if (prime.length === 0) return 0.75;
  const avg = prime.reduce((a, b) => a + b, 0) / prime.length;
  return Math.min(1, Math.max(0.3, avg / 85));
}

export function estimateLift(entry: LiftEntry, ctx: HubContext, horizonMonths: number): LiftEstimate {
  const ex = EXERCISE_BY_ID[entry.exerciseId];
  const bodyweight = BODYWEIGHT_LIFTS.has(entry.exerciseId);
  // Bodyweight lifts: estimate on total load, report the added load.
  const total = e1rmFromSet(entry.weightKg + (bodyweight ? ctx.weightKg : 0), entry.reps, entry.rir);
  const e1rm = bodyweight ? total - ctx.weightKg : total;

  const std = STANDARD_MAP[entry.exerciseId];
  let level: string | null = null;
  let percentile: number | null = null;
  let ceiling = total * HEADROOM[ctx.level];
  if (std && total > 0) {
    const c = classifyLift(total / std.scale, std.base, ctx.sex, ctx.weightKg, ctx.age);
    level = c.level;
    percentile = Math.round(c.percentile);
    const elite = liftStandards(std.base, ctx.sex, ctx.weightKg, ctx.age)[4].value * std.scale;
    ceiling = Math.max(elite * 1.05, total * 1.05);
  }

  // Approach the ceiling exponentially; the starting monthly gain is set by
  // training age, how well the routine trains this lift's muscles, and the diet.
  const rate = MONTHLY_RATE[ctx.level] * trainingFactor(entry.exerciseId, ctx.rating) * GOAL_RATE[ctx.goal];
  const gap = Math.max(1e-6, ceiling - total);
  const k = Math.min(0.5, (rate * total) / gap);
  const forecast = Array.from({ length: horizonMonths + 1 }, (_, m) => {
    const t = ceiling - gap * Math.exp(-k * m);
    return bodyweight ? t - ctx.weightKg : t;
  });

  let next: string;
  if (entry.rir >= 3) next = "Take sets closer to failure (0–2 reps in reserve) before adding load";
  else if (entry.reps < 12) next = `Same load for ${entry.reps + 1} reps, then add load`;
  else next = `Add ~2.5% load and drop back to ${Math.max(6, entry.reps - 4)} reps`;

  return { entry, name: ex?.name ?? "Unknown exercise", e1rm, level, percentile, forecast, next };
}

/* ---- Physique forecast ---- */

/** Approximate share of total skeletal muscle mass per group (relative weights). */
const MUSCLE_MASS_SHARE: Record<MuscleId, number> = {
  quads: 0.14, hamstrings: 0.07, glutes: 0.1, adductors: 0.05, calves: 0.05,
  chest: 0.055, "upper-chest": 0.025, lats: 0.07, "upper-back": 0.055, traps: 0.03, "lower-back": 0.04,
  "front-delts": 0.02, "side-delts": 0.025, "rear-delts": 0.015,
  biceps: 0.03, triceps: 0.04, forearms: 0.03, abs: 0.03, obliques: 0.02,
};
/** Skeletal muscle as a share of lean (fat-free) mass. */
const SKELETAL_SHARE_OF_LEAN = 0.52;
/** Share of lean-mass gain that is contractile muscle (the rest: water, glycogen, connective tissue). */
const MUSCLE_SHARE_OF_LEAN_GAIN = 0.6;

export type MuscleVerdict = "under-trained" | "lagging" | "on-track" | "growing-fast" | "strong-point" | "skipped";

export interface MuscleForecast {
  muscle: MuscleId;
  name: string;
  verdict: MuscleVerdict;
  /** Routine score (0–100) or null without a routine. */
  trainingScore: number | null;
  /** Strength-based development percentile from logged lifts, if any. */
  currentPercentile: number | null;
  /** Projected increase in this muscle's mass over the horizon (%). */
  growthPct: number;
  gainKg: number;
  note: string;
}

export interface PhysiqueForecast {
  months: number;
  leanGainKg: number;
  /** Lean gain if training were optimal for every muscle. */
  potentialLeanGainKg: number;
  trainingQuality: number;
  now: { weightKg: number; bodyFatPct: number; ffmi: number; ffmiLabel: string };
  then: { weightKg: number; bodyFatPct: number; ffmi: number; ffmiLabel: string };
  muscles: MuscleForecast[];
  insights: string[];
}

/** Strength percentile per muscle, from the lifts that train it (prime movers count double). */
export function developmentFromLifts(lifts: LiftEstimate[]): Partial<Record<MuscleId, number>> {
  const acc: Partial<Record<MuscleId, { sum: number; w: number }>> = {};
  for (const l of lifts) {
    if (l.percentile == null) continue;
    for (const [m, c] of Object.entries(EXERCISE_BY_ID[l.entry.exerciseId]?.muscles ?? {}) as [MuscleId, number][]) {
      const w = c === 1 ? 2 : 1;
      const a = (acc[m] ??= { sum: 0, w: 0 });
      a.sum += l.percentile * w;
      a.w += w;
    }
  }
  return Object.fromEntries(Object.entries(acc).map(([m, a]) => [m, a!.sum / a!.w])) as Partial<Record<MuscleId, number>>;
}

const PUSH: MuscleId[] = ["chest", "upper-chest", "front-delts", "triceps"];
const PULL: MuscleId[] = ["lats", "upper-back", "rear-delts", "biceps"];
const LOWER: MuscleId[] = ["quads", "hamstrings", "glutes", "adductors", "calves"];

export function forecastPhysique(args: {
  ctx: HubContext;
  plan: PhysiquePlan;
  months: number;
  lifts: LiftEstimate[];
}): PhysiqueForecast {
  const { ctx, plan, months, lifts } = args;
  const rating = ctx.rating;
  const end = plan.trajectory[plan.trajectory.length - 1];
  const potential = end.leanKg - plan.trajectory[0].leanKg;

  // Training quality per muscle: the routine's evidence score, or "average" with no routine.
  const score = (m: MuscleId) => (rating ? rating.muscles.find((x) => x.muscle === m)?.scoreEvidence ?? 0 : 70);
  const priority = (m: MuscleId) => rating?.muscles.find((x) => x.muscle === m)?.priority ?? "normal";
  const shareSum = MUSCLES.reduce((a, m) => a + MUSCLE_MASS_SHARE[m.id], 0);
  const quality = MUSCLES.reduce((a, m) => a + MUSCLE_MASS_SHARE[m.id] * (score(m.id) / 100), 0) / shareSum;
  // Without a stimulus there's no growth: scale the diet model's gain by training quality.
  const leanGain = potential > 0 ? potential * quality : potential;

  const leanNow = ctx.weightKg * (1 - ctx.bodyFatPct / 100);
  const muscleMass = leanNow * SKELETAL_SHARE_OF_LEAN;
  const dev = developmentFromLifts(lifts);
  const devValues = Object.values(dev) as number[];
  const devMean = devValues.length ? devValues.reduce((a, b) => a + b, 0) / devValues.length : null;

  const raw = MUSCLES.map((m) => {
    const share = MUSCLE_MASS_SHARE[m.id] / shareSum;
    const s = score(m.id);
    const gainKg =
      leanGain > 0
        ? (leanGain * share * (s / 100)) / (quality || 1)
        : leanGain * share; // a cut loses lean evenly
    const growthPct = ((gainKg * MUSCLE_SHARE_OF_LEAN_GAIN) / (muscleMass * share)) * 100;
    return { m, s, gainKg, growthPct };
  });
  const growthSorted = raw.map((r) => r.growthPct).sort((a, b) => a - b);
  const medianGrowth = growthSorted[Math.floor(growthSorted.length / 2)] || 0;

  const muscles: MuscleForecast[] = raw.map(({ m, s, gainKg, growthPct }) => {
    const pct = dev[m.id] ?? null;
    const best = bestExercisesFor(m.id)[0]?.name.toLowerCase();
    const r = rating?.muscles.find((x) => x.muscle === m.id);
    const sets = r ? Math.round(r.creditedSets * 10) / 10 : null;
    let verdict: MuscleVerdict = "on-track";
    let note = "";
    if (priority(m.id) === "skip") {
      verdict = "skipped";
      note = "Marked as skip in your routine.";
    } else if (rating && s < 40) {
      verdict = "under-trained";
      note =
        m.weight >= 0.5
          ? `Only ${sets ?? 0} effective sets a week. It will fall behind; add 2–3 hard sets of ${best} in two sessions.`
          : `Only ${sets ?? 0} effective sets a week. A smaller muscle, so optional, but ${best} would bring it along.`;
    } else if (pct != null && devMean != null && pct < devMean - 12) {
      verdict = "lagging";
      note = `Weaker than the rest of you (${ordinal(pct)} vs ${ordinal(devMean)} percentile). Mark it as focus and train it first in the session.`;
    } else if (pct != null && devMean != null && pct > devMean + 12) {
      verdict = "strong-point";
      note = `Ahead of the rest of you (${ordinal(pct)} percentile). Maintenance-level volume is enough while others catch up.`;
    } else if (leanGain > 0 && growthPct > medianGrowth * 1.25 && s >= 70) {
      verdict = "growing-fast";
      note = `Well trained (${sets} effective sets/week). One of your fastest-growing muscles.`;
    } else {
      note = rating ? `${sets} effective sets a week. Growing in line with the rest of you.` : "Assuming balanced training.";
    }
    return { muscle: m.id, name: m.name, verdict, trainingScore: rating ? s : null, currentPercentile: pct, growthPct, gainKg, note };
  });

  // Balance insights from weekly fractional sets.
  const insights: string[] = [];
  if (rating) {
    const sets = (ids: MuscleId[]) => ids.reduce((a, id) => a + (rating.muscles.find((x) => x.muscle === id)?.weeklySets ?? 0), 0);
    const push = sets(PUSH), pull = sets(PULL);
    if (push > 0 && pull > 0 && push / pull > 1.4) insights.push(`Pressing-heavy: ${Math.round(push)} push vs ${Math.round(pull)} pull sets a week. Add rows and rear-delt work for shoulder health and a balanced look.`);
    else if (push > 0 && pull > 0 && pull / push > 1.6) insights.push(`Pulling-heavy: ${Math.round(pull)} pull vs ${Math.round(push)} push sets a week. Chest and triceps may lag.`);
    const lower = sets(LOWER);
    const upper = rating.muscles.filter((m) => !LOWER.includes(m.muscle)).reduce((a, m) => a + m.weeklySets, 0);
    if (upper > 0 && lower / (upper + lower) < 0.25) insights.push(`Only ${Math.round((lower / (upper + lower)) * 100)}% of your sets are for legs, which make up ~40% of your muscle mass. Expect an upper-body-dominant look.`);
    const width = score("lats") + score("side-delts");
    const thick = score("upper-back") + score("traps");
    if (width - thick > 40) insights.push("Your routine favours width (lats, side delts) over back thickness. Add a row with elbows wide or Kelso shrugs.");
  }
  if (devMean != null) {
    const top = muscles.filter((m) => m.verdict === "strong-point").map((m) => m.name.toLowerCase());
    if (top.length) insights.push(`Strength suggests your ${top.join(", ")} are relatively well developed.`);
  }

  const lean0 = leanNow;
  const lean1 = Math.max(0, lean0 + leanGain);
  const fat1 = end.fatKg;
  const w1 = lean1 + fat1;
  const f0 = ffmi(ctx.weightKg, ctx.heightCm, ctx.bodyFatPct).normalizedFfmi;
  const bf1 = w1 > 0 ? (fat1 / w1) * 100 : 0;
  const f1 = ffmi(w1, ctx.heightCm, bf1).normalizedFfmi;

  return {
    months,
    leanGainKg: leanGain,
    potentialLeanGainKg: potential,
    trainingQuality: quality,
    now: { weightKg: ctx.weightKg, bodyFatPct: ctx.bodyFatPct, ffmi: f0, ffmiLabel: ffmiCategory(f0, ctx.sex) },
    then: { weightKg: w1, bodyFatPct: bf1, ffmi: f1, ffmiLabel: ffmiCategory(f1, ctx.sex) },
    muscles,
    insights,
  };
}

/** 1 → "1st", 22 → "22nd", 13 → "13th". */
export function ordinal(n: number): string {
  const r = Math.round(n);
  const t = r % 100;
  const suf = t >= 11 && t <= 13 ? "th" : (["th", "st", "nd", "rd"][r % 10] ?? "th");
  return `${r}${suf}`;
}

export const VERDICT_LABEL: Record<MuscleVerdict, string> = {
  "under-trained": "Under-trained",
  lagging: "Lagging",
  "on-track": "On track",
  "growing-fast": "Growing fast",
  "strong-point": "Strong point",
  skipped: "Skipped",
};

export function muscleName(id: MuscleId): string {
  return MUSCLE_BY_ID[id].name;
}
