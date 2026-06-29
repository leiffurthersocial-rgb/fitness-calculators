# Site roadmap — make it more useful, interesting & competitive

A planning doc for the whole app (not just one tool). It takes stock of what
exists, names the gaps, and lays out a phased plan with concrete touch-points,
data models and effort estimates. Written to be picked up cold.

## Where we are today

- **Stack:** Next.js 16 (App Router) + React 19 + Tailwind v4 + recharts.
  Statically exported (37 SSG pages) on Vercel. **No backend, no database.**
- **State:** a shared `Profile` and `Settings` in `localStorage`
  (`lib/profile.tsx`, `lib/settings.tsx`, `lib/useLocalStorage.ts`); a handful
  of per-tool inputs mirrored to the URL (`lib/useQueryState.ts`) for shareable
  links. Profile stats are deliberately never routed into the URL.
- **28 tools** in 6 groups (`lib/tools.ts`): Overview, Sports, Strength,
  Cardio, Body & Nutrition, Recovery.
- **Pure formula core** (`lib/formulas.ts`, tested) already has: DOTS
  pound-for-pound (`dotsScore`), VDOT/Riegel running models, lift
  classification + level tables, VO₂max methods & categories, FFMI, TDEE,
  Navy BF%, ideal weight, muscle-gain potential.

### The three structural gaps
1. **Everything is one-shot.** No memory of past results → no progress, trends
   or PRs. This is the single biggest limiter; most "interesting" features
   depend on fixing it.
2. **No gamification.** No streaks, badges, levels, or challenges to pull
   driven users back.
3. **No competition.** We compute static percentiles against norm tables but
   never turn them into a *single comparable score*, a rank, or a leaderboard.

---

## North-star ideas

- **A single "Athlete Score"** — one 0–1000 number blending strength, power,
  endurance and body-composition, each scored as an age/sex/bodyweight
  percentile. It's the currency that makes everything competitive and
  shareable: a number to chase, rank by, and post.
- **A local-first logbook** that turns the calculators into a training journal
  with trends and automatic PRs — no backend required.
- **A competition layer** for driven people: pound-for-pound and age-graded
  scoring, streaks/badges/challenges, shareable score cards, and (phase 2) an
  optional global leaderboard.

---

## Phase 1 — Local-first, ships without a backend

Everything here fits the current static architecture (localStorage + pure
formulas) and needs no infra.

### 1.1 Progress Logbook (foundational)
A small append-only log keyed by metric, persisted to localStorage, with trend
charts and automatic PR detection.

- **Data model** (`lib/logbook.ts`):
  ```ts
  type LogEntry = { id: string; date: string; metric: string; value: number; unit: string; note?: string };
  ```
  Metrics reuse existing keys (squat/bench/…/bodyweight/vo2max/5k/…).
- **Hook:** `useLogbook()` over `useLocalStorage("vital.log", [])` with
  `add/remove/clear` and selectors (`latest`, `best`, `series(metric)`).
- **UI:** a "Log this" button on result cards that writes the current
  computed value; a new **Progress** tool with a recharts line chart per
  metric and a PR badge when a new best lands.
- **Touch-points:** new `lib/logbook.ts`, new `components/calculators/Progress.tsx`,
  small additions to existing result cards, register in `lib/tools.ts` under a
  new "Track" group.
- **Effort:** M. **Unlocks:** adaptive TDEE, PR board, streaks, score history.

### 1.2 Athlete Score + percentile engine
Promote the scattered percentile logic into one engine and a composite score.

- **`lib/score.ts`:** `percentile(metric, value, {age,sex,bw})` backed by the
  existing norm tables (`STRENGTH_LEVELS`, `vo2maxCategory`, DOTS, FFMI), plus
  `athleteScore(profile, inputs)` → `{ overall, strength, power, endurance,
  bodyComp, breakdown[] }` on a 0–1000 scale.
- **UI:** a flagship **Athlete Score** tool — big number, radar of the four
  pillars (reuse the build-rater radar pattern), percentile call-outs
  ("stronger than 84% of men 30–34 at your bodyweight"), and a "what moves the
  needle most" hint.
- **Touch-points:** new `lib/score.ts` (+ tests), new tool component, sits in a
  new "Compete" group; feeds the score card (1.5) and history (via 1.1).
- **Effort:** M–L. **Value:** very high — the gamified hook and share magnet.

### 1.3 Competition calculator pack
Calculators that are the actual scoring systems of real sport — catnip for
driven people, and all pure functions.

- **Wilks / IPF GL points** (powerlifting) to sit beside the existing DOTS.
- **WMA age-grading** for running (and an age-graded % for masters athletes).
- **Fitness age** — VO₂max- and body-comp-derived "your body is ~28".
- **Pound-for-pound strength rank** combining the big lifts into one number.
- **Touch-points:** extend `lib/formulas.ts` (+ tests), new small tool
  components, `lib/toolContent.ts` entries (SEO: these are high-search terms).
- **Effort:** S–M each; ship incrementally.

### 1.4 Streaks, badges & challenges (gamification)
- **Streaks:** count consecutive days/weeks with a log entry
  (`lib/streak.ts`); show a flame + best streak.
- **Badges:** rule-driven achievements ("2×BW squat", "sub-25 5k",
  "1000-lb club", "30-day streak"), evaluated from the logbook.
- **Challenges:** rotating, time-boxed goals ("100 pull-ups this week",
  "run 20 km") with a progress ring; all evaluated locally from the log.
- **Touch-points:** `lib/achievements.ts` (pure rules over `LogEntry[]`), a
  **Challenges** tool, badge chips on the dashboard.
- **Effort:** M. **Value:** retention.

### 1.5 Shareable score card (growth, no backend)
Render the Athlete Score (or a PR) as a styled card and let users share it —
this *is* the competition when there's no server.

- **Static OG variant:** a dynamic `opengraph-image` route that reads score
  params from the URL (we already have `app/opengraph-image.tsx` to mirror).
- **In-app:** "Share my score" builds a URL with the score encoded (extend
  `useQueryState`) → Copy link / native share / Save image.
- **Effort:** M. **Value:** viral loop without infrastructure.

### 1.6 High-demand standalone calculators (breadth & interest)
Pick from, by search demand and fit:
- **Adaptive TDEE** — infer real maintenance from logged weight + intake
  (depends on 1.1). High value, very "smart".
- **Interval / EMOM / Tabata timer** — first *interactive* tool, adds stickiness
  beyond static math.
- **Reverse-diet / metabolic-adaptation planner.**
- **Sweat-rate & electrolyte calculator** (endurance).
- **Creatine loading/maintenance dose.**
- **Running power / grade-adjusted pace (GAP).**
- **Rowing split ↔ watts ↔ pace.**
- **Training load / ACWR** (acute:chronic workload ratio) — injury-risk and a
  natural fit with the logbook.
- **Effort:** S–M each.

---

## Phase 2 — Optional global competition (needs a backend)

Real leaderboards need persistence the static site doesn't have. Keep it
optional and privacy-first; the local layer must keep working with it off.

- **Minimal infra:** a Vercel serverless route (`app/api/leaderboard/route.ts`)
  backed by Vercel KV / Postgres or Upstash Redis. Store `{ handle, score,
  category, ts }` only — no PII, anonymous handles, opt-in submit.
- **Anti-cheat reality check:** client-computed scores can't be trusted, so
  frame leaderboards as "honor system / for fun", bucket by category
  (sex/age/bodyweight), and rate-limit submissions. Don't over-engineer.
- **Leaderboard UI:** filterable table, your rank highlighted, weekly resets;
  weekly challenge leaderboards tie back to 1.4.
- **Decision needed from product:** are we willing to run a backend + handle
  basic abuse/moderation, or stay 100% static and lean on shareable cards
  (1.5)? **Recommendation:** ship Phase 1 first; only add Phase 2 if the
  shareable-card loop shows real demand.
- **Effort:** L (infra + abuse handling + privacy copy).

---

## Phase 3 — Depth & polish

- **Dashboard upgrade:** turn "My numbers" into a goals-and-progress home —
  Athlete Score, active streak, current challenge, recent PRs, trend
  sparklines.
- **Program tracker:** multi-week progression on top of the single-week
  Workout Plan (5/3/1, linear, GZCL templates) with logged auto-progression.
- **Data export/import (JSON):** essential when there's no account — let driven
  users own and back up their history; also a poor-man's cross-device sync.
- **Build-rater comparison mode & FFMI-based build scoring** (see
  `docs/build-rater-roadmap.md`).
- **Accounts/sync (big):** only if Phase 2 lands and users ask for cross-device.

---

## Suggested sequencing

1. **Logbook (1.1)** — unblocks everything else.
2. **Athlete Score + percentile engine (1.2)** — the hook.
3. **Competition pack (1.3)** + **shareable card (1.5)** — the viral/competitive surface.
4. **Streaks/badges/challenges (1.4)** — retention.
5. **2–3 standalone calculators (1.6)**, led by Adaptive TDEE and the interval timer.
6. Re-evaluate **Phase 2** based on share-card traction.

## Principles to hold

- **Keep formulas pure and tested** — they're the asset; UI is disposable. Add
  to `lib/formulas.ts`/new `lib/*.ts` with a matching `.test.ts`.
- **Local-first, no lock-in** — everything works offline from localStorage;
  any backend is additive and optional.
- **Privacy by default** — no PII; profile stats never leave the device unless
  the user explicitly shares a score.
- **Reuse the design system** (`components/ui.tsx`) and existing patterns
  (radar, gauges, query-state) so new tools feel native.
- **SEO leverage** — each new calculator gets a `lib/toolContent.ts` entry;
  competition terms (Wilks, age-grading, fitness age) are high-intent searches.
