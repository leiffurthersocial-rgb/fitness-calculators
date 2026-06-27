/**
 * lib/buildRater.ts
 * -----------------
 * The "Sports build rater": given your anthropometry (height, weight) and
 * optional performance data (lifts, pull-ups, 100 m sprint, vertical jump,
 * VO₂max), rate how well your build matches a sport and position.
 *
 * The model scores four attribute GROUPS:
 *   • physique   — height & build (BMI) vs the role's typical range
 *   • strength   — relative lifts (×BW) & pull-ups vs target ratios
 *   • power      — 100 m sprint time & vertical jump vs targets
 *   • endurance  — VO₂max vs target
 *
 * Each position assigns an importance WEIGHT to each group. The overall score
 * is the weighted average over the groups that actually have data — groups you
 * leave blank are dropped and their weight is redistributed, so the rating only
 * ever reflects what you've entered. Physique is always present.
 *
 * All norms are male-referenced approximations (typical pro/elite averages);
 * for female athletes we shift height down and scale the performance targets.
 * It's a directional guide, not destiny.
 */

export type LiftKey = "squat" | "bench" | "deadlift" | "ohp" | "pullups";
export type AttributeGroup = "physique" | "strength" | "power" | "endurance";

export interface PerfTargets {
  // Strength — 1RM as a multiple of bodyweight (pull-ups are absolute reps).
  squat?: number;
  bench?: number;
  deadlift?: number;
  ohp?: number;
  pullups?: number;
  // Power — sprint is seconds over 100 m (lower is better); vertical is cm.
  sprint100?: number;
  vertical?: number;
  // Endurance — VO₂max in ml/kg/min.
  vo2max?: number;
}

export interface GroupWeights {
  physique: number;
  strength: number;
  power: number;
  endurance: number;
}

export interface BuildPosition {
  key: string;
  label: string;
  heightCm: [number, number];
  bmi: [number, number];
  targets: PerfTargets;
  weights: GroupWeights;
  /**
   * Optional per-metric importance WITHIN a group (default 1). This is the
   * "smart" part of the strength/power scoring: a role can emphasise its
   * signature lifts — e.g. bench for a lineman, deadlift & squat for a sprinter,
   * vertical over sprint for a jumper — so the within-group average reflects
   * what actually wins in that position rather than treating every lift alike.
   * Keys are metric ids: lifts/power/endurance plus "height" / "build" /
   * "wingspan" for the physique group.
   */
  metricWeights?: Partial<Record<string, number>>;
  note: string;
}

export interface BuildSport {
  key: string;
  label: string;
  positions: BuildPosition[];
}

// Shorthand for the common weight presets, to keep the data table readable.
const W = (
  physique: number,
  strength: number,
  power: number,
  endurance: number
): GroupWeights => ({ physique, strength, power, endurance });

export const SPORTS_DB: BuildSport[] = [
  {
    key: "basketball",
    label: "Basketball",
    positions: [
      { key: "pg", label: "Point guard", heightCm: [183, 193], bmi: [22, 25], weights: W(0.35, 0.2, 0.35, 0.1), targets: { squat: 1.6, deadlift: 1.9, pullups: 12, sprint100: 11.6, vertical: 70, vo2max: 52 }, note: "Quick, agile playmaker — speed, leaping and relative strength over size." },
      { key: "sg", label: "Shooting guard", heightCm: [193, 198], bmi: [22, 25], weights: W(0.4, 0.2, 0.35, 0.05), targets: { squat: 1.6, deadlift: 1.9, pullups: 12, sprint100: 11.6, vertical: 72 }, note: "Athletic scorer — height helps, explosive lower body matters." },
      { key: "sf", label: "Small forward", heightCm: [198, 203], bmi: [23, 26], weights: W(0.45, 0.25, 0.3, 0), targets: { squat: 1.7, bench: 1.25, deadlift: 2.0, pullups: 10, vertical: 70 }, note: "Versatile two-way wing — a blend of size, power and agility." },
      { key: "pf", label: "Power forward", heightCm: [203, 208], bmi: [24, 27], weights: W(0.5, 0.3, 0.2, 0), targets: { squat: 1.8, bench: 1.35, deadlift: 2.1, vertical: 65 }, metricWeights: { height: 1.4 }, note: "Physical interior player — size and strength to bang inside." },
      { key: "c", label: "Center", heightCm: [208, 216], bmi: [25, 28], weights: W(0.65, 0.25, 0.1, 0), targets: { squat: 1.8, bench: 1.4, deadlift: 2.1, vertical: 60 }, metricWeights: { height: 2 }, note: "Rim protector — height is the dominant trait by far." },
    ],
  },
  {
    key: "volleyball",
    label: "Volleyball",
    positions: [
      { key: "oh", label: "Outside hitter", heightCm: [193, 201], bmi: [22, 25], weights: W(0.35, 0.15, 0.45, 0.05), targets: { squat: 1.7, vertical: 78, sprint100: 11.8, pullups: 10 }, metricWeights: { vertical: 1.6, sprint100: 0.7 }, note: "All-round attacker — a huge vertical and reach drive the score." },
      { key: "opp", label: "Opposite", heightCm: [196, 203], bmi: [22, 25], weights: W(0.4, 0.15, 0.4, 0.05), targets: { squat: 1.7, vertical: 78, pullups: 10 }, note: "Power hitter opposite the setter — height plus explosive jump." },
      { key: "mb", label: "Middle blocker", heightCm: [200, 210], bmi: [22, 25], weights: W(0.45, 0.1, 0.4, 0.05), targets: { squat: 1.6, vertical: 80 }, metricWeights: { height: 2, vertical: 1.5 }, note: "Tallest on court — reach and a fast vertical to block and quick-attack." },
      { key: "set", label: "Setter", heightCm: [188, 196], bmi: [22, 25], weights: W(0.35, 0.2, 0.4, 0.05), targets: { squat: 1.6, vertical: 70, pullups: 10 }, note: "The playmaker — agility, soft hands and a solid jump-set." },
      { key: "lib", label: "Libero", heightCm: [175, 185], bmi: [22, 25], weights: W(0.2, 0.25, 0.35, 0.2), targets: { squat: 1.7, vertical: 62, sprint100: 11.8, vo2max: 52, pullups: 10 }, note: "Defensive specialist — fast, low and tireless; height doesn't matter." },
    ],
  },
  {
    key: "football",
    label: "American football",
    positions: [
      { key: "qb", label: "Quarterback", heightCm: [188, 196], bmi: [25, 28], weights: W(0.35, 0.4, 0.25, 0), targets: { squat: 1.8, bench: 1.4, deadlift: 2.0, ohp: 0.9, vertical: 65 }, note: "Tall enough to see the field; arm and lower-body power for the throw." },
      { key: "rb", label: "Running back", heightCm: [175, 183], bmi: [27, 30], weights: W(0.25, 0.35, 0.4, 0), targets: { squat: 2.2, bench: 1.5, deadlift: 2.5, pullups: 12, sprint100: 10.9, vertical: 80 }, metricWeights: { squat: 1.3, deadlift: 1.2, bench: 0.8, pullups: 0.7, sprint100: 1.2, vertical: 1.0 }, note: "Compact, explosive and powerful — elite lower-body strength and speed." },
      { key: "wr", label: "Wide receiver", heightCm: [183, 193], bmi: [24, 27], weights: W(0.3, 0.25, 0.45, 0), targets: { squat: 1.9, deadlift: 2.2, pullups: 14, sprint100: 10.7, vertical: 85 }, metricWeights: { sprint100: 1.4, vertical: 1.2, squat: 1.0, deadlift: 1.0, pullups: 0.7 }, note: "Lean and fast with springy legs — speed and vertical are everything." },
      { key: "ol", label: "Offensive lineman", heightCm: [193, 201], bmi: [33, 38], weights: W(0.45, 0.55, 0, 0), targets: { squat: 2.3, bench: 1.7, deadlift: 2.6, ohp: 1.0 }, metricWeights: { squat: 1.3, bench: 1.3, deadlift: 1.0, ohp: 0.7 }, note: "Huge and immovable — mass plus raw absolute strength; press power off the line." },
      { key: "lb", label: "Linebacker", heightCm: [185, 193], bmi: [28, 31], weights: W(0.3, 0.35, 0.35, 0), targets: { squat: 2.1, bench: 1.6, deadlift: 2.5, sprint100: 11.0, vertical: 78 }, note: "The complete athlete — size, power and speed in balance." },
      { key: "db", label: "Defensive back", heightCm: [178, 188], bmi: [24, 27], weights: W(0.25, 0.3, 0.45, 0), targets: { squat: 2.0, deadlift: 2.3, pullups: 14, sprint100: 10.7, vertical: 85 }, metricWeights: { sprint100: 1.4, vertical: 1.2, squat: 1.0, deadlift: 1.0, pullups: 0.7 }, note: "Fast and explosive with elite relative strength." },
    ],
  },
  {
    key: "soccer",
    label: "Soccer",
    positions: [
      { key: "gk", label: "Goalkeeper", heightCm: [188, 196], bmi: [23, 26], weights: W(0.5, 0.2, 0.3, 0), targets: { squat: 1.6, deadlift: 1.9, vertical: 68 }, note: "Tall with long reach and an explosive dive." },
      { key: "def", label: "Defender", heightCm: [183, 191], bmi: [22, 25], weights: W(0.35, 0.2, 0.2, 0.25), targets: { squat: 1.8, deadlift: 2.0, sprint100: 11.4, vo2max: 56 }, note: "Strong in the air and in duels — height, pace and stamina." },
      { key: "mid", label: "Midfielder", heightCm: [173, 183], bmi: [21, 24], weights: W(0.2, 0.2, 0.15, 0.45), targets: { squat: 1.7, deadlift: 1.9, vo2max: 60 }, note: "Engine of the team — endurance is king, with relative strength." },
      { key: "fwd", label: "Forward", heightCm: [175, 186], bmi: [22, 25], weights: W(0.25, 0.2, 0.35, 0.2), targets: { squat: 1.9, deadlift: 2.1, sprint100: 11.0, vo2max: 56 }, note: "Explosive and sharp — speed for the first step, stamina to press." },
    ],
  },
  {
    key: "rugby",
    label: "Rugby union",
    positions: [
      { key: "prop", label: "Prop", heightCm: [180, 188], bmi: [33, 37], weights: W(0.4, 0.55, 0.05, 0), targets: { squat: 2.2, bench: 1.6, deadlift: 2.6, ohp: 0.95 }, note: "Scrum powerhouse — heavy, with brutal absolute strength." },
      { key: "hooker", label: "Hooker", heightCm: [178, 185], bmi: [31, 35], weights: W(0.35, 0.5, 0.15, 0), targets: { squat: 2.1, bench: 1.6, deadlift: 2.5, sprint100: 12.2 }, note: "Dense and powerful, a touch more mobile than the props." },
      { key: "lock", label: "Lock", heightCm: [196, 203], bmi: [28, 31], weights: W(0.5, 0.4, 0.1, 0), targets: { squat: 2.0, bench: 1.4, deadlift: 2.4, vertical: 65 }, metricWeights: { height: 1.5 }, note: "Tall line-out target with serious pulling strength." },
      { key: "backrow", label: "Back row", heightCm: [188, 196], bmi: [28, 31], weights: W(0.3, 0.35, 0.15, 0.2), targets: { squat: 2.1, bench: 1.5, deadlift: 2.5, sprint100: 11.6, vo2max: 55 }, note: "All-action forward — power, size and a big engine." },
      { key: "halfback", label: "Scrum-half / fly-half", heightCm: [173, 183], bmi: [24, 27], weights: W(0.25, 0.3, 0.25, 0.2), targets: { squat: 1.8, deadlift: 2.1, pullups: 10, sprint100: 11.3, vo2max: 56 }, note: "Smaller, sharp and durable — agility and relative strength." },
      { key: "back", label: "Centre / back three", heightCm: [180, 190], bmi: [25, 28], weights: W(0.3, 0.25, 0.4, 0.05), targets: { squat: 2.0, deadlift: 2.3, sprint100: 11.0, vertical: 75 }, note: "Fast and powerful — explosive legs with contact strength." },
    ],
  },
  {
    key: "track",
    label: "Track & field",
    positions: [
      { key: "sprint", label: "Sprinter (100/200m)", heightCm: [175, 188], bmi: [23, 26], weights: W(0.2, 0.25, 0.55, 0), targets: { squat: 2.2, deadlift: 2.6, sprint100: 10.4, vertical: 85 }, metricWeights: { sprint100: 1.6, vertical: 1.0, squat: 1.2, deadlift: 1.2 }, note: "Pure power-to-weight — huge relative leg strength and top speed." },
      { key: "distance", label: "Distance runner", heightCm: [168, 180], bmi: [18.5, 21], weights: W(0.25, 0.1, 0.05, 0.6), targets: { squat: 1.3, deadlift: 1.6, vo2max: 70 }, note: "Light and efficient — a high VO₂max and low BMI win races." },
      { key: "jumps", label: "Jumper", heightCm: [180, 193], bmi: [21, 24], weights: W(0.25, 0.25, 0.5, 0), targets: { squat: 2.3, deadlift: 2.6, vertical: 90, sprint100: 10.8 }, metricWeights: { vertical: 1.7, sprint100: 0.9, squat: 1.2, deadlift: 1.1 }, note: "Springy and explosive — elite vertical and power per kilo." },
      { key: "throws", label: "Thrower (shot/discus)", heightCm: [188, 200], bmi: [30, 36], weights: W(0.35, 0.5, 0.15, 0), targets: { squat: 2.4, bench: 1.8, deadlift: 2.7, ohp: 1.1, vertical: 70 }, metricWeights: { bench: 1.3, ohp: 1.2, squat: 1.2, deadlift: 1.0 }, note: "Big and immensely strong — explosive upper-body press power dominates." },
    ],
  },
  {
    key: "rowing",
    label: "Rowing",
    positions: [
      { key: "heavy", label: "Heavyweight", heightCm: [188, 198], bmi: [25, 28], weights: W(0.35, 0.25, 0, 0.4), targets: { squat: 1.9, deadlift: 2.3, vo2max: 62 }, metricWeights: { height: 1.3 }, note: "Tall with long levers, a powerful posterior chain and a huge engine." },
      { key: "light", label: "Lightweight", heightCm: [178, 186], bmi: [22, 24], weights: W(0.25, 0.3, 0, 0.45), targets: { squat: 1.8, deadlift: 2.2, vo2max: 62 }, note: "Capped bodyweight — maximise strength and aerobic power while lean." },
    ],
  },
  {
    key: "swimming",
    label: "Swimming",
    positions: [
      { key: "sprint", label: "Sprint (50/100m)", heightCm: [185, 198], bmi: [23, 26], weights: W(0.4, 0.35, 0, 0.25), targets: { bench: 1.3, ohp: 0.85, pullups: 16, vo2max: 55 }, metricWeights: { pullups: 1.4, bench: 1.0, ohp: 0.9 }, note: "Tall with a long wingspan and powerful upper-body pulling." },
      { key: "distance", label: "Distance", heightCm: [180, 191], bmi: [21, 24], weights: W(0.3, 0.25, 0, 0.45), targets: { bench: 1.1, pullups: 16, vo2max: 65 }, note: "Long and lean with a tireless upper body." },
    ],
  },
  {
    key: "weightlifting",
    label: "Olympic weightlifting",
    positions: [
      { key: "lifter", label: "Weightlifter", heightCm: [160, 180], bmi: [25, 30], weights: W(0.2, 0.5, 0.3, 0), targets: { squat: 2.4, deadlift: 2.6, ohp: 1.0, vertical: 70 }, metricWeights: { squat: 1.4, ohp: 1.2, deadlift: 0.9 }, note: "Short levers help — but it's almost entirely squat strength & explosive power." },
    ],
  },
  {
    key: "powerlifting",
    label: "Powerlifting",
    positions: [
      { key: "lifter", label: "Powerlifter", heightCm: [165, 183], bmi: [26, 32], weights: W(0.15, 0.85, 0, 0), targets: { squat: 2.5, bench: 1.8, deadlift: 2.8 }, note: "Your total is the sport. Anthropometry barely matters — move big weight." },
    ],
  },
  {
    key: "crossfit",
    label: "CrossFit",
    positions: [
      { key: "athlete", label: "CrossFit athlete", heightCm: [170, 183], bmi: [25, 28], weights: W(0.2, 0.35, 0.2, 0.25), targets: { squat: 2.0, bench: 1.4, deadlift: 2.4, ohp: 1.0, pullups: 18, vo2max: 55 }, note: "A balanced engine — strong everywhere, light enough for gymnastics." },
    ],
  },
  {
    key: "combat",
    label: "Combat sports",
    positions: [
      { key: "fighter", label: "Fighter (weight-class)", heightCm: [170, 188], bmi: [23, 27], weights: W(0.25, 0.3, 0.2, 0.25), targets: { squat: 1.9, deadlift: 2.3, pullups: 14, sprint100: 11.5, vo2max: 56 }, note: "Explosive, durable strength and conditioning without leaving your division." },
    ],
  },
  {
    key: "baseball",
    label: "Baseball",
    positions: [
      { key: "pitcher", label: "Pitcher", heightCm: [188, 198], bmi: [24, 27], weights: W(0.4, 0.3, 0.3, 0), targets: { squat: 1.8, deadlift: 2.1, ohp: 0.9, vertical: 62 }, metricWeights: { height: 1.4 }, note: "Tall leverage for downhill velocity — lower-body drive and rotational power." },
      { key: "catcher", label: "Catcher", heightCm: [175, 185], bmi: [26, 29], weights: W(0.3, 0.45, 0.25, 0), targets: { squat: 1.9, deadlift: 2.2, vertical: 58 }, note: "Sturdy and durable — squatting strength and a quick, powerful core." },
      { key: "infield", label: "Infielder", heightCm: [178, 188], bmi: [24, 26], weights: W(0.3, 0.3, 0.4, 0), targets: { squat: 1.9, deadlift: 2.2, sprint100: 11.2, vertical: 70 }, note: "Quick-twitch and agile — fast hands, feet and explosive first step." },
      { key: "outfield", label: "Outfielder", heightCm: [183, 191], bmi: [24, 27], weights: W(0.3, 0.25, 0.4, 0.05), targets: { squat: 1.9, deadlift: 2.2, sprint100: 10.9, vertical: 75 }, metricWeights: { sprint100: 1.3 }, note: "Rangy and fast — top-end speed to cover ground and a strong arm." },
    ],
  },
  {
    key: "hockey",
    label: "Ice hockey",
    positions: [
      { key: "forward", label: "Forward", heightCm: [180, 188], bmi: [26, 29], weights: W(0.25, 0.3, 0.3, 0.15), targets: { squat: 2.0, deadlift: 2.3, sprint100: 11.2, vertical: 70, vo2max: 55 }, note: "Explosive skating stride and a quick shot — power with a strong engine." },
      { key: "defense", label: "Defenseman", heightCm: [188, 196], bmi: [27, 30], weights: W(0.35, 0.35, 0.2, 0.1), targets: { squat: 2.1, deadlift: 2.4, sprint100: 11.4, vertical: 65, vo2max: 53 }, metricWeights: { height: 1.3 }, note: "Big and strong to win battles and defend the net front." },
      { key: "goalie", label: "Goaltender", heightCm: [185, 196], bmi: [24, 27], weights: W(0.5, 0.2, 0.3, 0), targets: { squat: 1.7, vertical: 60 }, metricWeights: { height: 1.4 }, note: "Tall to fill the net, with elite hip mobility and explosive lateral push." },
    ],
  },
  {
    key: "tennis",
    label: "Tennis",
    positions: [
      { key: "player", label: "Singles player", heightCm: [183, 193], bmi: [22, 25], weights: W(0.3, 0.25, 0.25, 0.2), targets: { squat: 1.8, deadlift: 2.0, sprint100: 11.4, vertical: 62, vo2max: 55 }, note: "Explosive multidirectional power and a big serve, with the engine for long rallies." },
    ],
  },
  {
    key: "cycling",
    label: "Cycling",
    positions: [
      { key: "sprint", label: "Track sprinter", heightCm: [175, 185], bmi: [25, 28], weights: W(0.2, 0.45, 0.35, 0), targets: { squat: 2.5, deadlift: 2.6, vertical: 70 }, metricWeights: { squat: 1.5, deadlift: 1.0 }, note: "Enormous leg strength and power — heavily muscled quads for raw watts." },
      { key: "road", label: "Road / climber", heightCm: [170, 182], bmi: [19, 22], weights: W(0.25, 0.1, 0.05, 0.6), targets: { squat: 1.4, deadlift: 1.7, vo2max: 70 }, note: "Light and aerobically immense — a sky-high VO₂max and low mass to haul uphill." },
    ],
  },
  {
    key: "gymnastics",
    label: "Gymnastics",
    positions: [
      { key: "artistic", label: "Artistic gymnast", heightCm: [160, 172], bmi: [22, 25], weights: W(0.2, 0.5, 0.3, 0), targets: { squat: 1.8, ohp: 0.9, pullups: 22, vertical: 70 }, metricWeights: { pullups: 1.5, ohp: 1.2 }, note: "Short, dense and absurdly strong for bodyweight — elite pressing and pulling." },
    ],
  },
  {
    key: "general",
    label: "General athletic build",
    positions: [
      { key: "athlete", label: "All-round athlete", heightCm: [170, 190], bmi: [22, 26], weights: W(0.3, 0.3, 0.2, 0.2), targets: { squat: 1.8, bench: 1.3, deadlift: 2.2, ohp: 0.9, pullups: 12, sprint100: 12.5, vertical: 55, vo2max: 45 }, note: "A well-rounded, capable physique — strong, lean, fast and fit." },
    ],
  },
];

export interface BuildInput {
  sex: "male" | "female";
  heightCm: number;
  weightKg: number;
  age?: number; // age-adjusts the performance targets (defaults to prime, 25)
  // All optional (0 / undefined = not provided). Lifts in kg, sprint in s.
  squat?: number;
  bench?: number;
  deadlift?: number;
  ohp?: number;
  pullups?: number;
  sprint100?: number;
  vertical?: number;
  vo2max?: number;
  wingspanCm?: number; // arm span, for the ape-index (reach) metric
  reach?: boolean; // does the sport reward reach? (basketball, volleyball, …)
}

export interface MetricScore {
  key: string;
  label: string;
  group: AttributeGroup;
  score: number; // 0..100 (capped for display)
  detail: string;
}

export interface GroupScore {
  group: AttributeGroup;
  label: string;
  score: number | null; // null = no data entered
  weight: number; // effective (normalised) weight in the overall
}

export interface BodyCompTarget {
  optimalMinKg: number; // lower bound of the role's ideal weight at your height
  optimalMaxKg: number; // upper bound
  currentKg: number;
  direction: "gain" | "lose" | "ideal";
  amountLoKg: number; // smaller end of the gain/lose range (0 if ideal)
  amountHiKg: number; // larger end of the gain/lose range (0 if ideal)
}

export interface BuildResult {
  overall: number; // 0..100
  verdict: string;
  groups: GroupScore[];
  metrics: MetricScore[];
  feedback: string[];
  enteredGroups: number;
  limiter: { label: string; score: number } | null; // weakest attribute
  standout: { label: string; score: number } | null; // strongest attribute
  bodyComp: BodyCompTarget; // "gain/lose X–Y kg for an optimal build"
}

/**
 * Triangular band score: 100 at the centre of the typical range, ~75 at the
 * band edges, then a gentle linear decay reaching 0 only two band-widths past
 * the edge. The gentle tail means being a bit outside the ideal range dents the
 * score rather than zeroing it (e.g. a 200 cm centre is still tall, not a 0).
 */
function bandScore(value: number, lo: number, hi: number): number {
  const ideal = (lo + hi) / 2;
  const half = (hi - lo) / 2 || 1;
  const d = Math.abs(value - ideal);
  if (d <= half) return 100 - 25 * (d / half);
  return Math.max(0, 75 - 75 * ((d - half) / (2 * half)));
}

const FEMALE_HEIGHT_SHIFT = -11; // cm
// Multipliers applied to the (male) targets for female athletes.
const FEMALE = {
  squat: 0.7, bench: 0.62, deadlift: 0.7, ohp: 0.6, pullups: 0.45,
  vertical: 0.72, vo2max: 0.88, sprint100: 1.1, // slower target time
};

const GROUP_LABELS: Record<AttributeGroup, string> = {
  physique: "Physique",
  strength: "Strength",
  power: "Power",
  endurance: "Endurance",
};

/**
 * Age scaling for STRENGTH expectations — peaks ~23–30, ramps up through the
 * teens, declines ~0.75%/yr after 30.
 */
function ageStrengthFactor(age: number): number {
  if (age < 14) return 0.72;
  if (age <= 23) return 0.9 + ((age - 14) / 9) * 0.1;
  if (age <= 30) return 1.0;
  return Math.max(0.55, 1 - (age - 30) * 0.0075);
}

/**
 * Age scaling for POWER & ENDURANCE — these peak a little earlier (~20–27) and
 * decline a touch faster than strength (~0.9%/yr), matching sprint/VO₂max norms.
 */
function agePerformanceFactor(age: number): number {
  if (age < 14) return 0.72;
  if (age <= 22) return 0.9 + ((age - 14) / 8) * 0.1;
  if (age <= 27) return 1.0;
  return Math.max(0.5, 1 - (age - 27) * 0.009);
}

export function rateBuild(input: BuildInput, position: BuildPosition): BuildResult {
  const female = input.sex === "female";
  const age = input.age && input.age > 0 ? input.age : 25;
  const aS = ageStrengthFactor(age); // strength target multiplier
  const aP = agePerformanceFactor(age); // power / endurance multiplier
  const heightM = input.heightCm / 100;
  const bmi = heightM > 0 ? input.weightKg / (heightM * heightM) : 0;
  const metrics: MetricScore[] = [];

  // ---- Body-composition target: the weight range that puts your BMI in the
  // role's typical band at your height, and how far you are from it. ----
  const optimalMinKg = position.bmi[0] * heightM * heightM;
  const optimalMaxKg = position.bmi[1] * heightM * heightM;
  let bcDir: "gain" | "lose" | "ideal" = "ideal";
  let bcLo = 0;
  let bcHi = 0;
  if (input.weightKg < optimalMinKg) {
    bcDir = "gain";
    bcLo = optimalMinKg - input.weightKg;
    bcHi = optimalMaxKg - input.weightKg;
  } else if (input.weightKg > optimalMaxKg) {
    bcDir = "lose";
    bcLo = input.weightKg - optimalMaxKg;
    bcHi = input.weightKg - optimalMinKg;
  }
  const bodyComp: BodyCompTarget = {
    optimalMinKg,
    optimalMaxKg,
    currentKg: input.weightKg,
    direction: bcDir,
    amountLoKg: bcLo,
    amountHiKg: bcHi,
  };

  // ---- Physique (always present) ----
  const hLo = position.heightCm[0] + (female ? FEMALE_HEIGHT_SHIFT : 0);
  const hHi = position.heightCm[1] + (female ? FEMALE_HEIGHT_SHIFT : 0);
  const heightScore = bandScore(input.heightCm, hLo, hHi);
  const buildScore = bandScore(bmi, position.bmi[0], position.bmi[1]);
  metrics.push({
    key: "height", label: "Height", group: "physique", score: heightScore,
    detail: input.heightCm < hLo ? `Shorter than the typical ${Math.round(hLo)}–${Math.round(hHi)} cm`
      : input.heightCm > hHi ? `Taller than the typical ${Math.round(hLo)}–${Math.round(hHi)} cm`
      : "Right in the typical range",
  });
  metrics.push({
    key: "build", label: "Build (BMI)", group: "physique", score: buildScore,
    detail: bmi < position.bmi[0] ? "Leaner/lighter than typical — consider adding mass"
      : bmi > position.bmi[1] ? "Heavier than typical for the role" : "Well-matched build",
  });

  // ---- Helper to score & record one performance metric ----
  const t = position.targets;
  const addMetric = (
    key: string, label: string, group: AttributeGroup,
    actual: number | undefined, baseTarget: number | undefined,
    opts: { relative?: boolean; lowerBetter?: boolean; femaleKey?: keyof typeof FEMALE; unit?: string; ageMult?: number }
  ) => {
    if (baseTarget == null || !actual || actual <= 0) return;
    let target = baseTarget;
    if (female && opts.femaleKey) target *= FEMALE[opts.femaleKey];
    // Age-adjust the bar: older/younger athletes are judged against age-fair
    // targets. A lower required time (lowerBetter) gets *easier* with age.
    const ageMult = opts.ageMult ?? 1;
    target = opts.lowerBetter ? target / ageMult : target * ageMult;
    let attainment: number;
    let detail: string;
    if (opts.lowerBetter) {
      attainment = target / actual; // faster time → >1
      detail = `${actual.toFixed(2)}s vs ~${target.toFixed(2)}s target`;
    } else if (opts.relative) {
      const ratio = actual / input.weightKg;
      attainment = ratio / target;
      detail = `${ratio.toFixed(2)}×BW vs ~${target.toFixed(2)}× target`;
    } else {
      attainment = actual / target;
      detail = `${Math.round(actual)}${opts.unit ?? ""} vs ~${Math.round(target)}${opts.unit ?? ""} target`;
    }
    metrics.push({ key, label, group, score: Math.max(0, Math.min(115, attainment * 100)), detail });
  };

  addMetric("squat", "Squat", "strength", input.squat, t.squat, { relative: true, femaleKey: "squat", ageMult: aS });
  addMetric("bench", "Bench", "strength", input.bench, t.bench, { relative: true, femaleKey: "bench", ageMult: aS });
  addMetric("deadlift", "Deadlift", "strength", input.deadlift, t.deadlift, { relative: true, femaleKey: "deadlift", ageMult: aS });
  addMetric("ohp", "Overhead press", "strength", input.ohp, t.ohp, { relative: true, femaleKey: "ohp", ageMult: aS });
  addMetric("pullups", "Pull-ups", "strength", input.pullups, t.pullups, { femaleKey: "pullups", unit: " reps", ageMult: aS });
  addMetric("sprint100", "100 m sprint", "power", input.sprint100, t.sprint100, { lowerBetter: true, femaleKey: "sprint100", ageMult: aP });
  addMetric("vertical", "Vertical jump", "power", input.vertical, t.vertical, { femaleKey: "vertical", unit: " cm", ageMult: aP });
  addMetric("vo2max", "VO₂max", "endurance", input.vo2max, t.vo2max, { femaleKey: "vo2max", ageMult: aP });

  // Wingspan / ape index — long arms help in reach sports (basketball,
  // volleyball, swimming, combat). Scored within physique when provided.
  if (input.wingspanCm && input.wingspanCm > 0 && input.heightCm > 0) {
    const ape = input.wingspanCm / input.heightCm;
    const apeTarget = input.reach ? 1.05 : 1.0; // reach sports reward longer arms
    metrics.push({
      key: "wingspan", label: "Wingspan (ape index)", group: "physique",
      score: Math.max(0, Math.min(115, (ape / apeTarget) * 100)),
      detail: `ape index ${ape.toFixed(2)} vs ~${apeTarget.toFixed(2)} ideal`,
    });
  }

  // ---- Aggregate into groups ----
  const mw = position.metricWeights ?? {};
  const groupScoreRaw = (group: AttributeGroup): number | null => {
    const ms = metrics.filter((m) => m.group === group);
    if (ms.length === 0) return null;
    // Weighted average within the group using per-metric importance.
    let wsum = 0;
    let acc = 0;
    for (const m of ms) {
      const w = mw[m.key] ?? 1;
      acc += Math.min(100, m.score) * w;
      wsum += w;
    }
    return wsum > 0 ? acc / wsum : null;
  };

  const present: { group: AttributeGroup; score: number; weight: number }[] = [];
  (["physique", "strength", "power", "endurance"] as AttributeGroup[]).forEach((g) => {
    const sc = groupScoreRaw(g);
    if (sc != null) present.push({ group: g, score: sc, weight: position.weights[g] });
  });

  // Normalise weights over the present groups (physique always present, so the
  // denominator is never zero). Give physique a small floor so a role with
  // physique weight 0 still counts a bit when only physique is entered.
  const totalWeight = present.reduce((s, p) => s + p.weight, 0) || 1;
  const overall = Math.round(
    present.reduce((s, p) => s + (p.weight / totalWeight) * p.score, 0)
  );

  const groups: GroupScore[] = (
    ["physique", "strength", "power", "endurance"] as AttributeGroup[]
  ).map((g) => {
    const p = present.find((x) => x.group === g);
    return {
      group: g,
      label: GROUP_LABELS[g],
      score: p ? Math.round(p.score) : null,
      weight: p ? p.weight / totalWeight : 0,
    };
  });

  // ---- Verdict & feedback ----
  const verdict =
    overall >= 85 ? "Elite-level build"
    : overall >= 70 ? "Excellent fit"
    : overall >= 58 ? "Good fit"
    : overall >= 45 ? "Developing"
    : "Different build";

  const feedback: string[] = [];
  if (heightScore < 60)
    feedback.push(input.heightCm < hLo
      ? "You're shorter than typical for this role — lean into leverage, speed and skill."
      : "You're taller than typical — use your reach and levers to your advantage.");
  if (buildScore < 60)
    feedback.push(bmi < position.bmi[0]
      ? "Adding lean mass would move your build toward the position norm."
      : "Trimming some mass would bring your build closer to the position norm.");

  const perf = metrics.filter((m) => m.group !== "physique");
  const weak = perf.filter((m) => m.score < 80).sort((a, b) => a.score - b.score).slice(0, 2);
  for (const m of weak) feedback.push(`Build your ${m.label.toLowerCase()} — it's below the target for this role.`);
  const strong = perf.filter((m) => m.score >= 100);
  if (strong.length) feedback.push(`Standout: ${strong.map((m) => m.label.toLowerCase()).join(", ")}.`);

  const enteredGroups = present.length;
  if (enteredGroups === 1)
    feedback.push("Add your lifts, sprint, vertical or VO₂max to factor performance into the rating — right now it's physique only.");
  else if (perf.length > 0 && weak.length === 0 && strong.length === 0)
    feedback.push("Solid across the metrics you entered — well matched to this role.");
  if (feedback.length === 0)
    feedback.push("Strong match across the board — your build and performance suit this role well.");

  // Biggest limiter & standout across every scored metric (capped at 100).
  const capped = metrics.map((m) => ({ label: m.label, score: Math.round(Math.min(100, m.score)) }));
  const limiter = capped.length ? capped.reduce((a, b) => (b.score < a.score ? b : a)) : null;
  const best = capped.length ? capped.reduce((a, b) => (b.score > a.score ? b : a)) : null;
  const standout = best && best.score >= 90 ? best : null;

  return { overall, verdict, groups, metrics, feedback, enteredGroups, limiter, standout, bodyComp };
}
