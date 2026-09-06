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
      { q: "What is the broad jump?", a: "The broad (standing long) jump is a standard combine measure of horizontal leg power: from a standstill, jump forward as far as you can and measure heel-to-toe. It feeds the power score alongside the vertical jump and sprint for sports that reward explosiveness." },
    ],
  },
  "athlete-score": {
    description:
      "Get one 0–1000 athlete score from four pillars — strength, endurance, body composition and power — each scored as an age, sex and bodyweight-adjusted percentile, with a tier and the weak spot to fix.",
    sources: [
      { label: "ExRx.net strength standards", url: "https://exrx.net/Testing/WeightLifting/StrengthStandards" },
      { label: "ACSM VO₂max & body-composition norms", url: "https://www.acsm.org/" },
    ],
    faq: [
      { q: "What is a good athlete score?", a: "The pillars are percentiles, so a median healthy trainee lands near 500. Roughly: under 350 beginner, 500 intermediate, 650 advanced, 800 elite and 900+ world-class. Because it's percentile-based and adjusted for age, sex and bodyweight, the same score means the same level for anyone." },
      { q: "Do I need to fill in everything?", a: "No. Only height and weight are needed for the body-composition pillar; strength, endurance and power are each optional. The score is the weighted average of the pillars you complete, and a 'measured' read-out shows how complete it is — so add lifts, VO₂max and a jump for a truer number." },
      { q: "How can I raise my score the most?", a: "The tool flags your limiting pillar — usually the fastest lever. For most people that's endurance (raise VO₂max) or body composition (build muscle / get leaner), since strength alone is only one of four pillars." },
    ],
  },
  "sweat-rate": {
    description:
      "Calculate your sweat rate from a weigh-in/weigh-out, see how much body mass you lost as a percentage, and get a fluid- and sodium-replacement target for training and racing.",
    sources: [
      { label: "ACSM position stand — exercise & fluid replacement", url: "https://pubmed.ncbi.nlm.nih.gov/17277604/" },
    ],
    faq: [
      { q: "How do I measure my sweat rate?", a: "Weigh yourself nude (or in minimal, dry kit) right before and right after a session, note how long it lasted and how much you drank. Sweat rate = (weight lost + fluid drunk) ÷ hours, treating 1 litre of sweat as about 1 kg of body mass." },
      { q: "How much should I drink to rehydrate?", a: "Aim to replace roughly 150% of the fluid deficit over the next few hours — the extra 50% covers the urine you'll produce while rehydrating. If sweat losses were heavy or your sweat is salty, include sodium (from food or electrolyte drinks) to help you hold onto the fluid." },
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
      "Estimate your biological age from your VO₂max, resting heart rate, body fat, waist-to-height ratio and smoking — a multi-factor read on how old your body really is, and how to lower it.",
    sources: [
      { label: "Uth–Sørensen VO₂max from heart-rate ratio", url: "https://pubmed.ncbi.nlm.nih.gov/14624296/" },
      { label: "Cardiorespiratory fitness & mortality (ACSM/AHA)", url: "https://pubmed.ncbi.nlm.nih.gov/27881567/" },
    ],
    faq: [
      { q: "How is biological age calculated?", a: "VO₂max sets the baseline — the age at which your aerobic fitness would be merely average for your sex. Then independent markers (resting heart rate, body fat, waist-to-height ratio and smoking) each add or subtract a capped number of years. You can enter VO₂max directly or estimate it from your resting heart rate." },
      { q: "Why does VO₂max matter so much?", a: "Cardiorespiratory fitness is one of the strongest single predictors of all-cause mortality — often stronger than blood pressure or BMI. Raising VO₂max by about one MET (3.5 ml/kg/min) is associated with a meaningful reduction in risk, which is why it's the biggest lever on the score." },
      { q: "Is this a clinical biological age?", a: "No. True biological-age clocks use blood biomarkers or DNA methylation. This is a motivational fitness-based estimate built from population averages — useful for tracking your own trend, not a medical figure." },
    ],
  },
  "workout-plan": {
    description:
      "Generate a weekly training plan that trains every muscle 1.5–2× a week, then rate its effectiveness on stimulating reps, fatigue cost and your real recovery.",
    sources: [
      { label: "Schoenfeld et al. — resistance-training volume & hypertrophy", url: "https://pubmed.ncbi.nlm.nih.gov/27433992/" },
      { label: "Beardsley — stimulating reps & motor unit recruitment", url: "https://sandcresearch.medium.com/" },
      { label: "Schoenfeld et al. — training frequency meta-analysis", url: "https://pubmed.ncbi.nlm.nih.gov/27102172/" },
      { label: "Refalo et al. — proximity to failure & hypertrophy", url: "https://pubmed.ncbi.nlm.nih.gov/36378242/" },
    ],
    faq: [
      { q: "Why so few sets compared to other calculators?", a: "Because sets are not the unit that drives growth — reps close to failure are. High motor-unit recruitment and slow fibre shortening velocity only coincide in roughly the last five reps before failure, so a set stopped four reps short contributes about one stimulating rep for a full set's worth of fatigue. Run fewer sets closer to failure, more often, and you get the same stimulus for far less recovery cost." },
      { q: "What does the effectiveness score actually measure?", a: "Six things, weighted: the weekly number of stimulating reps per muscle (WNS) against the band for your goal, how the program's fatigue cost compares with your estimated recovery capacity, the stimulus-to-fatigue ratio, per-muscle training frequency, how well the rep ranges match your goal, and whether the sessions are a length you'll actually keep turning up for." },
      { q: "How do I get 1.5× frequency on an odd number of days?", a: "The week is a rolling cycle, not a fixed template. Three days of Anterior/Posterior runs A, P, A one week and P, A, P the next — each session type comes round 1.5× per week on average. The volume and frequency read-outs report that rolling average, because it's what your body actually receives." },
      { q: "Why does my recovery context change the score?", a: "Because fatigue only matters relative to what you can absorb. Sleep, life stress, whether you're in a calorie deficit, your age and your training experience all move your recovery capacity, and the same program can sit comfortably inside it or well outside it depending on those. A plan that outruns your recovery doesn't feel like overtraining — it shows up as lifts that stop moving." },
    ],
  },

  mobility: {
    description:
      "Build a mobility session around the goals you pick — front splits, overhead shoulders, deep squat, backbend — in the minutes you actually have, with a guided timer.",
    sources: [
      { label: "Thomas et al. — stretching dose & range of motion", url: "https://pubmed.ncbi.nlm.nih.gov/30427671/" },
      { label: "Behm et al. — acute effects of stretching on performance", url: "https://pubmed.ncbi.nlm.nih.gov/26642915/" },
    ],
    faq: [
      { q: "How long do I need to stretch to actually gain range?", a: "About five minutes per week per muscle group captures most of the range-of-motion gain available — and frequency matters more than session length, so short and near-daily beats one weekly marathon. The session tells you how many of these sessions a week hits that dose for each goal you picked." },
      { q: "Why does the session include loaded work, not just stretching?", a: "Short-term range is mostly increased stretch tolerance; lasting change comes from tissue adaptation, and that responds to long holds and especially to loading the end range. Loaded and contract–relax entries are what turn passive range into range you can control — and that's the range that's retained." },
      { q: "Can I do this before lifting?", a: "Use the pre-training warm-up goal, which is built from dynamic work and short holds. Static holds over about 60 seconds per muscle can transiently reduce force and power output, so save the long passive work for after training or a separate session." },
    ],
  },

  skills: {
    description:
      "Step-by-step progressions for the handstand, muscle-up, front lever, planche, pistol squat, backflip and more — each step with a clear test for when you've got it.",
    sources: [
      { label: "USA Gymnastics — safety & progressions", url: "https://usagym.org/" },
    ],
    faq: [
      { q: "How often should I practise a skill?", a: "Short and often, always fresh. Ten to fifteen focused minutes five days a week beats one long weekly session, and skill work belongs at the START of a session, before anything that makes you tired — a rep performed badly is still a rep you learn." },
      { q: "Can I teach myself a backflip?", a: "No. Flips are the one category here where self-teaching is genuinely dangerous: an under-rotated standing backflip risks the neck and spine. Get a coach and learn it on a trampoline, into a foam pit or onto crash mats. Everything else in this list can be self-taught with patience." },
      { q: "Why does the progress bar not move when I tick a later step?", a: "Progress counts consecutive steps from the bottom of the ladder. Ticking step 4 while step 2 is still open doesn't move you up, because skipped steps are exactly what stalls a skill at the 80% mark — the next step shown is always the lowest one still open." },
    ],
  },

  "breath-tables": {
    description:
      "Guided CO₂ and O₂ breath-hold tables built from your own max hold, with a phase-by-phase timer, clear instructions and the safety rules that actually matter.",
    sources: [
      { label: "Bain et al. — physiology of static apnea", url: "https://pubmed.ncbi.nlm.nih.gov/29687392/" },
      { label: "Divers Alert Network — breath-hold safety", url: "https://dan.org/" },
    ],
    faq: [
      { q: "What's the difference between a CO₂ table and an O₂ table?", a: "A CO₂ table holds the breath-hold length constant and shrinks the recovery between rounds, so you start each hold with more leftover carbon dioxide and the urge to breathe arrives earlier — it trains CO₂ tolerance. An O₂ table keeps the recovery long and lengthens the holds, pushing further into genuine oxygen depletion. CO₂ tables are the workhorse and can be near-daily; O₂ tables are taxing and belong once or twice a week, never on consecutive days." },
      { q: "Should I hyperventilate before a hold?", a: "Never. Fast deep breathing lowers carbon dioxide without adding meaningful oxygen, which removes the warning signal that makes you want to breathe while doing nothing about the risk of blacking out. Take one relaxed breath to about 80% full and start the hold." },
      { q: "Is breath-hold training safe?", a: "On dry land, sitting or lying down, with no hyperventilation — yes, for healthy adults. In or near water it is not: apnea blackout is silent and gives no warning. Never practise breath holds in a pool, a bath, or while swimming, and skip apnea training entirely if you're pregnant or have heart disease, uncontrolled blood pressure, epilepsy or a history of fainting." },
      { q: "How quickly will my hold improve?", a: "Faster than most people expect, because the first limit is CO₂ tolerance rather than oxygen. Doubling a sub-60-second hold within 8–12 weeks of consistent table work is common — and a good part of the first jump comes simply from learning to relax and stay still." },
    ],
  },

  "breath-hold": {
    description:
      "Score your maximum static breath hold: an age- and sex-adjusted percentile, a level on the apnea ladder, how it compares with the world record, and what it should become.",
    sources: [
      { label: "AIDA International — static apnea records", url: "https://www.aidainternational.org/" },
      { label: "Bain et al. — physiology of static apnea", url: "https://pubmed.ncbi.nlm.nih.gov/29687392/" },
    ],
    faq: [
      { q: "What's a good breath hold?", a: "The untrained adult average is around 45–60 seconds. Ninety seconds already puts you well above average, two to three minutes is solid recreational apnea, four minutes takes structured training, and competitive static apnea starts around six. The men's dry static world record is 11:35." },
      { q: "How is the percentile calculated?", a: "Breath-hold times are strongly right-skewed, so the population is modelled as log-normal and your percentile is read off the z-score of the logarithm of your time. The curve is anchored on an untrained median near 55 s for men and 45 s for women, a 90th percentile around two minutes and a 99.9th around six, then adjusted for age." },
      { q: "Why does age change my score?", a: "Lung volume and chest-wall compliance both decline with age, so the same hold represents a better performance the older you are. The median the curve compares you against drops by roughly 0.6% a year after 30." },
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
