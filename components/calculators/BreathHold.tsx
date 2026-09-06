"use client";

import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  SegmentedControl,
  TextInput,
  Result,
  Stat,
  Badge,
  InfoNote,
  Tip,
  Button,
  CalcGrid,
} from "../ui";
import { useProfile } from "@/lib/profile";
import { useLocalStorage } from "@/lib/useLocalStorage";
import {
  breathHoldScore,
  BREATH_LEVELS,
  HOW_TO_MEASURE,
  SAFETY_RULES,
  WORLD_RECORD_SEC,
} from "@/lib/breathwork";
import { fmt, fmtTime, parseTimeToSeconds } from "@/lib/units";

/** A plain stopwatch, so you can time the hold on the same page you score it. */
function useStopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    startedAt.current = Date.now() - elapsed * 1000;
    const id = window.setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  return {
    elapsed,
    running,
    toggle: () => setRunning((r) => !r),
    reset: () => {
      setRunning(false);
      setElapsed(0);
    },
  };
}

export default function BreathHold() {
  const { profile, patch } = useProfile();
  // Shared with the CO₂/O₂ table builder — measure once, use everywhere.
  const [maxHold, setMaxHold] = useLocalStorage("vital.breath.maxSec", 60);
  const [text, setText] = useState(() => fmtTime(60));
  const [trained, setTrained] = useState(false);
  const watch = useStopwatch();

  const commit = (raw: string) => {
    setText(raw);
    const sec = parseTimeToSeconds(raw);
    if (sec > 0) setMaxHold(Math.min(1200, sec));
  };

  const useStopwatchTime = () => {
    const sec = Math.round(watch.elapsed);
    if (sec <= 0) return;
    setMaxHold(sec);
    setText(fmtTime(sec));
  };

  const r = breathHoldScore({
    seconds: maxHold,
    age: profile.age,
    sex: profile.sex,
    trained,
  });

  const levelIdx = BREATH_LEVELS.findIndex((l) => l.key === r.level.key);

  return (
    <div className="space-y-5">
      <CalcGrid>
        <Card>
          <CardTitle>Your max hold</CardTitle>
          <div className="space-y-4">
            <Field label="Best static breath hold" hint="m:ss">
              <TextInput value={text} onChange={commit} placeholder="1:30" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age">
                <NumberInput
                  value={profile.age}
                  onChange={(v) => patch({ age: v })}
                  min={10}
                  max={90}
                  suffix="yr"
                />
              </Field>
              <Field label="Sex">
                <SegmentedControl
                  value={profile.sex}
                  onChange={(v) => patch({ sex: v })}
                  options={[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                  ]}
                />
              </Field>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
              <input
                type="checkbox"
                checked={trained}
                onChange={(e) => setTrained(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-accent-500)]"
              />
              <span className="text-sm font-medium">
                I already train apnea regularly
                <span className="ml-1 font-normal text-zinc-400">(affects the projection only)</span>
              </span>
            </label>

            <div className="rounded-xl border border-dashed border-zinc-300 p-3 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Stopwatch
                </span>
                <span className="font-mono text-2xl font-bold tabular-nums">
                  {fmtTime(watch.elapsed)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button onClick={watch.toggle}>{watch.running ? "Stop" : "Start"}</Button>
                <Button variant="ghost" onClick={watch.reset}>
                  Reset
                </Button>
                <Button variant="ghost" onClick={useStopwatchTime}>
                  Use as my max
                </Button>
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                Sitting or lying down, on dry land. Stop the clock the instant you
                breathe.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Where that puts you</CardTitle>
          <div className="space-y-3">
            <Result
              label="Percentile vs adults your age & sex"
              value={fmt(r.percentile, 1)}
              unit="th"
              sub={`A typical ${profile.age}-year-old holds about ${fmtTime(r.medianSec)}`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{r.level.label}</Badge>
              <span className="text-sm text-zinc-500">{r.level.blurb}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Your hold" value={fmtTime(maxHold)} />
              <Stat label="Of the world record" value={fmt(r.pctOfWorldRecord, 1)} unit="%" />
              <Stat
                label={r.nextLevel ? `To ${r.nextLevel.label}` : "Top tier"}
                value={r.nextLevel ? `+${fmtTime(r.toNextSec)}` : "—"}
              />
              <Stat label="After 8–12 weeks of tables" value={fmtTime(r.projectedSec)} />
            </div>
            <p className="text-xs text-zinc-400">
              World record (dry static, no oxygen):{" "}
              {fmtTime(WORLD_RECORD_SEC[profile.sex])}.
            </p>
          </div>
          <InfoNote>
            <p>
              Static apnea times are strongly right-skewed — most adults sit
              between 30 s and 90 s while trained apneists run into the
              many-minute tail — so the population is modelled as log-normal and
              your percentile is read off the z-score of log(hold).
            </p>
            <p>
              The curve is anchored on an untrained median of about 55 s for men
              and 45 s for women, a 90th percentile near 2 minutes and a 99.9th
              near 6 minutes, then shifted for age: lung volume and chest-wall
              compliance both decline, so the same time scores higher the older
              you are.
            </p>
          </InfoNote>
        </Card>
      </CalcGrid>

      <Card>
        <CardTitle>The ladder</CardTitle>
        <div className="space-y-1.5">
          {BREATH_LEVELS.map((l, i) => {
            const isYou = i === levelIdx;
            const next = BREATH_LEVELS[i + 1];
            return (
              <div
                key={l.key}
                className={
                  "flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl px-3 py-2 " +
                  (isYou
                    ? "bg-accent-50 dark:bg-accent-900/20"
                    : "border border-zinc-100 dark:border-zinc-800")
                }
              >
                <span className={"text-sm font-semibold " + (isYou ? "text-accent-700 dark:text-accent-300" : "")}>
                  {l.label}
                </span>
                <span className="font-mono text-xs tabular-nums text-zinc-400">
                  {fmtTime(l.minSec)}
                  {next ? `–${fmtTime(next.minSec)}` : "+"}
                </span>
                <span className="flex-1 text-xs text-zinc-500">{l.blurb}</span>
                {isYou && <Badge>you</Badge>}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardTitle>What this actually measures</CardTitle>
        <ul className="space-y-2">
          {r.notes.map((n, i) => (
            <li key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <span className="text-accent-500">•</span>
              {n}
            </li>
          ))}
        </ul>
        <Tip>
          Almost everyone&apos;s first big jump comes from CO₂ tables plus
          learning to relax — not from lung capacity. Build the tables in the
          CO₂ / O₂ tables tool; it reads the max hold you saved here.
        </Tip>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardTitle>How to test it properly</CardTitle>
          <ol className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
            {HOW_TO_MEASURE.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-semibold text-accent-500">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <CardTitle>Safety</CardTitle>
          <ul className="space-y-2">
            {SAFETY_RULES.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <span className="text-amber-500">⚠</span>
                {s}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
