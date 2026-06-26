"use client";

import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  Button,
  InfoNote,
  CalcGrid,
  Stat,
  Badge,
} from "../ui";
import { useLocalStorage } from "@/lib/useLocalStorage";

type Phase = "work" | "break" | "long";

// Today's date key (local) for the focus-minutes tally.
const todayKey = () => new Date().toISOString().slice(0, 10);

export default function Pomodoro() {
  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [longMin, setLongMin] = useState(15);
  const [longEvery, setLongEvery] = useState(4);

  const [phase, setPhase] = useState<Phase>("work");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0); // work sessions done

  // Focused minutes per day, persisted.
  const [focusLog, setFocusLog] = useLocalStorage<Record<string, number>>(
    "vital.pomodoro",
    {}
  );

  const phaseLen = (p: Phase) =>
    (p === "work" ? workMin : p === "break" ? breakMin : longMin) * 60;

  // When config changes while idle on the work phase, keep the clock in sync.
  useEffect(() => {
    if (!running && phase === "work") setSecondsLeft(workMin * 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workMin]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  // Gentle completion tone via the Web Audio API (no asset needed).
  const chime = () => {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      const notes = [660, 880];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        osc.start(t);
        osc.stop(t + 0.36);
      });
    } catch {
      /* audio unavailable */
    }
  };

  // Handle phase transitions when the clock hits zero.
  useEffect(() => {
    if (secondsLeft > 0) return;
    chime();
    if (phase === "work") {
      // Tally focused minutes for today.
      setFocusLog((prev) => ({
        ...prev,
        [todayKey()]: (prev[todayKey()] ?? 0) + workMin,
      }));
      const nextCompleted = completed + 1;
      setCompleted(nextCompleted);
      const next: Phase = nextCompleted % longEvery === 0 ? "long" : "break";
      setPhase(next);
      setSecondsLeft(phaseLen(next));
    } else {
      setPhase("work");
      setSecondsLeft(workMin * 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const reset = () => {
    setRunning(false);
    setPhase("work");
    setSecondsLeft(workMin * 60);
  };

  const mm = String(Math.floor(Math.max(0, secondsLeft) / 60)).padStart(2, "0");
  const ss = String(Math.max(0, secondsLeft) % 60).padStart(2, "0");
  const total = phaseLen(phase);
  const progress = total > 0 ? 1 - secondsLeft / total : 0;
  const todayMinutes = focusLog[todayKey()] ?? 0;

  const phaseLabel =
    phase === "work" ? "Focus" : phase === "break" ? "Short break" : "Long break";
  const ring = phase === "work" ? "#10b981" : "#6366f1";

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Timer</CardTitle>
        <div className="flex flex-col items-center">
          {/* Progress ring */}
          <div className="relative h-56 w-56">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="currentColor"
                className="text-zinc-200 dark:text-zinc-800"
                strokeWidth="6"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke={ring}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 44}
                strokeDashoffset={2 * Math.PI * 44 * (1 - progress)}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Badge tone={phase === "work" ? "accent" : "neutral"}>
                {phaseLabel}
              </Badge>
              <div className="mt-2 font-mono text-5xl font-bold tabular-nums">
                {mm}:{ss}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                Session {completed + (phase === "work" ? 1 : 0)}
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button onClick={() => setRunning((r) => !r)}>
              {running ? "Pause" : "Start"}
            </Button>
            <Button variant="ghost" onClick={reset}>
              Reset
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setRunning(false);
                setSecondsLeft(0);
              }}
            >
              Skip
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Settings &amp; tally</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Work (min)">
            <NumberInput value={workMin} onChange={setWorkMin} min={1} suffix="min" />
          </Field>
          <Field label="Short break (min)">
            <NumberInput value={breakMin} onChange={setBreakMin} min={1} suffix="min" />
          </Field>
          <Field label="Long break (min)">
            <NumberInput value={longMin} onChange={setLongMin} min={1} suffix="min" />
          </Field>
          <Field label="Long break every">
            <NumberInput value={longEvery} onChange={setLongEvery} min={2} suffix="sessions" />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="Focused today" value={todayMinutes} unit="min" />
          <Stat label="Sessions done" value={completed} />
        </div>
        <InfoNote>
          <p>
            The Pomodoro technique alternates focused work with short breaks,
            taking a longer break every {longEvery} sessions.
          </p>
          <p>
            Focused minutes are tallied per day and saved locally, so your count
            survives a refresh.
          </p>
        </InfoNote>
      </Card>
    </CalcGrid>
  );
}
