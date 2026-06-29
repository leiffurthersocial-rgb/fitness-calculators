# Sports Build Rater — roadmap

A planning doc for the **Sports build rater** (`lib/buildRater.ts`,
`components/calculators/SportsBuildRater.tsx`). It records what shipped in this
update and lays out the next one in enough detail to pick up cold.

---

## What shipped (this update)

**More sports & positions.** The database grew from 18 sports to 30. New sports:
cricket, field hockey, lacrosse, team handball, water polo, rock climbing,
skiing & snow, Australian football, netball, speed skating, triathlon,
strongman and calisthenics. Single-position sports were expanded into real
position sets — combat sports now spans MMA / boxing / Muay Thai / wrestling /
BJJ / judo; tennis adds a doubles specialist; cycling adds pursuit and
time-trial; gymnastics adds rings and vault specialists.

**Two new performance metrics.** `broad` (standing long jump, cm) and `agility`
(5-10-5 pro-agility shuttle, seconds, lower-is-better) both feed the **power**
group, with sex- and age-scaling like the existing metrics. They're wired into
combine-style roles (football skill positions, basketball guards, jumpers, etc.).

**Best-fit finder.** `bestFitPositions(input, limit)` scores the athlete against
every position in the database and returns the top matches, sorted. The UI shows
a tappable top-5 list so you can jump straight to your best role. Each sport now
carries a `reach` flag so the ape-index metric is scored consistently per sport
(not from whichever sport you happen to be viewing).

**Data-confidence read-out.** `BuildResult.confidence` reports the share of the
role's intended group weight that actually has data behind it, with a label
("High confidence" → "Physique only"). Shown as a chip next to the verdict.

**Radar chart.** A recharts radar of the four group scores (physique / strength
/ power / endurance) gives an at-a-glance attribute profile.

**Tests.** `lib/buildRater.test.ts` now covers DB integrity, band scoring, the
new metrics, sex/age scaling, body-composition direction, confidence and the
best-fit finder (previously the rater had zero tests).

---

## Next update — proposed scope

Ordered roughly by value-to-effort. Each item notes the touch-points so it can
be picked up without re-discovery.

### 1. Wingspan-aware reach metric (calculation)
Today the ape-index target is a flat 1.0 / 1.05 (`reach` on/off). Improve it so
reach-critical roles (centre, middle blocker, goalkeeper, lock) get a higher
target and a stronger `metricWeights.wingspan`, and non-reach roles effectively
ignore it. Move the per-role reach emphasis into the position data rather than a
single sport-level boolean.
*Touch-points:* `bandScore`/wingspan block in `rateBuild`, `BuildPosition`.

### 2. Body-fat / FFMI input (calculation accuracy)
BMI is a blunt build proxy — it can't tell muscle from fat. Add an optional
body-fat % (or lean mass) input and, when present, score "build" off **FFMI**
against role-typical FFMI bands instead of BMI. This fixes the common
false-negative where a lean, muscular athlete is told to "lose mass".
*Touch-points:* `BuildInput`, physique scoring, `BodyCompTarget` (offer a
lean-mass target, not just a scale weight), UI input + `lib/units` if needed.
Reuse the existing FFMI calc in `lib/formulas.ts`.

### 3. "What to improve" deltas (UX)
For the current role, compute the single change that would raise the overall
score the most (e.g. "+0.2×BW on squat → +6 overall") by re-scoring with each
metric nudged. Surface the top 1–2 as actionable targets next to the feedback.
*Touch-points:* new helper in `buildRater.ts`, feedback block in the component.

### 4. Shareable / permalink result (growth)
Encode the inputs + selected role into the URL hash so a rating can be shared
and re-opened. Pairs well with an OG-image variant showing the score ring.
*Touch-points:* component state ↔ URL sync; `app` route `generateMetadata`.

### 5. Age- & sex-specific norms pass (data quality)
Current norms are male-referenced with a flat −11 cm female height shift and
fixed performance multipliers. Replace the single shift with per-group, and
ideally per-sport, female adjustments sourced from published elite norms, and
add a youth (sub-16) track that scales height bands too, not just performance.
*Touch-points:* `FEMALE`, `FEMALE_HEIGHT_SHIFT`, age factor functions.

### 6. More metrics where they're the signature test (data)
- **Grip strength** (kg) for grappling/strongman/climbing.
- **Broad-jump & agility coverage** extended to the remaining quick-twitch
  roles (hockey, soccer, lacrosse already partly done).
- **Sport-specific endurance** beyond VO₂max (e.g. 2 km row time, 5 km run) —
  scored into endurance when entered.
*Touch-points:* `PerfTargets`, `BuildInput`, `addMetric` calls, `FEMALE`.

### 7. Position comparison view (UX)
Let the user pin two roles side-by-side (group scores + body-comp) — useful for
"am I more of a winger or a centre?". The best-fit finder already produces the
data; this is mostly a presentational addition.

---

## Notes & invariants for future edits

- **Group weights per position should sum to ~1.0** — the integrity test
  enforces 0.95–1.05. Keep new positions within that.
- **Lower-is-better metrics** (`sprint100`, `agility`) divide target by actual
  and age-scale by dividing — don't copy the higher-is-better branch.
- **Every new `PerfTargets` key** needs: a `FEMALE` multiplier, an `addMetric`
  call in `rateBuild`, and (if user-entered) a `BuildInput` field + UI input +
  unit conversion in the component's `baseInput`.
- **Keep `rateBuild` pure** — `bestFitPositions` calls it 60+ times per render,
  so avoid heavy work or side effects inside it.
- **`WorkoutPlan.tsx` also reads `SPORTS_DB`** (`position.targets`,
  `position.weights` via `goalForSport`) — new positions flow through it for
  free, but check `goalForSport` still classifies new weight profiles sensibly.
