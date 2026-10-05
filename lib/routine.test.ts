import { describe, it, expect } from "vitest";
import {
  rateRoutine,
  weeklyLayout,
  routineFromTemplate,
  gradeFor,
  type Routine,
  type RoutineSession,
} from "./routine";
import { EXERCISES, MUSCLES } from "./exercises";

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
    const once = rateRoutine(routine(sess("A", 1, [["cable-fly", 3]])));
    expect(muscle(once, "chest").status).toBe("maintaining");
    const three = rateRoutine(routine(sess("A", 3, [["cable-fly", 4]])));
    expect(muscle(three, "chest").score).toBe(100);
    expect(muscle(three, "chest").status).toBe("optimal");
  });
  it("same weekly sets spread over more sessions score higher", () => {
    const bro = rateRoutine(routine(sess("Chest", 1, [["cable-fly", 12]])));
    const fb = rateRoutine(routine(sess("A", 3, [["cable-fly", 4]])));
    expect(muscle(fb, "chest").score).toBeGreaterThan(muscle(bro, "chest").score);
  });
  it("flags too many sets for one muscle in one session", () => {
    const r = rateRoutine(routine(sess("Chest day", 1, [["bench-press", 5], ["cable-fly", 5]])));
    expect(r.feedback.some((f) => f.text.includes("In Chest day, chest"))).toBe(true);
  });
  it("sets far from failure count for less", () => {
    const hard = rateRoutine(routine(sess("A", 2, [["cable-fly", 3, 0]])));
    const easy = rateRoutine(routine(sess("A", 2, [["cable-fly", 3, 3]])));
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
    const once = rateRoutine(routine(sess("A", 1, [["cable-fly", 3]])));
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
