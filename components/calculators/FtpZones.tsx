"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  Result,
  SegmentedControl,
  Stat,
  Badge,
  InfoNote,
  CalcGrid,
  Tip,
} from "../ui";
import { useUnits } from "@/lib/settings";
import { useProfile } from "@/lib/profile";
import {
  powerZones,
  ftpFrom20min,
  ftpWkgCategory,
} from "@/lib/formulas";
import { weightFromKg, weightToKg, weightUnit, fmt } from "@/lib/units";

const ZONE_COLORS = ["#94a3b8", "#22c55e", "#10b981", "#f59e0b", "#f97316", "#ef4444", "#a855f7"];

type Mode = "ftp" | "test20";

export default function FtpZones() {
  const { units } = useUnits();
  const wu = weightUnit(units);
  const { profile, patch } = useProfile();

  const [mode, setMode] = useState<Mode>("ftp");
  const [ftpInput, setFtpInput] = useState(220);
  const [power20, setPower20] = useState(240);

  const ftp = mode === "ftp" ? ftpInput : Math.round(ftpFrom20min(power20));
  const zones = powerZones(ftp);
  const wkg = profile.weightKg > 0 ? ftp / profile.weightKg : 0;
  const weightDisp = Math.round(weightFromKg(profile.weightKg, units));

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Your power</CardTitle>
        <div className="space-y-4">
          <Field label="Input">
            <SegmentedControl
              value={mode}
              onChange={setMode}
              options={[
                { value: "ftp", label: "Known FTP" },
                { value: "test20", label: "20-min test" },
              ]}
            />
          </Field>
          {mode === "ftp" ? (
            <Field label="FTP (watts)">
              <NumberInput value={ftpInput} onChange={setFtpInput} suffix="W" />
            </Field>
          ) : (
            <Field label="Average power over 20 min (watts)">
              <NumberInput value={power20} onChange={setPower20} suffix="W" />
            </Field>
          )}
          <Field label={`Bodyweight (${wu})`}>
            <NumberInput
              value={weightDisp}
              onChange={(v) => patch({ weightKg: weightToKg(v, units) })}
              suffix={wu}
            />
          </Field>

          <Result
            label="FTP"
            value={fmt(ftp, 0)}
            unit="W"
            sub={`${fmt(wkg, 2)} W/kg`}
          />
          <div>
            <Badge tone="accent">{ftpWkgCategory(wkg, profile.sex)}</Badge>
          </div>
          <Tip>
            FTP is the power you can hold for ~an hour. The 20-minute test takes
            95% of your best 20-min average as a practical estimate — warm up,
            then go all-out for 20 honest minutes.
          </Tip>
        </div>
        <InfoNote>
          <p>FTP from a 20-min test = 0.95 × 20-min average power.</p>
          <p>
            Zones are Dr Andrew Coggan&apos;s 7-zone model as a percentage of
            FTP. W/kg is your power-to-weight, the number that matters most on
            climbs — bodyweight comes from <strong>Your stats</strong>.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Training zones</CardTitle>
        <div className="space-y-2">
          {zones.map((z, i) => (
            <div key={z.zone.zone}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: ZONE_COLORS[i] }}
                  />
                  Z{z.zone.zone} · {z.zone.name}
                </span>
                <span className="tabular-nums text-zinc-500">
                  {i === zones.length - 1
                    ? `${fmt(z.lowW, 0)}+ W`
                    : `${fmt(z.lowW, 0)}–${fmt(z.highW, 0)} W`}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-zinc-400">
                {Math.round(z.zone.lowPct * 100)}–{Math.round(z.zone.highPct * 100)}% FTP ·{" "}
                {z.zone.desc}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="FTP" value={fmt(ftp, 0)} unit="W" />
          <Stat label="Power-to-weight" value={fmt(wkg, 2)} unit="W/kg" />
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          At {weightDisp} {wu}, a 20 W FTP bump is worth ~
          {fmt(20 / Math.max(1, profile.weightKg), 2)} W/kg — often faster gains
          come from losing non-functional weight than adding watts.
        </p>
      </Card>
    </CalcGrid>
  );
}
