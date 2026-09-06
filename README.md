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
| **Sports** | Sports build rater (rate your build, strength & performance for a sport + position), Workout plan generator (+ program effectiveness rating) |
| **Strength** | Rep-max (1/3/5RM + table), Training max %, Plate loading, Strength standards (squat/bench/deadlift/OHP + max-rep pull-ups; age/weight/sex/sport), Lift balance (proportions + weak-point flag), Strength score (one percentile across all lifts), RPE ↔ %1RM ↔ RIR converter (RTS chart) |
| **Mobility** | Mobility session (pick goals + minutes → a guided routine with a timer) |
| **Skills** | Skill progressions (handstand, muscle-up, front lever, planche, flips… step-by-step ladders with progress tracking) |
| **Breathwork** | CO₂ / O₂ apnea tables (guided session timer), Breath-hold score (percentile + level for your max static hold) |
| **Cardio** | VO₂ max (3 methods), Heart-rate zones (Karvonen), Pace & race predictor (Riegel), Run training paces (Daniels VDOT + HR cross-reference + equivalents), Cycling power zones (Coggan FTP + W/kg), Swim pace zones (Critical Swim Speed), Treadmill pace (incline → flat equivalent, ACSM), Race-day splits (even / negative) |
| **Body & Nutrition** | TDEE/BMR (Mifflin–St Jeor), Cut/bulk planner (calories, macros & a body-recomp timeline to a target body-fat %), Macros (+ pie chart), Body comp (Navy BF%, BMI, WHtR), Ideal weight (+ lean mass), FFMI, Muscle-gain potential (Aragon rate + FFMI ceiling), Calorie burn (METs) |
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

The **Workout plan generator** turns that into action, and then rates what it
built. Choose a goal — max strength, power, hypertrophy, all-round athletic, or
an **endurance / running program** — pick 2–6 days, a **split style**, your
equipment and an optional per-session set cap, and it builds the week.

Splits are defined as *session types* plus a **rolling weekly cycle**, not as a
fixed list of days, which is what guarantees a **frequency of at least 1.5× and
usually 2× per week for every major muscle**: on four days, Anterior/Posterior
means one anterior and one posterior session, each run twice (A, P, A, P) with
different exercise variants — not four different workouts. On an odd day count
the cycle simply rolls into the next week (U, L, U then L, U, L = 1.5× each),
and the volume and frequency read-outs report that rolling average. Splits that
can't reach the floor at a given frequency — 3-day PPL, for instance — are still
offered, but shown and scored honestly at 1×/week.

The programming follows the mechanistic view of hypertrophy popularised by
**Chris Beardsley**: only reps near failure recruit high-threshold motor units
at slow enough shortening velocities to signal growth, so the plan runs
**fewer sets, taken closer to failure, more often** — around 6–15 hard sets per
muscle per week rather than the usual 10–20, at a target RIR, with long rests
and a preference for exercises that load the muscle at long lengths (marked
⤢).

It then **rates the program's effectiveness out of 100**, on the **WNS model**
(the *weekly number of stimulating reps*: each set contributes about
`min(reps, 5 − RIR)`, primary movers in full and assisting movers at half),
weighed against everything the WNS model alone ignores — a per-set **fatigue
cost** (heavy axial compounds cost far more recovery than isolation work,
scaled by proximity to failure and load), your **recovery capacity** (training
days, sleep, life stress, whether you're in a calorie deficit, age, experience),
the **stimulus-to-fatigue ratio**, per-muscle frequency, goal specificity and
session length. You get a grade, a breakdown of every driver, flags for
under-stimulated or over-cooked muscles, and a concrete list of what to change.
Logic in [`lib/workoutPlan.ts`](lib/workoutPlan.ts) and
[`lib/programRating.ts`](lib/programRating.ts).

The **Mobility session** builder asks two questions — which of 15 goals you
want (front splits, middle splits, pancake, deep squat, overhead shoulders,
thoracic, backbend, ankles, wrists, spine, desk relief, pre-training warm-up,
wind-down…) and how many minutes you have — and lays out prep, main work and a
down-regulating finish that fits, with a **guided timer** that walks you through
every hold and side. The programming follows the flexibility literature: about
**5 minutes per week per position** captures most of the available range, so
frequency beats marathon sessions; lasting range comes from **loading the end
position** (loaded holds, PAILs/RAILs) rather than passive stretching; and a
pre-training warm-up is built from dynamic work only, since long static holds
can transiently dull force output. Model in [`lib/mobility.ts`](lib/mobility.ts).

The **Skill progressions** section covers 15 skills — freestanding handstand,
handstand push-up, muscle-up, front lever, planche, human flag, pistol squat,
one-arm push-up, L-sit → V-sit, bridge, kip-up, cartwheel → round-off, back
handspring, standing backflip and front flip. Each is a ladder of steps with an
explicit **"you own it when…" criterion**, how to train it, prerequisites, the
common mistakes and the safety rules that actually matter (flips: coach, mats
and a pit, no exceptions). Ticked steps are saved on your device, progress
counts only *consecutive* steps from the bottom, and a "what you're working on"
panel shows your next step across every skill you've started. Data in
[`lib/skills.ts`](lib/skills.ts).

The **Breathwork** tools cover apnea training. **CO₂ / O₂ tables** builds both
classic tables from your own max hold — the CO₂ table keeps the holds constant
and shrinks the rests (training CO₂ tolerance), the O₂ table keeps the rests
long and grows the holds (training hypoxic tolerance) — at three difficulty
levels, and walks you through the whole session phase by phase with a timer,
audio cues and a screen-wake lock. **Breath-hold score** turns your maximum
static hold into an age- and sex-adjusted **percentile** (a log-normal model
anchored on an untrained median of ~55 s for men and ~45 s for women, a 90th
percentile near 2 minutes and a 99.9th near 6), places you on the apnea ladder
and projects where consistent table work should take you. Both carry the
safety rules prominently: dry land only, never in or near water, never
hyperventilate. Model in [`lib/breathwork.ts`](lib/breathwork.ts).

Every tool has its **own page and URL** (`/t/<id>`) with a unique title,
meta description and canonical link, a generated **sitemap** and **robots**,
and an Open Graph share image — so individual calculators are findable and
linkable. Each tool lists its **sources & methods** (with a short FAQ where
useful), and a **Copy link / Print** bar makes results easy to share or save
as a PDF. The **/** landing page indexes everything.

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
npm test                     # run the formula unit tests (Vitest)
```

The pure formula library in [`lib/formulas.ts`](lib/formulas.ts) is covered by
a [Vitest suite](lib/formulas.test.ts) (VDOT, FFMI, muscle-gain, diet planner,
RPE, power zones, strength standards, …) so the science stays correct as it
grows, alongside suites for the [workout-plan engine](lib/workoutPlan.test.ts)
(frequency floor, stimulating reps, volume bands), the
[effectiveness rating](lib/programRating.test.ts), the
[mobility builder](lib/mobility.test.ts), the
[breathwork model](lib/breathwork.test.ts) and the
[skill ladders](lib/skills.test.ts). The app is also an installable **PWA** — a web manifest plus a small
service worker make it work offline and add-to-home-screen after the first
visit. Motion respects `prefers-reduced-motion`.

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
  workoutPlan.ts     # split engine (rolling cycles) + set/rep schemes
  programRating.ts   # WNS + fatigue model behind the effectiveness score
  mobility.ts        # mobility exercise library + session builder
  skills.ts          # skill progression ladders
  breathwork.ts      # CO₂/O₂ tables + breath-hold percentile
  units.ts           # metric/imperial conversion + time/number formatting
  profile.tsx        # shared profile context (localStorage)
  theme.tsx          # dark/light theme context
  useLocalStorage.ts # SSR-safe persisted state hook
  tools.ts           # the calculator registry (groups + components)
components/
  ui.tsx             # shared cards, inputs, results, info notes
  ProfilePanel.tsx   # collapsible profile + unit toggle
  SessionTimer.tsx   # shared guided, phase-by-phase session timer
  calculators/       # one component per calculator
```

> Estimates are for general guidance only and are not medical advice. All data
> stays in your browser.
