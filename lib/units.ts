/**
 * lib/units.ts
 * ------------
 * Unit conversions and display formatting. Internally the app stores all
 * profile data and feeds all formulas in METRIC (kg, cm, ml, meters). These
 * helpers convert to/from imperial purely at the UI boundary.
 */

export type UnitSystem = "metric" | "imperial";

/* ---- Weight: kg <-> lb ---- */
export const KG_PER_LB = 0.45359237;
export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const lbToKg = (lb: number) => lb * KG_PER_LB;

/* ---- Length: cm <-> in ---- */
export const CM_PER_IN = 2.54;
export const cmToIn = (cm: number) => cm / CM_PER_IN;
export const inToCm = (inch: number) => inch * CM_PER_IN;

/* ---- Distance: m <-> miles ---- */
export const M_PER_MILE = 1609.344;
export const mToMiles = (m: number) => m / M_PER_MILE;
export const milesToM = (mi: number) => mi * M_PER_MILE;

/* ---- Volume: ml <-> fl oz (US) ---- */
export const ML_PER_OZ = 29.5735;
export const mlToOz = (ml: number) => ml / ML_PER_OZ;
export const ozToMl = (oz: number) => oz * ML_PER_OZ;

/** Convert a weight stored in kg to the active display unit. */
export function weightFromKg(kg: number, system: UnitSystem): number {
  return system === "metric" ? kg : kgToLb(kg);
}
/** Convert a weight entered in the active display unit back to kg. */
export function weightToKg(value: number, system: UnitSystem): number {
  return system === "metric" ? value : lbToKg(value);
}

export function lengthFromCm(cm: number, system: UnitSystem): number {
  return system === "metric" ? cm : cmToIn(cm);
}
export function lengthToCm(value: number, system: UnitSystem): number {
  return system === "metric" ? value : inToCm(value);
}

/* ---- Labels ---- */
export const weightUnit = (s: UnitSystem) => (s === "metric" ? "kg" : "lb");
export const lengthUnit = (s: UnitSystem) => (s === "metric" ? "cm" : "in");
export const distanceUnit = (s: UnitSystem) => (s === "metric" ? "km" : "mi");
export const smallLengthUnit = (s: UnitSystem) => (s === "metric" ? "cm" : "in");

/** The smallest sensible plate/loading increment for a unit system. */
export const loadingIncrement = (s: UnitSystem) =>
  s === "metric" ? 2.5 : 5;

/* ---- Number / time formatting ---- */

/** Round to a fixed number of decimals and drop trailing zeros. */
export function fmt(n: number, decimals = 1): string {
  if (!isFinite(n)) return "—";
  const r = Number(n.toFixed(decimals));
  return r.toLocaleString();
}

/** Seconds -> "h:mm:ss" or "m:ss". */
export function fmtTime(totalSeconds: number): string {
  if (!isFinite(totalSeconds) || totalSeconds < 0) return "—";
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Pace in seconds/km -> "m:ss /km" (or /mi when imperial). */
export function fmtPace(secPerKm: number, system: UnitSystem): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return "—";
  const perUnit = system === "metric" ? secPerKm : secPerKm * (M_PER_MILE / 1000);
  return `${fmtTime(perUnit)} /${system === "metric" ? "km" : "mi"}`;
}

/** Parse "mm:ss" or "h:mm:ss" into seconds. Returns 0 on bad input. */
export function parseTimeToSeconds(input: string): number {
  if (!input) return 0;
  const parts = input.split(":").map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

/** Format a clock time (minutes since midnight) as "h:mm AM/PM". */
export function fmtClock(minutesSinceMidnight: number): string {
  let m = ((minutesSinceMidnight % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const min = m % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
}
