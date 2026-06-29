# Update ideas — a running backlog

A concrete, prioritisable list of things we could build. Split into **little**
(hours, low risk, ship anytime) and **big** (multi-day, needs a design pass).
Constraint that shapes all of this: the site stays **static — no backend, no
accounts** — so everything is pure formulas + localStorage + URL state.

Already shipped: expanded Sports Build Rater (30 sports); the **Compete** group —
**Athlete Score** (0–1000 composite), Age-graded running and a multi-factor
**Biological age**; a **Sweat-rate & hydration** tool with a fluid-balance graph;
an expanded **profile** (saved lifts, VO₂max, waist); a beefed-up **My Numbers**
dashboard; reusable empty-state hints; and extra **workout-planner** controls
(conditioning / plyometrics toggles, emphasis muscle). The old Powerlifting-points
tool and the 5-10-5 agility metric were removed as redundant/uncommon.
See `docs/site-roadmap.md` for the strategic phasing.

---

## Little updates (quick wins)

### New calculators (each is one pure function + one component)
- **Wilks for a single lift** — pound-for-pound bench/deadlift-only points (bench
  meets, deadlift challenges). Reuse the coefficients we already added.
- **Relative strength ratios** — lift ÷ bodyweight with "what you're aiming for"
  bands (1×/2×/3× club chips). Pure, tiny.
- **Pace ↔ speed ↔ finish-time converter** — one box, three outputs; very high
  search volume. Reuse `paceSecPerKm` / `fmtPace`.
- **Grade-adjusted pace (GAP)** — uphill/downhill running pace equivalents.
- **Rowing split ↔ watts ↔ pace** — the Concept2 formula (watts = 2.8 / pace³).
- **Running calories** — kcal ≈ bodyweight × distance, with incline; complements
  the METs-based Calorie burn tool.
- **Sweat-rate & hydration** — weigh-in/weigh-out → fluid replacement rate.
- **Creatine dose** — loading vs maintenance from bodyweight.
- **Caffeine timing for sleep** — extend the existing tracker with a "safe to
  train / cut-off before bed" read-out.
- **One-rep-max from reps for any lift** with a tempo/RIR caveat (we have the
  Epley/Brzycki core already).
- **Macro-per-meal splitter** — divide daily macros across N meals.
- **Plate-jump / smallest-increment** helper next to plate loading.

### Improvements to existing tools
- **Add the radar pattern** (from Build Rater) to Strength score and Lift
  balance for a visual profile.
- **Seed VO₂max into the profile** so VO₂ max, Fitness age and HR-zone tools
  share one saved value (today it's re-entered per tool).
- **"Copy as text" on every result card** — a plain-text summary for pasting
  into a log/DM (no backend needed; complements the existing share link).
- **Unit-aware result rounding pass** — audit tools for ugly decimals in
  imperial.
- **Empty-state hints** — most tools could show a one-line "try this" example.
- **Per-tool FAQ coverage** — fill `lib/toolContent.ts` for the tools that still
  fall back to their blurb (better SEO, zero code).
- **Keyboard/`↑↓` step on NumberInputs** and an explicit `inputMode="decimal"`
  for mobile keypads.

### Polish / housekeeping
- **OG images per tool** — dynamic `opengraph-image` variants so shared links
  show the tool name/preview (we already have the base route).
- **Related tools footer** — "people also use…" links between adjacent
  calculators to aid discovery.
- **Search/command palette** over `ALL_TOOLS` (⌘K) — 30+ tools now justify it.
- **More buildRater tests** and snapshot the SPORTS_DB integrity invariants.

---

## Big updates (projects)

### Competition & comparison (fits the static model)
- ~~**Athlete Score**~~ — ✅ shipped (`lib/score.ts` + the Athlete score tool):
  a 0–1000 composite over strength/endurance/body-comp/power, each an
  age/sex/bodyweight percentile, with a radar and tier. Next: feed its sub-score
  percentiles into a shared "where do I rank" line across the other tools.
- **Shareable score card** — render the Athlete Score (or a PR/age-grade) as a
  styled card + dynamic OG image, encoded in the URL. The competition *is* the
  share when there's no server. Effort: M.
- **"Where do I rank" explainer** — turn every percentile we compute into a
  consistent "stronger/fitter than X% of {age,sex}" line across tools. Effort: M.

### Breadth
- **Program tracker** — multi-week progression (5/3/1, linear, GZCL) layered on
  the single-week Workout Plan, with calculated auto-progression. URL/localStorage
  only. Effort: L.
- **Interval / EMOM / Tabata timer** — the first genuinely *interactive* tool
  (audio cues, wake-lock). Adds a new "Timers" surface. Effort: M.
- **Adaptive nutrition** — reverse-diet planner and a maintenance-after-a-cut
  flow, building on the Diet planner. Effort: M.
- **Dashboard upgrade** — make "My numbers" a real home: Athlete Score, key
  percentiles, healthy ranges, and quick links, all from the saved profile.
  Effort: M.

### Data ownership (replaces accounts on a static site)
- **Export / import profile + settings as JSON** — lets driven users back up and
  move their data across devices without a login. Effort: S–M.
- **Optional global leaderboard (the one true backend item)** — a Vercel
  serverless route + KV/Postgres storing only `{handle, score, category}`,
  anonymous, opt-in, honor-system. Only worth doing if the shareable-card loop
  shows demand; brings privacy + light anti-abuse work. Effort: L.

---

## Suggested next 3
1. **Athlete Score + percentile engine** — biggest pull for driven users; static.
2. **Pace ↔ speed ↔ time converter** + **Rowing split/watts** — cheap, high-traffic.
3. **Shareable score card / OG images** — turns scores into a growth loop with no
   infrastructure.
