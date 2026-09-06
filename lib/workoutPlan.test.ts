import { describe, it, expect } from "vitest";
import {
  availableSplits,
  defaultSplit,
  generatePlan,
  stimulatingReps,
  volumeTarget,
  MUSCLES,
  type PlanInput,
  type Split,
} from "./workoutPlan";

const base: PlanInput = {
  goal: "hypertrophy",
  daysPerWeek: 4,
  split: "antPost",
  equipment: "full",
  incrementKg: 2.5,
};

describe("splits", () => {
  it("offers only splits that fit the day count, best frequency first", () => {
    const four = availableSplits(4);
    expect(four.length).toBeGreaterThan(0);
    for (let i = 1; i < four.length; i++) {
      expect(four[i - 1].minMuscleFrequency).toBeGreaterThanOrEqual(four[i].minMuscleFrequency);
    }
    // PPL only reaches 2×/week at 6 days, and never beats a 2-way split on 4.
    expect(four[0].key).not.toBe("ppl");
    expect(availableSplits(6).find((s) => s.key === "ppl")!.minMuscleFrequency).toBe(2);
    // Five-session splits don't fit into three days.
    expect(availableSplits(3).map((s) => s.key)).not.toContain("pplUL");
  });

  it("runs anterior/posterior twice each on 4 days", () => {
    const ap = availableSplits(4).find((s) => s.key === "antPost")!;
    expect(ap.sessionFrequency).toBe(2);
    expect(ap.pattern).toBe("Anterior ×2 · Posterior ×2");
    const plan = generatePlan(base);
    expect(plan.days.map((d) => d.label)).toEqual([
      "Anterior A",
      "Posterior A",
      "Anterior B",
      "Posterior B",
    ]);
  });

  it("defaults to the highest-frequency split for the day count", () => {
    for (const days of [3, 4, 5, 6]) {
      const best = availableSplits(days)[0];
      expect(defaultSplit(days)).toBe(best.key);
    }
  });
});

describe("frequency floor", () => {
  it("hits every muscle at least 1.5×/week on the default split, 3–6 days", () => {
    for (const days of [3, 4, 5, 6]) {
      const plan = generatePlan({ ...base, daysPerWeek: days, split: defaultSplit(days) });
      expect(plan.minFrequency).toBeGreaterThanOrEqual(1.5);
    }
  });

  it("still generates (and flags) a 3-day PPL, where 2×/week is impossible", () => {
    const plan = generatePlan({ ...base, daysPerWeek: 3, split: "ppl" });
    expect(plan.minFrequency).toBe(1);
    expect(plan.notes.join(" ")).toMatch(/only reaches 1× per week/i);
  });

  it("falls back to a valid split when the chosen one doesn't fit the days", () => {
    const plan = generatePlan({ ...base, daysPerWeek: 5, split: "ppl" as Split });
    expect(plan.days).toHaveLength(5);
    expect(plan.minFrequency).toBeGreaterThanOrEqual(1.5);
  });
});

describe("volume & stimulating reps", () => {
  it("keeps weekly hard sets in the lower, Beardsley-style band", () => {
    const plan = generatePlan(base);
    const vt = volumeTarget("hypertrophy");
    // Well below the old 10–20 "sets per week" default.
    expect(vt.max).toBeLessThanOrEqual(15);
    const major = plan.volume.filter((v) => !["Core", "Calves"].includes(v.muscle));
    for (const v of major) {
      expect(v.sets).toBeGreaterThanOrEqual(vt.min - 2);
      expect(v.sets).toBeLessThanOrEqual(vt.max + 2);
    }
  });

  it("counts only the last five reps before failure as stimulating", () => {
    expect(stimulatingReps(10, 0)).toBe(5);
    expect(stimulatingReps(10, 2)).toBe(3);
    expect(stimulatingReps(10, 5)).toBe(0);
    // A short set can't contain more stimulating reps than it has reps.
    expect(stimulatingReps(3, 0)).toBe(3);
  });

  it("gives a set taken closer to failure more stimulus than an easy one", () => {
    const hard = generatePlan({ ...base, goal: "hypertrophy" });
    const easy = generatePlan({ ...base, goal: "power" });
    const wns = (p: typeof hard) => p.volume.reduce((s, v) => s + v.stimulatingReps, 0);
    expect(wns(hard)).toBeGreaterThan(wns(easy));
  });

  it("tracks every muscle it trains and reports a frequency for each", () => {
    const plan = generatePlan({ ...base, daysPerWeek: 4, split: "upperLower" });
    for (const v of plan.volume) {
      expect(MUSCLES).toContain(v.muscle);
      expect(v.frequency).toBeGreaterThan(0);
      expect(v.stimulatingReps).toBeGreaterThan(0);
    }
  });
});

describe("customisation", () => {
  it("adds a set for an emphasised muscle", () => {
    const plain = generatePlan(base);
    const chest = generatePlan({ ...base, emphasis: "Chest" });
    const sets = (p: typeof plain, m: string) => p.volume.find((v) => v.muscle === m)!.sets;
    expect(sets(chest, "Chest")).toBeGreaterThan(sets(plain, "Chest"));
  });

  it("respects a per-session set cap", () => {
    const plan = generatePlan({ ...base, maxSets: 12 });
    for (const day of plan.days) {
      const sets = day.exercises.reduce((s, e) => s + (e.sets ?? 0), 0);
      expect(sets).toBeLessThanOrEqual(12);
    }
  });

  it("computes working weights from 1RMs on barbell main lifts", () => {
    const plan = generatePlan({ ...base, goal: "strength", oneRMs: { squat: 150 } });
    const squat = plan.days.flatMap((d) => d.exercises).find((e) => e.name === "Back squat")!;
    expect(squat.pct).toBeCloseTo(0.85, 5);
    expect(squat.weightKg).toBe(127.5);
  });

  it("swaps in bodyweight variants and drops %1RM loads", () => {
    const plan = generatePlan({ ...base, equipment: "bodyweight" });
    const names = plan.days.flatMap((d) => d.exercises).map((e) => e.name);
    expect(names.join(" ")).not.toMatch(/Back squat|Bench press/);
    expect(plan.days.flatMap((d) => d.exercises).every((e) => e.pct === undefined)).toBe(true);
  });
});

describe("endurance program", () => {
  it("is cardio-led and adds strength support from 4 days", () => {
    const three = generatePlan({ ...base, goal: "endurance", daysPerWeek: 3 });
    expect(three.days.every((d) => d.exercises.every((e) => e.kind === "cardio"))).toBe(true);
    const four = generatePlan({ ...base, goal: "endurance", daysPerWeek: 4 });
    expect(four.days.some((d) => d.label === "Strength support")).toBe(true);
    expect(four.volume.length).toBeGreaterThan(0);
  });
});
