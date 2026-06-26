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
  Tip,
} from "../ui";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { caffeineRemaining } from "@/lib/formulas";
import { parseClockToMinutes, fmtClock, fmt } from "@/lib/units";

interface Intake {
  id: string;
  mg: number;
  time: string; // "HH:MM" 24h
}

const HALF_LIFE = 5;
// Below this many mg in your system, caffeine is unlikely to disrupt sleep.
const SLEEP_SAFE_MG = 50;

// Common sources so logging is one tap, not a guess at milligrams.
const PRESETS = [
  { label: "Espresso", mg: 65 },
  { label: "Brewed coffee", mg: 95 },
  { label: "Black tea", mg: 47 },
  { label: "Green tea", mg: 28 },
  { label: "Cola", mg: 35 },
  { label: "Energy drink", mg: 80 },
  { label: "Pre-workout", mg: 200 },
];

export default function Caffeine() {
  const [intakes, setIntakes] = useLocalStorage<Intake[]>("vital.caffeine", [
    { id: "1", mg: 95, time: "08:00" },
    { id: "2", mg: 95, time: "13:00" },
  ]);
  const [mg, setMg] = useState(95);
  const [time, setTime] = useState("15:00");
  const [bedtime, setBedtime] = useState("23:00");

  const addIntake = (amount: number, at: string) => {
    setIntakes((prev) => [...prev, { id: String(Date.now()), mg: amount, time: at }]);
  };
  const removeIntake = (id: string) =>
    setIntakes((prev) => prev.filter((i) => i.id !== id));

  const nowHHMM = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;
  };

  const { curve, atBedtime, safeTime, bedHourCont, startHour } = useMemo(() => {
    const toHours = (t: string) => parseClockToMinutes(t) / 60;
    if (intakes.length === 0) {
      return { curve: [], atBedtime: 0, safeTime: null as number | null, bedHourCont: toHours(bedtime), startHour: 0 };
    }

    // Work on a continuous timeline so a bedtime past midnight (e.g. 01:00)
    // sits AFTER the day's intakes instead of wrapping to 0.
    const intakeHours = intakes.map((i) => toHours(i.time));
    const earliest = Math.min(...intakeHours); // earliest intake only
    const latest = Math.max(...intakeHours);
    let bedHour = toHours(bedtime);
    if (bedHour < earliest) bedHour += 24; // bedtime is "tonight", after coffee

    // Total caffeine in the system at a given continuous hour.
    const totalAt = (hour: number) =>
      intakes.reduce((sum, i) => {
        const elapsed = hour - toHours(i.time);
        return elapsed >= 0 ? sum + caffeineRemaining(i.mg, elapsed, HALF_LIFE) : sum;
      }, 0);

    // Plot from an hour before the first intake to an hour past bedtime.
    const start = Math.floor(earliest) - 1;
    const end = Math.ceil(bedHour) + 1;
    const points: { hour: number; label: string; mg: number }[] = [];
    for (let h = start; h <= end; h += 0.25) {
      points.push({
        hour: h,
        label: fmtClock((h % 24) * 60),
        mg: Math.round(totalAt(h) * 10) / 10,
      });
    }

    // When does caffeine first drop below the sleep-safe threshold after the
    // last dose? (Null if it never does within the window.)
    let safe: number | null = null;
    for (let h = latest; h <= end; h += 0.25) {
      if (totalAt(h) < SLEEP_SAFE_MG) {
        safe = h;
        break;
      }
    }

    return {
      curve: points,
      atBedtime: totalAt(bedHour),
      safeTime: safe,
      bedHourCont: bedHour,
      startHour: start,
    };
  }, [intakes, bedtime]);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Log intake</CardTitle>
        <div className="space-y-4">
          {/* One-tap common sources at the current time. */}
          <div>
            <div className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Quick add (now)
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => addIntake(p.mg, nowHHMM())}
                  className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium transition hover:border-accent-500 hover:bg-accent-50 dark:border-zinc-700 dark:hover:bg-accent-900/30"
                  title={`${p.mg} mg`}
                >
                  {p.label}{" "}
                  <span className="text-zinc-400">{p.mg}mg</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
            <Field label="Amount (mg)">
              <NumberInput value={mg} onChange={setMg} step={5} suffix="mg" />
            </Field>
            <Field label="Time (24h)">
              <TextInput value={time} onChange={setTime} placeholder="15:00" />
            </Field>
            <Button onClick={() => addIntake(mg, time)}>Add</Button>
          </div>

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
                      at {fmtClock(parseClockToMinutes(i.time))}
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
            {intakes.length > 0 && (
              <button
                onClick={() => setIntakes([])}
                className="text-xs text-zinc-400 hover:text-red-500 hover:underline"
              >
                clear all
              </button>
            )}
          </div>

          <Field label="Bedtime (24h)">
            <TextInput value={bedtime} onChange={setBedtime} placeholder="23:00" />
          </Field>
          <Result
            label="Caffeine at bedtime"
            value={fmt(atBedtime)}
            unit="mg"
            sub={
              atBedtime > SLEEP_SAFE_MG
                ? "Likely enough to disrupt sleep"
                : atBedtime > 20
                ? "Mild — may affect sensitive sleepers"
                : "Low — unlikely to affect sleep"
            }
          />
          <Tip>
            {safeTime != null ? (
              <>
                You drop below the sleep-safe ~{SLEEP_SAFE_MG} mg at{" "}
                <strong>{fmtClock((safeTime % 24) * 60)}</strong>. To protect
                sleep, finish caffeine by then — for most people that means no
                coffee within ~6 hours of bed.
              </>
            ) : (
              <>
                Caffeine stays above ~{SLEEP_SAFE_MG} mg right up to bedtime.
                Try moving your last dose earlier — aim to stop ~6 hours before
                bed.
              </>
            )}
          </Tip>
        </div>
        <InfoNote>
          <p>remaining = dose × 0.5^(hours_elapsed / 5).</p>
          <p>
            We sum every dose&apos;s remaining amount across the day on a
            continuous timeline, so a past-midnight bedtime is handled
            correctly.
          </p>
          <p>
            Individual half-lives vary (3–7h) with genetics, pregnancy, and
            medication, so treat the curve as a guide.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Decay curve</CardTitle>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curve} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f4633" />
              <XAxis
                dataKey="hour"
                type="number"
                domain={[startHour, "dataMax"]}
                tickFormatter={(h) => fmtClock((h % 24) * 60)}
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
              />
              <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} width={40} />
              <Tooltip
                labelFormatter={(h) => fmtClock((Number(h) % 24) * 60)}
                formatter={(v) => [`${v} mg`, "In system"]}
                contentStyle={{
                  borderRadius: 12,
                  border: "none",
                  background: "#18181b",
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              {/* Sleep-safe threshold. */}
              <ReferenceLine
                y={SLEEP_SAFE_MG}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{ value: "sleep-safe", fontSize: 10, fill: "#f59e0b", position: "insideTopLeft" }}
              />
              <ReferenceLine
                x={bedHourCont}
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
          Total caffeine in your system. The amber line is the sleep-safe
          threshold (~{SLEEP_SAFE_MG} mg); the red line is your bedtime.
        </p>
      </Card>
    </CalcGrid>
  );
}
