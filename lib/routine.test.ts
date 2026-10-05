import { describe, it, expect } from "vitest";
import {
  rateRoutine,
  weeklyLayout,
  routineFromTemplate,
  gradeFor,
  systemicFactor,
  recoveryPenalty,
  analyzeSession,
  setAllSets,
  setAllRir,
  type Routine,
  type RoutineSession,
} from "./routine";
import { EXERCISES, EXERCISE_BY_ID, MUSCLES, bestExercisesFor } from "./exercises";

const sess = (name: string, perWeek: number, ex: [string, number, number?][]): RoutineSession => ({
  id: name,
  name,
  perWeek,
  exercises: ex.map(([exerciseId, sets, rir], i) => ({ id: `${name}${i}`, exerciseId, sets, rir: rir ?? 0 })),
});
const routine = (...sessions: RoutineSession[]): Routine => ({ id: "r", name: "r", sessions, updatedAt: 0 });
const muscle = (r: ReturnType<typeof rateRoutine>, id: string) => r.muscles.find((m) => m.muscle === id)!;

describe("exercise library", () => {
  it("every exercise maps only to known muscles with credit 0.5 or 1", () => {
    const ids = new Set(MUSCLES.map((m) => m.id));
    for (const e of EXERCISES) {
      for (const [m, c] of Object.entries(e.muscles)) {
        expect(ids.has(m as never)).toBe(true);
        expect([0.5, 1]).toContain(c);
      }
    }
  });
});

describe("weeklyLayout", () => {
  it("alternates sessions and spreads them across the week", () => {
    const l = weeklyLayout([sess("A", 2, []), sess("B", 2, [])]);
    expect(l.map((x) => x.session)).toEqual([0, 1, 0, 1]);
    expect(l.map((x) => x.day)).toEqual([0, 1, 3, 5]);
    expect(l.map((x) => x.hour)).toEqual([0, 24, 72, 120]);
  });
  it("one session 3× a week lands Mon / Wed / Fri", () => {
    expect(weeklyLayout([sess("A", 3, [])]).map((x) => x.day)).toEqual([0, 2, 4]);
  });
});

describe("rateRoutine", () => {
  it("one set to failure credits the prime mover 1 and synergists 0.5", () => {
    const r = rateRoutine(routine(sess("A", 1, [["bench-press", 1]])));
    expect(muscle(r, "chest").weeklySets).toBe(1);
    expect(muscle(r, "triceps").weeklySets).toBe(0.5);
    expect(muscle(r, "quads").status).toBe("untrained");
  });
  it("3 sets once a week = maintenance; 4 sets 3× a week = optimal (100)", () => {
    const once = rateRoutine(routine(sess("A", 1, [["pec-deck", 3]])));
    expect(muscle(once, "chest").status).toBe("maintaining");
    const three = rateRoutine(routine(sess("A", 3, [["pec-deck", 4]])));
    expect(muscle(three, "chest").score).toBe(100);
    expect(muscle(three, "chest").status).toBe("optimal");
  });
  it("same weekly sets spread over more sessions score higher", () => {
    const bro = rateRoutine(routine(sess("Chest", 1, [["pec-deck", 12]])));
    const fb = rateRoutine(routine(sess("A", 3, [["pec-deck", 4]])));
    expect(muscle(fb, "chest").score).toBeGreaterThan(muscle(bro, "chest").score);
  });
  it("flags too many sets for one muscle in one session", () => {
    const r = rateRoutine(routine(sess("Chest day", 1, [["bench-press", 5], ["cable-fly", 5]])));
    expect(r.feedback.some((f) => f.text.includes("In Chest day, chest"))).toBe(true);
  });
  it("sets far from failure count for less", () => {
    const hard = rateRoutine(routine(sess("A", 2, [["pec-deck", 3, 0]])));
    const easy = rateRoutine(routine(sess("A", 2, [["pec-deck", 3, 3]])));
    expect(muscle(easy, "chest").wns).toBeLessThan(muscle(hard, "chest").wns);
  });
  it("custom exercises credit their chosen muscle", () => {
    const r = rateRoutine(
      routine({ id: "A", name: "A", perWeek: 2, exercises: [{ id: "x", exerciseId: "custom", name: "Neck curl", muscle: "upper-back", sets: 3, rir: 0 }] })
    );
    expect(muscle(r, "upper-back").weeklySets).toBe(6);
  });
  it("templates: full-body and upper/lower outscore the bro split", () => {
    const s = (id: string) => rateRoutine(routineFromTemplate(id)).score;
    expect(s("full-body")).toBeGreaterThan(s("bro-split"));
    expect(s("upper-lower")).toBeGreaterThan(s("bro-split"));
  });
  it("maintenance scores 30, untrained 0", () => {
    const once = rateRoutine(routine(sess("A", 1, [["pec-deck", 3]])));
    expect(muscle(once, "chest").score).toBe(30);
    expect(muscle(once, "quads").score).toBe(0);
  });
  it("empty routine scores 0 / F", () => {
    const r = rateRoutine(routine(sess("A", 2, [])));
    expect(r.score).toBe(0);
    expect(r.grade).toBe("F");
  });
});

describe("gradeFor", () => {
  it("maps scores to letters", () => {
    expect(gradeFor(95)).toBe("A+");
    expect(gradeFor(72)).toBe("B");
    expect(gradeFor(10)).toBe("F");
  });
});

describe("library", () => {
  it("has the detailed back categories and Kelso shrugs", () => {
    expect(EXERCISE_BY_ID["kelso-shrug"].muscles["upper-back"]).toBe(1);
    expect(EXERCISE_BY_ID["shrug"].muscles.traps).toBe(1);
    expect(EXERCISE_BY_ID["lat-pulldown"].category).toBe("Back — lats (width)");
    expect(EXERCISE_BY_ID["chest-supported-row"].category).toBe("Back — mid back & traps (thickness)");
    expect(EXERCISES.length).toBeGreaterThanOrEqual(90);
  });
  it("efficiencies are between 0.7 and 1 and ids are unique", () => {
    for (const e of EXERCISES) {
      expect(e.efficiency).toBeGreaterThanOrEqual(0.7);
      expect(e.efficiency).toBeLessThanOrEqual(1);
    }
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
  });
  it("suggests the most efficient prime-mover exercise", () => {
    expect(bestExercisesFor("side-delts")[0].efficiency).toBe(1);
  });
});

describe("fatigue", () => {
  it("systemic factor is 1 early in a session, then drops to a floor", () => {
    expect(systemicFactor(0)).toBe(1);
    expect(systemicFactor(12)).toBe(1);
    expect(systemicFactor(22)).toBeCloseTo(0.85);
    expect(systemicFactor(200)).toBe(0.7);
  });
  it("later exercises in a long session lose stimulus", () => {
    const a = analyzeSession(sess("A", 1, [["deadlift", 4], ["squat", 4], ["pec-deck", 3]]));
    expect(a.exerciseFactors[0]).toBe(1);
    expect(a.exerciseFactors[2]).toBeLessThan(1);
  });
  it("recovery penalty grows with prior volume and shrinks with time", () => {
    expect(recoveryPenalty(6, 24)).toBeGreaterThan(recoveryPenalty(3, 24));
    expect(recoveryPenalty(6, 24)).toBeGreaterThan(recoveryPenalty(6, 48));
    expect(recoveryPenalty(6, 72)).toBe(0);
  });
  it("back-to-back days with big volume lose stimulus to recovery", () => {
    const r = rateRoutine(routine(sess("A", 1, [["pec-deck", 6]]), sess("B", 1, [["pec-deck", 6]])));
    const spaced = rateRoutine(routine(sess("A", 2, [["pec-deck", 6]])));
    // A then B lands Mon/Thu (72h) — no loss; force consecutive days with 7 sessions:
    const daily = rateRoutine(routine(sess("A", 3, [["pec-deck", 6]]), sess("B", 3, [["leg-extension", 3]]), sess("C", 1, [["leg-extension", 3]])));
    expect(muscle(r, "chest").recoveryLoss).toBe(0);
    expect(muscle(spaced, "chest").recoveryLoss).toBe(0);
    expect(muscle(daily, "chest").recoveryLoss).toBeGreaterThan(0);
  });
});

describe("direct vs indirect", () => {
  it("frequency counts only sessions with direct work", () => {
    const r = rateRoutine(routine(sess("A", 2, [["bench-press", 3]])));
    expect(muscle(r, "chest").frequency).toBe(2);
    expect(muscle(r, "triceps").frequency).toBe(0);
    expect(muscle(r, "triceps").weeklySets).toBe(3);
  });
  it("machines beat less stable versions of the same movement", () => {
    const m = rateRoutine(routine(sess("A", 2, [["machine-chest", 3]])));
    const p = rateRoutine(routine(sess("A", 2, [["push-up", 3]])));
    expect(muscle(m, "chest").score).toBeGreaterThan(muscle(p, "chest").score);
  });
});

describe("priorities", () => {
  it("skipped muscles don't count, focus muscles count double", () => {
    const base = routine(sess("A", 2, [["pec-deck", 3]]));
    const skipAllButChest = {
      ...base,
      priorities: Object.fromEntries(MUSCLES.filter((m) => m.id !== "chest").map((m) => [m.id, "skip"])),
    } as Routine;
    expect(rateRoutine(skipAllButChest).score).toBe(muscle(rateRoutine(base), "chest").score);
    expect(rateRoutine({ ...base, priorities: { chest: "focus" } }).score).toBeGreaterThan(rateRoutine(base).score);
  });
});

describe("bulk edits", () => {
  it("sets every exercise's sets or RIR", () => {
    const s = [sess("A", 1, [["pec-deck", 3, 2], ["squat", 4, 1]])];
    expect(setAllSets(s, 2)[0].exercises.map((e) => e.sets)).toEqual([2, 2]);
    expect(setAllRir(s, 0)[0].exercises.map((e) => e.rir)).toEqual([0, 0]);
  });
});
