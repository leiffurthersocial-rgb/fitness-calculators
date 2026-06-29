import { describe, it, expect } from "vitest";
import { athleteScore, type AthleteInput } from "./score";

const base: AthleteInput = {
  sex: "male",
  age: 30,
  heightCm: 180,
  weightKg: 82,
  bodyFatPct: 15,
};

describe("athleteScore", () => {
  it("returns a 0–1000 overall and a tier", () => {
    const r = athleteScore({ ...base, lifts: { squat: 140, bench: 100, deadlift: 180 }, vo2max: 45 });
    expect(r.overall).toBeGreaterThanOrEqual(0);
    expect(r.overall).toBeLessThanOrEqual(1000);
    expect(typeof r.tier).toBe("string");
    expect(r.percentile).toBe(Math.round(r.overall / 10));
  });

  it("drops pillars with no data and redistributes weight", () => {
    // Body-composition only (height/weight/bf present, nothing else).
    const r = athleteScore(base);
    const present = r.pillars.filter((p) => p.score != null);
    expect(present.map((p) => p.key)).toContain("bodyComp");
    expect(r.pillars.find((p) => p.key === "strength")!.score).toBeNull();
    // The single present pillar carries the full weight.
    expect(present.reduce((s, p) => s + p.weight, 0)).toBeCloseTo(1, 5);
  });

  it("a stronger athlete scores higher than a weaker one", () => {
    const weak = athleteScore({ ...base, lifts: { squat: 80, bench: 60, deadlift: 100 }, vo2max: 35 });
    const strong = athleteScore({ ...base, lifts: { squat: 220, bench: 150, deadlift: 260 }, vo2max: 60 });
    expect(strong.overall).toBeGreaterThan(weak.overall);
  });

  it("confidence climbs as more pillars are filled in", () => {
    const partial = athleteScore({ ...base, lifts: { squat: 140 } });
    const full = athleteScore({ ...base, lifts: { squat: 140, bench: 100, deadlift: 180 }, vo2max: 50, verticalCm: 60 });
    expect(full.confidencePct).toBeGreaterThan(partial.confidencePct);
    expect(full.confidencePct).toBeLessThanOrEqual(100);
  });

  it("identifies the limiting pillar", () => {
    const r = athleteScore({ ...base, lifts: { squat: 220, bench: 150, deadlift: 260 }, vo2max: 30 });
    // Strong lifts but poor VO₂max → endurance should be the limiter.
    expect(r.limiter?.label).toBe("Endurance");
  });

  it("scores the power pillar from a vertical jump", () => {
    const r = athleteScore({ ...base, verticalCm: 70 });
    expect(r.pillars.find((p) => p.key === "power")!.score).not.toBeNull();
  });
});
