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
      "Generate a weekly training plan from your goal, available days, equipment and lifts, with set/rep schemes, RIR targets and weekly volume per muscle.",
    sources: [
      { label: "Schoenfeld et al. — resistance-training volume & hypertrophy", url: "https://pubmed.ncbi.nlm.nih.gov/27433992/" },
    ],
  },

  "weekly-stimulus": {
    description:
      "Score a week of training for one muscle in stimulus units: stimulating reps per set, the fatigue discount on every extra set, a penalty for training before you've recovered, and what a different frequency would be worth.",
    sources: [
      { label: "Chris Beardsley — stimulating reps & the stimulus-to-fatigue ratio", url: "https://sandcresearch.medium.com/" },
      { label: "Schoenfeld et al. — training frequency & hypertrophy", url: "https://pubmed.ncbi.nlm.nih.gov/27102172/" },
      { label: "Schoenfeld et al. — dose–response of weekly volume", url: "https://pubmed.ncbi.nlm.nih.gov/27433992/" },
      { label: "Refalo et al. — proximity to failure & hypertrophy", url: "https://pubmed.ncbi.nlm.nih.gov/36334240/" },
    ],
    faq: [
      { q: "What is a stimulating rep?", a: "A rep only grows muscle when the fibres are both fully recruited and shortening slowly — that is what produces high mechanical tension. With a moderate load that combination only happens in roughly the last five reps before failure, so a set contributes about 5 − RIR stimulating reps. With a heavy load (a rep-max of five or fewer) recruitment is maximal from the first rep, so the whole set counts." },
      { q: "Why does the same number of sets score higher when I spread them out?", a: "Stimulus decays within a session — every set for a muscle is performed in a more fatigued state than the last, so set 8 is worth a fraction of set 1. Fatigue clears between sessions, but the stimulus you banked does not. Splitting 12 weekly sets over three days instead of one can be worth 50% more net stimulus for exactly the same work." },
      { q: "Is 'net stimulus' a real biological measurement?", a: "No. It is a relative score built from Chris Beardsley's stimulating-reps and stimulus-to-fatigue framework, with coefficients tuned to reproduce the findings that framework explains: per-session saturation around four to six hard sets, higher frequency winning at matched volume, and effort mattering more than set count. Use it to compare two plans, not as a number to report." },
      { q: "How many stimulus units should I aim for?", a: "Below about 7 a week a muscle slowly detrains; 7–16 maintains; 16–30 grows steadily; 30–48 is the productive zone for someone chasing size; above 48 is as much as a muscle can use, and only if sleep, food and scheduling all cooperate. Check the weekly set count against the volume landmarks too — stimulus you cannot recover from is not stimulus." },
    ],
  },
  "volume-landmarks": {
    description:
      "Your personal MV, MEV, MAV and MRV — weekly hard sets per muscle — adjusted for experience, age, whether you're cutting or bulking and how well you recover, plus a mesocycle that ramps MEV to MRV and deloads.",
    sources: [
      { label: "Israetel et al. — volume landmarks (Renaissance Periodization)", url: "https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth" },
      { label: "Schoenfeld et al. — dose–response of weekly volume", url: "https://pubmed.ncbi.nlm.nih.gov/27433992/" },
    ],
    faq: [
      { q: "What do MV, MEV, MAV and MRV mean?", a: "MV (maintenance volume) is the least that holds the muscle you have. MEV (minimum effective volume) is the least that reliably grows it. MAV (maximum adaptive volume) is the productive working range. MRV (maximum recoverable volume) is the ceiling — past it you accumulate more fatigue than you can recover from and progress stalls or reverses." },
      { q: "How do I count a set?", a: "Count hard sets taken within a few reps of failure, for the muscle that actually limits the set. A compound counts fully for its prime mover and roughly half for the assisting muscles — so a bench press is a full chest set and half a triceps set." },
      { q: "Should I just train at MRV all the time?", a: "No. Landmarks are a range to move through, not a target to sit on. Start a block at MEV, add about a set per session each week, and deload when you reach MRV — that way the volume that stopped working in week five is an effective dose again in week one." },
      { q: "Why does a calorie deficit lower my volume ceiling?", a: "Recovery is paid for out of energy availability. In a deficit the same sets take longer to recover from, so MRV drops by roughly 20% and holding volume near MEV — while keeping effort and load high — preserves more muscle than grinding out extra sets." },
    ],
  },
  "effective-reps": {
    description:
      "See exactly which reps of a set build muscle: stimulating reps from your reps and RIR, the load that implies, and a side-by-side comparison of heavy, moderate and high-rep schemes on stimulus, fatigue and gym time.",
    sources: [
      { label: "Chris Beardsley — stimulating (effective) reps", url: "https://sandcresearch.medium.com/" },
      { label: "Refalo et al. — proximity to failure & hypertrophy", url: "https://pubmed.ncbi.nlm.nih.gov/36334240/" },
      { label: "Helms et al. — RPE / reps-in-reserve scale", url: "https://pubmed.ncbi.nlm.nih.gov/27049459/" },
    ],
    faq: [
      { q: "How many effective reps does a set have?", a: "About five, if you take it to failure — and you lose one for every rep you leave in reserve, so a set at 3 RIR banks only two. Heavy sets are the exception: with a rep-max of five or fewer, recruitment is maximal from rep one and every rep is stimulating." },
      { q: "Are heavy triples or sets of ten better for growth?", a: "For hypertrophy they can be close — 5×3 to failure and 4×10 to 1 RIR bank a similar number of stimulating reps — but the heavy version costs far more joint and nervous-system fatigue per unit of growth. That is why most hypertrophy work sits in the 6–20 rep range and heavy work is reserved for the lifts you want to get strong at." },
      { q: "Do sets of 30 build muscle?", a: "Yes, if they go to failure — the last few reps are still fully recruited and slow. They simply reach the same five stimulating reps through a great deal more uncomfortable, fatiguing work, so they suit machines and isolation where the local fatigue does not spill over into the rest of your session." },
    ],
  },
  "exercise-sfr": {
    description:
      "Rate any lift's stimulus-to-fatigue ratio from how it loads the muscle — compound or isolation, free or supported, stretched or squeezed, full range or partials — and see where it belongs in your session.",
    sources: [
      { label: "Chris Beardsley — the stimulus-to-fatigue ratio", url: "https://sandcresearch.medium.com/" },
      { label: "Maeo et al. — training at long muscle lengths", url: "https://pubmed.ncbi.nlm.nih.gov/33009197/" },
      { label: "Pedrosa et al. — lengthened partials vs full ROM", url: "https://pubmed.ncbi.nlm.nih.gov/34715015/" },
    ],
    faq: [
      { q: "What is the stimulus-to-fatigue ratio?", a: "Stimulus is the growth signal a set sends to the target muscle; fatigue is everything it costs you — muscle damage, nervous-system fatigue, joint stress and the sets it takes away from the rest of your session. SFR is the ratio. High-SFR exercises are the ones you can afford lots of." },
      { q: "Does a low rating mean the exercise is bad?", a: "No — it means it is expensive. A heavy back squat is one of the best strength lifts there is and trains several muscles at once, which the whole-body SFR figure credits it for. It just costs too much fatigue to be the source of your tenth hard set of the week, so do it first and do fewer of them." },
      { q: "Why do exercises that load the stretch score higher?", a: "Tension at long muscle lengths appears to be a stronger growth signal than the same tension at short lengths, and the evidence for lengthened partials points the same way. So an incline curl or a seated leg curl gets a stimulus premium over a movement whose hardest point is where the muscle is already fully shortened." },
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
