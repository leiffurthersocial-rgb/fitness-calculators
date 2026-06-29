"use client";

import { useEffect, useRef, useState } from "react";

/* Shared, minimal UI primitives so every calculator looks consistent:
   rounded cards, clean inputs, labeled results, and an expandable
   "how this is calculated" note. One accent color throughout. */

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 " +
        className
      }
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
      {children}
    </h3>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {hint && <span className="text-xs font-normal text-zinc-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputBase =
  "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

/** Keep only digits and a single decimal point (no native number sanitising). */
function cleanDecimal(raw: string): string {
  let s = raw.replace(/[^0-9.]/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) {
    s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "");
  }
  return s;
}

const numToBuf = (v: number | "") =>
  v === "" || !Number.isFinite(v as number) ? "" : String(v);

export function NumberInput({
  value,
  onChange,
  step,
  min,
  max,
  placeholder,
  suffix,
}: {
  value: number | "";
  onChange: (v: number) => void;
  /** Accepted for API compatibility; ignored (input is free-form decimal). */
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  suffix?: string;
}) {
  // A text buffer holds exactly what you type — including transient states
  // like "1." or "" — which a native type=number input would discard, making
  // decimals impossible to enter. We still report a parsed number upward.
  const [buf, setBuf] = useState(() => numToBuf(value));
  const editing = useRef(false);

  // Reflect external value changes (unit switch, shared-profile sync) into the
  // buffer, but never while the user is actively editing this field.
  useEffect(() => {
    if (!editing.current && parseFloat(buf) !== value) {
      setBuf(numToBuf(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handle = (raw: string) => {
    const s = cleanDecimal(raw);
    setBuf(s);
    if (s === "" || s === ".") {
      onChange(0);
      return;
    }
    const n = parseFloat(s);
    if (!Number.isNaN(n)) {
      const clamped =
        (min != null && n < min) || (max != null && n > max)
          ? n // don't fight mid-typing; clamp on blur instead
          : n;
      onChange(clamped);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        className={inputBase + (suffix ? " pr-12" : "")}
        value={buf}
        placeholder={placeholder}
        // Select the current value on focus so you can just start typing
        // instead of clearing the seeded number first.
        onFocus={(e) => {
          editing.current = true;
          e.target.select();
        }}
        onBlur={() => {
          editing.current = false;
          // Normalise: clamp to range and drop partial input like "1." → "1".
          let n = parseFloat(buf);
          if (Number.isNaN(n)) n = 0;
          if (min != null && n < min) n = min;
          if (max != null && n > max) n = max;
          setBuf(numToBuf(n));
          if (n !== value) onChange(n);
        }}
        // Stop the mouse wheel from silently changing the value while
        // scrolling the page over a focused input — a classic annoyance.
        onWheel={(e) => e.currentTarget.blur()}
        onChange={(e) => handle(e.target.value)}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      className={inputBase}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      className={inputBase}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={
            "rounded-lg px-3 py-1.5 text-sm font-medium transition " +
            (value === o.value
              ? "bg-white text-accent-700 shadow-sm dark:bg-zinc-950 dark:text-accent-400"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A big, clearly labeled primary result. */
export function Result({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-accent-50 px-4 py-3 dark:bg-accent-900/20">
      <div className="text-xs font-medium uppercase tracking-wide text-accent-700 dark:text-accent-400">
        {label}
      </div>
      <div className="mt-0.5 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {value}
        {unit && (
          <span className="ml-1 text-base font-medium text-zinc-400">{unit}</span>
        )}
      </div>
      {sub && <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

/** A smaller stat for secondary outputs. */
export function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-zinc-400">{unit}</span>}
      </div>
    </div>
  );
}

/** Collapsible "how this is calculated" note. */
export function InfoNote({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-accent-600 dark:hover:text-accent-400"
      >
        <span className={"transition " + (open ? "rotate-90" : "")}>▸</span>
        How this is calculated
      </button>
      {open && (
        <div className="mt-2 space-y-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {children}
        </div>
      )}
    </div>
  );
}

export function Badge({
  children,
  tone = "accent",
}: {
  children: React.ReactNode;
  tone?: "accent" | "warn" | "neutral";
}) {
  const tones = {
    accent:
      "bg-accent-100 text-accent-800 dark:bg-accent-900/40 dark:text-accent-300",
    warn: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  };
  return (
    <span
      className={
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium " +
        tones[tone]
      }
    >
      {children}
    </span>
  );
}

/** An inline "which should I use?" recommendation line. */
export function Tip({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-1.5 rounded-lg bg-accent-50 px-2.5 py-1.5 text-xs leading-relaxed text-accent-800 dark:bg-accent-900/20 dark:text-accent-300">
      <span aria-hidden>💡</span>
      <span>{children}</span>
    </p>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
}) {
  const variants = {
    primary:
      "bg-accent-600 text-white hover:bg-accent-500 active:bg-accent-700",
    ghost:
      "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800",
    danger:
      "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      className={
        "rounded-xl px-3.5 py-2 text-sm font-medium transition " +
        variants[variant]
      }
    >
      {children}
    </button>
  );
}

/** Two-column grid that collapses on mobile — the standard calculator layout. */
export function CalcGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 lg:grid-cols-2">{children}</div>;
}
