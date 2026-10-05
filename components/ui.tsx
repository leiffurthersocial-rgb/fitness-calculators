"use client";

import { useEffect, useRef, useState } from "react";

/* Shared UI primitives so every calculator looks consistent: neumorphic
   cards (raised) and inputs (pressed in), Swiss-style uppercase labels and
   big tabular numbers, and an expandable "how this is calculated" note.
   One signal-red accent throughout. */

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
        "neu rounded-3xl p-5 sm:p-6 " +
        className
      }
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="swiss-label mb-5 flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
      <span aria-hidden className="h-2 w-2 shrink-0 bg-accent-500" />
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
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
        {label}
        {hint && <span className="text-right text-[11px] font-normal text-zinc-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputBase =
  "neu-inset w-full rounded-xl border-0 px-3.5 py-2.5 text-sm tabular-nums text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-accent-500/40 dark:text-zinc-100";

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
    <div role="group" className="neu-inset-sm inline-flex flex-wrap rounded-xl p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={
            "rounded-lg px-3 py-1.5 text-sm font-medium transition " +
            (value === o.value
              ? "neu-sm text-accent-600 dark:text-accent-400"
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
    <div className="neu-inset rounded-2xl border-l-4 border-accent-500 px-4 py-3.5">
      <div className="swiss-label text-accent-600 dark:text-accent-400">{label}</div>
      <div className="mt-1 text-3xl font-bold leading-none tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50">
        {value}
        {unit && (
          <span className="ml-1.5 text-base font-medium tracking-normal text-zinc-400">{unit}</span>
        )}
      </div>
      {sub && <div className="mt-1.5 text-xs text-zinc-500">{sub}</div>}
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
    <div className="neu-inset-sm rounded-xl px-3 py-2.5">
      <div className="swiss-label text-zinc-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
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
    <div className="mt-5 border-t border-zinc-300/60 pt-3 dark:border-zinc-700/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="swiss-label flex items-center gap-1.5 text-zinc-400 hover:text-accent-600 dark:hover:text-accent-400"
      >
        <span aria-hidden className={"transition " + (open ? "rotate-90" : "")}>▸</span>
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
      "neu-sm text-accent-600 dark:text-accent-400",
    warn: "neu-sm text-amber-700 dark:text-amber-400",
    neutral: "neu-inset-sm text-zinc-600 dark:text-zinc-300",
  };
  return (
    <span
      className={
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold " +
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
    <p className="flex gap-2 border-l-2 border-accent-500 py-0.5 pl-2.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
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
      "bg-accent-500 text-white shadow-[var(--neu-out-sm)] hover:bg-accent-600 active:shadow-[var(--neu-in-sm)]",
    ghost: "neu-btn text-zinc-700 dark:text-zinc-200",
    danger: "neu-btn text-red-600 dark:text-red-400",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      className={
        "rounded-xl px-4 py-2 text-sm font-semibold transition " +
        variants[variant]
      }
    >
      {children}
    </button>
  );
}

/** Two-column grid that collapses on mobile — the standard calculator layout. */
export function CalcGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-6 xl:grid-cols-2">{children}</div>;
}

/**
 * A subtle, dashed empty-state hint — nudges the user toward the input that
 * would light up a result. Optionally renders an action button.
 */
export function EmptyHint({
  children,
  actionLabel,
  onAction,
}: {
  children: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="neu-inset-sm flex flex-wrap items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm text-zinc-500 dark:text-zinc-400">
      <span className="flex-1">{children}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="neu-btn shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold text-accent-600 dark:text-accent-400"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
