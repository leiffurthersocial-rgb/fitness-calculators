/**
 * lib/buildRater.ts
 * -----------------
 * The "Sports build rater": given your anthropometry (height, weight) and
 * strength (bench / squat / deadlift / OHP / pull-ups), rate how well your
 * build matches a chosen sport and position.
 *
 * The model has two halves:
 *   • Anthropometry — how close your height & build (BMI) sit to the position's
 *     typical range.
 *   • Strength/power — how your relative strength compares to target ratios for
 *     the lifts that matter in that role.
 * A position weights the two halves (`physiqueWeight`) — a basketball centre is
 * mostly anthropometry; a powerlifter is almost all strength.
 *
 * All norms are male-referenced and approximate (drawn from typical pro/elite
 * athlete averages); for female athletes we shift height down and scale
 * strength targets. Treat the score as a fun, directional guide — not destiny.
 */

export type LiftKey = "squat" | "bench" | "deadlift" | "ohp" | "pullups";

export interface StrengthTargets {
  squat?: number; // 1RM as a multiple of bodyweight
  bench?: number;
  deadlift?: number;
  ohp?: number;
  pullups?: number; // absolute reps
}

export interface BuildPosition {
  key: string;
  label: string;
  heightCm: [number, number]; // typical height band (male reference)
  bmi: [number, number]; // typical build (BMI) band
  targets: StrengthTargets; // "good athlete" strength for the role
  physiqueWeight: number; // 0..1 share of the score from anthropometry
  note: string;
}

export interface BuildSport {
  key: string;
  label: string;
  positions: BuildPosition[];
}

// "Good athlete" reference strength used as the 100% mark for each role.
export const SPORTS_DB: BuildSport[] = [
  {
    key: "basketball",
    label: "Basketball",
    positions: [
      { key: "pg", label: "Point guard", heightCm: [183, 193], bmi: [22, 25], targets: { squat: 1.6, bench: 1.1, deadlift: 1.9, pullups: 12 }, physiqueWeight: 0.45, note: "Quick, agile playmaker — speed and relative strength over size." },
      { key: "sg", label: "Shooting guard", heightCm: [193, 198], bmi: [22, 25], targets: { squat: 1.6, bench: 1.15, deadlift: 1.9, pullups: 12 }, physiqueWeight: 0.5, note: "Athletic scorer — height helps, explosive lower body matters." },
      { key: "sf", label: "Small forward", heightCm: [198, 203], bmi: [23, 26], targets: { squat: 1.7, bench: 1.25, deadlift: 2.0, pullups: 10 }, physiqueWeight: 0.55, note: "Versatile two-way wing — a blend of size, power and agility." },
      { key: "pf", label: "Power forward", heightCm: [203, 208], bmi: [24, 27], targets: { squat: 1.8, bench: 1.35, deadlift: 2.1, pullups: 8 }, physiqueWeight: 0.6, note: "Physical interior player — size and strength to bang inside." },
      { key: "c", label: "Center", heightCm: [208, 216], bmi: [25, 28], targets: { squat: 1.8, bench: 1.4, deadlift: 2.1, pullups: 6 }, physiqueWeight: 0.7, note: "Rim protector — height is the dominant trait by far." },
    ],
  },
  {
    key: "football",
    label: "American football",
    positions: [
      { key: "qb", label: "Quarterback", heightCm: [188, 196], bmi: [25, 28], targets: { squat: 1.8, bench: 1.4, deadlift: 2.0, ohp: 0.9 }, physiqueWeight: 0.4, note: "Tall enough to see the field; arm and lower-body power for the throw." },
      { key: "rb", label: "Running back", heightCm: [175, 183], bmi: [27, 30], targets: { squat: 2.2, bench: 1.5, deadlift: 2.5, pullups: 12 }, physiqueWeight: 0.4, note: "Compact, explosive and powerful — high relative strength." },
      { key: "wr", label: "Wide receiver", heightCm: [183, 193], bmi: [24, 27], targets: { squat: 1.9, bench: 1.4, deadlift: 2.2, pullups: 14 }, physiqueWeight: 0.45, note: "Lean and fast with springy, powerful legs." },
      { key: "ol", label: "Offensive lineman", heightCm: [193, 201], bmi: [33, 38], targets: { squat: 2.3, bench: 1.7, deadlift: 2.6, ohp: 1.0 }, physiqueWeight: 0.5, note: "Huge and immovable — mass plus raw absolute strength." },
      { key: "lb", label: "Linebacker", heightCm: [185, 193], bmi: [28, 31], targets: { squat: 2.1, bench: 1.6, deadlift: 2.5, pullups: 10 }, physiqueWeight: 0.45, note: "The complete athlete — size, power and speed in balance." },
      { key: "db", label: "Defensive back", heightCm: [178, 188], bmi: [24, 27], targets: { squat: 2.0, bench: 1.4, deadlift: 2.3, pullups: 14 }, physiqueWeight: 0.4, note: "Fast and explosive with elite relative strength." },
    ],
  },
  {
    key: "soccer",
    label: "Soccer",
    positions: [
      { key: "gk", label: "Goalkeeper", heightCm: [188, 196], bmi: [23, 26], targets: { squat: 1.6, deadlift: 1.9, pullups: 8 }, physiqueWeight: 0.6, note: "Tall with long reach and explosive lower body." },
      { key: "def", label: "Defender", heightCm: [183, 191], bmi: [22, 25], targets: { squat: 1.8, deadlift: 2.0, pullups: 8 }, physiqueWeight: 0.5, note: "Strong in the air and in duels — height and power help." },
      { key: "mid", label: "Midfielder", heightCm: [173, 183], bmi: [21, 24], targets: { squat: 1.7, deadlift: 1.9, pullups: 10 }, physiqueWeight: 0.35, note: "Engine of the team — endurance and relative strength over size." },
      { key: "fwd", label: "Forward", heightCm: [175, 186], bmi: [22, 25], targets: { squat: 1.9, deadlift: 2.1, pullups: 10 }, physiqueWeight: 0.4, note: "Explosive and sharp — power for the first step and finish." },
    ],
  },
  {
    key: "rugby",
    label: "Rugby union",
    positions: [
      { key: "prop", label: "Prop", heightCm: [180, 188], bmi: [33, 37], targets: { squat: 2.2, bench: 1.6, deadlift: 2.6, ohp: 0.95 }, physiqueWeight: 0.5, note: "Scrum powerhouse — heavy, with brutal absolute strength." },
      { key: "hooker", label: "Hooker", heightCm: [178, 185], bmi: [31, 35], targets: { squat: 2.1, bench: 1.6, deadlift: 2.5 }, physiqueWeight: 0.45, note: "Dense and powerful, a touch more mobile than the props." },
      { key: "lock", label: "Lock", heightCm: [196, 203], bmi: [28, 31], targets: { squat: 2.0, bench: 1.4, deadlift: 2.4 }, physiqueWeight: 0.55, note: "Tall line-out target with serious pulling strength." },
      { key: "backrow", label: "Back row", heightCm: [188, 196], bmi: [28, 31], targets: { squat: 2.1, bench: 1.5, deadlift: 2.5, pullups: 10 }, physiqueWeight: 0.45, note: "All-action forward — power, size and a big engine." },
      { key: "halfback", label: "Scrum-half / fly-half", heightCm: [173, 183], bmi: [24, 27], targets: { squat: 1.8, bench: 1.3, deadlift: 2.1, pullups: 10 }, physiqueWeight: 0.35, note: "Smaller, sharp and durable — relative strength and agility." },
      { key: "back", label: "Centre / back three", heightCm: [180, 190], bmi: [25, 28], targets: { squat: 2.0, bench: 1.4, deadlift: 2.3, pullups: 12 }, physiqueWeight: 0.4, note: "Fast and powerful — explosive legs with contact strength." },
    ],
  },
  {
    key: "track",
    label: "Track & field",
    positions: [
      { key: "sprint", label: "Sprinter (100/200m)", heightCm: [175, 188], bmi: [23, 26], targets: { squat: 2.2, deadlift: 2.6, pullups: 12 }, physiqueWeight: 0.35, note: "Pure power-to-weight — huge relative leg strength, lean build." },
      { key: "distance", label: "Distance runner", heightCm: [168, 180], bmi: [18.5, 21], targets: { squat: 1.3, deadlift: 1.6, pullups: 10 }, physiqueWeight: 0.45, note: "Light and efficient — a low BMI is a genuine advantage." },
      { key: "jumps", label: "Jumper", heightCm: [180, 193], bmi: [21, 24], targets: { squat: 2.3, deadlift: 2.6, pullups: 12 }, physiqueWeight: 0.4, note: "Springy and explosive — elite power per kilo of bodyweight." },
      { key: "throws", label: "Thrower (shot/discus)", heightCm: [188, 200], bmi: [30, 36], targets: { squat: 2.4, bench: 1.8, deadlift: 2.7, ohp: 1.1 }, physiqueWeight: 0.4, note: "Big and immensely strong — absolute power dominates." },
    ],
  },
  {
    key: "rowing",
    label: "Rowing",
    positions: [
      { key: "heavy", label: "Heavyweight", heightCm: [188, 198], bmi: [25, 28], targets: { squat: 1.9, deadlift: 2.3, pullups: 12 }, physiqueWeight: 0.45, note: "Tall with long levers and a powerful posterior chain." },
      { key: "light", label: "Lightweight", heightCm: [178, 186], bmi: [22, 24], targets: { squat: 1.8, deadlift: 2.2, pullups: 14 }, physiqueWeight: 0.4, note: "Capped bodyweight — maximise strength while staying lean." },
    ],
  },
  {
    key: "swimming",
    label: "Swimming",
    positions: [
      { key: "sprint", label: "Sprint (50/100m)", heightCm: [185, 198], bmi: [23, 26], targets: { bench: 1.3, pullups: 16, ohp: 0.85 }, physiqueWeight: 0.45, note: "Tall with a long wingspan and powerful upper-body pulling." },
      { key: "distance", label: "Distance", heightCm: [180, 191], bmi: [21, 24], targets: { bench: 1.1, pullups: 16 }, physiqueWeight: 0.4, note: "Long and lean with a tireless upper body." },
    ],
  },
  {
    key: "weightlifting",
    label: "Olympic weightlifting",
    positions: [
      { key: "lifter", label: "Weightlifter", heightCm: [160, 180], bmi: [25, 30], targets: { squat: 2.4, deadlift: 2.6, ohp: 1.0 }, physiqueWeight: 0.2, note: "Short levers help — but this is almost entirely about strength & power." },
    ],
  },
  {
    key: "powerlifting",
    label: "Powerlifting",
    positions: [
      { key: "lifter", label: "Powerlifter", heightCm: [165, 183], bmi: [26, 32], targets: { squat: 2.5, bench: 1.8, deadlift: 2.8 }, physiqueWeight: 0.15, note: "Your total is the sport. Anthropometry barely matters — move big weight." },
    ],
  },
  {
    key: "crossfit",
    label: "CrossFit",
    positions: [
      { key: "athlete", label: "CrossFit athlete", heightCm: [170, 183], bmi: [25, 28], targets: { squat: 2.0, bench: 1.4, deadlift: 2.4, ohp: 1.0, pullups: 18 }, physiqueWeight: 0.25, note: "A balanced engine — strong everywhere, light enough for gymnastics." },
    ],
  },
  {
    key: "combat",
    label: "Combat sports",
    positions: [
      { key: "fighter", label: "Fighter (weight-class)", heightCm: [170, 188], bmi: [23, 27], targets: { squat: 1.9, bench: 1.4, deadlift: 2.3, pullups: 14 }, physiqueWeight: 0.3, note: "Explosive, durable strength without drifting out of your division." },
    ],
  },
  {
    key: "general",
    label: "General athletic build",
    positions: [
      { key: "athlete", label: "All-round athlete", heightCm: [170, 190], bmi: [22, 26], targets: { squat: 1.8, bench: 1.3, deadlift: 2.2, ohp: 0.9, pullups: 12 }, physiqueWeight: 0.3, note: "A well-rounded, capable physique — strong, lean and mobile." },
    ],
  },
];

export interface BuildInput {
  sex: "male" | "female";
  heightCm: number;
  weightKg: number;
  // 1RMs in kg (0 / undefined = not provided), pull-ups in reps.
  squat?: number;
  bench?: number;
  deadlift?: number;
  ohp?: number;
  pullups?: number;
}

export interface MetricScore {
  key: string;
  label: string;
  score: number; // 0..100
  detail: string;
}

export interface BuildResult {
  overall: number; // 0..100
  verdict: string;
  anthropometryScore: number;
  strengthScore: number | null; // null when no lifts entered
  metrics: MetricScore[];
  feedback: string[];
  hasStrengthInput: boolean;
}

/** Triangular band score: 100 at the centre, ~75 at the edges, 0 a band-width out. */
function bandScore(value: number, lo: number, hi: number): number {
  const ideal = (lo + hi) / 2;
  const half = (hi - lo) / 2 || 1;
  const d = Math.abs(value - ideal);
  if (d <= half) return 100 - 25 * (d / half);
  return Math.max(0, 75 - 75 * ((d - half) / half));
}

// Female adjustments: shift typical height down and scale strength targets.
const FEMALE_HEIGHT_SHIFT = -11; // cm
const FEMALE_STRENGTH = { squat: 0.7, bench: 0.62, deadlift: 0.7, ohp: 0.6, pullups: 0.45 };

export function rateBuild(input: BuildInput, position: BuildPosition): BuildResult {
  const female = input.sex === "female";
  const heightM = input.heightCm / 100;
  const bmi = heightM > 0 ? input.weightKg / (heightM * heightM) : 0;

  // ---- Anthropometry ----
  const hLo = position.heightCm[0] + (female ? FEMALE_HEIGHT_SHIFT : 0);
  const hHi = position.heightCm[1] + (female ? FEMALE_HEIGHT_SHIFT : 0);
  const heightScore = bandScore(input.heightCm, hLo, hHi);
  const buildScore = bandScore(bmi, position.bmi[0], position.bmi[1]);
  const anthropometryScore = (heightScore + buildScore) / 2;

  const metrics: MetricScore[] = [
    {
      key: "height",
      label: "Height",
      score: heightScore,
      detail:
        input.heightCm < hLo
          ? `Shorter than the typical ${Math.round(hLo)}–${Math.round(hHi)} cm`
          : input.heightCm > hHi
          ? `Taller than the typical ${Math.round(hLo)}–${Math.round(hHi)} cm`
          : "Right in the typical range",
    },
    {
      key: "build",
      label: "Build (BMI)",
      score: buildScore,
      detail:
        bmi < position.bmi[0]
          ? "Leaner/lighter than typical — consider adding mass"
          : bmi > position.bmi[1]
          ? "Heavier than typical for the role"
          : "Well-matched build",
    },
  ];

  // ---- Strength ----
  const lifts: { key: LiftKey; label: string; actual?: number; relative: boolean }[] = [
    { key: "squat", label: "Squat", actual: input.squat, relative: true },
    { key: "bench", label: "Bench", actual: input.bench, relative: true },
    { key: "deadlift", label: "Deadlift", actual: input.deadlift, relative: true },
    { key: "ohp", label: "Overhead press", actual: input.ohp, relative: true },
    { key: "pullups", label: "Pull-ups", actual: input.pullups, relative: false },
  ];

  const strengthMetrics: MetricScore[] = [];
  for (const lift of lifts) {
    const baseTarget = position.targets[lift.key];
    if (baseTarget == null) continue; // not relevant to this role
    if (!lift.actual || lift.actual <= 0) continue; // user didn't enter it

    const target = female ? baseTarget * FEMALE_STRENGTH[lift.key] : baseTarget;
    let attainment: number;
    let detail: string;
    if (lift.relative) {
      const ratio = lift.actual / input.weightKg;
      attainment = ratio / target;
      detail = `${ratio.toFixed(2)}×BW vs ~${target.toFixed(2)}× target`;
    } else {
      attainment = lift.actual / target;
      detail = `${lift.actual} reps vs ~${Math.round(target)} target`;
    }
    const score = Math.max(0, Math.min(110, attainment * 100));
    strengthMetrics.push({ key: lift.key, label: lift.label, score, detail });
  }

  const hasStrengthInput = strengthMetrics.length > 0;
  const strengthScore = hasStrengthInput
    ? strengthMetrics.reduce((s, m) => s + Math.min(100, m.score), 0) /
      strengthMetrics.length
    : null;

  metrics.push(...strengthMetrics);

  // ---- Combine ----
  let overall: number;
  if (strengthScore == null) {
    overall = anthropometryScore; // anthropometry only
  } else {
    overall =
      position.physiqueWeight * anthropometryScore +
      (1 - position.physiqueWeight) * strengthScore;
  }
  overall = Math.round(overall);

  // ---- Verdict & feedback ----
  const verdict =
    overall >= 85
      ? "Elite-level build"
      : overall >= 70
      ? "Excellent fit"
      : overall >= 58
      ? "Good fit"
      : overall >= 45
      ? "Developing"
      : "Different build";

  const feedback: string[] = [];
  if (heightScore < 60)
    feedback.push(
      input.heightCm < hLo
        ? "You're shorter than typical for this role — lean into leverage, speed and skill."
        : "You're taller than typical — use your reach and levers to your advantage."
    );
  if (buildScore < 60)
    feedback.push(
      bmi < position.bmi[0]
        ? "Adding lean mass would move your build toward the position norm."
        : "Trimming some mass would bring your build closer to the position norm."
    );
  if (strengthScore != null) {
    const weak = strengthMetrics
      .filter((m) => m.score < 80)
      .sort((a, b) => a.score - b.score)
      .slice(0, 2);
    for (const m of weak) feedback.push(`Build your ${m.label.toLowerCase()} — it's below the target for this role.`);
    const strong = strengthMetrics.filter((m) => m.score >= 100);
    if (strong.length)
      feedback.push(`Standout strength: ${strong.map((m) => m.label.toLowerCase()).join(", ")}.`);
  }
  if (!hasStrengthInput)
    feedback.push("Enter your lifts to factor strength into the rating — right now it's anthropometry only.");
  if (feedback.length === 0)
    feedback.push("Strong match across the board — your build and strength suit this role well.");

  return {
    overall,
    verdict,
    anthropometryScore: Math.round(anthropometryScore),
    strengthScore: strengthScore == null ? null : Math.round(strengthScore),
    metrics,
    feedback,
    hasStrengthInput,
  };
}
