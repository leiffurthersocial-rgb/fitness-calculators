"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  Select,
  SegmentedControl,
  TextInput,
  NumberInput,
  Badge,
  Result,
  Stat,
  InfoNote,
  Tip,
} from "../ui";
import SessionTimer, { type TimerStep } from "../SessionTimer";
import { useLocalStorage } from "@/lib/useLocalStorage";
import {
  buildSession,
  TABLE_KINDS,
  TABLE_LEVELS,
  SAFETY_RULES,
  HOW_TO_MEASURE,
  weeklyPlan,
  type TableKind,
  type TableLevel,
  type PhaseKind,
} from "@/lib/breathwork";
import { fmtTime, parseTimeToSeconds } from "@/lib/units";

const TONE_FOR: Record<PhaseKind, "prep" | "rest" | "hold"> = {
  prepare: "prep",
  breathe: "rest",
  hold: "hold",
  recover: "prep",
};

export default function BreathTables() {
  // Shared with the breath-hold scorer, so you only measure your max once.
  const [maxHold, setMaxHold] = useLocalStorage("vital.breath.maxSec", 60);
  const [maxText, setMaxText] = useState(() => fmtTime(60));
  const [kind, setKind] = useState<TableKind>("co2");
  const [level, setLevel] = useState<TableLevel>("standard");
  const [rounds, setRounds] = useState(8);
  const [skipPrepare, setSkipPrepare] = useState(false);
  const [days, setDays] = useState(4);

  // The max hold is entered as m:ss but stored as seconds.
  const commitMax = (raw: string) => {
    setMaxText(raw);
    const sec = parseTimeToSeconds(raw);
    if (sec > 0) setMaxHold(Math.min(900, sec));
  };

  const session = useMemo(
    () => buildSession({ kind, level, maxHoldSec: maxHold, rounds, skipPrepare }),
    [kind, level, maxHold, rounds, skipPrepare]
  );

  const steps: TimerStep[] = useMemo(
    () =>
      session.phases.map((p, i) => ({
        key: `${p.kind}-${i}`,
        label: p.label,
        seconds: p.seconds,
        cue: p.cue,
        detail:
          p.round != null
            ? `Round ${p.round} of ${session.rounds.length} · ${kind === "co2" ? "CO₂" : "O₂"} table`
            : kind === "co2"
            ? "CO₂ table"
            : "O₂ table",
        tone: TONE_FOR[p.kind],
      })),
    [session, kind]
  );

  const kindDef = TABLE_KINDS.find((k) => k.key === kind)!;

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle>Build your table</CardTitle>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <Field label="Your max breath hold" hint="m:ss — everything scales off this">
              <TextInput value={maxText} onChange={commitMax} placeholder="1:30" />
            </Field>
            <Field label="Table">
              <SegmentedControl
                value={kind}
                onChange={setKind}
                options={TABLE_KINDS.map((k) => ({ value: k.key, label: k.label }))}
              />
            </Field>
            <Field label="Level">
              <Select
                value={level}
                onChange={setLevel}
                options={TABLE_LEVELS.map((l) => ({ value: l.key, label: `${l.label} — ${l.blurb}` }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rounds" hint="8 is standard">
                <NumberInput value={rounds} onChange={setRounds} min={2} max={12} />
              </Field>
              <Field label="Training days / week">
                <NumberInput value={days} onChange={setDays} min={2} max={6} />
              </Field>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
              <input
                type="checkbox"
                checked={skipPrepare}
                onChange={(e) => setSkipPrepare(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-accent-500)]"
              />
              <span className="text-sm font-medium">
                Skip the 2-minute settle (I&apos;m already relaxed)
              </span>
            </label>
          </div>

          <div className="space-y-3">
            <Result
              label={`${kindDef.label} — trains ${kindDef.trains}`}
              value={fmtTime(session.totalSec)}
              sub={kindDef.blurb}
            />
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Rounds" value={session.rounds.length} />
              <Stat label="Longest hold" value={fmtTime(session.peakHoldSec)} />
              <Stat label="Time holding" value={fmtTime(session.holdTimeSec)} />
            </div>
            <Tip>
              {kind === "co2"
                ? "The holds stay the same — it's the shrinking rests that make each round harder. It should feel deeply uncomfortable and completely safe: you are training the urge to breathe, not the oxygen."
                : "The rests stay long and the holds grow. This one genuinely dips your oxygen, so keep it to once or twice a week and never two days running."}
            </Tip>
          </div>
        </div>
        <InfoNote>
          <p>
            Every prescription is a percentage of your max hold, so the table
            scales with you.{" "}
            {kind === "co2"
              ? `Holds are fixed at ${Math.round((session.rounds[0].holdPct ?? 0) * 100)}% of your max while the recovery walks from ${fmtTime(session.rounds[0].breatheSec)} down to ${fmtTime(session.rounds.at(-1)!.breatheSec)}.`
              : `Recovery stays at ${fmtTime(session.rounds[0].breatheSec)} while the holds climb from ${Math.round(session.rounds[0].holdPct * 100)}% to ${Math.round(session.rounds.at(-1)!.holdPct * 100)}% of your max.`}
          </p>
          <p>
            The first limit on a breath hold is carbon dioxide, not oxygen: the
            urge to breathe is triggered by rising CO₂ long before you are
            actually short of O₂. CO₂ tables retrain that alarm; O₂ tables train
            what happens after it.
          </p>
        </InfoNote>
      </Card>

      <SessionTimer steps={steps} title={`${kindDef.label} — guided session`} />

      <Card>
        <CardTitle>The table</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
              <tr>
                <th className="px-3 py-2 font-medium">Round</th>
                <th className="px-3 py-2 font-medium">Breathe</th>
                <th className="px-3 py-2 font-medium">Hold</th>
                <th className="px-3 py-2 font-medium">% of max</th>
              </tr>
            </thead>
            <tbody>
              {session.rounds.map((r) => (
                <tr key={r.round} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-3 py-2 font-medium">{r.round}</td>
                  <td className="px-3 py-2 tabular-nums text-zinc-500">{fmtTime(r.breatheSec)}</td>
                  <td className="px-3 py-2 font-semibold tabular-nums">{fmtTime(r.holdSec)}</td>
                  <td className="px-3 py-2 tabular-nums text-zinc-500">
                    {Math.round(r.holdPct * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          Add the 2-minute settle before round 1 and 90 seconds of recovery
          breathing after the last hold — both are in the guided session above.
        </p>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardTitle>How to run a session</CardTitle>
          <ol className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
            {[
              "Lie down or sit somewhere quiet where you cannot fall. Never in or near water.",
              "Hit start and follow the timer — during 'breathe' phases just breathe normally through the nose.",
              "In the last 30 seconds before each hold, slow the breath down. One easy final breath to about 80% full, then hold.",
              "Stay still through the hold. Contractions of the diaphragm are the halfway mark, not the end.",
              "Breathe the moment the timer says so — this is not a competition with the clock.",
              "After the last round, take three recovery breaths (quick in, passive out), then sit for a minute.",
            ].map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-semibold text-accent-500">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <CardTitle>Safety — read this once, properly</CardTitle>
          <ul className="space-y-2">
            {SAFETY_RULES.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <span className="text-amber-500">⚠</span>
                {r}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardTitle>A training week</CardTitle>
        <div className="flex flex-wrap gap-2">
          {weeklyPlan(days).map((d) => (
            <div
              key={d.day}
              className="flex-1 basis-40 rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            >
              <div className="text-xs font-medium text-zinc-400">{d.day}</div>
              <div className="text-sm font-medium">{d.work}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-zinc-500">
          CO₂ tables can be daily — they are uncomfortable but cheap. O₂ tables
          are the taxing ones: two a week at most and never back-to-back.
          Re-test your max hold every 2–4 weeks and the whole plan re-scales.
        </p>
      </Card>

      <Card>
        <CardTitle>How to measure your max hold</CardTitle>
        <ol className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
          {HOW_TO_MEASURE.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-semibold text-accent-500">{i + 1}.</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone="neutral">Currently using {fmtTime(maxHold)}</Badge>
          <span className="text-xs text-zinc-400">
            Saved on this device and shared with the breath-hold score tool.
          </span>
        </div>
      </Card>
    </div>
  );
}
