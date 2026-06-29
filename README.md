# Vital — All-in-One Health & Fitness Hub

A clean, dark-mode-first single-page app with a suite of health & fitness
calculators. Built with **Next.js (App Router) + React + TypeScript + Tailwind
CSS**. No backend — each tool is self-contained and any logs live in
**localStorage**. A single **metric/imperial toggle** converts the whole app.

## Features

An opt-in **shared profile** (age, sex, height, weight, body-fat %, resting HR,
training experience) is saved on your device and auto-fills every calculator —
enter your stats once in the sidebar and edits anywhere sync everywhere. The
**My numbers** dashboard summarises your key metrics (maintenance calories, BMI,
FFMI, muscle-gain potential, healthy-weight range, HR zones, water) at a glance,
each card linking to the full tool. Every calculator still works standalone, with
one global **metric/imperial** unit toggle and a light/dark theme (dark default).
Number fields accept decimals.

| Group | Tools |
| --- | --- |
| **Overview** | My numbers (key metrics at a glance from your saved stats) |
| **Sports** | Sports build rater (rate your build, strength & performance for a sport + position), Workout plan generator |
| **Strength** | Rep-max (1/3/5RM + table), Training max %, Plate loading, Strength standards (squat/bench/deadlift/OHP + max-rep pull-ups; age/weight/sex/sport) |
| **Cardio** | VO₂ max (3 methods), Heart-rate zones (Karvonen), Pace & race predictor (Riegel), Run training paces (Daniels VDOT zone paces + race-time equivalents from a race, Cooper test or VO₂max) |
| **Body & Nutrition** | TDEE/BMR (Mifflin–St Jeor), Macros (+ pie chart), Body comp (Navy BF%, BMI, WHtR), Ideal weight (+ lean mass), FFMI, Muscle-gain potential (Aragon rate + FFMI ceiling), Calorie burn (METs) |
| **Recovery** | Caffeine half-life tracker (decay curve + presets), Sleep cycles, Water intake |

The **Sports build rater** scores four attribute groups — **physique**
(height, BMI & wingspan/ape-index vs the role's range), **strength** (relative
lifts & pull-ups), **power** (100 m sprint & vertical jump) and **endurance**
(VO₂max). Each of 18 sports' positions weights the groups by what it demands,
with per-metric emphasis on signature lifts (bench for a lineman, deadlift/squat
& sprint for a sprinter, vertical for a volleyball middle blocker). Targets are
**age-adjusted** and sex-shifted, every input is optional, and the overall is
the weighted average over only the groups you fill in. Every metric shows its
**0–100 score** next to its bar, it calls out your **biggest limiter** and
**standout**, and a **body-composition target** tells you exactly how many kg to
gain or lose to land in the role's ideal build. Model + data in
[`lib/buildRater.ts`](lib/buildRater.ts).

The **Workout plan generator** turns that into action using current training
science. Choose a goal — max strength, power, hypertrophy, all-round athletic,
or an **endurance / running program** (runs, intervals + strength support) —
pick 3–5 days, a **split style** that fits those days (Full body, PPL,
Upper/Lower, Anterior/Posterior, Push/Pull, …), your equipment (barbell /
dumbbell / bodyweight), and an optional **max sets per session** cap. It builds
a split that **trains every muscle ~2×/week**, applies a goal-based
set/rep/intensity scheme with **RIR (reps-in-reserve)** targets, lists
plyometrics and conditioning as their own rows, computes working weights from
your 1RMs, adds a set to any lift below your sport's target ratio, and reports
**weekly set volume per muscle** against evidence-based landmarks (10–20
sets/week for hypertrophy, counting secondary movers as half-sets). Logic in
[`lib/workoutPlan.ts`](lib/workoutPlan.ts).

Tools that offer multiple methods (Rep-max formula, VO₂ max test, HR-zone
method) show an inline **“which should I use?”** recommendation.

Every calculator updates live as you type, labels its outputs, and has an
expandable **“how this is calculated”** note. All formulas live in one
well-commented file: [`lib/formulas.ts`](lib/formulas.ts).

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

```bash
npm run build && npm start   # production build
```

## Deploy to Vercel (zero config)

1. Push this repo to GitHub.
2. Go to <https://vercel.com/new> and import the repo.
3. Accept the defaults (Vercel auto-detects Next.js) and click **Deploy**.

Or from the CLI:

```bash
npm i -g vercel
vercel        # preview
vercel --prod # production
```

## Project structure

```
app/
  layout.tsx         # root layout, theme/profile providers, no-flash dark mode
  page.tsx           # sidebar + mobile nav + content shell
  globals.css        # Tailwind v4 setup, accent color, class-based dark mode
lib/
  formulas.ts        # every calculation, pure & commented — tweak here
  units.ts           # metric/imperial conversion + time/number formatting
  profile.tsx        # shared profile context (localStorage)
  theme.tsx          # dark/light theme context
  useLocalStorage.ts # SSR-safe persisted state hook
  tools.ts           # the calculator registry (groups + components)
components/
  ui.tsx             # shared cards, inputs, results, info notes
  ProfilePanel.tsx   # collapsible profile + unit toggle
  calculators/       # the 15 calculator components
```

> Estimates are for general guidance only and are not medical advice. All data
> stays in your browser.
