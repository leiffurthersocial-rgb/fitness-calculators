/**
 * lib/exercises.ts
 * ----------------
 * Muscles and an exercise library for hypertrophy programming.
 *
 * Each exercise lists:
 * - `muscles`: fractional set credit — 1 for the prime mover(s), 0.5 for
 *   meaningful synergists (Pelland et al. found fractional counting predicts
 *   hypertrophy best).
 * - `efficiency` (0.7–1): how well a set turns into stimulating reps for the
 *   prime movers. Following Beardsley, a set only stimulates a muscle if that
 *   muscle is what limits the set, so stable machines/cables where the target
 *   muscle fails first score highest; balance, grip, lower-back or synergist
 *   limits and poor resistance curves score lower.
 * - `fatigue`: systemic fatigue per hard set (≈0.4 small isolation → 2 deadlift).
 * - `notes`: the reasons behind the efficiency rating.
 */

export type MuscleId =
  | "chest"
  | "upper-chest"
  | "front-delts"
  | "side-delts"
  | "rear-delts"
  | "lats"
  | "upper-back"
  | "traps"
  | "lower-back"
  | "biceps"
  | "triceps"
  | "forearms"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "adductors"
  | "calves"
  | "abs"
  | "obliques";

export type MuscleRegion = "Chest" | "Shoulders" | "Back" | "Arms" | "Legs" | "Core";

export interface Muscle {
  id: MuscleId;
  name: string;
  detail: string;
  region: MuscleRegion;
  /** Weight in a routine's overall rating (1 = large, visible muscle). */
  weight: number;
}

export const MUSCLES: Muscle[] = [
  { id: "chest", name: "Chest", detail: "Mid & lower pecs (sternal head)", region: "Chest", weight: 1 },
  { id: "upper-chest", name: "Upper chest", detail: "Clavicular pecs", region: "Chest", weight: 0.5 },
  { id: "front-delts", name: "Front delts", detail: "Anterior deltoid", region: "Shoulders", weight: 0.5 },
  { id: "side-delts", name: "Side delts", detail: "Lateral deltoid — shoulder width", region: "Shoulders", weight: 1 },
  { id: "rear-delts", name: "Rear delts", detail: "Posterior deltoid", region: "Shoulders", weight: 0.5 },
  { id: "lats", name: "Lats", detail: "Back width — vertical pulls, tucked rows", region: "Back", weight: 1 },
  { id: "upper-back", name: "Mid back", detail: "Mid traps & rhomboids — back thickness", region: "Back", weight: 1 },
  { id: "traps", name: "Upper traps", detail: "Neck/yoke — shrugs", region: "Back", weight: 0.25 },
  { id: "lower-back", name: "Lower back", detail: "Spinal erectors", region: "Back", weight: 0.25 },
  { id: "biceps", name: "Biceps", detail: "Biceps & brachialis — elbow flexors", region: "Arms", weight: 0.75 },
  { id: "triceps", name: "Triceps", detail: "All three heads", region: "Arms", weight: 0.75 },
  { id: "forearms", name: "Forearms", detail: "Brachioradialis & wrist muscles", region: "Arms", weight: 0.25 },
  { id: "quads", name: "Quads", detail: "Front of thigh", region: "Legs", weight: 1 },
  { id: "hamstrings", name: "Hamstrings", detail: "Back of thigh", region: "Legs", weight: 1 },
  { id: "glutes", name: "Glutes", detail: "Glute max (& medius)", region: "Legs", weight: 1 },
  { id: "adductors", name: "Adductors", detail: "Inner thigh", region: "Legs", weight: 0.25 },
  { id: "calves", name: "Calves", detail: "Gastrocnemius & soleus", region: "Legs", weight: 0.5 },
  { id: "abs", name: "Abs", detail: "Rectus abdominis", region: "Core", weight: 0.5 },
  { id: "obliques", name: "Obliques", detail: "Side of the waist", region: "Core", weight: 0.25 },
];

export const MUSCLE_BY_ID = Object.fromEntries(MUSCLES.map((m) => [m.id, m])) as Record<MuscleId, Muscle>;
export const MUSCLE_REGIONS: MuscleRegion[] = ["Chest", "Shoulders", "Back", "Arms", "Legs", "Core"];

export type ExerciseCategory =
  | "Chest"
  | "Shoulders"
  | "Back — lats (width)"
  | "Back — mid back & traps (thickness)"
  | "Back — lower back"
  | "Biceps"
  | "Triceps"
  | "Forearms"
  | "Quads"
  | "Hamstrings"
  | "Glutes & adductors"
  | "Calves"
  | "Core";

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  "Chest",
  "Shoulders",
  "Back — lats (width)",
  "Back — mid back & traps (thickness)",
  "Back — lower back",
  "Biceps",
  "Triceps",
  "Forearms",
  "Quads",
  "Hamstrings",
  "Glutes & adductors",
  "Calves",
  "Core",
];

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  muscles: Partial<Record<MuscleId, number>>;
  efficiency: number;
  fatigue: number;
  notes: string[];
}

/* Reasons, reused across exercises. */
const STABLE = "Stable: machine or cable";
const LIMITER = "Target muscle fails first";
const STRETCH = "Loads the stretched position";
const CURVE = "Tension through the whole range";
const WEAK_CURVE = "Little tension at one end of the range";
const BALANCE = "Balance or stability demand";
const GRIP = "Grip can give out first";
const BACK = "Lower back can limit";
const SYNERGIST = "Helper muscles may fail first";
const LOADING = "Hard to load progressively";
const HEAVY = "High systemic fatigue";
const SHORT = "Short range of motion";

const ex = (
  id: string,
  name: string,
  category: ExerciseCategory,
  muscles: Exercise["muscles"],
  efficiency: number,
  fatigue: number,
  notes: string[]
): Exercise => ({ id, name, category, muscles, efficiency, fatigue, notes });

const FLAT_PRESS = { chest: 1, "upper-chest": 0.5, "front-delts": 0.5, triceps: 0.5 } as const;
const INCLINE_PRESS = { "upper-chest": 1, chest: 0.5, "front-delts": 0.5, triceps: 0.5 } as const;
const OVERHEAD_PRESS = { "front-delts": 1, "side-delts": 0.5, triceps: 0.5 } as const;
const VERTICAL_PULL = { lats: 1, "upper-back": 0.5, biceps: 0.5 } as const;
const TUCKED_ROW = { lats: 1, "upper-back": 0.5, biceps: 0.5 } as const;
const WIDE_ROW = { "upper-back": 1, lats: 0.5, "rear-delts": 0.5, biceps: 0.5 } as const;
const SQUAT = { quads: 1, glutes: 0.5, adductors: 0.5 } as const;
const HINGE = { hamstrings: 1, glutes: 0.5, "lower-back": 0.5 } as const;

export const EXERCISES: Exercise[] = [
  // ---- Chest ----
  ex("bench-press", "Barbell bench press", "Chest", FLAT_PRESS, 0.9, 1.3, [SYNERGIST, "Free weight, but a fixed path"]),
  ex("db-bench", "Dumbbell bench press", "Chest", FLAT_PRESS, 0.9, 1.1, [STRETCH, BALANCE]),
  ex("machine-chest", "Machine chest press", "Chest", FLAT_PRESS, 1, 1, [STABLE, LIMITER]),
  ex("smith-bench", "Smith machine bench press", "Chest", FLAT_PRESS, 0.95, 1.1, [STABLE]),
  ex("incline-bench", "Incline barbell press", "Chest", INCLINE_PRESS, 0.9, 1.3, [SYNERGIST]),
  ex("incline-db", "Incline dumbbell press", "Chest", INCLINE_PRESS, 0.9, 1.1, [STRETCH, BALANCE]),
  ex("incline-machine", "Incline machine press", "Chest", INCLINE_PRESS, 1, 1, [STABLE, LIMITER]),
  ex("smith-incline", "Smith machine incline press", "Chest", INCLINE_PRESS, 0.95, 1.1, [STABLE]),
  ex("dips", "Chest dip", "Chest", { chest: 1, "front-delts": 0.5, triceps: 0.5 }, 0.85, 1.1, [STRETCH, LOADING]),
  ex("push-up", "Push-up", "Chest", FLAT_PRESS, 0.85, 0.8, [LOADING]),
  ex("cable-fly", "Cable fly", "Chest", { chest: 1, "upper-chest": 0.5 }, 0.95, 0.6, [STABLE, LIMITER, CURVE]),
  ex("low-high-fly", "Low-to-high cable fly", "Chest", { "upper-chest": 1, chest: 0.5 }, 0.95, 0.6, [STABLE, LIMITER]),
  ex("pec-deck", "Pec deck", "Chest", { chest: 1, "upper-chest": 0.5 }, 1, 0.6, [STABLE, LIMITER, CURVE]),
  ex("db-fly", "Dumbbell fly", "Chest", { chest: 1 }, 0.85, 0.7, [STRETCH, WEAK_CURVE]),

  // ---- Shoulders ----
  ex("ohp", "Overhead press (barbell)", "Shoulders", OVERHEAD_PRESS, 0.85, 1.3, [BALANCE, BACK, SYNERGIST]),
  ex("db-shoulder-press", "Dumbbell shoulder press", "Shoulders", OVERHEAD_PRESS, 0.9, 1.1, [BALANCE]),
  ex("machine-shoulder-press", "Machine shoulder press", "Shoulders", OVERHEAD_PRESS, 1, 1, [STABLE, LIMITER]),
  ex("front-raise", "Front raise", "Shoulders", { "front-delts": 1 }, 0.9, 0.5, [LIMITER, WEAK_CURVE]),
  ex("lateral-raise", "Dumbbell lateral raise", "Shoulders", { "side-delts": 1 }, 0.85, 0.5, [LIMITER, WEAK_CURVE]),
  ex("cable-lateral", "Cable lateral raise", "Shoulders", { "side-delts": 1 }, 1, 0.5, [STABLE, LIMITER, STRETCH]),
  ex("machine-lateral", "Machine lateral raise", "Shoulders", { "side-delts": 1 }, 1, 0.5, [STABLE, LIMITER, CURVE]),
  ex("y-raise", "Cable Y-raise", "Shoulders", { "side-delts": 1, "upper-back": 0.5 }, 0.95, 0.5, [STABLE]),
  ex("upright-row", "Cable upright row", "Shoulders", { "side-delts": 1, traps: 0.5, biceps: 0.5 }, 0.9, 0.8, [SYNERGIST]),
  ex("rear-delt-fly", "Dumbbell reverse fly", "Shoulders", { "rear-delts": 1, "upper-back": 0.5 }, 0.85, 0.5, [WEAK_CURVE]),
  ex("reverse-pec-deck", "Reverse pec deck", "Shoulders", { "rear-delts": 1, "upper-back": 0.5 }, 1, 0.5, [STABLE, LIMITER]),
  ex("cable-rear-delt", "Cable rear delt fly", "Shoulders", { "rear-delts": 1 }, 1, 0.5, [STABLE, LIMITER, CURVE]),
  ex("face-pull", "Face pull", "Shoulders", { "rear-delts": 1, "upper-back": 0.5 }, 0.9, 0.5, [STABLE, SYNERGIST]),

  // ---- Back — lats (width) ----
  ex("pull-up", "Pull-up", "Back — lats (width)", VERTICAL_PULL, 0.85, 1.2, [GRIP, LOADING]),
  ex("chin-up", "Chin-up", "Back — lats (width)", { lats: 1, biceps: 0.5, "upper-back": 0.5 }, 0.85, 1.2, [GRIP, SYNERGIST]),
  ex("lat-pulldown", "Lat pulldown (wide grip)", "Back — lats (width)", VERTICAL_PULL, 0.95, 1, [STABLE]),
  ex("neutral-pulldown", "Neutral-grip pulldown", "Back — lats (width)", VERTICAL_PULL, 0.95, 1, [STABLE, STRETCH]),
  ex("single-arm-pulldown", "Single-arm cable pulldown", "Back — lats (width)", { lats: 1, biceps: 0.5 }, 1, 0.8, [STABLE, LIMITER, STRETCH]),
  ex("straight-arm-pulldown", "Straight-arm pulldown", "Back — lats (width)", { lats: 1 }, 0.9, 0.6, [STABLE, LIMITER, WEAK_CURVE]),
  ex("pullover", "Machine / cable pullover", "Back — lats (width)", { lats: 1 }, 1, 0.6, [STABLE, LIMITER, STRETCH]),
  ex("db-row", "One-arm dumbbell row", "Back — lats (width)", TUCKED_ROW, 0.9, 1, [STRETCH, GRIP]),
  ex("cable-row", "Seated cable row (close grip)", "Back — lats (width)", TUCKED_ROW, 0.95, 1, [STABLE]),
  ex("single-arm-cable-row", "Single-arm cable row", "Back — lats (width)", TUCKED_ROW, 1, 0.8, [STABLE, LIMITER, STRETCH]),
  ex("meadows-row", "Meadows row", "Back — lats (width)", { lats: 1, "upper-back": 0.5, "rear-delts": 0.5, biceps: 0.5 }, 0.9, 1, [STRETCH, GRIP]),

  // ---- Back — mid back & traps (thickness) ----
  ex("barbell-row", "Barbell row", "Back — mid back & traps (thickness)", { ...WIDE_ROW, "lower-back": 0.5 }, 0.85, 1.4, [BACK, GRIP, HEAVY]),
  ex("pendlay-row", "Pendlay row", "Back — mid back & traps (thickness)", { ...WIDE_ROW, "lower-back": 0.5 }, 0.85, 1.4, [BACK, HEAVY]),
  ex("t-bar-row", "T-bar row", "Back — mid back & traps (thickness)", { ...WIDE_ROW, "lower-back": 0.5 }, 0.9, 1.2, [BACK]),
  ex("chest-supported-row", "Chest-supported row (elbows wide)", "Back — mid back & traps (thickness)", WIDE_ROW, 1, 0.9, [STABLE, LIMITER]),
  ex("seal-row", "Seal row", "Back — mid back & traps (thickness)", WIDE_ROW, 0.95, 0.9, [STABLE]),
  ex("wide-cable-row", "Wide-grip cable row", "Back — mid back & traps (thickness)", WIDE_ROW, 0.95, 0.9, [STABLE]),
  ex("machine-row", "Machine row", "Back — mid back & traps (thickness)", WIDE_ROW, 1, 0.9, [STABLE, LIMITER]),
  ex("kelso-shrug", "Kelso shrug", "Back — mid back & traps (thickness)", { "upper-back": 1, "rear-delts": 0.5 }, 0.95, 0.6, [LIMITER, SHORT]),
  ex("shrug", "Barbell / dumbbell shrug", "Back — mid back & traps (thickness)", { traps: 1, forearms: 0.5 }, 0.9, 0.7, [GRIP, SHORT]),
  ex("cable-shrug", "Cable / machine shrug", "Back — mid back & traps (thickness)", { traps: 1 }, 1, 0.6, [STABLE, LIMITER]),

  // ---- Back — lower back ----
  ex("deadlift", "Deadlift", "Back — lower back", { glutes: 1, "lower-back": 1, hamstrings: 0.5, quads: 0.5, traps: 0.5, forearms: 0.5 }, 0.75, 2, [HEAVY, GRIP, SYNERGIST]),
  ex("rack-pull", "Rack pull", "Back — lower back", { "lower-back": 1, traps: 0.5, glutes: 0.5, forearms: 0.5 }, 0.8, 1.6, [HEAVY, GRIP, SHORT]),
  ex("back-ext-spinal", "Back extension (rounded back)", "Back — lower back", { "lower-back": 1, glutes: 0.5 }, 0.9, 0.7, [LIMITER]),

  // ---- Biceps ----
  ex("barbell-curl", "Barbell curl", "Biceps", { biceps: 1, forearms: 0.5 }, 0.9, 0.5, [LIMITER, WEAK_CURVE]),
  ex("ez-curl", "EZ-bar curl", "Biceps", { biceps: 1, forearms: 0.5 }, 0.9, 0.5, [LIMITER, WEAK_CURVE]),
  ex("db-curl", "Dumbbell curl", "Biceps", { biceps: 1, forearms: 0.5 }, 0.9, 0.5, [LIMITER, WEAK_CURVE]),
  ex("incline-curl", "Incline dumbbell curl", "Biceps", { biceps: 1 }, 0.95, 0.5, [LIMITER, STRETCH]),
  ex("bayesian-curl", "Bayesian cable curl", "Biceps", { biceps: 1 }, 1, 0.5, [STABLE, LIMITER, STRETCH]),
  ex("cable-curl", "Cable curl", "Biceps", { biceps: 1 }, 1, 0.5, [STABLE, LIMITER, CURVE]),
  ex("preacher-curl", "Preacher curl", "Biceps", { biceps: 1 }, 1, 0.5, [STABLE, LIMITER, STRETCH]),
  ex("machine-curl", "Machine curl", "Biceps", { biceps: 1 }, 1, 0.5, [STABLE, LIMITER]),
  ex("spider-curl", "Spider curl", "Biceps", { biceps: 1 }, 0.95, 0.5, [LIMITER]),
  ex("concentration-curl", "Concentration curl", "Biceps", { biceps: 1 }, 0.95, 0.4, [LIMITER]),
  ex("hammer-curl", "Hammer curl", "Biceps", { biceps: 1, forearms: 0.5 }, 0.9, 0.5, ["Brachialis & brachioradialis bias", WEAK_CURVE]),

  // ---- Triceps ----
  ex("pushdown", "Triceps pushdown", "Triceps", { triceps: 1 }, 1, 0.5, [STABLE, LIMITER]),
  ex("overhead-extension", "Overhead cable extension", "Triceps", { triceps: 1 }, 1, 0.5, [STABLE, LIMITER, STRETCH]),
  ex("db-overhead-extension", "Overhead dumbbell extension", "Triceps", { triceps: 1 }, 0.9, 0.5, [STRETCH, WEAK_CURVE]),
  ex("skullcrusher", "Skullcrusher", "Triceps", { triceps: 1 }, 0.9, 0.6, [LIMITER, STRETCH]),
  ex("cross-body-extension", "Cable cross-body extension", "Triceps", { triceps: 1 }, 0.95, 0.5, [STABLE, LIMITER]),
  ex("kickback", "Cable kickback", "Triceps", { triceps: 1 }, 0.9, 0.4, [STABLE, SHORT]),
  ex("jm-press", "JM press", "Triceps", { triceps: 1, chest: 0.5 }, 0.9, 0.8, [LIMITER]),
  ex("close-grip-bench", "Close-grip bench press", "Triceps", { triceps: 1, chest: 0.5, "front-delts": 0.5 }, 0.85, 1.1, [SYNERGIST]),
  ex("triceps-dip", "Triceps dip (upright)", "Triceps", { triceps: 1, chest: 0.5, "front-delts": 0.5 }, 0.85, 0.9, [LOADING]),

  // ---- Forearms ----
  ex("wrist-curl", "Wrist curl", "Forearms", { forearms: 1 }, 0.9, 0.3, [LIMITER, SHORT]),
  ex("reverse-wrist-curl", "Reverse wrist curl", "Forearms", { forearms: 1 }, 0.9, 0.3, [LIMITER, SHORT]),
  ex("reverse-curl", "Reverse curl", "Forearms", { forearms: 1, biceps: 0.5 }, 0.9, 0.5, ["Brachioradialis bias"]),
  ex("farmer-carry", "Farmer's carry", "Forearms", { forearms: 1, traps: 0.5 }, 0.7, 1.2, [LOADING, HEAVY]),

  // ---- Quads ----
  ex("squat", "Back squat", "Quads", SQUAT, 0.85, 1.6, [BALANCE, BACK, HEAVY]),
  ex("front-squat", "Front squat", "Quads", SQUAT, 0.85, 1.5, [BALANCE, "Upper back can limit"]),
  ex("hack-squat", "Hack squat", "Quads", SQUAT, 1, 1.2, [STABLE, LIMITER, STRETCH]),
  ex("pendulum-squat", "Pendulum squat", "Quads", SQUAT, 1, 1.2, [STABLE, LIMITER, STRETCH]),
  ex("belt-squat", "Belt squat", "Quads", SQUAT, 0.95, 1.1, [STABLE, "No spinal loading"]),
  ex("smith-squat", "Smith machine squat", "Quads", SQUAT, 0.95, 1.2, [STABLE]),
  ex("leg-press", "Leg press", "Quads", SQUAT, 0.95, 1.1, [STABLE]),
  ex("bulgarian-split-squat", "Bulgarian split squat", "Quads", SQUAT, 0.85, 1.2, [BALANCE, STRETCH, "Cardio can limit"]),
  ex("lunge", "Walking lunge", "Quads", { quads: 1, glutes: 0.5, adductors: 0.5 }, 0.8, 1.2, [BALANCE, "Cardio can limit"]),
  ex("step-up", "Step-up", "Quads", { quads: 1, glutes: 0.5 }, 0.8, 1, [BALANCE]),
  ex("leg-extension", "Leg extension", "Quads", { quads: 1 }, 0.95, 0.5, [STABLE, LIMITER, "Rectus femoris bias"]),
  ex("sissy-squat", "Sissy squat", "Quads", { quads: 1 }, 0.85, 0.6, [STRETCH, BALANCE]),

  // ---- Hamstrings ----
  ex("rdl", "Romanian deadlift", "Hamstrings", HINGE, 0.85, 1.4, [STRETCH, GRIP, BACK]),
  ex("sldl", "Stiff-leg deadlift", "Hamstrings", HINGE, 0.85, 1.4, [STRETCH, GRIP, BACK]),
  ex("single-leg-rdl", "Single-leg RDL", "Hamstrings", { hamstrings: 1, glutes: 0.5 }, 0.8, 1, [BALANCE, STRETCH]),
  ex("good-morning", "Good morning", "Hamstrings", HINGE, 0.8, 1.3, [BACK, STRETCH]),
  ex("seated-leg-curl", "Seated leg curl", "Hamstrings", { hamstrings: 1 }, 1, 0.5, [STABLE, LIMITER, STRETCH]),
  ex("lying-leg-curl", "Lying leg curl", "Hamstrings", { hamstrings: 1 }, 0.95, 0.5, [STABLE, LIMITER]),
  ex("nordic-curl", "Nordic curl", "Hamstrings", { hamstrings: 1 }, 0.85, 0.7, [LOADING]),
  ex("ghr", "Glute-ham raise", "Hamstrings", { hamstrings: 1, glutes: 0.5 }, 0.9, 0.8, [LIMITER]),

  // ---- Glutes & adductors ----
  ex("hip-thrust", "Hip thrust", "Glutes & adductors", { glutes: 1 }, 0.9, 0.9, [LIMITER, "Little tension when stretched"]),
  ex("back-extension", "45° back extension (glute bias)", "Glutes & adductors", { glutes: 1, hamstrings: 0.5, "lower-back": 0.5 }, 0.9, 0.7, [STRETCH]),
  ex("reverse-hyper", "Reverse hyper", "Glutes & adductors", { glutes: 1, hamstrings: 0.5, "lower-back": 0.5 }, 0.9, 0.7, [LIMITER]),
  ex("cable-kickback", "Cable glute kickback", "Glutes & adductors", { glutes: 1 }, 0.9, 0.4, [STABLE, BALANCE]),
  ex("hip-abduction", "Hip abduction machine", "Glutes & adductors", { glutes: 1 }, 0.9, 0.4, [STABLE, "Glute medius only"]),
  ex("adductor-machine", "Adductor machine", "Glutes & adductors", { adductors: 1 }, 1, 0.5, [STABLE, LIMITER, STRETCH]),

  // ---- Calves ----
  ex("standing-calf", "Standing calf raise", "Calves", { calves: 1 }, 0.95, 0.4, [STABLE, STRETCH]),
  ex("seated-calf", "Seated calf raise", "Calves", { calves: 1 }, 0.9, 0.4, [STABLE, "Soleus bias"]),
  ex("leg-press-calf", "Leg-press calf raise", "Calves", { calves: 1 }, 0.95, 0.4, [STABLE, STRETCH]),
  ex("donkey-calf", "Donkey calf raise", "Calves", { calves: 1 }, 0.95, 0.4, [STABLE, STRETCH]),
  ex("single-leg-calf", "Single-leg calf raise", "Calves", { calves: 1 }, 0.85, 0.3, [BALANCE]),

  // ---- Core ----
  ex("cable-crunch", "Cable crunch", "Core", { abs: 1 }, 1, 0.4, [STABLE, LIMITER]),
  ex("machine-crunch", "Machine crunch", "Core", { abs: 1 }, 1, 0.4, [STABLE, LIMITER]),
  ex("decline-situp", "Weighted decline sit-up", "Core", { abs: 1 }, 0.9, 0.5, ["Hip flexors help"]),
  ex("hanging-leg-raise", "Hanging leg raise", "Core", { abs: 1 }, 0.8, 0.5, [GRIP, "Hip flexors can limit"]),
  ex("ab-wheel", "Ab wheel rollout", "Core", { abs: 1 }, 0.85, 0.5, [LOADING, STRETCH]),
  ex("cable-woodchop", "Cable woodchop", "Core", { obliques: 1, abs: 0.5 }, 0.9, 0.4, [STABLE]),
  ex("side-bend", "Dumbbell side bend", "Core", { obliques: 1 }, 0.9, 0.4, [LIMITER]),
];

export const EXERCISE_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e])) as Record<string, Exercise>;

/** Prime-mover exercises for a muscle, best first (efficiency, then lower fatigue). */
export function bestExercisesFor(muscle: MuscleId): Exercise[] {
  return EXERCISES.filter((e) => e.muscles[muscle] === 1).sort(
    (a, b) => b.efficiency - a.efficiency || a.fatigue - b.fatigue
  );
}

export function suggestExercise(muscle: MuscleId): Exercise | undefined {
  return bestExercisesFor(muscle)[0];
}
