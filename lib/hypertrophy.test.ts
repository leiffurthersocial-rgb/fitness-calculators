import { describe, it, expect } from "vitest";
import {
  stimulatingReps,
  isHeavySet,
  setStimulus,
  setFatigue,
  setDecay,
  sessionStimulus,
  weeklyStimulus,
  recoveryHours,
  readinessAfter,
  frequencyOptions,
  bestFrequency,
  marginalSet,
  personalLandmarks,
  volumeVerdict,
  mesocycle,
  findLandmark,
  exerciseRating,
  scoreScheme,
  stimulusBand,
  MUSCLE_LANDMARKS,
  type SessionSpec,
} from "./hypertrophy";

describe("stimulating reps", () => {
  it("counts the last five reps of a set to failure", () => {
    expect(stimulatingReps(10, 0)).toBe(5);
    expect(stimulatingReps(20, 0)).toBe(5);
  });
  it("loses one stimulating rep for every rep left in the tank", () => {
    expect(stimulatingReps(10, 1)).toBe(4);
    expect(stimulatingReps(10, 3)).toBe(2);
    expect(stimulatingReps(10, 5)).toBe(0);
    expect(stimulatingReps(10, 8)).toBe(0);
  });
  it("counts every rep of a heavy (≤5 rep-max) set", () => {
    // 3 reps with 2 in reserve = a 5RM load: full recruitment from rep one.
    expect(isHeavySet(3, 2)).toBe(true);
    expect(stimulatingReps(3, 2)).toBe(3);
    // A 6RM load is no longer heavy, so the 5 − RIR rule applies again.
    expect(isHeavySet(3, 3)).toBe(false);
    expect(stimulatingReps(3, 3)).toBe(2);
  });
  it("never reports more stimulating reps than reps performed", () => {
    expect(stimulatingReps(2, 0)).toBe(2);
    expect(stimulatingReps(0, 0)).toBe(0);
  });
});

describe("stimulus & fatigue per set", () => {
  it("pays a premium for training at long muscle lengths", () => {
    const long = setStimulus({ reps: 10, rir: 0, lengthBias: "lengthened" });
    const mid = setStimulus({ reps: 10, rir: 0, lengthBias: "mid" });
    const short = setStimulus({ reps: 10, rir: 0, lengthBias: "shortened" });
    expect(long).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(short);
  });
  it("charges free-weight axial compounds far more than supported isolation", () => {
    const squat = setFatigue({ reps: 8, rir: 0, pattern: "compound", stability: "free", axial: true });
    const curl = setFatigue({ reps: 8, rir: 2, pattern: "isolation", stability: "supported" });
    expect(squat).toBeGreaterThan(curl * 2);
  });
  it("clears more fatigue between sets when you rest longer", () => {
    expect(setDecay(60)).toBeLessThan(setDecay(120));
    expect(setDecay(120)).toBeLessThan(setDecay(240));
  });
});

describe("one session", () => {
  const base: SessionSpec = { sets: 5, reps: 10, rir: 1, restSec: 120, day: 0 };

  it("gives each successive set less stimulus than the one before", () => {
    const r = sessionStimulus(base);
    for (let i = 1; i < r.perSet.length; i++) {
      expect(r.perSet[i].stimulus).toBeLessThan(r.perSet[i - 1].stimulus);
    }
    expect(r.perSet[0].pctOfFirst).toBe(100);
  });

  it("saturates: doubling the sets does not double the stimulus", () => {
    const five = sessionStimulus(base).stimulus;
    const ten = sessionStimulus({ ...base, sets: 10 }).stimulus;
    expect(ten).toBeGreaterThan(five);
    expect(ten).toBeLessThan(five * 1.6);
  });

  it("flags the junk-volume tail of a very long session", () => {
    expect(sessionStimulus({ ...base, sets: 4 }).junkSets).toBe(0);
    expect(sessionStimulus({ ...base, sets: 12 }).junkSets).toBeGreaterThan(0);
  });

  it("scales the whole session by how recovered you were", () => {
    const fresh = sessionStimulus(base, 1).stimulus;
    const tired = sessionStimulus(base, 0.7).stimulus;
    expect(tired).toBeCloseTo(fresh * 0.7, 6);
  });
});

describe("recovery", () => {
  it("needs longer after a more fatiguing session, within 1–4 days", () => {
    expect(recoveryHours(2)).toBeLessThan(recoveryHours(10));
    expect(recoveryHours(0)).toBe(24);
    expect(recoveryHours(1000)).toBe(96);
  });
  it("is fully ready once the gap covers the recovery need", () => {
    expect(readinessAfter(72, 48)).toBe(1);
    expect(readinessAfter(24, 48)).toBeCloseTo(0.8, 6);
    expect(readinessAfter(0, 48)).toBe(0.6);
  });
});

describe("the week", () => {
  const spec = (day: number, sets: number): SessionSpec => ({ sets, reps: 10, rir: 1, restSec: 120, day });

  it("beats once-a-week training when the same sets are spread out", () => {
    const once = weeklyStimulus([spec(0, 10)]);
    const twice = weeklyStimulus([spec(0, 5), spec(3, 5)]);
    expect(twice.stimulus).toBeGreaterThan(once.stimulus);
    expect(twice.hardSets).toBe(once.hardSets);
  });

  it("penalises sessions stacked on back-to-back days", () => {
    const spread = weeklyStimulus([spec(0, 5), spec(3, 5)]);
    const stacked = weeklyStimulus([spec(0, 5), spec(1, 5)]);
    expect(stacked.stimulus).toBeLessThan(spread.stimulus);
    expect(stacked.sessions.some((s) => s.readiness < 1)).toBe(true);
  });

  it("measures the first session's gap from the previous week", () => {
    // Mon + Thu: Monday follows Thursday by three days, not seven.
    const w = weeklyStimulus([spec(0, 5), spec(3, 5)]);
    expect(w.sessions[0].gapHours).toBe(4 * 24);
    expect(w.sessions[1].gapHours).toBe(3 * 24);
  });

  it("returns an empty result for an empty week", () => {
    const w = weeklyStimulus([]);
    expect(w.stimulus).toBe(0);
    expect(w.band.key).toBe("detraining");
    expect(w.sessions).toEqual([]);
  });

  it("bands the weekly total", () => {
    expect(stimulusBand(2).key).toBe("detraining");
    expect(stimulusBand(10).key).toBe("maintenance");
    expect(stimulusBand(20).key).toBe("moderate");
    expect(stimulusBand(35).key).toBe("strong");
    expect(stimulusBand(55).key).toBe("maximal");
  });

  it("is calibrated so a good week reads 'strong' and a token week does not", () => {
    // 12 hard sets over two spread sessions — a textbook productive week.
    expect(weeklyStimulus([spec(0, 6), spec(3, 6)]).band.key).toBe("strong");
    // Three sets once a week keeps the muscle, no more.
    expect(weeklyStimulus([spec(0, 3)]).band.key).toBe("maintenance");
  });

  it("writes an insight when sets are left too far from failure", () => {
    const lazy = weeklyStimulus([{ sets: 5, reps: 12, rir: 4, restSec: 120, day: 0 }]);
    expect(lazy.insights.some((n) => n.includes("reps in reserve"))).toBe(true);
  });
});

describe("frequency", () => {
  const base = { reps: 10, rir: 1, restSec: 120 };

  it("ranks more frequent training higher at matched weekly sets", () => {
    const opts = frequencyOptions(12, base, 4);
    expect(opts.map((o) => o.frequency)).toEqual([1, 2, 3, 4]);
    for (let i = 1; i < opts.length; i++) {
      expect(opts[i].stimulus).toBeGreaterThan(opts[i - 1].stimulus);
    }
  });

  it("picks the best split for a fixed weekly set count", () => {
    const best = bestFrequency(12, base, 4)!;
    expect(best.frequency).toBe(4);
    expect(best.setsPerSession).toBe(3);
  });

  it("never suggests more sessions than there are sets", () => {
    const opts = frequencyOptions(2, base, 6);
    expect(opts.length).toBe(2);
  });

  it("shrinks the value of each extra set within a session", () => {
    const first = marginalSet({ ...base }, 0);
    const sixth = marginalSet({ ...base }, 5);
    expect(first.pctOfFirst).toBe(100);
    expect(sixth.stimulus).toBeLessThan(first.stimulus * 0.5);
  });
});

describe("volume landmarks", () => {
  const ctx = { experience: "intermediate" as const, age: 30, energy: "maintenance" as const, recovery: "average" as const };

  it("keeps the published defaults for a neutral profile", () => {
    const chest = personalLandmarks("chest", ctx);
    expect(chest.mev).toBe(findLandmark("chest").mev);
    expect(chest.mrv).toBe(findLandmark("chest").mrv);
    expect(chest.adjustments).toEqual([]);
  });

  it("lowers the ceiling for a dieting, poorly recovered, older lifter", () => {
    const cut = personalLandmarks("chest", { ...ctx, age: 45, energy: "deficit", recovery: "poor" });
    expect(cut.mrv).toBeLessThan(findLandmark("chest").mrv);
    expect(cut.adjustments.length).toBe(3);
  });

  it("keeps the landmarks ordered however they are adjusted", () => {
    for (const m of MUSCLE_LANDMARKS) {
      for (const experience of ["beginner", "intermediate", "advanced"] as const) {
        for (const energy of ["deficit", "maintenance", "surplus"] as const) {
          const l = personalLandmarks(m.key, { ...ctx, experience, energy });
          expect(l.mv).toBeLessThanOrEqual(l.mev);
          expect(l.mev).toBeLessThanOrEqual(l.mavLo);
          expect(l.mavLo).toBeLessThan(l.mavHi);
          expect(l.mavHi).toBeLessThanOrEqual(l.mrv);
        }
      }
    }
  });

  it("reads a weekly set count against the landmarks", () => {
    const l = findLandmark("chest"); // mv 8, mev 10, mav 12–20, mrv 22
    expect(volumeVerdict(4, l).key).toBe("under");
    expect(volumeVerdict(9, l).key).toBe("maintenance");
    expect(volumeVerdict(11, l).key).toBe("growing");
    expect(volumeVerdict(16, l).key).toBe("optimal");
    expect(volumeVerdict(30, l).key).toBe("over");
  });
});

describe("mesocycle", () => {
  it("ramps MEV → MRV and ends on a deload", () => {
    const l = findLandmark("back");
    const plan = mesocycle(l, 5, 2);
    expect(plan.length).toBe(5);
    expect(plan[0].weeklySets).toBe(l.mev);
    expect(plan[3].weeklySets).toBe(l.mrv);
    expect(plan[4].deload).toBe(true);
    expect(plan[4].weeklySets).toBeLessThan(plan[0].weeklySets);
    // Effort climbs toward failure as volume climbs.
    expect(plan[0].rir).toBeGreaterThan(plan[3].rir);
  });
  it("splits the weekly sets over the chosen frequency", () => {
    const plan = mesocycle(findLandmark("quads"), 4, 3);
    expect(plan[0].setsPerSession).toBeCloseTo(plan[0].weeklySets / 3, 1);
  });
});

describe("exercise rating", () => {
  it("rates a supported, lengthened isolation above a heavy axial compound", () => {
    const machine = exerciseRating({ reps: 10, rir: 1, pattern: "isolation", stability: "supported", lengthBias: "lengthened" });
    const squat = exerciseRating({ reps: 5, rir: 0, pattern: "compound", stability: "free", axial: true });
    expect(machine.rating).toBeGreaterThan(squat.rating);
    expect(machine.sfr).toBeGreaterThan(squat.sfr);
  });

  it("credits a compound for the muscles it trains at once", () => {
    const spec = { reps: 8, rir: 1, pattern: "compound" as const, stability: "free" as const, axial: true };
    const one = exerciseRating(spec, 1);
    const three = exerciseRating(spec, 3);
    expect(three.sfrWhole).toBeCloseTo(one.sfrWhole * 3, 6);
    expect(three.sfr).toBe(one.sfr); // per-muscle SFR is unchanged
  });

  it("punishes short partials hardest", () => {
    const full = exerciseRating({ reps: 10, rir: 0, rom: "full" });
    const short = exerciseRating({ reps: 10, rir: 0, rom: "shortPartial" });
    expect(short.rating).toBeLessThan(full.rating * 0.7);
  });

  it("keeps the rating inside 0–100", () => {
    const best = exerciseRating({ reps: 12, rir: 0, pattern: "isolation", stability: "supported", lengthBias: "lengthened", rom: "lengthenedPartial" });
    const worst = exerciseRating({ reps: 3, rir: 0, pattern: "compound", stability: "free", lengthBias: "shortened", rom: "shortPartial", axial: true });
    expect(best.rating).toBeLessThanOrEqual(100);
    expect(worst.rating).toBeGreaterThanOrEqual(0);
  });
});

describe("set schemes", () => {
  it("costs the gym time a scheme actually takes", () => {
    const long = scoreScheme("5×10, 3 min", { sets: 5, reps: 10, rir: 1, restSec: 180, day: 0 });
    const short = scoreScheme("5×10, 1 min", { sets: 5, reps: 10, rir: 1, restSec: 60, day: 0 });
    expect(long.minutes).toBeGreaterThan(short.minutes);
    // Short rest saves time but carries fatigue into every following set.
    expect(long.stimulus).toBeGreaterThan(short.stimulus);
    expect(short.stimulusPerMinute).toBeGreaterThan(long.stimulusPerMinute);
  });

  it("shows heavy low-rep work banking fewer stimulating reps per set than a set to failure", () => {
    const heavy = scoreScheme("5×3 @0", { sets: 5, reps: 3, rir: 0, restSec: 180, day: 0 });
    const moderate = scoreScheme("5×10 @0", { sets: 5, reps: 10, rir: 0, restSec: 180, day: 0 });
    expect(heavy.heavy).toBe(true);
    expect(heavy.stimulatingRepsPerSet).toBe(3);
    expect(moderate.stimulatingRepsPerSet).toBe(5);
    expect(moderate.sfr).toBeGreaterThan(heavy.sfr);
  });
});
