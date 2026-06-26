"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  TextInput,
  Button,
  InfoNote,
  CalcGrid,
  Result,
  Badge,
} from "../ui";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { caffeineRemaining } from "@/lib/formulas";
import { parseTimeToSeconds, fmtClock, fmt } from "@/lib/units";

interface Intake {
  id: string;
  mg: number;
  time: string; // "HH:MM" 24h
}

const HALF_LIFE = 5;

export default function Caffeine() {
  const [intakes, setIntakes] = useLocalStorage<Intake[]>("vital.caffeine", [
    { id: "1", mg: 95, time: "08:00" },
    { id: "2", mg: 95, time: "13:00" },
  ]);
  const [mg, setMg] = useState(95);
  const [time, setTime] = useState("15:00");
  const [bedtime, setBedtime] = useState("23:00");

  const addIntake = () => {
    setIntakes((prev) => [
      ...prev,
      { id: String(Date.now()), mg, time },
    ]);
  };
  const removeIntake = (id: string) =>
    setIntakes((prev) => prev.filter((i) => i.id !== id));

  // Build a 24h curve sampled every 15 min, summing each dose's decay.
  const { curve, atBedtime } = useMemo(() => {
    const toHours = (t: string) => parseTimeToSeconds(t) / 3600;
    const points: { minute: number; label: string; mg: number }[] = [];
    for (let min = 0; min <= 24 * 60; min += 15) {
      const hour = min / 60;
      let total = 0;
      for (const intake of intakes) {
        const taken = toHours(intake.time);
        const elapsed = hour - taken;
        if (elapsed >= 0) total += caffeineRemaining(intake.mg, elapsed, HALF_LIFE);
      }
      points.push({
        minute: min,
        label: fmtClock(min),
        mg: Math.round(total * 10) / 10,
      });
    }
    // Caffeine remaining at chosen bedtime (next-day bedtimes wrap +24h).
    let bedHour = toHours(bedtime);
    const earliest = Math.min(...intakes.map((i) => toHours(i.time)), bedHour);
    if (bedHour < earliest) bedHour += 24;
    let bedTotal = 0;
    for (const intake of intakes) {
      const elapsed = bedHour - toHours(intake.time);
      if (elapsed >= 0) bedTotal += caffeineRemaining(intake.mg, elapsed, HALF_LIFE);
    }
    return { curve: points, atBedtime: bedTotal };
  }, [intakes, bedtime]);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Log intake</CardTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (mg)">
              <NumberInput value={mg} onChange={setMg} step={5} suffix="mg" />
            </Field>
            <Field label="Time (24h)">
              <TextInput value={time} onChange={setTime} placeholder="15:00" />
            </Field>
          </div>
          <Button onClick={addIntake}>+ Add intake</Button>

          <div className="space-y-2">
            {intakes.length === 0 && (
              <p className="text-sm text-zinc-500">No intakes logged yet.</p>
            )}
            {intakes
              .slice()
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((i) => (
                <div
                  key={i.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <span>
                    <span className="font-medium">{i.mg} mg</span>{" "}
                    <span className="text-zinc-500">
                      at {fmtClock(parseTimeToSeconds(i.time) / 60)}
                    </span>
                  </span>
                  <button
                    onClick={() => removeIntake(i.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    remove
                  </button>
                </div>
              ))}
          </div>

          <Field label="Bedtime (24h)">
            <TextInput value={bedtime} onChange={setBedtime} placeholder="23:00" />
          </Field>
          <Result
            label="Caffeine at bedtime"
            value={fmt(atBedtime)}
            unit="mg"
            sub={
              atBedtime > 50
                ? "Likely enough to disrupt sleep"
                : atBedtime > 20
                ? "Mild — may affect sensitive sleepers"
                : "Low — unlikely to affect sleep"
            }
          />
          <div>
            <Badge tone={atBedtime > 50 ? "warn" : "accent"}>
              Half-life ≈ {HALF_LIFE}h
            </Badge>
          </div>
        </div>
        <InfoNote>
          <p>remaining = dose × 0.5^(hours_elapsed / 5).</p>
          <p>
            We sum every dose&apos;s remaining amount across the day. Individual
            half-lives vary (3–7h) with genetics, pregnancy, and medication.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>24-hour decay curve</CardTitle>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curve} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f4633" />
              <XAxis
                dataKey="minute"
                type="number"
                domain={[0, 1440]}
                ticks={[0, 360, 720, 1080, 1440]}
                tickFormatter={(m) => fmtClock(m)}
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                width={40}
                unit=""
              />
              <Tooltip
                labelFormatter={(m) => fmtClock(Number(m))}
                formatter={(v) => [`${v} mg`, "In system"]}
                contentStyle={{
                  borderRadius: 12,
                  border: "none",
                  background: "#18181b",
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              <ReferenceLine
                x={parseTimeToSeconds(bedtime) / 60}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{ value: "bed", fontSize: 10, fill: "#ef4444" }}
              />
              <Line
                type="monotone"
                dataKey="mg"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Total caffeine in your system over 24h. The red line marks your
          bedtime.
        </p>
      </Card>
    </CalcGrid>
  );
}
