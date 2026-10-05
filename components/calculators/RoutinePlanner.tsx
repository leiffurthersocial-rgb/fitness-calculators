"use client";

import { useMemo, useState } from "react";
import { Card, CardTitle, Field, NumberInput, TextInput, SegmentedControl, Select, Button, InfoNote } from "../ui";
import { useLocalStorage } from "@/lib/useLocalStorage";
import {
  EXERCISES,
  EXERCISE_CATEGORIES,
  MUSCLES,
  MUSCLE_BY_ID,
  MUSCLE_REGIONS,
  type MuscleId,
} from "@/lib/exercises";
import {
  ROUTINE_TEMPLATES,
  SESSION_SET_CAP,
  exerciseName,
  exerciseProfile,
  layoutLabel,
  newId,
  rateRoutine,
  routineFromTemplate,
  setAllRir,
  setAllSets,
  type MuscleRating,
  type MuscleStatus,
  type Priority,
  type Routine,
  type RoutineExercise,
  type RoutineRating,
  type RoutineSession,
  type SessionAnalysis,
} from "@/lib/routine";
import { DAY_LABELS, WNS_CURVES, type WnsCurve } from "@/lib/wns";

interface Store {
  routines: Routine[];
  activeId: string;
}

const STATUS: Record<MuscleStatus, { label: string; cls: string }> = {
  optimal: { label: "Optimal", cls: "text-accent-600 dark:text-accent-400 font-semibold" },
  growing: { label: "Growing", cls: "text-zinc-700 dark:text-zinc-300" },
  maintaining: { label: "Maintaining", cls: "text-amber-700 dark:text-amber-400" },
  losing: { label: "Losing", cls: "text-amber-700 dark:text-amber-400 font-semibold" },
  untrained: { label: "Not trained", cls: "text-zinc-500" },
};

const TONE = {
  good: "bg-emerald-600",
  warn: "bg-amber-500",
  bad: "bg-red-700",
};

const RIR_OPTIONS = [0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: n === 0 ? "Failure" : `${n} RIR` }));
const NEXT_PRIORITY: Record<Priority, Priority> = { normal: "focus", focus: "skip", skip: "normal" };

const sessionLetter = (i: number) => String.fromCharCode(65 + (i % 26));
const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function RoutinePlanner() {
  const initial = useMemo<Store>(() => {
    const r = routineFromTemplate("full-body", "My routine");
    return { routines: [r], activeId: r.id };
  }, []);
  const [store, setStore, hydrated] = useLocalStorage<Store>("vital.routines", initial);
  const [curve, setCurve] = useLocalStorage<WnsCurve>("vital.routines.curve", "schoenfeld");
  const [copied, setCopied] = useState(false);

  const routine = store.routines.find((r) => r.id === store.activeId) ?? store.routines[0];
  const rating = useMemo(() => (routine ? rateRoutine(routine, { curve }) : null), [routine, curve]);

  const update = (fn: (r: Routine) => Routine) =>
    setStore((s) => ({
      ...s,
      routines: s.routines.map((r) => (r.id === routine.id ? { ...fn(r), updatedAt: Date.now() } : r)),
    }));
  const updateSession = (id: string, fn: (s: RoutineSession) => RoutineSession) =>
    update((r) => ({ ...r, sessions: r.sessions.map((s) => (s.id === id ? fn(s) : s)) }));
  const cyclePriority = (m: MuscleId) =>
    update((r) => ({
      ...r,
      priorities: { ...r.priorities, [m]: NEXT_PRIORITY[r.priorities?.[m] ?? "normal"] },
    }));

  const addRoutine = (templateId: string) => {
    const r = routineFromTemplate(templateId);
    setStore((s) => ({ routines: [...s.routines, r], activeId: r.id }));
  };
  const duplicate = () => {
    const copy: Routine = {
      ...structuredClone(routine),
      id: newId(),
      name: `${routine.name} (copy)`,
      updatedAt: Date.now(),
    };
    setStore((s) => ({ routines: [...s.routines, copy], activeId: copy.id }));
  };
  const remove = () => {
    if (!window.confirm(`Delete “${routine.name}”? This can’t be undone.`)) return;
    setStore((s) => {
      const rest = s.routines.filter((r) => r.id !== routine.id);
      if (rest.length === 0) {
        const fresh = routineFromTemplate("blank", "My routine");
        return { routines: [fresh], activeId: fresh.id };
      }
      return { routines: rest, activeId: rest[0].id };
    });
  };
  const addSession = () =>
    update((r) => ({
      ...r,
      sessions: [
        ...r.sessions,
        { id: newId(), name: `Session ${sessionLetter(r.sessions.length)}`, perWeek: 1, exercises: [] },
      ],
    }));

  const copyText = async () => {
    if (!rating) return;
    try {
      await navigator.clipboard.writeText(routineToText(routine, rating));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  // Wait for saved routines to load so the default never flashes in first.
  if (!hydrated) return <div className="h-96" aria-busy="true" />;
  if (!routine || !rating) return null;

  return (
    <div className="space-y-6">
      {/* ---- Routine bar ---- */}
      <Card>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <Field label="Routine">
            <Select
              value={routine.id}
              onChange={(id) => setStore((s) => ({ ...s, activeId: id }))}
              options={store.routines.map((r) => ({ value: r.id, label: r.name || "Untitled routine" }))}
            />
          </Field>
          <Field label="Name">
            <TextInput value={routine.name} onChange={(name) => update((r) => ({ ...r, name }))} placeholder="Routine name" />
          </Field>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="New routine from template"
              value=""
              onChange={(e) => e.target.value && addRoutine(e.target.value)}
              className="btn h-[42px] rounded-lg px-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100"
            >
              <option value="">+ New…</option>
              {ROUTINE_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Button variant="ghost" onClick={duplicate}>
              Duplicate
            </Button>
            <Button variant="ghost" onClick={copyText}>
              {copied ? "Copied ✓" : "Copy"}
            </Button>
            <Button variant="danger" onClick={remove}>
              Delete
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-[var(--line)] pt-4">
          <span className="swiss-label text-zinc-600 dark:text-zinc-400">All exercises</span>
          <BulkControls
            onSets={(n) => update((r) => ({ ...r, sessions: setAllSets(r.sessions, n) }))}
            onRir={(n) => update((r) => ({ ...r, sessions: setAllRir(r.sessions, n) }))}
          />
          <span className="ml-auto flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-7 min-w-7 items-center justify-center bg-zinc-900 px-1.5 text-white dark:bg-zinc-100 dark:text-zinc-900">
              {rating.grade}
            </span>
            <span className="tabular-nums">{rating.score}/100</span>
          </span>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Saved automatically in this browser · last edit {new Date(routine.updatedAt).toLocaleString()}
        </p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr] xl:items-start">
        {/* ---- Builder ---- */}
        <div className="space-y-6">
          {routine.sessions.map((s, i) => (
            <SessionCard
              key={s.id}
              index={i}
              session={s}
              analysis={rating.sessions[i]}
              canRemove={routine.sessions.length > 1}
              onChange={(fn) => updateSession(s.id, fn)}
              onRemove={() => update((r) => ({ ...r, sessions: r.sessions.filter((x) => x.id !== s.id) }))}
            />
          ))}
          <button
            type="button"
            onClick={addSession}
            className="btn w-full rounded-xl border-dashed py-4 text-sm font-semibold text-zinc-700 dark:text-zinc-200"
          >
            + Add session
          </button>
        </div>

        {/* ---- Rating ---- */}
        <RatingCard rating={rating} routine={routine} curve={curve} setCurve={setCurve} onPriority={cyclePriority} />
      </div>

      <SavedRoutines
        routines={store.routines}
        activeId={routine.id}
        curve={curve}
        onOpen={(id) => setStore((s) => ({ ...s, activeId: id }))}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Two "apply to all" selects: every exercise's sets, every exercise's effort. */
function BulkControls({ onSets, onRir }: { onSets: (n: number) => void; onRir: (n: number) => void }) {
  const cls =
    "field h-9 rounded-lg px-2.5 text-sm font-medium text-zinc-800 outline-none dark:text-zinc-100";
  return (
    <span className="flex flex-wrap gap-2">
      <select aria-label="Set sets for all exercises" value="" onChange={(e) => e.target.value && onSets(Number(e.target.value))} className={cls}>
        <option value="">Sets…</option>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <option key={n} value={n}>
            {n} set{n > 1 ? "s" : ""} each
          </option>
        ))}
      </select>
      <select aria-label="Set effort for all exercises" value="" onChange={(e) => e.target.value !== "" && onRir(Number(e.target.value))} className={cls}>
        <option value="">Effort…</option>
        {RIR_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.value === "0" ? "All to failure" : `All at ${o.label}`}
          </option>
        ))}
      </select>
    </span>
  );
}

function SessionCard({
  index,
  session,
  analysis,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  session: RoutineSession;
  analysis: SessionAnalysis;
  canRemove: boolean;
  onChange: (fn: (s: RoutineSession) => RoutineSession) => void;
  onRemove: () => void;
}) {
  const setExercise = (id: string, patch: Partial<RoutineExercise>) =>
    onChange((s) => ({ ...s, exercises: s.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const addExercise = () =>
    onChange((s) => ({
      ...s,
      exercises: [...s.exercises, { id: newId(), exerciseId: "machine-chest", sets: 3, rir: 1 }],
    }));
  const move = (id: string, dir: -1 | 1) =>
    onChange((s) => {
      const i = s.exercises.findIndex((e) => e.id === id);
      const j = i + dir;
      if (j < 0 || j >= s.exercises.length) return s;
      const ex = [...s.exercises];
      [ex[i], ex[j]] = [ex[j], ex[i]];
      return { ...s, exercises: ex };
    });

  const endFactor = analysis.exerciseFactors.at(-1) ?? 1;

  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-end gap-3 border-b border-[var(--line)] pb-4">
        <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center bg-accent-500 text-lg font-bold text-white">
          {sessionLetter(index)}
        </div>
        <div className="min-w-40 flex-1">
          <Field label="Session">
            <TextInput value={session.name} onChange={(name) => onChange((s) => ({ ...s, name }))} />
          </Field>
        </div>
        <Field label="Performed">
          <SegmentedControl
            value={String(session.perWeek)}
            onChange={(v) => onChange((s) => ({ ...s, perWeek: Number(v) }))}
            options={[
              { value: "1", label: "1×" },
              { value: "2", label: "2×" },
              { value: "3", label: "3×" },
            ]}
          />
        </Field>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${session.name}`}
            className="btn h-[42px] rounded-lg px-3 text-sm font-semibold text-red-600 dark:text-red-400"
          >
            Remove
          </button>
        )}
      </div>

      {session.exercises.length === 0 ? (
        <p className="mb-4 text-sm text-zinc-500">No exercises yet.</p>
      ) : (
        <div className="mb-4">
          <div className="swiss-label mb-2 hidden grid-cols-[1fr_5.5rem_7.5rem_4.75rem] gap-2 text-zinc-500 sm:grid">
            <span>Exercise</span>
            <span>Sets</span>
            <span>Effort</span>
            <span />
          </div>
          <ol className="space-y-3">
            {session.exercises.map((e, i) => (
              <li
                key={e.id}
                className="grid grid-cols-[1fr_1fr_auto] items-start gap-2 border-b border-[var(--line)] pb-3 last:border-0 sm:grid-cols-[1fr_5.5rem_7.5rem_4.75rem]"
              >
                <div className="col-span-3 space-y-1.5 sm:col-span-1">
                  <ExercisePicker value={e.exerciseId} onChange={(exerciseId) => setExercise(e.id, { exerciseId })} />
                  {e.exerciseId === "custom" && (
                    <div className="grid grid-cols-2 gap-2">
                      <TextInput value={e.name ?? ""} onChange={(name) => setExercise(e.id, { name })} placeholder="Exercise name" />
                      <Select<MuscleId | "">
                        value={e.muscle ?? ""}
                        onChange={(m) => setExercise(e.id, { muscle: m || undefined })}
                        options={[{ value: "", label: "Target muscle…" }, ...MUSCLES.map((m) => ({ value: m.id, label: m.name }))]}
                      />
                    </div>
                  )}
                  <ExerciseMeta exercise={e} factor={analysis.exerciseFactors[i] ?? 1} />
                </div>
                <NumberInput value={e.sets} onChange={(sets) => setExercise(e.id, { sets })} min={0} max={20} suffix="sets" />
                <Select value={String(e.rir)} onChange={(v) => setExercise(e.id, { rir: Number(v) })} options={RIR_OPTIONS} />
                <div className="flex items-start justify-end gap-1">
                  <IconBtn label="Move up" onClick={() => move(e.id, -1)} disabled={i === 0}>
                    ↑
                  </IconBtn>
                  <IconBtn
                    label="Remove exercise"
                    onClick={() => onChange((s) => ({ ...s, exercises: s.exercises.filter((x) => x.id !== e.id) }))}
                  >
                    ×
                  </IconBtn>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
        <Button variant="ghost" onClick={addExercise}>
          + Add exercise
        </Button>
        {session.exercises.length > 0 && (
          <BulkControls
            onSets={(n) => onChange((s) => setAllSets([s], n)[0])}
            onRir={(n) => onChange((s) => setAllRir([s], n)[0])}
          />
        )}
        <span className="ml-auto text-right text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
          {analysis.sets} sets · ~{analysis.minutes} min
          <span className="block text-xs">
            Fatigue {Math.round(analysis.fatigue)}
            {endFactor < 1 ? ` · last exercise −${pct(1 - endFactor)}` : ""}
          </span>
        </span>
      </div>
    </Card>
  );
}

/** Small line under an exercise: what it trains, its efficiency, fatigue cost. */
function ExerciseMeta({ exercise, factor }: { exercise: RoutineExercise; factor: number }) {
  const p = exerciseProfile(exercise);
  const muscles = (Object.entries(p.muscles) as [MuscleId, number][]).sort((a, b) => b[1] - a[1]);
  if (muscles.length === 0) return null;
  return (
    <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
      {muscles.map(([m, c], i) => (
        <span key={m}>
          {i > 0 && " · "}
          <span className={c === 1 ? "font-semibold text-zinc-800 dark:text-zinc-200" : ""}>
            {MUSCLE_BY_ID[m].name}
            {c === 1 ? "" : " ½"}
          </span>
        </span>
      ))}
      <span className="text-zinc-500"> — {pct(p.efficiency)} efficient</span>
      {factor < 1 && <span className="text-amber-700 dark:text-amber-400"> · −{pct(1 - factor)} fatigue</span>}
    </p>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="btn h-[42px] w-9 rounded-lg text-base font-semibold text-zinc-700 disabled:opacity-30 dark:text-zinc-200"
    >
      {children}
    </button>
  );
}

function ExercisePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      aria-label="Exercise"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="field w-full rounded-lg px-3 py-2.5 text-[15px] text-zinc-900 outline-none dark:text-zinc-100"
    >
      {EXERCISE_CATEGORIES.map((c) => (
        <optgroup key={c} label={c}>
          {EXERCISES.filter((x) => x.category === c).map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </optgroup>
      ))}
      <optgroup label="Other">
        <option value="custom">Custom exercise…</option>
      </optgroup>
    </select>
  );
}

/* ------------------------------------------------------------------ */

function RatingCard({
  rating,
  routine,
  curve,
  setCurve,
  onPriority,
}: {
  rating: RoutineRating;
  routine: Routine;
  curve: WnsCurve;
  setCurve: (c: WnsCurve) => void;
  onPriority: (m: MuscleId) => void;
}) {
  const days = layoutLabel(rating.layout, routine.sessions);
  return (
    <Card>
      <CardTitle>Rating</CardTitle>

      <div className="flex items-stretch gap-4">
        <div className="flex w-24 shrink-0 flex-col items-center justify-center bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
          <span className="text-5xl font-bold leading-none tracking-tight">{rating.grade}</span>
        </div>
        <div className="flex-1">
          <div className="text-4xl font-bold tabular-nums tracking-tight">
            {rating.score}
            <span className="ml-1 text-lg font-medium text-zinc-500">/ 100</span>
          </div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {rating.workoutsPerWeek} workouts · {rating.weeklySets} sets a week
          </div>
          <div className="mt-2 h-2 w-full bg-zinc-200 dark:bg-zinc-700">
            <div className="h-full bg-accent-500" style={{ width: `${rating.score}%` }} />
          </div>
        </div>
      </div>

      {/* Week layout */}
      <div className="mt-6">
        <div className="swiss-label mb-2 text-zinc-500">Suggested week</div>
        <div className="grid grid-cols-7 gap-1">
          {DAY_LABELS.map((d, i) => (
            <div key={d} className="text-center">
              <div
                className={
                  "flex h-12 items-center justify-center px-0.5 text-[11px] font-semibold leading-tight " +
                  (days[i] ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "well text-zinc-400")
                }
                title={days[i] || "Rest"}
              >
                <span className="line-clamp-2 break-all">{days[i] ? abbreviate(days[i]) : "—"}</span>
              </div>
              <div className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback */}
      <div className="mt-6">
        <div className="swiss-label mb-2 text-zinc-500">What to change</div>
        <ul className="space-y-2.5">
          {rating.feedback.map((f, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
              <span aria-hidden className={"mt-1.5 h-2 w-2 shrink-0 " + TONE[f.tone]} />
              <span>{f.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Muscle table */}
      <div className="mt-6">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="swiss-label text-zinc-500">Per muscle</span>
          <span className="text-xs text-zinc-500">Tap ☆ to mark focus or skip</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line-strong)] text-left text-xs text-zinc-600 dark:text-zinc-400">
              <th className="w-7 py-1.5" />
              <th className="py-1.5 font-medium">Muscle</th>
              <th className="py-1.5 pl-2 text-right font-medium" title="Fractional sets per week (helpers count ½)">
                Sets
              </th>
              <th className="py-1.5 pl-2 text-right font-medium" title="Sessions per week with direct work">
                Direct
              </th>
              <th className="w-[32%] py-1.5 pl-3 font-medium">Score</th>
            </tr>
          </thead>
          {MUSCLE_REGIONS.map((region) => (
            <tbody key={region}>
              <tr>
                <td colSpan={5} className="swiss-label pb-1 pt-4 text-zinc-900 dark:text-zinc-100">
                  {region}
                </td>
              </tr>
              {rating.muscles
                .filter((m) => MUSCLE_BY_ID[m.muscle].region === region)
                .map((m) => (
                  <MuscleRow key={m.muscle} m={m} onPriority={() => onPriority(m.muscle)} />
                ))}
            </tbody>
          ))}
        </table>
      </div>

      <div className="mt-5">
        <Field label="Volume–stimulus dataset">
          <SegmentedControl
            value={curve}
            onChange={setCurve}
            options={WNS_CURVES.map((c) => ({ value: c.value, label: c.label }))}
          />
        </Field>
      </div>

      <InfoNote>
        <p>
          <strong>Model.</strong>{" "}Sessions are spread evenly over the week (A, B, A, B…). Each
          muscle&apos;s week is scored with Chris Beardsley&apos;s Weekly Net Stimulus: the growth
          stimulus from every workout minus the atrophy between workouts.
        </p>
        <p>
          <strong>Effective sets</strong> per workout = sets × set credit × exercise efficiency ×
          proximity to failure × fatigue. Set credit is 1 for the main muscle and ½ for helpers
          (fractional counting, which predicted growth best in Pelland et al.). Efficiency (70–100%)
          reflects how reliably the target muscle is what fails: stable machines and cables with a
          good resistance curve score highest; balance, grip, lower-back or helper-muscle limits
          score lower. Each rep in reserve removes one of ~5 stimulating reps.
        </p>
        <p>
          <strong>Fatigue.</strong>{" "}Within a workout, sets for the same muscle have diminishing
          returns (the Schoenfeld/Pelland curve), and once a session passes ~12 fatigue units
          (heavy compounds cost more) later exercises lose 1.5% per unit, down to 70%. Between
          workouts, training a muscle again before its damage clears (~72 h) cuts that
          workout&apos;s stimulus by up to 40%, more after high volume.
        </p>
        <p>
          <strong>Frequency.</strong> &quot;Direct&quot; counts only sessions where the muscle is a
          main mover. Helper sets still add stimulus, and keep the muscle out of atrophy only if
          they add up to at least one effective set in that session.
        </p>
        <p>
          <strong>Score.</strong> 0 = a whole week of atrophy, 30 = maintenance, 100 = 4 hard,
          efficient sets 3× a week. The routine score weights muscles by size (and doubles focus
          muscles, ignores skipped ones).
        </p>
      </InfoNote>
    </Card>
  );
}

function MuscleRow({ m, onPriority }: { m: MuscleRating; onPriority: () => void }) {
  const skip = m.priority === "skip";
  const icon = m.priority === "focus" ? "★" : skip ? "–" : "☆";
  const label = m.priority === "focus" ? "Focus" : skip ? "Skipped" : "Normal";
  return (
    <tr className={"border-b border-[var(--line)] " + (skip ? "opacity-45" : "")}>
      <td className="py-2 align-top">
        <button
          type="button"
          onClick={onPriority}
          title={`${label} — tap to change`}
          aria-label={`${m.name} priority: ${label}. Tap to change.`}
          className={
            "h-6 w-6 text-base leading-none " +
            (m.priority === "focus" ? "text-accent-600 dark:text-accent-400" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100")
          }
        >
          {icon}
        </button>
      </td>
      <td className="py-2">
        <div className="font-medium" title={MUSCLE_BY_ID[m.muscle].detail}>
          {m.name}
        </div>
        <div className={"text-xs " + STATUS[m.status].cls}>
          {skip ? "Skipped" : STATUS[m.status].label}
          {!skip && m.effectiveSets > 0 && (
            <span className="font-normal text-zinc-500"> · {m.effectiveSets.toFixed(1)} effective</span>
          )}
          {!skip && m.maxSessionSets > SESSION_SET_CAP + 0.01 && <span className="font-normal"> · too much per session</span>}
        </div>
      </td>
      <td className="py-2 pl-2 text-right align-top tabular-nums">{fmtSets(m.weeklySets)}</td>
      <td className="py-2 pl-2 text-right align-top tabular-nums">{m.frequency}×</td>
      <td className="py-2 pl-3 align-top">
        <div className="flex h-5 items-center gap-2">
          <div className="h-2 flex-1 bg-zinc-200 dark:bg-zinc-700">
            <div
              className={m.status === "optimal" ? "h-full bg-accent-500" : "h-full bg-zinc-800 dark:bg-zinc-200"}
              style={{ width: `${m.score}%` }}
            />
          </div>
          <span className="w-7 text-right text-xs tabular-nums">{m.score}</span>
        </div>
      </td>
    </tr>
  );
}

function SavedRoutines({
  routines,
  activeId,
  curve,
  onOpen,
}: {
  routines: Routine[];
  activeId: string;
  curve: WnsCurve;
  onOpen: (id: string) => void;
}) {
  const rows = routines
    .map((r) => ({ r, rating: rateRoutine(r, { curve }) }))
    .sort((a, b) => b.rating.score - a.rating.score);
  return (
    <Card>
      <CardTitle>Your saved routines</CardTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ r, rating }) => {
          const active = r.id === activeId;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onOpen(r.id)}
              aria-pressed={active}
              className="btn flex items-center gap-3 rounded-lg p-3 text-left"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-zinc-900 text-lg font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                {rating.grade}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{r.name || "Untitled routine"}</span>
                <span className="block text-xs text-zinc-600 dark:text-zinc-400">
                  {rating.score}/100 · {r.sessions.length} session{r.sessions.length === 1 ? "" : "s"} ·{" "}
                  {rating.workoutsPerWeek}×/wk
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function fmtSets(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function abbreviate(label: string): string {
  return label
    .split(" + ")
    .map((s) => (s.length > 8 ? s.replace(/^Session\s+/i, "").replace(/^Full body\s+/i, "FB ").slice(0, 8) : s))
    .join("+");
}

function routineToText(r: Routine, rating: RoutineRating): string {
  const lines = [`${r.name} — ${rating.grade} (${rating.score}/100)`, ""];
  r.sessions.forEach((s) => {
    lines.push(`${s.name} (${s.perWeek}×/week)`);
    s.exercises.forEach((e) =>
      lines.push(`  ${exerciseName(e)}: ${e.sets} sets${e.rir ? ` @ ${e.rir} RIR` : " to failure"}`)
    );
    lines.push("");
  });
  const week = layoutLabel(rating.layout, r.sessions)
    .map((d, i) => `${DAY_LABELS[i]}: ${d || "rest"}`)
    .join(" · ");
  lines.push(week);
  return lines.join("\n");
}
