"use client";

import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  SegmentedControl,
  InfoNote,
  CalcGrid,
  Badge,
} from "../ui";
import { useUnits } from "@/lib/settings";
import { useProfile } from "@/lib/profile";
import { liftBalance } from "@/lib/formulas";
import { weightFromKg, weightToKg, weightUnit, fmt } from "@/lib/units";

type Lift = "squat" | "bench" | "deadlift" | "ohp";
const ORDER: Lift[] = ["squat", "bench", "deadlift", "ohp"];
const LABELS: Record<Lift, string> = {
  squat: "Squat",
  bench: "Bench press",
  deadlift: "Deadlift",
  ohp: "Overhead press",
};

export default function LiftBalance() {
  const { units } = useUnits();
  const wu = weightUnit(units);
  const { profile, patch, patchLifts } = useProfile();

  const liftDisp = (kg: number) => (kg > 0 ? Number(weightFromKg(kg, units).toFixed(1)) : 0);
  const lifts: Record<Lift, number> = {
    squat: liftDisp(profile.lifts.squat),
    bench: liftDisp(profile.lifts.bench),
    deadlift: liftDisp(profile.lifts.deadlift),
    ohp: liftDisp(profile.lifts.ohp),
  };

  // Ratios are unit-agnostic, so we can analyse the display values directly.
  const result = liftBalance(lifts, profile.sex);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Your 1RMs</CardTitle>
        <div className="space-y-4">
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
          <div className="grid grid-cols-2 gap-3">
            {ORDER.map((k) => (
              <Field key={k} label={`${LABELS[k]} (${wu})`}>
                <NumberInput
                  value={lifts[k]}
                  onChange={(v) => patchLifts({ [k]: v ? weightToKg(v, units) : 0 })}
                  suffix={wu}
                />
              </Field>
            ))}
          </div>
        </div>
        <InfoNote>
          <p>
            A balanced lifter shows roughly squat 1.5×, deadlift 1.75× and
            overhead 0.8× their bench (women a touch lower). We anchor to the
            lift you&apos;re <em>relatively</em> strongest at and show where the
            others should sit to match it.
          </p>
          <p>
            Big gaps flag a weak point — often overhead press or, for desk-bound
            lifters, the posterior chain (deadlift). It&apos;s a guide, not a
            mandate; sport and leverages shift the ideal.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Balance</CardTitle>
        {result.weakest && result.strongest && result.weakest.key !== result.strongest.key ? (
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-900/20">
              <div className="text-xs text-zinc-500">Weak point</div>
              <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                {result.weakest.label}
              </div>
              <div className="text-xs text-zinc-500">
                {fmt(Math.abs(result.weakest.deltaPct), 0)}% behind balanced
              </div>
            </div>
            <div className="rounded-xl border border-accent-200 bg-accent-50 px-3 py-2 dark:border-accent-800 dark:bg-accent-900/20">
              <div className="text-xs text-zinc-500">Strongest</div>
              <div className="text-sm font-semibold text-accent-700 dark:text-accent-300">
                {result.strongest.label}
              </div>
              <div className="text-xs text-zinc-500">anchor lift</div>
            </div>
          </div>
        ) : (
          <p className="mb-4 text-sm text-zinc-500">
            Enter at least two lifts to see your balance.
          </p>
        )}

        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-2 font-medium">Lift</th>
                <th className="px-4 py-2 font-medium">You</th>
                <th className="px-4 py-2 font-medium">Balanced</th>
                <th className="px-4 py-2 font-medium">Gap</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => {
                const off = Math.abs(r.deltaPct) >= 8;
                const behind = r.deltaPct < 0;
                return (
                  <tr key={r.key} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-2 font-medium">{r.label}</td>
                    <td className="px-4 py-2">{r.actual > 0 ? `${fmt(r.actual)} ${wu}` : "—"}</td>
                    <td className="px-4 py-2 text-zinc-500">
                      {r.expected > 0 ? `${fmt(r.expected)} ${wu}` : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {r.actual > 0 && r.expected > 0 ? (
                        <Badge tone={!off ? "accent" : behind ? "warn" : "neutral"}>
                          {r.deltaPct >= 0 ? "+" : ""}
                          {fmt(r.deltaPct, 0)}%
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          “Balanced” is each lift scaled to the one you&apos;re strongest at
          (relative to standards). Within ±8% is well-proportioned.
        </p>
      </Card>
    </CalcGrid>
  );
}
