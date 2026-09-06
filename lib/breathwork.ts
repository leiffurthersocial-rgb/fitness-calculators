/**
 * lib/breathwork.ts
 * -----------------
 * Apnea (breath-hold) training: CO₂ and O₂ tables, plus a percentile score for
 * a maximum static breath hold.
 *
 * The two tables train different things — the distinction matters, because
 * doing the wrong one for your goal wastes sessions:
 *
 *   • CO₂ table — the HOLD stays the same length while the RECOVERY BREATHING
 *     between holds gets shorter every round. You start each hold with more
 *     leftover CO₂ than the last, so the urge to breathe arrives earlier and
 *     hits harder. It trains CO₂ tolerance: the contractions and panic, not
 *     the oxygen. Uncomfortable, low risk, the workhorse of apnea training.
 *
 *   • O₂ table — the RECOVERY stays the same while the HOLDS get longer every
 *     round. Each hold pushes further into genuine oxygen depletion, training
 *     hypoxic tolerance and the dive response. More taxing, more risk, so it
 *     belongs later in a week and never back-to-back with another O₂ table.
 *
 * Both are built off one number: your current maximum static hold (MBH). Every
 * prescription is a percentage of it, so the tables scale with you and stay
 * hard-but-doable rather than arbitrary.
 *
 * Pure logic, no React. All times in seconds.
 *
 * SAFETY: static apnea is only ever practised dry — sitting or lying down, on
 * land, never in or near water, and never alone in water under any conditions.
 * Blackout from apnea is silent and gives no warning. See `SAFETY_RULES`.
 */

export type TableKind = "co2" | "o2";
export type TableLevel = "gentle" | "standard" | "hard";

export const TABLE_KINDS: { key: TableKind; label: string; trains: string; blurb: string }[] = [
  {
    key: "co2",
    label: "CO₂ table",
    trains: "CO₂ tolerance",
    blurb: "Same hold every round, shrinking rests — teaches you to sit calmly with the urge to breathe.",
  },
  {
    key: "o2",
    label: "O₂ table",
    trains: "Hypoxic tolerance",
    blurb: "Same rest every round, growing holds — trains the dive response and working with low oxygen.",
  },
];

export const TABLE_LEVELS: { key: TableLevel; label: string; blurb: string }[] = [
  { key: "gentle", label: "Gentle", blurb: "First few weeks, or a light day" },
  { key: "standard", label: "Standard", blurb: "The classic table — the default" },
  { key: "hard", label: "Hard", blurb: "Experienced only, once a week at most" },
];

/** Tuning per table & level. Percentages are of your max breath hold (MBH). */
interface TableSpec {
  holdStartPct: number; // first hold, as a share of MBH
  holdEndPct: number; // last hold (equal to the start for a CO₂ table)
  restStartSec: number; // recovery breathing before round 1
  restEndSec: number; // recovery before the last round (equal for an O₂ table)
}

const SPECS: Record<TableKind, Record<TableLevel, TableSpec>> = {
  // Hold fixed; rest shrinks. The classic table walks 2:00 down to 0:15.
  co2: {
    gentle: { holdStartPct: 0.4, holdEndPct: 0.4, restStartSec: 120, restEndSec: 60 },
    standard: { holdStartPct: 0.5, holdEndPct: 0.5, restStartSec: 120, restEndSec: 30 },
    hard: { holdStartPct: 0.6, holdEndPct: 0.6, restStartSec: 120, restEndSec: 15 },
  },
  // Rest fixed; holds climb toward (but never reach) a true max attempt.
  o2: {
    gentle: { holdStartPct: 0.35, holdEndPct: 0.65, restStartSec: 150, restEndSec: 150 },
    standard: { holdStartPct: 0.4, holdEndPct: 0.75, restStartSec: 120, restEndSec: 120 },
    hard: { holdStartPct: 0.5, holdEndPct: 0.85, restStartSec: 120, restEndSec: 120 },
  },
};

export const DEFAULT_ROUNDS = 8;

/** Round to the nearest 5 s so the numbers are readable on a clock. */
const to5 = (sec: number) => Math.max(5, Math.round(sec / 5) * 5);

/** Linear interpolation across `rounds` steps (index 0 → a, last → b). */
function lerpStep(a: number, b: number, i: number, rounds: number): number {
  if (rounds <= 1) return a;
  return a + ((b - a) * i) / (rounds - 1);
}

export interface TableRow {
  round: number;
  /** Recovery breathing before this round's hold. */
  breatheSec: number;
  holdSec: number;
  /** Hold as a share of your max — the honest read on how hard the round is. */
  holdPct: number;
}

export type PhaseKind = "prepare" | "breathe" | "hold" | "recover";

export interface Phase {
  kind: PhaseKind;
  label: string;
  seconds: number;
  /** 1-based round this phase belongs to (prepare/recover have none). */
  round?: number;
  /** What to actually do, shown large during the phase. */
  cue: string;
}

export interface BreathSession {
  kind: TableKind;
  level: TableLevel;
  maxHoldSec: number;
  rounds: TableRow[];
  phases: Phase[];
  totalSec: number;
  /** Longest single hold in the session. */
  peakHoldSec: number;
  /** Total time spent holding across the session. */
  holdTimeSec: number;
}

/** The relaxed breathing that opens a session, and the recovery that closes it. */
export const PREPARE_SEC = 120;
export const RECOVER_SEC = 90;

export interface SessionInput {
  kind: TableKind;
  level: TableLevel;
  /** Your current max static hold, in seconds. */
  maxHoldSec: number;
  rounds?: number;
  /** Skip the 2-minute settling phase (you already warmed up). */
  skipPrepare?: boolean;
}

/** Build the round table (what you'd write on a whiteboard) for a session. */
export function buildTable(input: SessionInput): TableRow[] {
  const rounds = Math.max(2, Math.min(12, input.rounds ?? DEFAULT_ROUNDS));
  const spec = SPECS[input.kind][input.level];
  const mbh = Math.max(10, input.maxHoldSec);
  const out: TableRow[] = [];
  for (let i = 0; i < rounds; i++) {
    const holdPct = lerpStep(spec.holdStartPct, spec.holdEndPct, i, rounds);
    // The rest schedule runs the *other* way for a CO₂ table: the first round
    // gets the longest recovery, the last one the shortest.
    const breatheSec = to5(lerpStep(spec.restStartSec, spec.restEndSec, i, rounds));
    out.push({
      round: i + 1,
      breatheSec,
      holdSec: to5(mbh * holdPct),
      holdPct,
    });
  }
  return out;
}

const HOLD_CUES = [
  "Relax the jaw and shoulders. Let the hold come to you.",
  "Stay still — every movement burns oxygen.",
  "Contractions are normal and safe. Ride them out.",
  "Soften the face. Slow, quiet mind.",
];

/**
 * Expand a table into the flat phase list the guided timer walks through:
 * prepare → (breathe, hold) × rounds → recover.
 */
export function buildSession(input: SessionInput): BreathSession {
  const rounds = buildTable(input);
  const phases: Phase[] = [];

  if (!input.skipPrepare) {
    phases.push({
      kind: "prepare",
      label: "Settle",
      seconds: PREPARE_SEC,
      cue: "Sit or lie down. Breathe slowly through the nose — long, unforced exhales. Let your heart rate drop.",
    });
  }

  for (const r of rounds) {
    phases.push({
      kind: "breathe",
      label: `Breathe · round ${r.round}`,
      seconds: r.breatheSec,
      round: r.round,
      cue:
        r.breatheSec <= 45
          ? "Calm, normal breaths — do not hyperventilate. Final breath at about 80% full."
          : "Relaxed tidal breathing. Last 30 s: slow and deep, then one easy breath in — never a full gulp.",
    });
    phases.push({
      kind: "hold",
      label: `Hold · round ${r.round}`,
      seconds: r.holdSec,
      round: r.round,
      cue: HOLD_CUES[(r.round - 1) % HOLD_CUES.length],
    });
  }

  phases.push({
    kind: "recover",
    label: "Recover",
    seconds: RECOVER_SEC,
    cue: "Recovery breaths: quick in, passive out, ×3. Then breathe normally until you feel completely clear.",
  });

  const totalSec = phases.reduce((s, p) => s + p.seconds, 0);
  const holdTimeSec = rounds.reduce((s, r) => s + r.holdSec, 0);
  const peakHoldSec = rounds.reduce((m, r) => Math.max(m, r.holdSec), 0);

  return {
    kind: input.kind,
    level: input.level,
    maxHoldSec: input.maxHoldSec,
    rounds,
    phases,
    totalSec,
    peakHoldSec,
    holdTimeSec,
  };
}

/* ------------------------------------------------------------------ */
/* Max breath-hold percentile                                          */
/* ------------------------------------------------------------------ */

/**
 * Static apnea times are strongly right-skewed — most adults sit between 30 s
 * and 90 s, while trained apneists run into the many-minutes tail — so we model
 * the population as log-normal and read the percentile off the z-score.
 *
 * Anchors used to fit the curve (dry static hold, after a normal breathe-up,
 * no hyperventilation and no supplemental oxygen):
 *   • median untrained man ≈ 55 s, woman ≈ 45 s (women hold slightly less on
 *     average, mostly a lung-volume/body-size effect)
 *   • ~90th percentile ≈ 2 min — the level a few weeks of tables gets you to
 *   • ~99.9th percentile ≈ 6 min — competitive apneist territory
 *   • men's dry static world record: 11:35 (Stéphane Mifsud, 2009)
 */
export const WORLD_RECORD_SEC: Record<"male" | "female", number> = {
  male: 695, // 11:35
  female: 546, // 9:06
};

const MEDIAN_SEC: Record<"male" | "female", number> = { male: 55, female: 45 };
/** Spread of log(hold). Fitted so the 90th percentile lands near 2 minutes. */
const LOG_SD = 0.61;

/**
 * Breath-hold capacity drifts down with age (lung volume and chest-wall
 * compliance both fall), and teenagers haven't finished growing lungs either.
 * The factor scales the population median so the percentile is age-fair.
 */
export function ageBreathFactor(age: number): number {
  if (age <= 0) return 1;
  if (age < 18) return 0.85 + (age - 12) * 0.025; // 12 y → 0.85, 18 y → 1.0
  if (age <= 30) return 1;
  return Math.max(0.65, 1 - (age - 30) * 0.006); // ~0.6%/yr after 30
}

/** Standard-normal CDF (Abramowitz & Stegun 26.2.17), for the percentile. */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const p =
    d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - p : p;
}

export interface BreathLevel {
  key: string;
  label: string;
  minSec: number;
  blurb: string;
}

/** The ladder of static-apnea levels, used for the tier read-out. */
export const BREATH_LEVELS: BreathLevel[] = [
  { key: "beginner", label: "Beginner", minSec: 0, blurb: "Below the untrained average — usually tension and technique, not lungs." },
  { key: "novice", label: "Novice", minSec: 45, blurb: "Around the untrained adult average." },
  { key: "trained", label: "Trained", minSec: 90, blurb: "Clearly above average — a few weeks of CO₂ tables gets most people here." },
  { key: "intermediate", label: "Intermediate", minSec: 150, blurb: "Solid recreational apneist. You have real CO₂ tolerance." },
  { key: "advanced", label: "Advanced", minSec: 240, blurb: "Four minutes plus — consistent structured training territory." },
  { key: "expert", label: "Expert", minSec: 360, blurb: "Competitive static apnea standard." },
  { key: "elite", label: "Elite", minSec: 480, blurb: "National/world-class static apnea." },
];

export function breathLevelFor(sec: number): BreathLevel {
  let out = BREATH_LEVELS[0];
  for (const l of BREATH_LEVELS) if (sec >= l.minSec) out = l;
  return out;
}

export interface BreathHoldScore {
  seconds: number;
  percentile: number; // 0–100 vs the general adult population
  level: BreathLevel;
  nextLevel: BreathLevel | null;
  /** Seconds still needed for the next tier (0 if you're at the top). */
  toNextSec: number;
  /** Your hold as a share of the standing world record. */
  pctOfWorldRecord: number;
  /** Where a typical person your age & sex lands, for context. */
  medianSec: number;
  /** Realistic hold after ~8–12 weeks of consistent table work. */
  projectedSec: number;
  notes: string[];
}

export function breathHoldScore(args: {
  seconds: number;
  age: number;
  sex: "male" | "female";
  /** Have you trained apnea before? Only used for the projection, not the score. */
  trained?: boolean;
}): BreathHoldScore {
  const sec = Math.max(0, args.seconds);
  const median = MEDIAN_SEC[args.sex] * ageBreathFactor(args.age);
  const z = sec > 0 ? Math.log(sec / median) / LOG_SD : -4;
  const percentile = Math.max(0.1, Math.min(99.9, normalCdf(z) * 100));

  const level = breathLevelFor(sec);
  const idx = BREATH_LEVELS.findIndex((l) => l.key === level.key);
  const nextLevel = idx >= 0 && idx < BREATH_LEVELS.length - 1 ? BREATH_LEVELS[idx + 1] : null;

  // Untrained people typically gain the most: doubling in 8–12 weeks of tables
  // is common, because the first limit is CO₂ tolerance, not oxygen. Trained
  // apneists are already past the easy gains.
  const growth = args.trained ? 1.25 : sec < 60 ? 2.0 : sec < 120 ? 1.7 : 1.4;

  const notes: string[] = [];
  notes.push(
    "Your first breath-hold limit is CO₂ tolerance, not oxygen — the urge to breathe arrives long before you are actually short of O₂. That is what CO₂ tables retrain."
  );
  if (sec < 45)
    notes.push("Under 45 s is almost always tension, not lung capacity. Two minutes of settling before the hold is usually worth 20–30 s on its own.");
  if (percentile >= 90)
    notes.push(`You are in the top ${Math.max(0.1, Math.round((100 - percentile) * 10) / 10)}% of adults. Progress from here comes from structured tables, not from trying harder.`);
  notes.push("Never hyperventilate before a hold: it lowers CO₂ without adding oxygen, so the warning signal disappears while blackout risk stays. Take one easy breath to about 80% full.");

  return {
    seconds: sec,
    percentile: Math.round(percentile * 10) / 10,
    level,
    nextLevel,
    toNextSec: nextLevel ? Math.max(0, nextLevel.minSec - sec) : 0,
    pctOfWorldRecord: (sec / WORLD_RECORD_SEC[args.sex]) * 100,
    medianSec: Math.round(median),
    projectedSec: Math.round(sec * growth),
    notes,
  };
}

/* ------------------------------------------------------------------ */
/* Instructions & safety                                               */
/* ------------------------------------------------------------------ */

export const SAFETY_RULES: string[] = [
  "Dry land only. Never practise breath holds in or next to water, in a bath, or while swimming — apnea blackout gives no warning and is silent.",
  "Sit or lie down, somewhere you cannot fall. Never hold your breath while driving, standing, or exercising.",
  "Never hyperventilate first. Fast deep breathing before a hold strips CO₂, removes your warning signal and makes blackout more likely — take one relaxed breath to ~80% full.",
  "Stop immediately if you feel dizzy, tingly, see spots or your vision narrows. Those are hypoxia signs, not toughness tests.",
  "Skip breath-hold training if you are pregnant, or have heart disease, uncontrolled blood pressure, epilepsy, or a history of fainting — check with a doctor first.",
  "One table per day, and never an O₂ table two days running. CO₂ tables can be daily; O₂ tables once or twice a week.",
];

export const HOW_TO_MEASURE: string[] = [
  "Sit or lie down somewhere quiet and warm, and stay there for 2 minutes of slow nasal breathing until your heart rate settles.",
  "For the last 30 seconds, breathe slowly and deeply — but calmly. No hyperventilating, no rapid breathing.",
  "Take one final unhurried breath to about 80–90% of full, then start the clock.",
  "Stay completely still. The first contractions of the diaphragm are the halfway signal, not the finish line — they are safe and expected.",
  "Stop the clock the moment you breathe. Then do three recovery breaths: quick sharp inhale, passive exhale.",
  "Re-test every 2–4 weeks, at the same time of day, never after caffeine or a heavy meal.",
];

/** How the two tables fit into a week, given how many days you can train. */
export function weeklyPlan(days: number): { day: string; work: string }[] {
  const d = Math.max(2, Math.min(6, days));
  const plan: { day: string; work: string }[] = [];
  for (let i = 1; i <= d; i++) {
    // O₂ tables are the taxing ones — at most two a week, never consecutive.
    const isO2 = d >= 4 ? i === 2 || i === d : i === d;
    plan.push({
      day: `Day ${i}`,
      work: isO2 ? "O₂ table (longer holds, full recoveries)" : "CO₂ table (shrinking rests)",
    });
  }
  return plan;
}
