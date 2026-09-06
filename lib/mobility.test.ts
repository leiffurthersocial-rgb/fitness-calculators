import { describe, it, expect } from "vitest";
import {
  generateSession,
  sessionSteps,
  MOBILITY_LIBRARY,
  MOBILITY_GOALS,
  type MobilityInput,
} from "./mobility";

const base: MobilityInput = {
  goals: ["frontSplits"],
  minutes: 20,
  level: "intermediate",
  equipment: ["wall", "block", "band", "weight"],
};

describe("session generation", () => {
  it("fits inside the time you have", () => {
    for (const minutes of [5, 10, 20, 30, 45, 60]) {
      const s = generateSession({ ...base, minutes });
      expect(s.totalSec).toBeGreaterThan(0);
      expect(s.totalSec).toBeLessThanOrEqual(minutes * 60 * 1.15);
    }
  });

  it("gives a longer session more work than a short one", () => {
    const short = generateSession({ ...base, minutes: 8 });
    const long = generateSession({ ...base, minutes: 45 });
    expect(long.totalSec).toBeGreaterThan(short.totalSec);
    const count = (s: typeof short) => s.blocks.reduce((n, b) => n + b.items.length, 0);
    expect(count(long)).toBeGreaterThan(count(short));
  });

  it("only picks exercises that serve a chosen goal", () => {
    const s = generateSession({ ...base, goals: ["overhead", "wrists"], minutes: 25 });
    for (const block of s.blocks)
      for (const item of block.items) {
        expect(item.serves.length).toBeGreaterThan(0);
        expect(item.exercise.goals.some((g) => ["overhead", "wrists"].includes(g))).toBe(true);
      }
  });

  it("never repeats an exercise within a session", () => {
    const s = generateSession({ ...base, goals: ["hipFlexors", "hamstrings", "squatDepth"], minutes: 60 });
    const ids = s.blocks.flatMap((b) => b.items.map((i) => i.exercise.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("respects the equipment you actually have", () => {
    const s = generateSession({ ...base, goals: ["hamstrings", "thoracic"], equipment: [], minutes: 30 });
    for (const block of s.blocks)
      for (const item of block.items) expect(item.exercise.equipment).toBe("none");
  });

  it("keeps beginners away from the most demanding positions and holds shorter", () => {
    const beginner = generateSession({ ...base, level: "beginner", minutes: 30 });
    const advanced = generateSession({ ...base, level: "advanced", minutes: 30 });
    for (const block of beginner.blocks)
      for (const item of block.items) expect(item.exercise.demand).toBeLessThanOrEqual(2);
    const firstHold = (s: typeof beginner) => s.blocks[0].items[0].seconds;
    expect(firstHold(beginner)).toBeLessThan(firstHold(advanced));
  });

  it("builds a warm-up out of dynamic work and no long passive holds", () => {
    const s = generateSession({ ...base, goals: ["warmup"], minutes: 12 });
    expect(s.blocks.some((b) => b.block === "finish")).toBe(false);
    for (const block of s.blocks)
      for (const item of block.items) expect(item.seconds).toBeLessThanOrEqual(60);
  });

  it("reports which goals it couldn't fit and how often to train each", () => {
    const s = generateSession({
      ...base,
      goals: ["frontSplits", "middleSplits", "overhead", "wrists", "ankles", "backbend"],
      minutes: 6,
    });
    expect(s.unserved.length).toBeGreaterThan(0);
    expect(s.notes.join(" ")).toMatch(/Not enough time/);
    const served = s.weekly.filter((w) => w.secPerSession > 0);
    // ~5 min per week per position is the dose the guidance is built on.
    for (const w of served) expect(w.sessionsForDose).toBe(Math.max(1, Math.ceil(300 / w.secPerSession)));
  });
});

describe("timer steps", () => {
  const session = generateSession({ ...base, minutes: 25 });
  const steps = sessionSteps(session);

  it("splits per-side exercises into a left and a right step", () => {
    const items = session.blocks.flatMap((b) => b.items);
    const perSide = items.filter((i) => i.exercise.perSide);
    // One set-up step per exercise, then one working step per side.
    expect(steps).toHaveLength(items.length * 2 + perSide.length);
    if (perSide.length) {
      expect(steps.some((st) => st.label.endsWith("— Left"))).toBe(true);
      expect(steps.some((st) => st.label.endsWith("— Right"))).toBe(true);
    }
  });

  it("adds up to exactly the session length the card advertises", () => {
    expect(steps.reduce((s, st) => s + st.seconds, 0)).toBe(session.totalSec);
  });
});

describe("library", () => {
  it("has unique ids and covers every goal in both prep and main work", () => {
    const ids = MOBILITY_LIBRARY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const goal of MOBILITY_GOALS) {
      const forGoal = MOBILITY_LIBRARY.filter((e) => e.goals.includes(goal.key));
      expect(forGoal.length).toBeGreaterThanOrEqual(2);
    }
  });
});
