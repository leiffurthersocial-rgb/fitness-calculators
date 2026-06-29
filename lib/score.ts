/**
 * lib/score.ts
 * ------------
 * The "Athlete Score": one 0–1000 number for all-round athleticism, built from
 * four pillars that are each scored as an age/sex/bodyweight-fair percentile:
 *
 *   • strength   — the big lifts vs strength standards (reuses `strengthScore`)
 *   • endurance  — VO₂max vs age/sex norms
 *   • bodyComp   — muscularity (normalised FFMI) + leanness (body-fat range)
 *   • power      — vertical / broad jump vs norms (optional)
 *
 * Each pillar yields a 0–100 sub-score; the overall is the weighted average of
 * the pillars that actually have data, ×10. Pillars you can't fill in are
 * dropped and their weight is redistributed, so the score only reflects what
 * you've measured — and a confidence read tells you how complete it is.
 *
 * Pure logic; no React. A median, healthy trainee lands near 500.
 */

import {
  strengthScore,
  ffmi,
  vo2maxPercentile,
  type Lift,
} from "./formulas";

export type Pillar = "strength" | "endurance" | "bodyComp" | "power";

export interface AthleteInput {
  sex: "male" | "female";
  age: number;
  heightCm: number;
  weightKg: number;
  bodyFatPct?: number;
  lifts?: { squat?: number; bench?: number; deadlift?: number; ohp?: number; pullups?: number };
  vo2max?: number;
  verticalCm?: number;
  broadCm?: number;
}

export interface PillarScore {
  key: Pillar;
  label: string;
  score: number | null; // 0..100, null = no data
  weight: number; // effective (normalised) weight in the overall
}

export interface AthleteResult {
  overall: number; // 0..1000
  percentile: number; // overall / 10, the rough population percentile
  tier: string;
  pillars: PillarScore[];
  limiter: { label: string; score: number } | null;
  standout: { label: string; score: number } | null;
  confidencePct: number; // share of pillar weight that has data
  guidance: string[];
}

const PILLAR_LABEL: Record<Pillar, string> = {
  strength: "Strength",
  endurance: "Endurance",
  bodyComp: "Body comp",
  power: "Power",
};

// Default importance of each pillar; renormalised over the ones with data.
const PILLAR_WEIGHT: Record<Pillar, number> = {
  strength: 0.3,
  endurance: 0.3,
  bodyComp: 0.25,
  power: 0.15,
};

const clamp = (v: number, lo = 1, hi = 99) => Math.max(lo, Math.min(hi, v));

/** Strength pillar: percentile across the entered lifts (0 if none). */
function strengthPillar(input: AthleteInput): number | null {
  const l = input.lifts;
  if (!l) return null;
  const values: Partial<Record<Lift, number>> = {};
  if (l.squat) values.squat = l.squat;
  if (l.bench) values.bench = l.bench;
  if (l.deadlift) values.deadlift = l.deadlift;
  if (l.ohp) values.ohp = l.ohp;
  if (l.pullups) values.pullup = l.pullups;
  if (Object.keys(values).length === 0) return null;
  return strengthScore(values, input.sex, input.weightKg, input.age).score;
}

/** Endurance pillar from VO₂max vs age/sex norms. */
function endurancePillar(input: AthleteInput): number | null {
  if (!input.vo2max || input.vo2max <= 0) return null;
  return vo2maxPercentile(input.vo2max, input.age, input.sex);
}

/** Muscularity (normalised FFMI) blended with leanness (body-fat range). */
function bodyCompPillar(input: AthleteInput): number | null {
  if (input.heightCm <= 0 || input.weightKg <= 0) return null;
  const bf = input.bodyFatPct && input.bodyFatPct > 0 ? input.bodyFatPct : null;
  if (bf == null) return null;
  const nffmi = ffmi(input.weightKg, input.heightCm, bf).normalizedFfmi;
  const muscularity =
    input.sex === "female"
      ? clamp(50 + (nffmi - 15.5) * 14)
      : clamp(50 + (nffmi - 19) * 11.7);
  const athleticLow = input.sex === "female" ? 18 : 10;
  const leanness = clamp(100 - Math.max(0, bf - athleticLow) * 3.2, 10, 100);
  return 0.5 * muscularity + 0.5 * leanness;
}

/** Power pillar from vertical and/or broad jump (optional). */
function powerPillar(input: AthleteInput): number | null {
  const parts: number[] = [];
  if (input.verticalCm && input.verticalCm > 0) {
    const avg = input.sex === "female" ? 30 : 45;
    parts.push(clamp(50 + (input.verticalCm - avg) * 2.667));
  }
  if (input.broadCm && input.broadCm > 0) {
    const avg = input.sex === "female" ? 165 : 215;
    parts.push(clamp(50 + (input.broadCm - avg) * 1.0));
  }
  if (parts.length === 0) return null;
  return parts.reduce((s, p) => s + p, 0) / parts.length;
}

function tierFor(overall: number): string {
  if (overall < 350) return "Beginner";
  if (overall < 500) return "Recreational";
  if (overall < 650) return "Intermediate";
  if (overall < 800) return "Advanced";
  if (overall < 900) return "Elite";
  return "World-class";
}

export function athleteScore(input: AthleteInput): AthleteResult {
  const raw: Record<Pillar, number | null> = {
    strength: strengthPillar(input),
    endurance: endurancePillar(input),
    bodyComp: bodyCompPillar(input),
    power: powerPillar(input),
  };

  const present = (Object.keys(raw) as Pillar[]).filter((k) => raw[k] != null);
  const totalWeight =
    present.reduce((s, k) => s + PILLAR_WEIGHT[k], 0) || 1;
  const intendedWeight = (Object.keys(PILLAR_WEIGHT) as Pillar[]).reduce(
    (s, k) => s + PILLAR_WEIGHT[k],
    0
  );

  const overall100 = present.reduce(
    (s, k) => s + (PILLAR_WEIGHT[k] / totalWeight) * (raw[k] as number),
    0
  );
  const overall = Math.round(overall100 * 10);

  const pillars: PillarScore[] = (Object.keys(PILLAR_WEIGHT) as Pillar[]).map(
    (k) => ({
      key: k,
      label: PILLAR_LABEL[k],
      score: raw[k] == null ? null : Math.round(raw[k] as number),
      weight: raw[k] == null ? 0 : PILLAR_WEIGHT[k] / totalWeight,
    })
  );

  const scored = pillars.filter((p) => p.score != null) as (PillarScore & {
    score: number;
  })[];
  const limiter = scored.length
    ? scored.reduce((a, b) => (b.score < a.score ? b : a))
    : null;
  const best = scored.length
    ? scored.reduce((a, b) => (b.score > a.score ? b : a))
    : null;
  const standout = best && best.score >= 80 ? best : null;

  const confidencePct = Math.round((totalWeight / intendedWeight) * 100);

  const guidance: string[] = [];
  if (raw.strength == null) guidance.push("Add your squat, bench, deadlift or pull-ups to score strength.");
  if (raw.endurance == null) guidance.push("Add a VO₂max to score endurance.");
  if (raw.power == null) guidance.push("Enter a vertical or broad jump to score power.");
  if (limiter && limiter.score < 60)
    guidance.push(`${limiter.label} is your biggest limiter — the fastest way to raise the score.`);
  if (standout)
    guidance.push(`${standout.label} is a real strength — top ${Math.max(1, 100 - standout.score)}% territory.`);
  if (guidance.length === 0)
    guidance.push("Well-rounded across the board — push your weakest pillar to climb a tier.");

  return {
    overall,
    percentile: Math.round(overall / 10),
    tier: tierFor(overall),
    pillars,
    limiter: limiter ? { label: limiter.label, score: limiter.score } : null,
    standout: standout ? { label: standout.label, score: standout.score } : null,
    confidencePct,
    guidance,
  };
}
