import { describe, it, expect } from "vitest";
import {
  buildTable,
  buildSession,
  breathHoldScore,
  breathLevelFor,
  ageBreathFactor,
  weeklyPlan,
  PREPARE_SEC,
  RECOVER_SEC,
} from "./breathwork";

describe("CO₂ tables", () => {
  const rounds = buildTable({ kind: "co2", level: "standard", maxHoldSec: 120 });

  it("holds the same length every round and shrinks the rests", () => {
    expect(new Set(rounds.map((r) => r.holdSec)).size).toBe(1);
    for (let i = 1; i < rounds.length; i++) {
      expect(rounds[i].breatheSec).toBeLessThan(rounds[i - 1].breatheSec);
    }
  });

  it("scales the hold to a share of your max", () => {
    expect(rounds[0].holdSec).toBe(60); // 50% of a 2-minute max
    const bigger = buildTable({ kind: "co2", level: "standard", maxHoldSec: 240 });
    expect(bigger[0].holdSec).toBe(120);
  });

  it("gets harder as the level goes up", () => {
    const gentle = buildTable({ kind: "co2", level: "gentle", maxHoldSec: 120 });
    const hard = buildTable({ kind: "co2", level: "hard", maxHoldSec: 120 });
    expect(hard[0].holdSec).toBeGreaterThan(gentle[0].holdSec);
    expect(hard[hard.length - 1].breatheSec).toBeLessThan(gentle[gentle.length - 1].breatheSec);
  });
});

describe("O₂ tables", () => {
  const rounds = buildTable({ kind: "o2", level: "standard", maxHoldSec: 120 });

  it("keeps the rest constant and grows the holds", () => {
    expect(new Set(rounds.map((r) => r.breatheSec)).size).toBe(1);
    for (let i = 1; i < rounds.length; i++) {
      expect(rounds[i].holdSec).toBeGreaterThan(rounds[i - 1].holdSec);
    }
  });

  it("never prescribes a hold at or beyond your max", () => {
    for (const level of ["gentle", "standard", "hard"] as const) {
      const table = buildTable({ kind: "o2", level, maxHoldSec: 120 });
      expect(Math.max(...table.map((r) => r.holdSec))).toBeLessThan(120);
    }
  });
});

describe("guided session", () => {
  const session = buildSession({ kind: "co2", level: "standard", maxHoldSec: 120 });

  it("alternates breathe and hold phases between a settle and a recovery", () => {
    expect(session.phases[0].kind).toBe("prepare");
    expect(session.phases[0].seconds).toBe(PREPARE_SEC);
    expect(session.phases.at(-1)!.kind).toBe("recover");
    expect(session.phases.at(-1)!.seconds).toBe(RECOVER_SEC);
    const middle = session.phases.slice(1, -1);
    middle.forEach((p, i) => expect(p.kind).toBe(i % 2 === 0 ? "breathe" : "hold"));
  });

  it("totals the phase times and reports the peak hold", () => {
    const summed = session.phases.reduce((s, p) => s + p.seconds, 0);
    expect(session.totalSec).toBe(summed);
    expect(session.peakHoldSec).toBe(Math.max(...session.rounds.map((r) => r.holdSec)));
    expect(session.holdTimeSec).toBe(session.rounds.reduce((s, r) => s + r.holdSec, 0));
  });

  it("can skip the settling phase", () => {
    const quick = buildSession({ kind: "co2", level: "standard", maxHoldSec: 120, skipPrepare: true });
    expect(quick.phases[0].kind).toBe("breathe");
    expect(quick.totalSec).toBe(session.totalSec - PREPARE_SEC);
  });
});

describe("breath-hold percentile", () => {
  it("puts the population median near the 50th percentile", () => {
    const r = breathHoldScore({ seconds: 55, age: 30, sex: "male" });
    expect(r.percentile).toBeGreaterThan(45);
    expect(r.percentile).toBeLessThan(55);
  });

  it("rises monotonically with the hold", () => {
    const times = [20, 45, 60, 90, 150, 240, 360];
    const pcts = times.map((t) => breathHoldScore({ seconds: t, age: 30, sex: "male" }).percentile);
    for (let i = 1; i < pcts.length; i++) expect(pcts[i]).toBeGreaterThan(pcts[i - 1]);
    expect(pcts.at(-1)!).toBeGreaterThan(99);
  });

  it("age-adjusts, so the same time scores better when you're older", () => {
    const young = breathHoldScore({ seconds: 90, age: 25, sex: "male" }).percentile;
    const old = breathHoldScore({ seconds: 90, age: 60, sex: "male" }).percentile;
    expect(old).toBeGreaterThan(young);
    expect(ageBreathFactor(25)).toBe(1);
    expect(ageBreathFactor(60)).toBeLessThan(1);
  });

  it("names a level and the gap to the next one", () => {
    const r = breathHoldScore({ seconds: 100, age: 30, sex: "male" });
    expect(r.level.key).toBe("trained");
    expect(r.nextLevel!.key).toBe("intermediate");
    expect(r.toNextSec).toBe(50);
    expect(breathLevelFor(10).key).toBe("beginner");
    expect(breathLevelFor(600).key).toBe("elite");
  });

  it("projects a bigger jump for a beginner than for a trained apneist", () => {
    const beginner = breathHoldScore({ seconds: 40, age: 30, sex: "male" });
    const trained = breathHoldScore({ seconds: 40, age: 30, sex: "male", trained: true });
    expect(beginner.projectedSec).toBeGreaterThan(trained.projectedSec);
  });
});

describe("weekly plan", () => {
  it("never schedules O₂ tables on back-to-back days", () => {
    for (const days of [2, 3, 4, 5, 6]) {
      const plan = weeklyPlan(days);
      expect(plan).toHaveLength(days);
      const o2 = plan.map((d) => d.work.startsWith("O₂"));
      for (let i = 1; i < o2.length; i++) expect(o2[i] && o2[i - 1]).toBe(false);
      expect(o2.filter(Boolean).length).toBeLessThanOrEqual(2);
    }
  });
});
