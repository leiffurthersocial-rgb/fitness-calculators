"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  Result,
  Stat,
  Badge,
  InfoNote,
  CalcGrid,
} from "../ui";
import { useUnits } from "@/lib/settings";
import { useProfile } from "@/lib/profile";
import { sweatRate } from "@/lib/formulas";
import { weightFromKg, weightToKg, weightUnit, fmt } from "@/lib/units";

const L_PER_OZ = 0.0295735;

export default function SweatRate() {
  const { units } = useUnits();
  const metric = units === "metric";
  const wu = weightUnit(units);
  const fu = metric ? "L" : "fl oz";
  const { profile } = useProfile();

  // Fluids: store/compute in litres, show in L (metric) or fl oz (imperial).
  const toL = (v: number) => (metric ? v : v * L_PER_OZ);
  const fromL = (l: number) => (metric ? l : l / L_PER_OZ);

  const seedPre = Math.round(weightFromKg(profile.weightKg, units) * 10) / 10;
  const [pre, setPre] = useState(seedPre);
  const [post, setPost] = useState(Math.round((seedPre - (metric ? 1 : 2)) * 10) / 10);
  const [duration, setDuration] = useState(1);
  const [fluid, setFluid] = useState(metric ? 0.5 : 17);
  const [naConc, setNaConc] = useState(1000);

  const r = sweatRate({
    preKg: weightToKg(pre, units),
    postKg: weightToKg(post, units),
    durationHr: duration,
    fluidIntakeL: toL(fluid),
    sweatSodiumMgPerL: naConc,
  });

  const pct = r.pctBodyMassLoss;
  const tone = pct < 1 ? "accent" : pct < 2 ? "neutral" : "warn";
  const barColor = pct < 1 ? "#10b981" : pct < 2 ? "#f59e0b" : "#ef4444";

  // Fluid-balance graph: sweat produced vs what you drank vs the gap to replace.
  const chart = [
    { name: "Sweat lost", value: fromL(r.sweatLossL), color: "#38bdf8" },
    { name: "Drank", value: fromL(toL(fluid)), color: "#10b981" },
    { name: "To replace", value: fromL(r.rehydrationTargetL), color: barColor },
  ];

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Your session</CardTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Weight before (${wu})`} hint="nude / minimal kit">
              <NumberInput value={pre} onChange={setPre} step={0.1} suffix={wu} />
            </Field>
            <Field label={`Weight after (${wu})`}>
              <NumberInput value={post} onChange={setPost} step={0.1} suffix={wu} />
            </Field>
            <Field label="Duration" hint="hours">
              <NumberInput value={duration} onChange={setDuration} step={0.25} suffix="h" />
            </Field>
            <Field label={`Fluid drunk (${fu})`}>
              <NumberInput value={fluid} onChange={setFluid} step={metric ? 0.1 : 4} suffix={fu} />
            </Field>
            <Field label="Sweat sodium" hint="500–1500; salty = higher">
              <NumberInput value={naConc} onChange={setNaConc} step={100} suffix="mg/L" />
            </Field>
          </div>
        </div>
        <InfoNote>
          <p>
            Sweat rate = (weight lost + fluid drunk) ÷ time, with 1 L of sweat ≈
            1 kg of body mass. Weigh yourself nude before and straight after.
          </p>
          <p>
            Performance drops once you&rsquo;re down ~2% of body mass, so use your
            rate to plan drinking during long or hot sessions. Replace ~150% of any
            deficit afterwards — the extra covers ongoing urine losses — and add
            sodium when sweat losses are heavy.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Your hydration</CardTitle>
        <Result
          label="Sweat rate"
          value={fmt(fromL(r.sweatRateLPerHr), 2)}
          unit={`${fu}/h`}
          sub={`${fmt(Math.abs(pct), 1)}% body mass ${pct < 0 ? "gained" : "lost"}`}
        />
        <div className="mt-3">
          <Badge tone={tone}>{r.status}</Badge>
        </div>

        <div className="mt-4 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "currentColor" }} className="text-zinc-500" />
              <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-zinc-400" width={28} />
              <Tooltip
                formatter={(v) => [`${fmt(Number(v), 2)} ${fu}`, ""]}
                contentStyle={{ borderRadius: 12, border: "none", background: "#18181b", color: "#fff", fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chart.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat label="Drink to rehydrate" value={fmt(fromL(r.rehydrationTargetL), 2)} unit={fu} />
          <Stat label="Sodium lost" value={fmt(r.sodiumLossMg / 1000, 2)} unit="g" />
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          During exercise, aim to drink close to your sweat rate, but the gut
          tolerates only ~0.8–1.0 {fu}/h — pace it and don&rsquo;t overdrink.
        </p>
      </Card>
    </CalcGrid>
  );
}
