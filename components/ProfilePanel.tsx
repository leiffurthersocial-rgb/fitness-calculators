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
import { weightUnit, lengthUnit } from "@/lib/units";

/**
 * The opt-in "Your stats" panel. Lives in the sidebar; editing any field here
 * (or in any tool) updates one shared, persisted profile that seeds every
 * calculator. Collapsible so it stays out of the way.
 */
export default function ProfilePanel() {
  const { units } = useUnits();
  const wu = weightUnit(units);
  const lu = lengthUnit(units);
  const { profile, patch } = useProfile();
  const [weight, setWeight] = useWeightField(units);
  const [height, setHeight] = useHeightField(units);
  const [open, setOpen] = useState(false);

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
          <p className="text-xs text-zinc-400">
            Saved on this device and used to auto-fill every calculator.
          </p>
        </div>
      )}
    </div>
  );
}
