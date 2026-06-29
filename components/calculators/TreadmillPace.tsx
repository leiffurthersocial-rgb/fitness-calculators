"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  TextInput,
  Result,
  Stat,
  InfoNote,
  CalcGrid,
} from "../ui";
import { useUnits } from "@/lib/settings";
import { inclineFlatPace } from "@/lib/formulas";
import { parseTimeToSeconds, fmtTime } from "@/lib/units";

export default function TreadmillPace() {
  const { units } = useUnits();
  const per = units === "metric" ? "km" : "mi";

  const [pace, setPace] = useState(units === "metric" ? "5:30" : "8:50");
  const [incline, setIncline] = useState(2);

  const paceSec = parseTimeToSeconds(pace);
  const flat = inclineFlatPace(paceSec, incline);
  const faster = Math.max(0, paceSec - flat);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Treadmill effort</CardTitle>
        <div className="space-y-4">
          <Field label={`Treadmill pace (m:ss / ${per})`}>
            <TextInput value={pace} onChange={setPace} placeholder="5:30" />
          </Field>
          <Field label="Incline (%)">
            <NumberInput value={incline} onChange={setIncline} suffix="%" />
          </Field>
          <Result
            label="Equivalent flat pace"
            value={`${fmtTime(flat)} /${per}`}
            sub={`Running uphill is ${fmtTime(faster)}/${per} easier than the same flat pace`}
          />
          <Stat label="Effort equals flat road at" value={`${fmtTime(flat)} /${per}`} />
        </div>
        <InfoNote>
          <p>
            Uses the ACSM running equation: at grade g the same oxygen cost is
            reached on the flat at a speed 1 + 4.5·g times faster, so your flat
            pace = treadmill pace ÷ (1 + 4.5·grade).
          </p>
          <p>
            Handy for setting an honest treadmill incline (1–2% is the usual
            nod to outdoor air resistance) or comparing hilly runs.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Why incline matters</CardTitle>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          A treadmill removes wind resistance and pulls the belt under you, so a
          flat treadmill run is slightly easier than the same pace outdoors. A
          small incline restores the difference — and steeper grades quickly add
          a lot of effort. This tool tells you what road pace your treadmill
          session actually equals.
        </p>
        <div className="mt-4 space-y-2 text-sm">
          {[1, 2, 5, 8, 10].map((g) => (
            <div key={g} className="flex justify-between border-b border-zinc-100 pb-1 dark:border-zinc-800">
              <span className="text-zinc-500">{g}% grade</span>
              <span className="font-medium tabular-nums">
                {fmtTime(inclineFlatPace(paceSec, g))} /{per}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </CalcGrid>
  );
}
