"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * A guided, phase-by-phase session timer — the thing that turns a table of
 * numbers into something you can just follow with your eyes shut.
 *
 * Shared by the breath-hold tables and the mobility sessions: hand it a list of
 * steps and it counts each one down, announces the next, tracks overall
 * progress and beeps on the changeovers. Timing is anchored to the wall clock
 * rather than accumulated ticks, so it stays accurate if the tab is throttled.
 */

export type StepTone = "prep" | "work" | "hold" | "rest";

export interface TimerStep {
  key: string;
  label: string;
  seconds: number;
  cue?: string;
  /** Small line above the label — block name, method, round, etc. */
  detail?: string;
  tone?: StepTone;
}

const TONES: Record<StepTone, { bar: string; ring: string; chip: string }> = {
  prep: {
    bar: "bg-zinc-400",
    ring: "text-zinc-500",
    chip: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  work: {
    bar: "bg-accent-500",
    ring: "text-accent-600 dark:text-accent-400",
    chip: "bg-accent-100 text-accent-800 dark:bg-accent-900/40 dark:text-accent-300",
  },
  hold: {
    bar: "bg-indigo-500",
    ring: "text-indigo-600 dark:text-indigo-400",
    chip: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  },
  rest: {
    bar: "bg-emerald-500",
    ring: "text-emerald-600 dark:text-emerald-400",
    chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
};

export function fmtDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Short tone on a phase change; silently does nothing where audio is blocked. */
function useBeeper(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  return useCallback(
    (freq = 660, ms = 140) => {
      if (!enabled) return;
      try {
        type WindowWithAudio = Window & { webkitAudioContext?: typeof AudioContext };
        const Ctor = window.AudioContext ?? (window as WindowWithAudio).webkitAudioContext;
        if (!Ctor) return;
        const ctx = (ctxRef.current ??= new Ctor());
        if (ctx.state === "suspended") void ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.type = "sine";
        // Fade out so it clicks softly rather than popping.
        gain.gain.setValueAtTime(0.14, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + ms / 1000);
      } catch {
        /* audio unavailable — the visual countdown is the source of truth */
      }
    },
    [enabled]
  );
}

export default function SessionTimer({
  steps,
  title,
  onFinish,
}: {
  steps: TimerStep[];
  title?: string;
  onFinish?: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(steps[0]?.seconds ?? 0);
  const [sound, setSound] = useState(true);
  const [done, setDone] = useState(false);
  const beep = useBeeper(sound);

  const remainingRef = useRef(remaining);
  remainingRef.current = remaining;
  const lastBeepRef = useRef(-1);

  // A stable signature of the step list: the session can be regenerated on
  // every keystroke upstream, and the timer should only reset when the actual
  // sequence changes.
  const signature = useMemo(() => steps.map((s) => `${s.key}:${s.seconds}`).join("|"), [steps]);
  const totalSec = useMemo(() => steps.reduce((s, p) => s + p.seconds, 0), [steps]);
  const elapsedBefore = useMemo(() => {
    const out: number[] = [];
    let acc = 0;
    for (const s of steps) {
      out.push(acc);
      acc += s.seconds;
    }
    return out;
  }, [steps]);

  const reset = useCallback(() => {
    setRunning(false);
    setDone(false);
    setIdx(0);
    setRemaining(steps[0]?.seconds ?? 0);
  }, [steps]);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(steps.length - 1, next));
      setIdx(clamped);
      setRemaining(steps[clamped]?.seconds ?? 0);
      lastBeepRef.current = -1;
    },
    [steps]
  );

  useEffect(() => {
    if (!running) return;
    const deadline = Date.now() + remainingRef.current * 1000;
    const id = window.setInterval(() => {
      const left = (deadline - Date.now()) / 1000;
      if (left <= 0) {
        // Phase over: move on, or finish the session.
        if (idx >= steps.length - 1) {
          setRunning(false);
          setDone(true);
          setRemaining(0);
          beep(880, 300);
          onFinish?.();
        } else {
          beep(760, 220);
          goTo(idx + 1);
        }
        return;
      }
      // Three ticks into the changeover, so you're ready for it.
      const whole = Math.ceil(left);
      if (whole <= 3 && whole !== lastBeepRef.current) {
        lastBeepRef.current = whole;
        beep(520, 90);
      }
      setRemaining(left);
    }, 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, idx, signature]);

  // Keep the screen on while a session is running, where the browser allows it.
  useEffect(() => {
    if (!running) return;
    type WakeLockSentinel = { release: () => Promise<void> };
    type NavigatorWithWakeLock = Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
    };
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const nav = navigator as NavigatorWithWakeLock;
    nav.wakeLock
      ?.request("screen")
      .then((s) => {
        if (cancelled) void s.release();
        else sentinel = s;
      })
      .catch(() => {
        /* not supported or denied — nothing to do */
      });
    return () => {
      cancelled = true;
      void sentinel?.release().catch(() => {});
    };
  }, [running]);

  if (steps.length === 0) return null;

  const step = steps[idx];
  const next = steps[idx + 1];
  const tone = TONES[step.tone ?? "work"];
  const stepPct = step.seconds > 0 ? ((step.seconds - remaining) / step.seconds) * 100 : 100;
  const overallSec = elapsedBefore[idx] + (step.seconds - remaining);
  const overallPct = totalSec > 0 ? (overallSec / totalSec) * 100 : 0;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {title ?? "Guided session"}
        </h3>
        <button
          type="button"
          onClick={() => setSound((s) => !s)}
          aria-pressed={sound}
          className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-500 transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {sound ? "🔊 Sound on" : "🔇 Sound off"}
        </button>
      </div>

      <div className="text-center">
        {step.detail && (
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
            {step.detail}
          </div>
        )}
        <div className={"text-lg font-semibold " + tone.ring}>
          {done ? "Session complete" : step.label}
        </div>
        <div
          className="mt-1 font-mono text-6xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50"
          role="timer"
          aria-live="off"
        >
          {fmtDuration(remaining)}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className={"h-full rounded-full transition-[width] duration-100 ease-linear " + tone.bar}
            style={{ width: `${Math.min(100, stepPct)}%` }}
          />
        </div>
        {step.cue && !done && (
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{step.cue}</p>
        )}
        {done && (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
            That&apos;s the whole session. Sit for a minute before you get up.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => goTo(idx - 1)}
          disabled={idx === 0}
          className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => {
            if (done) reset();
            // The first tap doubles as the gesture that unlocks audio.
            else {
              beep(600, 60);
              setRunning((r) => !r);
            }
          }}
          className="rounded-xl bg-accent-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-accent-500"
        >
          {done ? "Start again" : running ? "Pause" : idx === 0 && remaining === step.seconds ? "Start" : "Resume"}
        </button>
        <button
          type="button"
          onClick={() => (idx >= steps.length - 1 ? setDone(true) : goTo(idx + 1))}
          className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Skip →
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            Step {idx + 1} of {steps.length}
          </span>
          <span className="tabular-nums">
            {fmtDuration(overallSec)} / {fmtDuration(totalSec)}
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-zinc-400 dark:bg-zinc-600"
            style={{ width: `${Math.min(100, overallPct)}%` }}
          />
        </div>
        {next && (
          <p className="mt-2 text-xs text-zinc-400">
            Next: <span className="font-medium text-zinc-500 dark:text-zinc-400">{next.label}</span>{" "}
            · {fmtDuration(next.seconds)}
          </p>
        )}
      </div>
    </div>
  );
}
