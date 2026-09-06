import { describe, it, expect } from "vitest";
import { generatePlan, type PlanInput } from "./workoutPlan";
import {
  rateProgram,
  recoveryCapacity,
  wnsTarget,
  DEFAULT_CONTEXT,
  type RatingContext,
} from "./programRating";

const input: PlanInput = {
  goal: "hypertrophy",
  daysPerWeek: 4,
  split: "antPost",
  equipment: "full",
  incrementKg: 2.5,
};
const plan = generatePlan(input);

describe("rateProgram", () => {
  it("scores a well-built 4-day plan highly and reports the drivers", () => {
    const r = rateProgram(plan, DEFAULT_CONTEXT);
    expect(r.score).toBeGreaterThan(85);
    expect(r.grade).toMatch(/^A/);
    expect(r.drivers.reduce((s, d) => s + d.weight, 0)).toBeCloseTo(1, 5);
    expect(r.perMuscle.length).toBe(plan.volume.length);
  });

  it("marks a 3-day PPL down for training each muscle only once a week", () => {
    const ppl = rateProgram(generatePlan({ ...input, daysPerWeek: 3, split: "ppl" }), DEFAULT_CONTEXT);
    const ul = rateProgram(generatePlan({ ...input, daysPerWeek: 3, split: "upperLower" }), DEFAULT_CONTEXT);
    expect(ppl.score).toBeLessThan(ul.score);
    const freq = (r: typeof ppl) => r.drivers.find((d) => d.label === "Frequency")!.score;
    expect(freq(ppl)).toBeLessThan(freq(ul));
  });

  it("counts stimulating reps, not sets: far-from-failure work scores less stimulus", () => {
    const hard = rateProgram(generatePlan({ ...input, goal: "hypertrophy" }), DEFAULT_CONTEXT);
    const easy = rateProgram(generatePlan({ ...input, goal: "power" }), DEFAULT_CONTEXT);
    expect(hard.totalWns).toBeGreaterThan(easy.totalWns);
    expect(hard.sfr).toBeGreaterThan(easy.sfr);
  });

  it("drops the score when recovery context is poor", () => {
    const rough: RatingContext = {
      sleepHours: 5.5,
      stress: "high",
      nutrition: "deficit",
      age: 45,
      experience: "beginner",
    };
    const good = rateProgram(plan, DEFAULT_CONTEXT);
    const bad = rateProgram(plan, rough);
    expect(bad.score).toBeLessThan(good.score - 10);
    expect(bad.fatigueLoad).toBeGreaterThan(good.fatigueLoad);
    expect(bad.flags.some((f) => /sleep/i.test(f.text))).toBe(true);
    expect(bad.improvements.length).toBeGreaterThan(0);
  });

  it("flags a muscle the plan never trains", () => {
    const noLegs = {
      ...plan,
      volume: plan.volume.filter((v) => v.muscle !== "Quads"),
    };
    const r = rateProgram(noLegs, DEFAULT_CONTEXT);
    expect(r.flags.some((f) => f.tone === "bad" && /Quads/.test(f.text))).toBe(true);
  });

  it("uses a lower stimulating-rep target for strength than hypertrophy", () => {
    expect(wnsTarget("strength").min).toBeLessThan(wnsTarget("hypertrophy").min);
  });
});

describe("recoveryCapacity", () => {
  it("grows with training days but sub-linearly", () => {
    const three = recoveryCapacity(3, DEFAULT_CONTEXT);
    const six = recoveryCapacity(6, DEFAULT_CONTEXT);
    expect(six).toBeGreaterThan(three);
    expect(six).toBeLessThan(three * 2);
  });

  it("falls with poor sleep, high stress and a calorie deficit", () => {
    const base = recoveryCapacity(4, DEFAULT_CONTEXT);
    expect(recoveryCapacity(4, { ...DEFAULT_CONTEXT, sleepHours: 5 })).toBeLessThan(base);
    expect(recoveryCapacity(4, { ...DEFAULT_CONTEXT, stress: "high" })).toBeLessThan(base);
    expect(recoveryCapacity(4, { ...DEFAULT_CONTEXT, nutrition: "deficit" })).toBeLessThan(base);
  });

  it("clamps the combined context effect to a plausible range", () => {
    const worst = recoveryCapacity(4, {
      sleepHours: 4,
      stress: "high",
      nutrition: "deficit",
      age: 70,
      experience: "beginner",
    });
    expect(worst / recoveryCapacity(4, { ...DEFAULT_CONTEXT, sleepHours: 7.5 })).toBeGreaterThan(0.55);
  });
});
