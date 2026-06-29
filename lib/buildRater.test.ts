import { describe, it, expect } from "vitest";
import {
  SPORTS_DB,
  rateBuild,
  bestFitPositions,
  type BuildInput,
  type BuildPosition,
} from "./buildRater";

// A convenient lookup for positions used across the tests.
function pos(sportKey: string, posKey: string): BuildPosition {
  const sport = SPORTS_DB.find((s) => s.key === sportKey)!;
  return sport.positions.find((p) => p.key === posKey)!;
}

const baseMale: BuildInput = { sex: "male", heightCm: 185, weightKg: 85 };

describe("SPORTS_DB integrity", () => {
  it("has unique sport keys", () => {
    const keys = SPORTS_DB.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has unique position keys within each sport and at least one position", () => {
    for (const s of SPORTS_DB) {
      expect(s.positions.length).toBeGreaterThan(0);
      const pk = s.positions.map((p) => p.key);
      expect(new Set(pk).size).toBe(pk.length);
    }
  });

  it("has sane height/BMI bands and group weights for every position", () => {
    for (const s of SPORTS_DB) {
      for (const p of s.positions) {
        expect(p.heightCm[0]).toBeLessThan(p.heightCm[1]);
        expect(p.bmi[0]).toBeLessThan(p.bmi[1]);
        const total = p.weights.physique + p.weights.strength + p.weights.power + p.weights.endurance;
        // Weights are intended to sum to ~1.
        expect(total).toBeGreaterThan(0.95);
        expect(total).toBeLessThan(1.05);
      }
    }
  });
});

describe("rateBuild — basics", () => {
  it("returns a 0..100 overall and is physique-only with no performance data", () => {
    const r = rateBuild(baseMale, pos("basketball", "sf"));
    expect(r.overall).toBeGreaterThanOrEqual(0);
    expect(r.overall).toBeLessThanOrEqual(100);
    expect(r.enteredGroups).toBe(1);
    expect(r.groups.find((g) => g.group === "strength")!.score).toBeNull();
  });

  it("scores height best at the centre of the role's band", () => {
    const center = rateBuild({ ...baseMale, heightCm: 212, weightKg: 110 }, pos("basketball", "c"));
    const short = rateBuild({ ...baseMale, heightCm: 175, weightKg: 80 }, pos("basketball", "c"));
    const centerH = center.metrics.find((m) => m.key === "height")!.score;
    const shortH = short.metrics.find((m) => m.key === "height")!.score;
    expect(centerH).toBeGreaterThan(shortH);
  });

  it("rewards a stronger relative squat with a higher strength score", () => {
    const weak = rateBuild({ ...baseMale, squat: 100 }, pos("powerlifting", "lifter"));
    const strong = rateBuild({ ...baseMale, squat: 220 }, pos("powerlifting", "lifter"));
    const ws = weak.groups.find((g) => g.group === "strength")!.score!;
    const ss = strong.groups.find((g) => g.group === "strength")!.score!;
    expect(ss).toBeGreaterThan(ws);
  });
});

describe("rateBuild — new power metrics", () => {
  it("scores broad jump and agility in the power group", () => {
    const r = rateBuild(
      { ...baseMale, heightCm: 180, weightKg: 90, broad: 300, agility: 4.2 },
      pos("football", "rb")
    );
    expect(r.metrics.some((m) => m.key === "broad")).toBe(true);
    expect(r.metrics.some((m) => m.key === "agility")).toBe(true);
    expect(r.groups.find((g) => g.group === "power")!.score).not.toBeNull();
  });

  it("treats a faster agility shuttle as better (lower is better)", () => {
    const slow = rateBuild({ ...baseMale, agility: 5.0 }, pos("football", "db"));
    const fast = rateBuild({ ...baseMale, agility: 4.0 }, pos("football", "db"));
    const slowS = slow.metrics.find((m) => m.key === "agility")!.score;
    const fastS = fast.metrics.find((m) => m.key === "agility")!.score;
    expect(fastS).toBeGreaterThan(slowS);
  });
});

describe("rateBuild — sex & age scaling", () => {
  it("applies an easier strength bar for female athletes", () => {
    const p = pos("powerlifting", "lifter");
    const male = rateBuild({ sex: "male", heightCm: 175, weightKg: 80, squat: 140 }, p);
    const female = rateBuild({ sex: "female", heightCm: 175, weightKg: 80, squat: 140 }, p);
    const ms = male.metrics.find((m) => m.key === "squat")!.score;
    const fs = female.metrics.find((m) => m.key === "squat")!.score;
    expect(fs).toBeGreaterThan(ms);
  });

  it("gives an older lifter a higher score for the same lift (age-fair bar)", () => {
    const p = pos("general", "athlete");
    const young = rateBuild({ ...baseMale, age: 25, squat: 150 }, p);
    const old = rateBuild({ ...baseMale, age: 55, squat: 150 }, p);
    const ys = young.metrics.find((m) => m.key === "squat")!.score;
    const os = old.metrics.find((m) => m.key === "squat")!.score;
    expect(os).toBeGreaterThan(ys);
  });
});

describe("rateBuild — body composition & confidence", () => {
  it("tells an underweight athlete to gain toward the role's BMI band", () => {
    const r = rateBuild({ ...baseMale, heightCm: 190, weightKg: 70 }, pos("rugby", "prop"));
    expect(r.bodyComp.direction).toBe("gain");
    expect(r.bodyComp.amountLoKg).toBeGreaterThan(0);
  });

  it("climbs in confidence as more performance groups are filled in", () => {
    const p = pos("general", "athlete");
    const physiqueOnly = rateBuild(baseMale, p);
    const full = rateBuild(
      { ...baseMale, squat: 150, sprint100: 12, vo2max: 50 },
      p
    );
    expect(full.confidence.pct).toBeGreaterThan(physiqueOnly.confidence.pct);
    expect(full.confidence.pct).toBeLessThanOrEqual(100);
  });
});

describe("bestFitPositions", () => {
  it("returns the requested number of matches, sorted high to low", () => {
    const fits = bestFitPositions({ ...baseMale, squat: 160, deadlift: 200 }, 5);
    expect(fits).toHaveLength(5);
    for (let i = 1; i < fits.length; i++) {
      expect(fits[i - 1].overall).toBeGreaterThanOrEqual(fits[i].overall);
    }
  });

  it("ranks a very tall, lean athlete toward tall-roster sports", () => {
    const tall = bestFitPositions({ sex: "male", heightCm: 213, weightKg: 110 }, 8);
    // A 213 cm athlete should surface a centre/ruck/middle-blocker type role.
    const tallSports = new Set(["basketball", "volleyball", "afl", "handball"]);
    expect(tall.some((f) => tallSports.has(f.sportKey))).toBe(true);
  });
});
