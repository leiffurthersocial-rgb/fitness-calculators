"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  InfoNote,
  CalcGrid,
  SegmentedControl,
  Stat,
} from "../ui";
import { useUnits } from "@/lib/settings";
import { useProfile, useWeightField } from "@/lib/profile";
import {
  bmrMifflin,
  tdee,
  calorieTarget,
  macroSplit,
  type MacroGoal,
} from "@/lib/formulas";
import { weightToKg, weightUnit, fmt } from "@/lib/units";

const COLORS = { protein: "#10b981", carbs: "#f59e0b", fat: "#6366f1" };

export default function Macros() {
  const { units } = useUnits();
  const wu = weightUnit(units);

  // Estimate maintenance from the shared profile so this works standalone, but
  // let the user override calories directly.
  const { profile } = useProfile();
  const estMaintenance = Math.round(
    tdee(
      bmrMifflin(profile.weightKg, profile.heightCm, profile.age, profile.sex),
      1.55
    )
  );

  const [calories, setCalories] = useState(estMaintenance);
  const [goal, setGoal] = useState<MacroGoal>("maintain");
  const [bw, setBw] = useWeightField(units);
  const [proteinPerKg, setProteinPerKg] = useState(1.8);
  const [meals, setMeals] = useState(4);

  const target = calorieTarget(calories, goal);
  const bwKg = weightToKg(bw, units);
  const m = macroSplit(target, bwKg, proteinPerKg);

  const pieData = [
    { name: "Protein", value: Math.round(m.proteinKcal), grams: m.proteinG, color: COLORS.protein },
    { name: "Carbs", value: Math.round(m.carbsKcal), grams: m.carbsG, color: COLORS.carbs },
    { name: "Fat", value: Math.round(m.fatKcal), grams: m.fatG, color: COLORS.fat },
  ];

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Targets</CardTitle>
        <div className="space-y-4">
          <Field label="Maintenance calories" hint="from TDEE calc">
            <NumberInput value={calories} onChange={setCalories} step={50} suffix="kcal" />
          </Field>
          <Field label="Goal">
            <SegmentedControl
              value={goal}
              onChange={setGoal}
              options={[
                { value: "cut", label: "Cut" },
                { value: "maintain", label: "Maintain" },
                { value: "bulk", label: "Bulk" },
              ]}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Bodyweight (${wu})`}>
              <NumberInput value={bw} onChange={setBw} suffix={wu} />
            </Field>
            <Field label="Protein (g/kg)">
              <NumberInput value={proteinPerKg} onChange={setProteinPerKg} step={0.1} />
            </Field>
          </div>
          <Stat label="Calorie target" value={fmt(target, 0)} unit="kcal" />
        </div>
        <InfoNote>
          <p>Cut = TDEE − 500, Bulk = TDEE + 300.</p>
          <p>
            Protein = {proteinPerKg} g/kg × bodyweight. Fat is fixed at 25% of
            calories; carbs fill the rest. 4 kcal/g protein &amp; carbs, 9 kcal/g
            fat.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Macro split</CardTitle>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {pieData.map((d) => (
                  <Cell key={d.name} fill={d.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, n) => [`${v} kcal`, n]}
                contentStyle={{
                  borderRadius: 12,
                  border: "none",
                  background: "#18181b",
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <Stat label="Protein" value={fmt(m.proteinG, 0)} unit="g" />
          <Stat label="Carbs" value={fmt(m.carbsG, 0)} unit="g" />
          <Stat label="Fat" value={fmt(m.fatG, 0)} unit="g" />
        </div>

        {/* Per-meal breakdown */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Per meal</span>
            <div className="w-28">
              <NumberInput value={meals} onChange={setMeals} suffix="meals" />
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-2 font-medium">Each meal</th>
                  <th className="px-4 py-2 font-medium">Protein</th>
                  <th className="px-4 py-2 font-medium">Carbs</th>
                  <th className="px-4 py-2 font-medium">Fat</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-2 font-medium">
                    {fmt(target / Math.max(1, meals), 0)} kcal
                  </td>
                  <td className="px-4 py-2">{fmt(m.proteinG / Math.max(1, meals), 0)} g</td>
                  <td className="px-4 py-2">{fmt(m.carbsG / Math.max(1, meals), 0)} g</td>
                  <td className="px-4 py-2">{fmt(m.fatG / Math.max(1, meals), 0)} g</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Split evenly. Aim for ~0.4 g/kg protein per meal across 3–5 meals to
            maximise muscle-protein synthesis.
          </p>
        </div>
      </Card>
    </CalcGrid>
  );
}
