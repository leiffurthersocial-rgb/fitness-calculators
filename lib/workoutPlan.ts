/**
 * lib/workoutPlan.ts
 * ------------------
 * An evidence-based weekly workout-plan generator. Pick a goal (or let a
 * sport/position pick one), and it builds a split, applies a scheme, biases
 * volume toward weak lifts, computes working weights from your 1RMs, and
 * reports weekly volume, per-muscle frequency and stimulating reps.
 *
 * The programming model follows the mechanistic view of hypertrophy popularised
 * by Chris Beardsley, which changes what a "good" plan looks like:
 *
 *   • Only reps near failure grow muscle. High motor-unit recruitment and slow
 *     fibre shortening velocity only coincide in roughly the last five reps
 *     before failure — the "stimulating reps". A set stopped at 4 RIR is mostly
 *     fatigue with very little stimulus attached.
 *   • So: fewer sets, taken closer to failure. A handful of genuinely hard sets
 *     per muscle per session does the job; piling on 20+ sets a week mostly buys
 *     fatigue, which then eats the next session. Volume is a cost, not the goal.
 *   • Frequency is how you get quality volume in. Splitting the same weekly sets
 *     over more sessions means more of them are done fresh — so every muscle
 *     here is trained at least 1.5× and usually 2× per week.
 *   • Long-length matters. Exercises that load a muscle in its stretched
 *     position produce more growth per set, so the library marks them and the
 *     generator prefers them.
 *   • Fatigue is the real constraint. Heavy axial compounds and sets taken to
 *     failure cost far more recovery than isolation work — see lib/programRating
 *     for the stimulus-to-fatigue accounting that scores the finished plan.
 *
 * Pure logic only (no React). Weights are kg; round at the UI.
 */

import { roundToIncrement } from "./formulas";
import { SPORTS_DB } from "./buildRater";

export type Goal = "strength" | "power" | "hypertrophy" | "athletic" | "endurance";
export type LiftingGoal = Exclude<Goal, "endurance">;
export type MainLift = "squat" | "bench" | "deadlift" | "ohp";
export type Split =
  | "fullbody"
  | "upperLower"
  | "antPost"
  | "pushPull"
  | "ppl"
  | "pplUL"
  | "upperLowerFull";
export type Equipment = "full" | "dumbbell" | "bodyweight";
export type Muscle =
  | "Quads"
  | "Hamstrings"
  | "Glutes"
  | "Calves"
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Arms"
  | "Core";

export const GOALS: { key: Goal; label: string; blurb: string }[] = [
  { key: "strength", label: "Max strength", blurb: "Heavy, low reps (3–5)" },
  { key: "power", label: "Explosive power", blurb: "Fast reps + plyometrics" },
  { key: "hypertrophy", label: "Muscle / hypertrophy", blurb: "Hard sets near failure, 2×/week each muscle" },
  { key: "athletic", label: "All-round athletic", blurb: "Strength + power + a little conditioning" },
  { key: "endurance", label: "Endurance / running", blurb: "Runs, intervals + strength support" },
];

export const EQUIPMENT: { key: Equipment; label: string }[] = [
  { key: "full", label: "Full gym (barbell)" },
  { key: "dumbbell", label: "Dumbbells only" },
  { key: "bodyweight", label: "Bodyweight / minimal" },
];

interface GoalScheme {
  mainSets: number;
  mainReps: string;
  /** Midpoint of the rep range, for the stimulating-rep maths. */
  mainRepMid: number;
  mainPct: number; // % of 1RM for main lifts
  accSets: number;
  accReps: string;
  accRepMid: number;
  /** Reps left in the tank on a working set — the stimulus dial. */
  rir: number;
  rirLabel: string;
  restSec: number; // rest on the main compound
  plyo: boolean;
  conditioning: boolean;
}

/**
 * Set counts are deliberately lower than the old "10–20 sets a week" default.
 * Each session's sets are close enough to failure to be stimulating, and the
 * split repeats each session ~2×/week, so weekly hard sets per muscle land
 * around 6–12 — which is where the dose–response curve has already flattened
 * for most people, at a fraction of the fatigue.
 */
const GOAL_SCHEMES: Record<LiftingGoal, GoalScheme> = {
  // Heavy & neural. Strength is practice of a heavy skill: stay a rep or two
  // clear of failure so the next heavy session isn't compromised.
  strength: { mainSets: 4, mainReps: "3–5", mainRepMid: 4, mainPct: 0.85, accSets: 2, accReps: "6–8", accRepMid: 7, rir: 2, rirLabel: "2 RIR", restSec: 210, plyo: false, conditioning: false },
  // Sub-maximal speed work. Deliberately far from failure — every rep fast.
  power: { mainSets: 5, mainReps: "3", mainRepMid: 3, mainPct: 0.7, accSets: 3, accReps: "5", accRepMid: 5, rir: 4, rirLabel: "explosive, 4+ RIR", restSec: 180, plyo: true, conditioning: false },
  // Fewer sets, but genuinely hard ones: 0–1 RIR is where the stimulating reps
  // live, so three such sets beat five half-hearted ones.
  hypertrophy: { mainSets: 3, mainReps: "6–10", mainRepMid: 8, mainPct: 0.75, accSets: 3, accReps: "8–12", accRepMid: 10, rir: 1, rirLabel: "0–1 RIR", restSec: 150, plyo: false, conditioning: false },
  // Mixed quality strength/power with a little conditioning.
  athletic: { mainSets: 3, mainReps: "4–6", mainRepMid: 5, mainPct: 0.8, accSets: 2, accReps: "8–10", accRepMid: 9, rir: 2, rirLabel: "1–2 RIR", restSec: 165, plyo: true, conditioning: true },
};

export function goalScheme(goal: LiftingGoal): GoalScheme {
  return GOAL_SCHEMES[goal];
}

interface ExDef {
  name: string;
  db?: string; // dumbbell variant
  bw?: string; // bodyweight variant
  pattern: string;
  mainLift?: MainLift; // ties to a 1RM for weight calc (barbell only)
  role: "main" | "accessory";
  primary: Muscle[]; // direct movers — count as a full set
  secondary?: Muscle[]; // assisting movers — count as a half set
  /**
   * Systemic fatigue per hard set, relative to an isolation exercise. Heavy
   * axial compounds (squat, deadlift) cost the most recovery for the same
   * stimulus; single-joint work costs the least.
   */
  cost: number;
  /** Loads the primary muscle hard in its stretched position. */
  lengthened?: boolean;
}

// Exercise library, with dumbbell & bodyweight swaps for the equipment toggle.
// Primary vs secondary movers feed an accurate weekly set count (secondary
// involvement, e.g. triceps on a press, counts as half a direct set).
const E = {
  squat: { name: "Back squat", db: "Goblet / DB squat", bw: "Pistol / split squat", pattern: "squat", mainLift: "squat", role: "main", primary: ["Quads"], secondary: ["Glutes", "Core"], cost: 1.6, lengthened: true } as ExDef,
  frontSquat: { name: "Front squat", db: "DB front squat", bw: "Bulgarian split squat", pattern: "squat", mainLift: "squat", role: "main", primary: ["Quads"], secondary: ["Glutes", "Core"], cost: 1.5, lengthened: true } as ExDef,
  deadlift: { name: "Deadlift", db: "DB Romanian deadlift", bw: "Single-leg hip thrust", pattern: "hinge", mainLift: "deadlift", role: "main", primary: ["Hamstrings", "Glutes", "Back"], cost: 1.8 } as ExDef,
  rdl: { name: "Romanian deadlift", db: "DB RDL", bw: "Single-leg RDL", pattern: "hinge", role: "accessory", primary: ["Hamstrings"], secondary: ["Glutes", "Back"], cost: 1.3, lengthened: true } as ExDef,
  legCurl: { name: "Leg curl", db: "DB / slider leg curl", bw: "Nordic curl (eccentric)", pattern: "kneeFlex", role: "accessory", primary: ["Hamstrings"], cost: 0.7 } as ExDef,
  hipThrust: { name: "Hip thrust", db: "DB hip thrust", bw: "Single-leg hip thrust", pattern: "hinge", role: "accessory", primary: ["Glutes"], secondary: ["Hamstrings"], cost: 0.9 } as ExDef,
  bench: { name: "Bench press", db: "DB bench press", bw: "Push-up (weighted/decline)", pattern: "hpush", mainLift: "bench", role: "main", primary: ["Chest"], secondary: ["Arms", "Shoulders"], cost: 1.2, lengthened: true } as ExDef,
  incline: { name: "Incline bench press", db: "Incline DB press", bw: "Decline push-up", pattern: "hpush", mainLift: "bench", role: "main", primary: ["Chest", "Shoulders"], secondary: ["Arms"], cost: 1.2, lengthened: true } as ExDef,
  fly: { name: "Cable fly / DB fly", db: "DB fly", bw: "Ring / sliding fly", pattern: "hpush", role: "accessory", primary: ["Chest"], cost: 0.7, lengthened: true } as ExDef,
  ohp: { name: "Overhead press", db: "DB shoulder press", bw: "Pike / handstand push-up", pattern: "vpush", mainLift: "ohp", role: "main", primary: ["Shoulders"], secondary: ["Arms", "Core"], cost: 1.2 } as ExDef,
  dbPress: { name: "DB shoulder press", db: "DB shoulder press", bw: "Pike push-up", pattern: "vpush", role: "accessory", primary: ["Shoulders"], secondary: ["Arms"], cost: 1.0 } as ExDef,
  lateralRaise: { name: "Lateral raise", db: "DB lateral raise", bw: "Band lateral raise", pattern: "shoulderAbd", role: "accessory", primary: ["Shoulders"], cost: 0.6 } as ExDef,
  row: { name: "Barbell row", db: "DB row", bw: "Inverted row", pattern: "hpull", role: "accessory", primary: ["Back"], secondary: ["Arms"], cost: 1.1, lengthened: true } as ExDef,
  pullup: { name: "Pull-up / lat pulldown", db: "DB pullover + row", bw: "Pull-up / inverted row", pattern: "vpull", role: "accessory", primary: ["Back"], secondary: ["Arms"], cost: 1.0, lengthened: true } as ExDef,
  facepull: { name: "Face pull", db: "DB rear-delt raise", bw: "Band pull-apart", pattern: "hpull", role: "accessory", primary: ["Shoulders"], secondary: ["Back"], cost: 0.5 } as ExDef,
  lunge: { name: "Walking lunge", db: "DB walking lunge", bw: "Reverse lunge", pattern: "lunge", role: "accessory", primary: ["Quads"], secondary: ["Glutes"], cost: 1.1, lengthened: true } as ExDef,
  splitSquat: { name: "Bulgarian split squat", db: "DB split squat", bw: "Bulgarian split squat", pattern: "lunge", role: "accessory", primary: ["Quads"], secondary: ["Glutes"], cost: 1.2, lengthened: true } as ExDef,
  calfRaise: { name: "Standing calf raise", db: "DB calf raise", bw: "Single-leg calf raise", pattern: "calf", role: "accessory", primary: ["Calves"], cost: 0.5, lengthened: true } as ExDef,
  core: { name: "Hanging leg raise + plank", db: "Weighted plank + leg raise", bw: "Hollow hold + plank", pattern: "core", role: "accessory", primary: ["Core"], cost: 0.6 } as ExDef,
  bicepCurl: { name: "Incline biceps curl", db: "Incline DB curl", bw: "Chin-up (supinated)", pattern: "arms", role: "accessory", primary: ["Arms"], cost: 0.5, lengthened: true } as ExDef,
  tricepExt: { name: "Overhead triceps extension", db: "DB overhead extension", bw: "Dip / overhead band extension", pattern: "arms", role: "accessory", primary: ["Arms"], cost: 0.5, lengthened: true } as ExDef,
};

type SessionTemplate = {
  label: string;
  /** Rotated across the cycle: occurrence 1 gets variant A, occurrence 2 gets B. */
  variants: ExDef[][];
};

/**
 * Split registry.
 *
 * Splits are defined as a small set of *session types* plus the training
 * frequencies they support — not as a fixed list of days. The week is then a
 * rolling cycle through those sessions, which is what lets a 4-day
 * Anterior/Posterior week be two session types run twice each (A, P, A, P)
 * rather than four different workouts.
 *
 * On day counts that aren't a multiple of the session count the cycle simply
 * rolls into the next week: three days of Upper/Lower runs U, L, U then L, U, L,
 * i.e. 1.5× per session type per week. That rolling average is what the volume
 * and frequency read-outs report, because it is what your body actually gets.
 *
 * Repeat occurrences of a session use different exercise variants, so the
 * second chest day isn't a carbon copy of the first — but every variant of a
 * session type covers the same muscles, so frequency doesn't silently drop.
 */
interface SplitDef {
  label: string;
  blurb: string;
  sessions: SessionTemplate[];
  /** Training frequencies this split is offered at. */
  days: number[];
}

const SPLIT_DEFS: Record<Split, SplitDef> = {
  fullbody: {
    label: "Full body",
    blurb: "One session type, three variants — every muscle every session, the highest frequency there is.",
    sessions: [
      {
        label: "Full body",
        variants: [
          [E.squat, E.bench, E.row, E.legCurl, E.core],
          [E.deadlift, E.ohp, E.pullup, E.splitSquat, E.core],
          [E.frontSquat, E.incline, E.pullup, E.rdl, E.bicepCurl],
        ],
      },
    ],
    days: [2, 3, 4],
  },
  upperLower: {
    label: "Upper / Lower",
    blurb: "Two session types alternating — the most reliable way to hit everything twice a week.",
    sessions: [
      {
        label: "Upper",
        variants: [
          [E.bench, E.row, E.ohp, E.bicepCurl],
          [E.incline, E.pullup, E.dbPress, E.tricepExt],
        ],
      },
      {
        label: "Lower",
        variants: [
          [E.squat, E.rdl, E.splitSquat, E.calfRaise, E.core],
          [E.deadlift, E.frontSquat, E.legCurl, E.calfRaise, E.core],
        ],
      },
    ],
    days: [2, 3, 4, 5, 6],
  },
  antPost: {
    label: "Anterior / Posterior",
    blurb: "Front-of-body and back-of-body days. Two sessions, each run twice on 4 days — pushes and pulls never compete for the same recovery.",
    sessions: [
      {
        label: "Anterior",
        variants: [
          [E.squat, E.bench, E.ohp, E.core],
          [E.frontSquat, E.incline, E.lateralRaise, E.lunge, E.tricepExt],
        ],
      },
      {
        label: "Posterior",
        variants: [
          [E.deadlift, E.pullup, E.facepull, E.bicepCurl],
          [E.rdl, E.row, E.hipThrust, E.calfRaise, E.core],
        ],
      },
    ],
    days: [2, 3, 4, 5, 6],
  },
  pushPull: {
    label: "Push / Pull",
    blurb: "Pressing days and pulling days, legs shared between them. Two sessions, each run twice on 4 days.",
    sessions: [
      {
        label: "Push",
        variants: [
          [E.bench, E.ohp, E.squat, E.tricepExt],
          [E.incline, E.dbPress, E.splitSquat, E.lateralRaise],
        ],
      },
      {
        label: "Pull",
        variants: [
          [E.deadlift, E.pullup, E.facepull, E.bicepCurl],
          [E.rdl, E.row, E.pullup, E.core],
        ],
      },
    ],
    days: [3, 4, 5, 6],
  },
  ppl: {
    label: "Push / Pull / Legs",
    blurb: "Three session types. On 3 days each muscle is only trained weekly; it needs 6 days to reach the 2× that makes PPL work.",
    sessions: [
      {
        label: "Push",
        variants: [
          [E.bench, E.ohp, E.fly, E.tricepExt],
          [E.incline, E.dbPress, E.lateralRaise, E.tricepExt],
        ],
      },
      {
        label: "Pull",
        variants: [
          [E.row, E.pullup, E.facepull, E.bicepCurl],
          [E.deadlift, E.pullup, E.rdl, E.bicepCurl],
        ],
      },
      {
        label: "Legs",
        variants: [
          [E.squat, E.rdl, E.splitSquat, E.calfRaise, E.core],
          [E.frontSquat, E.hipThrust, E.legCurl, E.calfRaise, E.core],
        ],
      },
    ],
    days: [3, 4, 5, 6],
  },
  pplUL: {
    label: "PPL + Upper / Lower",
    blurb: "Five session types: a PPL block then an upper/lower block, so everything is hit around 2× a week on five days.",
    sessions: [
      { label: "Push", variants: [[E.bench, E.ohp, E.fly, E.tricepExt]] },
      { label: "Pull", variants: [[E.row, E.pullup, E.facepull, E.bicepCurl]] },
      { label: "Legs", variants: [[E.squat, E.rdl, E.splitSquat, E.calfRaise, E.core]] },
      { label: "Upper", variants: [[E.incline, E.pullup, E.dbPress, E.bicepCurl]] },
      { label: "Lower", variants: [[E.deadlift, E.frontSquat, E.legCurl, E.calfRaise, E.core]] },
    ],
    days: [5, 6],
  },
  upperLowerFull: {
    label: "Upper / Lower / Full",
    blurb: "Upper, lower and a full-body day — on five or six days every muscle lands at 2× or better.",
    sessions: [
      {
        label: "Upper",
        variants: [
          [E.bench, E.row, E.ohp, E.bicepCurl],
          [E.incline, E.pullup, E.dbPress, E.tricepExt],
        ],
      },
      {
        label: "Lower",
        variants: [
          [E.squat, E.rdl, E.splitSquat, E.calfRaise],
          [E.deadlift, E.frontSquat, E.legCurl, E.calfRaise],
        ],
      },
      { label: "Full body", variants: [[E.deadlift, E.incline, E.pullup, E.lunge, E.core]] },
    ],
    days: [3, 4, 5, 6],
  },
};

/**
 * Muscles the frequency floor is judged on. Calves and core are supporting
 * cast: nobody should pick a worse split because of where the calf raise fell.
 */
const MAJOR_MUSCLES: Muscle[] = ["Quads", "Hamstrings", "Glutes", "Chest", "Back", "Shoulders", "Arms"];

const supports = (split: Split, days: number) => !!SPLIT_DEFS[split]?.days.includes(days);

/** Every muscle a session type touches, across all of its variants. */
function sessionMuscles(session: SessionTemplate): Set<Muscle> {
  const out = new Set<Muscle>();
  for (const variant of session.variants)
    for (const ex of variant) {
      for (const m of ex.primary) out.add(m);
      for (const m of ex.secondary ?? []) out.add(m);
    }
  return out;
}

/**
 * Weekly training frequency per muscle on a rolling cycle: how many of the
 * split's session types train it, times how often each session type comes
 * round in a week.
 */
function muscleFrequencies(split: Split, days: number): Record<Muscle, number> {
  const def = SPLIT_DEFS[split];
  const perSession = days / def.sessions.length;
  const freq = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>;
  for (const session of def.sessions)
    for (const m of sessionMuscles(session)) freq[m] += perSession;
  // Round to a tenth so 1.4999 doesn't read as 1.5.
  for (const m of MUSCLES) freq[m] = Math.round(freq[m] * 10) / 10;
  return freq;
}

export interface SplitOption {
  key: Split;
  label: string;
  blurb: string;
  /** How often each session type comes round per week (4 days ÷ 2 types = 2). */
  sessionFrequency: number;
  /** Lowest weekly frequency across the major muscle groups. */
  minMuscleFrequency: number;
  /** How the week reads, e.g. "Anterior ×2 · Posterior ×2". */
  pattern: string;
  /** True when the cycle doesn't divide evenly into the week and rolls over. */
  rolling: boolean;
}

/** One entry per session in the week, walking the rolling cycle. */
function walkCycle(split: Split, days: number): { sessionIdx: number; occurrence: number }[] {
  const n = SPLIT_DEFS[split].sessions.length;
  return Array.from({ length: days }, (_, i) => ({
    sessionIdx: i % n,
    occurrence: Math.floor(i / n),
  }));
}

/**
 * Splits available for a training frequency, best first. "Best" is the split
 * whose least-trained major muscle is trained most often — frequency is what
 * lets you spread the same hard sets across fresher sessions.
 */
export function availableSplits(days: number): SplitOption[] {
  return (Object.keys(SPLIT_DEFS) as Split[])
    .filter((k) => supports(k, days))
    .map((k) => {
      const def = SPLIT_DEFS[k];
      const perSession = days / def.sessions.length;
      const freq = muscleFrequencies(k, days);
      const counts = new Map<number, number>();
      for (const { sessionIdx } of walkCycle(k, days))
        counts.set(sessionIdx, (counts.get(sessionIdx) ?? 0) + 1);
      return {
        key: k,
        label: def.label,
        blurb: def.blurb,
        sessionFrequency: Math.round(perSession * 10) / 10,
        minMuscleFrequency: Math.min(...MAJOR_MUSCLES.map((m) => freq[m])),
        pattern: def.sessions
          .map((s, i) => `${s.label} ×${counts.get(i) ?? 0}`)
          .join(" · "),
        rolling: days % def.sessions.length !== 0,
      };
    })
    .sort((a, b) => b.minMuscleFrequency - a.minMuscleFrequency);
}

/** The best split for a day count — the one with the highest minimum frequency. */
export function defaultSplit(days: number): Split {
  return availableSplits(days)[0]?.key ?? "fullbody";
}

export type ExerciseKind = "lift" | "plyo" | "cardio";

export interface PlanExercise {
  name: string;
  kind: ExerciseKind;
  sets?: number; // lifts/plyo
  reps?: string;
  rir?: string;
  pct?: number; // % of 1RM (main barbell lifts only)
  weightKg?: number; // computed if 1RM provided
  prescription?: string; // for cardio/plyo rows (shown instead of sets×reps)
  emphasised?: boolean; // bumped because it's a weak point
  lengthened?: boolean; // loads the target muscle in its stretched position
  /* --- machine-readable fields, consumed by the effectiveness rating --- */
  primary?: Muscle[];
  secondary?: Muscle[];
  repMid?: number; // midpoint of the rep range
  rirValue?: number; // reps left in reserve, numeric
  cost?: number; // systemic fatigue per set, relative to isolation work
}

export interface PlanDay {
  label: string;
  exercises: PlanExercise[];
}

export interface VolumeRow {
  muscle: Muscle;
  sets: number; // weekly working sets
  frequency: number; // sessions per week hitting it directly
  /** Weekly number of stimulating reps — see lib/programRating. */
  stimulatingReps: number;
}

export interface WorkoutPlan {
  goal: Goal;
  daysPerWeek: number;
  splitLabel: string;
  splitPattern: string;
  days: PlanDay[];
  volume: VolumeRow[];
  /** Lowest direct training frequency across the trained muscles. */
  minFrequency: number;
  notes: string[];
}

export interface PlanInput {
  goal: Goal;
  daysPerWeek: number;
  split: Split;
  equipment: Equipment;
  incrementKg: number;
  maxSets?: number; // cap on working sets per session (0 / undefined = no cap)
  oneRMs?: Partial<Record<MainLift, number>>; // kg
  weakLifts?: MainLift[];
  // Customisation overrides (undefined = use the goal's default).
  includeConditioning?: boolean; // force cardio finishers on/off
  includePlyo?: boolean; // force jump work on/off
  emphasis?: Muscle; // add a set to exercises that hit this muscle
}

/** Suggest a default goal from a sport's dominant attribute-group weighting. */
export function goalForSport(sportKey: string, positionKey: string): Goal {
  const sport = SPORTS_DB.find((s) => s.key === sportKey);
  const pos = sport?.positions.find((p) => p.key === positionKey) ?? sport?.positions[0];
  if (!pos) return "athletic";
  const w = pos.weights;
  const max = Math.max(w.strength, w.power, w.endurance);
  if (max === 0) return "athletic";
  // Endurance-dominant sports train in the gym for athletic support, not size.
  if (w.endurance === max && w.endurance >= 0.4) return "athletic";
  if (w.power === max && w.power >= 0.35) return "power";
  if (w.strength === max && w.strength >= 0.45) return "strength";
  return "athletic";
}

export const MUSCLES: Muscle[] = ["Quads", "Hamstrings", "Glutes", "Calves", "Chest", "Back", "Shoulders", "Arms", "Core"];

/**
 * Productive weekly hard-set range per muscle for the goal.
 *
 * These bands are lower than the "10–20 sets" figure that came out of the
 * volume-response literature, because those studies mostly compared sets taken
 * well short of failure. Count only sets within ~2 reps of failure and the
 * dose you need falls a long way — extra sets past this band buy fatigue far
 * faster than they buy growth.
 */
export function volumeTarget(goal: Goal): { min: number; max: number; label: string } {
  if (goal === "hypertrophy") return { min: 6, max: 15, label: "6–15 hard sets/week per muscle — near failure, spread over 2+ sessions" };
  if (goal === "strength") return { min: 5, max: 12, label: "5–12 heavy sets/week per muscle, kept 1–2 reps from failure" };
  if (goal === "power") return { min: 4, max: 10, label: "4–10 fast, sub-maximal sets/week — quality over accumulation" };
  return { min: 5, max: 13, label: "5–13 hard sets/week per muscle for balanced development" };
}

/** Stimulating reps in one set: the last ~5 reps before failure, capped by
 * how many reps the set actually contains. A set stopped at 4 RIR contributes
 * roughly one. */
export function stimulatingReps(repMid: number, rir: number): number {
  return Math.max(0, Math.min(repMid, 5 - rir));
}

export function generatePlan(input: PlanInput): WorkoutPlan {
  if (input.goal === "endurance") return enduranceProgram(input);

  const scheme = GOAL_SCHEMES[input.goal];
  const weak = new Set(input.weakLifts ?? []);
  // Customisation: fall back to the goal's defaults when not overridden.
  const wantPlyo = input.includePlyo ?? scheme.plyo;
  const wantCond = input.includeConditioning ?? scheme.conditioning;
  const emphasis = input.emphasis;
  const days = input.daysPerWeek;
  const splitKey = supports(input.split, days) ? input.split : defaultSplit(days);
  const def = SPLIT_DEFS[splitKey];
  const option = availableSplits(days).find((s) => s.key === splitKey)!;
  const cap = input.maxSets && input.maxSets > 0 ? input.maxSets : Infinity;

  const exName = (ex: ExDef) =>
    input.equipment === "dumbbell" ? ex.db ?? ex.name
    : input.equipment === "bodyweight" ? ex.bw ?? ex.name
    : ex.name;

  /**
   * Build one session variant: pick set counts, apply the per-session cap, and
   * turn each exercise into a prescription row. Built once per variant and
   * reused, since the same variant can appear in several weeks of the cycle.
   */
  const buildVariant = (exercises: ExDef[]): PlanExercise[] => {
    const built = exercises.map((ex, i) => {
      const isMain = ex.role === "main" || i === 0;
      const liftEmph = !!ex.mainLift && weak.has(ex.mainLift);
      const muscleEmph = !!emphasis && ex.primary.includes(emphasis);
      const sets =
        (isMain ? scheme.mainSets : scheme.accSets) + (liftEmph ? 1 : 0) + (muscleEmph ? 1 : 0);
      return { ex, isMain, emphasised: liftEmph || muscleEmph, sets };
    });

    // Apply the per-session set cap. Trim accessories first (min 2), then main
    // lifts (min 3), so the hardest, most useful work survives.
    let total = built.reduce((s, b) => s + b.sets, 0);
    while (total > cap) {
      let trimmed = false;
      for (let j = built.length - 1; j >= 0; j--) {
        if (!built[j].isMain && built[j].sets > 2) { built[j].sets--; total--; trimmed = true; break; }
      }
      if (!trimmed) {
        for (let j = built.length - 1; j >= 0; j--) {
          if (built[j].isMain && built[j].sets > 3) { built[j].sets--; total--; trimmed = true; break; }
        }
      }
      if (!trimmed) break;
    }

    return built.map((b) => {
      const reps = b.isMain ? scheme.mainReps : scheme.accReps;
      const repMid = b.isMain ? scheme.mainRepMid : scheme.accRepMid;
      const pct = b.isMain && b.ex.mainLift && input.equipment === "full" ? scheme.mainPct : undefined;
      const oneRM = b.ex.mainLift ? input.oneRMs?.[b.ex.mainLift] : undefined;
      const weightKg =
        pct && oneRM && oneRM > 0 ? roundToIncrement(oneRM * pct, input.incrementKg) : undefined;
      return {
        name: exName(b.ex),
        kind: "lift" as const,
        sets: b.sets,
        reps,
        rir: scheme.rirLabel,
        pct,
        weightKg,
        emphasised: b.emphasised,
        lengthened: b.ex.lengthened,
        primary: b.ex.primary,
        secondary: b.ex.secondary,
        repMid,
        rirValue: scheme.rir,
        cost: b.ex.cost,
      };
    });
  };

  // Every variant of every session type, built once.
  const builtSessions = def.sessions.map((session) => session.variants.map(buildVariant));

  /* --- Weekly volume, as the rolling-cycle average ---
     A session type that comes round 1.5× a week contributes 1.5× the average
     of its variants — which is what your muscles actually see, even though any
     one printed week shows whole sessions. */
  const perSession = days / def.sessions.length;
  const setTally: Record<Muscle, number> = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>;
  const stimTally: Record<Muscle, number> = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>;
  builtSessions.forEach((variants) => {
    const share = perSession / variants.length;
    for (const rows of variants) {
      for (const ex of rows) {
        const sets = ex.sets ?? 0;
        const stim = stimulatingReps(ex.repMid ?? 0, ex.rirValue ?? 5) * sets;
        for (const m of ex.primary ?? []) { setTally[m] += sets * share; stimTally[m] += stim * share; }
        for (const m of ex.secondary ?? []) { setTally[m] += sets * 0.5 * share; stimTally[m] += stim * 0.5 * share; }
      }
    }
  });
  const freq = muscleFrequencies(splitKey, days);

  /* --- The printed week: walk the cycle, adding plyos and conditioning --- */
  const cycle = walkCycle(splitKey, days);
  const repeats = new Map<number, number>();
  for (const { sessionIdx } of cycle) repeats.set(sessionIdx, (repeats.get(sessionIdx) ?? 0) + 1);

  // Conditioning is limited to ~2 sessions/week (every other day) rather than
  // every session — enough to build a base without blunting strength gains.
  const condDays = new Set<number>();
  if (wantCond) for (let i = 1; i < days && condDays.size < 2; i += 2) condDays.add(i);

  const planDays: PlanDay[] = cycle.map(({ sessionIdx, occurrence }, dayIdx) => {
    const session = def.sessions[sessionIdx];
    const variantIdx = occurrence % session.variants.length;
    const lifts = builtSessions[sessionIdx][variantIdx];
    const label =
      (repeats.get(sessionIdx) ?? 1) > 1
        ? `${session.label} ${String.fromCharCode(65 + variantIdx)}`
        : session.label;

    const isLegDay = session.variants[variantIdx].some((e) => ["squat", "hinge", "lunge"].includes(e.pattern));
    const rows: PlanExercise[] = [];
    if (wantPlyo && isLegDay)
      rows.push({
        name: "Box / broad jumps",
        kind: "plyo",
        sets: 3,
        reps: "3",
        rir: "max intent",
        prescription: "3×3, full rest — explode every rep",
        cost: 1.2,
        repMid: 3,
        rirValue: 4,
      });
    rows.push(...lifts);
    if (condDays.has(dayIdx))
      rows.push({
        name: "Conditioning",
        kind: "cardio",
        prescription: "12–18 min intervals (30s hard / 90s easy)",
        cost: 3,
      });
    return { label, exercises: rows };
  });

  const volume: VolumeRow[] = MUSCLES.map((m) => ({
    muscle: m,
    sets: setTally[m],
    frequency: freq[m],
    stimulatingReps: stimTally[m],
  })).filter((v) => v.sets > 0);

  const minFrequency = option.minMuscleFrequency;
  const vt = volumeTarget(input.goal);
  const notes: string[] = [];
  notes.push(
    `${option.pattern} — every major muscle trained ${minFrequency}× per week. Splitting the same weekly sets over more sessions means more of them are done fresh, which is where the stimulus is.`
  );
  if (option.rolling)
    notes.push(
      `The cycle rolls: ${days} days doesn't divide evenly into ${def.sessions.length} session types, so next week starts where this one left off. That's what averages out to ${option.sessionFrequency}× per session type per week.`
    );
  notes.push(
    `Only the last ~5 reps before failure are genuinely stimulating, so this plan runs fewer sets taken closer to failure: ${vt.label}.`
  );
  notes.push(
    `Take working sets to ${scheme.rirLabel}. Sets left further from failure than that mostly add fatigue without adding stimulus.`
  );
  notes.push(
    `Main lifts: ${scheme.mainSets}×${scheme.mainReps}${input.equipment === "full" ? ` at ~${Math.round(scheme.mainPct * 100)}% 1RM` : ""}; rest ~${scheme.restSec >= 60 ? scheme.restSec / 60 + " min" : scheme.restSec + "s"} on compounds — long rests keep later sets close to failure, which is the point.`
  );
  notes.push(
    "Exercises marked ⤢ load the muscle in its stretched position; those tend to produce more growth per set, so prioritise them when you're short of time."
  );
  if (minFrequency < 1.5)
    notes.push(
      `This split only reaches ${minFrequency}× per week for some muscles. If you can, switch to a split with fewer session types — the same weekly sets spread over two sessions are done fresher and stimulate more.`
    );
  if (wantPlyo || wantCond)
    notes.push(`${wantPlyo ? "Plyometrics open the leg days" : ""}${wantPlyo && wantCond ? "; " : ""}${wantCond ? "conditioning runs on ~2 days" : ""} — keep both away from your heaviest sets.`);
  if (cap !== Infinity) notes.push(`Capped at ${cap} working sets per session — accessories were trimmed first, then main lifts.`);
  if (weak.size) notes.push(`Extra set added to your weak lift${weak.size > 1 ? "s" : ""}: ${[...weak].join(", ")}.`);
  if (emphasis) notes.push(`Emphasis on ${emphasis} — an extra set added to every exercise that trains it.`);
  notes.push("Progress weekly: add reps until you reach the top of the range on all sets, then add ~2.5 kg / 5 lb. Adding sets is the last lever, not the first.");
  notes.push("Deload every 5–8 weeks (halve the sets, keep the load) — with this little junk volume you need them less often, but you still need them.");

  return {
    goal: input.goal,
    daysPerWeek: days,
    splitLabel: def.label,
    splitPattern: option.pattern,
    days: planDays,
    volume,
    minFrequency,
    notes,
  };
}

/* ---- Endurance / running program (cardio-led, with strength support) ---- */
function enduranceProgram(input: PlanInput): WorkoutPlan {
  const d = input.daysPerWeek;
  const cardio = (name: string, prescription: string, cost: number): PlanExercise => ({
    name,
    kind: "cardio",
    prescription,
    cost,
  });

  const RUNS = {
    intervals: cardio("Interval session", "6×800 m @ 5K pace, 90s jog recovery (~40 min)", 5),
    tempo: cardio("Tempo run", "20–30 min @ comfortably hard (Zone 4)", 4),
    easy: cardio("Easy run", "30–45 min conversational (Zone 2)", 1.5),
    long: cardio("Long run", "60–90 min easy (Zone 2)", 3.5),
    fartlek: cardio("Fartlek", "8×(1 min hard / 2 min easy) + warm-up/cool-down", 4),
  };

  // A short full-body strength-support session keeps you durable & economical.
  const exName = (ex: ExDef) =>
    input.equipment === "dumbbell" ? ex.db ?? ex.name
    : input.equipment === "bodyweight" ? ex.bw ?? ex.name : ex.name;
  const strengthSupport = (): PlanDay => {
    const picks = [E.squat, E.deadlift, E.bench, E.core];
    const exercises: PlanExercise[] = picks.map((ex) => {
      const pct = ex.mainLift && input.equipment === "full" ? 0.8 : undefined;
      const oneRM = ex.mainLift ? input.oneRMs?.[ex.mainLift] : undefined;
      const weightKg = pct && oneRM && oneRM > 0 ? roundToIncrement(oneRM * pct, input.incrementKg) : undefined;
      return {
        name: exName(ex),
        kind: "lift" as const,
        sets: 3,
        reps: "5",
        rir: "2 RIR",
        pct,
        weightKg,
        primary: ex.primary,
        secondary: ex.secondary,
        repMid: 5,
        rirValue: 2,
        cost: ex.cost,
        lengthened: ex.lengthened,
      };
    });
    return { label: "Strength support", exercises };
  };

  let days: PlanDay[];
  if (d <= 3) {
    days = [
      { label: "Intervals", exercises: [RUNS.intervals] },
      { label: "Tempo", exercises: [RUNS.tempo] },
      { label: "Long run", exercises: [RUNS.long] },
    ];
  } else if (d === 4) {
    days = [
      { label: "Intervals", exercises: [RUNS.intervals] },
      { label: "Tempo", exercises: [RUNS.tempo] },
      strengthSupport(),
      { label: "Long run", exercises: [RUNS.long] },
    ];
  } else {
    days = [
      { label: "Intervals", exercises: [RUNS.intervals] },
      { label: "Easy run", exercises: [RUNS.easy] },
      { label: "Tempo / fartlek", exercises: [RUNS.fartlek] },
      strengthSupport(),
      { label: "Long run", exercises: [RUNS.long] },
    ];
  }

  // Volume from the (optional) strength-support day.
  const setTally: Record<Muscle, number> = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>;
  const stimTally: Record<Muscle, number> = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>;
  const freqTally: Record<Muscle, Set<number>> = Object.fromEntries(MUSCLES.map((m) => [m, new Set<number>()])) as Record<Muscle, Set<number>>;
  days.forEach((day, idx) => {
    for (const pick of [E.squat, E.deadlift, E.bench, E.core]) {
      if (day.exercises.some((e) => e.name === exName(pick) && e.kind === "lift")) {
        const stim = stimulatingReps(5, 2) * 3;
        for (const m of pick.primary) { setTally[m] += 3; stimTally[m] += stim; freqTally[m].add(idx); }
        for (const m of pick.secondary ?? []) { setTally[m] += 1.5; stimTally[m] += stim * 0.5; }
      }
    }
  });
  const volume: VolumeRow[] = MUSCLES.map((m) => ({
    muscle: m,
    sets: setTally[m],
    frequency: freqTally[m].size,
    stimulatingReps: stimTally[m],
  })).filter((v) => v.sets > 0);

  const notes = [
    "Build ~80% of your running easy (Zone 2) and ~20% hard (intervals/tempo) — the polarised model most endurance research supports.",
    "Keep one hard day between quality sessions; never stack intervals on back-to-back days.",
    d >= 4
      ? "The strength-support day preserves muscle, running economy and injury resistance — keep it heavy but low-volume."
      : "Add a short strength-support session (squat, hinge, press, core) on a non-running day if you can.",
    "Progress by adding ~10% weekly volume at most, with an easier recovery week every 4th week.",
  ];

  return {
    goal: "endurance",
    daysPerWeek: d,
    splitLabel: "Endurance / running",
    splitPattern: "Polarised: easy volume + 2 quality days",
    days,
    volume,
    minFrequency: volume.length ? Math.min(...volume.map((v) => v.frequency)) : 0,
    notes,
  };
}
