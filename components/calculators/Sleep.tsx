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
} from "../ui";
import { parseTimeToSeconds, fmtClock } from "@/lib/units";

const CYCLE_MIN = 90;
const FALL_ASLEEP_MIN = 15;

export default function Sleep() {
  // Two modes: "I want to wake at X" or "I'm going to bed at X".
  const [mode, setMode] = useState<"wake" | "sleep">("wake");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [sleepTime, setSleepTime] = useState("23:00");

  // Build suggestions for 6 down to 3 cycles (best rest first).
  const cycles = [6, 5, 4, 3];

  let suggestions: { cycles: number; minutes: number; hours: number }[] = [];
  if (mode === "wake") {
    // Work backwards from wake time: bedtime = wake − cycles·90 − fall-asleep.
    const wakeMin = parseTimeToSeconds(wakeTime) / 60;
    suggestions = cycles.map((c) => ({
      cycles: c,
      minutes: wakeMin - c * CYCLE_MIN - FALL_ASLEEP_MIN,
      hours: (c * CYCLE_MIN) / 60,
    }));
  } else {
    // Work forwards from bedtime: wake = bedtime + fall-asleep + cycles·90.
    const sleepMin = parseTimeToSeconds(sleepTime) / 60;
    suggestions = cycles.map((c) => ({
      cycles: c,
      minutes: sleepMin + FALL_ASLEEP_MIN + c * CYCLE_MIN,
      hours: (c * CYCLE_MIN) / 60,
    }));
  }

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Sleep cycles</CardTitle>
        <div className="space-y-4">
          <Field label="I want to plan around my…">
            <SegmentedControl
              value={mode}
              onChange={setMode}
              options={[
                { value: "wake", label: "Wake-up time" },
                { value: "sleep", label: "Bedtime" },
              ]}
            />
          </Field>
          {mode === "wake" ? (
            <Field label="Wake up at (24h)">
              <TextInput value={wakeTime} onChange={setWakeTime} placeholder="07:00" />
            </Field>
          ) : (
            <Field label="Going to bed at (24h)">
              <TextInput value={sleepTime} onChange={setSleepTime} placeholder="23:00" />
            </Field>
          )}
        </div>
        <InfoNote>
          <p>
            Sleep runs in ~90-minute cycles. Waking at the end of a cycle (in
            light sleep) feels far better than waking mid-cycle.
          </p>
          <p>
            We assume {FALL_ASLEEP_MIN} minutes to fall asleep, then count whole
            90-minute cycles. Aim for 5–6 cycles (7.5–9 h).
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>
          {mode === "wake" ? "Go to bed at" : "Set your alarm for"}
        </CardTitle>
        <div className="space-y-2">
          {suggestions.map((s, idx) => (
            <div
              key={s.cycles}
              className={
                "flex items-center justify-between rounded-xl border px-4 py-3 " +
                (idx < 2
                  ? "border-accent-300 bg-accent-50 dark:border-accent-800 dark:bg-accent-900/20"
                  : "border-zinc-200 dark:border-zinc-800")
              }
            >
              <div>
                <div className="text-lg font-semibold">
                  {fmtClock(s.minutes)}
                </div>
                <div className="text-xs text-zinc-500">
                  {s.cycles} cycles · {s.hours} h of sleep
                </div>
              </div>
              {idx === 0 && <Badge>Best</Badge>}
              {idx === 1 && <Badge tone="neutral">Great</Badge>}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          {mode === "wake"
            ? "Earlier times = more sleep. The top two give a full night's rest."
            : "Later times = more sleep. The top two give a full night's rest."}
        </p>
      </Card>
    </CalcGrid>
  );
}
