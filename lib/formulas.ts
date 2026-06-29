/**
 * lib/formulas.ts
 * ----------------
 * Every calculation used anywhere in the app lives here, kept deliberately
 * pure (no React, no DOM) and heavily commented so the formulas are easy to
 * read and tweak. Units are explicit in each function signature: weights in
 * kilograms, distances in meters, times in seconds/minutes as noted.
 *
 * Convert at the UI boundary (see lib/units.ts) and pass canonical metric
 * values into these functions.
 */

/* ========================================================================
 * STRENGTH
 * ====================================================================== */

/** Epley 1RM estimate: 1RM = w × (1 + reps/30). Exact at 1 rep. */
export function epley1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

/** Brzycki 1RM estimate: 1RM = w × 36 / (37 − reps). Breaks down ≥37 reps. */
export function brzycki1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  if (reps >= 37) return weight; // formula undefined/negative beyond this
  return (weight * 36) / (37 - reps);
}

export type OneRMFormula = "epley" | "brzycki" | "average";

/** Estimate a 1RM from a weight×reps set using the chosen formula. */
export function estimate1RM(
  weight: number,
  reps: number,
  formula: OneRMFormula
): number {
  const e = epley1RM(weight, reps);
  const b = brzycki1RM(weight, reps);
  if (formula === "epley") return e;
  if (formula === "brzycki") return b;
  return (e + b) / 2; // default: average of both
}

/**
 * Invert Epley to estimate the weight you could lift for `reps` given a 1RM.
 * From 1RM = w(1 + r/30)  =>  w = 1RM / (1 + r/30).
 * We use Epley for the rep-max table because it inverts cleanly for all reps.
 */
export function weightForReps(oneRM: number, reps: number): number {
  if (reps <= 1) return oneRM;
  return oneRM / (1 + reps / 30);
}

/** A full estimated rep-max table for 1..maxReps reps. */
export function repMaxTable(
  oneRM: number,
  maxReps = 10
): { reps: number; weight: number }[] {
  const rows = [];
  for (let r = 1; r <= maxReps; r++) {
    rows.push({ reps: r, weight: weightForReps(oneRM, r) });
  }
  return rows;
}

/** Round a load to the nearest usable increment (e.g. 2.5 kg or 5 lb). */
export function roundToIncrement(value: number, increment: number): number {
  if (increment <= 0) return value;
  return Math.round(value / increment) * increment;
}

/**
 * Plate-loading solver. Given a target total bar weight, the bar weight and a
 * list of available plate sizes (per single plate), return the plates to put
 * on ONE side, plus whatever weight could not be matched.
 */
export function platesPerSide(
  target: number,
  barWeight: number,
  availablePlates: number[]
): { plates: number[]; achievable: boolean; loadedTotal: number } {
  // Weight that must be split across the two sides.
  let perSide = (target - barWeight) / 2;
  if (perSide < 0) {
    return { plates: [], achievable: false, loadedTotal: barWeight };
  }
  const plates: number[] = [];
  // Greedy from heaviest plate down — optimal for standard plate sets.
  const sorted = [...availablePlates].sort((a, b) => b - a);
  for (const plate of sorted) {
    while (perSide >= plate - 1e-9) {
      plates.push(plate);
      perSide -= plate;
    }
  }
  const loadedTotal = barWeight + 2 * plates.reduce((s, p) => s + p, 0);
  return { plates, achievable: perSide < 1e-6, loadedTotal };
}

/**
 * DOTS score — a modern bodyweight-adjusted strength coefficient (the
 * successor to Wilks). score = total × coefficient, where the coefficient is
 * 500 / polynomial(bodyweight). Coefficients differ by sex.
 * Valid roughly for bodyweights 40–210 kg.
 */
export function dotsScore(
  total: number,
  bodyweightKg: number,
  sex: "male" | "female"
): number {
  const bw = Math.min(Math.max(bodyweightKg, 40), 210);
  // Polynomial coefficients a..e for DOTS (a is the x^4 term).
  const C =
    sex === "male"
      ? [-0.000001093, 0.0007391293, -0.1918759221, 24.0900756, -307.75076]
      : [-0.0000010706, 0.0005158568, -0.1126655495, 13.6175032, -57.96288];
  const denom =
    C[0] * bw ** 4 + C[1] * bw ** 3 + C[2] * bw ** 2 + C[3] * bw + C[4];
  return total * (500 / denom);
}

/* ========================================================================
 * CARDIO
 * ====================================================================== */

/** Cooper 12-minute test. distance in meters. */
export function vo2maxCooper(distanceMeters: number): number {
  return (distanceMeters - 504.9) / 44.73;
}

/** Resting HR method. Uses estimated max HR / resting HR. */
export function vo2maxRestingHR(maxHR: number, restingHR: number): number {
  if (restingHR <= 0) return 0;
  return 15.3 * (maxHR / restingHR);
}

/** 1.5-mile run test. time in minutes. */
export function vo2maxMileAndHalf(timeMinutes: number): number {
  if (timeMinutes <= 0) return 0;
  return 3.5 + 483 / timeMinutes;
}

/** Max HR — Tanaka (preferred): 208 − 0.7 × age. */
export function maxHRTanaka(age: number): number {
  return 208 - 0.7 * age;
}

/** Max HR — classic Fox: 220 − age. */
export function maxHRClassic(age: number): number {
  return 220 - age;
}

/**
 * Karvonen target HR using heart-rate reserve:
 * target = ((maxHR − restingHR) × intensity) + restingHR.
 * intensity is a fraction 0..1.
 */
export function karvonenTarget(
  maxHR: number,
  restingHR: number,
  intensity: number
): number {
  return (maxHR - restingHR) * intensity + restingHR;
}

/** Simple percent-of-max target (when no resting HR available). */
export function percentMaxTarget(maxHR: number, intensity: number): number {
  return maxHR * intensity;
}

export interface HRZone {
  zone: number;
  name: string;
  trains: string;
  lowPct: number;
  highPct: number;
  lowBpm: number;
  highBpm: number;
}

/** The five training zones with what each one develops. */
export function hrZones(
  maxHR: number,
  restingHR: number,
  method: "karvonen" | "percent"
): HRZone[] {
  const defs: Omit<HRZone, "lowBpm" | "highBpm">[] = [
    { zone: 1, name: "Very light", trains: "Recovery & warm-up", lowPct: 0.5, highPct: 0.6 },
    { zone: 2, name: "Light", trains: "Fat burn & base aerobic", lowPct: 0.6, highPct: 0.7 },
    { zone: 3, name: "Moderate", trains: "Aerobic endurance", lowPct: 0.7, highPct: 0.8 },
    { zone: 4, name: "Hard", trains: "Anaerobic threshold", lowPct: 0.8, highPct: 0.9 },
    { zone: 5, name: "Maximum", trains: "VO₂max & peak power", lowPct: 0.9, highPct: 1.0 },
  ];
  const calc = (pct: number) =>
    method === "karvonen"
      ? karvonenTarget(maxHR, restingHR, pct)
      : percentMaxTarget(maxHR, pct);
  return defs.map((d) => ({
    ...d,
    lowBpm: calc(d.lowPct),
    highBpm: calc(d.highPct),
  }));
}

/**
 * Riegel race-time predictor:
 * T2 = T1 × (D2 / D1)^1.06.
 * Times in seconds, distances in meters.
 */
export function riegelPredict(
  knownTimeSec: number,
  knownDistM: number,
  targetDistM: number
): number {
  if (knownDistM <= 0) return 0;
  return knownTimeSec * Math.pow(targetDistM / knownDistM, 1.06);
}

/** Pace in seconds per kilometer from time (s) and distance (m). */
export function paceSecPerKm(timeSec: number, distM: number): number {
  if (distM <= 0) return 0;
  return timeSec / (distM / 1000);
}

/* ========================================================================
 * RUNNING — VDOT & TRAINING PACES (Jack Daniels)
 * ----------------------------------------------------------------------
 * From a single race or field-test result we derive VDOT, a VO2max-like
 * fitness score, then turn it into training-zone paces. The two core
 * equations are Daniels & Gilbert's: the oxygen cost of running at a
 * velocity, and the fraction of VO2max a runner can sustain for a given
 * duration. Paces below are a percentage of velocity at VO2max (vVO2max),
 * calibrated to reproduce Daniels' published tables within a few sec/km —
 * a guide to train "around", not lab-exact prescriptions.
 * ====================================================================== */

/** Oxygen cost (ml/kg/min) of running at v meters/minute (Daniels–Gilbert). */
function danielsVO2(vMetersPerMin: number): number {
  return -4.6 + 0.182258 * vMetersPerMin + 0.000104 * vMetersPerMin * vMetersPerMin;
}

/** Fraction of VO2max sustainable for a race of t minutes (Daniels–Gilbert). */
function danielsPercentMax(tMinutes: number): number {
  return (
    0.8 +
    0.1894393 * Math.exp(-0.012778 * tMinutes) +
    0.2989558 * Math.exp(-0.1932605 * tMinutes)
  );
}

/** Invert the VO2 polynomial: the velocity (m/min) that costs `vo2` ml/kg/min. */
function velocityForVO2(vo2: number): number {
  // 0.000104 v² + 0.182258 v − (4.6 + vo2) = 0  → positive quadratic root.
  const a = 0.000104;
  const b = 0.182258;
  const c = -(4.6 + vo2);
  const disc = b * b - 4 * a * c;
  if (disc <= 0) return 0;
  return (-b + Math.sqrt(disc)) / (2 * a);
}

/**
 * VDOT from a race/test performance. A Cooper 12-min test is just a race of
 * 720 s, so it feeds straight in here too. Returns 0 on invalid input.
 */
export function vdotFromRace(distMeters: number, timeSec: number): number {
  if (distMeters <= 0 || timeSec <= 0) return 0;
  const tMin = timeSec / 60;
  const v = distMeters / tMin; // m/min
  const pct = danielsPercentMax(tMin);
  if (pct <= 0) return 0;
  return danielsVO2(v) / pct;
}

/** Velocity at VO2max (m/min) for a given VDOT. */
export function vVO2max(vdot: number): number {
  return velocityForVO2(vdot);
}

/** Training pace (sec/km) at a fraction of vVO2max for the given VDOT. */
export function runPaceForFraction(vdot: number, fraction: number): number {
  const v = vVO2max(vdot) * fraction;
  if (v <= 0) return 0;
  return (1000 / v) * 60;
}

/**
 * The race time (seconds) that would yield this VDOT at a given distance.
 * Solved by bisection since the sustainable %VO2max depends on duration.
 */
export function timeForVdotAtDistance(vdot: number, distMeters: number): number {
  if (vdot <= 0 || distMeters <= 0) return 0;
  let lo = 20; // 20 s — faster than any human
  let hi = 6 * 3600; // 6 h — slower than any finish we predict
  // VDOT decreases monotonically as the time for a fixed distance grows.
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (vdotFromRace(distMeters, mid) > vdot) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface RunZone {
  key: string;
  name: string;
  /** What the zone develops / how to use it. */
  trains: string;
  /** Fraction-of-vVO2max bounds (faster = higher fraction). */
  lowFrac: number;
  highFrac: number;
}

/**
 * The five Daniels training intensities, as fractions of vVO2max. Bounds are
 * tuned so the resulting paces track his published VDOT tables closely.
 */
export const RUN_ZONES: RunZone[] = [
  {
    key: "easy",
    name: "Easy / Long",
    trains: "Most weekly miles. Conversational — builds the aerobic base and aids recovery.",
    lowFrac: 0.74,
    highFrac: 0.79,
  },
  {
    key: "marathon",
    name: "Marathon",
    trains: "Steady long efforts at marathon goal pace.",
    lowFrac: 0.84,
    highFrac: 0.88,
  },
  {
    key: "threshold",
    name: "Threshold",
    trains: "Comfortably hard tempo, ~20–40 min. Lifts your lactate threshold.",
    lowFrac: 0.9,
    highFrac: 0.92,
  },
  {
    key: "interval",
    name: "Interval",
    trains: "3–5 min hard reps with equal jog recovery. Develops VO₂max.",
    lowFrac: 0.97,
    highFrac: 1.0,
  },
  {
    key: "repetition",
    name: "Repetition",
    trains: "Short 200–400 m reps with full recovery. Sharpens speed & economy.",
    lowFrac: 1.02,
    highFrac: 1.06,
  },
];

export interface RunZonePace {
  zone: RunZone;
  fastSecPerKm: number; // at the high fraction
  slowSecPerKm: number; // at the low fraction
}

/** Training paces for every zone, derived from a VDOT. */
export function runTrainingPaces(vdot: number): RunZonePace[] {
  return RUN_ZONES.map((zone) => ({
    zone,
    fastSecPerKm: runPaceForFraction(vdot, zone.highFrac),
    slowSecPerKm: runPaceForFraction(vdot, zone.lowFrac),
  }));
}

/* ========================================================================
 * BODY & NUTRITION
 * ====================================================================== */

/** Mifflin–St Jeor BMR. weight kg, height cm, age years. */
export function bmrMifflin(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: "male" | "female"
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export const ACTIVITY_LEVELS = [
  { key: "sedentary", label: "Sedentary (little/no exercise)", multiplier: 1.2 },
  { key: "light", label: "Light (1–3 days/week)", multiplier: 1.375 },
  { key: "moderate", label: "Moderate (3–5 days/week)", multiplier: 1.55 },
  { key: "very", label: "Very active (6–7 days/week)", multiplier: 1.725 },
  { key: "extra", label: "Extra active (physical job + training)", multiplier: 1.9 },
] as const;

export function tdee(bmr: number, multiplier: number): number {
  return bmr * multiplier;
}

export type MacroGoal = "cut" | "maintain" | "bulk";

/** Calorie target for a goal, derived from TDEE. */
export function calorieTarget(tdeeVal: number, goal: MacroGoal): number {
  if (goal === "cut") return tdeeVal - 500;
  if (goal === "bulk") return tdeeVal + 300;
  return tdeeVal;
}

export interface Macros {
  proteinG: number;
  carbsG: number;
  fatG: number;
  proteinKcal: number;
  carbsKcal: number;
  fatKcal: number;
}

/**
 * Macro split: protein set by g/kg bodyweight, fat fixed at 25% of calories,
 * carbs fill the remainder. 4 kcal/g protein & carbs, 9 kcal/g fat.
 */
export function macroSplit(
  calories: number,
  bodyweightKg: number,
  proteinPerKg: number,
  fatPctOfCals = 0.25
): Macros {
  const proteinG = proteinPerKg * bodyweightKg;
  const proteinKcal = proteinG * 4;
  const fatKcal = calories * fatPctOfCals;
  const fatG = fatKcal / 9;
  const carbsKcal = Math.max(0, calories - proteinKcal - fatKcal);
  const carbsG = carbsKcal / 4;
  return { proteinG, carbsG, fatG, proteinKcal, carbsKcal, fatKcal };
}

/**
 * US Navy body-fat % (tape method). Measurements in centimeters.
 * Men:   %BF = 495 / (1.0324 − 0.19077·log10(waist−neck) + 0.15456·log10(height)) − 450
 * Women: %BF = 495 / (1.29579 − 0.35004·log10(waist+hip−neck) + 0.22100·log10(height)) − 450
 */
export function navyBodyFat(args: {
  sex: "male" | "female";
  heightCm: number;
  neckCm: number;
  waistCm: number;
  hipCm?: number;
}): number {
  const { sex, heightCm, neckCm, waistCm, hipCm = 0 } = args;
  const log10 = Math.log10;
  if (sex === "male") {
    const inner = waistCm - neckCm;
    if (inner <= 0) return 0;
    return 495 / (1.0324 - 0.19077 * log10(inner) + 0.15456 * log10(heightCm)) - 450;
  }
  const inner = waistCm + hipCm - neckCm;
  if (inner <= 0) return 0;
  return 495 / (1.29579 - 0.35004 * log10(inner) + 0.221 * log10(heightCm)) - 450;
}

/** BMI = kg / m². */
export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  if (m <= 0) return 0;
  return weightKg / (m * m);
}

export function bmiCategory(value: number): string {
  if (value < 18.5) return "Underweight";
  if (value < 25) return "Normal";
  if (value < 30) return "Overweight";
  return "Obese";
}

/** Waist-to-height ratio (both same unit). */
export function waistToHeight(waistCm: number, heightCm: number): number {
  if (heightCm <= 0) return 0;
  return waistCm / heightCm;
}

export function whtrCategory(ratio: number): string {
  if (ratio < 0.4) return "Underweight signal";
  if (ratio < 0.5) return "Healthy";
  if (ratio < 0.6) return "Increased risk";
  return "High risk";
}

/* ========================================================================
 * RECOVERY
 * ====================================================================== */

/** Caffeine remaining after `hours`, half-life ~5h: dose × 0.5^(h/5). */
export function caffeineRemaining(dose: number, hoursElapsed: number, halfLife = 5): number {
  if (hoursElapsed < 0) return dose;
  return dose * Math.pow(0.5, hoursElapsed / halfLife);
}

/** Baseline water need: ~33 ml per kg bodyweight, returned in ml. */
export function waterBaselineMl(bodyweightKg: number): number {
  return 33 * bodyweightKg;
}

/**
 * Daily water target in ml. Adds 500 ml per hour of exercise and bumps by
 * ~10% in a hot climate.
 */
export function waterTargetMl(args: {
  bodyweightKg: number;
  exerciseHours: number;
  hotClimate: boolean;
}): number {
  const { bodyweightKg, exerciseHours, hotClimate } = args;
  let ml = waterBaselineMl(bodyweightKg);
  ml += exerciseHours * 500; // mid-point of 350–700 ml/hour
  if (hotClimate) ml *= 1.1;
  return ml;
}

/* ========================================================================
 * SHARED HELPERS
 * ====================================================================== */

/** Fitness category for VO₂max by age & sex (Cooper-derived bands, ml/kg/min). */
export function vo2maxCategory(
  vo2: number,
  age: number,
  sex: "male" | "female"
): string {
  // Rough age bands; values are lower bounds for each category.
  const bands =
    sex === "male"
      ? [
          { max: 29, poor: 33, fair: 37, good: 42, exc: 46, sup: 53 },
          { max: 39, poor: 32, fair: 36, good: 41, exc: 45, sup: 49 },
          { max: 49, poor: 30, fair: 35, good: 39, exc: 43, sup: 47 },
          { max: 200, poor: 26, fair: 31, good: 36, exc: 40, sup: 44 },
        ]
      : [
          { max: 29, poor: 28, fair: 33, good: 37, exc: 41, sup: 49 },
          { max: 39, poor: 27, fair: 31, good: 35, exc: 39, sup: 45 },
          { max: 49, poor: 25, fair: 30, good: 33, exc: 36, sup: 42 },
          { max: 200, poor: 21, fair: 27, good: 31, exc: 35, sup: 41 },
        ];
  const b = bands.find((x) => age <= x.max) ?? bands[bands.length - 1];
  if (vo2 >= b.sup) return "Superior";
  if (vo2 >= b.exc) return "Excellent";
  if (vo2 >= b.good) return "Good";
  if (vo2 >= b.fair) return "Fair";
  if (vo2 >= b.poor) return "Poor";
  return "Very poor";
}

/* ========================================================================
 * STRENGTH STANDARDS  (bodyweight-, sex-, age- and sport-aware)
 * ====================================================================== */

export type Lift = "squat" | "bench" | "deadlift" | "ohp" | "pullup";

/** A lift's standards are measured either by load (kg) or by rep count. */
export type LiftUnit = "weight" | "reps";

export const LIFTS: { key: Lift; label: string; unit: LiftUnit; hint?: string }[] = [
  { key: "squat", label: "Back squat", unit: "weight" },
  { key: "bench", label: "Bench press", unit: "weight" },
  { key: "deadlift", label: "Deadlift", unit: "weight" },
  { key: "ohp", label: "Overhead press", unit: "weight" },
  {
    key: "pullup",
    label: "Pull-ups",
    unit: "reps",
    hint: "Max strict bodyweight reps in a single set",
  },
];

export type StrengthLevel =
  | "Beginner"
  | "Novice"
  | "Intermediate"
  | "Advanced"
  | "Elite";

export const STRENGTH_LEVELS: StrengthLevel[] = [
  "Beginner",
  "Novice",
  "Intermediate",
  "Advanced",
  "Elite",
];

/**
 * Approximate strength standards expressed as a 1RM multiple of bodyweight,
 * ordered [Beginner, Novice, Intermediate, Advanced, Elite]. These are a
 * transparent simplification synthesised from common published tables
 * (ExRx / Strength Level averages) — real tables also vary with bodyweight,
 * so treat these as a guide, not a verdict.
 */
type WeightLift = Exclude<Lift, "pullup">;

const STRENGTH_RATIOS: Record<"male" | "female", Record<WeightLift, number[]>> = {
  male: {
    squat: [0.6, 1.0, 1.5, 2.0, 2.5],
    bench: [0.5, 0.75, 1.0, 1.4, 1.8],
    deadlift: [0.75, 1.25, 1.75, 2.25, 2.75],
    ohp: [0.35, 0.55, 0.8, 1.05, 1.3],
  },
  female: {
    squat: [0.5, 0.75, 1.2, 1.6, 2.0],
    bench: [0.3, 0.45, 0.65, 0.9, 1.15],
    deadlift: [0.5, 1.0, 1.4, 1.85, 2.3],
    ohp: [0.2, 0.32, 0.47, 0.62, 0.8],
  },
};

/**
 * Strict bodyweight pull-up standards as a max-rep count, ordered
 * [Beginner, Novice, Intermediate, Advanced, Elite]. Reps are the natural,
 * easy-to-test unit; the targets are then bodyweight- and age-adjusted in
 * liftStandards() — heavier lifters are held to fewer reps for the same level.
 */
const PULLUP_REP_STANDARDS: Record<"male" | "female", number[]> = {
  male: [1, 5, 11, 18, 27],
  female: [1, 3, 7, 12, 19],
};

/**
 * Age scaling for strength expectations. Strength peaks ~23–30; we ramp up
 * through the teens and decline ~0.75%/yr past 30 (loosely tracking masters
 * age-grading). Used to scale the required weight for each level.
 */
export function ageStrengthFactor(age: number): number {
  if (age < 14) return 0.7;
  if (age <= 23) return 0.9 + ((age - 14) / 9) * 0.1; // 0.90 → 1.00
  if (age <= 30) return 1.0;
  return Math.max(0.55, 1 - (age - 30) * 0.0075);
}

export interface StandardRow {
  level: StrengthLevel;
  value: number; // required performance: kg for weight lifts, reps for rep lifts
  ratio?: number; // multiple of bodyweight (weight lifts only)
}

/**
 * Bodyweight scaling for strength standards. Lighter lifters are held to a
 * higher multiple of bodyweight and heavier lifters to a lower one — the same
 * pound-for-pound idea behind Wilks/DOTS, baked straight into the ratio so an
 * 80 kg and a 120 kg "Advanced" don't both sit at exactly 2× bodyweight.
 * Reference is ~80 kg (men) / 65 kg (women); the exponent keeps it gentle.
 */
export function bodyweightStrengthFactor(
  bodyweightKg: number,
  sex: "male" | "female"
): number {
  const ref = sex === "male" ? 80 : 65;
  const bw = Math.min(Math.max(bodyweightKg, 45), 160);
  return Math.pow(ref / bw, 0.33);
}

/**
 * Bodyweight scaling for pull-up rep standards. For a bodyweight exercise the
 * resistance IS your bodyweight, so each rep is intrinsically harder the more
 * you weigh — a stronger relationship than an external load lifted off the
 * floor, hence the bigger exponent than bodyweightStrengthFactor. 10 reps at
 * 40 kg and 9 reps at 70 kg are NOT equally impressive: the 70 kg lifter
 * moved far more total weight per rep, so they need fewer reps for the same
 * level and their reps carry more weight (literally) in the rating.
 */
export function pullupBodyweightFactor(
  bodyweightKg: number,
  sex: "male" | "female"
): number {
  const ref = sex === "male" ? 80 : 65;
  const bw = Math.min(Math.max(bodyweightKg, 40), 140);
  return Math.pow(ref / bw, 0.55);
}

/**
 * The five level thresholds for one lift, age- & bodyweight-adjusted. Weight
 * lifts return a required 1RM in kg (plus the ×BW ratio); pull-ups return a
 * required rep count.
 */
export function liftStandards(
  lift: Lift,
  sex: "male" | "female",
  bodyweightKg: number,
  age: number
): StandardRow[] {
  if (lift === "pullup") {
    const factor = ageStrengthFactor(age) * pullupBodyweightFactor(bodyweightKg, sex);
    return PULLUP_REP_STANDARDS[sex].map((baseReps, i) => ({
      level: STRENGTH_LEVELS[i],
      value: Math.max(1, Math.round(baseReps * factor)),
    }));
  }
  const factor = ageStrengthFactor(age) * bodyweightStrengthFactor(bodyweightKg, sex);
  return STRENGTH_RATIOS[sex][lift].map((baseRatio, i) => {
    const ratio = baseRatio * factor;
    return {
      level: STRENGTH_LEVELS[i],
      ratio,
      value: ratio * bodyweightKg,
    };
  });
}

export interface LiftClassification {
  unit: LiftUnit;
  rows: StandardRow[];
  levelIndex: number; // -1 = below Beginner
  level: StrengthLevel | "Untrained";
  ratio: number; // user's lift as a multiple of bodyweight (0 for rep lifts)
  next: StandardRow | null;
  toNext: number; // kg (weight) or reps (rep lift) still needed for the next level
  /**
   * Pull-ups only: your reps converted to the equivalent rep count a
   * reference-bodyweight (80 kg male / 65 kg female) lifter would need to
   * match your performance — i.e. how impressive your reps are once your
   * bodyweight is accounted for. Undefined for weight lifts.
   */
  relativeReps?: number;
  /** Estimated percentile (0–99.5) among people who train this lift, age/bodyweight-adjusted. */
  percentile: number;
  /** Position (0–1) of the user's value along the Beginner→Elite bar, matched to the level boundaries. */
  barPct: number;
}

/**
 * Percentile assigned to each level threshold (Beginner..Elite), roughly
 * matching the spread on public 1RM databases — most "Beginner" lifters sit
 * well below the median trainee, "Advanced" is already top-15%, "Elite" is
 * the high-90s. Used to turn a discrete level into a continuous percentile.
 */
const PERCENTILE_AT_LEVEL = [15, 40, 60, 85, 97];

/**
 * Maps a value to an estimated percentile by piecewise-linear interpolation
 * between the level thresholds, extrapolating gently below Beginner and
 * above Elite (capped just short of 100 — there's always someone stronger).
 */
function percentileForValue(value: number, rows: StandardRow[]): number {
  const vs = rows.map((r) => r.value);
  if (value <= 0) return 0;
  if (value <= vs[0]) {
    return Math.max(0, (value / vs[0]) * PERCENTILE_AT_LEVEL[0]);
  }
  for (let i = 0; i < vs.length - 1; i++) {
    if (value <= vs[i + 1]) {
      const t = (value - vs[i]) / (vs[i + 1] - vs[i]);
      return PERCENTILE_AT_LEVEL[i] + t * (PERCENTILE_AT_LEVEL[i + 1] - PERCENTILE_AT_LEVEL[i]);
    }
  }
  const over = (value - vs[4]) / vs[4];
  return Math.min(99.5, 97 + Math.min(2.5, over * 10));
}

/**
 * Position (0–1) of a value along the Beginner→Elite bar. The bar is drawn
 * as 5 equal-width colour segments, one per level, so this interpolates
 * piecewise between the level thresholds (rather than a single linear
 * Beginner-to-Elite span) — otherwise the marker drifts out of sync with
 * the segment it's actually classified into whenever the gaps between level
 * thresholds aren't equal (which they never are).
 */
function barPctForValue(value: number, rows: StandardRow[]): number {
  const vs = rows.map((r) => r.value);
  const xs = [0, 0.2, 0.4, 0.6, 0.8, 1];
  const breakpoints = [...vs, vs[4] * 1.25]; // headroom past Elite
  if (value <= breakpoints[0]) return 0;
  for (let i = 0; i < breakpoints.length - 1; i++) {
    if (value <= breakpoints[i + 1]) {
      const t = (value - breakpoints[i]) / (breakpoints[i + 1] - breakpoints[i]);
      return xs[i] + t * (xs[i + 1] - xs[i]);
    }
  }
  return 1;
}

/**
 * Classify a user's performance against the standards for a lift. `value` is a
 * 1RM in kg for weight lifts, or a max-rep count for pull-ups.
 */
export function classifyLift(
  value: number,
  lift: Lift,
  sex: "male" | "female",
  bodyweightKg: number,
  age: number
): LiftClassification {
  const unit: LiftUnit = lift === "pullup" ? "reps" : "weight";
  const rows = liftStandards(lift, sex, bodyweightKg, age);
  let levelIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    if (value >= rows[i].value) levelIndex = i;
  }
  const next = levelIndex + 1 < rows.length ? rows[levelIndex + 1] : null;
  const relativeReps =
    unit === "reps"
      ? value / (ageStrengthFactor(age) * pullupBodyweightFactor(bodyweightKg, sex))
      : undefined;
  return {
    unit,
    rows,
    levelIndex,
    level: levelIndex < 0 ? "Untrained" : rows[levelIndex].level,
    ratio: unit === "weight" && bodyweightKg > 0 ? value / bodyweightKg : 0,
    next,
    toNext: next ? Math.max(0, next.value - value) : 0,
    relativeReps,
    percentile: percentileForValue(value, rows),
    barPct: barPctForValue(value, rows),
  };
}

export type Emphasis = "absolute" | "relative" | "power" | "balanced";

export interface SportProfile {
  key: string;
  label: string;
  /** Lifts most relevant to the sport (highlighted in the UI). */
  lifts: Lift[];
  emphasis: Emphasis;
  /** Recommended minimum level to be competitive at an amateur level. */
  target: StrengthLevel;
  note: string;
}

/**
 * Sport-specific guidance: which lifts matter and whether the sport rewards
 * absolute strength, strength relative to bodyweight, or explosive power.
 */
export const SPORTS: SportProfile[] = [
  {
    key: "general",
    label: "General fitness",
    lifts: ["squat", "bench", "deadlift", "ohp"],
    emphasis: "balanced",
    target: "Intermediate",
    note: "Build all four lifts evenly. Intermediate across the board is a strong, healthy baseline.",
  },
  {
    key: "powerlifting",
    label: "Powerlifting",
    lifts: ["squat", "bench", "deadlift"],
    emphasis: "absolute",
    target: "Advanced",
    note: "Maximal absolute strength in the squat, bench and deadlift — your total is everything.",
  },
  {
    key: "weightlifting",
    label: "Olympic weightlifting",
    lifts: ["squat", "ohp"],
    emphasis: "power",
    target: "Advanced",
    note: "Explosive power from a huge squat and strong overhead position. Front-squat and overhead strength carry over most.",
  },
  {
    key: "strongman",
    label: "Strongman",
    lifts: ["deadlift", "squat", "ohp"],
    emphasis: "absolute",
    target: "Advanced",
    note: "Raw absolute strength and overhead pressing power across odd objects — heavier bodyweight is usually an advantage.",
  },
  {
    key: "field",
    label: "Football / rugby / field sports",
    lifts: ["squat", "bench", "deadlift"],
    emphasis: "power",
    target: "Advanced",
    note: "Lower-body power and contact strength. Squat and bench build the force you put into opponents and the ground.",
  },
  {
    key: "endurance",
    label: "Running / cycling / endurance",
    lifts: ["squat", "deadlift"],
    emphasis: "relative",
    target: "Novice",
    note: "Strength is support work, not the goal. Keep it relative — strong legs without extra bodyweight protect against injury.",
  },
  {
    key: "climbing",
    label: "Climbing / gymnastics",
    lifts: ["deadlift", "ohp"],
    emphasis: "relative",
    target: "Intermediate",
    note: "Strength-to-weight is king. Pulling and pressing strength matter, but only relative to a light bodyweight.",
  },
  {
    key: "combat",
    label: "Combat sports / martial arts",
    lifts: ["squat", "deadlift", "ohp"],
    emphasis: "relative",
    target: "Intermediate",
    note: "Explosive, weight-class-friendly strength. Build power without drifting out of your division.",
  },
];

/* ========================================================================
 * IDEAL BODYWEIGHT  &  LEAN MASS
 * ====================================================================== */

/** Inches of height above 5 ft (the basis of the classic IBW formulas). */
function inchesOver5ft(heightCm: number): number {
  return Math.max(0, heightCm / 2.54 - 60);
}

export interface IdealWeightRow {
  name: string;
  kg: number;
}

/**
 * Classic height-based ideal-weight formulas (all return kg). They were
 * derived for medication dosing, so they trend a little lean — use the
 * healthy-BMI range as the practical target.
 */
export function idealWeightFormulas(
  heightCm: number,
  sex: "male" | "female"
): IdealWeightRow[] {
  const over = inchesOver5ft(heightCm);
  const male = sex === "male";
  return [
    { name: "Devine", kg: (male ? 50 : 45.5) + 2.3 * over },
    { name: "Robinson", kg: (male ? 52 : 49) + (male ? 1.9 : 1.7) * over },
    { name: "Miller", kg: (male ? 56.2 : 53.1) + (male ? 1.41 : 1.36) * over },
    { name: "Hamwi", kg: (male ? 48 : 45.5) + (male ? 2.7 : 2.2) * over },
  ];
}

/** Healthy weight range (kg) for a height, from BMI 18.5–24.9. */
export function healthyWeightRange(heightCm: number): { minKg: number; maxKg: number } {
  const m = heightCm / 100;
  return { minKg: 18.5 * m * m, maxKg: 24.9 * m * m };
}

/**
 * Lean body mass (Boer formula), kg. Useful as a floor for cuts and a sanity
 * check on ideal weight: you can't healthily weigh less than your lean mass.
 */
export function leanBodyMassBoer(
  weightKg: number,
  heightCm: number,
  sex: "male" | "female"
): number {
  return sex === "male"
    ? 0.407 * weightKg + 0.267 * heightCm - 19.2
    : 0.252 * weightKg + 0.473 * heightCm - 48.3;
}

/* ========================================================================
 * HEALTH METRICS
 * ====================================================================== */

export interface FfmiResult {
  leanMassKg: number;
  ffmi: number;
  normalizedFfmi: number; // adjusted to a 1.8 m reference height
}

/**
 * Fat-Free Mass Index — lean mass relative to height², the muscularity
 * counterpart to BMI. Normalised FFMI corrects to a 1.8 m reference so tall
 * and short lifters compare fairly.
 *   FFMI = leanMass / height_m²
 *   normalised = FFMI + 6.1 × (1.8 − height_m)
 */
export function ffmi(
  weightKg: number,
  heightCm: number,
  bodyFatPct: number
): FfmiResult {
  const m = heightCm / 100;
  const leanMassKg = weightKg * (1 - bodyFatPct / 100);
  const raw = m > 0 ? leanMassKg / (m * m) : 0;
  return {
    leanMassKg,
    ffmi: raw,
    normalizedFfmi: raw + 6.1 * (1.8 - m),
  };
}

/* ========================================================================
 * MUSCLE-GAIN POTENTIAL
 * ----------------------------------------------------------------------
 * How much muscle you can realistically add, as a range, from two
 * well-known models that keep each other honest:
 *   1. Rate of gain — Alan Aragon's model: realistic monthly muscle gain
 *      as a % of bodyweight, tiered by training experience.
 *   2. Genetic ceiling — the FFMI limit for drug-free lifters (~25
 *      normalised for men, ~21.5 for women; Kouri et al.). Remaining lean
 *      mass to that ceiling CAPS the rate projection, so an already-muscular
 *      lifter gets an honest small number instead of gaining forever.
 * Numbers assume good training, diet, sleep and a slight surplus — they're
 * an upper-bound guide to what's possible, not a promise.
 * ====================================================================== */

export type TrainingLevel = "beginner" | "intermediate" | "advanced";

export const TRAINING_LEVELS: {
  key: TrainingLevel;
  label: string;
  years: string;
  /** Aragon monthly muscle gain as a % of bodyweight (men). */
  loPctPerMonth: number;
  hiPctPerMonth: number;
}[] = [
  { key: "beginner", label: "Beginner", years: "< 1 year", loPctPerMonth: 1.0, hiPctPerMonth: 1.5 },
  { key: "intermediate", label: "Intermediate", years: "1–3 years", loPctPerMonth: 0.5, hiPctPerMonth: 1.0 },
  { key: "advanced", label: "Advanced", years: "3+ years", loPctPerMonth: 0.25, hiPctPerMonth: 0.5 },
];

/**
 * Age taper on muscle-building rate. Response is full to ~30, then declines
 * gently with anabolic resistance — a mild ~1.2%/yr, floored at 0.5 so older
 * lifters are slowed, not written off.
 */
export function ageMuscleFactor(age: number): number {
  if (age <= 30) return 1;
  return Math.max(0.5, 1 - (age - 30) * 0.012);
}

export interface MuscleGainTimeframe {
  months: number;
  loKg: number;
  highKg: number;
  /** True once the range is limited by the genetic ceiling, not the rate. */
  capped: boolean;
}

export interface MuscleGainResult {
  leanMassKg: number;
  normalizedFfmi: number;
  ceilingNffmi: number;
  ceilingLeanKg: number;
  remainingKg: number; // lifetime lean mass left to the natural ceiling
  pctOfPotential: number; // how far toward the ceiling you already are (0–100+)
  ratePerMonthLoKg: number;
  ratePerMonthHiKg: number;
  timeframes: MuscleGainTimeframe[];
}

/**
 * Estimate realistic muscle-gain ranges over 3/6/12 months plus lifetime
 * remaining potential, from stats + training experience.
 */
export function muscleGainPotential(args: {
  sex: "male" | "female";
  age: number;
  heightCm: number;
  weightKg: number;
  bodyFatPct: number;
  level: TrainingLevel;
}): MuscleGainResult {
  const { sex, age, heightCm, weightKg, bodyFatPct, level } = args;
  const m = heightCm / 100;
  const { leanMassKg, normalizedFfmi } = ffmi(weightKg, heightCm, bodyFatPct);

  // Natural ceiling, converted from normalised FFMI back to this person's
  // height so the remaining-mass figure is in real kg.
  const ceilingNffmi = sex === "male" ? 25 : 21.5;
  const ceilingRawFfmi = ceilingNffmi - 6.1 * (1.8 - m);
  const ceilingLeanKg = m > 0 ? ceilingRawFfmi * m * m : 0;
  const remainingKg = Math.max(0, ceilingLeanKg - leanMassKg);
  const pctOfPotential =
    ceilingLeanKg > 0 ? Math.min(150, (leanMassKg / ceilingLeanKg) * 100) : 0;

  const tier = TRAINING_LEVELS.find((t) => t.key === level)!;
  const sexFactor = sex === "male" ? 1 : 0.5;
  const ageFactor = ageMuscleFactor(age);
  const ratePerMonthLoKg = weightKg * (tier.loPctPerMonth / 100) * sexFactor * ageFactor;
  const ratePerMonthHiKg = weightKg * (tier.hiPctPerMonth / 100) * sexFactor * ageFactor;

  const timeframes: MuscleGainTimeframe[] = [3, 6, 12].map((months) => {
    const rawLo = ratePerMonthLoKg * months;
    const rawHi = ratePerMonthHiKg * months;
    const loKg = Math.min(rawLo, remainingKg);
    const highKg = Math.min(rawHi, remainingKg);
    return { months, loKg, highKg, capped: rawHi > remainingKg };
  });

  return {
    leanMassKg,
    normalizedFfmi,
    ceilingNffmi,
    ceilingLeanKg,
    remainingKg,
    pctOfPotential,
    ratePerMonthLoKg,
    ratePerMonthHiKg,
    timeframes,
  };
}

/** Rough interpretation of normalised FFMI by sex. */
export function ffmiCategory(nffmi: number, sex: "male" | "female"): string {
  // Women carry less lean mass, so the bands sit lower.
  const b =
    sex === "male"
      ? { low: 18, avg: 20, athletic: 22, exceptional: 25, suspicious: 26 }
      : { low: 15, avg: 17, athletic: 19, exceptional: 21, suspicious: 22 };
  if (nffmi >= b.suspicious) return "Beyond natural limits";
  if (nffmi >= b.exceptional) return "Exceptional";
  if (nffmi >= b.athletic) return "Athletic";
  if (nffmi >= b.avg) return "Above average";
  if (nffmi >= b.low) return "Average";
  return "Below average";
}

/**
 * Calories burned from MET value: kcal = MET × 3.5 × kg / 200 × minutes.
 * (3.5 ml O₂/kg/min at 1 MET; ~5 kcal per litre of O₂.)
 */
export function caloriesFromMet(
  met: number,
  weightKg: number,
  minutes: number
): number {
  return (met * 3.5 * weightKg) / 200 * minutes;
}

/** A compact MET table covering common training & daily activities. */
export const MET_ACTIVITIES = [
  { key: "walk_slow", label: "Walking (slow, 3 km/h)", met: 2.8 },
  { key: "walk_brisk", label: "Walking (brisk, 5.5 km/h)", met: 4.3 },
  { key: "hiking", label: "Hiking", met: 6.0 },
  { key: "run_easy", label: "Running (8 km/h)", met: 8.3 },
  { key: "run_fast", label: "Running (12 km/h)", met: 11.5 },
  { key: "cycling_light", label: "Cycling (16–19 km/h)", met: 6.8 },
  { key: "cycling_hard", label: "Cycling (22–25 km/h)", met: 10.0 },
  { key: "swimming", label: "Swimming (moderate)", met: 5.8 },
  { key: "rowing", label: "Rowing machine (vigorous)", met: 8.5 },
  { key: "weights_light", label: "Weight training (general)", met: 3.5 },
  { key: "weights_hard", label: "Weight training (vigorous)", met: 6.0 },
  { key: "hiit", label: "HIIT / circuit training", met: 8.0 },
  { key: "yoga", label: "Yoga", met: 2.5 },
  { key: "elliptical", label: "Elliptical trainer", met: 5.0 },
  { key: "jump_rope", label: "Jump rope", met: 12.3 },
  { key: "basketball", label: "Basketball (game)", met: 8.0 },
  { key: "soccer", label: "Soccer (casual)", met: 7.0 },
  { key: "tennis", label: "Tennis (singles)", met: 7.3 },
  { key: "climbing", label: "Rock climbing", met: 8.0 },
  { key: "housework", label: "Housework / cleaning", met: 3.3 },
] as const;

export interface BpResult {
  category: string;
  tone: "accent" | "warn" | "danger";
  advice: string;
}

/**
 * Blood-pressure category per the 2017 ACC/AHA guidelines. The higher of the
 * two readings' categories wins (e.g. 118/85 is Stage 1 on diastolic).
 */
export function bloodPressureCategory(
  systolic: number,
  diastolic: number
): BpResult {
  if (systolic >= 180 || diastolic >= 120)
    return { category: "Hypertensive crisis", tone: "danger", advice: "Seek medical care promptly, especially with symptoms." };
  if (systolic >= 140 || diastolic >= 90)
    return { category: "Hypertension stage 2", tone: "danger", advice: "Likely needs medication plus lifestyle change — see a doctor." };
  if (systolic >= 130 || diastolic >= 80)
    return { category: "Hypertension stage 1", tone: "warn", advice: "Lifestyle changes; a clinician may consider medication." };
  if (systolic >= 120)
    return { category: "Elevated", tone: "warn", advice: "Adopt healthy-lifestyle habits to avoid progressing." };
  if (systolic >= 90 && diastolic >= 60)
    return { category: "Normal", tone: "accent", advice: "Healthy range — keep it up." };
  return { category: "Low", tone: "warn", advice: "Often harmless, but see a doctor if you feel dizzy or faint." };
}

/** Waist-to-hip ratio. */
export function waistToHip(waistCm: number, hipCm: number): number {
  if (hipCm <= 0) return 0;
  return waistCm / hipCm;
}

/** WHR cardiovascular-risk band (WHO thresholds, sex-specific). */
export function whrCategory(ratio: number, sex: "male" | "female"): string {
  if (sex === "male") {
    if (ratio < 0.9) return "Low risk";
    if (ratio <= 0.99) return "Moderate risk";
    return "High risk";
  }
  if (ratio < 0.8) return "Low risk";
  if (ratio <= 0.84) return "Moderate risk";
  return "High risk";
}

/** Body surface area, m². Mosteller is the common clinical default. */
export function bsaMosteller(weightKg: number, heightCm: number): number {
  return Math.sqrt((heightCm * weightKg) / 3600);
}

/** Body surface area, m² — Du Bois & Du Bois (older, slightly different). */
export function bsaDuBois(weightKg: number, heightCm: number): number {
  return 0.007184 * Math.pow(weightKg, 0.425) * Math.pow(heightCm, 0.725);
}

/* ========================================================================
 * DIET PLANNER — cut / bulk calories + body-recomposition timeline
 * ----------------------------------------------------------------------
 * Ties TDEE, a goal rate and the muscle-gain model together: pick a goal
 * and pace and get your daily calories, macros and a week-by-week
 * projection of weight, fat and lean mass, plus an ETA to a target body
 * fat %. ~7700 kcal ≈ 1 kg of body-mass change (the standard approximation).
 * ====================================================================== */

export type DietGoal = "lose" | "maintain" | "gain";

const KCAL_PER_KG = 7700;

export interface DietWeek {
  week: number;
  weightKg: number;
  leanKg: number;
  fatKg: number;
  bodyFatPct: number;
}

export interface DietPlanResult {
  tdee: number;
  calorieTarget: number;
  dailyDeltaKcal: number; // signed: negative on a cut
  rateKgPerWeek: number; // signed
  proteinPerKg: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  weeklyLeanCapKg: number;
  trajectory: DietWeek[];
  weeksToTarget: number | null;
  targetWeightKg: number | null;
}

/**
 * Fraction of weight LOST that comes from fat (the rest is lean). Leaner
 * people give up proportionally more lean; higher body-fat means more of the
 * loss is fat. Clamped to a sensible 0.60–0.92.
 */
function fatFractionOfLoss(bodyFatPct: number): number {
  return Math.min(0.92, Math.max(0.6, 0.65 + (bodyFatPct - 12) * 0.013));
}

export function dietPlan(args: {
  sex: "male" | "female";
  age: number;
  heightCm: number;
  weightKg: number;
  bodyFatPct: number;
  activityMultiplier: number;
  goal: DietGoal;
  ratePctPerWeek: number; // magnitude, % of bodyweight per week
  experience: TrainingLevel;
  targetBodyFatPct?: number;
  weeks?: number;
}): DietPlanResult {
  const {
    sex, age, heightCm, weightKg, bodyFatPct, activityMultiplier,
    goal, ratePctPerWeek, experience, targetBodyFatPct, weeks = 16,
  } = args;

  const bmr = bmrMifflin(weightKg, heightCm, age, sex);
  const tdeeVal = tdee(bmr, activityMultiplier);

  const dir = goal === "lose" ? -1 : goal === "gain" ? 1 : 0;
  const rateKgPerWeek = dir * (ratePctPerWeek / 100) * weightKg;
  const dailyDeltaKcal = (rateKgPerWeek * KCAL_PER_KG) / 7;
  const calorieTargetVal = Math.round(tdeeVal + dailyDeltaKcal);

  // More protein on a cut to spare muscle.
  const proteinPerKg = goal === "lose" ? 2.2 : 1.8;
  const m = macroSplit(calorieTargetVal, weightKg, proteinPerKg);

  // Weekly cap on lean gain for a bulk, from the muscle-gain model.
  const mg = muscleGainPotential({ sex, age, heightCm, weightKg, bodyFatPct, level: experience });
  const weeklyLeanCapKg = mg.ratePerMonthHiKg / 4.345;

  let lean = weightKg * (1 - bodyFatPct / 100);
  let fat = Math.max(0, weightKg - lean);
  const trajectory: DietWeek[] = [
    { week: 0, weightKg, leanKg: lean, fatKg: fat, bodyFatPct },
  ];
  let weeksToTarget: number | null = null;
  let targetWeightKg: number | null = null;
  const maxWeeks = 104;

  for (let w = 1; w <= maxWeeks; w++) {
    if (dir < 0) {
      const bfNow = (fat / (lean + fat)) * 100;
      const fatFrac = fatFractionOfLoss(bfNow);
      fat += rateKgPerWeek * fatFrac; // rateKgPerWeek negative
      lean += rateKgPerWeek * (1 - fatFrac);
    } else if (dir > 0) {
      const leanGain = Math.min(rateKgPerWeek, Math.max(0, weeklyLeanCapKg));
      lean += leanGain;
      fat += rateKgPerWeek - leanGain;
    }
    fat = Math.max(0, fat);
    lean = Math.max(0, lean);
    const wt = lean + fat;
    const bf = wt > 0 ? (fat / wt) * 100 : 0;

    if (weeksToTarget === null && targetBodyFatPct != null) {
      if (
        (dir < 0 && bf <= targetBodyFatPct) ||
        (dir > 0 && bf >= targetBodyFatPct)
      ) {
        weeksToTarget = w;
        targetWeightKg = wt;
      }
    }
    if (w <= weeks) {
      trajectory.push({ week: w, weightKg: wt, leanKg: lean, fatKg: fat, bodyFatPct: bf });
    }
  }

  return {
    tdee: tdeeVal,
    calorieTarget: calorieTargetVal,
    dailyDeltaKcal,
    rateKgPerWeek,
    proteinPerKg,
    proteinG: m.proteinG,
    carbsG: m.carbsG,
    fatG: m.fatG,
    weeklyLeanCapKg,
    trajectory,
    weeksToTarget,
    targetWeightKg,
  };
}

/* ========================================================================
 * LIFT BALANCE — are your main lifts in proportion?
 * ----------------------------------------------------------------------
 * Compares your squat/bench/deadlift/OHP against the proportions a
 * balanced lifter shows (derived from the strength-standard ratios),
 * anchored to whichever lift you're relatively strongest at, and flags
 * the laggards.
 * ====================================================================== */

type BalanceLift = "squat" | "bench" | "deadlift" | "ohp";

const IDEAL_LIFT_RATIO: Record<"male" | "female", Record<BalanceLift, number>> = {
  male: { squat: 1.5, bench: 1.0, deadlift: 1.75, ohp: 0.8 },
  female: { squat: 1.2, bench: 0.65, deadlift: 1.4, ohp: 0.47 },
};

const BALANCE_LABELS: Record<BalanceLift, string> = {
  squat: "Squat",
  bench: "Bench press",
  deadlift: "Deadlift",
  ohp: "Overhead press",
};

export interface LiftBalanceRow {
  key: BalanceLift;
  label: string;
  actual: number;
  expected: number;
  deltaPct: number; // +ve = ahead of balanced, -ve = behind
}

export interface LiftBalanceResult {
  rows: LiftBalanceRow[];
  weakest: LiftBalanceRow | null;
  strongest: LiftBalanceRow | null;
  anchor: BalanceLift | null;
}

export function liftBalance(
  actual: Record<BalanceLift, number>,
  sex: "male" | "female"
): LiftBalanceResult {
  const ideal = IDEAL_LIFT_RATIO[sex];
  const keys: BalanceLift[] = ["squat", "bench", "deadlift", "ohp"];
  const provided = keys.filter((k) => actual[k] > 0);

  if (provided.length < 2) {
    return {
      rows: keys.map((k) => ({
        key: k, label: BALANCE_LABELS[k], actual: actual[k] || 0, expected: 0, deltaPct: 0,
      })),
      weakest: null, strongest: null, anchor: null,
    };
  }

  // Anchor = lift you're relatively strongest at (highest actual ÷ ideal).
  let anchor = provided[0];
  for (const k of provided) {
    if (actual[k] / ideal[k] > actual[anchor] / ideal[anchor]) anchor = k;
  }

  const rows: LiftBalanceRow[] = keys.map((k) => {
    const expected = actual[anchor] * (ideal[k] / ideal[anchor]);
    const deltaPct = actual[k] > 0 ? ((actual[k] - expected) / expected) * 100 : 0;
    return { key: k, label: BALANCE_LABELS[k], actual: actual[k] || 0, expected, deltaPct };
  });

  const prov = rows.filter((r) => r.actual > 0);
  const weakest = prov.reduce((a, b) => (b.deltaPct < a.deltaPct ? b : a));
  const strongest = prov.reduce((a, b) => (b.deltaPct > a.deltaPct ? b : a));
  return { rows, weakest, strongest, anchor };
}

/* ========================================================================
 * RPE ↔ %1RM ↔ RIR (Reactive Training Systems chart)
 * ----------------------------------------------------------------------
 * The full RTS/Helms RPE table collapses to a single curve: %1RM is a
 * function of "effective reps" e = reps + (10 − RPE), i.e. reps performed
 * plus reps in reserve. We store the RPE-10 row (reps-to-failure → %1RM)
 * and interpolate.
 * ====================================================================== */

const RPE10_PCT = [
  100, 95.5, 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0,
];

function pctForEffectiveReps(e: number): number {
  if (e <= 1) return 100;
  const lo = Math.floor(e);
  const hi = Math.ceil(e);
  const a = RPE10_PCT[Math.min(lo, 12) - 1] ?? RPE10_PCT[11];
  const b = RPE10_PCT[Math.min(hi, 12) - 1] ?? RPE10_PCT[11];
  return a + (b - a) * (e - lo);
}

/** %1RM for completing `reps` with the given RPE (6–10). */
export function pctOfOneRM(reps: number, rpe: number): number {
  const e = reps + (10 - rpe);
  return pctForEffectiveReps(e);
}

/** Estimated 1RM from a working set: weight ÷ (%1RM/100). */
export function oneRMFromRPE(weight: number, reps: number, rpe: number): number {
  const pct = pctOfOneRM(reps, rpe);
  return pct > 0 ? weight / (pct / 100) : 0;
}

/** Target weight to hit `reps` at `rpe` given a known 1RM. */
export function weightForRepsAtRPE(oneRM: number, reps: number, rpe: number): number {
  return (oneRM * pctOfOneRM(reps, rpe)) / 100;
}

/* ========================================================================
 * CYCLING POWER ZONES (Coggan, % of FTP)
 * ====================================================================== */

export interface PowerZone {
  zone: number;
  name: string;
  lowPct: number;
  highPct: number;
  desc: string;
}

export const FTP_ZONES: PowerZone[] = [
  { zone: 1, name: "Active recovery", lowPct: 0, highPct: 0.55, desc: "Easy spinning, recovery rides" },
  { zone: 2, name: "Endurance", lowPct: 0.56, highPct: 0.75, desc: "All-day aerobic base" },
  { zone: 3, name: "Tempo", lowPct: 0.76, highPct: 0.9, desc: "Brisk, 'comfortably hard'" },
  { zone: 4, name: "Threshold", lowPct: 0.91, highPct: 1.05, desc: "At/around FTP, 10–30 min" },
  { zone: 5, name: "VO₂max", lowPct: 1.06, highPct: 1.2, desc: "3–8 min hard intervals" },
  { zone: 6, name: "Anaerobic", lowPct: 1.21, highPct: 1.5, desc: "30 s–3 min efforts" },
  { zone: 7, name: "Neuromuscular", lowPct: 1.51, highPct: 2.5, desc: "Sprints, max power" },
];

/** FTP estimate from a 20-minute test (95% of 20-min average power). */
export function ftpFrom20min(power20: number): number {
  return power20 * 0.95;
}

export interface PowerZoneRange {
  zone: PowerZone;
  lowW: number;
  highW: number;
}

export function powerZones(ftp: number): PowerZoneRange[] {
  return FTP_ZONES.map((z) => ({
    zone: z,
    lowW: z.lowPct * ftp,
    highW: z.highPct * ftp,
  }));
}

/** Rough cyclist category from FTP per kg of bodyweight (W/kg). */
export function ftpWkgCategory(wkg: number, sex: "male" | "female"): string {
  // Women's bands sit a little lower.
  const s = sex === "male" ? 0 : -0.5;
  if (wkg >= 5.5 + s) return "Exceptional";
  if (wkg >= 4.5 + s) return "Very strong";
  if (wkg >= 3.5 + s) return "Good";
  if (wkg >= 2.5 + s) return "Moderate";
  if (wkg >= 1.8 + s) return "Fair";
  return "Beginner";
}

/* ========================================================================
 * OVERALL STRENGTH SCORE
 * ----------------------------------------------------------------------
 * Collapses your main lifts into one number: the mean percentile across
 * the lifts you provide (via classifyLift), plus an overall level.
 * ====================================================================== */

export interface StrengthScoreLift {
  key: Lift;
  label: string;
  percentile: number;
  levelIndex: number;
  level: StrengthLevel | "Untrained";
}

export interface StrengthScoreResult {
  score: number; // 0–100, mean percentile across provided lifts
  level: StrengthLevel | "Untrained";
  lifts: StrengthScoreLift[];
}

export function strengthScore(
  values: Partial<Record<Lift, number>>,
  sex: "male" | "female",
  bodyweightKg: number,
  age: number
): StrengthScoreResult {
  const lifts: StrengthScoreLift[] = LIFTS.filter(
    (l) => (values[l.key] ?? 0) > 0
  ).map((l) => {
    const c = classifyLift(values[l.key]!, l.key, sex, bodyweightKg, age);
    return {
      key: l.key,
      label: l.label,
      percentile: c.percentile,
      levelIndex: c.levelIndex,
      level: c.levelIndex < 0 ? "Untrained" : STRENGTH_LEVELS[c.levelIndex],
    };
  });
  if (lifts.length === 0) return { score: 0, level: "Untrained", lifts };
  const score = lifts.reduce((s, x) => s + x.percentile, 0) / lifts.length;
  const avgIdx = Math.round(
    lifts.reduce((s, x) => s + x.levelIndex, 0) / lifts.length
  );
  const level = avgIdx < 0 ? "Untrained" : STRENGTH_LEVELS[Math.min(4, avgIdx)];
  return { score, level, lifts };
}

/* ========================================================================
 * SWIMMING — Critical Swim Speed & pace zones
 * ----------------------------------------------------------------------
 * CSS (Wakayoshi et al.) is the slope of two time trials — a practical
 * proxy for swimming threshold. Zones are offsets in sec per 100 m from
 * your CSS pace.
 * ====================================================================== */

/** Critical swim speed (m/s) from a long and short trial. */
export function criticalSwimSpeed(
  longDistM: number,
  longTimeSec: number,
  shortDistM: number,
  shortTimeSec: number
): number {
  const dd = longDistM - shortDistM;
  const dt = longTimeSec - shortTimeSec;
  return dt > 0 ? dd / dt : 0;
}

export interface SwimZone {
  name: string;
  desc: string;
  // Offset bounds in sec/100m relative to CSS (negative = faster).
  fastOffset: number;
  slowOffset: number;
}

export const SWIM_ZONES: SwimZone[] = [
  { name: "Recovery", desc: "Easy technique & warm-up", fastOffset: 10, slowOffset: 16 },
  { name: "Endurance", desc: "Aerobic base sets", fastOffset: 5, slowOffset: 10 },
  { name: "Threshold (CSS)", desc: "Sustained, ~CSS pace", fastOffset: -1, slowOffset: 4 },
  { name: "VO₂max", desc: "Hard intervals", fastOffset: -5, slowOffset: -1 },
  { name: "Sprint", desc: "Short max efforts", fastOffset: -12, slowOffset: -5 },
];

export interface SwimZonePace {
  zone: SwimZone;
  fastSecPer100: number;
  slowSecPer100: number;
}

/** Pace per 100 m (s) for each zone given CSS speed (m/s). */
export function swimZones(cssMetersPerSec: number): SwimZonePace[] {
  const cssPer100 = cssMetersPerSec > 0 ? 100 / cssMetersPerSec : 0;
  return SWIM_ZONES.map((z) => ({
    zone: z,
    fastSecPer100: Math.max(0, cssPer100 + z.fastOffset),
    slowSecPer100: Math.max(0, cssPer100 + z.slowOffset),
  }));
}

/* ========================================================================
 * TREADMILL — incline → equivalent flat pace (ACSM running equation)
 * ----------------------------------------------------------------------
 * VO2 = 0.2·v + 0.9·v·grade + 3.5 (v m/min). Matching that VO2 on flat
 * ground gives v_flat = v·(1 + 4.5·grade), i.e. flat pace is faster by the
 * same factor.
 * ====================================================================== */

export function inclineFlatPace(
  treadmillPaceSecPerKm: number,
  gradePercent: number
): number {
  return treadmillPaceSecPerKm / (1 + 4.5 * (gradePercent / 100));
}

/* ========================================================================
 * RACE-DAY SPLITS
 * ----------------------------------------------------------------------
 * A per-segment split sheet from a goal time. negativePct ramps the pace
 * linearly from slower early to faster late (0 = even splits), normalised
 * so the total exactly hits the goal.
 * ====================================================================== */

export interface RaceSplit {
  distM: number; // cumulative distance at end of this segment
  segSec: number; // time for this segment
  cumSec: number; // cumulative time
}

export function raceSplits(
  goalSec: number,
  distM: number,
  segM: number,
  negativePct: number
): RaceSplit[] {
  if (goalSec <= 0 || distM <= 0 || segM <= 0) return [];
  const n = Math.ceil(distM / segM);
  const avgPerSeg = goalSec / (distM / segM);
  const raw: { dist: number; seg: number }[] = [];
  for (let i = 0; i < n; i++) {
    const frac = n > 1 ? i / (n - 1) : 0;
    const factor = 1 + (negativePct / 100) * (0.5 - frac);
    const segDist = Math.min(segM, distM - i * segM);
    raw.push({ dist: i * segM + segDist, seg: avgPerSeg * factor * (segDist / segM) });
  }
  const total = raw.reduce((s, r) => s + r.seg, 0);
  const scale = goalSec / total;
  let cum = 0;
  return raw.map((r) => {
    const seg = r.seg * scale;
    cum += seg;
    return { distM: r.dist, segSec: seg, cumSec: cum };
  });
}

/* ========================================================================
 * COMPETITION SCORING — pound-for-pound, age-graded & fitness age
 * ----------------------------------------------------------------------
 * Pure scoring systems used in real competition, so athletes can compare
 * across bodyweight, age and sex. All approximations are clearly bounded
 * and documented; none of this needs a backend.
 * ====================================================================== */

/**
 * Original Wilks coefficient — bodyweight-adjusted powerlifting score.
 * score = total × 500 / poly(bodyweight). DOTS (see `dotsScore`) is its
 * modern successor; both are offered side by side.
 */
export function wilksScore(
  totalKg: number,
  bodyweightKg: number,
  sex: "male" | "female"
): number {
  const bw = Math.min(Math.max(bodyweightKg, 40), 200);
  const C =
    sex === "male"
      ? [-216.0475144, 16.2606339, -0.002388645, -0.00113732, 7.01863e-6, -1.291e-8]
      : [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 4.731582e-5, -9.054e-8];
  const poly =
    C[0] + C[1] * bw + C[2] * bw ** 2 + C[3] * bw ** 3 + C[4] * bw ** 4 + C[5] * bw ** 5;
  return totalKg * (500 / poly);
}

/**
 * IPF GL points — the IPF's current official bodyweight adjustment for
 * classic (raw) full-power. points = total × 100 / (A − B·e^(−C·bw)).
 */
export function ipfGlPoints(
  totalKg: number,
  bodyweightKg: number,
  sex: "male" | "female"
): number {
  const bw = Math.min(Math.max(bodyweightKg, 40), 200);
  const [A, B, c] =
    sex === "male"
      ? [1199.72839, 1025.18162, 0.00921]
      : [610.32796, 1045.59282, 0.03048];
  const denom = A - B * Math.exp(-c * bw);
  return denom > 0 ? totalKg * (100 / denom) : 0;
}

export interface PowerliftingPoints {
  wilks: number;
  dots: number;
  ipfGl: number;
}

/** Convenience: all three pound-for-pound scores for a total. */
export function powerliftingPoints(
  totalKg: number,
  bodyweightKg: number,
  sex: "male" | "female"
): PowerliftingPoints {
  return {
    wilks: wilksScore(totalKg, bodyweightKg, sex),
    dots: dotsScore(totalKg, bodyweightKg, sex),
    ipfGl: ipfGlPoints(totalKg, bodyweightKg, sex),
  };
}

// Approximate WMA-style age factors for running (fraction of open-class
// performance retainable at a given age), interpolated between anchors.
const RUN_AGE_FACTORS: { age: number; f: number }[] = [
  { age: 20, f: 1.0 }, { age: 30, f: 1.0 }, { age: 35, f: 0.975 },
  { age: 40, f: 0.94 }, { age: 45, f: 0.9 }, { age: 50, f: 0.855 },
  { age: 55, f: 0.805 }, { age: 60, f: 0.75 }, { age: 65, f: 0.69 },
  { age: 70, f: 0.625 }, { age: 75, f: 0.555 }, { age: 80, f: 0.48 },
  { age: 85, f: 0.4 }, { age: 90, f: 0.32 },
];

/** Linear interpolation of the running age factor (clamped to the table). */
export function runAgeFactor(age: number): number {
  const t = RUN_AGE_FACTORS;
  if (age <= t[0].age) return t[0].f;
  if (age >= t[t.length - 1].age) return t[t.length - 1].f;
  for (let i = 1; i < t.length; i++) {
    if (age <= t[i].age) {
      const a = t[i - 1];
      const b = t[i];
      return a.f + ((b.f - a.f) * (age - a.age)) / (b.age - a.age);
    }
  }
  return 1;
}

// Approximate open-class standard times (seconds) per distance, by sex.
// Loosely anchored to world-class marks; age-grading is relative, so small
// differences shift everyone equally.
export interface RaceStandard {
  key: string;
  label: string;
  distM: number;
  men: number; // open standard, seconds
  women: number;
}
export const RACE_STANDARDS: RaceStandard[] = [
  { key: "1mile", label: "Mile", distM: 1609, men: 223, women: 252 },
  { key: "5k", label: "5K", distM: 5000, men: 755, women: 850 },
  { key: "10k", label: "10K", distM: 10000, men: 1571, women: 1771 },
  { key: "10mile", label: "10 mile", distM: 16093, men: 2607, women: 2940 },
  { key: "half", label: "Half marathon", distM: 21097, men: 3478, women: 3930 },
  { key: "marathon", label: "Marathon", distM: 42195, men: 7299, women: 8125 },
];

export interface AgeGradeResult {
  ageGradePct: number; // 0..100+ (capped for display elsewhere)
  ageFactor: number;
  ageStandardSec: number; // your age/sex world standard for the event
  openStandardSec: number;
  level: string;
}

/**
 * Age-graded running performance. Compares your time to the world standard
 * for your age and sex: % = ageStandard / yourTime × 100. This is an
 * approximation of the WMA age-grading tables (single age-factor curve), good
 * enough to track your own progress and compare across ages — not an official
 * certificate.
 */
export function ageGradedRunning(
  timeSec: number,
  standard: RaceStandard,
  age: number,
  sex: "male" | "female"
): AgeGradeResult {
  const open = sex === "female" ? standard.women : standard.men;
  const f = runAgeFactor(age);
  const ageStandard = open / f; // older athletes get a slower standard
  const pct = timeSec > 0 ? (ageStandard / timeSec) * 100 : 0;
  const level =
    pct >= 100 ? "World-record class"
    : pct >= 90 ? "World class"
    : pct >= 80 ? "National class"
    : pct >= 70 ? "Regional class"
    : pct >= 60 ? "Local competitive"
    : pct >= 50 ? "Keen amateur"
    : "Recreational";
  return { ageGradePct: pct, ageFactor: f, ageStandardSec: ageStandard, openStandardSec: open, level };
}

// Average VO₂max (ml/kg/min) by age anchor and sex — used to invert a VO₂max
// into a "fitness age": the age at which your VO₂max is merely average.
const VO2_BY_AGE: { age: number; male: number; female: number }[] = [
  { age: 20, male: 48, female: 38 },
  { age: 30, male: 44, female: 35 },
  { age: 40, male: 40, female: 32 },
  { age: 50, male: 36, female: 29 },
  { age: 60, male: 32, female: 26 },
  { age: 70, male: 28, female: 23 },
  { age: 80, male: 24, female: 20 },
];

export interface FitnessAgeResult {
  fitnessAge: number;
  vo2max: number;
  averageForAge: number; // average VO₂max for the person's real age
  deltaYears: number; // realAge − fitnessAge (positive = younger than calendar)
}

/**
 * "Fitness age" from VO₂max: the age at which the given VO₂max is the
 * population average for that sex. A higher VO₂max → a younger fitness age.
 * Clamped to 18–80. Reference values are population averages, so this is a
 * motivational estimate rather than a clinical figure.
 */
export function fitnessAge(
  vo2max: number,
  realAge: number,
  sex: "male" | "female"
): FitnessAgeResult {
  const key = sex === "female" ? "female" : "male";
  const t = VO2_BY_AGE;
  // Average VO₂max at the person's real age (linear interpolation).
  const avgAt = (age: number): number => {
    if (age <= t[0].age) return t[0][key];
    if (age >= t[t.length - 1].age) return t[t.length - 1][key];
    for (let i = 1; i < t.length; i++) {
      if (age <= t[i].age) {
        const a = t[i - 1];
        const b = t[i];
        return a[key] + ((b[key] - a[key]) * (age - a.age)) / (b.age - a.age);
      }
    }
    return t[t.length - 1][key];
  };
  // Invert: find the age whose average VO₂max equals the input.
  let fAge: number;
  if (vo2max >= t[0][key]) fAge = 18;
  else if (vo2max <= t[t.length - 1][key]) fAge = 80;
  else {
    fAge = 80;
    for (let i = 1; i < t.length; i++) {
      const a = t[i - 1];
      const b = t[i];
      if (vo2max <= a[key] && vo2max >= b[key]) {
        fAge = a.age + ((b.age - a.age) * (a[key] - vo2max)) / (a[key] - b[key]);
        break;
      }
    }
  }
  fAge = Math.round(Math.min(80, Math.max(18, fAge)));
  return {
    fitnessAge: fAge,
    vo2max,
    averageForAge: avgAt(realAge),
    deltaYears: realAge - fAge,
  };
}
