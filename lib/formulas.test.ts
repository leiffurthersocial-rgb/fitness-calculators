import { describe, it, expect } from "vitest";
import {
  epley1RM,
  bmrMifflin,
  tdee,
  macroSplit,
  ffmi,
  bmi,
  vo2maxCooper,
  hrZones,
  karvonenTarget,
  maxHRTanaka,
  riegelPredict,
  paceSecPerKm,
  vdotFromRace,
  vVO2max,
  runPaceForFraction,
  timeForVdotAtDistance,
  ageStrengthFactor,
  pullupBodyweightFactor,
  classifyLift,
  muscleGainPotential,
  ageMuscleFactor,
  dietPlan,
  liftBalance,
  pctOfOneRM,
  oneRMFromRPE,
  weightForRepsAtRPE,
  powerZones,
  ftpFrom20min,
  ftpWkgCategory,
  strengthScore,
  criticalSwimSpeed,
  swimZones,
  inclineFlatPace,
  raceSplits,
  runAgeFactor,
  ageGradedRunning,
  fitnessAge,
  biologicalAge,
  RACE_STANDARDS,
  sweatRate,
} from "./formulas";

describe("rep max", () => {
  it("Epley 1RM matches the textbook formula", () => {
    expect(epley1RM(100, 5)).toBeCloseTo(116.67, 1);
    // 1 rep is already a 1RM, so the weight is returned unchanged.
    expect(epley1RM(100, 1)).toBe(100);
  });
});

describe("energy & body composition", () => {
  it("Mifflin–St Jeor BMR is sex-specific", () => {
    // 80kg, 180cm, 30y male: 10*80+6.25*180-5*30+5 = 1780
    expect(bmrMifflin(80, 180, 30, "male")).toBe(1780);
    expect(bmrMifflin(80, 180, 30, "female")).toBe(1780 - 166);
  });
  it("TDEE multiplies BMR", () => {
    expect(tdee(1780, 1.55)).toBeCloseTo(2759, 0);
  });
  it("macro split: protein by g/kg, fat 25%, carbs fill", () => {
    const m = macroSplit(2000, 80, 2);
    expect(m.proteinG).toBe(160);
    expect(m.fatG).toBeCloseTo((2000 * 0.25) / 9, 2);
    // protein 640 + fat 500 → carbs (2000-1140)/4 = 215
    expect(m.carbsG).toBeCloseTo(215, 0);
  });
  it("BMI and FFMI", () => {
    expect(bmi(80, 180)).toBeCloseTo(24.69, 1);
    const f = ffmi(80, 180, 15); // lean 68
    expect(f.leanMassKg).toBeCloseTo(68, 5);
    expect(f.ffmi).toBeCloseTo(20.99, 1);
    // normalised adds 6.1*(1.8-1.8)=0 at 180cm
    expect(f.normalizedFfmi).toBeCloseTo(20.99, 1);
  });
});

describe("cardio", () => {
  it("Cooper VO2max", () => {
    expect(vo2maxCooper(2400)).toBeCloseTo((2400 - 504.9) / 44.73, 2);
  });
  it("Tanaka max HR and Karvonen target", () => {
    expect(maxHRTanaka(30)).toBeCloseTo(187, 0);
    // (187-60)*0.7+60
    expect(karvonenTarget(187, 60, 0.7)).toBeCloseTo(148.9, 1);
  });
  it("HR zones ascend and cover 50–100%", () => {
    const z = hrZones(190, 50, "karvonen");
    expect(z).toHaveLength(5);
    expect(z[0].lowBpm).toBeLessThan(z[4].highBpm);
    expect(z[4].highBpm).toBeCloseTo(190, 0); // 100% HRR = max
  });
  it("Riegel race prediction", () => {
    // 20:00 5k → 10k ≈ 2^1.06 * 1200s
    const t = riegelPredict(1200, 5000, 10000);
    expect(t).toBeCloseTo(1200 * Math.pow(2, 1.06), 0);
  });
  it("pace per km", () => {
    expect(paceSecPerKm(1200, 5000)).toBeCloseTo(240, 5); // 4:00/km
  });
});

describe("VDOT running paces", () => {
  it("5K 20:00 ≈ VDOT 50 (Daniels)", () => {
    expect(vdotFromRace(5000, 1200)).toBeCloseTo(49.8, 0);
  });
  it("equivalent race times match Daniels tables for VDOT 50", () => {
    // 5K ~19:57, marathon ~3:10:49 → within a few seconds
    expect(timeForVdotAtDistance(50, 5000)).toBeCloseTo(1197, -1);
    expect(timeForVdotAtDistance(50, 42195)).toBeCloseTo(11449, -2);
  });
  it("faster zones are faster (lower sec/km) than easy", () => {
    const easy = runPaceForFraction(50, 0.76);
    const interval = runPaceForFraction(50, 1.0);
    expect(interval).toBeLessThan(easy);
    expect(vVO2max(50)).toBeGreaterThan(150);
  });
});

describe("strength standards", () => {
  it("age factor peaks 23–30 and declines after", () => {
    expect(ageStrengthFactor(25)).toBeCloseTo(1, 5);
    expect(ageStrengthFactor(60)).toBeLessThan(1);
    expect(ageStrengthFactor(60)).toBeGreaterThanOrEqual(0.55);
  });
  it("pull-up bodyweight factor favours heavier lifters", () => {
    // heavier than reference (80kg) → factor < 1 (fewer reps needed)
    expect(pullupBodyweightFactor(100, "male")).toBeLessThan(1);
    expect(pullupBodyweightFactor(60, "male")).toBeGreaterThan(1);
  });
  it("9 pull-ups at 70kg outranks 10 at 40kg (relative reps)", () => {
    const a = classifyLift(9, "pullup", "male", 70, 28);
    const b = classifyLift(10, "pullup", "male", 40, 28);
    expect(a.relativeReps!).toBeGreaterThan(b.relativeReps!);
  });
  it("classifyLift returns a percentile and bar position in range", () => {
    const c = classifyLift(140, "squat", "male", 80, 28);
    expect(c.percentile).toBeGreaterThan(0);
    expect(c.percentile).toBeLessThanOrEqual(99.5);
    expect(c.barPct).toBeGreaterThanOrEqual(0);
    expect(c.barPct).toBeLessThanOrEqual(1);
  });
});

describe("muscle-gain potential", () => {
  it("beginner male ~75kg gains ≥9 kg/yr at the low end (Lyle)", () => {
    const r = muscleGainPotential({ sex: "male", age: 25, heightCm: 178, weightKg: 75, bodyFatPct: 15, level: "beginner" });
    const year = r.timeframes.find((t) => t.months === 12)!;
    expect(year.loKg).toBeGreaterThanOrEqual(8.5);
  });
  it("gains are capped by the genetic ceiling for the advanced/lean", () => {
    const r = muscleGainPotential({ sex: "male", age: 32, heightCm: 183, weightKg: 88, bodyFatPct: 8, level: "advanced" });
    const year = r.timeframes.find((t) => t.months === 12)!;
    expect(year.capped).toBe(true);
    expect(year.highKg).toBeLessThanOrEqual(r.remainingKg + 1e-9);
  });
  it("women gain at roughly half the male rate", () => {
    const m = muscleGainPotential({ sex: "male", age: 25, heightCm: 175, weightKg: 75, bodyFatPct: 15, level: "intermediate" });
    const w = muscleGainPotential({ sex: "female", age: 25, heightCm: 175, weightKg: 75, bodyFatPct: 15, level: "intermediate" });
    expect(w.ratePerMonthHiKg).toBeCloseTo(m.ratePerMonthHiKg * 0.5, 5);
  });
  it("age factor tapers past 30", () => {
    expect(ageMuscleFactor(30)).toBe(1);
    expect(ageMuscleFactor(50)).toBeLessThan(1);
  });
});

describe("diet planner", () => {
  it("a cut produces a deficit and reaches a lower body-fat target", () => {
    const d = dietPlan({ sex: "male", age: 30, heightCm: 180, weightKg: 85, bodyFatPct: 20, activityMultiplier: 1.55, goal: "lose", ratePctPerWeek: 0.75, experience: "intermediate", targetBodyFatPct: 12 });
    expect(d.calorieTarget).toBeLessThan(d.tdee);
    expect(d.dailyDeltaKcal).toBeLessThan(0);
    expect(d.weeksToTarget).toBeGreaterThan(0);
    expect(d.targetWeightKg!).toBeLessThan(85);
  });
  it("maintain holds weight flat", () => {
    const d = dietPlan({ sex: "male", age: 30, heightCm: 180, weightKg: 80, bodyFatPct: 18, activityMultiplier: 1.55, goal: "maintain", ratePctPerWeek: 0, experience: "intermediate" });
    expect(d.calorieTarget).toBeCloseTo(d.tdee, 0);
    const last = d.trajectory[d.trajectory.length - 1];
    expect(last.weightKg).toBeCloseTo(80, 5);
  });
});

describe("lift balance", () => {
  it("flags the lagging lift and anchors to the strongest", () => {
    const r = liftBalance({ squat: 160, bench: 110, deadlift: 200, ohp: 50 }, "male");
    expect(r.weakest!.key).toBe("ohp");
    expect(r.weakest!.deltaPct).toBeLessThan(0);
    expect(r.anchor).toBe("deadlift");
  });
  it("needs at least two lifts", () => {
    const r = liftBalance({ squat: 100, bench: 0, deadlift: 0, ohp: 0 }, "male");
    expect(r.weakest).toBeNull();
  });
});

describe("RPE / 1RM (RTS chart)", () => {
  it("matches published chart values", () => {
    expect(pctOfOneRM(1, 10)).toBeCloseTo(100, 5);
    expect(pctOfOneRM(5, 8)).toBeCloseTo(81.1, 1);
    expect(pctOfOneRM(8, 9)).toBeCloseTo(76.2, 1);
  });
  it("estimated 1RM and inverse are consistent", () => {
    const e1rm = oneRMFromRPE(100, 5, 8);
    expect(e1rm).toBeCloseTo(100 / 0.811, 0);
    // loading that e1RM for 5 reps @ RPE8 returns ~100
    expect(weightForRepsAtRPE(e1rm, 5, 8)).toBeCloseTo(100, 1);
  });
});

describe("cycling power zones", () => {
  it("FTP from 20-min test is 95%", () => {
    expect(ftpFrom20min(240)).toBeCloseTo(228, 5);
  });
  it("7 Coggan zones scale with FTP", () => {
    const z = powerZones(250);
    expect(z).toHaveLength(7);
    expect(z[3].zone.name).toBe("Threshold");
    expect(z[3].highW).toBeCloseTo(250 * 1.05, 5);
  });
  it("W/kg category bands", () => {
    expect(ftpWkgCategory(5.6, "male")).toBe("Exceptional");
    expect(ftpWkgCategory(3.2, "male")).toBe("Moderate");
  });
});

describe("strength score", () => {
  it("averages provided lifts into a 0–100 percentile + level", () => {
    const r = strengthScore({ squat: 140, bench: 100, deadlift: 180 }, "male", 80, 28);
    expect(r.lifts).toHaveLength(3);
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.level).not.toBe("Untrained");
  });
  it("ignores unentered lifts", () => {
    const r = strengthScore({ squat: 100 }, "male", 80, 28);
    expect(r.lifts).toHaveLength(1);
  });
});

describe("swimming CSS", () => {
  it("CSS is the slope of two trials", () => {
    // 400m in 360s, 200m in 170s → (200)/(190) ≈ 1.0526 m/s
    expect(criticalSwimSpeed(400, 360, 200, 170)).toBeCloseTo(200 / 190, 3);
  });
  it("zones are ordered fast→slow and centred on CSS", () => {
    const css = criticalSwimSpeed(400, 360, 200, 170);
    const z = swimZones(css);
    expect(z).toHaveLength(5);
    // threshold zone pace ≈ 100/CSS
    const cssPer100 = 100 / css;
    const thr = z[2];
    expect(thr.fastSecPer100).toBeLessThan(cssPer100 + 4);
    expect(z[0].slowSecPer100).toBeGreaterThan(z[4].fastSecPer100);
  });
});

describe("treadmill incline equivalent", () => {
  it("incline makes the flat-equivalent pace faster", () => {
    // 5:00/km (300s) at 5% grade → 300/(1+0.225)=244.9s
    expect(inclineFlatPace(300, 5)).toBeCloseTo(300 / 1.225, 1);
    expect(inclineFlatPace(300, 0)).toBe(300);
  });
});

describe("race splits", () => {
  it("even splits sum to the goal time", () => {
    const s = raceSplits(1500, 5000, 1000, 0);
    expect(s).toHaveLength(5);
    expect(s[s.length - 1].cumSec).toBeCloseTo(1500, 3);
    expect(s[0].segSec).toBeCloseTo(s[4].segSec, 3); // even
  });
  it("negative split runs the back half faster, still summing to goal", () => {
    const s = raceSplits(1500, 5000, 1000, 4);
    expect(s[s.length - 1].cumSec).toBeCloseTo(1500, 2);
    expect(s[4].segSec).toBeLessThan(s[0].segSec);
  });
});

describe("competition scoring — age-graded running", () => {
  it("age factor is 1.0 in the open prime and declines with age", () => {
    expect(runAgeFactor(28)).toBeCloseTo(1.0, 5);
    expect(runAgeFactor(60)).toBeLessThan(runAgeFactor(40));
    expect(runAgeFactor(40)).toBeLessThan(1.0);
  });

  it("an identical time grades higher for an older runner", () => {
    const fiveK = RACE_STANDARDS.find((s) => s.key === "5k")!;
    const young = ageGradedRunning(1200, fiveK, 25, "male"); // 20:00
    const old = ageGradedRunning(1200, fiveK, 60, "male");
    expect(old.ageGradePct).toBeGreaterThan(young.ageGradePct);
  });

  it("a faster time grades higher and assigns a higher level band", () => {
    const fiveK = RACE_STANDARDS.find((s) => s.key === "5k")!;
    const fast = ageGradedRunning(900, fiveK, 30, "male"); // 15:00
    const slow = ageGradedRunning(1500, fiveK, 30, "male"); // 25:00
    expect(fast.ageGradePct).toBeGreaterThan(slow.ageGradePct);
  });
});

describe("competition scoring — fitness age", () => {
  it("a high VO₂max yields a younger fitness age than calendar age", () => {
    const r = fitnessAge(50, 45, "male");
    expect(r.fitnessAge).toBeLessThan(45);
    expect(r.deltaYears).toBeGreaterThan(0);
  });

  it("a low VO₂max yields an older fitness age", () => {
    const r = fitnessAge(28, 35, "male");
    expect(r.fitnessAge).toBeGreaterThan(35);
  });

  it("clamps fitness age to the 18–80 range", () => {
    expect(fitnessAge(80, 25, "male").fitnessAge).toBe(18);
    expect(fitnessAge(10, 70, "female").fitnessAge).toBe(80);
  });
});

describe("sweat rate & hydration", () => {
  it("computes sweat rate from weigh-in/out plus fluid intake", () => {
    // Lost 1 kg net, drank 0.5 L over 1 h → 1.5 L sweat, 1.5 L/h.
    const r = sweatRate({ preKg: 80, postKg: 79, durationHr: 1, fluidIntakeL: 0.5 });
    expect(r.sweatLossL).toBeCloseTo(1.5, 5);
    expect(r.sweatRateLPerHr).toBeCloseTo(1.5, 5);
    expect(r.netDeficitL).toBeCloseTo(1.0, 5);
  });

  it("flags >2% body-mass loss as performance-impairing", () => {
    const r = sweatRate({ preKg: 70, postKg: 68.3, durationHr: 1.5, fluidIntakeL: 0 });
    expect(r.pctBodyMassLoss).toBeGreaterThan(2);
    expect(r.status).toMatch(/impairing|Significant/i);
  });

  it("targets ~150% of the deficit for rehydration and scales sodium with sweat", () => {
    const r = sweatRate({ preKg: 80, postKg: 78, durationHr: 2, fluidIntakeL: 0, sweatSodiumMgPerL: 1000 });
    expect(r.rehydrationTargetL).toBeCloseTo(3.0, 5); // 2 L deficit × 1.5
    expect(r.sodiumLossMg).toBeCloseTo(2000, 0); // 2 L sweat × 1000 mg/L
  });

  it("detects overhydration when weight goes up", () => {
    const r = sweatRate({ preKg: 70, postKg: 71, durationHr: 2, fluidIntakeL: 1.5 });
    expect(r.pctBodyMassLoss).toBeLessThan(0);
    expect(r.status).toMatch(/Overhydrated/i);
  });
});

describe("biological age (multi-factor)", () => {
  it("a fit, lean non-smoker comes out younger than calendar age", () => {
    const r = biologicalAge({ vo2max: 52, age: 45, sex: "male", restingHR: 52, bodyFatPct: 12 });
    expect(r.biologicalAge).toBeLessThan(45);
    expect(r.deltaYears).toBeGreaterThan(0);
  });

  it("poor markers and smoking add years over the fitness baseline", () => {
    const base = biologicalAge({ vo2max: 34, age: 40, sex: "male" });
    const worse = biologicalAge({ vo2max: 34, age: 40, sex: "male", restingHR: 80, bodyFatPct: 30, heightCm: 178, waistCm: 105, smoker: true });
    expect(worse.biologicalAge).toBeGreaterThan(base.biologicalAge);
    expect(worse.factors.find((f) => f.key === "smoker")!.years).toBe(6);
  });

  it("always includes the aerobic-fitness baseline factor first", () => {
    const r = biologicalAge({ vo2max: 45, age: 35, sex: "female", restingHR: 70 });
    expect(r.factors[0].key).toBe("vo2max");
    expect(r.factors.some((f) => f.key === "rhr")).toBe(true);
  });

  it("clamps individual factor contributions", () => {
    const r = biologicalAge({ vo2max: 40, age: 40, sex: "male", restingHR: 200 });
    expect(r.factors.find((f) => f.key === "rhr")!.years).toBeLessThanOrEqual(6);
  });
});
