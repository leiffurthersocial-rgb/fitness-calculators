"use client";

import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  Result,
  Stat,
  InfoNote,
  SegmentedControl,
  Select,
  Badge,
  Tip,
} from "../ui";
import { useLocalStorage } from "@/lib/useLocalStorage";
import {
  DAY_LABELS,
  DEFAULT_WNS_OPTIONS,
  WNS_CURVES,
  setEffectiveness,
  weeklyNetStimulus,
  weeklyNetStimulusSimple,
  workoutStimulus,
  wnsVerdict,
  type WnsCurve,
  type WnsOptions,
} from "@/lib/wns";

const PRESETS: { label: string; schedule: number[] }[] = [
  { label: "3 sets × 1/wk", schedule: [3, 0, 0, 0, 0, 0, 0] },
  { label: "1 set × 2/wk", schedule: [1, 0, 0, 1, 0, 0, 0] },
  { label: "Bro split", schedule: [12, 0, 0, 0, 0, 0, 0] },
  { label: "Upper / lower", schedule: [6, 0, 0, 6, 0, 0, 0] },
  { label: "Full body 3×", schedule: [4, 0, 4, 0, 4, 0, 0] },
  { label: "Full body 5×", schedule: [3, 3, 0, 3, 0, 3, 0] },
];

const fmt2 = (n: number) => (Math.abs(n) < 0.005 ? "0.00" : n.toFixed(2));
const signed = (n: number) => (n > 0.005 ? "+" : "") + fmt2(n);

const VERDICT = {
  growth: { label: "Net growth", tone: "accent" as const },
  maintenance: { label: "Maintenance", tone: "neutral" as const },
  loss: { label: "Net atrophy", tone: "warn" as const },
};

export default function WeeklyNetStimulus() {
  const [schedule, setSchedule] = useLocalStorage<number[]>("vital.wns.schedule", [4, 0, 4, 0, 4, 0, 0]);
  const [opts, setOpts] = useLocalStorage<WnsOptions>("vital.wns.options", DEFAULT_WNS_OPTIONS);
  const patch = (p: Partial<WnsOptions>) => setOpts((o) => ({ ...o, ...p }));

  const setDay = (day: number, sets: number) =>
    setSchedule((s) => s.map((v, i) => (i === day ? Math.max(0, Math.min(30, sets)) : v)));

  // "simple" = the calculator form (same sets every workout, evenly spaced);
  // "days" = any weekly schedule, with stimulus windows placed on real days.
  const [mode, setMode] = useLocalStorage<"simple" | "days">("vital.wns.mode", "simple");
  const [simple, setSimple] = useLocalStorage("vital.wns.simple", { frequency: 3, sets: 4 });

  const applyPreset = (sched: number[]) => {
    setSchedule(sched);
    const days = sched.filter((v) => v > 0);
    setSimple({ frequency: days.length, sets: days[0] ?? 0 });
  };
  const presetActive = (sched: number[]) => {
    if (mode === "days") return sched.every((v, i) => v === schedule[i]);
    const days = sched.filter((v) => v > 0);
    return days.length === simple.frequency && days[0] === simple.sets;
  };

  const r =
    mode === "simple"
      ? weeklyNetStimulusSimple(simple.frequency, simple.sets, opts)
      : weeklyNetStimulus(schedule, opts);
  const verdict = VERDICT[wnsVerdict(r.wns)];
  const eff = setEffectiveness(opts.rir);

  // Same weekly volume spread over 1–7 evenly spaced sessions.
  const freqData = Array.from({ length: 7 }, (_, i) => {
    const f = i + 1;
    return { f: `${f}×`, freq: f, wns: Number(weeklyNetStimulusSimple(f, r.totalSets / f, opts).wns.toFixed(2)) };
  });
  const best = freqData.reduce((a, b) => (b.wns > a.wns ? b : a));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        {/* ---- Inputs ---- */}
        <Card>
          <CardTitle>01 — Your training week</CardTitle>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-500">
              Hard sets for <strong className="text-zinc-700 dark:text-zinc-200">one muscle group</strong>.
            </p>
            <SegmentedControl
              value={mode}
              onChange={setMode}
              options={[
                { value: "simple", label: "Frequency × sets" },
                { value: "days", label: "Day by day" },
              ]}
            />
          </div>

          {mode === "simple" ? (
            <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
              <Field label="Workouts per week">
                <SegmentedControl
                  value={String(simple.frequency)}
                  onChange={(v) => setSimple((x) => ({ ...x, frequency: Number(v) }))}
                  options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: String(n) }))}
                />
              </Field>
              <Field label="Sets per workout">
                <NumberInput
                  value={simple.sets}
                  onChange={(v) => setSimple((x) => ({ ...x, sets: v }))}
                  min={0}
                  max={30}
                  suffix="sets"
                />
              </Field>
            </div>
          ) : (
          <div className="grid grid-cols-7 gap-2">
            {DAY_LABELS.map((d, i) => {
              const sets = schedule[i] ?? 0;
              const on = sets > 0;
              return (
                <div key={d} className="flex flex-col items-center gap-1.5">
                  <span className={"swiss-label " + (on ? "text-accent-600 dark:text-accent-400" : "text-zinc-400")}>
                    {d}
                  </span>
                  <button
                    type="button"
                    aria-label={`Add a set on ${d}`}
                    onClick={() => setDay(i, sets + 1)}
                    className="neu-btn h-7 w-full rounded-lg text-sm font-semibold text-zinc-500"
                  >
                    +
                  </button>
                  <div
                    className={
                      "flex h-12 w-full items-center justify-center rounded-xl text-xl font-bold tabular-nums " +
                      (on ? "neu-inset text-zinc-900 dark:text-zinc-50" : "neu-inset-sm text-zinc-300 dark:text-zinc-600")
                    }
                    aria-live="polite"
                    aria-label={`${sets} sets on ${d}`}
                  >
                    {sets}
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove a set on ${d}`}
                    onClick={() => setDay(i, sets - 1)}
                    disabled={!on}
                    className="neu-btn h-7 w-full rounded-lg text-sm font-semibold text-zinc-500 disabled:opacity-40"
                  >
                    −
                  </button>
                </div>
              );
            })}
          </div>
          )}

          <div className="mt-5">
            <div className="swiss-label mb-2 text-zinc-400">Presets</div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => {
                const active = presetActive(p.schedule);
                return (
                  <button
                    key={p.label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => applyPreset(p.schedule)}
                    className={
                      "neu-btn rounded-lg px-3 py-1.5 text-xs font-semibold " +
                      (active ? "text-accent-600 dark:text-accent-400" : "text-zinc-600 dark:text-zinc-300")
                    }
                  >
                    {p.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => applyPreset([0, 0, 0, 0, 0, 0, 0])}
                className="neu-btn rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-400"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Proximity to failure" hint={`${Math.round(eff * 5)} of 5 stimulating reps`}>
              <Select
                value={String(opts.rir)}
                onChange={(v) => patch({ rir: Number(v) })}
                options={[0, 1, 2, 3, 4, 5].map((n) => ({
                  value: String(n),
                  label: n === 0 ? "To failure (0 RIR)" : `${n} rep${n > 1 ? "s" : ""} in reserve`,
                }))}
              />
            </Field>
            <Field label="Stimulus duration" hint="per workout">
              <SegmentedControl
                value={String(opts.stimulusHours)}
                onChange={(v) => patch({ stimulusHours: Number(v) })}
                options={[
                  { value: "36", label: "36 h" },
                  { value: "48", label: "48 h" },
                  { value: "72", label: "72 h" },
                ]}
              />
            </Field>
            <Field label="Maintenance volume" hint="sets, once a week">
              <NumberInput
                value={opts.maintenanceSets}
                onChange={(v) => patch({ maintenanceSets: v })}
                min={1}
                max={10}
                suffix="sets"
              />
            </Field>
            <div className="sm:col-span-2">
            <Field label="Volume–stimulus dataset">
              <SegmentedControl
                value={opts.curve}
                onChange={(v: WnsCurve) => patch({ curve: v })}
                options={WNS_CURVES.map((c) => ({ value: c.value, label: c.label }))}
              />
            </Field>
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            {WNS_CURVES.find((c) => c.value === opts.curve)?.note}.
          </p>
        </Card>

        {/* ---- Result ---- */}
        <Card>
          <CardTitle>02 — Weekly net stimulus</CardTitle>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <Result
                  label="WNS"
                  value={signed(r.wns)}
                  unit="units"
                  sub="1 unit = the growth from one hard set"
                />
              </div>
              <div className="pt-2">
                <Badge tone={verdict.tone}>{verdict.label}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Stat label="Hypertrophy stimulus" value={fmt2(r.weeklyStimulus)} />
              <Stat label="Atrophy effect" value={"−" + fmt2(r.atrophyEffect)} />
              <Stat label="Atrophy time" value={(r.uncoveredHours / 24).toFixed(1)} unit="days" />
              <Stat label="Frequency" value={r.frequency} unit={`× · ${r.totalSets} sets`} />
            </div>

            {/* Week timeline */}
            <div>
              <div className="swiss-label mb-2 flex items-center justify-between text-zinc-400">
                <span>Week timeline</span>
                <span className="flex items-center gap-3 normal-case tracking-normal">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 bg-accent-500" /> growth
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 bg-zinc-300 dark:bg-zinc-600" /> atrophy
                  </span>
                </span>
              </div>
              <div className="neu-inset-sm grid grid-cols-7 gap-1 rounded-xl p-1.5">
                {DAY_LABELS.map((d, i) => (
                  <div key={d} className="text-center">
                    <div className="flex h-6 overflow-hidden rounded-md bg-zinc-300 dark:bg-zinc-600">
                      <div
                        className="bg-accent-500"
                        style={{ width: `${(r.coveredByDay[i] / 24) * 100}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[10px] font-medium text-zinc-400">{d}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Formula breakdown */}
            <div className="neu-inset-sm rounded-xl p-3 font-mono text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300">
              {mode === "simple" ? (
                <>
                  <div>
                    stimulus = {r.frequency} × S({fmt2(r.sessions[0]?.effectiveSets ?? 0)}) = {r.frequency} ×{" "}
                    {fmt2(r.sessions[0]?.stimulus ?? 0)} = {fmt2(r.weeklyStimulus)}
                  </div>
                  <div>
                    atrophy days = max(0, 7 − {r.frequency} × {(opts.stimulusHours / 24).toFixed(2)}) ={" "}
                    {(r.uncoveredHours / 24).toFixed(2)}
                  </div>
                </>
              ) : (
                <div>
                  Σ stimulus ={" "}
                  {r.sessions.length === 0
                    ? "0"
                    : r.sessions.map((s) => fmt2(s.stimulus)).join(" + ")}{" "}
                  = {fmt2(r.weeklyStimulus)}
                </div>
              )}
              <div>
                atrophy = {(r.uncoveredHours / 24).toFixed(2)} d × {r.atrophyRatePerDay.toFixed(3)}/d ={" "}
                {fmt2(r.atrophyEffect)}
              </div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                WNS = {fmt2(r.weeklyStimulus)} − {fmt2(r.atrophyEffect)} = {signed(r.wns)}
              </div>
            </div>
          </div>

          <InfoNote>
            <p>
              <strong>Weekly net stimulus = Σ workout hypertrophy stimulus − weekly atrophy effect.</strong>
            </p>
            <p>
              In <em>Frequency × sets</em> mode this is the calculator form used by wnscalculator.com:
              WNS = stimulus per workout × frequency − atrophy days × daily atrophy rate, with atrophy
              days = 7 − frequency × stimulus duration (never below 0). <em>Day by day</em> places each
              workout&apos;s window on its actual day, so uneven spacing and overlapping windows count.
            </p>
            <p>
              Workout stimulus: each workout&apos;s effective sets n give S(n) = n<sup>b</sup> arbitrary
              units (one hard set = 1), with b fitted so 6 sets ≈ 2× one set (Schoenfeld 2017) or 4×
              (Pelland 2024). More sets in one session add less and less.
            </p>
            <p>
              Effective sets use Beardsley&apos;s stimulating-reps model: a set to failure has ~5
              stimulating reps and each rep left in reserve removes one, so a set at {opts.rir} RIR
              counts as {eff.toFixed(1)} sets.
            </p>
            <p>
              Each workout raises growth for the stimulus duration ({opts.stimulusHours} h). Any time
              not covered by a window is atrophy time. The atrophy rate comes from the maintenance
              studies: {opts.maintenanceSets} sets once a week maintains muscle, so S(
              {opts.maintenanceSets}) = {fmt2(workoutStimulus(opts.maintenanceSets, opts.curve))} is lost
              over {((168 - opts.stimulusHours) / 24).toFixed(1)} days, which is{" "}
              {r.atrophyRatePerDay.toFixed(3)} units/day.
            </p>
          </InfoNote>
        </Card>
      </div>

      {/* ---- Frequency comparison ---- */}
      <Card>
        <CardTitle>03 — Same {r.totalSets} weekly sets, different frequency</CardTitle>
        {r.totalSets === 0 ? (
          <p className="text-sm text-zinc-500">Add some sets above to compare frequencies.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={freqData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <XAxis dataKey="f" tick={{ fontSize: 11, fill: "#8b929c" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8b929c" }} axisLine={false} tickLine={false} />
                  <ReferenceLine y={0} stroke="#8b929c" />
                  <Tooltip
                    cursor={{ fill: "#8b929c22" }}
                    formatter={(v) => [Number(v).toFixed(2), "WNS"]}
                    labelFormatter={(l) => `${l} per week`}
                    contentStyle={{ borderRadius: 12, border: "none", background: "#1c1e22", color: "#fff", fontSize: 12 }}
                  />
                  <Bar dataKey="wns" radius={[6, 6, 0, 0]}>
                    {freqData.map((d) => (
                      <Cell
                        key={d.f}
                        fill={d.freq === r.frequency ? "#e1301f" : d.freq === best.freq ? "#ef8a80" : "#b9bfc8"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 text-sm">
              <Stat label="Best frequency" value={`${best.freq}×`} unit={`/ week · ${signed(best.wns)}`} />
              <Stat label="Sets per session" value={(r.totalSets / best.freq).toFixed(1)} />
              <Tip>
                Spreading the same volume over more sessions keeps more of the week inside a growth
                window and gets more out of each set, because returns per session diminish. That is
                why Beardsley argues full-body training beats splits.
              </Tip>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
