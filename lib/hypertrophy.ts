/**
 * lib/hypertrophy.ts
 * ------------------
 * The hypertrophy engine: a *stimulus-and-fatigue* model of muscle growth,
 * plus the volume landmarks, recovery timing and exercise-selection scoring
 * built on top of it. Pure logic only (no React), so it can be unit-tested.
 *
 * THE MODEL (after Chris Beardsley's stimulating-reps / SFR framework)
 * -------------------------------------------------------------------
 * Beardsley's argument, in four steps:
 *
 *  1. Growth needs *mechanical tension on individual fibers*. A fiber only
 *     experiences high tension when its motor unit is recruited AND it is
 *     shortening slowly (force–velocity relationship).
 *  2. In a set with a moderate load you start with submaximal recruitment and
 *     fast reps; only as fatigue accumulates do the high-threshold motor units
 *     switch on and the bar slows. That happens in roughly the **final five
 *     reps before failure** — the *stimulating reps*. With heavy loads
 *     (≈85%+ 1RM, i.e. a rep-max of 5 or fewer) recruitment is maximal and the
 *     bar is slow from the first rep, so every rep of the set is stimulating.
 *  3. Each set also produces **fatigue** — peripheral (muscle damage, mostly
 *     from long muscle lengths and hard eccentrics) and central (from effort,
 *     large muscle mass, axial loading, very long sets). Fatigue is the cost;
 *     the *stimulus-to-fatigue ratio* (SFR) is what you want to maximise.
 *  4. Fatigue is why volume has diminishing returns **inside a session**: each
 *     successive set for the same muscle is performed in a more fatigued state
 *     and delivers less stimulus than the one before. So the same weekly sets
 *     spread over more sessions produce a larger *weekly net stimulus* — the
 *     single number this file exists to compute.
 *
 * The coefficients below are a defensible quantification of that qualitative
 * framework, not numbers Beardsley published. They are tuned so that the
 * model reproduces the consensus findings it is meant to explain: ~4–6 hard
 * sets per muscle per session before returns collapse, 2–3× weekly frequency
 * beating 1×, sets closer to failure being worth more, and long-muscle-length
 * work carrying a stimulus premium. Treat the output as a *relative* score for
 * comparing plans, not an absolute biological quantity.
 *
 * Units: "stimulus units" — one stimulating rep at neutral modifiers = 1.
 */

/* ========================================================================
 * SET DESCRIPTION
 * ====================================================================== */

/** Where in the range of motion the exercise loads the muscle hardest. */
export type LengthBias = "lengthened" | "mid" | "shortened";
/** Compounds spread tension over several muscles and cost far more fatigue. */
export type Pattern = "compound" | "isolation";
/** Machines / supported positions remove the stability & balance tax. */
export type Stability = "free" | "supported";
/** Range of motion actually trained. */
export type Rom = "full" | "lengthenedPartial" | "shortPartial";

export interface SetSpec {
  /** Reps actually performed in the set. */
  reps: number;
  /** Reps left in the tank at the end of the set (0 = failure). */
  rir: number;
  lengthBias?: LengthBias; // default "mid"
  pattern?: Pattern; // default "compound"
  stability?: Stability; // default "free"
  rom?: Rom; // default "full"
  /** Spinal / systemic loading (squats, deadlifts, standing presses). */
  axial?: boolean;
}

/** A muscle's share of one training session. */
export interface SessionSpec extends SetSpec {
  sets: number;
  /** Rest between sets, seconds — short rest carries fatigue into the next set. */
  restSec: number;
  /** Day of the week, 0 = Monday … 6 = Sunday. Used for recovery spacing. */
  day: number;
}

/* -------- stimulus coefficients -------- */

/** Reps before failure that are actually stimulating with a moderate load. */
export const STIMULATING_REP_WINDOW = 5;
/** A set whose rep-max is at or below this counts as "heavy" (≈85%+ 1RM). */
export const HEAVY_REP_MAX = 5;

const LENGTH_STIMULUS: Record<LengthBias, number> = {
  lengthened: 1.15, // stretch-mediated hypertrophy premium
  mid: 1.0,
  shortened: 0.85, // peak tension where the muscle is already short
};

const ROM_STIMULUS: Record<Rom, number> = {
  full: 1.0,
  lengthenedPartial: 1.05, // all the reps happen in the productive half
  shortPartial: 0.6, // half-reps away from the stretch
};

/* -------- fatigue coefficients -------- */

const LENGTH_FATIGUE: Record<LengthBias, number> = {
  lengthened: 1.1, // more muscle damage, longer to recover
  mid: 1.0,
  shortened: 0.95,
};

const ROM_FATIGUE: Record<Rom, number> = {
  full: 1.0,
  lengthenedPartial: 1.0,
  shortPartial: 0.85,
};

const PATTERN_FATIGUE: Record<Pattern, number> = { compound: 1.35, isolation: 1.0 };
const STABILITY_FATIGUE: Record<Stability, number> = { free: 1.1, supported: 0.9 };
const AXIAL_FATIGUE = 1.15;

/**
 * Weekly stimulus that saturates the useful range — the 100% mark on gauges.
 * Calibrated so a hard, well-spread week (≈20 sets close to failure, split
 * over 3–4 sessions) lands at the top of the scale.
 */
export const MAX_USEFUL_WEEKLY_STIMULUS = 48;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function defaults(s: SetSpec) {
  return {
    reps: Math.max(0, s.reps),
    rir: Math.max(0, s.rir),
    lengthBias: s.lengthBias ?? "mid",
    pattern: s.pattern ?? "compound",
    stability: s.stability ?? "free",
    rom: s.rom ?? "full",
    axial: s.axial ?? false,
  };
}

/* ========================================================================
 * 1. STIMULATING REPS
 * ====================================================================== */

/**
 * Stimulating reps in a single set.
 *
 * Moderate loads: the last `5 − RIR` reps qualify, so a set left 3 reps shy of
 * failure contributes only 2. Heavy loads (rep-max ≤ 5) recruit everything from
 * rep one, so the whole set counts — still capped at the 5-rep window.
 */
export function stimulatingReps(reps: number, rir: number): number {
  const r = Math.max(0, Math.floor(reps));
  const inReserve = Math.max(0, rir);
  if (r === 0) return 0;
  const repMax = r + inReserve; // reps this load would allow to failure
  if (repMax <= HEAVY_REP_MAX) return Math.min(r, STIMULATING_REP_WINDOW);
  return clamp(STIMULATING_REP_WINDOW - inReserve, 0, Math.min(r, STIMULATING_REP_WINDOW));
}

/** Is this a heavy (≈85%+ 1RM) set, where every rep is stimulating? */
export function isHeavySet(reps: number, rir: number): boolean {
  return reps > 0 && reps + Math.max(0, rir) <= HEAVY_REP_MAX;
}

/* ========================================================================
 * 2. STIMULUS & FATIGUE PER SET
 * ====================================================================== */

/** Stimulus of one fresh set, in stimulus units. */
export function setStimulus(spec: SetSpec): number {
  const s = defaults(spec);
  return (
    stimulatingReps(s.reps, s.rir) *
    LENGTH_STIMULUS[s.lengthBias] *
    ROM_STIMULUS[s.rom]
  );
}

/**
 * Fatigue cost of one set, in fatigue units (a moderate-rep isolation set at
 * 2 RIR on a machine ≈ 0.9; a heavy free-weight axial compound to failure ≈ 2.6).
 */
export function setFatigue(spec: SetSpec): number {
  const s = defaults(spec);
  if (s.reps === 0) return 0;
  // Effort: grinding to failure costs disproportionately more than stopping short.
  const effort = clamp(1.3 - 0.15 * s.rir, 0.8, 1.3);
  // Rep range: heavy sets tax joints and the nervous system; very long sets
  // are metabolically and psychologically expensive.
  const repMax = s.reps + s.rir;
  const range = repMax <= HEAVY_REP_MAX ? 1.15 : repMax > 20 ? 1.2 : 1.0;
  return (
    effort *
    range *
    PATTERN_FATIGUE[s.pattern] *
    STABILITY_FATIGUE[s.stability] *
    LENGTH_FATIGUE[s.lengthBias] *
    ROM_FATIGUE[s.rom] *
    (s.axial ? AXIAL_FATIGUE : 1)
  );
}

/**
 * How much of the previous set's stimulus survives into the next set for the
 * same muscle. Longer rest clears more fatigue, so more of it survives.
 */
export function setDecay(restSec: number): number {
  if (restSec < 90) return 0.78;
  if (restSec < 180) return 0.85;
  return 0.9;
}

/* ========================================================================
 * 3. ONE SESSION
 * ====================================================================== */

export interface SetContribution {
  /** 1-based set number within the session. */
  index: number;
  stimulus: number;
  fatigue: number;
  /** This set's stimulus as a % of the first set's. */
  pctOfFirst: number;
}

export interface SessionResult {
  /** Stimulating reps in each set, before within-session decay. */
  stimulatingReps: number;
  perSet: SetContribution[];
  /** Session stimulus before the between-session readiness penalty. */
  rawStimulus: number;
  stimulus: number;
  fatigue: number;
  sfr: number;
  /** 0.6–1: how recovered the muscle was when the session started. */
  readiness: number;
  /** Hours this session needs before the muscle is fresh again. */
  recoveryHours: number;
  /** Sets contributing under 40% of the first set — the junk-volume tail. */
  junkSets: number;
}

/** Sets below this share of the first set's stimulus are barely worth doing. */
const JUNK_SET_THRESHOLD = 0.4;

/**
 * Score one session for one muscle. `readiness` (0.6–1) scales the whole
 * session down when the muscle has not recovered from the previous one.
 */
export function sessionStimulus(spec: SessionSpec, readiness = 1): SessionResult {
  const sets = Math.max(0, Math.floor(spec.sets));
  const sr = stimulatingReps(spec.reps, spec.rir);
  const base = setStimulus(spec);
  const baseFatigue = setFatigue(spec);
  const decay = setDecay(spec.restSec);

  const perSet: SetContribution[] = [];
  for (let i = 0; i < sets; i++) {
    const stimulus = base * Math.pow(decay, i);
    // Fatigue creeps up across the session even as stimulus falls — which is
    // exactly why the last sets of a long session are a bad trade.
    const fatigue = baseFatigue * (1 + 0.05 * i);
    perSet.push({
      index: i + 1,
      stimulus,
      fatigue,
      pctOfFirst: base > 0 ? (stimulus / base) * 100 : 0,
    });
  }

  const rawStimulus = perSet.reduce((a, b) => a + b.stimulus, 0);
  const fatigue = perSet.reduce((a, b) => a + b.fatigue, 0);
  const ready = clamp(readiness, 0.6, 1);
  const stimulus = rawStimulus * ready;

  return {
    stimulatingReps: sr,
    perSet,
    rawStimulus,
    stimulus,
    fatigue,
    sfr: fatigue > 0 ? stimulus / fatigue : 0,
    readiness: ready,
    recoveryHours: recoveryHours(fatigue),
    junkSets: perSet.filter((p) => p.pctOfFirst < JUNK_SET_THRESHOLD * 100).length,
  };
}

/**
 * Hours until a muscle is fresh again after a session of the given fatigue.
 * Floors at a day (some fatigue always lingers) and caps at four — even a
 * brutal session is mostly resolved by then.
 */
export function recoveryHours(sessionFatigue: number): number {
  return clamp(24 + 5 * sessionFatigue, 24, 96);
}

/** Readiness multiplier for training again `gapHours` after a session. */
export function readinessAfter(gapHours: number, needHours: number): number {
  if (needHours <= 0) return 1;
  return clamp(0.6 + 0.4 * (gapHours / needHours), 0.6, 1);
}

/* ========================================================================
 * 4. THE WEEK
 * ====================================================================== */

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface WeekSession extends SessionResult {
  day: number;
  dayLabel: string;
  sets: number;
  /** Hours since the previous session for this muscle (wrapping the week). */
  gapHours: number;
}

export interface StimulusBand {
  key: "detraining" | "maintenance" | "moderate" | "strong" | "maximal";
  label: string;
  blurb: string;
}

export interface WeekResult {
  sessions: WeekSession[];
  /** Weekly net stimulus — the headline number. */
  stimulus: number;
  fatigue: number;
  sfr: number;
  hardSets: number;
  stimulatingReps: number;
  frequency: number;
  band: StimulusBand;
  /** Weekly stimulus as a % of the practical ceiling. */
  pctOfCeiling: number;
  insights: string[];
}

const BANDS: { min: number; band: StimulusBand }[] = [
  { min: 48, band: { key: "maximal", label: "Maximal stimulus", blurb: "About as much as a muscle can use in a week — only sustainable if recovery, sleep and calories are all in place, and not for many weeks in a row." } },
  { min: 30, band: { key: "strong", label: "Strong growth", blurb: "The productive zone for a trainee chasing size — high stimulus at a fatigue cost you can repeat weekly." } },
  { min: 16, band: { key: "moderate", label: "Moderate growth", blurb: "Enough to grow, with room to add a session or push closer to failure." } },
  { min: 7, band: { key: "maintenance", label: "Maintenance", blurb: "Holds the muscle you have; not enough to add much." } },
  { min: 0, band: { key: "detraining", label: "Below maintenance", blurb: "Too little stimulus to hold onto muscle over time." } },
];

export function stimulusBand(weekly: number): StimulusBand {
  return (BANDS.find((b) => weekly >= b.min) ?? BANDS[BANDS.length - 1]).band;
}

/**
 * Score a week of training for ONE muscle. Sessions are placed on days, so the
 * model can charge you for training a muscle before it has recovered — and the
 * week wraps, i.e. the first session's spacing is measured from the last
 * session of the previous week.
 */
export function weeklyStimulus(sessions: SessionSpec[]): WeekResult {
  const week = weekTotals(sessions);
  return {
    ...week,
    insights: week.sessions.length ? weekInsights(week.sessions, week.live) : [],
  };
}

/**
 * The week's arithmetic, without the written insights — which is what lets
 * `weekInsights` compare the week against alternative frequencies without
 * recursing back into itself.
 */
function weekTotals(sessions: SessionSpec[]): Omit<WeekResult, "insights"> & { live: SessionSpec[] } {
  const live = sessions
    .filter((s) => s.sets > 0 && s.reps > 0)
    .sort((a, b) => a.day - b.day);

  if (live.length === 0) {
    return {
      sessions: [],
      live,
      stimulus: 0,
      fatigue: 0,
      sfr: 0,
      hardSets: 0,
      stimulatingReps: 0,
      frequency: 0,
      band: stimulusBand(0),
      pctOfCeiling: 0,
    };
  }

  // Pass 1: fatigue (and therefore recovery need) of each session on its own.
  const solo = live.map((s) => sessionStimulus(s));

  // Pass 2: charge each session for how recovered the muscle was, using the
  // gap from the previous session in a repeating week.
  const out: WeekSession[] = live.map((spec, i) => {
    const prev = (i - 1 + live.length) % live.length;
    const gapDays =
      live.length === 1
        ? 7
        : i === 0
        ? 7 - live[live.length - 1].day + spec.day
        : spec.day - live[prev].day;
    const gapHours = gapDays * 24;
    const ready = readinessAfter(gapHours, solo[prev].recoveryHours);
    const res = sessionStimulus(spec, ready);
    return {
      ...res,
      day: spec.day,
      dayLabel: DAY_LABELS[clamp(spec.day, 0, 6)],
      sets: Math.floor(spec.sets),
      gapHours,
    };
  });

  const stimulus = out.reduce((a, b) => a + b.stimulus, 0);
  const fatigue = out.reduce((a, b) => a + b.fatigue, 0);
  const hardSets = out.reduce((a, b) => a + b.sets, 0);
  const stimReps = out.reduce((a, b) => a + b.stimulatingReps * b.sets, 0);

  return {
    sessions: out,
    live,
    stimulus,
    fatigue,
    sfr: fatigue > 0 ? stimulus / fatigue : 0,
    hardSets,
    stimulatingReps: stimReps,
    frequency: out.length,
    band: stimulusBand(stimulus),
    pctOfCeiling: Math.min(100, (stimulus / MAX_USEFUL_WEEKLY_STIMULUS) * 100),
  };
}

function weekInsights(out: WeekSession[], live: SessionSpec[]): string[] {
  const notes: string[] = [];

  // Junk volume: the tail of a long session.
  const worst = out.reduce((a, b) => (b.junkSets > a.junkSets ? b : a));
  if (worst.junkSets > 0) {
    const first = worst.perSet.length - worst.junkSets + 1;
    notes.push(
      `${worst.dayLabel}: sets ${first}–${worst.perSet.length} land under 40% of the stimulus of set 1. Those are the sets to move to another day, not to grind out.`
    );
  }

  // Under-recovery.
  const rushed = out.filter((s) => s.readiness < 0.95);
  if (rushed.length) {
    const s = rushed[0];
    notes.push(
      `${s.dayLabel} starts ${Math.round(s.gapHours)}h after the previous session for this muscle, which needed ~${Math.round(
        s.recoveryHours
      )}h — that session lands at ${Math.round(s.readiness * 100)}% effectiveness. Spread the days out.`
    );
  }

  // Effort.
  const avgRir = live.reduce((a, b) => a + b.rir * b.sets, 0) / Math.max(1, live.reduce((a, b) => a + b.sets, 0));
  if (avgRir >= 3) {
    notes.push(
      `Your sets average ${avgRir.toFixed(1)} reps in reserve, so each one banks only ~${Math.max(
        0,
        STIMULATING_REP_WINDOW - Math.round(avgRir)
      )} stimulating reps. Taking the last set of each exercise to 0–1 RIR is the cheapest stimulus you can buy.`
    );
  }

  // Frequency: would the same sets be worth more spread differently? Capped at
  // four sessions — beyond that the extra stimulus is small and the schedule
  // stops being realistic for most people.
  const totalSets = out.reduce((a, b) => a + b.sets, 0);
  const best = bestFrequency(totalSets, live[0], 4);
  const current = out.reduce((a, b) => a + b.stimulus, 0);
  if (best && best.frequency !== out.length && best.stimulus > current * 1.05) {
    notes.push(
      `The same ${totalSets} weekly sets split over ${best.frequency} sessions (${best.setsPerSession} sets each) would be worth ~${best.stimulus.toFixed(
        0
      )} stimulus instead of ${current.toFixed(0)} — a ${Math.round(
        ((best.stimulus - current) / Math.max(0.1, current)) * 100
      )}% gain for no extra work.`
    );
  }

  return notes;
}

/* ========================================================================
 * 5. FREQUENCY COMPARISON
 * ====================================================================== */

export interface FrequencyOption {
  frequency: number;
  setsPerSession: number;
  stimulus: number;
  fatigue: number;
  sfr: number;
}

/**
 * The same weekly sets, split over 1…`maxFreq` evenly spaced sessions. This is
 * the model's central claim made concrete: because stimulus decays within a
 * session but fatigue clears between them, spreading volume out is close to
 * free growth — up to the point where sessions crowd each other's recovery.
 */
export function frequencyOptions(
  totalSets: number,
  base: SetSpec & { restSec: number },
  maxFreq = 6
): FrequencyOption[] {
  const total = Math.max(0, Math.floor(totalSets));
  const options: FrequencyOption[] = [];
  for (let f = 1; f <= Math.min(maxFreq, Math.max(1, total)); f++) {
    // Spread the sets as evenly as the count allows, on evenly spaced days.
    const sessions: SessionSpec[] = [];
    for (let i = 0; i < f; i++) {
      const sets = Math.floor(total / f) + (i < total % f ? 1 : 0);
      if (sets > 0) sessions.push({ ...base, sets, day: Math.round((i * 7) / f) % 7 });
    }
    const w = weekTotals(sessions);
    options.push({
      frequency: f,
      setsPerSession: sessions.length ? Math.round((total / sessions.length) * 10) / 10 : 0,
      stimulus: w.stimulus,
      fatigue: w.fatigue,
      sfr: w.sfr,
    });
  }
  return options;
}

/** The frequency that extracts the most stimulus from a fixed weekly set count. */
export function bestFrequency(
  totalSets: number,
  base: SetSpec & { restSec: number },
  maxFreq = 6
): FrequencyOption | null {
  const opts = frequencyOptions(totalSets, base, maxFreq);
  if (!opts.length) return null;
  return opts.reduce((a, b) => (b.stimulus > a.stimulus + 0.01 ? b : a));
}

/**
 * What an extra set added to a session of `existingSets` would be worth,
 * as stimulus units and as a % of that session's first set.
 */
export function marginalSet(
  spec: SetSpec & { restSec: number },
  existingSets: number
): { stimulus: number; pctOfFirst: number } {
  const base = setStimulus(spec);
  const stimulus = base * Math.pow(setDecay(spec.restSec), Math.max(0, existingSets));
  return { stimulus, pctOfFirst: base > 0 ? (stimulus / base) * 100 : 0 };
}

/* ========================================================================
 * 6. VOLUME LANDMARKS  (MV / MEV / MAV / MRV)
 * ----------------------------------------------------------------------
 * Weekly hard sets per muscle, in the vocabulary popularised by Mike Israetel
 * and Renaissance Periodization:
 *   MV  — maintenance volume: holds the muscle you have.
 *   MEV — minimum effective volume: the least that reliably grows it.
 *   MAV — maximum adaptive volume: the productive working range.
 *   MRV — maximum recoverable volume: past this you accumulate more fatigue
 *         than you can recover from, and progress stalls or reverses.
 * The published figures are population starting points; `personalLandmarks`
 * shifts them for experience, age, energy balance and recovery quality.
 * ====================================================================== */

export interface MuscleLandmark {
  key: string;
  label: string;
  mv: number;
  mev: number;
  mavLo: number;
  mavHi: number;
  mrv: number;
  /** Sessions per week that suit this muscle's recovery speed. */
  freqLo: number;
  freqHi: number;
}

export const MUSCLE_LANDMARKS: MuscleLandmark[] = [
  { key: "chest", label: "Chest", mv: 8, mev: 10, mavLo: 12, mavHi: 20, mrv: 22, freqLo: 2, freqHi: 3 },
  { key: "back", label: "Back / lats", mv: 10, mev: 10, mavLo: 14, mavHi: 22, mrv: 25, freqLo: 2, freqHi: 4 },
  { key: "quads", label: "Quads", mv: 6, mev: 8, mavLo: 12, mavHi: 18, mrv: 20, freqLo: 2, freqHi: 3 },
  { key: "hamstrings", label: "Hamstrings", mv: 4, mev: 6, mavLo: 10, mavHi: 16, mrv: 20, freqLo: 2, freqHi: 3 },
  { key: "glutes", label: "Glutes", mv: 4, mev: 6, mavLo: 12, mavHi: 16, mrv: 18, freqLo: 2, freqHi: 3 },
  { key: "sideDelts", label: "Side delts", mv: 6, mev: 8, mavLo: 16, mavHi: 22, mrv: 26, freqLo: 3, freqHi: 6 },
  { key: "rearDelts", label: "Rear delts", mv: 4, mev: 6, mavLo: 12, mavHi: 20, mrv: 26, freqLo: 2, freqHi: 4 },
  { key: "biceps", label: "Biceps", mv: 5, mev: 8, mavLo: 14, mavHi: 20, mrv: 26, freqLo: 2, freqHi: 4 },
  { key: "triceps", label: "Triceps", mv: 4, mev: 6, mavLo: 10, mavHi: 14, mrv: 18, freqLo: 2, freqHi: 4 },
  { key: "traps", label: "Traps", mv: 4, mev: 4, mavLo: 12, mavHi: 20, mrv: 26, freqLo: 2, freqHi: 4 },
  { key: "calves", label: "Calves", mv: 6, mev: 8, mavLo: 12, mavHi: 16, mrv: 20, freqLo: 2, freqHi: 4 },
  { key: "abs", label: "Abs", mv: 0, mev: 6, mavLo: 16, mavHi: 20, mrv: 25, freqLo: 3, freqHi: 5 },
];

export function findLandmark(key: string): MuscleLandmark {
  return MUSCLE_LANDMARKS.find((m) => m.key === key) ?? MUSCLE_LANDMARKS[0];
}

export type EnergyBalance = "deficit" | "maintenance" | "surplus";
export type RecoveryQuality = "good" | "average" | "poor";
export type Experience = "beginner" | "intermediate" | "advanced";

export interface LandmarkContext {
  experience: Experience;
  age: number;
  energy: EnergyBalance;
  recovery: RecoveryQuality;
}

export interface PersonalLandmarks extends MuscleLandmark {
  /** Plain-language reasons the numbers moved from the published defaults. */
  adjustments: string[];
}

/**
 * Shift the published landmarks to the person in front of you. Volume tolerance
 * rises with training age (more work capacity, less stimulus per set) and falls
 * with anything that eats recovery — a calorie deficit, poor sleep, being older.
 */
export function personalLandmarks(
  muscle: string,
  ctx: LandmarkContext
): PersonalLandmarks {
  const base = findLandmark(muscle);
  const adjustments: string[] = [];

  // Beginners need (and tolerate) less; advanced lifters need more sets for
  // the same stimulus and have the work capacity to handle them.
  let mevMul = 1;
  let mrvMul = 1;
  if (ctx.experience === "beginner") {
    mevMul = 0.7;
    mrvMul = 0.75;
    adjustments.push("Beginner: fewer sets grow you, and work capacity is still being built (MEV −30%, MRV −25%).");
  } else if (ctx.experience === "advanced") {
    mevMul = 1.15;
    mrvMul = 1.1;
    adjustments.push("Advanced: each set buys less, and you tolerate more of them (MEV +15%, MRV +10%).");
  }

  if (ctx.age >= 55) {
    mrvMul *= 0.8;
    adjustments.push("Age 55+: recovery is slower, so the ceiling drops (MRV −20%).");
  } else if (ctx.age >= 40) {
    mrvMul *= 0.9;
    adjustments.push("Age 40+: slightly slower recovery (MRV −10%).");
  }

  if (ctx.energy === "deficit") {
    mrvMul *= 0.8;
    mevMul *= 0.95;
    adjustments.push("Calorie deficit: recovery is limited, so hold volume near MEV and expect a lower ceiling (MRV −20%).");
  } else if (ctx.energy === "surplus") {
    mrvMul *= 1.1;
    adjustments.push("Calorie surplus: more fuel to recover on (MRV +10%).");
  }

  if (ctx.recovery === "poor") {
    mrvMul *= 0.85;
    adjustments.push("Poor sleep / high stress: fatigue clears slowly (MRV −15%).");
  } else if (ctx.recovery === "good") {
    mrvMul *= 1.05;
    adjustments.push("Good sleep & low stress: you can recover from a little more (MRV +5%).");
  }

  const r = (v: number) => Math.max(0, Math.round(v));
  const mev = r(base.mev * mevMul);
  const mrv = Math.max(mev + 2, r(base.mrv * mrvMul));
  // Keep the adaptive range inside the shifted MEV…MRV window.
  const mavLo = clamp(r(base.mavLo * mevMul), mev, mrv);
  const mavHi = clamp(r(base.mavHi * mrvMul), mavLo + 1, mrv);

  return {
    ...base,
    mv: Math.min(r(base.mv * mevMul), mev),
    mev,
    mavLo,
    mavHi,
    mrv,
    adjustments,
  };
}

/** Where a weekly set count sits against the landmarks. */
export function volumeVerdict(
  weeklySets: number,
  l: MuscleLandmark
): { key: "under" | "maintenance" | "growing" | "optimal" | "over"; label: string; advice: string } {
  if (weeklySets < l.mv)
    return { key: "under", label: "Below maintenance", advice: `Under ${l.mv} sets you will slowly lose this muscle. Get to at least ${l.mev} to grow.` };
  if (weeklySets < l.mev)
    return { key: "maintenance", label: "Maintenance only", advice: `Holds what you have. Growth starts around ${l.mev} sets a week.` };
  if (weeklySets < l.mavLo)
    return { key: "growing", label: "Growing", advice: `Above MEV, so you are growing. Add a set or two a week toward ${l.mavLo}–${l.mavHi}.` };
  if (weeklySets <= l.mavHi)
    return { key: "optimal", label: "Productive range", advice: `In the adaptive range (${l.mavLo}–${l.mavHi}). Keep adding a set a week until progress stalls, then deload.` };
  if (weeklySets <= l.mrv)
    return { key: "optimal", label: "Near your ceiling", advice: `Above the usual adaptive range but still recoverable (MRV ${l.mrv}). Fine for the last week or two of a block.` };
  return { key: "over", label: "Over MRV", advice: `Past what you can recover from (${l.mrv}). Fatigue will outrun the stimulus — deload and rebuild from MEV.` };
}

/* ========================================================================
 * 7. MESOCYCLE — RAMP MEV → MRV, THEN DELOAD
 * ====================================================================== */

export interface MesoWeek {
  week: number;
  weeklySets: number;
  setsPerSession: number;
  rir: number;
  label: string;
  deload: boolean;
}

/**
 * A classic accumulation block: start at MEV with a couple of reps in reserve,
 * add sets each week toward MRV while effort creeps toward failure, then take
 * a deload week at maintenance volume so the accumulated fatigue clears and
 * the adaptations show up.
 */
export function mesocycle(
  l: MuscleLandmark,
  weeks: number,
  frequency: number
): MesoWeek[] {
  const total = clamp(Math.round(weeks), 3, 8);
  const accum = total - 1; // last week is the deload
  const freq = clamp(Math.round(frequency), 1, 6);
  const rows: MesoWeek[] = [];

  for (let w = 0; w < accum; w++) {
    const t = accum === 1 ? 1 : w / (accum - 1);
    const sets = Math.round(l.mev + (l.mrv - l.mev) * t);
    const rir = Math.max(0, Math.round(3 - 3 * t));
    rows.push({
      week: w + 1,
      weeklySets: sets,
      setsPerSession: Math.round((sets / freq) * 10) / 10,
      rir,
      label:
        w === 0
          ? "Start of the block — deliberately easy, this is your MEV"
          : w === accum - 1
          ? "Peak week — at MRV and close to failure"
          : "Accumulate: add a set per session, keep the load moving up",
      deload: false,
    });
  }

  // Deload: about half the sets you started the block on, and never more than
  // maintenance volume — the point is to shed fatigue, not to keep training.
  const deloadSets = Math.max(2, Math.round(Math.min(l.mv, l.mev * 0.5)));
  rows.push({
    week: total,
    weeklySets: deloadSets,
    setsPerSession: Math.round((deloadSets / freq) * 10) / 10,
    rir: 4,
    label: "Deload — half the sets, ~10% off the bar, nowhere near failure",
    deload: true,
  });

  return rows;
}

/* ========================================================================
 * 8. EXERCISE SELECTION — STIMULUS-TO-FATIGUE RATING
 * ====================================================================== */

export interface ExerciseRating {
  stimulus: number; // per set, for the target muscle
  fatigue: number; // per set, systemic
  sfr: number; // stimulus ÷ fatigue for the target muscle
  /** SFR counting every muscle the exercise trains — the time-efficiency view. */
  sfrWhole: number;
  /** 0–100 rating of the per-muscle SFR. */
  rating: number;
  tier: string;
  placement: string;
  suggestedSets: string;
  notes: string[];
}

/** SFR at the top of the practical range — the 100/100 mark. */
const SFR_CEILING = 4.5;

/**
 * Rate an exercise as a hypertrophy tool. High-SFR exercises (supported,
 * isolated, loaded at long muscle lengths, moderate reps) buy growth cheaply,
 * so you can afford lots of them. Low-SFR exercises are not *bad* — a heavy
 * squat is a superb strength lift and trains several muscles at once, which is
 * what `sfrWhole` credits it for — they are just expensive, so do them first
 * and do fewer of them.
 */
export function exerciseRating(spec: SetSpec, musclesTrained = 1): ExerciseRating {
  const stimulus = setStimulus(spec);
  const fatigue = setFatigue(spec);
  const sfr = fatigue > 0 ? stimulus / fatigue : 0;
  const muscles = clamp(Math.round(musclesTrained), 1, 5);
  const sfrWhole = fatigue > 0 ? (stimulus * muscles) / fatigue : 0;
  const rating = clamp(((sfr - 1) / (SFR_CEILING - 1)) * 100, 0, 100);

  const s = defaults(spec);
  const notes: string[] = [];
  if (s.lengthBias === "lengthened")
    notes.push("Loaded at long muscle length — the most productive place to put tension, and the reason this scores well.");
  if (s.lengthBias === "shortened")
    notes.push("Peak tension lands where the muscle is already short. Pair it with something that loads the stretch.");
  if (s.rom === "shortPartial")
    notes.push("Short partials cut most of the stimulating range out of the rep — the biggest single penalty here.");
  if (s.rom === "lengthenedPartial")
    notes.push("Lengthened partials keep every rep in the productive half of the range; a legitimate way to raise stimulus per set.");
  if (s.pattern === "compound" && s.axial)
    notes.push("Axial loading (bar on the back or in the hands, standing) adds systemic fatigue that has nothing to do with the target muscle.");
  if (s.stability === "free")
    notes.push("Free weights tax balance and stabilisers; a supported or machine version of the same movement raises SFR without lowering stimulus.");
  if (isHeavySet(s.reps, s.rir))
    notes.push("Heavy sets (≤5 rep-max) make every rep stimulating, but joint and nervous-system cost climbs — great for strength, expensive for volume.");
  if (s.reps + s.rir > 20)
    notes.push("Very long sets reach the same ~5 stimulating reps through a lot of uncomfortable, fatiguing work — keep them to machines and isolation.");
  if (muscles > 1)
    notes.push(`Trains ~${muscles} muscles per set, so the fatigue is shared — that is what makes big compounds time-efficient despite a low per-muscle SFR.`);

  const tier =
    rating >= 80 ? "Excellent — build volume on this"
    : rating >= 60 ? "Good — a solid volume driver"
    : rating >= 40 ? "Fair — useful, but ration the sets"
    : "Expensive — high fatigue per unit of growth";

  const placement =
    rating >= 70
      ? "Anywhere in the session — it stays productive when you are already tired, so it is ideal for the back half."
      : rating >= 45
      ? "Early-to-middle. Do it before your fatigue-sensitive work, but after the one lift you care most about."
      : "First, while you are fresh — and stop at a few hard sets. Everything after it in the session pays for it.";

  const suggestedSets =
    rating >= 70 ? "3–5 hard sets" : rating >= 45 ? "3–4 hard sets" : "2–3 hard sets";

  return { stimulus, fatigue, sfr, sfrWhole, rating, tier, placement, suggestedSets, notes };
}

/* ========================================================================
 * 9. SET-SCHEME COMPARISON
 * ====================================================================== */

export interface SchemeResult {
  label: string;
  sets: number;
  reps: number;
  rir: number;
  stimulatingRepsPerSet: number;
  totalStimulatingReps: number;
  stimulus: number;
  fatigue: number;
  sfr: number;
  /** Minutes in the gym: sets × (rest + ~3s per rep), last rest dropped. */
  minutes: number;
  stimulusPerMinute: number;
  heavy: boolean;
}

const SEC_PER_REP = 3;

/** Score one way of arranging a session's work (e.g. "4×8 @ 1 RIR, 2 min"). */
export function scoreScheme(
  label: string,
  spec: SessionSpec
): SchemeResult {
  const res = sessionStimulus(spec);
  const sets = Math.max(0, Math.floor(spec.sets));
  const workSec = sets * spec.reps * SEC_PER_REP;
  const restSec = Math.max(0, sets - 1) * spec.restSec;
  const minutes = (workSec + restSec) / 60;
  return {
    label,
    sets,
    reps: spec.reps,
    rir: spec.rir,
    stimulatingRepsPerSet: res.stimulatingReps,
    totalStimulatingReps: res.stimulatingReps * sets,
    stimulus: res.stimulus,
    fatigue: res.fatigue,
    sfr: res.sfr,
    minutes,
    stimulusPerMinute: minutes > 0 ? res.stimulus / minutes : 0,
    heavy: isHeavySet(spec.reps, spec.rir),
  };
}
