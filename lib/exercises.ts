/**
 * lib/exercises.ts
 * ----------------
 * Muscle groups and an exercise library mapping each exercise to the muscles
 * it trains, using fractional set counting: a set counts as 1 set for the
 * prime mover(s) and 0.5 for meaningful synergists. Isolation exercises count
 * only for their target muscle.
 */

export type MuscleId =
  | "chest"
  | "front-delts"
  | "side-delts"
  | "rear-delts"
  | "lats"
  | "upper-back"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "abs";

export interface Muscle {
  id: MuscleId;
  name: string;
  region: "Upper" | "Arms" | "Lower" | "Core";
  /** Larger muscles weigh more in a routine's overall rating. */
  major: boolean;
}

export const MUSCLES: Muscle[] = [
  { id: "chest", name: "Chest", region: "Upper", major: true },
  { id: "front-delts", name: "Front delts", region: "Upper", major: false },
  { id: "side-delts", name: "Side delts", region: "Upper", major: true },
  { id: "rear-delts", name: "Rear delts", region: "Upper", major: false },
  { id: "lats", name: "Lats", region: "Upper", major: true },
  { id: "upper-back", name: "Upper back", region: "Upper", major: true },
  { id: "biceps", name: "Biceps", region: "Arms", major: false },
  { id: "triceps", name: "Triceps", region: "Arms", major: false },
  { id: "quads", name: "Quads", region: "Lower", major: true },
  { id: "hamstrings", name: "Hamstrings", region: "Lower", major: true },
  { id: "glutes", name: "Glutes", region: "Lower", major: true },
  { id: "calves", name: "Calves", region: "Lower", major: false },
  { id: "abs", name: "Abs", region: "Core", major: false },
];

export const MUSCLE_BY_ID = Object.fromEntries(MUSCLES.map((m) => [m.id, m])) as Record<MuscleId, Muscle>;

export type ExerciseCategory = "Chest" | "Shoulders" | "Back" | "Arms" | "Legs" | "Core";

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  /** Fractional set credit per muscle (1 = prime mover, 0.5 = synergist). */
  muscles: Partial<Record<MuscleId, number>>;
}

const ex = (id: string, name: string, category: ExerciseCategory, muscles: Exercise["muscles"]): Exercise => ({
  id,
  name,
  category,
  muscles,
});

const PRESS = { chest: 1, "front-delts": 0.5, triceps: 0.5 } as const;
const VERTICAL_PULL = { lats: 1, "upper-back": 0.5, biceps: 0.5 } as const;
const ROW = { "upper-back": 1, lats: 0.5, "rear-delts": 0.5, biceps: 0.5 } as const;
const SQUAT = { quads: 1, glutes: 0.5 } as const;

export const EXERCISES: Exercise[] = [
  // Chest
  ex("bench-press", "Barbell bench press", "Chest", PRESS),
  ex("incline-bench", "Incline barbell press", "Chest", PRESS),
  ex("db-bench", "Dumbbell bench press", "Chest", PRESS),
  ex("incline-db", "Incline dumbbell press", "Chest", PRESS),
  ex("machine-chest", "Machine chest press", "Chest", PRESS),
  ex("dips", "Dips", "Chest", PRESS),
  ex("push-up", "Push-up", "Chest", PRESS),
  ex("cable-fly", "Cable fly", "Chest", { chest: 1 }),
  ex("pec-deck", "Pec deck", "Chest", { chest: 1 }),
  // Shoulders
  ex("ohp", "Overhead press", "Shoulders", { "front-delts": 1, "side-delts": 0.5, triceps: 0.5 }),
  ex("db-shoulder-press", "Dumbbell shoulder press", "Shoulders", { "front-delts": 1, "side-delts": 0.5, triceps: 0.5 }),
  ex("lateral-raise", "Dumbbell lateral raise", "Shoulders", { "side-delts": 1 }),
  ex("cable-lateral", "Cable lateral raise", "Shoulders", { "side-delts": 1 }),
  ex("machine-lateral", "Machine lateral raise", "Shoulders", { "side-delts": 1 }),
  ex("rear-delt-fly", "Reverse fly", "Shoulders", { "rear-delts": 1, "upper-back": 0.5 }),
  ex("face-pull", "Face pull", "Shoulders", { "rear-delts": 1, "upper-back": 0.5 }),
  // Back
  ex("pull-up", "Pull-up", "Back", VERTICAL_PULL),
  ex("chin-up", "Chin-up", "Back", VERTICAL_PULL),
  ex("lat-pulldown", "Lat pulldown", "Back", VERTICAL_PULL),
  ex("barbell-row", "Barbell row", "Back", ROW),
  ex("db-row", "One-arm dumbbell row", "Back", { lats: 1, "upper-back": 0.5, biceps: 0.5 }),
  ex("cable-row", "Seated cable row", "Back", ROW),
  ex("chest-supported-row", "Chest-supported row", "Back", ROW),
  ex("pullover", "Cable pullover", "Back", { lats: 1 }),
  ex("shrug", "Shrug", "Back", { "upper-back": 1 }),
  // Arms
  ex("barbell-curl", "Barbell curl", "Arms", { biceps: 1 }),
  ex("db-curl", "Dumbbell curl", "Arms", { biceps: 1 }),
  ex("incline-curl", "Incline dumbbell curl", "Arms", { biceps: 1 }),
  ex("preacher-curl", "Preacher curl", "Arms", { biceps: 1 }),
  ex("hammer-curl", "Hammer curl", "Arms", { biceps: 1 }),
  ex("pushdown", "Triceps pushdown", "Arms", { triceps: 1 }),
  ex("overhead-extension", "Overhead triceps extension", "Arms", { triceps: 1 }),
  ex("skullcrusher", "Skullcrusher", "Arms", { triceps: 1 }),
  ex("close-grip-bench", "Close-grip bench press", "Arms", { triceps: 1, chest: 0.5, "front-delts": 0.5 }),
  // Legs
  ex("squat", "Back squat", "Legs", SQUAT),
  ex("front-squat", "Front squat", "Legs", SQUAT),
  ex("hack-squat", "Hack squat", "Legs", SQUAT),
  ex("leg-press", "Leg press", "Legs", SQUAT),
  ex("bulgarian-split-squat", "Bulgarian split squat", "Legs", SQUAT),
  ex("lunge", "Walking lunge", "Legs", SQUAT),
  ex("leg-extension", "Leg extension", "Legs", { quads: 1 }),
  ex("deadlift", "Deadlift", "Legs", { glutes: 1, hamstrings: 0.5, quads: 0.5, "upper-back": 0.5 }),
  ex("rdl", "Romanian deadlift", "Legs", { hamstrings: 1, glutes: 0.5 }),
  ex("lying-leg-curl", "Lying leg curl", "Legs", { hamstrings: 1 }),
  ex("seated-leg-curl", "Seated leg curl", "Legs", { hamstrings: 1 }),
  ex("nordic-curl", "Nordic curl", "Legs", { hamstrings: 1 }),
  ex("hip-thrust", "Hip thrust", "Legs", { glutes: 1 }),
  ex("back-extension", "45° back extension", "Legs", { glutes: 1, hamstrings: 0.5 }),
  ex("standing-calf", "Standing calf raise", "Legs", { calves: 1 }),
  ex("seated-calf", "Seated calf raise", "Legs", { calves: 1 }),
  // Core
  ex("cable-crunch", "Cable crunch", "Core", { abs: 1 }),
  ex("hanging-leg-raise", "Hanging leg raise", "Core", { abs: 1 }),
  ex("ab-wheel", "Ab wheel rollout", "Core", { abs: 1 }),
];

export const EXERCISE_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e])) as Record<string, Exercise>;

export const EXERCISE_CATEGORIES: ExerciseCategory[] = ["Chest", "Shoulders", "Back", "Arms", "Legs", "Core"];

/** Best direct exercise to suggest for a muscle (first isolation, else first compound). */
export function suggestExercise(muscle: MuscleId): Exercise | undefined {
  const direct = EXERCISES.filter((e) => e.muscles[muscle] === 1);
  return direct.find((e) => Object.keys(e.muscles).length === 1) ?? direct[0];
}
