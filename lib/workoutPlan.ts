/**
 * lib/workoutPlan.ts
 * ------------------
 * An evidence-based weekly workout-plan generator. It ties the app together:
 * pick a goal (or let a sport/position pick one), and it builds a split,
 * applies a goal-appropriate scheme, biases volume toward weak lifts, computes
 * working weights from your 1RMs, and reports the weekly set volume per muscle.
 *
 * Programming principles baked in (current hypertrophy/strength literature):
 *   • Frequency: each muscle is trained ~2× per week — at matched volume that
 *     beats once-weekly "bro splits" for hypertrophy, and it lets you put more
 *     quality sets in per session.
 *   • Volume landmarks: ~10–20 hard sets per muscle per week is the productive
 *     hypertrophy range; strength needs fewer, heavier sets.
 *   • Proximity to failure: sets are taken to a target RIR (reps in reserve),
 *     not grinding to failure every set.
 *   • Intensity: hypertrophy grows across 6–20 reps if effort is high; strength
 *     lives at ≥80% 1RM and low reps; power is sub-maximal and explosive.
 *   • Rest: 2–3 min on compounds (more rest → more volume → more growth).
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
  | "ppl3"
  | "upperLower"
  | "antPost"
  | "pushPull"
  | "pplUL"
  | "upperLowerFull";
export type Equipment = "full" | "dumbbell" | "bodyweight";
export type Muscle =
  | "Quads"
  | "Hamstrings"
  | "Glutes"
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Arms"
  | "Core";

export const GOALS: { key: Goal; label: string; blurb: string }[] = [
  { key: "strength", label: "Max strength", blurb: "Heavy, low reps (3–5)" },
  { key: "power", label: "Explosive power", blurb: "Fast reps + plyometrics" },
  { key: "hypertrophy", label: "Muscle / hypertrophy", blurb: "6–15 reps, 2×/week each muscle" },
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
  mainPct: number; // % of 1RM for main lifts
  accSets: number;
  accReps: string;
  rir: string; // proximity to failure
  restSec: number; // rest on the main compound
  plyo: boolean;
  conditioning: boolean;
}

const GOAL_SCHEMES: Record<LiftingGoal, GoalScheme> = {
  // Heavy & neural — low reps, near-maximal, long rest, leave 1–2 in the tank.
  strength: { mainSets: 5, mainReps: "3–5", mainPct: 0.85, accSets: 3, accReps: "6–8", rir: "1–2 RIR", restSec: 180, plyo: false, conditioning: false },
  // Sub-maximal speed work + jumps; quality over fatigue.
  power: { mainSets: 6, mainReps: "3", mainPct: 0.7, accSets: 3, accReps: "5", rir: "explosive, 3+ RIR", restSec: 180, plyo: true, conditioning: false },
  // 6–15 reps with high effort; each muscle hit ~2×/week, ~2 min rest.
  hypertrophy: { mainSets: 4, mainReps: "6–10", mainPct: 0.75, accSets: 3, accReps: "10–15", rir: "1–3 RIR", restSec: 120, plyo: false, conditioning: false },
  // Mixed quality strength/power with a little conditioning.
  athletic: { mainSets: 4, mainReps: "4–6", mainPct: 0.8, accSets: 3, accReps: "8–12", rir: "1–2 RIR", restSec: 150, plyo: true, conditioning: true },
};

interface ExDef {
  name: string;
  db?: string; // dumbbell variant
  bw?: string; // bodyweight variant
  pattern: string;
  mainLift?: MainLift; // ties to a 1RM for weight calc (barbell only)
  role: "main" | "accessory";
  primary: Muscle[]; // direct movers — count as a full set
  secondary?: Muscle[]; // assisting movers — count as a half set
}

// Exercise library, with dumbbell & bodyweight swaps for the equipment toggle.
// Primary vs secondary movers feed an accurate weekly set count (secondary
// involvement, e.g. triceps on a press, counts as half a direct set).
const E = {
  squat: { name: "Back squat", db: "Goblet / DB squat", bw: "Pistol / split squat", pattern: "squat", mainLift: "squat", role: "main", primary: ["Quads"], secondary: ["Glutes"] } as ExDef,
  frontSquat: { name: "Front squat", db: "DB front squat", bw: "Bulgarian split squat", pattern: "squat", mainLift: "squat", role: "main", primary: ["Quads"], secondary: ["Glutes"] } as ExDef,
  deadlift: { name: "Deadlift", db: "DB Romanian deadlift", bw: "Single-leg hip thrust", pattern: "hinge", mainLift: "deadlift", role: "main", primary: ["Hamstrings", "Glutes", "Back"] } as ExDef,
  rdl: { name: "Romanian deadlift", db: "DB RDL", bw: "Single-leg RDL", pattern: "hinge", role: "accessory", primary: ["Hamstrings"], secondary: ["Glutes"] } as ExDef,
  bench: { name: "Bench press", db: "DB bench press", bw: "Push-up (weighted/decline)", pattern: "hpush", mainLift: "bench", role: "main", primary: ["Chest"], secondary: ["Arms", "Shoulders"] } as ExDef,
  incline: { name: "Incline bench press", db: "Incline DB press", bw: "Decline push-up", pattern: "hpush", mainLift: "bench", role: "main", primary: ["Chest", "Shoulders"], secondary: ["Arms"] } as ExDef,
  ohp: { name: "Overhead press", db: "DB shoulder press", bw: "Pike / handstand push-up", pattern: "vpush", mainLift: "ohp", role: "main", primary: ["Shoulders"], secondary: ["Arms"] } as ExDef,
  dbPress: { name: "DB shoulder press", db: "DB shoulder press", bw: "Pike push-up", pattern: "vpush", role: "accessory", primary: ["Shoulders"], secondary: ["Arms"] } as ExDef,
  row: { name: "Barbell row", db: "DB row", bw: "Inverted row", pattern: "hpull", role: "accessory", primary: ["Back"], secondary: ["Arms"] } as ExDef,
  pullup: { name: "Pull-up / lat pulldown", db: "DB pullover + row", bw: "Pull-up / inverted row", pattern: "vpull", role: "accessory", primary: ["Back"], secondary: ["Arms"] } as ExDef,
  facepull: { name: "Face pull", db: "DB rear-delt raise", bw: "Band pull-apart", pattern: "hpull", role: "accessory", primary: ["Shoulders"], secondary: ["Back"] } as ExDef,
  lunge: { name: "Walking lunge", db: "DB walking lunge", bw: "Reverse lunge", pattern: "lunge", role: "accessory", primary: ["Quads"], secondary: ["Glutes"] } as ExDef,
  splitSquat: { name: "Bulgarian split squat", db: "DB split squat", bw: "Bulgarian split squat", pattern: "lunge", role: "accessory", primary: ["Quads"], secondary: ["Glutes"] } as ExDef,
  core: { name: "Hanging leg raise + plank", db: "Weighted plank + leg raise", bw: "Hollow hold + plank", pattern: "core", role: "accessory", primary: ["Core"] } as ExDef,
  arms: { name: "Biceps curl + triceps pushdown", db: "DB curl + overhead extension", bw: "Chin-up + dip", pattern: "arms", role: "accessory", primary: ["Arms"] } as ExDef,
};

type DayTemplate = { label: string; exercises: ExDef[] };

/**
 * Split registry. Each split is valid for a specific training frequency and
 * every split keeps each muscle at ~2× per week. The UI only offers the splits
 * that make sense for the chosen number of days.
 */
const SPLIT_DEFS: Record<Split, { label: string; days: number; make: () => DayTemplate[] }> = {
  fullbody: {
    label: "Full body", days: 3,
    make: () => [
      { label: "Full body A", exercises: [E.squat, E.bench, E.row, E.core] },
      { label: "Full body B", exercises: [E.deadlift, E.ohp, E.pullup, E.lunge] },
      { label: "Full body C", exercises: [E.frontSquat, E.incline, E.row, E.arms] },
    ],
  },
  ppl3: {
    label: "Push / Pull / Legs", days: 3,
    make: () => [
      { label: "Push", exercises: [E.bench, E.ohp, E.dbPress, E.arms] },
      { label: "Pull", exercises: [E.deadlift, E.row, E.pullup, E.facepull] },
      { label: "Legs", exercises: [E.squat, E.rdl, E.lunge, E.core] },
    ],
  },
  upperLower: {
    label: "Upper / Lower", days: 4,
    make: () => [
      { label: "Lower A", exercises: [E.squat, E.rdl, E.lunge, E.core] },
      { label: "Upper A", exercises: [E.bench, E.ohp, E.row, E.arms] },
      { label: "Lower B", exercises: [E.deadlift, E.frontSquat, E.splitSquat, E.core] },
      { label: "Upper B", exercises: [E.incline, E.pullup, E.dbPress, E.facepull] },
    ],
  },
  antPost: {
    label: "Anterior / Posterior", days: 4,
    make: () => [
      { label: "Anterior A", exercises: [E.squat, E.bench, E.ohp, E.core] },
      { label: "Posterior A", exercises: [E.deadlift, E.row, E.pullup, E.rdl] },
      { label: "Anterior B", exercises: [E.frontSquat, E.incline, E.dbPress, E.lunge] },
      { label: "Posterior B", exercises: [E.rdl, E.pullup, E.facepull, E.core] },
    ],
  },
  pushPull: {
    label: "Push / Pull", days: 4,
    make: () => [
      { label: "Push A", exercises: [E.bench, E.ohp, E.squat, E.arms] },
      { label: "Pull A", exercises: [E.deadlift, E.row, E.pullup, E.rdl] },
      { label: "Push B", exercises: [E.incline, E.dbPress, E.lunge, E.arms] },
      { label: "Pull B", exercises: [E.pullup, E.row, E.facepull, E.core] },
    ],
  },
  pplUL: {
    label: "PPL + Upper / Lower", days: 5,
    make: () => [
      { label: "Push", exercises: [E.bench, E.ohp, E.dbPress, E.arms] },
      { label: "Pull", exercises: [E.row, E.pullup, E.facepull, E.arms] },
      { label: "Legs", exercises: [E.squat, E.rdl, E.lunge, E.core] },
      { label: "Upper", exercises: [E.incline, E.pullup, E.ohp, E.facepull] },
      { label: "Lower", exercises: [E.deadlift, E.frontSquat, E.splitSquat, E.core] },
    ],
  },
  upperLowerFull: {
    label: "Upper / Lower / Full", days: 5,
    make: () => [
      { label: "Upper A", exercises: [E.bench, E.row, E.ohp, E.pullup] },
      { label: "Lower A", exercises: [E.squat, E.rdl, E.lunge, E.core] },
      { label: "Full body", exercises: [E.deadlift, E.incline, E.pullup, E.arms] },
      { label: "Upper B", exercises: [E.incline, E.pullup, E.dbPress, E.facepull] },
      { label: "Lower B", exercises: [E.frontSquat, E.rdl, E.splitSquat, E.core] },
    ],
  },
};

/** Splits available for a given training frequency (in display order). */
export function availableSplits(days: number): { key: Split; label: string }[] {
  return (Object.keys(SPLIT_DEFS) as Split[])
    .filter((k) => SPLIT_DEFS[k].days === days)
    .map((k) => ({ key: k, label: SPLIT_DEFS[k].label }));
}

export function defaultSplit(days: number): Split {
  return availableSplits(days)[0]?.key ?? "fullbody";
}

function splitFor(days: number, split: Split): DayTemplate[] {
  const def = SPLIT_DEFS[split];
  if (!def || def.days !== days) return SPLIT_DEFS[defaultSplit(days)].make();
  return def.make();
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
}

export interface PlanDay {
  label: string;
  exercises: PlanExercise[];
}

export interface VolumeRow {
  muscle: Muscle;
  sets: number; // weekly working sets
  frequency: number; // sessions per week hitting it
}

export interface WorkoutPlan {
  goal: Goal;
  daysPerWeek: number;
  splitLabel: string;
  days: PlanDay[];
  volume: VolumeRow[];
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

const MUSCLES: Muscle[] = ["Quads", "Hamstrings", "Glutes", "Chest", "Back", "Shoulders", "Arms", "Core"];

/** Productive weekly set range per muscle for the goal (for the volume readout). */
export function volumeTarget(goal: Goal): { min: number; max: number; label: string } {
  if (goal === "hypertrophy") return { min: 10, max: 20, label: "10–20 sets/week is the hypertrophy sweet spot" };
  if (goal === "strength" || goal === "power") return { min: 6, max: 12, label: "6–12 hard sets/week supports strength" };
  return { min: 8, max: 16, label: "8–16 sets/week for balanced development" };
}

export function generatePlan(input: PlanInput): WorkoutPlan {
  if (input.goal === "endurance") return enduranceProgram(input);

  const scheme = GOAL_SCHEMES[input.goal];
  const weak = new Set(input.weakLifts ?? []);
  const split = splitFor(input.daysPerWeek, input.split);
  const splitLabel = SPLIT_DEFS[input.split]?.days === input.daysPerWeek
    ? SPLIT_DEFS[input.split].label
    : SPLIT_DEFS[defaultSplit(input.daysPerWeek)].label;
  const cap = input.maxSets && input.maxSets > 0 ? input.maxSets : Infinity;

  // Tallies for weekly volume per muscle.
  const setTally: Record<Muscle, number> = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>;
  const freqTally: Record<Muscle, Set<number>> = Object.fromEntries(MUSCLES.map((m) => [m, new Set<number>()])) as Record<Muscle, Set<number>>;

  const exName = (ex: ExDef) =>
    input.equipment === "dumbbell" ? ex.db ?? ex.name
    : input.equipment === "bodyweight" ? ex.bw ?? ex.name
    : ex.name;

  const days: PlanDay[] = split.map((day, dayIdx) => {
    // First pass: build the lifts with their planned set counts.
    const built = day.exercises.map((ex, i) => {
      const isMain = ex.role === "main" || i === 0;
      const emphasised = !!ex.mainLift && weak.has(ex.mainLift);
      const sets = (isMain ? scheme.mainSets : scheme.accSets) + (emphasised ? 1 : 0);
      return { ex, isMain, emphasised, sets };
    });

    // Apply the per-session set cap by trimming accessories first (min 2),
    // then mains (min 3), so the hardest, most useful work survives.
    let total = built.reduce((s, b) => s + b.sets, 0);
    while (total > cap) {
      let trimmed = false;
      for (let j = built.length - 1; j >= 0; j--) {
        const floor = built[j].isMain ? 3 : 2;
        if (built[j].sets > floor) { built[j].sets--; total--; trimmed = true; break; }
      }
      if (!trimmed) break;
    }

    const lifts: PlanExercise[] = built.map((b) => {
      const reps = b.isMain ? scheme.mainReps : scheme.accReps;
      const pct = b.isMain && b.ex.mainLift && input.equipment === "full" ? scheme.mainPct : undefined;
      let weightKg: number | undefined;
      const oneRM = b.ex.mainLift ? input.oneRMs?.[b.ex.mainLift] : undefined;
      if (pct && oneRM && oneRM > 0) weightKg = roundToIncrement(oneRM * pct, input.incrementKg);

      // Accrue volume — primary movers full, secondary movers half.
      for (const m of b.ex.primary) { setTally[m] += b.sets; freqTally[m].add(dayIdx); }
      for (const m of b.ex.secondary ?? []) { setTally[m] += b.sets * 0.5; freqTally[m].add(dayIdx); }

      return { name: exName(b.ex), kind: "lift" as const, sets: b.sets, reps, rir: scheme.rir, pct, weightKg, emphasised: b.emphasised };
    });

    // Plyometrics go on leg-focused days, as their own row.
    const isLegDay = day.exercises.some((e) => ["squat", "hinge", "lunge"].includes(e.pattern));
    const rows: PlanExercise[] = [];
    if (scheme.plyo && isLegDay)
      rows.push({ name: "Box / broad jumps", kind: "plyo", sets: 4, reps: "3", rir: "max intent", prescription: "4×3, full rest — explode every rep" });
    rows.push(...lifts);
    if (scheme.conditioning)
      rows.push({ name: "Conditioning", kind: "cardio", prescription: "12–18 min intervals (30s hard / 90s easy)" });

    return { label: day.label, exercises: rows };
  });

  const volume: VolumeRow[] = MUSCLES.map((m) => ({ muscle: m, sets: setTally[m], frequency: freqTally[m].size })).filter((v) => v.sets > 0);

  const vt = volumeTarget(input.goal);
  const notes: string[] = [];
  notes.push(`Every muscle is trained ~2× per week — at matched volume that out-grows once-weekly splits. ${vt.label}.`);
  notes.push(`Take most sets to ${scheme.rir} (stop a rep or two short of failure); push the last set of an exercise closest to failure.`);
  notes.push(`Main lifts: ${scheme.mainSets}×${scheme.mainReps}${input.equipment === "full" ? ` at ~${Math.round(scheme.mainPct * 100)}% 1RM` : ""}; rest ~${scheme.restSec >= 60 ? scheme.restSec / 60 + " min" : scheme.restSec + "s"} on compounds.`);
  if (cap !== Infinity) notes.push(`Capped at ${cap} working sets per session — accessories were trimmed first to fit.`);
  if (weak.size) notes.push(`Extra set added to your weak lift${weak.size > 1 ? "s" : ""}: ${[...weak].join(", ")}.`);
  notes.push("Progress weekly: add reps until you reach the top of the range on all sets, then add ~2.5 kg / 5 lb.");
  notes.push("Deload every 4–6 weeks (halve the sets, drop intensity) to manage fatigue.");

  return { goal: input.goal, daysPerWeek: input.daysPerWeek, splitLabel, days, volume, notes };
}

/* ---- Endurance / running program (cardio-led, with strength support) ---- */
function enduranceProgram(input: PlanInput): WorkoutPlan {
  const d = input.daysPerWeek;
  const cardio = (name: string, prescription: string): PlanExercise => ({ name, kind: "cardio", prescription });

  const RUNS = {
    intervals: cardio("Interval session", "6×800 m @ 5K pace, 90s jog recovery (~40 min)"),
    tempo: cardio("Tempo run", "20–30 min @ comfortably hard (Zone 4)"),
    easy: cardio("Easy run", "30–45 min conversational (Zone 2)"),
    long: cardio("Long run", "60–90 min easy (Zone 2)"),
    fartlek: cardio("Fartlek", "8×(1 min hard / 2 min easy) + warm-up/cool-down"),
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
      return { name: exName(ex), kind: "lift", sets: 3, reps: "5", rir: "2 RIR", pct, weightKg };
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
  const freqTally: Record<Muscle, Set<number>> = Object.fromEntries(MUSCLES.map((m) => [m, new Set<number>()])) as Record<Muscle, Set<number>>;
  days.forEach((day, idx) => {
    for (const pick of [E.squat, E.deadlift, E.bench, E.core]) {
      if (day.exercises.some((e) => e.name === exName(pick) && e.kind === "lift")) {
        for (const m of pick.primary) { setTally[m] += 3; freqTally[m].add(idx); }
        for (const m of pick.secondary ?? []) { setTally[m] += 1.5; freqTally[m].add(idx); }
      }
    }
  });
  const volume: VolumeRow[] = MUSCLES.map((m) => ({ muscle: m, sets: setTally[m], frequency: freqTally[m].size })).filter((v) => v.sets > 0);

  const notes = [
    "Build ~80% of your running easy (Zone 2) and ~20% hard (intervals/tempo) — the polarised model most endurance research supports.",
    "Keep one hard day between quality sessions; never stack intervals on back-to-back days.",
    d >= 4
      ? "The strength-support day preserves muscle, running economy and injury resistance — keep it heavy but low-volume."
      : "Add a short strength-support session (squat, hinge, press, core) on a non-running day if you can.",
    "Progress by adding ~10% weekly volume at most, with an easier recovery week every 4th week.",
  ];

  return { goal: "endurance", daysPerWeek: d, splitLabel: "Endurance / running", days, volume, notes };
}
