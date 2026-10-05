"use client";

import { useMemo, useState } from "react";
import { Card, CardTitle, Field, NumberInput, TextInput, SegmentedControl, Select, Button, InfoNote } from "../ui";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { EXERCISES, EXERCISE_CATEGORIES, MUSCLES, type MuscleId } from "@/lib/exercises";
import {
  ROUTINE_TEMPLATES,
  SESSION_SET_CAP,
  exerciseName,
  layoutLabel,
  newId,
  rateRoutine,
  routineFromTemplate,
  type MuscleStatus,
  type Routine,
  type RoutineExercise,
  type RoutineRating,
  type RoutineSession,
} from "@/lib/routine";
import { DAY_LABELS, WNS_CURVES, type WnsCurve } from "@/lib/wns";

interface Store {
  routines: Routine[];
  activeId: string;
}

const STATUS: Record<MuscleStatus, { label: string; cls: string }> = {
  optimal: { label: "Optimal", cls: "text-accent-600 dark:text-accent-400 font-semibold" },
  growing: { label: "Growing", cls: "text-zinc-800 dark:text-zinc-200" },
  maintaining: { label: "Maintaining", cls: "text-amber-700 dark:text-amber-400" },
  losing: { label: "Losing", cls: "text-amber-700 dark:text-amber-400 font-semibold" },
  untrained: { label: "Not trained", cls: "text-zinc-500" },
};

const TONE = {
  good: "bg-emerald-600",
  warn: "bg-amber-500",
  bad: "bg-red-700",
};

const sessionLetter = (i: number) => String.fromCharCode(65 + (i % 26));

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
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
          <p className="text-xs text-zinc-500">
            Saved automatically in this browser · last edit {new Date(routine.updatedAt).toLocaleString()}
          </p>
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-7 min-w-7 items-center justify-center bg-zinc-900 px-1.5 text-white dark:bg-zinc-100 dark:text-zinc-900">
              {rating.grade}
            </span>
            <span className="tabular-nums">{rating.score}/100</span>
          </span>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr] xl:items-start">
        {/* ---- Builder ---- */}
        <div className="space-y-6">
          {routine.sessions.map((s, i) => (
            <SessionCard
              key={s.id}
              index={i}
              session={s}
              stats={rating.sessionStats[i]}
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
        <div className="space-y-6 xl:sticky xl:top-6">
          <RatingCard rating={rating} routine={routine} curve={curve} setCurve={setCurve} />
        </div>
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

function SessionCard({
  index,
  session,
  stats,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  session: RoutineSession;
  stats: { sets: number; minutes: number };
  canRemove: boolean;
  onChange: (fn: (s: RoutineSession) => RoutineSession) => void;
  onRemove: () => void;
}) {
  const setExercise = (id: string, patch: Partial<RoutineExercise>) =>
    onChange((s) => ({ ...s, exercises: s.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const addExercise = () =>
    onChange((s) => ({
      ...s,
      exercises: [...s.exercises, { id: newId(), exerciseId: "bench-press", sets: 3, rir: 1 }],
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
          <div className="swiss-label mb-2 hidden grid-cols-[1fr_5.5rem_8rem_4.5rem] gap-2 text-zinc-500 sm:grid">
            <span>Exercise</span>
            <span>Sets</span>
            <span>Effort</span>
            <span />
          </div>
          <ol className="space-y-3 sm:space-y-2">
            {session.exercises.map((e, i) => (
              <li
                key={e.id}
                className="grid grid-cols-[1fr_1fr_auto] gap-2 border-b border-[var(--line)] pb-3 sm:grid-cols-[1fr_5.5rem_8rem_4.5rem] sm:border-0 sm:pb-0"
              >
                <div className="col-span-3 space-y-2 sm:col-span-1">
                  <ExercisePicker value={e.exerciseId} onChange={(exerciseId) => setExercise(e.id, { exerciseId })} />
                  {e.exerciseId === "custom" && (
                    <div className="grid grid-cols-2 gap-2">
                      <TextInput
                        value={e.name ?? ""}
                        onChange={(name) => setExercise(e.id, { name })}
                        placeholder="Exercise name"
                      />
                      <Select<MuscleId | "">
                        value={e.muscle ?? ""}
                        onChange={(m) => setExercise(e.id, { muscle: m || undefined })}
                        options={[{ value: "", label: "Target muscle…" }, ...MUSCLES.map((m) => ({ value: m.id, label: m.name }))]}
                      />
                    </div>
                  )}
                </div>
                <NumberInput value={e.sets} onChange={(sets) => setExercise(e.id, { sets })} min={0} max={20} suffix="sets" />
                <Select
                  value={String(e.rir)}
                  onChange={(v) => setExercise(e.id, { rir: Number(v) })}
                  options={[0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: n === 0 ? "Failure" : `${n} RIR` }))}
                />
                <div className="flex items-center justify-end gap-1">
                  <IconBtn label="Move up" onClick={() => move(e.id, -1)} disabled={i === 0}>
                    ↑
                  </IconBtn>
                  <IconBtn label="Remove exercise" onClick={() => onChange((s) => ({ ...s, exercises: s.exercises.filter((x) => x.id !== e.id) }))}>
                    ×
                  </IconBtn>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={addExercise}>
          + Add exercise
        </Button>
        <span className="text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
          {stats.sets} sets · ~{stats.minutes} min
        </span>
      </div>
    </Card>
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
}: {
  rating: RoutineRating;
  routine: Routine;
  curve: WnsCurve;
  setCurve: (c: WnsCurve) => void;
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
        <div className="swiss-label mb-2 text-zinc-500">Per muscle</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line-strong)] text-left text-xs text-zinc-600 dark:text-zinc-400">
              <th className="py-1.5 font-medium">Muscle</th>
              <th className="py-1.5 text-right font-medium">Sets/wk</th>
              <th className="py-1.5 pl-3 text-right font-medium">Freq</th>
              <th className="w-[38%] py-1.5 pl-3 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {rating.muscles.map((m) => (
              <tr key={m.muscle} className="border-b border-[var(--line)]">
                <td className="py-2">
                  <div className="font-medium">{m.name}</div>
                  <div className={"text-xs " + STATUS[m.status].cls}>
                    {STATUS[m.status].label}
                    {m.maxSessionSets > SESSION_SET_CAP + 0.01 ? " · too much in one session" : ""}
                  </div>
                </td>
                <td className="py-2 text-right tabular-nums">{fmtSets(m.weeklySets)}</td>
                <td className="py-2 pl-3 text-right tabular-nums">{m.frequency}×</td>
                <td className="py-2 pl-3">
                  <div className="flex items-center gap-2">
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
            ))}
          </tbody>
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
          Sessions are spread evenly over the week (A, B, A, B…). Each muscle&apos;s week is then
          scored with Chris Beardsley&apos;s Weekly Net Stimulus model: the growth stimulus from
          every workout, minus the atrophy in the time between workouts.
        </p>
        <p>
          Sets are counted fractionally: 1 set for the main muscle and 0.5 for helpers (a bench
          press set is 1 chest, 0.5 front delts, 0.5 triceps). Sets short of failure count for
          less: each rep in reserve removes one of the ~5 stimulating reps.
        </p>
        <p>
          Muscle score: 0 = a whole week of atrophy, 30 = maintenance, 100 = the stimulus of 4 hard
          sets to failure 3× a week. The routine score weights major muscles fully and smaller
          ones (front/rear delts, arms, calves, abs) half.
        </p>
      </InfoNote>
    </Card>
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
