/**
 * lib/toolContent.ts
 * ------------------
 * Per-tool editorial content, keyed by tool id and kept separate from the
 * component registry: a richer SEO description, source references, and an
 * optional FAQ. The Shell renders sources + FAQ for the active tool, and the
 * route's generateMetadata uses `description`, so populating data here lights
 * it up everywhere without touching the calculator components.
 */

export interface Source {
  label: string;
  url: string;
}
export interface QA {
  q: string;
  a: string;
}
export interface ToolContent {
  /** Meta description (~150 chars) for search/social. Falls back to the blurb. */
  description?: string;
  sources?: Source[];
  faq?: QA[];
}

export const TOOL_CONTENT: Record<string, ToolContent> = {
  "my-numbers": {
    description:
      "A live snapshot of your key health & fitness numbers — maintenance calories, BMI, FFMI, muscle-gain potential, healthy-weight range and heart-rate zones — from one set of stats.",
  },

  "build-rater": {
    description:
      "Rate how your height, weight, wingspan, strength and athleticism fit 30+ sports and positions, with a 0–100 score, a best-fit finder and a body-composition target.",
    sources: [
      { label: "ACSM — body composition & performance norms", url: "https://www.acsm.org/" },
      { label: "NFL Combine athletic testing norms", url: "https://www.nfl.com/combine/" },
    ],
    faq: [
      { q: "Which sport suits my build best?", a: "Fill in your height, weight and any performance numbers, and the best-fit finder scores you against every sport and position in the database — then ranks the top matches so you can tap straight into the one that fits you most." },
      { q: "Do I need to enter all the performance fields?", a: "No. Everything except height and weight is optional. The rating only ever reflects what you enter, and a confidence read-out tells you how much of what the role demands you've actually measured — so add lifts, sprint, jumps or VO₂max for a sharper score." },
      { q: "What are the broad jump and 5-10-5 agility tests?", a: "They're standard combine measures of explosive power and change-of-direction. The broad (standing long) jump is horizontal leg power; the 5-10-5 pro-agility shuttle times how fast you can decelerate and re-accelerate — both feed the power score for sports that reward quickness." },
    ],
  },
  "pl-points": {
    description:
      "Calculate your Wilks, DOTS and IPF GL points from your squat, bench and deadlift total — bodyweight-adjusted scores that compare powerlifters of any size on one number.",
    sources: [
      { label: "Wilks & DOTS pound-for-pound coefficients", url: "https://en.wikipedia.org/wiki/Wilks_coefficient" },
      { label: "IPF GL points formula", url: "https://www.powerlifting.sport/" },
    ],
    faq: [
      { q: "Wilks vs DOTS vs IPF GL — which should I use?", a: "DOTS is the modern successor to Wilks and is widely used in raw federations; IPF GL points are the IPF's current official formula. Wilks is the original and still common. All three answer the same question — pound-for-pound, how strong is this total — so pick whichever your federation or training partners use." },
      { q: "What's a good score?", a: "As a rough guide, ~300 is a solid intermediate, ~400 is advanced, and ~500+ is elite / national-class. The coefficients are calibrated separately for men and women, so the same number means the same level for either sex." },
    ],
  },
  "age-grade": {
    description:
      "Age-grade your 5K, 10K, half or marathon time: compare your performance to the world standard for your age and sex on a single percentage, across any age or event.",
    sources: [
      { label: "World Masters Athletics age-grading", url: "https://en.wikipedia.org/wiki/Age_grading" },
    ],
    faq: [
      { q: "What does the age-grade percentage mean?", a: "It's your time as a percentage of the world standard for someone your age and sex. Roughly: 60% is local-class, 70% regional, 80% national-class and 90%+ world class. Because it adjusts for age, you can compare a 25-year-old and a 60-year-old fairly — or track your own decline-adjusted progress over the years." },
      { q: "Is this the official WMA figure?", a: "It's an approximation. It uses a single age-factor curve rather than the full per-event WMA tables, so it's ideal for tracking your own progress and rough comparisons, but it won't exactly match an official age-grading certificate." },
    ],
  },
  "fitness-age": {
    description:
      "Estimate your fitness age from your VO₂max or resting heart rate — the age at which your aerobic fitness would be merely average, and one of the best predictors of longevity.",
    sources: [
      { label: "Uth–Sørensen VO₂max from heart-rate ratio", url: "https://pubmed.ncbi.nlm.nih.gov/14624296/" },
    ],
    faq: [
      { q: "How is fitness age calculated?", a: "We find the age at which your VO₂max equals the population average for your sex. A VO₂max above average for your real age makes your fitness age younger; below average makes it older. You can enter VO₂max directly or estimate it from your resting heart rate." },
      { q: "Why does VO₂max matter so much?", a: "Cardiorespiratory fitness is one of the strongest single predictors of all-cause mortality — often stronger than smoking, blood pressure or BMI. Raising VO₂max by about one MET (3.5 ml/kg/min) is associated with a meaningful reduction in risk." },
    ],
  },
  "workout-plan": {
    description:
      "Generate a weekly training plan from your goal, available days, equipment and lifts, with set/rep schemes, RIR targets and weekly volume per muscle.",
    sources: [
      { label: "Schoenfeld et al. — resistance-training volume & hypertrophy", url: "https://pubmed.ncbi.nlm.nih.gov/27433992/" },
    ],
  },

  "rep-max": {
    description:
      "Estimate your one-rep max (and 3RM/5RM) from a set, with a full percentage table, using the Epley and Brzycki formulas.",
    sources: [
      { label: "Epley (1985) & Brzycki (1993) 1RM formulas", url: "https://en.wikipedia.org/wiki/One-repetition_maximum" },
    ],
    faq: [
      { q: "Which formula is best?", a: "Epley and Brzycki agree closely up to ~10 reps; both lose accuracy as reps climb, so estimate from sets of 5 or fewer where you can." },
    ],
  },
  standards: {
    description:
      "Rank your squat, bench, deadlift, overhead press and pull-ups by level and percentile, adjusted for your age, bodyweight, sex and sport.",
    sources: [
      { label: "ExRx.net strength standards", url: "https://exrx.net/Testing/WeightLifting/StrengthStandards" },
      { label: "Wilks / DOTS pound-for-pound scaling", url: "https://en.wikipedia.org/wiki/Wilks_coefficient" },
    ],
    faq: [
      { q: "Why are pull-ups judged by bodyweight?", a: "For a bodyweight movement the resistance is your own mass, so the same rep count is harder the more you weigh — heavier lifters need fewer reps for the same level." },
    ],
  },
  "lift-balance": {
    description:
      "See whether your squat, bench, deadlift and overhead press are in proportion, anchored to your strongest lift, and find your weak point.",
    sources: [
      { label: "Strength-standard ratio tables (ExRx)", url: "https://exrx.net/Testing/WeightLifting/StrengthStandards" },
    ],
  },
  rpe: {
    description:
      "Convert between RPE, reps-in-reserve and %1RM, estimate your 1RM from a working set, and read target loads off the RTS chart.",
    sources: [
      { label: "Helms et al. — RPE for resistance training (RTS chart)", url: "https://pubmed.ncbi.nlm.nih.gov/27049459/" },
    ],
  },

  vo2max: {
    description:
      "Estimate your VO₂max from a Cooper 12-minute test, a 1.5-mile run or your resting heart rate, with age- and sex-adjusted fitness categories.",
    sources: [
      { label: "Cooper (1968) 12-minute run test", url: "https://en.wikipedia.org/wiki/Cooper_test" },
    ],
  },
  "hr-zones": {
    description:
      "Calculate your five heart-rate training zones from age and resting HR using the Karvonen (heart-rate-reserve) method or % of max.",
    sources: [
      { label: "Karvonen heart-rate-reserve method", url: "https://en.wikipedia.org/wiki/Heart_rate#Karvonen_method" },
      { label: "Tanaka et al. (2001) max-HR formula", url: "https://pubmed.ncbi.nlm.nih.gov/11153730/" },
    ],
  },
  "pace-race": {
    description:
      "Work out running pace and speed, and predict race times across distances with Pete Riegel's endurance formula.",
    sources: [
      { label: "Riegel (1981) endurance time prediction", url: "https://en.wikipedia.org/wiki/Peter_Riegel" },
    ],
  },
  "run-paces": {
    description:
      "Turn a recent race, Cooper test or VO₂max into Jack Daniels' VDOT training paces (easy to repetition) with heart-rate guidance and equivalent race times.",
    sources: [
      { label: "Daniels & Gilbert — VDOT / Daniels' Running Formula", url: "https://en.wikipedia.org/wiki/Jack_Daniels_(coach)" },
    ],
    faq: [
      { q: "How accurate are the paces?", a: "They're calibrated to reproduce Daniels' published tables within a few seconds per km — a guide to train around, not a lab prescription." },
    ],
  },
  "ftp-zones": {
    description:
      "Set your seven cycling power zones from FTP (or a 20-minute test) using Dr Andrew Coggan's model, with watt ranges and power-to-weight (W/kg).",
    sources: [
      { label: "Allen & Coggan — Training and Racing with a Power Meter", url: "https://www.trainingpeaks.com/learn/articles/power-training-levels/" },
    ],
  },

  tdee: {
    description:
      "Estimate your BMR and daily energy needs (TDEE) with the Mifflin–St Jeor equation and an activity multiplier, plus cut and bulk targets.",
    sources: [
      { label: "Mifflin & St Jeor (1990) BMR equation", url: "https://pubmed.ncbi.nlm.nih.gov/2305711/" },
    ],
  },
  "diet-planner": {
    description:
      "Plan a cut or lean bulk: daily calories, macros and a week-by-week body-recomposition timeline with an ETA to your target body-fat percentage.",
    sources: [
      { label: "Aragon & Schoenfeld — rates of muscle gain", url: "https://jissn.biomedcentral.com/articles/10.1186/1550-2783-10-5" },
      { label: "Hall et al. — energy balance & body-weight change", url: "https://pubmed.ncbi.nlm.nih.gov/21872751/" },
    ],
    faq: [
      { q: "Why recalculate as I go?", a: "As your bodyweight changes so does your TDEE, so a deficit that was 500 kcal shrinks over time — re-run it every few weeks." },
    ],
  },
  macros: {
    description:
      "Split your calories into protein, carbs and fat — protein set per kg of bodyweight, fat as a share of calories, carbs filling the rest — with a meal-by-meal breakdown.",
    sources: [
      { label: "Morton et al. (2018) — protein & resistance training", url: "https://pubmed.ncbi.nlm.nih.gov/28698222/" },
    ],
  },
  "body-comp": {
    description:
      "Estimate body-fat percentage with the US Navy tape method, plus BMI and waist-to-height ratio, with healthy-range context.",
    sources: [
      { label: "US Navy body-fat (Hodgdon & Beckett) method", url: "https://en.wikipedia.org/wiki/Body_fat_percentage#US_Navy_method" },
    ],
  },
  "ideal-weight": {
    description:
      "See your healthy weight range for your height (BMI 18.5–24.9), classic ideal-weight formulas and an estimate of your lean body mass.",
    sources: [
      { label: "Devine, Robinson, Miller & Hamwi IBW formulas", url: "https://en.wikipedia.org/wiki/Human_body_weight#Ideal_body_weight" },
    ],
  },
  ffmi: {
    description:
      "Calculate your Fat-Free Mass Index — the muscle counterpart to BMI — normalised for height, with natural-limit context.",
    sources: [
      { label: "Kouri et al. (1995) — FFMI & the natural limit", url: "https://pubmed.ncbi.nlm.nih.gov/8775371/" },
    ],
  },
  "muscle-gain": {
    description:
      "Estimate how much muscle you can realistically gain over 3, 6 and 12 months and across your lifetime, from your training experience and FFMI ceiling.",
    sources: [
      { label: "Aragon & Schoenfeld — realistic rates of gain", url: "https://jissn.biomedcentral.com/articles/10.1186/1550-2783-10-5" },
      { label: "Kouri et al. (1995) — FFMI ceiling", url: "https://pubmed.ncbi.nlm.nih.gov/8775371/" },
    ],
  },
  "calorie-burn": {
    description:
      "Estimate calories burned for an activity from its MET value, duration and your bodyweight.",
    sources: [
      { label: "Compendium of Physical Activities (MET values)", url: "https://pacompendium.com/" },
    ],
  },

  caffeine: {
    description:
      "Track how much caffeine is left in your system over time using its ~5-hour half-life, with a bedtime cutoff so it won't wreck your sleep.",
    sources: [
      { label: "Caffeine pharmacokinetics (~5 h half-life)", url: "https://en.wikipedia.org/wiki/Caffeine#Pharmacokinetics" },
    ],
  },
  sleep: {
    description:
      "Find the best times to fall asleep or wake up by aligning with ~90-minute sleep cycles.",
    sources: [
      { label: "Sleep-cycle architecture (~90 min)", url: "https://en.wikipedia.org/wiki/Sleep_cycle" },
    ],
  },
  water: {
    description:
      "Estimate a daily fluid target from your bodyweight, exercise and climate.",
    sources: [
      { label: "EFSA dietary reference values for water", url: "https://www.efsa.europa.eu/en/efsajournal/pub/1459" },
    ],
  },

  "strength-score": {
    description:
      "Combine your squat, bench, deadlift, overhead press and pull-ups into one overall strength score and percentile, adjusted for age, bodyweight and sex.",
    sources: [
      { label: "ExRx.net strength standards", url: "https://exrx.net/Testing/WeightLifting/StrengthStandards" },
    ],
  },
  "swim-zones": {
    description:
      "Find your Critical Swim Speed from two time trials and the training pace zones built around it.",
    sources: [
      { label: "Critical Swim Speed (Wakayoshi et al., 1992)", url: "https://pubmed.ncbi.nlm.nih.gov/1396642/" },
    ],
  },
  "treadmill-pace": {
    description:
      "Convert a treadmill pace and incline to its equivalent flat-ground effort using the ACSM running equation.",
    sources: [
      { label: "ACSM metabolic equation for running", url: "https://en.wikipedia.org/wiki/Metabolic_equivalent_of_task" },
    ],
  },
  "race-splits": {
    description:
      "Build a race-day split sheet — even or negative splits — from your goal time and distance.",
    sources: [
      { label: "Negative-split pacing research", url: "https://pubmed.ncbi.nlm.nih.gov/?term=negative+split+pacing" },
    ],
  },
};

export function getToolContent(id: string): ToolContent {
  return TOOL_CONTENT[id] ?? {};
}
