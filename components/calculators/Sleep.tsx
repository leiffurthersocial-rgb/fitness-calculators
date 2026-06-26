"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  TextInput,
  InfoNote,
  CalcGrid,
  SegmentedControl,
  Badge,
  Button,
  Tip,
} from "../ui";
import { parseClockToMinutes, fmtClock } from "@/lib/units";

const CYCLE_MIN = 90;
const FALL_ASLEEP_MIN = 15;

type Mode = "wake" | "sleep" | "now";

// Per-cycle-count labelling: 5–6 cycles (7.5–9h) is the healthy sweet spot.
function quality(cycles: number): { label: string; tone: "accent" | "neutral" | "warn" } | null {
  if (cycles === 6) return { label: "Most rest · 9h", tone: "neutral" };
  if (cycles === 5) return { label: "Recommended · 7.5h", tone: "accent" };
  if (cycles === 4) return { label: "OK · 6h", tone: "neutral" };
  if (cycles === 3) return { label: "Minimum · 4.5h", tone: "warn" };
  return null;
}

export default function Sleep() {
  const [mode, setMode] = useState<Mode>("wake");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [sleepTime, setSleepTime] = useState("23:00");

  const nowMinutes = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };
  const setSleepToNow = () => {
    const d = new Date();
    setSleepTime(
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    );
  };

  const cycles = [6, 5, 4, 3];

  // For "wake": bedtime = wake − cycles·90 − fall-asleep (count backwards).
  // For "sleep"/"now": wake = bed + fall-asleep + cycles·90 (count forwards).
  let suggestions: { cycles: number; minutes: number }[] = [];
  if (mode === "wake") {
    const wakeMin = parseClockToMinutes(wakeTime);
    suggestions = cycles.map((c) => ({
      cycles: c,
      minutes: wakeMin - c * CYCLE_MIN - FALL_ASLEEP_MIN,
    }));
  } else {
    const bedMin = mode === "now" ? nowMinutes() : parseClockToMinutes(sleepTime);
    suggestions = cycles.map((c) => ({
      cycles: c,
      minutes: bedMin + FALL_ASLEEP_MIN + c * CYCLE_MIN,
    }));
  }

  const resultTitle =
    mode === "wake" ? "Go to bed at" : "Set your alarm for";

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Sleep cycles</CardTitle>
        <div className="space-y-4">
          <Field label="What do you want to plan around?">
            <SegmentedControl
              value={mode}
              onChange={setMode}
              options={[
                { value: "wake", label: "Wake-up time" },
                { value: "sleep", label: "Bedtime" },
                { value: "now", label: "Sleep now" },
              ]}
            />
          </Field>

          {mode === "wake" && (
            <Field label="I want to wake up at (24h)">
              <TextInput value={wakeTime} onChange={setWakeTime} placeholder="07:00" />
            </Field>
          )}
          {mode === "sleep" && (
            <Field label="I'm going to bed at (24h)">
              <div className="flex gap-2">
                <div className="flex-1">
                  <TextInput value={sleepTime} onChange={setSleepTime} placeholder="23:00" />
                </div>
                <Button variant="ghost" onClick={setSleepToNow}>
                  Now
                </Button>
              </div>
            </Field>
          )}
          {mode === "now" && (
            <p className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-800">
              Heading to bed right now — here&apos;s when to set your alarm.
            </p>
          )}

          <Tip>
            Aim for <strong>5–6 cycles (7.5–9 hours)</strong>. Waking at the end
            of a cycle, in light sleep, leaves you far less groggy than waking
            mid-cycle — so pick a highlighted time over an exact hour count.
          </Tip>
        </div>
        <InfoNote>
          <p>
            Sleep runs in ~90-minute cycles. We assume {FALL_ASLEEP_MIN} minutes
            to fall asleep, then count whole cycles.
          </p>
          <p>
            {mode === "wake"
              ? "Bedtimes are your wake time minus N cycles and the time to fall asleep."
              : "Wake times are your bedtime plus the time to fall asleep and N cycles."}
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>{resultTitle}</CardTitle>
        <div className="space-y-2">
          {suggestions.map((s) => {
            const q = quality(s.cycles);
            const recommended = s.cycles === 5;
            return (
              <div
                key={s.cycles}
                className={
                  "flex items-center justify-between rounded-xl border px-4 py-3 " +
                  (recommended
                    ? "border-accent-400 bg-accent-50 ring-1 ring-accent-300 dark:border-accent-700 dark:bg-accent-900/20 dark:ring-accent-800"
                    : "border-zinc-200 dark:border-zinc-800")
                }
              >
                <div>
                  <div className="text-lg font-semibold">{fmtClock(s.minutes)}</div>
                  <div className="text-xs text-zinc-500">{s.cycles} cycles</div>
                </div>
                {q && <Badge tone={q.tone}>{q.label}</Badge>}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          {mode === "wake"
            ? "Earlier bedtimes give more sleep. The highlighted option is the recommended sweet spot."
            : "Later alarms give more sleep. The highlighted option is the recommended sweet spot."}
        </p>
      </Card>
    </CalcGrid>
  );
}
