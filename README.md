# Vital — All-in-One Health & Fitness Hub

A clean, dark-mode-first single-page app with a suite of health & fitness
calculators. Built with **Next.js (App Router) + React + TypeScript + Tailwind
CSS**. No backend — each tool is self-contained and any logs live in
**localStorage**. A single **metric/imperial toggle** converts the whole app.

## Features

Every calculator is standalone (type your own stats), with one global
**metric/imperial** unit toggle. Dark mode is the default with a light toggle.

| Group | Tools |
| --- | --- |
| **Sports** | Sports build rater (rate your build, strength & performance for a sport + position), Workout plan generator |
| **Strength** | Rep-max (1/3/5RM + table), Training max %, Plate loading, Strength standards (age/weight/sex/sport) |
| **Cardio** | VO₂ max (3 methods), Heart-rate zones (Karvonen), Pace & race predictor (Riegel) |
| **Body & Nutrition** | TDEE/BMR (Mifflin–St Jeor), Macros (+ pie chart), Body comp (Navy BF%, BMI, WHtR), Ideal weight (+ lean mass), FFMI, Calorie burn (METs) |
| **Recovery** | Caffeine half-life tracker (decay curve + presets), Sleep cycles, Water intake |

The **Sports build rater** scores four attribute groups — **physique**
(height, BMI & wingspan/ape-index vs the role's range), **strength** (relative
lifts & pull-ups), **power** (100 m sprint & vertical jump) and **endurance**
(VO₂max). Each of 13 sports' positions weights the groups by what it demands,
with per-metric emphasis on signature lifts (bench for a lineman, deadlift/squat
& sprint for a sprinter, vertical for a volleyball middle blocker). Targets are
**age-adjusted** and sex-shifted, every input is optional, and the overall is
the weighted average over only the groups you fill in. It also calls out your
**biggest limiter** and **standout**. Model + data in
[`lib/buildRater.ts`](lib/buildRater.ts).

The **Workout plan generator** turns that into action using current training
science: choose a goal (or let a sport/position suggest one), pick 3–5 days and
your equipment (barbell / dumbbell / bodyweight), and it builds a split that
**trains every muscle ~2×/week**, applies a goal-based set/rep/intensity scheme
with **RIR (reps-in-reserve)** targets, computes working weights from your 1RMs,
adds a set to any lift below your sport's target ratio, and reports **weekly set
volume per muscle** against evidence-based landmarks (10–20 sets/week for
hypertrophy, counting secondary movers as half-sets). Logic in
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
