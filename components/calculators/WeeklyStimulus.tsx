"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  Select,
  SegmentedControl,
  Result,
  Stat,
  Badge,
  Button,
  InfoNote,
  CalcGrid,
  Tip,
  EmptyHint,
} from "../ui";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { useProfile } from "@/lib/profile";
import {
  weeklyStimulus,
  frequencyOptions,
  personalLandmarks,
  volumeVerdict,
  stimulatingReps,
  MUSCLE_LANDMARKS,
  DAY_LABELS,
  MAX_USEFUL_WEEKLY_STIMULUS,
  type SessionSpec,
  type LengthBias,
  type Pattern,
  type Stability,
} from "@/lib/hypertrophy";
import { fmt } from "@/lib/units";

/**
 * Weekly net stimulus — the Beardsley model made concrete for one muscle.
 * You describe how you train it across the week; the tool prices every set in
 * stimulus units, charges you for within-session fatigue and for training
 * before you've recovered, and totals the week.
 */

interface Session {
  id: string;
  day: number;
  sets: number;
  reps: number;
  rir: number;
}

interface Saved {
  muscle: string;
  pattern: Pattern;
  stability: Stability;
  lengthBias: LengthBias;
  restSec: number;
  sessions: Session[];
}

const DEFAULT_WEEK: Saved = {
  muscle: "chest",
  pattern: "compound",
  stability: "free",
  lengthBias: "mid",
  restSec: 120,
  sessions: [
    { id: "a", day: 0, sets: 5, reps: 10, rir: 1 },
    { id: "b", day: 3, sets: 4, reps: 12, rir: 1 },
  ],
};

const bandTone = (key: string) =>
  key === "detraining" || key === "maximal" ? "warn" : "accent";

const barColor = (pct: number) =>
  pct >= 80 ? "#10b981" : pct >= 60 ? "#34d399" : pct >= 40 ? "#f59e0b" : "#ef4444";

export default function WeeklyStimulus() {
  const { profile } = useProfile();
  const [saved, setSaved] = useLocalStorage<Saved>("vital.stimulus", DEFAULT_WEEK);
  const week = { ...DEFAULT_WEEK, ...saved };
  const patch = (p: Partial<Saved>) => setSaved({ ...week, ...p });

  const setSession = (id: string, p: Partial<Session>) =>
    patch({ sessions: week.sessions.map((s) => (s.id === id ? { ...s, ...p } : s)) });
  const addSession = () =>
    patch({
      sessions: [
        ...week.sessions,
        {
          id: String(Date.now()),
          // Drop the new session on the day furthest from the existing ones.
          day: nextFreeDay(week.sessions.map((s) => s.day)),
          sets: 4,
          reps: 10,
          rir: 1,
        },
      ],
    });
  const removeSession = (id: string) =>
    patch({ sessions: week.sessions.filter((s) => s.id !== id) });

  // The shared "how you train this muscle" character of every set.
  const character = {
    pattern: week.pattern,
    stability: week.stability,
    lengthBias: week.lengthBias,
    restSec: week.restSec,
  };

  const specs: SessionSpec[] = week.sessions.map((s) => ({
    ...character,
    sets: s.sets,
    reps: s.reps,
    rir: s.rir,
    day: s.day,
  }));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const result = useMemo(() => weeklyStimulus(specs), [JSON.stringify(specs)]);

  const freq = useMemo(
    () =>
      frequencyOptions(
        result.hardSets,
        { ...character, reps: avg(week.sessions, "reps"), rir: avg(week.sessions, "rir") },
        5
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result.hardSets, JSON.stringify(character), JSON.stringify(week.sessions)]
  );

  // Landmarks use your saved experience & age; energy and recovery are assumed
  // neutral here (the Volume landmarks tool lets you set those).
  const landmarks = personalLandmarks(week.muscle, {
    experience: profile.experience,
    age: profile.age,
    energy: "maintenance",
    recovery: "average",
  });
  const verdict = volumeVerdict(result.hardSets, landmarks);

  // Every set of the week, in order, for the contribution chart.
  const setBars = result.sessions.flatMap((s) =>
    s.perSet.map((p) => ({
      name: `${s.dayLabel} #${p.index}`,
      stimulus: Math.round(p.stimulus * 100) / 100,
      pctOfFirst: p.pctOfFirst,
    }))
  );

  return (
    <div className="space-y-5">
      <CalcGrid>
        <Card>
          <CardTitle>How you train this muscle</CardTitle>
          <div className="space-y-4">
            <Field label="Muscle" hint="sets are checked against its landmarks">
              <Select
                value={week.muscle}
                onChange={(v) => patch({ muscle: v })}
                options={MUSCLE_LANDMARKS.map((m) => ({ value: m.key, label: m.label }))}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Exercise type">
                <SegmentedControl
                  value={week.pattern}
                  onChange={(v) => patch({ pattern: v })}
                  options={[
                    { value: "compound", label: "Compound" },
                    { value: "isolation", label: "Isolation" },
                  ]}
                />
              </Field>
              <Field label="Support">
                <SegmentedControl
                  value={week.stability}
                  onChange={(v) => patch({ stability: v })}
                  options={[
                    { value: "free", label: "Free" },
                    { value: "supported", label: "Machine" },
                  ]}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Peak tension" hint="where in the range">
                <Select
                  value={week.lengthBias}
                  onChange={(v) => patch({ lengthBias: v })}
                  options={[
                    { value: "lengthened", label: "Stretched (long muscle length)" },
                    { value: "mid", label: "Mid-range" },
                    { value: "shortened", label: "Squeezed (short length)" },
                  ]}
                />
              </Field>
              <Field label="Rest between sets">
                <Select
                  value={String(week.restSec)}
                  onChange={(v) => patch({ restSec: Number(v) })}
                  options={[
                    { value: "60", label: "60 s" },
                    { value: "90", label: "90 s" },
                    { value: "120", label: "2 min" },
                    { value: "180", label: "3 min" },
                    { value: "240", label: "4 min+" },
                  ]}
                />
              </Field>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Sessions this week
                </span>
                <Button variant="ghost" onClick={addSession}>
                  + Add session
                </Button>
              </div>

              {week.sessions.length === 0 && (
                <EmptyHint actionLabel="Add a session" onAction={addSession}>
                  Add the sessions where this muscle actually gets worked — direct
                  sets only.
                </EmptyHint>
              )}

              <div className="space-y-2">
                {week.sessions.length > 0 && (
                  <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-2 px-1 text-[11px] uppercase tracking-wide text-zinc-400">
                    <span>Day</span>
                    <span>Sets</span>
                    <span>Reps</span>
                    <span>RIR</span>
                    <span />
                  </div>
                )}
                {week.sessions.map((s) => (
                  <div
                    key={s.id}
                    className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] items-center gap-2"
                  >
                    <Select
                      value={String(s.day)}
                      onChange={(v) => setSession(s.id, { day: Number(v) })}
                      options={DAY_LABELS.map((d, i) => ({ value: String(i), label: d }))}
                    />
                    <NumberInput
                      value={s.sets}
                      onChange={(v) => setSession(s.id, { sets: v })}
                      min={0}
                      max={20}
                    />
                    <NumberInput
                      value={s.reps}
                      onChange={(v) => setSession(s.id, { reps: v })}
                      min={1}
                      max={50}
                    />
                    <NumberInput
                      value={s.rir}
                      onChange={(v) => setSession(s.id, { rir: v })}
                      min={0}
                      max={10}
                    />
                    <button
                      type="button"
                      onClick={() => removeSession(s.id)}
                      aria-label="Remove session"
                      className="rounded-lg px-2 py-1 text-xs text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <Tip>
              Only <strong>{stimulatingReps(10, 0)}</strong> reps of a set to
              failure are stimulating, and you lose one for every rep you leave in
              reserve — a set at 3 RIR banks just{" "}
              <strong>{stimulatingReps(10, 3)}</strong>. Effort buys stimulus far
              more cheaply than extra sets do.
            </Tip>
          </div>

          <InfoNote>
            <p>
              <strong>Stimulating reps.</strong> Growth needs high tension on
              individual fibres, which needs full motor-unit recruitment and slow
              rep speed. With moderate loads that only happens in the last ~5 reps
              before failure, so a set contributes <code>5 − RIR</code> stimulating
              reps. With heavy loads (a rep-max of 5 or fewer) recruitment is full
              from rep one, so every rep counts.
            </p>
            <p>
              <strong>Within a session.</strong> Each set for the same muscle
              starts more fatigued than the last, so its stimulus is discounted —
              by 10% per set on long rest, 22% on short rest. That is why sets 6–10
              of a session are worth a fraction of sets 1–3.
            </p>
            <p>
              <strong>Across the week.</strong> Fatigue clears between sessions but
              stimulus does not, so the same sets spread over more days are worth
              more. Sessions stacked before the muscle has recovered (~1–4 days
              depending on how hard the last one was) are discounted by up to 40%.
            </p>
            <p>
              Modifiers: long-muscle-length work ×1.15 stimulus; short-length work
              ×0.85. Fatigue scales with proximity to failure, compound vs
              isolation, free weights vs machines and very heavy or very long sets.
            </p>
            <p>
              This is a quantified reading of Chris Beardsley&apos;s
              stimulating-reps / stimulus-to-fatigue framework, not numbers he
              published. Use it to compare plans, not as a biological measurement.
            </p>
          </InfoNote>
        </Card>

        <Card>
          <CardTitle>Your weekly net stimulus</CardTitle>

          <Result
            label={`Weekly net stimulus — ${landmarks.label}`}
            value={fmt(result.stimulus, 1)}
            unit="units"
            sub={result.band.blurb}
          />

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <Badge tone={bandTone(result.band.key)}>{result.band.label}</Badge>
              <span className="tabular-nums text-zinc-500">
                {fmt(result.pctOfCeiling, 0)}% of the useful ceiling
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-accent-500 transition-all"
                style={{ width: `${result.pctOfCeiling}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              100% ≈ {MAX_USEFUL_WEEKLY_STIMULUS} units — roughly 20 hard sets,
              close to failure, spread over 3–4 sessions.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Hard sets" value={result.hardSets} unit="/wk" />
            <Stat label="Sessions" value={result.frequency} unit="/wk" />
            <Stat label="Stimulating reps" value={result.stimulatingReps} unit="/wk" />
            <Stat label="Stimulus ÷ fatigue" value={fmt(result.sfr, 2)} />
          </div>

          <div className="mt-4 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">
                {result.hardSets} sets/week vs {landmarks.label} landmarks
              </span>
              <Badge tone={verdict.key === "over" || verdict.key === "under" ? "warn" : "accent"}>
                {verdict.label}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-zinc-500">{verdict.advice}</p>
            <p className="mt-1 text-xs text-zinc-400">
              MV {landmarks.mv} · MEV {landmarks.mev} · MAV {landmarks.mavLo}–
              {landmarks.mavHi} · MRV {landmarks.mrv} sets/week
              {landmarks.adjustments.length > 0 && " (adjusted for your profile)"}
            </p>
          </div>

          {result.insights.length > 0 && (
            <div className="mt-4 space-y-1.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              {result.insights.map((n, i) => (
                <p key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                  <span className="text-accent-500">•</span>
                  {n}
                </p>
              ))}
            </div>
          )}
        </Card>
      </CalcGrid>

      {setBars.length > 0 && (
        <CalcGrid>
          <Card>
            <CardTitle>What each set is actually worth</CardTitle>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={setBars} margin={{ top: 5, right: 10, bottom: 5, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f4633" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#a1a1aa" }}
                    interval={setBars.length > 18 ? 1 : 0}
                    angle={-35}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} width={40} />
                  <Tooltip
                    cursor={{ fill: "#71717a22" }}
                    formatter={(v, _n, p) => [
                      `${v} units (${Math.round((p.payload as { pctOfFirst: number }).pctOfFirst)}% of set 1)`,
                      "Stimulus",
                    ]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "none",
                      background: "#18181b",
                      color: "#fff",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="stimulus" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {setBars.map((b, i) => (
                      <Cell key={i} fill={barColor(b.pctOfFirst)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Every set of your week, in order. The bars fall because each set is
              performed in a more fatigued state than the one before — amber and
              red sets are the ones to move to another day rather than grind out.
            </p>
          </Card>

          <Card>
            <CardTitle>Same sets, different frequency</CardTitle>
            <p className="mb-3 text-sm text-zinc-500">
              Your {result.hardSets} weekly sets, split over a different number of
              sessions. Nothing else changes — this is stimulus you get for free by
              rescheduling.
            </p>
            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
                  <tr>
                    <th className="px-3 py-2 font-medium">Sessions</th>
                    <th className="px-3 py-2 font-medium">Sets each</th>
                    <th className="px-3 py-2 font-medium">Weekly stimulus</th>
                    <th className="px-3 py-2 font-medium">vs now</th>
                  </tr>
                </thead>
                <tbody>
                  {freq.map((o) => {
                    const isCurrent = o.frequency === result.frequency;
                    const delta = result.stimulus > 0 ? (o.stimulus / result.stimulus - 1) * 100 : 0;
                    return (
                      <tr
                        key={o.frequency}
                        className={
                          "border-t border-zinc-100 dark:border-zinc-800 " +
                          (isCurrent ? "bg-accent-50 dark:bg-accent-900/20" : "")
                        }
                      >
                        <td className="px-3 py-2 font-medium">
                          {o.frequency}×{isCurrent && <span className="ml-1 text-xs text-accent-600 dark:text-accent-400">you</span>}
                        </td>
                        <td className="px-3 py-2 text-zinc-500">{fmt(o.setsPerSession, 1)}</td>
                        <td className="px-3 py-2 tabular-nums">{fmt(o.stimulus, 1)}</td>
                        <td
                          className={
                            "px-3 py-2 tabular-nums " +
                            (delta > 1 ? "text-accent-600 dark:text-accent-400" : delta < -1 ? "text-red-500" : "text-zinc-400")
                          }
                        >
                          {isCurrent ? "—" : `${delta > 0 ? "+" : ""}${fmt(delta, 0)}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Returns flatten past 3–4 sessions, and eventually reverse: sessions
              packed too close together land on a muscle that has not recovered.
              Recommended for {landmarks.label.toLowerCase()}: {landmarks.freqLo}–
              {landmarks.freqHi}× a week.
            </p>
          </Card>
        </CalcGrid>
      )}
    </div>
  );
}

/** Average of a numeric session field, weighted by sets (1 if none entered). */
function avg(sessions: Session[], key: "reps" | "rir"): number {
  const totalSets = sessions.reduce((a, b) => a + b.sets, 0);
  if (totalSets === 0) return key === "reps" ? 10 : 1;
  return Math.round(sessions.reduce((a, b) => a + b[key] * b.sets, 0) / totalSets);
}

/** The day of the week furthest from every session already scheduled. */
function nextFreeDay(days: number[]): number {
  if (days.length === 0) return 0;
  let best = 0;
  let bestGap = -1;
  for (let d = 0; d < 7; d++) {
    const gap = Math.min(...days.map((x) => Math.min(Math.abs(d - x), 7 - Math.abs(d - x))));
    if (gap > bestGap) {
      bestGap = gap;
      best = d;
    }
  }
  return best;
}
