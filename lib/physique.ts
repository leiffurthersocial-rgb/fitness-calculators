/**
 * lib/physique.ts
 * ---------------
 * Muscle-building / recomp / cut planner built on tissue energy costs rather
 * than "bulk at +X% bodyweight per week".
 *
 * Why: muscle growth is limited by the training stimulus and your training
 * age, not by calories. Building 1 kg of lean tissue costs only ~2,300 kcal
 * (≈1,800 kcal stored + synthesis costs), so even a fast-gaining beginner
 * needs a surplus of ~100 kcal/day for the muscle itself. Energy beyond that
 * is stored as fat (1 kg ≈ 9,400 kcal) without adding meaningful muscle —
 * in Helms et al. (2023) a ~15% surplus mainly added fat versus ~5%. Lean mass can also grow at maintenance or in a
 * modest deficit ("recomposition"), especially in beginners, people returning
 * to training and those with more body fat (Barakat et al. 2020).
 */

import { muscleGainPotential, bmrMifflin, tdee, macroSplit, type TrainingLevel } from "./formulas";

/** Energy to build 1 kg of lean tissue, incl. synthesis costs (kcal). */
export const LEAN_GAIN_KCAL = 2300;
/** Energy released by losing 1 kg of lean tissue (kcal). */
export const LEAN_LOSS_KCAL = 1800;
/** Energy in 1 kg of body fat (kcal). */
export const FAT_KCAL = 9400;

export type PhysiqueGoal = "build" | "recomp" | "cut";

/** How much of the full muscle-gain rate is possible at maintenance calories. */
const RECOMP_FACTOR: Record<TrainingLevel, number> = {
  beginner: 0.6,
  intermediate: 0.3,
  advanced: 0.12,
};

export function recompFactor(level: TrainingLevel, sex: "male" | "female", bodyFatPct: number): number {
  const high = sex === "male" ? bodyFatPct >= 20 : bodyFatPct >= 30;
  return Math.min(0.8, (RECOMP_FACTOR[level] ?? 0.3) + (high ? 0.15 : 0));
}

/**
 * Share of weight lost that comes from lean tissue on a cut, assuming hard
 * resistance training and high protein. Leaner people and faster cuts lose
 * more lean (Forbes; Garthe et al. 2011).
 */
export function leanShareOfLoss(bodyFatPct: number, ratePctPerWeek: number): number {
  const untrained = 1 - Math.min(0.92, Math.max(0.6, 0.65 + (bodyFatPct - 12) * 0.013));
  const training = 0.4; // resistance training + protein spare most lean mass
  const pace = Math.min(1.5, Math.max(0, (ratePctPerWeek - 0.25) / 0.75));
  return untrained * training * pace;
}

export interface PhysiqueWeek {
  week: number;
  weightKg: number;
  leanKg: number;
  fatKg: number;
  bodyFatPct: number;
}

export interface PhysiquePlan {
  goal: PhysiqueGoal;
  tdee: number;
  calories: number;
  /** Daily energy balance vs maintenance (signed). */
  deltaKcal: number;
  /** Expected scale change per week (signed, kg). */
  weightPerWeekKg: number;
  leanPerWeekKg: number;
  fatPerWeekKg: number;
  /** Max lean gain per week for this person (kg). */
  maxLeanPerWeekKg: number;
  /** Surplus that exactly covers max-rate muscle gain (kcal/day). */
  muscleOnlySurplus: number;
  proteinPerKg: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  trajectory: PhysiqueWeek[];
  totals: { leanKg: number; fatKg: number; weightKg: number };
  weeksToTargetBf: number | null;
}

export interface PhysiqueInput {
  sex: "male" | "female";
  age: number;
  heightCm: number;
  weightKg: number;
  bodyFatPct: number;
  level: TrainingLevel;
  activityMultiplier: number;
  goal: PhysiqueGoal;
  /** Build: extra kcal/day on top of the muscle-only surplus (0 = no planned fat gain). */
  extraSurplus?: number;
  /** Cut: target loss, % of bodyweight per week. */
  cutRatePct?: number;
  /** Cut: stop and report when body fat reaches this. */
  targetBodyFatPct?: number;
  weeks?: number;
}

export function physiquePlan(input: PhysiqueInput): PhysiquePlan {
  const { sex, age, heightCm, weightKg, bodyFatPct, level, activityMultiplier, goal } = input;
  const weeks = input.weeks ?? 16;
  const extra = Math.max(0, input.extraSurplus ?? 0);
  const cutRate = input.cutRatePct ?? 0.75;

  const maintenance = tdee(bmrMifflin(weightKg, heightCm, age, sex), activityMultiplier);
  const mg = muscleGainPotential({ sex, age, heightCm, weightKg, bodyFatPct, level });
  const maxLeanPerWeekKg = (mg.ratePerMonthLoKg + mg.ratePerMonthHiKg) / 2 / 4.345;
  const muscleOnlySurplus = (maxLeanPerWeekKg * LEAN_GAIN_KCAL) / 7;
  const rf = recompFactor(level, sex, bodyFatPct);

  // Weekly lean & fat change for this goal (at the starting body).
  let leanW: number;
  let fatW: number;
  if (goal === "build") {
    leanW = maxLeanPerWeekKg;
    fatW = (extra * 7) / FAT_KCAL;
  } else if (goal === "recomp") {
    leanW = maxLeanPerWeekKg * rf;
    fatW = -(leanW * LEAN_GAIN_KCAL) / FAT_KCAL; // the muscle is paid for from fat stores
  } else {
    const lossKg = (cutRate / 100) * weightKg;
    const gainWhileCutting = maxLeanPerWeekKg * rf * Math.max(0, 1 - cutRate / 1);
    leanW = gainWhileCutting - lossKg * leanShareOfLoss(bodyFatPct, cutRate);
    fatW = -lossKg - leanW;
  }

  const energy = (lean: number, fat: number) =>
    (fat * FAT_KCAL + lean * (lean >= 0 ? LEAN_GAIN_KCAL : LEAN_LOSS_KCAL)) / 7;
  const deltaKcal = energy(leanW, fatW);
  const calories = Math.round(maintenance + deltaKcal);

  // Protein: higher in a deficit to protect muscle (Morton 2018; Helms 2014).
  const proteinPerKg = goal === "cut" ? 2.2 : goal === "recomp" ? 2.0 : 1.8;
  const m = macroSplit(calories, weightKg, proteinPerKg);

  // Project week by week; lean gain stops at the natural ceiling.
  let lean = weightKg * (1 - bodyFatPct / 100);
  let fat = weightKg - lean;
  let leanRoom = mg.remainingKg;
  const trajectory: PhysiqueWeek[] = [{ week: 0, weightKg, leanKg: lean, fatKg: fat, bodyFatPct }];
  let weeksToTargetBf: number | null = null;
  for (let w = 1; w <= 104; w++) {
    // A cut ends at the target body fat; after that, weight is held at maintenance.
    const done = goal === "cut" && weeksToTargetBf !== null;
    const dl = done ? 0 : leanW > 0 ? Math.min(leanW, Math.max(0, leanRoom)) : leanW;
    leanRoom -= Math.max(0, dl);
    lean = Math.max(0, lean + dl);
    if (!done) fat = Math.max(0, fat + fatW);
    const wt = lean + fat;
    const bf = wt > 0 ? (fat / wt) * 100 : 0;
    if (goal === "cut" && weeksToTargetBf === null && input.targetBodyFatPct != null && bf <= input.targetBodyFatPct) {
      weeksToTargetBf = w;
    }
    if (w <= weeks) trajectory.push({ week: w, weightKg: wt, leanKg: lean, fatKg: fat, bodyFatPct: bf });
  }
  const end = trajectory[trajectory.length - 1];

  return {
    goal,
    tdee: maintenance,
    calories,
    deltaKcal,
    weightPerWeekKg: leanW + fatW,
    leanPerWeekKg: leanW,
    fatPerWeekKg: fatW,
    maxLeanPerWeekKg,
    muscleOnlySurplus,
    proteinPerKg,
    proteinG: m.proteinG,
    carbsG: m.carbsG,
    fatG: m.fatG,
    trajectory,
    totals: { leanKg: end.leanKg - trajectory[0].leanKg, fatKg: end.fatKg - trajectory[0].fatKg, weightKg: end.weightKg - weightKg },
    weeksToTargetBf,
  };
}

export interface StrategyRow {
  key: string;
  label: string;
  plan: PhysiquePlan;
}

/** The same person and timeframe under different calorie strategies. */
export function compareStrategies(base: Omit<PhysiqueInput, "goal" | "extraSurplus" | "cutRatePct">): StrategyRow[] {
  const maintenance = tdee(bmrMifflin(base.weightKg, base.heightCm, base.age, base.sex), base.activityMultiplier);
  const build = (extra: number) => physiquePlan({ ...base, goal: "build", extraSurplus: extra });
  const muscleOnly = build(0);
  const pctExtra = (p: number) => Math.max(0, maintenance * p - muscleOnly.muscleOnlySurplus);
  return [
    { key: "cut", label: "Cut 0.75%/wk", plan: physiquePlan({ ...base, goal: "cut", cutRatePct: 0.75 }) },
    { key: "recomp", label: "Recomp (maintenance)", plan: physiquePlan({ ...base, goal: "recomp" }) },
    { key: "muscle", label: "Build — muscle only", plan: muscleOnly },
    { key: "lean-bulk", label: "Lean bulk (+10%)", plan: build(pctExtra(0.1)) },
    { key: "bulk", label: "Classic bulk (+500 kcal)", plan: build(Math.max(0, 500 - muscleOnly.muscleOnlySurplus)) },
  ];
}
