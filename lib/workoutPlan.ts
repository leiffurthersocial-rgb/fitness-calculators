/**
 * lib/workoutPlan.ts
 * ------------------
 * A pragmatic weekly workout-plan generator. It ties the rest of the app
 * together: pick a goal (or let a sport/position pick one for you), and it
 * builds a split, applies a goal-appropriate set/rep/intensity scheme, biases
 * volume toward your weak lifts, and — if you enter your 1RMs — computes the
 * actual working weight for each main lift (via training-max percentages).
 *
 * Pure logic only (no React). Weights come in/out as kg; round at the UI.
 */

import { roundToIncrement } from "./formulas";
import { SPORTS_DB } from "./buildRater";

export type Goal = "strength" | "power" | "hypertrophy" | "endurance" | "athletic";
export type MainLift = "squat" | "bench" | "deadlift" | "ohp";
export type Pattern =
  | "squat"
  | "hinge"
  | "hpush"
  | "vpush"
  | "hpull"
  | "vpull"
  | "lunge"
  | "core"
  | "plyo"
  | "conditioning";

export const GOALS: { key: Goal; label: string; blurb: string }[] = [
  { key: "strength", label: "Max strength", blurb: "Heavy, low reps (3–5)" },
  { key: "power", label: "Explosive power", blurb: "Fast reps + plyometrics" },
  { key: "hypertrophy", label: "Muscle / hypertrophy", blurb: "Moderate reps (8–12)" },
  { key: "endurance", label: "Muscular endurance", blurb: "High reps + conditioning" },
  { key: "athletic", label: "All-round athletic", blurb: "Strength + power + a little conditioning" },
];

interface GoalScheme {
  mainSets: number;
  mainReps: string;
  mainPct: number; // % of 1RM for main lifts
  accSets: number;
  accReps: string;
  restSec: number;
  plyo: boolean;
  conditioning: boolean;
}

const GOAL_SCHEMES: Record<Goal, GoalScheme> = {
  strength: { mainSets: 5, mainReps: "3–5", mainPct: 0.85, accSets: 3, accReps: "6–8", restSec: 180, plyo: false, conditioning: false },
  power: { mainSets: 6, mainReps: "3", mainPct: 0.72, accSets: 3, accReps: "5–6", restSec: 150, plyo: true, conditioning: false },
  hypertrophy: { mainSets: 4, mainReps: "8–10", mainPct: 0.72, accSets: 3, accReps: "10–12", restSec: 90, plyo: false, conditioning: false },
  endurance: { mainSets: 3, mainReps: "15–20", mainPct: 0.55, accSets: 2, accReps: "15–20", restSec: 45, plyo: false, conditioning: true },
  athletic: { mainSets: 4, mainReps: "5", mainPct: 0.8, accSets: 3, accReps: "8–10", restSec: 120, plyo: true, conditioning: true },
};

interface ExDef {
  name: string;
  pattern: Pattern;
  mainLift?: MainLift; // ties the exercise to a 1RM for weight calc
  role: "main" | "accessory";
}

// A small exercise library keyed by movement pattern.
const E = {
  squat: { name: "Back squat", pattern: "squat", mainLift: "squat", role: "main" } as ExDef,
  frontSquat: { name: "Front squat", pattern: "squat", mainLift: "squat", role: "main" } as ExDef,
  deadlift: { name: "Deadlift", pattern: "hinge", mainLift: "deadlift", role: "main" } as ExDef,
  rdl: { name: "Romanian deadlift", pattern: "hinge", role: "accessory" } as ExDef,
  bench: { name: "Bench press", pattern: "hpush", mainLift: "bench", role: "main" } as ExDef,
  incline: { name: "Incline bench press", pattern: "hpush", mainLift: "bench", role: "main" } as ExDef,
  ohp: { name: "Overhead press", pattern: "vpush", mainLift: "ohp", role: "main" } as ExDef,
  dbPress: { name: "DB shoulder press", pattern: "vpush", role: "accessory" } as ExDef,
  row: { name: "Barbell row", pattern: "hpull", role: "accessory" } as ExDef,
  pullup: { name: "Pull-up / lat pulldown", pattern: "vpull", role: "accessory" } as ExDef,
  facepull: { name: "Face pull", pattern: "hpull", role: "accessory" } as ExDef,
  lunge: { name: "Walking lunge", pattern: "lunge", role: "accessory" } as ExDef,
  splitSquat: { name: "Bulgarian split squat", pattern: "lunge", role: "accessory" } as ExDef,
  core: { name: "Hanging leg raise + plank", pattern: "core", role: "accessory" } as ExDef,
  curl: { name: "Biceps curl + triceps pushdown", pattern: "hpull", role: "accessory" } as ExDef,
};

// Day templates per training frequency. Each day is a label + ordered exercises.
function splitFor(days: number): { label: string; exercises: ExDef[] }[] {
  if (days <= 3) {
    return [
      { label: "Full body A", exercises: [E.squat, E.bench, E.row, E.core] },
      { label: "Full body B", exercises: [E.deadlift, E.ohp, E.pullup, E.lunge] },
      { label: "Full body C", exercises: [E.frontSquat, E.incline, E.row, E.core] },
    ];
  }
  if (days === 4) {
    return [
      { label: "Lower (strength)", exercises: [E.squat, E.rdl, E.lunge, E.core] },
      { label: "Upper (push)", exercises: [E.bench, E.ohp, E.row, E.curl] },
      { label: "Lower (power)", exercises: [E.deadlift, E.frontSquat, E.splitSquat, E.core] },
      { label: "Upper (pull)", exercises: [E.incline, E.pullup, E.dbPress, E.facepull] },
    ];
  }
  // 5 days
  return [
    { label: "Lower (squat)", exercises: [E.squat, E.rdl, E.lunge, E.core] },
    { label: "Upper (bench)", exercises: [E.bench, E.row, E.dbPress, E.curl] },
    { label: "Lower (hinge)", exercises: [E.deadlift, E.frontSquat, E.splitSquat, E.core] },
    { label: "Upper (press/pull)", exercises: [E.ohp, E.pullup, E.incline, E.facepull] },
    { label: "Athletic / accessory", exercises: [E.lunge, E.pullup, E.facepull, E.core] },
  ];
}

export interface PlanExercise {
  name: string;
  sets: number;
  reps: string;
  pct?: number; // % of 1RM (main lifts only)
  weightKg?: number; // computed if 1RM provided
  emphasised: boolean; // bumped because it's a weak point
}

export interface PlanDay {
  label: string;
  exercises: PlanExercise[];
  finisher?: string;
}

export interface WorkoutPlan {
  goal: Goal;
  daysPerWeek: number;
  days: PlanDay[];
  notes: string[];
}

export interface PlanInput {
  goal: Goal;
  daysPerWeek: number;
  incrementKg: number; // rounding for weights (2.5 metric / 2.27 imperial)
  oneRMs?: Partial<Record<MainLift, number>>; // kg
  // Optional weak lifts to emphasise (e.g. from the build rater / standards).
  weakLifts?: MainLift[];
}

/** Suggest a default goal from a sport's dominant attribute group weighting. */
export function goalForSport(sportKey: string, positionKey: string): Goal {
  const sport = SPORTS_DB.find((s) => s.key === sportKey);
  const pos = sport?.positions.find((p) => p.key === positionKey) ?? sport?.positions[0];
  if (!pos) return "athletic";
  const w = pos.weights;
  // Highest-weighted performance group decides the emphasis.
  const max = Math.max(w.strength, w.power, w.endurance);
  if (max === 0) return "athletic";
  if (w.endurance === max && w.endurance >= 0.4) return "endurance";
  if (w.power === max && w.power >= 0.35) return "power";
  if (w.strength === max && w.strength >= 0.45) return "strength";
  return "athletic";
}

export function generatePlan(input: PlanInput): WorkoutPlan {
  const scheme = GOAL_SCHEMES[input.goal];
  const weak = new Set(input.weakLifts ?? []);
  const split = splitFor(input.daysPerWeek);

  const days: PlanDay[] = split.map((day) => {
    const exercises: PlanExercise[] = day.exercises.map((ex, i) => {
      const isMain = ex.role === "main" || i === 0;
      const emphasised = !!ex.mainLift && weak.has(ex.mainLift);

      const sets = (isMain ? scheme.mainSets : scheme.accSets) + (emphasised ? 1 : 0);
      const reps = isMain ? scheme.mainReps : scheme.accReps;
      const pct = isMain && ex.mainLift ? scheme.mainPct : undefined;

      let weightKg: number | undefined;
      const oneRM = ex.mainLift ? input.oneRMs?.[ex.mainLift] : undefined;
      if (pct && oneRM && oneRM > 0) {
        weightKg = roundToIncrement(oneRM * pct, input.incrementKg);
      }
      return { name: ex.name, sets, reps, pct, weightKg, emphasised };
    });

    let finisher: string | undefined;
    if (scheme.plyo) finisher = "Plyometrics: 4×3 box jumps or broad jumps (full rest)";
    if (scheme.conditioning)
      finisher = finisher
        ? finisher + " · 10 min easy conditioning"
        : "Conditioning: 15–20 min intervals (e.g. 30s hard / 90s easy)";

    return { label: day.label, exercises, finisher };
  });

  const notes: string[] = [];
  notes.push(
    `Main lifts at ${Math.round(scheme.mainPct * 100)}% of 1RM for ${scheme.mainSets}×${scheme.mainReps}; rest ~${scheme.restSec >= 60 ? scheme.restSec / 60 + " min" : scheme.restSec + "s"} on heavy sets.`
  );
  if (weak.size)
    notes.push(
      `Extra set added to your weak lift${weak.size > 1 ? "s" : ""}: ${[...weak].join(", ")}.`
    );
  notes.push(
    "Progress weekly: add ~2.5 kg / 5 lb to a lift when you hit the top of the rep range across all sets."
  );
  notes.push("Warm up each main lift with 2–3 ramping sets before your working weight.");

  return { goal: input.goal, daysPerWeek: input.daysPerWeek, days, notes };
}
