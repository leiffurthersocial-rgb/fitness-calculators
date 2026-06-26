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
