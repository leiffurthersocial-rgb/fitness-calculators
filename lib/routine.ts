/**
 * lib/routine.ts
 * --------------
 * Routine → sessions (each done 1–3× a week) → exercises (sets, reps in
 * reserve), rated per muscle with Chris Beardsley's Weekly Net Stimulus model.
 *
 * For every muscle and every workout:
 *
 *   effective sets = Σ sets × set credit × exercise efficiency
 *                      × proximity to failure × systemic-fatigue factor
 *   stimulus       = S(effective sets) × (1 − recovery penalty)
 *
 * - Set credit: 1 for prime movers, 0.5 for synergists (fractional counting).
 * - Exercise efficiency: how well a set turns into stimulating reps for the
 *   target (stability, which muscle limits the set, resistance curve).
 * - Proximity to failure: each rep in reserve removes 1 of ~5 stimulating reps.
 * - Systemic fatigue: after ~12 fatigue units in a session (≈20 isolation or
 *   ~8 heavy compound sets), each further unit costs later sets 1.5%, down to 70%.
 * - S(n): diminishing returns within a session (local fatigue).
 * - Recovery penalty: training a muscle again before the damage from its last
 *   session has resolved (~72 h) reduces the new workout's stimulus.
 *
 * WNS = Σ stimulus − atrophy in the hours not covered by a stimulus window.
 * A workout opens a window if the muscle gets ≥ 1 effective set in it.
 * "Frequency" shown to the user counts only sessions with direct work.
 */

import {
  EXERCISE_BY_ID,
  MUSCLES,
  MUSCLE_BY_ID,
  bestExercisesFor,
  type MuscleId,
} from "./exercises";
import {
  DAY_LABELS,
  DEFAULT_WNS_OPTIONS,
  HOURS_PER_WEEK,
  setEffectiveness,
  wnsFromWorkouts,
  wnsVerdict,
  workoutStimulus,
  type WnsOptions,
} from "./wns";

export interface RoutineExercise {
  id: string;
  /** Library id, or "custom" with `name` + `muscle`. */
  exerciseId: string;
  name?: string;
  muscle?: MuscleId;
  sets: number;
  /** Reps in reserve on working sets. */
  rir: number;
}

export interface RoutineSession {
  id: string;
  name: string;
  /** Times per week this session is performed (1–3). */
  perWeek: number;
  exercises: RoutineExercise[];
}

export type Priority = "focus" | "normal" | "skip";

export interface Routine {
  id: string;
  name: string;
  sessions: RoutineSession[];
  /** Per-muscle priorities; missing = normal. */
  priorities?: Partial<Record<MuscleId, Priority>>;
  updatedAt: number;
}

/* ---- Model constants ---- */

/** Above this many effective sets per muscle in one session, extra sets add little. */
export const SESSION_SET_CAP = 6;
/** Rough minutes per working set including rest. */
export const MINUTES_PER_SET = 2.5;
/** Fatigue units a session can absorb before later sets lose stimulus. */
export const FATIGUE_FREE = 12;
/** Stimulus lost per fatigue unit beyond the free amount. */
export const FATIGUE_SLOPE = 0.015;
export const FATIGUE_FLOOR = 0.7;
/** Hours for exercise-induced muscle damage to resolve. */
export const RECOVERY_HOURS = 72;
/** Stimulus lost per unrecovered effective set from the previous workout. */
export const DAMAGE_PER_SET = 0.035;
export const DAMAGE_MAX = 0.4;
/** Effective sets in one workout needed to keep a muscle out of atrophy. */
export const WINDOW_MIN_SETS = 1;
/** Custom exercises: assumed efficiency and fatigue. */
const CUSTOM = { efficiency: 0.9, fatigue: 0.8 };

const PRIORITY_WEIGHT: Record<Priority, number> = { focus: 2, normal: 1, skip: 0 };

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function exerciseName(e: RoutineExercise): string {
  if (e.exerciseId === "custom") return e.name?.trim() || "Custom exercise";
  return EXERCISE_BY_ID[e.exerciseId]?.name ?? "Unknown exercise";
}

export interface ExerciseProfile {
  muscles: Partial<Record<MuscleId, number>>;
  efficiency: number;
  fatigue: number;
}

export function exerciseProfile(e: RoutineExercise): ExerciseProfile {
  if (e.exerciseId === "custom") return { muscles: e.muscle ? { [e.muscle]: 1 } : {}, ...CUSTOM };
  const x = EXERCISE_BY_ID[e.exerciseId];
  return x ? { muscles: x.muscles, efficiency: x.efficiency, fatigue: x.fatigue } : { muscles: {}, ...CUSTOM };
}

/** Stimulus multiplier for a set done after `load` fatigue units in the session. */
export function systemicFactor(load: number): number {
  if (load <= FATIGUE_FREE) return 1;
  return Math.max(FATIGUE_FLOOR, 1 - (load - FATIGUE_FREE) * FATIGUE_SLOPE);
}

/** Fatigue units for one set: harder sets (closer to failure) cost more. */
function setFatigue(fatigue: number, rir: number): number {
  return fatigue * Math.max(0.6, 1 - 0.1 * Math.max(0, rir));
}

/** Fraction of the next workout's stimulus lost to unrecovered damage. */
export function recoveryPenalty(prevEffectiveSets: number, hoursSince: number): number {
  const remaining = Math.max(0, 1 - hoursSince / RECOVERY_HOURS);
  return Math.min(DAMAGE_MAX, DAMAGE_PER_SET * prevEffectiveSets * remaining);
}

/**
 * Spread the sessions evenly over the week, alternating them (A B A B …).
 * Returns the session index for each workout, its weekday and start hour.
 */
export function weeklyLayout(sessions: RoutineSession[]): { day: number; hour: number; session: number }[] {
  const remaining = sessions.map((s) => Math.max(0, Math.round(s.perWeek)));
  const order: number[] = [];
  while (remaining.some((r) => r > 0)) {
    remaining.forEach((r, i) => {
      if (r > 0) {
        order.push(i);
        remaining[i]--;
      }
    });
  }
  const total = Math.max(order.length, 1);
  const perDay: Record<number, number> = {};
  return order.map((session, i) => {
    const day = Math.floor((i * 7) / total);
    const slot = (perDay[day] = (perDay[day] ?? -1) + 1);
    return { session, day, hour: day * 24 + slot * 6 };
  });
}

/* ---- Per-session analysis ---- */

export interface SessionAnalysis {
  sets: number;
  minutes: number;
  /** Total fatigue units in the session. */
  fatigue: number;
  /** Systemic-fatigue factor applied to each exercise, in order. */
  exerciseFactors: number[];
  /** Effective sets per muscle (after all per-set adjustments). */
  effective: Partial<Record<MuscleId, number>>;
  /** Same, without the systemic-fatigue factor (to measure its cost). */
  effectiveFresh: Partial<Record<MuscleId, number>>;
  /** Fractional sets per muscle (credit only). */
  fractional: Partial<Record<MuscleId, number>>;
  /** Muscles with at least one prime-mover set. */
  direct: Set<MuscleId>;
}

export function analyzeSession(s: RoutineSession): SessionAnalysis {
  const out: SessionAnalysis = {
    sets: 0,
    minutes: 0,
    fatigue: 0,
    exerciseFactors: [],
    effective: {},
    effectiveFresh: {},
    fractional: {},
    direct: new Set(),
  };
  let load = 0;
  for (const e of s.exercises) {
    const sets = Math.max(0, e.sets || 0);
    const p = exerciseProfile(e);
    const factor = systemicFactor(load);
    out.exerciseFactors.push(factor);
    const k = setEffectiveness(e.rir ?? 0);
    for (const [m, credit] of Object.entries(p.muscles) as [MuscleId, number][]) {
      const fresh = sets * credit * p.efficiency * k;
      out.effectiveFresh[m] = (out.effectiveFresh[m] ?? 0) + fresh;
      out.effective[m] = (out.effective[m] ?? 0) + fresh * factor;
      out.fractional[m] = (out.fractional[m] ?? 0) + sets * credit;
      if (credit >= 1 && sets > 0) out.direct.add(m);
    }
    load += sets * setFatigue(p.fatigue, e.rir ?? 0);
    out.sets += sets;
  }
  out.fatigue = load;
  out.minutes = Math.round(out.sets * MINUTES_PER_SET);
  return out;
}

/* ---- Per-muscle rating ---- */

export type MuscleStatus = "untrained" | "losing" | "maintaining" | "growing" | "optimal";

export interface MuscleRating {
  muscle: MuscleId;
  name: string;
  priority: Priority;
  /** Rating weight (muscle size × priority). */
  weight: number;
  /** Fractional sets per week (credit only). */
  weeklySets: number;
  /** Sets per week from exercises where this muscle is the prime mover. */
  directSets: number;
  /** Effective sets per week after efficiency, effort and fatigue. */
  effectiveSets: number;
  /** Workouts per week with direct work for this muscle. */
  frequency: number;
  wns: number;
  /** 0–100. */
  score: number;
  status: MuscleStatus;
  /** Most effective sets in a single workout. */
  maxSessionSets: number;
  /** Share of stimulus lost to unrecovered damage from the previous workout. */
  recoveryLoss: number;
  /** Share of effective sets lost to in-session systemic fatigue. */
  fatigueLoss: number;
  /** Average efficiency of the prime-mover sets (null if none). */
  directEfficiency: number | null;
}

export interface RoutineFeedback {
  tone: "good" | "warn" | "bad";
  text: string;
}

export interface RoutineRating {
  score: number;
  grade: string;
  muscles: MuscleRating[];
  layout: { day: number; hour: number; session: number }[];
  workoutsPerWeek: number;
  weeklySets: number;
  sessions: SessionAnalysis[];
  feedback: RoutineFeedback[];
}

export function gradeFor(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

interface MuscleWorkout {
  hour: number;
  effective: number;
  direct: boolean;
}

/** Run the WNS model for one muscle's workouts, with the recovery penalty. */
export function muscleWns(workouts: MuscleWorkout[], opts: WnsOptions): { wns: number; recoveryLoss: number } {
  const ws = workouts.filter((w) => w.effective > 0).sort((a, b) => a.hour - b.hour);
  let total = 0;
  let lost = 0;
  const stim = ws.map((w, i) => {
    const prev = ws.length > 1 ? ws[(i - 1 + ws.length) % ws.length] : null;
    const gap = prev ? (w.hour - prev.hour + HOURS_PER_WEEK) % HOURS_PER_WEEK || HOURS_PER_WEEK : HOURS_PER_WEEK;
    const penalty = prev ? recoveryPenalty(prev.effective, gap) : 0;
    const full = workoutStimulus(w.effective, opts.curve);
    total += full;
    lost += full * penalty;
    return { hour: w.hour, stimulus: full * (1 - penalty), opensWindow: w.effective >= WINDOW_MIN_SETS };
  });
  return { wns: wnsFromWorkouts(stim, opts).wns, recoveryLoss: total > 0 ? lost / total : 0 };
}

/** The WNS that scores 100: 4 hard, fully efficient direct sets, 3× a week. */
export function benchmarkWns(opts: WnsOptions): number {
  return muscleWns(
    [0, 48, 96].map((hour) => ({ hour, effective: 4, direct: true })),
    opts
  ).wns;
}

/**
 * Map a muscle's WNS to 0–100: a full week of atrophy = 0, maintenance = 30,
 * the benchmark (or more) = 100. Above maintenance the score rises with the
 * square root of WNS, so the first gains count most.
 */
export function muscleScore(wns: number, benchmark: number, untrainedWns: number): number {
  if (wns <= 0) {
    const loss = untrainedWns < 0 ? Math.min(1, wns / untrainedWns) : 1;
    return Math.round(30 * (1 - loss));
  }
  const ratio = benchmark > 0 ? Math.min(1, wns / benchmark) : 1;
  return Math.round(30 + 70 * Math.sqrt(ratio));
}

export function rateRoutine(routine: Routine, options: Partial<WnsOptions> = {}): RoutineRating {
  const opts: WnsOptions = { ...DEFAULT_WNS_OPTIONS, ...options, rir: 0 };
  const layout = weeklyLayout(routine.sessions);
  const sessions = routine.sessions.map(analyzeSession);
  const benchmark = benchmarkWns(opts);
  const untrained = wnsFromWorkouts([], opts).wns;

  const muscles: MuscleRating[] = MUSCLES.map((m) => {
    const priority = routine.priorities?.[m.id] ?? "normal";
    const workouts: MuscleWorkout[] = layout.map(({ hour, session }) => ({
      hour,
      effective: sessions[session].effective[m.id] ?? 0,
      direct: sessions[session].direct.has(m.id),
    }));
    const { wns, recoveryLoss } = muscleWns(workouts, opts);

    let weeklySets = 0;
    let directSets = 0;
    let effectiveSets = 0;
    let fresh = 0;
    let effWeighted = 0;
    for (const { session } of layout) {
      const a = sessions[session];
      weeklySets += a.fractional[m.id] ?? 0;
      effectiveSets += a.effective[m.id] ?? 0;
      fresh += a.effectiveFresh[m.id] ?? 0;
      for (const e of routine.sessions[session].exercises) {
        const p = exerciseProfile(e);
        if (p.muscles[m.id] === 1) {
          directSets += e.sets;
          effWeighted += e.sets * p.efficiency;
        }
      }
    }

    const ratio = benchmark > 0 ? wns / benchmark : 0;
    const v = wnsVerdict(wns);
    const status: MuscleStatus =
      weeklySets === 0
        ? "untrained"
        : v === "loss"
          ? "losing"
          : v === "maintenance"
            ? "maintaining"
            : ratio >= 0.81 // score ≥ 90
              ? "optimal"
              : "growing";

    return {
      muscle: m.id,
      name: m.name,
      priority,
      weight: m.weight * PRIORITY_WEIGHT[priority],
      weeklySets,
      directSets,
      effectiveSets,
      frequency: workouts.filter((w) => w.direct).length,
      wns,
      score: muscleScore(wns, benchmark, untrained),
      status,
      maxSessionSets: Math.max(0, ...sessions.map((a) => a.effective[m.id] ?? 0)),
      recoveryLoss,
      fatigueLoss: fresh > 0 ? 1 - effectiveSets / fresh : 0,
      directEfficiency: directSets > 0 ? effWeighted / directSets : null,
    };
  });

  const totalWeight = muscles.reduce((a, r) => a + r.weight, 0);
  const score = totalWeight > 0 ? Math.round(muscles.reduce((a, r) => a + r.weight * r.score, 0) / totalWeight) : 0;

  return {
    score,
    grade: gradeFor(score),
    muscles,
    layout,
    workoutsPerWeek: layout.length,
    weeklySets: routine.sessions.reduce((a, s, i) => a + sessions[i].sets * s.perWeek, 0),
    sessions,
    feedback: buildFeedback(routine, muscles, sessions),
  };
}

/* ---- Feedback ---- */

const r1 = (n: number) => (Math.round(n * 10) / 10).toString();
const pct = (n: number) => `${Math.round(n * 100)}%`;
const lc = (m: MuscleId) => MUSCLE_BY_ID[m].name.toLowerCase();

function buildFeedback(routine: Routine, muscles: MuscleRating[], sessions: SessionAnalysis[]): RoutineFeedback[] {
  if (routine.sessions.every((s) => s.exercises.length === 0)) {
    return [{ tone: "warn", text: "Add exercises to your sessions to get a rating." }];
  }
  const out: (RoutineFeedback & { rank: number })[] = [];
  const push = (rank: number, tone: RoutineFeedback["tone"], text: string) => out.push({ rank, tone, text });
  const relevant = (m: MuscleRating) => m.priority !== "skip" && (m.weight >= 0.5 || m.priority === "focus");

  for (const m of muscles.filter(relevant)) {
    const best = bestExercisesFor(m.muscle)[0];
    const bestName = best?.name.toLowerCase() ?? "a direct exercise";
    const focus = m.priority === "focus";
    const rank = m.weight;

    // Not growing.
    if (m.status === "untrained") {
      push(rank + 2, m.weight >= 1 ? "bad" : "warn", `${m.name}: not trained. Add 2–3 hard sets of ${bestName} to at least two sessions.`);
    } else if (m.status === "losing" || m.status === "maintaining") {
      const state = m.status === "losing" ? "losing muscle" : "only maintaining";
      if (m.frequency <= 1) {
        push(rank + 1.5, m.weight >= 1 ? "bad" : "warn", `${m.name}: ${state} with ${m.frequency === 0 ? "no direct work" : "direct work once a week"}. Train it directly in two or more sessions, e.g. ${bestName}.`);
      } else {
        push(rank + 1, "warn", `${m.name}: ${state}. Add 1–2 hard sets per session, e.g. ${bestName}.`);
      }
    } else if (focus && m.status !== "optimal") {
      push(rank + 1, "warn", `${m.name} is a focus muscle but not yet optimal (${m.score}/100). Add a set per session or a third weekly session for it.`);
    }

    // Exercise choice.
    if (m.directEfficiency !== null && m.directEfficiency < 0.88 && best && best.efficiency >= 0.95) {
      push(rank, "warn", `${m.name}: your direct exercises (${muscleLimiters(routine, m.muscle)}) average ${pct(m.directEfficiency)} hypertrophy efficiency. ${best.name} (${pct(best.efficiency)}) makes the ${lc(m.muscle)} what fails.`);
    }

    // Recovery between sessions.
    if (m.recoveryLoss >= 0.08) {
      push(rank, "warn", `${m.name}: ~${pct(m.recoveryLoss)} of its stimulus is lost because it's trained again before recovering from the last session. Space those sessions further apart or trim the volume.`);
    }
  }

  // Too much for one muscle in one session.
  routine.sessions.forEach((s, i) => {
    for (const [m, sets] of Object.entries(sessions[i].effective) as [MuscleId, number][]) {
      if (sets > SESSION_SET_CAP + 0.01 && routine.priorities?.[m] !== "skip") {
        const extra = Math.ceil(sets - SESSION_SET_CAP);
        push(0.9, "warn", `In ${s.name}, ${lc(m)} gets ${r1(sets)} effective sets. Beyond ~${SESSION_SET_CAP} per session adds little and slows recovery, so move ${extra} to another session.`);
      }
    }
  });

  // Systemic fatigue within a session.
  routine.sessions.forEach((s, i) => {
    const f = sessions[i].exerciseFactors;
    const last = f.length ? f[f.length - 1] : 1;
    if (last < 0.92) {
      push(0.8, "warn", `${s.name}: by the last exercise, fatigue costs ~${pct(1 - last)} of each set's stimulus (${Math.round(sessions[i].fatigue)} fatigue units). Put priority muscles first, swap heavy compounds for machines, or split the session.`);
    }
  });

  // Sets far from failure.
  const easy = routine.sessions.reduce((a, s) => a + s.exercises.filter((e) => (e.rir ?? 0) >= 4).length, 0);
  if (easy > 0) {
    push(0.7, "warn", `${easy} exercise${easy > 1 ? "s are" : " is"} at 4+ reps in reserve. Those sets give few stimulating reps, so take them within 0–3 reps of failure.`);
  }

  out.sort((a, b) => b.rank - a.rank);
  const optimal = muscles.filter((m) => m.status === "optimal" && m.priority !== "skip").length;
  const counted = muscles.filter((m) => m.priority !== "skip").length;
  const result: RoutineFeedback[] = out.map(({ tone, text }) => ({ tone, text }));
  if (result.length === 0) {
    result.push({ tone: "good", text: "Every muscle you care about is in a net-growth week, with sensible per-session volume and recovery. Nice routine." });
  } else if (optimal > 0) {
    result.push({ tone: "good", text: `${optimal} of ${counted} muscles are at or near the optimal weekly stimulus.` });
  }
  return result;
}

/** The less efficient direct exercises the routine uses for a muscle. */
function muscleLimiters(routine: Routine, muscle: MuscleId): string {
  const names = new Set<string>();
  for (const s of routine.sessions)
    for (const e of s.exercises) {
      const x = EXERCISE_BY_ID[e.exerciseId];
      if (x && x.muscles[muscle] === 1 && x.efficiency < 0.9) names.add(x.name.toLowerCase());
    }
  return [...names].slice(0, 2).join(", ") || "custom exercises";
}

export function layoutLabel(layout: { day: number; session: number }[], sessions: RoutineSession[]): string[] {
  return DAY_LABELS.map((_, d) =>
    layout
      .filter((l) => l.day === d)
      .map((l) => sessions[l.session]?.name ?? "")
      .join(" + ")
  );
}

/* ---- Templates ---- */

type T = [string, number, number?];
function session(name: string, perWeek: number, items: T[]): RoutineSession {
  return {
    id: newId(),
    name,
    perWeek,
    exercises: items.map(([exerciseId, sets, rir]) => ({ id: newId(), exerciseId, sets, rir: rir ?? 1 })),
  };
}

export const ROUTINE_TEMPLATES: { id: string; name: string; build: () => RoutineSession[] }[] = [
  {
    id: "full-body",
    name: "Full body A/B (3×)",
    build: () => [
      session("Full body A", 2, [
        ["hack-squat", 3], ["machine-chest", 3], ["single-arm-pulldown", 3], ["seated-leg-curl", 3],
        ["cable-lateral", 3], ["chest-supported-row", 2], ["bayesian-curl", 2], ["overhead-extension", 2], ["standing-calf", 2], ["cable-crunch", 2],
      ]),
      session("Full body B", 1, [
        ["leg-press", 3], ["incline-machine", 3], ["neutral-pulldown", 3], ["rdl", 2],
        ["machine-lateral", 3], ["reverse-pec-deck", 2], ["preacher-curl", 2], ["pushdown", 2], ["seated-calf", 2],
      ]),
    ],
  },
  {
    id: "upper-lower",
    name: "Upper / lower (4×)",
    build: () => [
      session("Upper", 2, [
        ["incline-db", 3], ["chest-supported-row", 3], ["machine-chest", 2], ["neutral-pulldown", 3],
        ["cable-lateral", 3], ["reverse-pec-deck", 2], ["incline-curl", 2], ["overhead-extension", 2],
      ]),
      session("Lower", 2, [
        ["hack-squat", 3], ["rdl", 3], ["leg-extension", 2], ["seated-leg-curl", 3],
        ["hip-abduction", 2], ["standing-calf", 3], ["cable-crunch", 2],
      ]),
    ],
  },
  {
    id: "ppl",
    name: "Push / pull / legs (6×)",
    build: () => [
      session("Push", 2, [["machine-chest", 3], ["incline-db", 2], ["machine-shoulder-press", 2], ["cable-lateral", 3], ["pushdown", 2], ["overhead-extension", 2]]),
      session("Pull", 2, [["neutral-pulldown", 3], ["chest-supported-row", 3], ["kelso-shrug", 2], ["reverse-pec-deck", 2], ["bayesian-curl", 2], ["hammer-curl", 2]]),
      session("Legs", 2, [["hack-squat", 3], ["seated-leg-curl", 3], ["rdl", 2], ["leg-extension", 2], ["standing-calf", 3], ["cable-crunch", 2]]),
    ],
  },
  {
    id: "back-width",
    name: "Back width focus (upper/lower)",
    build: () => [
      session("Upper (width)", 2, [
        ["single-arm-pulldown", 3], ["incline-machine", 3], ["pullover", 2], ["chest-supported-row", 2],
        ["cable-lateral", 3], ["reverse-pec-deck", 2], ["bayesian-curl", 2], ["pushdown", 2],
      ]),
      session("Lower", 2, [["hack-squat", 3], ["seated-leg-curl", 3], ["rdl", 2], ["leg-extension", 2], ["standing-calf", 3], ["cable-crunch", 2]]),
    ],
  },
  {
    id: "bro-split",
    name: "Bro split (5×)",
    build: () => [
      session("Chest", 1, [["bench-press", 4], ["incline-db", 4], ["cable-fly", 4]]),
      session("Back", 1, [["deadlift", 3], ["pull-up", 4], ["barbell-row", 4]]),
      session("Shoulders", 1, [["ohp", 4], ["lateral-raise", 4], ["face-pull", 4]]),
      session("Arms", 1, [["barbell-curl", 4], ["skullcrusher", 4], ["hammer-curl", 3], ["pushdown", 3]]),
      session("Legs", 1, [["squat", 4], ["leg-press", 3], ["lying-leg-curl", 4], ["standing-calf", 4]]),
    ],
  },
  { id: "blank", name: "Blank routine", build: () => [session("Session A", 2, [])] },
];

const TEMPLATE_PRIORITIES: Record<string, Routine["priorities"]> = {
  "back-width": { lats: "focus" },
};

export function routineFromTemplate(templateId: string, name?: string): Routine {
  const t = ROUTINE_TEMPLATES.find((x) => x.id === templateId) ?? ROUTINE_TEMPLATES[0];
  return {
    id: newId(),
    name: name ?? t.name.replace(/ \(.*\)$/, ""),
    sessions: t.build(),
    priorities: TEMPLATE_PRIORITIES[t.id],
    updatedAt: Date.now(),
  };
}

/* ---- Bulk edits ---- */

export function setAllSets(sessions: RoutineSession[], sets: number): RoutineSession[] {
  return sessions.map((s) => ({ ...s, exercises: s.exercises.map((e) => ({ ...e, sets })) }));
}

export function setAllRir(sessions: RoutineSession[], rir: number): RoutineSession[] {
  return sessions.map((s) => ({ ...s, exercises: s.exercises.map((e) => ({ ...e, rir })) }));
}
