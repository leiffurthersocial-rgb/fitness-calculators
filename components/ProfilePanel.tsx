"use client";

import { useState } from "react";
import {
  Field,
  NumberInput,
  SegmentedControl,
  Select,
} from "./ui";
import { useUnits } from "@/lib/settings";
import {
  useProfile,
  useWeightField,
  useHeightField,
} from "@/lib/profile";
import { TRAINING_LEVELS } from "@/lib/formulas";
import { weightUnit, lengthUnit, weightFromKg, weightToKg } from "@/lib/units";

const LIFT_FIELDS: { key: "squat" | "bench" | "deadlift" | "ohp"; label: string }[] = [
  { key: "squat", label: "Squat" },
  { key: "bench", label: "Bench" },
  { key: "deadlift", label: "Deadlift" },
  { key: "ohp", label: "Overhead" },
];

/**
 * The opt-in "Your stats" panel. Lives in the sidebar; editing any field here
 * (or in any tool) updates one shared, persisted profile that seeds every
 * calculator. Collapsible so it stays out of the way.
 */
export default function ProfilePanel() {
  const { units } = useUnits();
  const wu = weightUnit(units);
  const lu = lengthUnit(units);
  const { profile, patch, patchLifts } = useProfile();
  const [weight, setWeight] = useWeightField(units);
  const [height, setHeight] = useHeightField(units);
  const [open, setOpen] = useState(false);

  // Lifts are stored in kg; show/edit in the active unit.
  const liftDisp = (kg: number) =>
    kg > 0 ? Number(weightFromKg(kg, units).toFixed(1)) : 0;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <span aria-hidden>👤</span> Your stats
        </span>
        <span className={"text-xs text-zinc-400 transition " + (open ? "rotate-90" : "")}>
          ▸
        </span>
      </button>

      {!open && (
        <div className="px-3 pb-2 text-xs text-zinc-400">
          {profile.sex === "male" ? "M" : "F"} · {profile.age}y · {height}
          {lu} · {weight}
          {wu} · {profile.bodyFatPct}% bf
        </div>
      )}

      {open && (
        <div className="space-y-3 px-3 pb-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Age">
              <NumberInput value={profile.age} onChange={(v) => patch({ age: v })} />
            </Field>
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
            <Field label={`Height (${lu})`}>
              <NumberInput value={height} onChange={setHeight} suffix={lu} />
            </Field>
            <Field label={`Weight (${wu})`}>
              <NumberInput value={weight} onChange={setWeight} suffix={wu} />
            </Field>
            <Field label="Body fat %">
              <NumberInput
                value={profile.bodyFatPct}
                onChange={(v) => patch({ bodyFatPct: v })}
                suffix="%"
              />
            </Field>
            <Field label="Resting HR">
              <NumberInput
                value={profile.restingHR}
                onChange={(v) => patch({ restingHR: v })}
                suffix="bpm"
              />
            </Field>
          </div>
          <Field label="Training experience">
            <Select
              value={profile.experience}
              onChange={(v) => patch({ experience: v })}
              options={TRAINING_LEVELS.map((t) => ({
                value: t.key,
                label: `${t.label} (${t.years})`,
              }))}
            />
          </Field>

          <div className="border-t border-zinc-100 pt-2 dark:border-zinc-800">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Performance <span className="font-normal normal-case">(optional)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {LIFT_FIELDS.map((l) => (
                <Field key={l.key} label={`${l.label} 1RM (${wu})`}>
                  <NumberInput
                    value={liftDisp(profile.lifts[l.key])}
                    onChange={(v) => patchLifts({ [l.key]: v ? weightToKg(v, units) : 0 })}
                    step={2.5}
                    suffix={wu}
                  />
                </Field>
              ))}
              <Field label="Max pull-ups">
                <NumberInput
                  value={profile.lifts.pullups}
                  onChange={(v) => patchLifts({ pullups: v })}
                  suffix="reps"
                />
              </Field>
              <Field label="VO₂max">
                <NumberInput
                  value={profile.vo2max}
                  onChange={(v) => patch({ vo2max: v })}
                  suffix="ml/kg/min"
                />
              </Field>
              <Field label={`Waist (${lu})`}>
                <NumberInput
                  value={profile.waistCm > 0 ? Number((units === "metric" ? profile.waistCm : profile.waistCm / 2.54).toFixed(1)) : 0}
                  onChange={(v) => patch({ waistCm: v ? (units === "metric" ? v : v * 2.54) : 0 })}
                  suffix={lu}
                />
              </Field>
            </div>
          </div>

          <p className="text-xs text-zinc-400">
            Saved on this device and used to auto-fill every calculator.
          </p>
        </div>
      )}
    </div>
  );
}
