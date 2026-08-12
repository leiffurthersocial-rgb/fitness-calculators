/**
 * lib/hypertrophy.ts
 * ------------------
 * Chris Beardsley's **Weekly Net Stimulus** (WNS) model. Pure logic, no React.
 *
 * THE MODEL
 * ---------
 *   WNS = weekly hypertrophy stimulus − weekly atrophy effect
 *       = (stimulus per workout × frequency) − (atrophy days × daily atrophy rate)
 *
 * • **Stimulus per workout** comes from the sets you do for the muscle, with
 *   diminishing returns. How steeply it diminishes is the *dataset* you pick:
 *   Schoenfeld's meta-analysis has 6 sets producing 2× the stimulus of 1 set,
 *   Pelland's has 6 sets producing 4×.
 *
 * • **Atrophy days** are the days of the week not covered by a workout's
 *   stimulus. The growth stimulus lasts about 36–48 hours, so at 48 h each
 *   workout covers 2 days and a week has 7 − 2 × frequency atrophy days (never
 *   fewer than none).
 *
 * • **The daily atrophy rate** falls out of maintenance volume. One workout of
 *   ~3 sets to failure a week is enough to maintain, so over the 5 atrophy days
 *   that week you must lose exactly the stimulus those 3 sets provided:
 *   daily atrophy = S(maintenance) ÷ (7 − stimulus days). That makes the
 *   maintenance program score exactly zero, whatever settings you choose.
 *
 * Because the per-workout curve flattens quickly while atrophy is charged by
 * the day, the model rewards spreading volume over more workouts — that is the
 * point it exists to make.
 *
 * Units are arbitrary: one set to failure = 1 stimulus unit.
 */

const DAYS_PER_WEEK = 7;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* ========================================================================
 * DATASETS — the sets-per-workout dose–response
 * ====================================================================== */

export type DatasetKey = "schoenfeld" | "pelland";

export interface Dataset {
  key: DatasetKey;
  label: string;
  note: string;
  recommended?: boolean;
  /** Stimulus of 6 sets as a multiple of 1 set, as the meta-analysis reports. */
  ratioAtSix: number;
}

/**
 * Stimulus = sets^exponent, the simplest curve that passes through both fixed
 * points every dataset gives us: 1 set = 1 unit, and 6 sets = `ratioAtSix`.
 */
export function datasetExponent(d: Dataset): number {
  return Math.log(d.ratioAtSix) / Math.log(6);
}

export const DATASETS: Dataset[] = [
  {
    key: "schoenfeld",
    label: "Schoenfeld — pronounced diminishing returns",
    note: "6 sets produce about 2× the stimulus of a single set. The more conservative read of the dose–response literature, and the recommended default.",
    recommended: true,
    ratioAtSix: 2,
  },
  {
    key: "pelland",
    label: "Pelland — subtle diminishing returns",
    note: "6 sets produce about 4× the stimulus of a single set. Extra sets in a workout keep more of their value, so higher per-workout volumes score better.",
    ratioAtSix: 4,
  },
];

export function findDataset(key: string): Dataset {
  return DATASETS.find((d) => d.key === key) ?? DATASETS[0];
}

/** Hypertrophy stimulus of one workout containing `sets` sets to failure. */
export function workoutStimulus(sets: number, dataset: Dataset): number {
  const n = Math.max(0, sets);
  if (n === 0) return 0;
  return Math.pow(n, datasetExponent(dataset));
}

/* ========================================================================
 * WEEKLY NET STIMULUS
 * ====================================================================== */

export interface WnsSettings {
  dataset: DatasetKey;
  /** Sets in one weekly workout that maintain the muscle. Default 3. */
  maintenanceSets: number;
  /** How long a workout's growth stimulus lasts, hours. Standard 48. */
  stimulusHours: number;
}

export interface WnsInput extends WnsSettings {
  /** Workouts per week that train the muscle. */
  frequency: number;
  setsPerWorkout: number;
}

export const DEFAULT_SETTINGS: WnsSettings = {
  dataset: "schoenfeld",
  maintenanceSets: 3,
  stimulusHours: 48,
};

/** Days of the week a single workout's stimulus covers. */
export function stimulusDays(stimulusHours: number): number {
  return clamp(stimulusHours, 1, 168) / 24;
}

/** Days of the week left uncovered by any workout's stimulus. */
export function atrophyDays(frequency: number, stimulusHours: number): number {
  return Math.max(0, DAYS_PER_WEEK - Math.max(0, frequency) * stimulusDays(stimulusHours));
}

/**
 * Stimulus lost per atrophy day, derived from maintenance volume: one workout
 * of `maintenanceSets` a week has to come out at exactly zero net stimulus.
 */
export function dailyAtrophyRate(settings: WnsSettings): number {
  const uncovered = DAYS_PER_WEEK - stimulusDays(settings.stimulusHours);
  if (uncovered <= 0) return 0; // a stimulus lasting a week can't be outrun
  return workoutStimulus(settings.maintenanceSets, findDataset(settings.dataset)) / uncovered;
}

export interface WnsResult {
  /** S(sets) — one workout's hypertrophy stimulus. */
  perWorkout: number;
  /** S(sets) × frequency. */
  weeklyStimulus: number;
  atrophyDays: number;
  dailyAtrophy: number;
  /** atrophy days × daily atrophy rate. */
  weeklyAtrophy: number;
  /** The headline. */
  wns: number;
  weeklySets: number;
  /** WNS as a multiple of one maintenance workout's stimulus. */
  maintenanceWorkoutsWorth: number;
  landmarks: WnsLandmarks;
  band: WnsBand;
  notes: string[];
}

export function weeklyNetStimulus(input: WnsInput): WnsResult {
  const dataset = findDataset(input.dataset);
  const frequency = Math.max(0, input.frequency);
  const sets = Math.max(0, input.setsPerWorkout);

  const perWorkout = workoutStimulus(sets, dataset);
  const weeklyStimulus = perWorkout * frequency;
  const days = atrophyDays(frequency, input.stimulusHours);
  const dailyAtrophy = dailyAtrophyRate(input);
  const weeklyAtrophy = days * dailyAtrophy;
  const wns = weeklyStimulus - weeklyAtrophy;

  const maintenanceStimulus = workoutStimulus(input.maintenanceSets, dataset);
  const landmarks = wnsLandmarks(input);

  return {
    perWorkout,
    weeklyStimulus,
    atrophyDays: days,
    dailyAtrophy,
    weeklyAtrophy,
    wns,
    weeklySets: frequency * sets,
    maintenanceWorkoutsWorth: maintenanceStimulus > 0 ? wns / maintenanceStimulus : 0,
    landmarks,
    band: wnsBand(wns, landmarks),
    notes: wnsNotes(input, { wns, days, perWorkout, frequency, sets }),
  };
}

function wnsNotes(
  input: WnsInput,
  r: { wns: number; days: number; perWorkout: number; frequency: number; sets: number }
): string[] {
  const notes: string[] = [];
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const cover = stimulusDays(input.stimulusHours);

  if (r.days > 0) {
    notes.push(
      `Each workout's stimulus covers ${round1(cover)} days, so ${round1(r.frequency)}× a week leaves ${round1(
        r.days
      )} atrophy ${r.days === 1 ? "day" : "days"} — ${round1(r.days * dailyAtrophyRate(input))} units lost from what you built.`
    );
  } else {
    notes.push(
      `${round1(r.frequency)} workouts × ${round1(cover)} stimulus days covers the whole week: no atrophy days at all, so every unit of stimulus counts.`
    );
  }

  // What one more workout a week would be worth, at the same sets per workout.
  if (r.frequency >= 1 && r.frequency < 7 && r.sets > 0) {
    const more = weeklyNetStimulusRaw({ ...input, frequency: r.frequency + 1 });
    notes.push(
      `A ${Math.round(r.frequency) + 1}th workout at the same ${round1(r.sets)} sets would take you to ${round1(
        more
      )} (+${round1(more - r.wns)}) — adding sets to the workouts you already do is worth less, because the per-workout curve flattens while atrophy is charged by the day.`
    );
  }

  // The best way to arrange the weekly volume you already do.
  const weekly = r.frequency * r.sets;
  const best = bestSplit(weekly, input);
  if (best && best.frequency !== Math.round(r.frequency) && best.wns > r.wns + 0.05) {
    notes.push(
      `Those same ${round1(weekly)} weekly sets are worth ${round1(best.wns)} spread over ${
        best.frequency
      } workouts (≈${round1(best.setsPerWorkout)} sets each), against ${round1(r.wns)} the way you do them now.`
    );
  }

  return notes;
}

/** WNS only, without the surrounding analysis (used internally). */
function weeklyNetStimulusRaw(input: WnsInput): number {
  const dataset = findDataset(input.dataset);
  return (
    workoutStimulus(input.setsPerWorkout, dataset) * Math.max(0, input.frequency) -
    atrophyDays(input.frequency, input.stimulusHours) * dailyAtrophyRate(input)
  );
}

/* ========================================================================
 * SPLITS & CURVES
 * ====================================================================== */

export interface Split {
  frequency: number;
  setsPerWorkout: number;
  wns: number;
}

/** The same weekly set count, arranged over 1…7 workouts. */
export function splitOptions(weeklySets: number, settings: WnsSettings, maxFreq = 7): Split[] {
  const out: Split[] = [];
  for (let f = 1; f <= maxFreq; f++) {
    const setsPerWorkout = weeklySets / f;
    if (setsPerWorkout < 1) break;
    out.push({
      frequency: f,
      setsPerWorkout,
      wns: weeklyNetStimulusRaw({ ...settings, frequency: f, setsPerWorkout }),
    });
  }
  return out;
}

export function bestSplit(weeklySets: number, settings: WnsSettings, maxFreq = 7): Split | null {
  const opts = splitOptions(weeklySets, settings, maxFreq);
  if (!opts.length) return null;
  return opts.reduce((a, b) => (b.wns > a.wns + 1e-9 ? b : a));
}

/** WNS across training frequencies at a fixed sets per workout (for charts). */
export function frequencyCurve(
  settings: WnsSettings,
  setsPerWorkout: number,
  maxFreq = 7
): { frequency: number; wns: number }[] {
  const out: { frequency: number; wns: number }[] = [];
  for (let f = 1; f <= maxFreq; f++) {
    out.push({ frequency: f, wns: weeklyNetStimulusRaw({ ...settings, frequency: f, setsPerWorkout }) });
  }
  return out;
}

/** WNS across sets per workout at a fixed frequency (for charts). */
export function setsCurve(
  settings: WnsSettings,
  frequency: number,
  maxSets = 12
): { sets: number; wns: number }[] {
  const out: { sets: number; wns: number }[] = [];
  for (let s = 1; s <= maxSets; s++) {
    out.push({ sets: s, wns: weeklyNetStimulusRaw({ ...settings, frequency, setsPerWorkout: s }) });
  }
  return out;
}

/* ========================================================================
 * LANDMARKS — reading a WNS number
 * ----------------------------------------------------------------------
 * WNS is an arbitrary scale that stretches with the dataset and the
 * maintenance volume, so fixed thresholds would mislead. Everything here is
 * expressed as multiples of one maintenance workout's stimulus, S(maintenance):
 * a week worth one maintenance workout of *net* stimulus is the minimum
 * effective dose, two to four is the productive range, and six is about as
 * much as anyone turns into muscle. Those multiples are this app's
 * interpretation, not part of Beardsley's model — the model itself only fixes
 * the zero point.
 * ====================================================================== */

export const LANDMARK_MULTIPLES = { mev: 1, mavLo: 2, mavHi: 4, mrv: 6 };

export interface WnsLandmarks {
  /** Maintenance: zero net stimulus, by construction. */
  mv: number;
  mev: number;
  mavLo: number;
  mavHi: number;
  mrv: number;
  /** S(maintenance) — the unit the others are multiples of. */
  unit: number;
}

export function wnsLandmarks(settings: WnsSettings): WnsLandmarks {
  const unit = workoutStimulus(settings.maintenanceSets, findDataset(settings.dataset));
  return {
    mv: 0,
    mev: unit * LANDMARK_MULTIPLES.mev,
    mavLo: unit * LANDMARK_MULTIPLES.mavLo,
    mavHi: unit * LANDMARK_MULTIPLES.mavHi,
    mrv: unit * LANDMARK_MULTIPLES.mrv,
    unit,
  };
}

export interface WnsBand {
  key: "losing" | "maintenance" | "minimal" | "growing" | "productive" | "peak" | "over";
  label: string;
  blurb: string;
}

export function wnsBand(wns: number, l: WnsLandmarks): WnsBand {
  if (wns < -0.05)
    return {
      key: "losing",
      label: "Losing muscle",
      blurb: "The atrophy between sessions outweighs what your workouts build. Train the muscle more often, or do more per workout.",
    };
  if (wns <= 0.05)
    return {
      key: "maintenance",
      label: "Maintenance",
      blurb: "Stimulus and atrophy cancel out exactly. You hold what you have and add nothing.",
    };
  if (wns < l.mev)
    return {
      key: "minimal",
      label: "Minimal growth",
      blurb: "Positive, but under the minimum effective dose. Growth will be slow.",
    };
  if (wns < l.mavLo)
    return {
      key: "growing",
      label: "Growing",
      blurb: "Past the minimum effective dose — real growth, with room to add a workout.",
    };
  if (wns <= l.mavHi)
    return {
      key: "productive",
      label: "Productive range",
      blurb: "The range most people can actually turn into muscle week after week.",
    };
  if (wns <= l.mrv)
    return {
      key: "peak",
      label: "Near your ceiling",
      blurb: "A lot of stimulus, and the fatigue that comes with it. Good for the last weeks of a block, not indefinitely.",
    };
  return {
    key: "over",
    label: "Beyond recoverable",
    blurb: "More stimulus than almost anyone recovers from. The model prices stimulus, not fatigue — in practice this is where progress stalls.",
  };
}

/* ========================================================================
 * MATRIX & TARGETS
 * ====================================================================== */

export interface MatrixCell {
  frequency: number;
  setsPerWorkout: number;
  weeklySets: number;
  wns: number;
  band: WnsBand;
}

export function wnsMatrix(
  settings: WnsSettings,
  frequencies: number[],
  setsList: number[]
): MatrixCell[][] {
  const landmarks = wnsLandmarks(settings);
  return setsList.map((sets) =>
    frequencies.map((f) => {
      const wns = weeklyNetStimulusRaw({ ...settings, frequency: f, setsPerWorkout: sets });
      return {
        frequency: f,
        setsPerWorkout: sets,
        weeklySets: f * sets,
        wns,
        band: wnsBand(wns, landmarks),
      };
    })
  );
}

/**
 * The cheapest way to reach a target WNS at each frequency: the fewest whole
 * sets per workout that get there, or null if no sane number of sets does.
 */
export function waysToHit(
  target: number,
  settings: WnsSettings,
  frequencies: number[],
  maxSets = 30
): { frequency: number; setsPerWorkout: number | null; weeklySets: number | null; wns: number }[] {
  return frequencies.map((f) => {
    for (let s = 1; s <= maxSets; s++) {
      const wns = weeklyNetStimulusRaw({ ...settings, frequency: f, setsPerWorkout: s });
      if (wns >= target) return { frequency: f, setsPerWorkout: s, weeklySets: f * s, wns };
    }
    return { frequency: f, setsPerWorkout: null, weeklySets: null, wns: 0 };
  });
}
