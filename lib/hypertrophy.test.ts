import { describe, it, expect } from "vitest";
import {
  workoutStimulus,
  datasetExponent,
  weeklyNetStimulus,
  atrophyDays,
  dailyAtrophyRate,
  stimulusDays,
  splitOptions,
  bestSplit,
  frequencyCurve,
  setsCurve,
  wnsLandmarks,
  wnsBand,
  wnsMatrix,
  waysToHit,
  findDataset,
  DATASETS,
  DEFAULT_SETTINGS,
  type WnsInput,
} from "./hypertrophy";

const settings = DEFAULT_SETTINGS; // Schoenfeld, 3 maintenance sets, 48 h
const input = (p: Partial<WnsInput> = {}): WnsInput => ({
  ...settings,
  frequency: 3,
  setsPerWorkout: 6,
  ...p,
});

describe("dose–response curve", () => {
  it("is anchored to each meta-analysis: 1 set = 1 unit, 6 sets = the reported multiple", () => {
    for (const d of DATASETS) {
      expect(workoutStimulus(1, d)).toBeCloseTo(1, 9);
      expect(workoutStimulus(6, d)).toBeCloseTo(d.ratioAtSix, 9);
    }
    expect(findDataset("schoenfeld").ratioAtSix).toBe(2);
    expect(findDataset("pelland").ratioAtSix).toBe(4);
  });

  it("diminishes: Schoenfeld more steeply than Pelland", () => {
    const s = findDataset("schoenfeld");
    const p = findDataset("pelland");
    expect(datasetExponent(s)).toBeLessThan(datasetExponent(p));
    expect(workoutStimulus(12, s)).toBeLessThan(workoutStimulus(12, p));
    // Doubling the sets never doubles the stimulus.
    expect(workoutStimulus(12, p)).toBeLessThan(2 * workoutStimulus(6, p));
    expect(workoutStimulus(0, s)).toBe(0);
  });
});

describe("atrophy", () => {
  it("counts the days a workout's stimulus does not cover", () => {
    expect(stimulusDays(48)).toBe(2);
    expect(atrophyDays(1, 48)).toBe(5);
    expect(atrophyDays(3, 48)).toBe(1);
    expect(atrophyDays(4, 48)).toBe(0); // 8 covered days, floored at none
    expect(atrophyDays(3, 36)).toBeCloseTo(2.5, 9);
  });

  it("derives the daily rate from maintenance volume", () => {
    // 3 sets once a week must be lost over the other 5 days.
    expect(dailyAtrophyRate(settings)).toBeCloseTo(
      workoutStimulus(3, findDataset("schoenfeld")) / 5,
      9
    );
  });
});

describe("weekly net stimulus", () => {
  it("is weekly stimulus minus weekly atrophy", () => {
    const r = weeklyNetStimulus(input());
    expect(r.perWorkout).toBeCloseTo(2, 9); // Schoenfeld: 6 sets = 2× one set
    expect(r.weeklyStimulus).toBeCloseTo(6, 9);
    expect(r.atrophyDays).toBe(1);
    expect(r.weeklyAtrophy).toBeCloseTo(r.atrophyDays * r.dailyAtrophy, 9);
    expect(r.wns).toBeCloseTo(r.weeklyStimulus - r.weeklyAtrophy, 9);
    expect(r.weeklySets).toBe(18);
  });

  it("scores the maintenance program at exactly zero, whatever the settings", () => {
    for (const dataset of ["schoenfeld", "pelland"] as const) {
      for (const maintenanceSets of [1, 3, 5]) {
        for (const stimulusHours of [24, 36, 48]) {
          const r = weeklyNetStimulus({
            dataset,
            maintenanceSets,
            stimulusHours,
            frequency: 1,
            setsPerWorkout: maintenanceSets,
          });
          expect(r.wns).toBeCloseTo(0, 9);
          expect(r.band.key).toBe("maintenance");
        }
      }
    }
  });

  it("goes negative when one small workout can't outrun the week's atrophy", () => {
    const r = weeklyNetStimulus(input({ frequency: 1, setsPerWorkout: 2 }));
    expect(r.wns).toBeLessThan(0);
    expect(r.band.key).toBe("losing");
  });

  it("rewards frequency more than extra sets in the same workout", () => {
    const base = weeklyNetStimulus(input({ frequency: 2, setsPerWorkout: 6 })).wns;
    const moreSets = weeklyNetStimulus(input({ frequency: 2, setsPerWorkout: 12 })).wns;
    const moreOften = weeklyNetStimulus(input({ frequency: 4, setsPerWorkout: 6 })).wns;
    expect(moreSets).toBeGreaterThan(base);
    expect(moreOften).toBeGreaterThan(moreSets);
  });

  it("stops charging atrophy once the week is covered", () => {
    const r = weeklyNetStimulus(input({ frequency: 4 }));
    expect(r.atrophyDays).toBe(0);
    expect(r.weeklyAtrophy).toBe(0);
    expect(r.wns).toBeCloseTo(r.weeklyStimulus, 9);
    expect(r.notes.some((n) => n.includes("no atrophy days"))).toBe(true);
  });

  it("loses less to atrophy when the stimulus lasts longer", () => {
    const short = weeklyNetStimulus(input({ stimulusHours: 24 }));
    const long = weeklyNetStimulus(input({ stimulusHours: 48 }));
    expect(short.atrophyDays).toBeGreaterThan(long.atrophyDays);
    expect(short.wns).toBeLessThan(long.wns);
  });

  it("charges more atrophy for a higher maintenance volume", () => {
    const light = weeklyNetStimulus(input({ maintenanceSets: 1 }));
    const heavy = weeklyNetStimulus(input({ maintenanceSets: 5 }));
    expect(heavy.dailyAtrophy).toBeGreaterThan(light.dailyAtrophy);
    expect(heavy.wns).toBeLessThan(light.wns);
  });
});

describe("splits", () => {
  it("prices the same weekly volume at every frequency", () => {
    const opts = splitOptions(18, settings);
    expect(opts.map((o) => o.frequency)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const o of opts) expect(o.setsPerWorkout).toBeCloseTo(18 / o.frequency, 9);
  });

  it("stops splitting once a workout would fall under one set", () => {
    expect(splitOptions(3, settings).length).toBe(3);
  });

  it("picks spreading the volume out, which is the model's whole point", () => {
    const best = bestSplit(18, settings)!;
    const once = splitOptions(18, settings)[0];
    expect(best.frequency).toBeGreaterThan(once.frequency);
    expect(best.wns).toBeGreaterThan(once.wns);
  });
});

describe("curves", () => {
  it("rises with frequency and kinks where atrophy days hit zero", () => {
    const c = frequencyCurve(settings, 6, 7);
    expect(c.length).toBe(7);
    for (let i = 1; i < c.length; i++) expect(c[i].wns).toBeGreaterThan(c[i - 1].wns);
    // Once the week is covered, each workout adds exactly its own stimulus.
    expect(c[5].wns - c[4].wns).toBeCloseTo(c[6].wns - c[5].wns, 9);
  });

  it("crosses zero at maintenance volume for a once-a-week program", () => {
    const c = setsCurve(settings, 1, 8);
    expect(c.find((p) => p.sets === 3)!.wns).toBeCloseTo(0, 9);
    expect(c.find((p) => p.sets === 2)!.wns).toBeLessThan(0);
    expect(c.find((p) => p.sets === 4)!.wns).toBeGreaterThan(0);
  });
});

describe("landmarks", () => {
  const l = wnsLandmarks(settings);

  it("is built from multiples of one maintenance workout", () => {
    expect(l.unit).toBeCloseTo(workoutStimulus(3, findDataset("schoenfeld")), 9);
    expect(l.mv).toBe(0);
    expect(l.mev).toBeCloseTo(l.unit, 9);
    expect(l.mavHi).toBeCloseTo(l.unit * 4, 9);
    expect(l.mrv).toBeCloseTo(l.unit * 6, 9);
  });

  it("stretches with the scale, so the bands stay readable on either dataset", () => {
    const pelland = wnsLandmarks({ ...settings, dataset: "pelland" });
    expect(pelland.mrv).toBeGreaterThan(l.mrv);
    // The same program scores higher on the shallower curve — 6 sets are worth
    // more relative to the 3-set maintenance workout — so it rates higher too.
    const three = weeklyNetStimulus(input()); // 3× 6 sets
    const threePelland = weeklyNetStimulus(input({ dataset: "pelland" }));
    expect(threePelland.wns).toBeGreaterThan(three.wns);
    expect(three.band.key).toBe("productive");
    expect(threePelland.band.key).toBe("peak");
  });

  it("bands a score against them", () => {
    expect(wnsBand(-1, l).key).toBe("losing");
    expect(wnsBand(0, l).key).toBe("maintenance");
    expect(wnsBand(l.mev * 0.5, l).key).toBe("minimal");
    expect(wnsBand(l.mev * 1.5, l).key).toBe("growing");
    expect(wnsBand(l.unit * 3, l).key).toBe("productive");
    expect(wnsBand(l.unit * 5, l).key).toBe("peak");
    expect(wnsBand(l.unit * 7, l).key).toBe("over");
  });

  it("puts a textbook week (3× 6 sets) in the productive range", () => {
    const r = weeklyNetStimulus(input());
    expect(r.band.key).toBe("productive");
    expect(r.maintenanceWorkoutsWorth).toBeCloseTo(r.wns / r.landmarks.unit, 9);
  });
});

describe("matrix & targets", () => {
  it("scores every frequency × sets combination", () => {
    const m = wnsMatrix(settings, [1, 2, 3], [3, 6]);
    expect(m.length).toBe(2);
    expect(m[0].length).toBe(3);
    expect(m[0][0].wns).toBeCloseTo(0, 9); // 1× 3 sets = maintenance
    expect(m[1][2].weeklySets).toBe(18);
  });

  it("finds the fewest sets per workout that reach a target", () => {
    const rows = waysToHit(4, settings, [1, 2, 3, 4]);
    // Once a week cannot reach 4 units at any sane set count: the curve
    // flattens faster than five days of atrophy can be paid off.
    expect(rows[0].setsPerWorkout).toBeNull();
    for (const row of rows.slice(1)) {
      expect(row.setsPerWorkout).not.toBeNull();
      expect(row.wns).toBeGreaterThanOrEqual(4);
    }
    // Training more often gets there on far fewer sets per workout.
    expect(rows[1].setsPerWorkout!).toBe(11);
    expect(rows[2].setsPerWorkout!).toBe(3);
    expect(rows[3].setsPerWorkout!).toBe(1);
  });

  it("reports a target no sane number of sets reaches", () => {
    const rows = waysToHit(500, settings, [1]);
    expect(rows[0].setsPerWorkout).toBeNull();
    expect(rows[0].weeklySets).toBeNull();
  });
});
