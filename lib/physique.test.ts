import { describe, it, expect } from "vitest";
import { physiquePlan, compareStrategies, leanShareOfLoss, LEAN_GAIN_KCAL } from "./physique";

const base = {
  sex: "male" as const,
  age: 30,
  heightCm: 180,
  weightKg: 80,
  bodyFatPct: 15,
  level: "intermediate" as const,
  activityMultiplier: 1.55,
  weeks: 16,
};

describe("physiquePlan — build", () => {
  it("muscle-only surplus is small and adds no fat", () => {
    const p = physiquePlan({ ...base, goal: "build" });
    expect(p.deltaKcal).toBeGreaterThan(0);
    expect(p.deltaKcal).toBeLessThan(150);
    expect(p.totals.fatKg).toBeCloseTo(0, 5);
    expect(p.totals.leanKg).toBeGreaterThan(0);
  });
  it("surplus = lean gain × energy cost of lean tissue", () => {
    const p = physiquePlan({ ...base, goal: "build" });
    expect(p.muscleOnlySurplus).toBeCloseTo((p.maxLeanPerWeekKg * LEAN_GAIN_KCAL) / 7);
  });
  it("beginners need a bigger surplus than advanced lifters", () => {
    const b = physiquePlan({ ...base, level: "beginner", goal: "build" });
    const a = physiquePlan({ ...base, level: "advanced", goal: "build" });
    expect(b.muscleOnlySurplus).toBeGreaterThan(a.muscleOnlySurplus);
  });
  it("extra surplus adds fat, not muscle", () => {
    const lean = physiquePlan({ ...base, goal: "build" });
    const dirty = physiquePlan({ ...base, goal: "build", extraSurplus: 500 });
    expect(dirty.totals.leanKg).toBeCloseTo(lean.totals.leanKg, 5);
    expect(dirty.totals.fatKg).toBeGreaterThan(lean.totals.fatKg + 4);
  });
});

describe("physiquePlan — recomp & cut", () => {
  it("recomp at maintenance builds some muscle and loses a little fat", () => {
    const p = physiquePlan({ ...base, goal: "recomp" });
    expect(p.deltaKcal).toBeCloseTo(0, 5);
    expect(p.totals.leanKg).toBeGreaterThan(0);
    expect(p.totals.fatKg).toBeLessThan(0);
  });
  it("cut loses mostly fat and reaches a target body fat", () => {
    const p = physiquePlan({ ...base, goal: "cut", cutRatePct: 0.75, targetBodyFatPct: 8 });
    expect(p.deltaKcal).toBeLessThan(0);
    expect(p.totals.fatKg).toBeLessThan(-5);
    expect(Math.abs(p.totals.leanKg)).toBeLessThan(Math.abs(p.totals.fatKg) / 5);
    expect(p.weeksToTargetBf).toBeGreaterThan(0);
  });
  it("a cut stops at the target body fat", () => {
    const p = physiquePlan({ ...base, goal: "cut", cutRatePct: 0.75, targetBodyFatPct: 12, weeks: 24 });
    const end = p.trajectory[p.trajectory.length - 1];
    expect(p.weeksToTargetBf).toBeLessThan(24);
    expect(end.bodyFatPct).toBeGreaterThan(11);
    expect(end.bodyFatPct).toBeLessThanOrEqual(12);
  });
  it("faster cuts risk more lean mass", () => {
    expect(leanShareOfLoss(15, 1)).toBeGreaterThan(leanShareOfLoss(15, 0.5));
    expect(leanShareOfLoss(10, 0.75)).toBeGreaterThan(leanShareOfLoss(25, 0.75));
  });
});

describe("compareStrategies", () => {
  it("bigger surpluses give the same muscle and more fat", () => {
    const rows = Object.fromEntries(compareStrategies(base).map((r) => [r.key, r.plan]));
    expect(rows["bulk"].totals.leanKg).toBeCloseTo(rows["muscle"].totals.leanKg, 5);
    expect(rows["bulk"].totals.fatKg).toBeGreaterThan(rows["lean-bulk"].totals.fatKg);
    expect(rows["lean-bulk"].totals.fatKg).toBeGreaterThan(rows["muscle"].totals.fatKg);
    expect(rows["recomp"].totals.leanKg).toBeLessThan(rows["muscle"].totals.leanKg);
  });
});
