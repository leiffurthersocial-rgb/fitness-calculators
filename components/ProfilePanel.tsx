"use client";

import { useState } from "react";
import { useProfile, DEFAULT_PROFILE } from "@/lib/profile";
import {
  weightFromKg,
  weightToKg,
  lengthFromCm,
  lengthToCm,
  weightUnit,
  lengthUnit,
  type UnitSystem,
} from "@/lib/units";
import { Field, NumberInput, SegmentedControl, Button } from "./ui";

/**
 * Collapsible shared-profile panel. Everything here auto-fills the
 * calculators. Bodyweight & height are stored in metric and converted on the
 * fly so flipping units never loses precision.
 */
export default function ProfilePanel() {
  const { profile, update, setProfile, hydrated } = useProfile();
  const [open, setOpen] = useState(true);

  const wu = weightUnit(profile.units);
  const lu = lengthUnit(profile.units);

  const setUnits = (units: UnitSystem) => update("units", units);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
            👤
          </span>
          Your profile
        </span>
        <span className={"text-zinc-400 transition " + (open ? "rotate-180" : "")}>
          ▾
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-zinc-100 px-4 py-4 dark:border-zinc-800">
          {/* Units first — it changes how everything below is labeled. */}
          <Field label="Units">
            <SegmentedControl
              value={profile.units}
              onChange={setUnits}
              options={[
                { value: "metric", label: "Metric" },
                { value: "imperial", label: "Imperial" },
              ]}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Age">
              <NumberInput value={profile.age} onChange={(v) => update("age", v)} />
            </Field>
            <Field label="Sex">
              <SegmentedControl
                value={profile.sex}
                onChange={(v) => update("sex", v)}
                options={[
                  { value: "male", label: "M" },
                  { value: "female", label: "F" },
                ]}
              />
            </Field>
          </div>

          <Field label={`Bodyweight (${wu})`}>
            <NumberInput
              value={Math.round(weightFromKg(profile.bodyweightKg, profile.units) * 10) / 10}
              onChange={(v) => update("bodyweightKg", weightToKg(v, profile.units))}
              step={0.5}
              suffix={wu}
            />
          </Field>

          <Field label={`Height (${lu})`}>
            <NumberInput
              value={Math.round(lengthFromCm(profile.heightCm, profile.units) * 10) / 10}
              onChange={(v) => update("heightCm", lengthToCm(v, profile.units))}
              step={profile.units === "metric" ? 1 : 0.5}
              suffix={lu}
            />
          </Field>

          <Field label="Resting HR (bpm)">
            <NumberInput
              value={profile.restingHR}
              onChange={(v) => update("restingHR", v)}
              suffix="bpm"
            />
          </Field>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-zinc-400">
              {hydrated ? "Saved locally" : "Loading…"}
            </span>
            <Button variant="ghost" onClick={() => setProfile(DEFAULT_PROFILE)}>
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
