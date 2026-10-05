/**
 * lib/routine.ts
 * --------------
 * Routine → sessions (each done 1–3× a week) → exercises (sets, RIR).
 *
 * Rating: sessions are laid out evenly across the week, then each muscle's
 * week is scored with Beardsley's Weekly Net Stimulus model (lib/wns.ts),
 * using fractional set credit from lib/exercises.ts. A muscle scores 30 at
 * maintenance and 100 when its WNS reaches a well-designed benchmark (4 hard
 * sets to failure, 3× a week).
 */

import { EXERCISE_BY_ID, MUSCLES, MUSCLE_BY_ID, suggestExercise, type MuscleId } from "./exercises";
import {
  DAY_LABELS,
  DEFAULT_WNS_OPTIONS,
  setEffectiveness,
  weeklyNetStimulus,
  weeklyNetStimulusSimple,
  wnsVerdict,
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

export interface Routine {
  id: string;
  name: string;
  sessions: RoutineSession[];
  updatedAt: number;
}

/** Above this many hard sets per muscle in one session, extra sets add little. */
export const SESSION_SET_CAP = 6;
/** Rough minutes per working set including rest, for session-length estimates. */
export const MINUTES_PER_SET = 2.5;

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function exerciseName(e: RoutineExercise): string {
  if (e.exerciseId === "custom") return e.name?.trim() || "Custom exercise";
  return EXERCISE_BY_ID[e.exerciseId]?.name ?? "Unknown exercise";
}

/** Fractional set credit per muscle for one set of this exercise. */
export function exerciseMuscles(e: RoutineExercise): Partial<Record<MuscleId, number>> {
  if (e.exerciseId === "custom") return e.muscle ? { [e.muscle]: 1 } : {};
  return EXERCISE_BY_ID[e.exerciseId]?.muscles ?? {};
}

/**
 * Spread the sessions evenly over the week, alternating them (A B A B …).
 * Returns the session index for each workout and the weekday it lands on.
 */
export function weeklyLayout(sessions: RoutineSession[]): { day: number; session: number }[] {
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
  const total = order.length;
  return order.map((session, i) => ({ session, day: Math.floor((i * 7) / Math.max(total, 1)) }));
}

export type MuscleStatus = "untrained" | "losing" | "maintaining" | "growing" | "optimal";

export interface MuscleRating {
  muscle: MuscleId;
  name: string;
  major: boolean;
  /** Fractional hard sets per week (before proximity-to-failure adjustment). */
  weeklySets: number;
  /** Workouts per week that give this muscle at least one set. */
  frequency: number;
  wns: number;
  /** 0–100. */
  score: number;
  status: MuscleStatus;
  /** Most effective sets the muscle gets in a single session. */
  maxSessionSets: number;
}

export interface RoutineFeedback {
  tone: "good" | "warn" | "bad";
  text: string;
}

export interface RoutineRating {
  /** 0–100. */
  score: number;
  grade: string;
  muscles: MuscleRating[];
  layout: { day: number; session: number }[];
  workoutsPerWeek: number;
  weeklySets: number;
  sessionStats: { sets: number; minutes: number }[];
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

/** The WNS that counts as 100 for one muscle: 4 hard sets, 3× a week. */
export function benchmarkWns(opts: WnsOptions): number {
  return weeklyNetStimulusSimple(3, 4, { ...opts, rir: 0 }).wns;
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
  const opts = { ...DEFAULT_WNS_OPTIONS, ...options, rir: 0 };
  const layout = weeklyLayout(routine.sessions);
  const benchmark = benchmarkWns(opts);
  const untrained = weeklyNetStimulus([0, 0, 0, 0, 0, 0, 0], opts).wns;

  // Effective and raw sets per muscle for each session.
  const perSession = routine.sessions.map((s) => {
    const eff: Partial<Record<MuscleId, number>> = {};
    const raw: Partial<Record<MuscleId, number>> = {};
    for (const e of s.exercises) {
      const sets = Math.max(0, e.sets || 0);
      const k = setEffectiveness(e.rir ?? 0);
      for (const [m, credit] of Object.entries(exerciseMuscles(e)) as [MuscleId, number][]) {
        eff[m] = (eff[m] ?? 0) + sets * credit * k;
        raw[m] = (raw[m] ?? 0) + sets * credit;
      }
    }
    return { eff, raw };
  });

  const muscles: MuscleRating[] = MUSCLES.map((m) => {
    const schedule = new Array<number>(7).fill(0);
    let weeklySets = 0;
    let frequency = 0;
    for (const { day, session } of layout) {
      const eff = perSession[session].eff[m.id] ?? 0;
      schedule[day] += eff;
      weeklySets += perSession[session].raw[m.id] ?? 0;
      if (eff >= 1) frequency++;
    }
    const wns = weeklyNetStimulus(schedule, opts).wns;
    const maxSessionSets = Math.max(0, ...perSession.map((p) => p.eff[m.id] ?? 0));
    const ratio = benchmark > 0 ? wns / benchmark : 0;
    const score = muscleScore(wns, benchmark, untrained);
    const v = wnsVerdict(wns);
    const status: MuscleStatus =
      weeklySets === 0 ? "untrained" : v === "loss" ? "losing" : v === "maintenance" ? "maintaining" : ratio >= 0.9 ? "optimal" : "growing";
    return { muscle: m.id, name: m.name, major: m.major, weeklySets, frequency, wns, score, status, maxSessionSets };
  });

  const weight = (r: MuscleRating) => (r.major ? 1 : 0.5);
  const totalWeight = muscles.reduce((a, r) => a + weight(r), 0);
  const score = Math.round(muscles.reduce((a, r) => a + weight(r) * r.score, 0) / totalWeight);

  const sessionStats = routine.sessions.map((s) => {
    const sets = s.exercises.reduce((a, e) => a + Math.max(0, e.sets || 0), 0);
    return { sets, minutes: Math.round(sets * MINUTES_PER_SET) };
  });

  return {
    score,
    grade: gradeFor(score),
    muscles,
    layout,
    workoutsPerWeek: layout.length,
    weeklySets: routine.sessions.reduce((a, s, i) => a + sessionStats[i].sets * s.perWeek, 0),
    sessionStats,
    feedback: buildFeedback(routine, muscles, perSession, sessionStats),
  };
}

const r1 = (n: number) => (Math.round(n * 10) / 10).toString();

function buildFeedback(
  routine: Routine,
  muscles: MuscleRating[],
  perSession: { eff: Partial<Record<MuscleId, number>> }[],
  sessionStats: { sets: number; minutes: number }[]
): RoutineFeedback[] {
  const out: RoutineFeedback[] = [];
  if (routine.sessions.every((s) => s.exercises.length === 0)) {
    return [{ tone: "warn", text: "Add exercises to your sessions to get a rating." }];
  }

  // Muscles that aren't growing, worst first, majors before minors.
  const weak = muscles
    .filter((m) => m.status !== "growing" && m.status !== "optimal")
    .sort((a, b) => Number(b.major) - Number(a.major) || a.wns - b.wns);
  for (const m of weak) {
    const ex = suggestExercise(m.muscle);
    if (m.status === "untrained") {
      out.push({
        tone: m.major ? "bad" : "warn",
        text: `${m.name}: not trained. Add 2–3 sets of ${ex?.name.toLowerCase() ?? "a direct exercise"} to at least two sessions.`,
      });
    } else if (m.frequency <= 1) {
      out.push({
        tone: m.major ? "bad" : "warn",
        text: `${m.name}: ${m.status === "losing" ? "losing muscle" : "only maintaining"} on ${r1(m.weeklySets)} sets once a week. Split the work over two or more sessions.`,
      });
    } else {
      out.push({
        tone: "warn",
        text: `${m.name}: ${m.status === "losing" ? "losing muscle" : "only maintaining"}. Add 1–2 hard sets per session, for example ${ex?.name.toLowerCase() ?? "a direct exercise"}.`,
      });
    }
  }

  // Too much for one muscle in one session.
  routine.sessions.forEach((s, i) => {
    for (const [m, sets] of Object.entries(perSession[i].eff) as [MuscleId, number][]) {
      if (sets > SESSION_SET_CAP + 0.01) {
        const extra = Math.ceil(sets - SESSION_SET_CAP);
        out.push({
          tone: "warn",
          text: `In ${s.name}, ${MUSCLE_BY_ID[m].name.toLowerCase()} gets ${r1(sets)} hard sets. Beyond ~${SESSION_SET_CAP} per session adds little, so move ${extra} to another session.`,
        });
      }
    }
  });

  // Very long sessions.
  routine.sessions.forEach((s, i) => {
    if (sessionStats[i].sets > 28) {
      out.push({
        tone: "warn",
        text: `${s.name}: ${sessionStats[i].sets} sets (~${sessionStats[i].minutes} min). Fatigue builds late in long sessions, so consider another training day.`,
      });
    }
  });

  // Sets far from failure.
  const easy = routine.sessions.flatMap((s) => s.exercises.filter((e) => (e.rir ?? 0) >= 4).map(() => s.name));
  if (easy.length > 0) {
    out.push({
      tone: "warn",
      text: `${easy.length} exercise${easy.length > 1 ? "s are" : " is"} at 4+ reps in reserve. Those sets give few stimulating reps, so take them within 0–3 reps of failure.`,
    });
  }

  const optimal = muscles.filter((m) => m.status === "optimal").length;
  if (out.length === 0) {
    out.push({ tone: "good", text: "Every muscle is in a net-growth week with sensible per-session volume. Nice routine." });
  } else if (optimal > 0) {
    out.push({ tone: "good", text: `${optimal} of ${muscles.length} muscles are at or near the optimal weekly stimulus.` });
  }
  return out;
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
      session("Full body A", 2, [["squat", 3], ["bench-press", 3], ["lat-pulldown", 3], ["rdl", 2], ["lateral-raise", 3], ["face-pull", 2], ["db-curl", 2], ["standing-calf", 2], ["cable-crunch", 2]]),
      session("Full body B", 1, [["leg-press", 3], ["incline-db", 3], ["cable-row", 3], ["lying-leg-curl", 3], ["cable-lateral", 3], ["pushdown", 2], ["cable-crunch", 2]]),
    ],
  },
  {
    id: "upper-lower",
    name: "Upper / lower (4×)",
    build: () => [
      session("Upper", 2, [["bench-press", 3], ["chest-supported-row", 3], ["db-shoulder-press", 2], ["lat-pulldown", 3], ["lateral-raise", 3], ["incline-curl", 2], ["overhead-extension", 2]]),
      session("Lower", 2, [["squat", 3], ["rdl", 3], ["leg-extension", 2], ["seated-leg-curl", 3], ["hip-thrust", 2], ["standing-calf", 3], ["hanging-leg-raise", 2]]),
    ],
  },
  {
    id: "ppl",
    name: "Push / pull / legs (6×)",
    build: () => [
      session("Push", 2, [["bench-press", 3], ["ohp", 2], ["cable-fly", 2], ["lateral-raise", 3], ["pushdown", 3]]),
      session("Pull", 2, [["pull-up", 3], ["cable-row", 3], ["face-pull", 2], ["db-curl", 3]]),
      session("Legs", 2, [["squat", 3], ["rdl", 3], ["leg-extension", 2], ["lying-leg-curl", 2], ["standing-calf", 3], ["cable-crunch", 2]]),
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

export function routineFromTemplate(templateId: string, name?: string): Routine {
  const t = ROUTINE_TEMPLATES.find((x) => x.id === templateId) ?? ROUTINE_TEMPLATES[0];
  return { id: newId(), name: name ?? t.name.replace(/ \(.*\)$/, ""), sessions: t.build(), updatedAt: Date.now() };
}
