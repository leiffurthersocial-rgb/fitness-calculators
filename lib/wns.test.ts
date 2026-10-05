import { describe, it, expect } from "vitest";
import {
  workoutStimulus,
  setEffectiveness,
  weeklyNetStimulus,
  evenSchedule,
  wnsVerdict,
} from "./wns";

describe("workoutStimulus", () => {
  it("one hard set = 1 unit on every curve", () => {
    expect(workoutStimulus(1, "schoenfeld")).toBeCloseTo(1);
    expect(workoutStimulus(1, "pelland")).toBeCloseTo(1);
    expect(workoutStimulus(1, "average")).toBeCloseTo(1);
  });
  it("6 sets ≈ 2× (Schoenfeld) and 4× (Pelland) one set", () => {
    expect(workoutStimulus(6, "schoenfeld")).toBeCloseTo(2);
    expect(workoutStimulus(6, "pelland")).toBeCloseTo(4);
    expect(workoutStimulus(6, "average")).toBeCloseTo(3);
  });
  it("has diminishing returns", () => {
    const s = [1, 2, 3, 4, 5].map((n) => workoutStimulus(n));
    for (let i = 1; i < s.length; i++) {
      expect(s[i]).toBeGreaterThan(s[i - 1]);
      if (i > 1) expect(s[i] - s[i - 1]).toBeLessThan(s[i - 1] - s[i - 2]);
    }
  });
  it("zero sets = zero stimulus", () => {
    expect(workoutStimulus(0)).toBe(0);
  });
});

describe("setEffectiveness (stimulating reps)", () => {
  it("failure = 5/5, 2 RIR = 3/5, 5+ RIR = 0", () => {
    expect(setEffectiveness(0)).toBe(1);
    expect(setEffectiveness(2)).toBeCloseTo(0.6);
    expect(setEffectiveness(5)).toBe(0);
    expect(setEffectiveness(8)).toBe(0);
  });
});

describe("weeklyNetStimulus", () => {
  it("3 sets once per week is maintenance (calibration)", () => {
    const r = weeklyNetStimulus([3, 0, 0, 0, 0, 0, 0]);
    expect(r.wns).toBeCloseTo(0);
    expect(r.uncoveredHours).toBe(120);
    expect(wnsVerdict(r.wns)).toBe("maintenance");
  });
  it("1 set twice per week causes growth (Beardsley's example)", () => {
    const r = weeklyNetStimulus([1, 0, 0, 1, 0, 0, 0]);
    expect(r.wns).toBeGreaterThan(0);
    expect(r.uncoveredHours).toBe(72);
  });
  it("same weekly sets: full body 3×/wk beats upper/lower 2×/wk", () => {
    const fullBody = weeklyNetStimulus(evenSchedule(12, 3));
    const upperLower = weeklyNetStimulus(evenSchedule(12, 2));
    expect(fullBody.wns).toBeGreaterThan(upperLower.wns);
  });
  it("one big weekly session loses to splitting the same volume", () => {
    const once = weeklyNetStimulus([10, 0, 0, 0, 0, 0, 0]);
    const twice = weeklyNetStimulus([5, 0, 0, 5, 0, 0, 0]);
    expect(twice.wns).toBeGreaterThan(once.wns);
  });
  it("no training = full week of atrophy", () => {
    const r = weeklyNetStimulus([0, 0, 0, 0, 0, 0, 0]);
    expect(r.uncoveredHours).toBe(168);
    expect(wnsVerdict(r.wns)).toBe("loss");
  });
  it("overlapping windows on back-to-back days don't double-count coverage", () => {
    const r = weeklyNetStimulus([2, 2, 0, 0, 0, 0, 0], { stimulusHours: 48 });
    expect(r.uncoveredHours).toBe(168 - 72);
  });
  it("sets far from failure add nothing", () => {
    const r = weeklyNetStimulus([3, 0, 0, 3, 0, 0, 0], { rir: 6 });
    expect(r.weeklyStimulus).toBe(0);
    expect(r.uncoveredHours).toBe(168);
  });
});

describe("evenSchedule", () => {
  it("spreads sets across the week", () => {
    expect(evenSchedule(9, 3)).toEqual([3, 0, 3, 0, 3, 0, 0]);
    expect(evenSchedule(6, 2)).toEqual([3, 0, 0, 3, 0, 0, 0]);
  });
});
