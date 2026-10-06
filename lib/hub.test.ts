import { describe, it, expect } from "vitest";
import { estimateLift, forecastPhysique, developmentFromLifts, type HubContext } from "./hub";
import { rateRoutine, routineFromTemplate } from "./routine";
import { physiquePlan } from "./physique";

const base = { sex: "male" as const, age: 30, weightKg: 80, heightCm: 180, bodyFatPct: 15, level: "intermediate" as const };
const ctx = (over: Partial<HubContext> = {}): HubContext => ({
  ...base,
  goal: "build",
  rating: rateRoutine(routineFromTemplate("upper-lower")),
  ...over,
});
const plan = (goal: "build" | "cut" = "build", weeks = 26) =>
  physiquePlan({ ...base, level: "intermediate", activityMultiplier: 1.55, goal, weeks });

describe("estimateLift", () => {
  it("estimates e1RM with RIR and ranks standard lifts", () => {
    const l = estimateLift({ id: "a", exerciseId: "bench-press", weightKg: 100, reps: 5, rir: 0 }, ctx(), 6);
    expect(l.e1rm).toBeGreaterThan(110);
    expect(l.e1rm).toBeLessThan(120);
    expect(l.level).not.toBeNull();
    expect(l.percentile).toBeGreaterThan(0);
  });
  it("forecast rises with diminishing returns and is slower on a cut", () => {
    const build = estimateLift({ id: "a", exerciseId: "squat", weightKg: 100, reps: 5, rir: 1 }, ctx(), 12);
    const cut = estimateLift({ id: "a", exerciseId: "squat", weightKg: 100, reps: 5, rir: 1 }, ctx({ goal: "cut" }), 12);
    const f = build.forecast;
    expect(f[12]).toBeGreaterThan(f[0]);
    expect(f[1] - f[0]).toBeGreaterThan(f[12] - f[11]);
    expect(cut.forecast[12]).toBeLessThan(f[12]);
  });
  it("beginners progress faster than advanced lifters", () => {
    const e = { id: "a", exerciseId: "bench-press", weightKg: 60, reps: 8, rir: 1 };
    const b = estimateLift(e, ctx({ level: "beginner" }), 6);
    const a = estimateLift(e, ctx({ level: "advanced" }), 6);
    expect(b.forecast[6] / b.forecast[0]).toBeGreaterThan(a.forecast[6] / a.forecast[0]);
  });
  it("bodyweight lifts report added load", () => {
    const l = estimateLift({ id: "a", exerciseId: "pull-up", weightKg: 0, reps: 10, rir: 0 }, ctx(), 3);
    expect(l.e1rm).toBeGreaterThan(0);
    expect(l.e1rm).toBeLessThan(40);
  });
});

describe("forecastPhysique", () => {
  it("flags muscles a routine doesn't train", () => {
    const bro = ctx({ rating: rateRoutine(routineFromTemplate("bro-split")) });
    const f = forecastPhysique({ ctx: bro, plan: plan(), months: 6, lifts: [] });
    expect(f.muscles.find((m) => m.muscle === "abs")!.verdict).toBe("under-trained");
  });
  it("better training means more of the diet's potential is realised", () => {
    const good = forecastPhysique({ ctx: ctx(), plan: plan(), months: 6, lifts: [] });
    const poor = forecastPhysique({ ctx: ctx({ rating: rateRoutine(routineFromTemplate("bro-split")) }), plan: plan(), months: 6, lifts: [] });
    expect(good.leanGainKg).toBeGreaterThan(0);
    expect(good.leanGainKg).toBeLessThanOrEqual(good.potentialLeanGainKg);
    expect(good.trainingQuality).toBeGreaterThan(poor.trainingQuality);
  });
  it("uses lift strength to spot lagging and strong muscles", () => {
    const c = ctx();
    const lifts = [
      estimateLift({ id: "a", exerciseId: "bench-press", weightKg: 130, reps: 3, rir: 0 }, c, 6),
      estimateLift({ id: "b", exerciseId: "squat", weightKg: 60, reps: 5, rir: 0 }, c, 6),
    ];
    const dev = developmentFromLifts(lifts);
    expect(dev.chest!).toBeGreaterThan(dev.quads!);
    const f = forecastPhysique({ ctx: c, plan: plan(), months: 6, lifts });
    expect(f.muscles.find((m) => m.muscle === "quads")!.verdict).toBe("lagging");
    expect(f.muscles.find((m) => m.muscle === "chest")!.verdict).toBe("strong-point");
  });
  it("a cut projects lower body fat", () => {
    const f = forecastPhysique({ ctx: ctx({ goal: "cut" }), plan: plan("cut"), months: 6, lifts: [] });
    expect(f.then.bodyFatPct).toBeLessThan(f.now.bodyFatPct);
  });
});

import { ordinal } from "./hub";
describe("ordinal", () => {
  it("formats ordinals", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 32, 63].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "32nd", "63rd"]);
  });
});
