/**
 * lib/hypertrophy.ts
 * ------------------
 * Weekly net stimulus (WNS) — Chris Beardsley's model of how much growth
 * stimulus a week of training actually delivers, kept deliberately small.
 * Pure logic, no React.
 *
 * THE MODEL
 * ---------
 * 1. A workout's stimulus comes from the sets in it, with diminishing returns:
 *    the second set adds less than the first, the fifth less again. The shape
 *    of that curve is the *dataset* you pick.
 * 2. Some of every workout is spent just holding onto the muscle you have —
 *    the *maintenance volume*. Only the stimulus above it grows anything, so
 *    net stimulus per workout = S(sets) − S(maintenance).
 * 3. A workout's stimulus lasts a limited time — the *stimulus duration*,
 *    about 48 hours. Training the same muscle again inside that window
 *    overlaps with a signal that is already switched on, so the useful
 *    frequency is capped at 168 ÷ duration (3.5× a week at 48 h).
 * 4. Weekly net stimulus = effective frequency × net stimulus per workout.
 *
 * The dose–response curves are logarithmic fits anchored to the published
 * findings named on each dataset, applied per workout because that is the unit
 * this model works in. WNS is a relative score for comparing plans, not a
 * biological measurement.
 */

const HOURS_PER_WEEK = 168;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* ========================================================================
 * DATASETS — the sets-per-workout dose–response
 * ====================================================================== */

export type DatasetKey = "schoenfeld" | "currier" | "conservative";

export interface Dataset {
  key: DatasetKey;
  label: string;
  /** What the curve says, and where its shape comes from. */
  note: string;
  recommended?: boolean;
  /**
   * Curvature of S(n) = a · ln(1 + n/b). Larger b = shallower diminishing
   * returns, so extra sets in a workout hold their value longer. `a` is
   * derived so every dataset agrees that one set = 1 stimulus unit — switching
   * dataset changes the shape of the curve, never the scale.
   */
  b: number;
}

export const DATASETS: Dataset[] = [
  {
    key: "schoenfeld",
    label: "Schoenfeld et al. — graded dose–response",
    note: "Sets keep adding growth with clear diminishing returns. Anchored to the graded volume dose–response of Schoenfeld, Ogborn & Krieger's meta-analysis (roughly 5.4%, 6.6% and 9.8% growth for under 5, 5–9 and 10+ sets).",
    recommended: true,
    b: 3,
  },
  {
    key: "currier",
    label: "Currier et al. — volume keeps paying",
    note: "A Bayesian meta-analysis whose dose–response is still climbing past 30 sets a week. A shallower curve, so extra sets in a workout stay worth doing for longer.",
    b: 6,
  },
  {
    key: "conservative",
    label: "Conservative — early plateau",
    note: "The trials where extra sets stopped adding much (Ostrowski 1997, Baz-Valle 2022). A steep curve that is nearly flat by about four sets in a workout.",
    b: 1.5,
  },
];

export function findDataset(key: string): Dataset {
  return DATASETS.find((d) => d.key === key) ?? DATASETS[0];
}

/** Stimulus of a workout containing `sets` sets, in stimulus units. */
export function workoutStimulus(sets: number, dataset: Dataset): number {
  const n = Math.max(0, sets);
  if (n === 0) return 0;
  const a = 1 / Math.log(1 + 1 / dataset.b); // normalise so S(1) = 1
  return a * Math.log(1 + n / dataset.b);
}

/* ========================================================================
 * WEEKLY NET STIMULUS
 * ====================================================================== */

export interface WnsSettings {
  dataset: DatasetKey;
  /** Sets in a workout that only maintain the muscle. Beardsley's default: 3. */
  maintenanceSets: number;
  /** How long a workout's stimulus lasts, hours. Standard: 48. */
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

/** Most workouts a week whose stimulus does not overlap the previous one. */
export function maxUsefulFrequency(stimulusHours: number): number {
  const h = clamp(stimulusHours, 6, HOURS_PER_WEEK);
  return HOURS_PER_WEEK / h;
}

export interface WnsResult {
  /** S(sets) — the workout's gross stimulus. */
  gross: number;
  /** S(maintenance) — the part of it spent holding what you have. */
  maintenance: number;
  net: number;
  frequency: number;
  effectiveFrequency: number;
  maxFrequency: number;
  /** True when frequency is wasted on an overlapping stimulus. */
  capped: boolean;
  /** The headline: weekly net stimulus. */
  wns: number;
  weeklySets: number;
  landmarks: WnsLandmarks;
  band: WnsBand;
  notes: string[];
}

export function weeklyNetStimulus(input: WnsInput): WnsResult {
  const dataset = findDataset(input.dataset);
  const sets = Math.max(0, input.setsPerWorkout);
  const maintenanceSets = Math.max(0, input.maintenanceSets);
  const frequency = Math.max(0, input.frequency);

  const gross = workoutStimulus(sets, dataset);
  const maintenance = workoutStimulus(maintenanceSets, dataset);
  const net = gross - maintenance;

  const maxFrequency = maxUsefulFrequency(input.stimulusHours);
  const effectiveFrequency = Math.min(frequency, maxFrequency);
  const wns = effectiveFrequency * net;

  const landmarks = wnsLandmarks(input);
  return {
    gross,
    maintenance,
    net,
    frequency,
    effectiveFrequency,
    maxFrequency,
    capped: frequency > maxFrequency + 1e-9,
    wns,
    weeklySets: frequency * sets,
    landmarks,
    band: wnsBand(wns, landmarks),
    notes: wnsNotes(input, { gross, maintenance, net, effectiveFrequency, maxFrequency, wns }),
  };
}

function wnsNotes(
  input: WnsInput,
  r: { gross: number; maintenance: number; net: number; effectiveFrequency: number; maxFrequency: number; wns: number }
): string[] {
  const notes: string[] = [];
  const round1 = (v: number) => Math.round(v * 10) / 10;

  if (input.setsPerWorkout <= input.maintenanceSets) {
    notes.push(
      `At ${input.setsPerWorkout} sets a workout you are at or below the maintenance volume of ${input.maintenanceSets}, so the whole workout goes on holding what you have. Growth starts with the set after that.`
    );
  } else if (r.gross > 0) {
    notes.push(
      `${Math.round((r.maintenance / r.gross) * 100)}% of each workout's stimulus pays the maintenance cost — only the remaining ${round1(
        r.net
      )} units grow anything.`
    );
  }

  if (input.frequency > r.maxFrequency + 1e-9) {
    notes.push(
      `A workout's stimulus lasts ~${Math.round(input.stimulusHours)} h, so anything past ${round1(
        r.maxFrequency
      )} sessions a week lands on a signal that is already switched on. Your ${input.frequency}× counts as ${round1(
        r.maxFrequency
      )}×.`
    );
  }

  // The best way to split the weekly volume you are already doing.
  const best = bestSplit(input.frequency * input.setsPerWorkout, input);
  if (best && Math.abs(best.frequency - Math.min(input.frequency, r.maxFrequency)) > 0.01 && best.wns > r.wns * 1.05) {
    notes.push(
      `The same ${round1(input.frequency * input.setsPerWorkout)} weekly sets score ${round1(
        best.wns
      )} as ${best.frequency}× ${round1(best.setsPerWorkout)} sets — spreading volume thinner costs you a maintenance charge in every extra workout, and stacking it too deep runs into diminishing returns.`
    );
  }

  return notes;
}

/* ========================================================================
 * SPLITS — the same weekly volume, arranged differently
 * ====================================================================== */

export interface Split {
  frequency: number;
  setsPerWorkout: number;
  wns: number;
}

/** WNS for a fixed weekly set count at each whole frequency worth trying. */
export function splitOptions(weeklySets: number, settings: WnsSettings, maxFreq = 6): Split[] {
  const dataset = findDataset(settings.dataset);
  const maintenance = workoutStimulus(settings.maintenanceSets, dataset);
  const cap = maxUsefulFrequency(settings.stimulusHours);
  const out: Split[] = [];
  for (let f = 1; f <= maxFreq; f++) {
    const setsPerWorkout = weeklySets / f;
    if (setsPerWorkout < 1) break;
    const net = workoutStimulus(setsPerWorkout, dataset) - maintenance;
    out.push({ frequency: f, setsPerWorkout, wns: Math.min(f, cap) * net });
  }
  return out;
}

export function bestSplit(weeklySets: number, settings: WnsSettings, maxFreq = 6): Split | null {
  const opts = splitOptions(weeklySets, settings, maxFreq);
  if (!opts.length) return null;
  return opts.reduce((a, b) => (b.wns > a.wns + 1e-9 ? b : a));
}

/** WNS across a range of sets per workout, at a fixed frequency (for charts). */
export function wnsCurve(
  settings: WnsSettings,
  frequency: number,
  maxSets = 15
): { sets: number; wns: number }[] {
  const dataset = findDataset(settings.dataset);
  const maintenance = workoutStimulus(settings.maintenanceSets, dataset);
  const f = Math.min(Math.max(0, frequency), maxUsefulFrequency(settings.stimulusHours));
  const out: { sets: number; wns: number }[] = [];
  for (let s = 1; s <= maxSets; s++) {
    out.push({ sets: s, wns: f * (workoutStimulus(s, dataset) - maintenance) });
  }
  return out;
}

/* ========================================================================
 * LANDMARKS — what a WNS number means
 * ----------------------------------------------------------------------
 * WNS is an arbitrary scale, and it moves with the dataset and the
 * maintenance volume you choose, so fixed thresholds would lie. Instead the
 * landmarks are computed under your own settings from reference weekly set
 * counts drawn from the volume literature — ~10 sets a week to start growing,
 * ~16–26 for the productive range, ~34 as the point where most people stop
 * recovering — each split over a reference frequency of 2.
 * ====================================================================== */

/** Weekly sets each landmark is anchored to, at REFERENCE_FREQUENCY. */
export const LANDMARK_REFERENCE = { mev: 10, mavLo: 16, mavHi: 26, mrv: 34 };
export const REFERENCE_FREQUENCY = 2;

export interface WnsLandmarks {
  /** Anything at or below this is maintenance, not growth. */
  mv: number;
  mev: number;
  mavLo: number;
  mavHi: number;
  mrv: number;
}

export function wnsLandmarks(settings: WnsSettings): WnsLandmarks {
  const dataset = findDataset(settings.dataset);
  const maintenance = workoutStimulus(settings.maintenanceSets, dataset);
  const f = Math.min(REFERENCE_FREQUENCY, maxUsefulFrequency(settings.stimulusHours));
  const at = (weeklySets: number) =>
    Math.max(0, f * (workoutStimulus(weeklySets / f, dataset) - maintenance));
  return {
    mv: 0,
    mev: at(LANDMARK_REFERENCE.mev),
    mavLo: at(LANDMARK_REFERENCE.mavLo),
    mavHi: at(LANDMARK_REFERENCE.mavHi),
    mrv: at(LANDMARK_REFERENCE.mrv),
  };
}

export interface WnsBand {
  key: "losing" | "maintenance" | "minimal" | "growing" | "productive" | "peak" | "over";
  label: string;
  blurb: string;
}

export function wnsBand(wns: number, l: WnsLandmarks): WnsBand {
  if (wns < 0)
    return {
      key: "losing",
      label: "Below maintenance",
      blurb: "Less stimulus than it takes to hold the muscle you have — over time you will lose some.",
    };
  if (wns < l.mev * 0.25)
    return {
      key: "maintenance",
      label: "Maintenance",
      blurb: "Enough to keep what you have and nothing more. Fine on a break, not a training plan.",
    };
  if (wns < l.mev)
    return {
      key: "minimal",
      label: "Minimal growth",
      blurb: "Above maintenance but under the minimum effective dose. You will grow slowly, if at all.",
    };
  if (wns < l.mavLo)
    return {
      key: "growing",
      label: "Growing",
      blurb: "Past the minimum effective dose. Add a set per workout and you move into the productive range.",
    };
  if (wns <= l.mavHi)
    return {
      key: "productive",
      label: "Productive range",
      blurb: "The adaptive range — as much stimulus as most people can turn into muscle week after week.",
    };
  if (wns <= l.mrv)
    return {
      key: "peak",
      label: "Near your ceiling",
      blurb: "More stimulus than the productive range, and more fatigue with it. Sustainable for the last weeks of a block, not indefinitely.",
    };
  return {
    key: "over",
    label: "Beyond recoverable",
    blurb: "More stimulus than almost anyone recovers from. On paper it scores well; in practice fatigue eats it. Deload and rebuild.",
  };
}

/* ========================================================================
 * MATRIX — every frequency × sets combination at a glance
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
  const dataset = findDataset(settings.dataset);
  const maintenance = workoutStimulus(settings.maintenanceSets, dataset);
  const cap = maxUsefulFrequency(settings.stimulusHours);
  return setsList.map((sets) =>
    frequencies.map((f) => {
      const wns = Math.min(f, cap) * (workoutStimulus(sets, dataset) - maintenance);
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
 * The cheapest ways to reach a target WNS: for each frequency, the smallest
 * whole number of sets per workout that gets there (null if it cannot).
 */
export function waysToHit(
  target: number,
  settings: WnsSettings,
  frequencies: number[],
  maxSets = 30
): { frequency: number; setsPerWorkout: number | null; weeklySets: number | null; wns: number }[] {
  const dataset = findDataset(settings.dataset);
  const maintenance = workoutStimulus(settings.maintenanceSets, dataset);
  const cap = maxUsefulFrequency(settings.stimulusHours);
  return frequencies.map((f) => {
    const effective = Math.min(f, cap);
    for (let s = 1; s <= maxSets; s++) {
      const wns = effective * (workoutStimulus(s, dataset) - maintenance);
      if (wns >= target) {
        return { frequency: f, setsPerWorkout: s, weeklySets: f * s, wns };
      }
    }
    return { frequency: f, setsPerWorkout: null, weeklySets: null, wns: 0 };
  });
}
