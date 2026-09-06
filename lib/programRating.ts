/**
 * lib/programRating.ts
 * --------------------
 * Rates how effective a generated program actually is, rather than assuming
 * that more work is better.
 *
 * The stimulus half is the WNS model — Weekly Number of Stimulating reps —
 * built on Chris Beardsley's mechanistic account of hypertrophy: a rep only
 * stimulates growth when motor-unit recruitment is high AND fibre shortening
 * velocity is low, and those only coincide in roughly the final five reps
 * before failure. So:
 *
 *     stimulating reps in a set = min(reps in the set, 5 − RIR)
 *     WNS for a muscle = Σ (sets × stimulating reps), primaries in full,
 *                        secondary movers at half weight
 *
 * A set of 12 stopped at 4 reps in reserve contributes one stimulating rep for
 * twelve reps of fatigue; three sets of 8 taken to 1 RIR contribute twelve. It
 * is why "less volume, closer to failure, more often" outperforms set-chasing.
 *
 * The other half is what the WNS model alone does not capture: fatigue. Two
 * programs with identical WNS are not equally good if one of them costs twice
 * the recovery, because the fatigue is what degrades the next session. So we
 * also model:
 *
 *   • fatigue cost — per set, weighted by the exercise (heavy axial compounds
 *     cost far more than isolation work), by proximity to failure, and by load
 *   • recovery capacity — from training days, sleep, life stress, energy
 *     availability (a deficit blunts recovery), age and training experience
 *   • stimulus-to-fatigue ratio (SFR) — stimulating reps bought per unit of
 *     fatigue, the number that separates efficient programs from busy ones
 *   • frequency, goal specificity and sustainability (session length)
 *
 * Pure logic; no React.
 */

import {
  MUSCLES,
  volumeTarget,
  type Goal,
  type Muscle,
  type WorkoutPlan,
} from "./workoutPlan";
import type { TrainingLevel } from "./formulas";

export type Stress = "low" | "moderate" | "high";
export type Nutrition = "deficit" | "maintenance" | "surplus";

export interface RatingContext {
  sleepHours: number;
  stress: Stress;
  nutrition: Nutrition;
  age: number;
  experience: TrainingLevel;
}

export const DEFAULT_CONTEXT: RatingContext = {
  sleepHours: 7.5,
  stress: "moderate",
  nutrition: "maintenance",
  age: 30,
  experience: "intermediate",
};

/**
 * Weekly stimulating-rep target per muscle, by goal.
 *
 * Anchored on the hypertrophy case: ~6–12 hard sets a week at 0–2 RIR is
 * roughly 24–48 stimulating reps, and the response has flattened well before
 * the top of that. Strength needs fewer (it is driven by heavy practice, not by
 * accumulated stimulating reps) and power fewer still, because every set is
 * deliberately kept far from failure.
 */
export function wnsTarget(goal: Goal): { min: number; max: number } {
  if (goal === "hypertrophy") return { min: 24, max: 60 };
  if (goal === "strength") return { min: 14, max: 36 };
  if (goal === "power") return { min: 8, max: 26 };
  if (goal === "endurance") return { min: 6, max: 24 };
  return { min: 16, max: 44 };
}

/**
 * Stimulating reps per fatigue unit that a well-built program of this type
 * achieves. Strength and power work buys fewer stimulating reps per unit of
 * fatigue by design — the fatigue is buying skill and force, not size — so
 * each goal is scored against its own reference.
 */
function sfrReference(goal: Goal): number {
  if (goal === "hypertrophy") return 5.2;
  if (goal === "strength") return 4.2;
  if (goal === "power") return 2.4;
  if (goal === "endurance") return 2.5;
  return 3.6;
}

export interface MuscleStimulus {
  muscle: Muscle;
  sets: number;
  frequency: number;
  wns: number;
  /** 0–100: how well this muscle's stimulus lands in the productive band. */
  score: number;
  verdict: "under" | "in range" | "excess";
}

export interface RatingDriver {
  label: string;
  score: number; // 0–100
  weight: number; // share of the overall
  detail: string;
}

export interface Flag {
  tone: "good" | "warn" | "bad";
  text: string;
}

export interface ProgramRating {
  /** Overall effectiveness, 0–100. */
  score: number;
  grade: string;
  drivers: RatingDriver[];
  perMuscle: MuscleStimulus[];
  /** Weekly stimulating reps summed across muscles. */
  totalWns: number;
  /** Weekly fatigue units. */
  fatigueUnits: number;
  /** Estimated weekly recovery capacity, in the same units. */
  capacity: number;
  /** fatigueUnits / capacity — above 1 means the program outruns recovery. */
  fatigueLoad: number;
  /** Stimulating reps per unit of fatigue. */
  sfr: number;
  /** Estimated minutes per session, including rest. */
  sessionMinutes: number;
  flags: Flag[];
  improvements: string[];
  summary: string;
}

/* ---- Recovery capacity ---------------------------------------------- */

/**
 * Fatigue units a training day is expected to absorb, before context. Capacity
 * grows slightly sub-linearly with training days: a sixth session adds less
 * headroom than a second one, because the recovery cost is systemic, not
 * per-session.
 */
const CAPACITY_PER_DAY = 21;
const CAPACITY_DAY_EXPONENT = 0.92;

const SLEEP_FACTOR = (h: number): number => {
  if (h < 6) return 0.8;
  if (h < 7) return 0.92;
  if (h < 8) return 1;
  return 1.06;
};
const STRESS_FACTOR: Record<Stress, number> = { low: 1.06, moderate: 1, high: 0.85 };
// Energy availability is a hard constraint on recovery: in a deficit you can
// keep muscle with the same hard sets, but you cannot absorb as much of them.
const NUTRITION_FACTOR: Record<Nutrition, number> = { deficit: 0.85, maintenance: 1, surplus: 1.08 };
const EXPERIENCE_FACTOR: Record<TrainingLevel, number> = { beginner: 0.9, intermediate: 1, advanced: 1.12 };

export function recoveryCapacity(days: number, ctx: RatingContext): number {
  const ageFactor = Math.max(0.75, 1 - Math.max(0, ctx.age - 30) * 0.005);
  const context =
    SLEEP_FACTOR(ctx.sleepHours) *
    STRESS_FACTOR[ctx.stress] *
    NUTRITION_FACTOR[ctx.nutrition] *
    ageFactor *
    EXPERIENCE_FACTOR[ctx.experience];
  // Each factor is defensible on its own, but multiplying five of them stacks
  // into implausible extremes, so the combined context effect is clamped.
  const clamped = Math.max(0.6, Math.min(1.25, context));
  return CAPACITY_PER_DAY * Math.pow(Math.max(1, days), CAPACITY_DAY_EXPONENT) * clamped;
}

/* ---- Scoring helpers ------------------------------------------------- */

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/**
 * Score a value against a productive band, peaking at the middle of it.
 *
 * Distance is measured on a log scale (doubling the dose is the same step
 * whichever end you start from) and the penalty is asymmetric: too little
 * stimulus is the main way a program fails, so it costs more than overshooting,
 * which merely wastes recovery.
 */
function bandScore(value: number, min: number, max: number): number {
  if (value <= 0) return 0;
  const ideal = Math.sqrt(min * max);
  const d = Math.log(value / ideal);
  const k = d < 0 ? 0.95 : 0.55;
  return clamp(100 * Math.exp(-k * d * d));
}

/**
 * Grade bands. They are set high on purpose: any plan this generator produces
 * is already built on the frequency and proximity-to-failure principles, so the
 * interesting question is not "is it a program" but "how much is it leaving on
 * the table" — and a plan that outruns your recovery drops fast.
 */
function gradeFor(score: number): string {
  if (score >= 97) return "A+";
  if (score >= 94) return "A";
  if (score >= 91) return "A−";
  if (score >= 87) return "B+";
  if (score >= 82) return "B";
  if (score >= 77) return "B−";
  if (score >= 70) return "C+";
  if (score >= 62) return "C";
  if (score >= 54) return "C−";
  return "D";
}

/* ---- The rating ------------------------------------------------------ */

export function rateProgram(plan: WorkoutPlan, ctx: RatingContext): ProgramRating {
  const target = wnsTarget(plan.goal);
  const vt = volumeTarget(plan.goal);

  /* --- Stimulus: the WNS model, per muscle --- */
  const perMuscle: MuscleStimulus[] = plan.volume
    .filter((v) => v.sets > 0)
    // Core and calves are supporting cast; they shouldn't drag the score of a
    // program whose main muscles are dialled in.
    .map((v) => {
      const score = bandScore(v.stimulatingReps, target.min, target.max);
      return {
        muscle: v.muscle,
        sets: v.sets,
        frequency: v.frequency,
        wns: v.stimulatingReps,
        score,
        verdict:
          v.stimulatingReps < target.min
            ? ("under" as const)
            : v.stimulatingReps > target.max
            ? ("excess" as const)
            : ("in range" as const),
      };
    });

  const MINOR: Muscle[] = ["Core", "Calves"];
  const weightFor = (m: Muscle) => (MINOR.includes(m) ? 0.4 : 1);
  const stimulusWeightSum = perMuscle.reduce((s, m) => s + weightFor(m.muscle), 0) || 1;
  let stimulusScore =
    perMuscle.reduce((s, m) => s + m.score * weightFor(m.muscle), 0) / stimulusWeightSum;

  // Muscles the plan never trains at all are a real hole in the program.
  const untrained = MUSCLES.filter((m) => !perMuscle.some((p) => p.muscle === m) && !MINOR.includes(m));
  stimulusScore = clamp(stimulusScore - untrained.length * 8);

  const totalWns = perMuscle.reduce((s, m) => s + m.wns, 0);

  /* --- Fatigue: what the program costs to recover from --- */
  let fatigueUnits = 0;
  let liftSets = 0;
  let hardSets = 0; // sets at ≤2 RIR
  for (const day of plan.days) {
    for (const ex of day.exercises) {
      const cost = ex.cost ?? 1;
      if (ex.kind === "cardio") {
        fatigueUnits += cost;
        continue;
      }
      const sets = ex.sets ?? 0;
      const rir = ex.rirValue ?? 2;
      // Closer to failure = disproportionately more fatigue for the same set.
      const effort = 0.6 + ((5 - Math.min(5, rir)) / 5) * 0.8;
      // Heavier loads add central/joint fatigue on top of the exercise's cost.
      const load = ex.pct ? 0.85 + ex.pct * 0.45 : 1;
      fatigueUnits += sets * cost * effort * load;
      if (ex.kind === "lift") {
        liftSets += sets;
        if (rir <= 2) hardSets += sets;
      }
    }
  }
  const capacity = recoveryCapacity(plan.daysPerWeek, ctx);
  const fatigueLoad = capacity > 0 ? fatigueUnits / capacity : 0;
  const sfr = fatigueUnits > 0 ? totalWns / fatigueUnits : 0;

  // Comfortably inside capacity scores full marks; overshooting is penalised
  // hard, because unrecovered fatigue silently degrades every later session.
  const fatigueScore = fatigueLoad <= 1 ? 100 : clamp(100 - (fatigueLoad - 1) * 140);

  const sfrScore = clamp((sfr / sfrReference(plan.goal)) * 100, 0, 100);

  /* --- Frequency: the ≥1.5×/week floor --- */
  const frequencies = perMuscle.filter((m) => !MINOR.includes(m.muscle)).map((m) => m.frequency);
  const minFreq = frequencies.length ? Math.min(...frequencies) : 0;
  const avgFreq = frequencies.length ? frequencies.reduce((s, f) => s + f, 0) / frequencies.length : 0;
  const frequencyScore =
    minFreq >= 2 ? 100 : minFreq >= 1.5 ? 85 : minFreq >= 1 ? 58 : 25;

  /* --- Specificity: does the scheme match the goal? --- */
  const liftRows = plan.days.flatMap((d) => d.exercises).filter((e) => e.kind === "lift" && e.sets);
  const avgReps =
    liftRows.reduce((s, e) => s + (e.repMid ?? 8) * (e.sets ?? 1), 0) /
    (liftRows.reduce((s, e) => s + (e.sets ?? 1), 0) || 1);
  const idealReps: Record<Goal, number> = {
    strength: 4.5,
    power: 3.5,
    hypertrophy: 9,
    athletic: 6.5,
    endurance: 6,
  };
  const specificityScore = clamp(100 - Math.abs(avgReps - idealReps[plan.goal]) * 11);

  /* --- Sustainability: can you actually turn up for it? --- */
  // ~3.2 min per working set including rest, plus 10 min of warm-up, plus any
  // conditioning block.
  const setsPerSession = liftSets / Math.max(1, plan.days.length);
  const cardioPerWeek = plan.days.flatMap((d) => d.exercises).filter((e) => e.kind === "cardio").length;
  const sessionMinutes = Math.round(10 + setsPerSession * 3.2 + (cardioPerWeek / Math.max(1, plan.days.length)) * 15);
  const lengthScore = sessionMinutes <= 70 ? 100 : clamp(100 - (sessionMinutes - 70) * 2.2);
  const daysScore = plan.daysPerWeek <= 5 ? 100 : ctx.stress === "high" ? 70 : 88;
  const sustainabilityScore = 0.6 * lengthScore + 0.4 * daysScore;

  const drivers: RatingDriver[] = [
    {
      label: "Stimulus (WNS)",
      score: Math.round(stimulusScore),
      weight: 0.34,
      detail: `${Math.round(totalWns)} stimulating reps/week across ${perMuscle.length} muscles; target ${target.min}–${target.max} each.`,
    },
    {
      label: "Fatigue management",
      score: Math.round(fatigueScore),
      weight: 0.22,
      detail: `${Math.round(fatigueUnits)} fatigue units vs an estimated capacity of ${Math.round(capacity)} (${Math.round(fatigueLoad * 100)}%).`,
    },
    {
      label: "Stimulus-to-fatigue",
      score: Math.round(sfrScore),
      weight: 0.1,
      detail: `${sfr.toFixed(2)} stimulating reps per fatigue unit — how much growth signal each unit of recovery buys.`,
    },
    {
      label: "Frequency",
      score: Math.round(frequencyScore),
      weight: 0.18,
      detail: `Least-trained muscle: ${minFreq}×/week (average ${avgFreq.toFixed(1)}×). 1.5× is the floor, 2× the target.`,
    },
    {
      label: "Goal specificity",
      score: Math.round(specificityScore),
      weight: 0.09,
      detail: `Average ${avgReps.toFixed(1)} reps per set against ~${idealReps[plan.goal]} for this goal.`,
    },
    {
      label: "Sustainability",
      score: Math.round(sustainabilityScore),
      weight: 0.07,
      detail: `About ${sessionMinutes} min per session, ${plan.daysPerWeek} days a week.`,
    },
  ];

  const score = Math.round(drivers.reduce((s, d) => s + d.score * d.weight, 0));

  /* --- Flags & concrete fixes --- */
  const flags: Flag[] = [];
  const improvements: string[] = [];

  const under = perMuscle.filter((m) => m.verdict === "under" && !MINOR.includes(m.muscle));
  const over = perMuscle.filter((m) => m.verdict === "excess");
  if (under.length)
    flags.push({
      tone: "warn",
      text: `Under-stimulated: ${under.map((m) => `${m.muscle} (${Math.round(m.wns)} WNS)`).join(", ")} — below the ${target.min} stimulating reps/week this goal wants.`,
    });
  if (over.length)
    flags.push({
      tone: "warn",
      text: `Past the useful dose: ${over.map((m) => m.muscle).join(", ")} — extra sets here buy fatigue faster than growth.`,
    });
  if (untrained.length)
    flags.push({ tone: "bad", text: `Not trained at all: ${untrained.join(", ")}.` });
  if (minFreq < 1.5)
    flags.push({
      tone: "bad",
      text: `Some muscles are trained only ${minFreq}× a week. The same weekly sets split over two sessions are done fresher and stimulate more.`,
    });
  else if (minFreq >= 2)
    flags.push({ tone: "good", text: `Every muscle is trained at least ${minFreq}× a week — sets stay fresh and quality stays high.` });
  if (fatigueLoad > 1.12)
    flags.push({
      tone: "bad",
      text: `The week costs about ${Math.round(fatigueLoad * 100)}% of your estimated recovery capacity. Unrecovered fatigue shows up as stalled lifts, not as soreness.`,
    });
  else if (fatigueLoad < 0.55 && stimulusScore < 80)
    flags.push({
      tone: "warn",
      text: "You have recovery headroom left — the limiter here is stimulus, not fatigue. Push sets closer to failure before adding any.",
    });
  if (ctx.sleepHours < 7)
    flags.push({ tone: "warn", text: `${ctx.sleepHours} h of sleep cuts your recovery capacity by roughly ${Math.round((1 - SLEEP_FACTOR(ctx.sleepHours)) * 100)}% — it is the cheapest variable on this page to fix.` });
  if (ctx.nutrition === "deficit")
    flags.push({ tone: "warn", text: "In a calorie deficit you recover from less. Keep the hard sets and the frequency; cut the accessory volume, not the intensity." });
  if (ctx.stress === "high")
    flags.push({ tone: "warn", text: "High life stress and training stress draw on the same account — expect to need an easier week sooner." });
  if (hardSets / Math.max(1, liftSets) > 0.9 && plan.goal !== "power")
    flags.push({ tone: "warn", text: "Almost every set is near failure. That is where the stimulus is, but keep the first set of each exercise a rep further back so the later ones stay hard." });

  if (under.length)
    improvements.push(`Add one set to ${under[0].muscle} work, or take those sets a rep closer to failure — one extra stimulating rep per set is worth more than a whole extra easy set.`);
  if (over.length)
    improvements.push(`Cut a set from ${over[0].muscle}; you are past the point where extra sets add growth, and that set is still costing recovery.`);
  if (minFreq < 1.5)
    improvements.push("Switch to a split whose sessions repeat in the week (Upper/Lower, Anterior/Posterior or Push/Pull all run twice on 4 days).");
  if (fatigueLoad > 1.12)
    improvements.push("Drop the accessory sets first — they carry the least stimulus per unit of fatigue. Keep the heavy compounds and the frequency.");
  if (sfr < sfrReference(plan.goal) * 0.7 && fatigueUnits > 0)
    improvements.push("Your stimulus-to-fatigue ratio is low: swap some heavy axial compound volume for machine or single-joint work at the same proximity to failure.");
  if (specificityScore < 70)
    improvements.push(`The rep ranges don't match a ${plan.goal} goal — either change the goal or the scheme, not both.`);
  if (sessionMinutes > 75)
    improvements.push(`Sessions run about ${sessionMinutes} min. Cap sets per session, or add a training day and spread the same work out.`);
  if (improvements.length === 0)
    improvements.push("Nothing to fix on paper. Run it for 5–8 weeks, progress reps then load, and re-rate it when your recovery context changes.");

  const summary =
    score >= 94
      ? `Excellent: ${Math.round(totalWns)} stimulating reps a week, every muscle trained ${minFreq}×, and it fits inside your recovery.`
      : score >= 85
      ? `Solid program. The main lever left is ${drivers.slice().sort((a, b) => a.score - b.score)[0].label.toLowerCase()}.`
      : score >= 70
      ? `Workable, but leaving results on the table — ${drivers.slice().sort((a, b) => a.score - b.score)[0].label.toLowerCase()} is holding it back.`
      : `This week is unlikely to deliver much for the effort: ${drivers.slice().sort((a, b) => a.score - b.score)[0].label.toLowerCase()} needs fixing first.`;

  return {
    score,
    grade: gradeFor(score),
    drivers,
    perMuscle,
    totalWns,
    fatigueUnits,
    capacity,
    fatigueLoad,
    sfr,
    sessionMinutes,
    flags,
    improvements,
    summary: `${summary} ${vt.label}.`,
  };
}
