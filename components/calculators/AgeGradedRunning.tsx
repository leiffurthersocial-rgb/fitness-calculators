"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  TextInput,
  Select,
  SegmentedControl,
  Result,
  Stat,
  Badge,
  InfoNote,
  CalcGrid,
} from "../ui";
import { useProfile } from "@/lib/profile";
import { ageGradedRunning, RACE_STANDARDS } from "@/lib/formulas";
import { parseTimeToSeconds, fmtTime, fmt } from "@/lib/units";

export default function AgeGradedRunning() {
  const { profile, patch } = useProfile();
  const [distKey, setDistKey] = useState("5k");
  const [time, setTime] = useState("22:00");

  const standard = RACE_STANDARDS.find((s) => s.key === distKey)!;
  const timeSec = parseTimeToSeconds(time);
  const r = ageGradedRunning(timeSec, standard, profile.age, profile.sex);
  const pct = Math.max(0, r.ageGradePct);
  const shown = Math.min(110, pct);

  const tone = pct >= 80 ? "accent" : pct >= 60 ? "neutral" : "warn";
  const color = pct >= 90 ? "#a855f7" : pct >= 80 ? "#10b981" : pct >= 60 ? "#34d399" : "#f59e0b";

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Your race</CardTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sex">
              <SegmentedControl
                value={profile.sex}
                onChange={(v) => patch({ sex: v })}
                options={[
                  { value: "male", label: "M" },
                  { value: "female", label: "F" },
                ]}
              />
            </Field>
            <Field label="Age">
              <NumberInput value={profile.age} onChange={(v) => patch({ age: v })} />
            </Field>
            <Field label="Distance">
              <Select
                value={distKey}
                onChange={setDistKey}
                options={RACE_STANDARDS.map((s) => ({ value: s.key, label: s.label }))}
              />
            </Field>
            <Field label="Finish time" hint="mm:ss or h:mm:ss">
              <TextInput value={time} onChange={setTime} placeholder="22:00" />
            </Field>
          </div>
        </div>
        <InfoNote>
          <p>
            Age-grading compares your time to the world standard for your age and
            sex: <strong>% = age standard ÷ your time × 100</strong>. It lets you
            compare performances across ages and events on one scale.
          </p>
          <p>
            Roughly: 60% local, 70% regional, 80% national-class, 90%+ world
            class. This uses a single age-factor curve, so treat it as an
            approximation of the official WMA tables, not a certificate.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Your age grade</CardTitle>
        <div className="flex items-center gap-5">
          <div className="relative h-32 w-32 shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor"
                className="text-zinc-200 dark:text-zinc-800" strokeWidth="8" />
              <circle cx="50" cy="50" r="44" fill="none" stroke={color} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 44}
                strokeDashoffset={2 * Math.PI * 44 * (1 - shown / 100)}
                style={{ transition: "stroke-dashoffset 0.4s ease" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{fmt(pct, 1)}%</span>
            </div>
          </div>
          <div className="flex-1">
            <Badge tone={tone}>{r.level}</Badge>
            <div className="mt-3 space-y-2">
              <Stat label="World standard for your age" value={fmtTime(r.ageStandardSec)} />
              <Stat label="Open-class standard" value={fmtTime(r.openStandardSec)} />
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-zinc-400">
          Age factor at {profile.age}: {fmt(r.ageFactor * 100, 1)}% of open-class
          potential. A {fmtTime(timeSec)} {standard.label} grades at{" "}
          {fmt(pct, 1)}%.
        </p>
      </Card>
    </CalcGrid>
  );
}
