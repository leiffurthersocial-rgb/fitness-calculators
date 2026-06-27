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

export type Lift = "squat" | "bench" | "deadlift" | "ohp";

export const LIFTS: { key: Lift; label: string }[] = [
  { key: "squat", label: "Back squat" },
  { key: "bench", label: "Bench press" },
  { key: "deadlift", label: "Deadlift" },
  { key: "ohp", label: "Overhead press" },
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
const STRENGTH_RATIOS: Record<"male" | "female", Record<Lift, number[]>> = {
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
  weight: number; // required 1RM in kg
  ratio: number; // multiple of bodyweight (age- & bodyweight-adjusted)
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

/** The five level thresholds for one lift, in kg, age- & bodyweight-adjusted. */
export function liftStandards(
  lift: Lift,
  sex: "male" | "female",
  bodyweightKg: number,
  age: number
): StandardRow[] {
  const factor = ageStrengthFactor(age) * bodyweightStrengthFactor(bodyweightKg, sex);
  return STRENGTH_RATIOS[sex][lift].map((baseRatio, i) => {
    const ratio = baseRatio * factor;
    return {
      level: STRENGTH_LEVELS[i],
      ratio,
      weight: ratio * bodyweightKg,
    };
  });
}

export interface LiftClassification {
  rows: StandardRow[];
  levelIndex: number; // -1 = below Beginner
  level: StrengthLevel | "Untrained";
  ratio: number; // user's lift as a multiple of bodyweight
  next: StandardRow | null;
  toNextKg: number; // kg still needed to reach the next level (0 if Elite)
}

/** Classify a user's 1RM against the standards for a lift. */
export function classifyLift(
  oneRMkg: number,
  lift: Lift,
  sex: "male" | "female",
  bodyweightKg: number,
  age: number
): LiftClassification {
  const rows = liftStandards(lift, sex, bodyweightKg, age);
  let levelIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    if (oneRMkg >= rows[i].weight) levelIndex = i;
  }
  const next = levelIndex + 1 < rows.length ? rows[levelIndex + 1] : null;
  return {
    rows,
    levelIndex,
    level: levelIndex < 0 ? "Untrained" : rows[levelIndex].level,
    ratio: bodyweightKg > 0 ? oneRMkg / bodyweightKg : 0,
    next,
    toNextKg: next ? Math.max(0, next.weight - oneRMkg) : 0,
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
