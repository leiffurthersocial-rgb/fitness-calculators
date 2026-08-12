import { describe, it, expect } from "vitest";
import {
  workoutStimulus,
  weeklyNetStimulus,
  maxUsefulFrequency,
  splitOptions,
  bestSplit,
  wnsCurve,
  wnsLandmarks,
  wnsBand,
  wnsMatrix,
  waysToHit,
  findDataset,
  DATASETS,
  DEFAULT_SETTINGS,
  type WnsInput,
} from "./hypertrophy";

const settings = DEFAULT_SETTINGS; // Schoenfeld curve, 3 maintenance sets, 48 h
const input = (p: Partial<WnsInput> = {}): WnsInput => ({
  ...settings,
  frequency: 3,
  setsPerWorkout: 6,
  ...p,
});

describe("dose–response curve", () => {
  it("agrees across datasets that one set is one stimulus unit", () => {
    for (const d of DATASETS) {
      expect(workoutStimulus(1, d)).toBeCloseTo(1, 6);
    }
  });

  it("rises with sets but with diminishing returns", () => {
    const d = findDataset("schoenfeld");
    expect(workoutStimulus(0, d)).toBe(0);
    expect(workoutStimulus(6, d)).toBeGreaterThan(workoutStimulus(3, d));
    // The second three sets add less than the first three.
    expect(workoutStimulus(6, d) - workoutStimulus(3, d)).toBeLessThan(workoutStimulus(3, d));
  });

  it("holds set value longer on the shallower dataset than the conservative one", () => {
    const shallow = workoutStimulus(10, findDataset("currier"));
    const graded = workoutStimulus(10, findDataset("schoenfeld"));
    const steep = workoutStimulus(10, findDataset("conservative"));
    expect(shallow).toBeGreaterThan(graded);
    expect(graded).toBeGreaterThan(steep);
  });
});

describe("weekly net stimulus", () => {
  it("is frequency × (workout stimulus − maintenance)", () => {
    const r = weeklyNetStimulus(input());
    const d = findDataset("schoenfeld");
    expect(r.gross).toBeCloseTo(workoutStimulus(6, d), 6);
    expect(r.maintenance).toBeCloseTo(workoutStimulus(3, d), 6);
    expect(r.net).toBeCloseTo(r.gross - r.maintenance, 6);
    expect(r.wns).toBeCloseTo(3 * r.net, 6);
    expect(r.weeklySets).toBe(18);
  });

  it("is exactly zero when every workout sits at maintenance volume", () => {
    expect(weeklyNetStimulus(input({ setsPerWorkout: 3 })).wns).toBeCloseTo(0, 9);
    // …however often you train it.
    expect(weeklyNetStimulus(input({ setsPerWorkout: 3, frequency: 6 })).wns).toBeCloseTo(0, 9);
  });

  it("goes negative below maintenance volume", () => {
    const r = weeklyNetStimulus(input({ setsPerWorkout: 1 }));
    expect(r.wns).toBeLessThan(0);
    expect(r.band.key).toBe("losing");
  });

  it("rises with both sets and frequency", () => {
    const base = weeklyNetStimulus(input()).wns;
    expect(weeklyNetStimulus(input({ setsPerWorkout: 8 })).wns).toBeGreaterThan(base);
    expect(weeklyNetStimulus(input({ frequency: 2 })).wns).toBeLessThan(base);
  });
});

describe("stimulus duration", () => {
  it("caps the useful frequency at 168 ÷ duration", () => {
    expect(maxUsefulFrequency(48)).toBeCloseTo(3.5, 6);
    expect(maxUsefulFrequency(24)).toBe(7);
    expect(maxUsefulFrequency(72)).toBeCloseTo(2.333, 3);
  });

  it("stops paying for sessions inside the previous stimulus window", () => {
    const four = weeklyNetStimulus(input({ frequency: 4 }));
    const six = weeklyNetStimulus(input({ frequency: 6 }));
    expect(four.capped).toBe(true);
    expect(four.effectiveFrequency).toBeCloseTo(3.5, 6);
    expect(six.wns).toBeCloseTo(four.wns, 6); // both clipped to 3.5×
    expect(four.notes.some((n) => n.includes("already switched on"))).toBe(true);
  });

  it("lets a shorter stimulus support more frequency", () => {
    const long = weeklyNetStimulus(input({ frequency: 6, stimulusHours: 48 }));
    const short = weeklyNetStimulus(input({ frequency: 6, stimulusHours: 24 }));
    expect(short.wns).toBeGreaterThan(long.wns);
    expect(short.capped).toBe(false);
  });
});

describe("maintenance volume", () => {
  it("costs you stimulus in every workout, not once a week", () => {
    const cheap = weeklyNetStimulus(input({ maintenanceSets: 1 }));
    const dear = weeklyNetStimulus(input({ maintenanceSets: 5 }));
    expect(cheap.wns).toBeGreaterThan(dear.wns);
    // Three workouts pay the difference three times over.
    expect(cheap.wns - dear.wns).toBeCloseTo(3 * (dear.maintenance - cheap.maintenance), 6);
  });

  it("says what share of a workout goes on rent", () => {
    const r = weeklyNetStimulus(input());
    expect(r.notes.some((n) => n.includes("maintenance cost"))).toBe(true);
  });
});

describe("splits", () => {
  it("prices the same weekly volume at every frequency", () => {
    const opts = splitOptions(18, settings, 6);
    expect(opts.map((o) => o.frequency)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const o of opts) expect(o.setsPerWorkout).toBeCloseTo(18 / o.frequency, 6);
  });

  it("stops splitting once a workout would fall under one set", () => {
    expect(splitOptions(3, settings, 6).length).toBe(3);
  });

  it("penalises spreading volume so thin that every workout is mostly rent", () => {
    const best = bestSplit(18, settings)!;
    const thin = splitOptions(18, settings).find((o) => o.frequency === 6)!;
    expect(best.wns).toBeGreaterThan(thin.wns);
    expect(best.frequency).toBeLessThanOrEqual(3);
  });
});

describe("landmarks", () => {
  const l = wnsLandmarks(settings);

  it("comes out ordered and positive", () => {
    expect(l.mv).toBe(0);
    expect(l.mev).toBeGreaterThan(0);
    expect(l.mev).toBeLessThan(l.mavLo);
    expect(l.mavLo).toBeLessThan(l.mavHi);
    expect(l.mavHi).toBeLessThan(l.mrv);
  });

  it("moves with the settings, because the WNS scale does", () => {
    const dearer = wnsLandmarks({ ...settings, maintenanceSets: 5 });
    expect(dearer.mev).toBeLessThan(l.mev);
    const shallower = wnsLandmarks({ ...settings, dataset: "currier" });
    expect(shallower.mrv).toBeGreaterThan(l.mrv);
  });

  it("bands a WNS score against them", () => {
    expect(wnsBand(-1, l).key).toBe("losing");
    expect(wnsBand(0, l).key).toBe("maintenance");
    expect(wnsBand(l.mev * 0.5, l).key).toBe("minimal");
    expect(wnsBand((l.mev + l.mavLo) / 2, l).key).toBe("growing");
    expect(wnsBand((l.mavLo + l.mavHi) / 2, l).key).toBe("productive");
    expect(wnsBand((l.mavHi + l.mrv) / 2, l).key).toBe("peak");
    expect(wnsBand(l.mrv + 1, l).key).toBe("over");
  });

  it("puts a textbook week (3× 6 sets) in the productive range", () => {
    expect(weeklyNetStimulus(input()).band.key).toBe("productive");
  });
});

describe("matrix & targets", () => {
  it("scores every frequency × sets combination", () => {
    const m = wnsMatrix(settings, [1, 2, 3], [3, 6]);
    expect(m.length).toBe(2); // one row per set count
    expect(m[0].length).toBe(3);
    expect(m[0][0].wns).toBeCloseTo(0, 9); // 3 sets = maintenance
    expect(m[1][2].weeklySets).toBe(18);
  });

  it("finds the fewest sets per workout that reach a target", () => {
    const rows = waysToHit(4, settings, [1, 2, 3]);
    for (const row of rows) {
      expect(row.setsPerWorkout).not.toBeNull();
      expect(row.wns).toBeGreaterThanOrEqual(4);
    }
    // Spreading the same target over more sessions costs more weekly sets.
    expect(rows[2].weeklySets!).toBeGreaterThan(rows[0].weeklySets!);
  });

  it("reports a target that cannot be reached at all", () => {
    const rows = waysToHit(500, settings, [1]);
    expect(rows[0].setsPerWorkout).toBeNull();
    expect(rows[0].weeklySets).toBeNull();
  });
});

describe("curve for the chart", () => {
  it("crosses zero at the maintenance volume", () => {
    const c = wnsCurve(settings, 3, 10);
    expect(c.length).toBe(10);
    expect(c.find((p) => p.sets === 3)!.wns).toBeCloseTo(0, 9);
    expect(c.find((p) => p.sets === 2)!.wns).toBeLessThan(0);
    expect(c.find((p) => p.sets === 4)!.wns).toBeGreaterThan(0);
  });

  it("uses the capped frequency, not the raw one", () => {
    const capped = wnsCurve(settings, 6, 8);
    const atCap = wnsCurve(settings, 3.5, 8);
    expect(capped).toEqual(atCap);
  });
});
