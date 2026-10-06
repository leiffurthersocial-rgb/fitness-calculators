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

  hub: {
    description:
      "The all-in-one hypertrophy dashboard: your stats, lift log with 1RM and progression forecasts, rated training plan, calories and macros, and a muscle-by-muscle forecast of your physique.",
    sources: [
      { label: "Pelland et al. — the resistance-training dose response", url: "https://doi.org/10.1007/s40279-025-02344-w" },
      { label: "Helms et al. (2023) — small vs large energy surplus", url: "https://pubmed.ncbi.nlm.nih.gov/37914977/" },
      { label: "Aragon & Schoenfeld — rates of muscle gain", url: "https://jissn.biomedcentral.com/articles/10.1186/1550-2783-10-5" },
      { label: "Hall (2008) — energy deficit per unit weight loss", url: "https://pubmed.ncbi.nlm.nih.gov/17848938/" },
    ],
    faq: [
      { q: "How does the physique forecast work?", a: "The nutrition model estimates how much muscle you can build in the timeframe from your training age, sex, age and goal. That's scaled by how well your routine trains each muscle (an untrained muscle won't grow however much you eat) and split across muscles by size and weekly effective sets. Logged lifts add a second signal: muscles whose lifts are weaker than your average are flagged as lagging." },
      { q: "How accurate are the forecasts?", a: "They're group averages, so treat them as a direction, not a promise. People differ a lot in how fast they respond to training. The flags (under-trained, lagging, pressing-heavy) are more reliable than the exact kilograms." },
      { q: "Where is my data stored?", a: "Only in your browser. The hub shares your stats with every other tool and reads routines from the Routine planner; logging your bench, squat, deadlift or overhead press also updates Your stats." },
    ],
  },
  "routine-planner": {
    description:
      "Build a hypertrophy routine from sessions and exercises, save it in your browser, and get it rated per muscle with Chris Beardsley's Weekly Net Stimulus model.",
    sources: [
      { label: "Beardsley — Weekly Net Stimulus (S&C Research)", url: "https://www.patreon.com/posts/weekly-net-102750269" },
      { label: "Beardsley — Stimulating reps", url: "https://www.patreon.com/posts/stimulating-reps-99706085" },
      { label: "Pelland et al. — the resistance-training dose response", url: "https://doi.org/10.1007/s40279-025-02344-w" },
      { label: "Schoenfeld, Ogborn & Krieger (2017) — weekly set volume & hypertrophy", url: "https://pubmed.ncbi.nlm.nih.gov/27433992/" },
    ],
    faq: [
      { q: "How is my routine rated?", a: "Sessions are spread evenly over the week, then every muscle's week is scored with the Weekly Net Stimulus model: growth stimulus from each workout minus atrophy between workouts. Each set is adjusted for the exercise's hypertrophy efficiency, how close to failure you go, and fatigue. Each muscle gets 0–100 (30 = maintenance, 100 = 4 hard, efficient sets 3× a week), and the routine score is a weighted average by muscle size and your focus/skip choices." },
      { q: "How is fatigue accounted for?", a: "Three ways. Within a workout, extra sets for the same muscle add less and less (diminishing returns). Once a session has built up a lot of fatigue, especially from heavy compounds like deadlifts and squats, later exercises lose some stimulus. And training a muscle again before it has recovered from a high-volume session (within ~72 hours) cuts that workout's stimulus." },
      { q: "Do helper sets count toward frequency?", a: "No. The frequency shown counts only sessions where the muscle is a main mover. Helper sets still add stimulus (as half sets), and they keep a muscle out of atrophy only when they add up to at least one effective set in a session." },
      { q: "How are sets counted for each muscle?", a: "Fractionally. A set counts as 1 set for the main muscle and half a set for helpers, so one set of bench press is 1 chest, ½ front delts and ½ triceps. The Exercise library shows the numbers for every exercise." },
      { q: "Why does my bro split score lower?", a: "Training a muscle once a week leaves about five days of atrophy, and piling 10+ sets into one session gives diminishing returns. Splitting the same sets over two or three sessions gives more stimulus and less atrophy." },
      { q: "Where are my routines saved?", a: "In your browser's local storage on this device. Nothing is uploaded. Use Copy to paste a routine somewhere else." },
    ],
  },
  "stimulating-reps": {
    description:
      "Count the stimulating reps in your sets with Chris Beardsley's model: only the last ~5 reps before failure build muscle, so reps in reserve cost you growth.",
    sources: [
      { label: "Beardsley — Stimulating reps", url: "https://www.patreon.com/posts/stimulating-reps-99706085" },
      { label: "Beardsley — max stimulating reps per workout", url: "https://sandcresearch.medium.com/what-is-the-maximum-number-of-stimulating-reps-that-we-can-do-in-a-workout-for-a-muscle-group-9379d91bf2c" },
    ],
    faq: [
      { q: "What is a stimulating rep?", a: "A rep where all the motor units are recruited and the muscle fibers shorten slowly under high tension. In a set to failure that is about the last 5 reps, whether the set is 6 reps or 30." },
      { q: "Do I have to train to failure?", a: "No, but each rep left in reserve removes about one stimulating rep. Sets at 1–2 RIR keep most of the stimulus with less fatigue; at 4–5 RIR very little is left." },
    ],
  },
  "exercise-library": {
    description:
      "100+ hypertrophy exercises by muscle — lats vs mid back vs traps, biceps, triceps, quads, hamstrings and more — with set credit, hypertrophy efficiency and fatigue cost for each.",
    faq: [
      { q: "What do 1 and ½ mean?", a: "A set counts as one full set for the muscle doing most of the work and half a set for muscles that help. The Routine planner adds these up to get weekly sets per muscle." },
      { q: "What is hypertrophy efficiency?", a: "How reliably a hard set turns into stimulating reps for the target muscle. Following Chris Beardsley, a muscle only gets stimulating reps if it's what limits the set. Stable machines and cables with a matching resistance curve score near 100%. Exercises where balance, grip, the lower back or helper muscles can give out first score lower (70–90%)." },
      { q: "How should I train my back?", a: "It depends on the look you want. Width comes from the lats: pulldowns, pull-ups, pullovers and rows with the elbows tucked to your sides. Thickness comes from the mid back (mid traps, rhomboids): rows with the elbows flared out and Kelso shrugs. Upper traps need shrugs. Pick the muscle in the filter to see the most efficient options." },
    ],
  },
  "net-stimulus": {
    description:
      "Chris Beardsley's Weekly Net Stimulus model: score a weekly training schedule for one muscle as workout hypertrophy stimulus minus atrophy between sessions, and find the best training frequency.",
    sources: [
      { label: "Beardsley — Weekly Net Stimulus (S&C Research)", url: "https://www.patreon.com/posts/weekly-net-102750269" },
      { label: "Beardsley — Atrophy occurs within a training week", url: "https://www.patreon.com/posts/atrophy-occurs-107681018" },
      { label: "Beardsley — Stimulating reps", url: "https://www.patreon.com/posts/stimulating-reps-99706085" },
      { label: "Schoenfeld, Ogborn & Krieger (2017) — weekly set volume & hypertrophy", url: "https://pubmed.ncbi.nlm.nih.gov/27433992/" },
      { label: "Pelland et al. — the resistance-training dose response", url: "https://doi.org/10.1007/s40279-025-02344-w" },
    ],
    faq: [
      { q: "What is weekly net stimulus?", a: "Chris Beardsley's model of how much a muscle grows in a week: the sum of the hypertrophy stimulus from each workout, minus the muscle lost to atrophy during the time no workout is stimulating growth. Positive means growth, zero is maintenance, negative is loss." },
      { q: "Why does 3 sets once a week only maintain muscle?", a: "Maintenance studies show it, and the model is calibrated on it. One workout keeps growth elevated for about two days, then the muscle atrophies for about five days, cancelling the gain. Doing 1 set twice a week cuts atrophy time to about three days, so it causes growth." },
      { q: "Which sets count?", a: "Only hard sets, close to failure. In Beardsley's stimulating-reps model a set to failure has about 5 stimulating reps and each rep in reserve removes one, so a set at 2 RIR counts as 0.6 of a set." },
      { q: "Why is full body better than a split here?", a: "Two reasons. Per-session returns diminish, so splitting the same weekly sets into more sessions gives more total stimulus. More frequent sessions also leave less of the week uncovered, so less muscle is lost to atrophy." },
    ],
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
      "Build muscle without gaining fat: calories set by the energy cost of the muscle you can actually build, plus recomp and cut modes, a muscle-vs-fat projection and a comparison of bulking strategies.",
    sources: [
      { label: "Helms et al. (2023) — small vs large energy surplus in trained lifters", url: "https://pubmed.ncbi.nlm.nih.gov/37914977/" },
      { label: "Slater et al. (2019) — is an energy surplus required for hypertrophy?", url: "https://doi.org/10.3389/fnut.2019.00131" },
      { label: "Barakat et al. (2020) — body recomposition", url: "https://doi.org/10.1519/SSC.0000000000000584" },
      { label: "Hall (2008) — energy deficit per unit weight loss", url: "https://pubmed.ncbi.nlm.nih.gov/17848938/" },
      { label: "Aragon & Schoenfeld — rates of muscle gain", url: "https://jissn.biomedcentral.com/articles/10.1186/1550-2783-10-5" },
      { label: "Garthe et al. (2011) — slow vs fast weight loss in athletes", url: "https://pubmed.ncbi.nlm.nih.gov/21558571/" },
    ],
    faq: [
      { q: "How many extra calories do I need to build muscle?", a: "Far fewer than most bulking advice suggests. Building 1 kg of lean tissue costs about 2,300 kcal. An intermediate lifter can add maybe 0.5–0.6 kg of muscle a month, which works out to roughly 40–60 kcal a day; a beginner perhaps 70–100. Anything more than that is stored as fat." },
      { q: "Do I need to gain fat to build muscle?", a: "No. Muscle growth is driven by the training stimulus and limited by your training age, not by eating lots. In Helms et al. (2023), a large surplus mainly added fat compared with a small one, with little or no extra muscle. The authors suggest small surpluses scaled to experience; this planner starts at the muscle-only minimum, and you can add a 100 kcal buffer if your weight doesn't move." },
      { q: "When should I recomp instead?", a: "Recomposition at maintenance works best for beginners, people returning after a break and those with more body fat: they can build a good share of their normal muscle rate while losing fat. Advanced, lean lifters build muscle much more slowly this way." },
      { q: "Why is my cut deficit bigger than other calculators?", a: "This planner uses the energy content of body fat itself (~9,400 kcal/kg) instead of the old 7,700 kcal-per-kg-of-bodyweight rule, which also counts water. It's a starting point: adjust by 100 kcal based on your weekly average weight." },
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
