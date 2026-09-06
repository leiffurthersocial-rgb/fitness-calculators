/**
 * lib/skills.ts
 * -------------
 * Skill progressions: handstand, muscle-up, front lever, backflip and friends.
 *
 * Skills are not workouts. They are motor patterns, and motor learning follows
 * different rules from hypertrophy:
 *   • Practise fresh, not fried. Skill work goes FIRST in a session, before
 *     anything that makes you tired — a rep performed badly is still learned.
 *   • Frequency over volume. Short daily exposure (5–15 min) beats one long
 *     weekly session; this is the "greasing the groove" idea.
 *   • Stay well short of failure on holds — stop each attempt while the shape
 *     is still clean. Quality reps are what the nervous system keeps.
 *   • One clear criterion per step. You move on when you meet it, not when you
 *     get bored of it — every skipped step shows up later as a stalled skill.
 *
 * Each progression below is a ladder of steps, each with an explicit "you own
 * it when…" test, plus prerequisites, common mistakes and the safety rules that
 * actually matter for that skill. Pure data + helpers; no React.
 */

export type SkillCategory = "handbalancing" | "staticStrength" | "dynamicStrength" | "acrobatics";

export const SKILL_CATEGORIES: { key: SkillCategory; label: string; emoji: string; blurb: string }[] = [
  { key: "handbalancing", label: "Hand balancing", emoji: "🤸", blurb: "Being upside down on your hands, on purpose" },
  { key: "staticStrength", label: "Static strength", emoji: "🪨", blurb: "Holds: levers, planche, flag" },
  { key: "dynamicStrength", label: "Strength skills", emoji: "💪", blurb: "One-limb and full-range strength feats" },
  { key: "acrobatics", label: "Acrobatics", emoji: "🌀", blurb: "Flips and tumbling — coach and mats first" },
];

export interface SkillStep {
  name: string;
  /** The unambiguous test that says you've got this step. */
  criterion: string;
  /** How to actually train it. */
  how: string;
}

export interface Skill {
  id: string;
  name: string;
  emoji: string;
  category: SkillCategory;
  blurb: string;
  /** 1 (a few weeks) → 5 (years, and a coach). */
  difficulty: 1 | 2 | 3 | 4 | 5;
  timeline: string;
  /** How often, and how much, to practise this one. */
  practice: string;
  prereqs: string[];
  steps: SkillStep[];
  mistakes: string[];
  safety: string[];
}

export const SKILLS: Skill[] = [
  {
    id: "handstand",
    name: "Freestanding handstand",
    emoji: "🤸",
    category: "handbalancing",
    blurb: "The gateway skill: a straight, balanced line on your hands, held without a wall.",
    difficulty: 3,
    timeline: "3–12 months of near-daily practice",
    practice: "10–20 min, 4–6×/week, always fresh — before your other training, never after.",
    prereqs: ["Pain-free wrist extension (weight on the palms, fingers forward)", "Shoulders that reach fully overhead against a wall", "A 30 s plank without the low back sagging"],
    steps: [
      { name: "Wrist prep & wall plank", criterion: "60 s in a wall plank (feet on the wall, body at ~45°) with straight arms, ribs down and no pain in the wrists.", how: "Two minutes of wrist rocks every session before anything else, then wall planks. This builds the tissue that takes the load later." },
      { name: "Chest-to-wall hold", criterion: "60 s chest-to-wall with hands 10–15 cm from the wall, hollow body, only the toes touching.", how: "Walk up the wall until your chest is close to it. Squeeze glutes, tuck ribs, push the floor away and look between your hands. This is the shape everything else is built on." },
      { name: "Wall heel-pulls", criterion: "Pull both heels off the wall and balance for 3–5 s, ten times in a session.", how: "From chest-to-wall, shift weight into the fingers, peel the heels off, then let them come back. You're learning where balance actually is." },
      { name: "Finger balance & bailing", criterion: "Cartwheel out of a handstand cleanly, both directions, without thinking about it.", how: "Balance is fingertips (falling back) versus the heel of the hand (falling over). Drill the bail until it's automatic — you can't practise freestanding until falling is boring." },
      { name: "Freestanding 10 s", criterion: "10 s freestanding, arms straight, body one line, no walking.", how: "Kick up gently to the balance point and make micro-corrections with the fingers. Film every set from the side — you cannot feel your own alignment." },
      { name: "Consistent 30 s", criterion: "30 s freestanding, on demand, three attempts out of five.", how: "Volume of clean kick-ups. Add straight-line drills (toe pulls, shoulder shrugs) and start every session with your best attempts, not your tired ones." },
    ],
    mistakes: [
      "Banana back: over-arching so the hips and legs fall behind the hands. Fix by squeezing glutes and pulling the ribs down — a straight line is easier to balance than a curve.",
      "Bent arms. If the elbows bend, the balance point disappears. Go back to the wall and build straight-arm time.",
      "Practising tired, at the end of a workout. That's when bad shapes get grooved.",
      "Never learning to bail — so every attempt is half-hearted and you never actually reach the balance point.",
    ],
    safety: ["Learn the cartwheel bail before freestanding attempts.", "Clear a 2 m circle behind you and train on a firm surface — a soft mat is worse, not better, for the wrists.", "Stop the session when wrists start aching; wrist pain compounds fast."],
  },
  {
    id: "handstand-pushup",
    name: "Handstand push-up",
    emoji: "🙃",
    category: "handbalancing",
    blurb: "Pressing your own bodyweight overhead — first at the wall, then free.",
    difficulty: 4,
    timeline: "6–18 months from a solid handstand",
    practice: "2–3×/week as a strength lift (3–5 sets), separate from balance practice.",
    prereqs: ["60 s chest-to-wall handstand hold", "Overhead press at ~0.6× bodyweight, or 10 strict pike push-ups"],
    steps: [
      { name: "Pike push-up", criterion: "10 strict reps, hips high, forehead touching the floor.", how: "Feet on the floor, hips stacked over the shoulders. Elbows track slightly forward, not flared." },
      { name: "Elevated pike push-up", criterion: "8 reps with feet on a knee-high box, forehead to the floor.", how: "Raise the feet a step at a time; each elevation shifts more bodyweight onto the shoulders." },
      { name: "Wall HSPU (partial)", criterion: "5 reps to a 10 cm deficit-free depth, back-to-wall, controlled.", how: "Back to the wall, lower under control. Add depth before you add reps." },
      { name: "Wall HSPU (full ROM)", criterion: "5 strict reps, head lightly touching the floor, no kip.", how: "Chest-to-wall is the honest version — it stops you arching to make it easier." },
      { name: "Deficit & freestanding", criterion: "3 freestanding reps, or 5 wall reps on parallettes with a full stretch at the bottom.", how: "Deficit reps on parallettes build the bottom-range strength; freestanding then becomes a balance problem, not a strength one." },
    ],
    mistakes: ["Kipping the legs to grind out reps — it trains nothing you wanted.", "Flaring the elbows wide, which loads the shoulder joint at its weakest angle.", "Chasing reps before you own the full range."],
    safety: ["Tuck the chin and keep the head off the floor as a load-bearer.", "Have a bail plan on freestanding attempts.", "Back off if the shoulder pinches at the bottom — usually a sign the overhead range isn't there yet."],
  },
  {
    id: "muscle-up",
    name: "Bar muscle-up",
    emoji: "🔝",
    category: "dynamicStrength",
    blurb: "Pull-up straight into a dip — the classic bar-to-support transition.",
    difficulty: 3,
    timeline: "2–6 months with the strength prerequisites in place",
    practice: "2–3×/week, low reps and fresh — transitions are a skill, not a conditioning drill.",
    prereqs: ["8–10 strict pull-ups", "8–10 straight-bar or ring dips", "Pain-free shoulder rotation under load"],
    steps: [
      { name: "Chest-to-bar pull-ups", criterion: "5 strict pull-ups touching the bar at the sternum.", how: "Pull the bar towards your chest, not your chin — the muscle-up needs that extra height and that pulling angle." },
      { name: "Explosive pull + hollow", criterion: "3 pull-ups where the bar reaches the bottom of your ribcage.", how: "Start hollow, pull hard and fast, keep the elbows driving back and down. Height comes from speed, not grinding." },
      { name: "Straight-bar dip", criterion: "8 strict dips on a straight bar from the support position.", how: "This is the half everyone skips. Lean slightly forward over the bar, elbows back." },
      { name: "Transition drill (jumping / band)", criterion: "5 clean transitions from a jump or band assist, no chicken-wing.", how: "The transition is a fast forward lean over the bar while the elbows rotate. Drill it slowly with a band before adding speed." },
      { name: "Full muscle-up", criterion: "One strict rep from a dead hang, no kip.", how: "False grip helps on rings; on a bar it's speed plus an early lean. Attempt it fresh, at the very start of the session." },
      { name: "Consistency", criterion: "3 consecutive strict reps.", how: "Now it's strength endurance — build the dip and chest-to-bar pull-up numbers behind it." },
    ],
    mistakes: ["Pulling to the chin instead of the chest, so there's never enough height.", "Waiting at the top of the pull — the transition needs momentum you can't create from a stall.", "Chicken-winging one arm over first, which loads the shoulder badly and stalls the skill."],
    safety: ["Rings are kinder to the shoulders than a bar while learning the transition.", "Don't attempt it fatigued — most muscle-up shoulder tweaks happen on the eighth failed rep.", "Build the dip strength before the transition; the drop into the dip is where the injuries come from."],
  },
  {
    id: "front-lever",
    name: "Front lever",
    emoji: "➖",
    category: "staticStrength",
    blurb: "Hanging horizontal, face up, body dead straight — the benchmark straight-arm pull.",
    difficulty: 4,
    timeline: "6–18 months",
    practice: "2–3×/week, 4–6 short holds (5–10 s each) with full rest, all before other pulling.",
    prereqs: ["10 strict pull-ups", "30 s hollow-body hold", "Comfortable straight-arm scapular pull-downs from a hang"],
    steps: [
      { name: "Scapular pulls & hollow body", criterion: "10 scapular pull-ups from a dead hang + a 45 s hollow hold.", how: "Straight arms, pull the shoulder blades down and back. The front lever is a straight-arm skill — the strength lives in the scapulae and lats." },
      { name: "Tuck front lever", criterion: "20 s with the hips at shoulder height and the back flat, not rounded.", how: "Knees to chest, actively push the bar away and hold the body horizontal. Flat back, ribs down." },
      { name: "Advanced tuck", criterion: "15 s with the thighs vertical and the back flat.", how: "Open the hips out of the tuck. If the hips drop, you've opened too far — close it back up." },
      { name: "One-leg / straddle lever", criterion: "10 s with one leg straight (both sides) or a wide straddle.", how: "Lengthening the lever is how you add load. Straddle first if your hips are open; one-leg first if not." },
      { name: "Full front lever", criterion: "5 s straight-body hold, dead level, arms locked.", how: "Bridge the gap with eccentrics (lower slowly from an inverted hang) and banded full-lever holds." },
      { name: "Own it", criterion: "10 s full hold, or a front-lever pull-up.", how: "Add reps: raises from a hang, and pull-ups held at lever height." },
    ],
    mistakes: ["Bending the elbows — that's a completely different (easier) exercise and it stops the straight-arm strength developing.", "Rounding the back to fake horizontal. Film from the side.", "Progressing to a longer lever before the current one is genuinely level."],
    safety: ["Warm the elbows and biceps tendons up thoroughly — straight-arm work loads them hard.", "Stop the set the moment the hips drop; junk time under tension only adds elbow strain.", "Ease in gradually if you're new to straight-arm work — connective tissue adapts far more slowly than muscle."],
  },
  {
    id: "planche",
    name: "Planche",
    emoji: "✈️",
    category: "staticStrength",
    blurb: "Body horizontal, arms straight, feet off the floor — the hardest common bodyweight hold.",
    difficulty: 5,
    timeline: "2–4 years to full; tuck and advanced tuck come much sooner",
    practice: "2–3×/week, 5–8 short holds (5–10 s) with 2–3 min rest, always before pushing work.",
    prereqs: ["Solid handstand hold", "15 s L-sit", "Pain-free straight-arm loading through the elbow"],
    steps: [
      { name: "Planche lean", criterion: "30 s in a push-up position with the shoulders well forward of the hands and the scapulae protracted.", how: "The most underrated step. Push the floor away, hollow, and lean until the wrists complain — then back off slightly and hold." },
      { name: "Tuck planche", criterion: "20 s with hips at shoulder height, knees tucked, arms straight.", how: "Parallettes save your wrists. Protract hard — a rounded upper back is correct here." },
      { name: "Advanced tuck planche", criterion: "15 s with the back flat and the thighs vertical.", how: "Open the hips gradually. Straight arms are non-negotiable; if the elbows bend, regress." },
      { name: "Straddle planche", criterion: "8 s with legs straight and wide, body level.", how: "This is the big jump. Support it with band-assisted straddle holds and slow eccentrics from a handstand." },
      { name: "Full planche", criterion: "3–5 s, legs together, body level, arms locked.", how: "Years of straight-arm scapular work. Weighted planche leans and full-body tension work are the drivers." },
    ],
    mistakes: ["Bent elbows — the single most common way a 'planche' isn't one.", "Piking the hips up to make it feel achievable.", "Too much volume: this is a nervous-system and connective-tissue skill, and it punishes junk sets."],
    safety: ["Parallettes take a lot of strain off the wrists — use them.", "Biceps-tendon and elbow pain means back off a step and build straight-arm time; that injury takes months to settle.", "Never train planche to failure."],
  },
  {
    id: "human-flag",
    name: "Human flag",
    emoji: "🏴",
    category: "staticStrength",
    blurb: "Body horizontal off a vertical pole, held by one pushing and one pulling arm.",
    difficulty: 5,
    timeline: "1–2 years",
    practice: "2×/week, short holds each side, fresh.",
    prereqs: ["Strong side-plank (60 s)", "10 pull-ups", "Overhead pressing strength and healthy shoulders"],
    steps: [
      { name: "Support setup & vertical hold", criterion: "15 s hanging vertically off the pole with the top arm pulling and bottom arm pushing, hips stacked.", how: "Top hand pulls, bottom hand pushes — that push is where most of the work is. Grip about shoulder-width apart on the pole." },
      { name: "Chamber (tuck) flag", criterion: "10 s with the knees tucked and hips at shoulder height.", how: "Kick up into the tuck, then hold. Squeeze everything: obliques, glutes, lats." },
      { name: "Vertical-to-horizontal negatives", criterion: "5 slow (4 s) lowers each side.", how: "Start feet-up vertical and lower under control toward horizontal. Eccentrics build this skill faster than holds." },
      { name: "One-leg / straddle flag", criterion: "8 s each side with one leg extended or a straddle.", how: "Extend the lever gradually — straddle is the easier of the two for most people." },
      { name: "Full flag", criterion: "5 s straight-body, both sides.", how: "Keep training both sides equally; the flag builds a lopsided body fast if you don't." },
    ],
    mistakes: ["Treating it as a pulling skill — the bottom arm's push is the limiter for almost everyone.", "Only training your good side.", "Gripping too far apart, which makes the bottom-arm push impossible."],
    safety: ["Check the pole is genuinely fixed before you load it.", "Warm up the shoulders and obliques; this is a high-tension position for both.", "Train both sides evenly to avoid an asymmetric spine load."],
  },
  {
    id: "pistol-squat",
    name: "Pistol squat",
    emoji: "🦵",
    category: "dynamicStrength",
    blurb: "A full single-leg squat to the bottom and back up, other leg held out front.",
    difficulty: 2,
    timeline: "1–4 months",
    practice: "2–3×/week, 3–4 sets each side, well short of failure.",
    prereqs: ["Deep bodyweight squat with heels down", "Reasonable single-leg balance", "Ankle dorsiflexion — knee past the toes with the heel down"],
    steps: [
      { name: "Box pistol", criterion: "8 reps each side to a knee-high box, no hand support.", how: "Sit to the box under control, tap, stand. Lower the box a little every week or two." },
      { name: "Counterbalanced pistol", criterion: "5 full-depth reps each side holding a 5–10 kg plate out front.", how: "The counterweight is a cheat that works — it shifts your centre of mass and lets you reach the bottom." },
      { name: "Assisted full pistol", criterion: "5 reps each side with one fingertip on a wall or a light band.", how: "Reduce the assistance until it's only balance, not force." },
      { name: "Full pistol", criterion: "3 clean reps each side, full depth, heel down, no bounce.", how: "Pause a beat at the bottom to prove there's no rebound doing the work." },
      { name: "Own it", criterion: "8 reps each side, or 5 reps holding 10 kg.", how: "Now add load, or start on the rolling and jumping variations." },
    ],
    mistakes: ["Heel lifting at the bottom — an ankle-mobility problem, not a strength one. Train knee-to-wall ankle work.", "Collapsing the knee inward. Drive it over the second toe.", "Bouncing out of the bottom instead of owning it."],
    safety: ["If the knee hurts, elevate the heel slightly and reduce the depth while the ankle range catches up.", "Train both sides to the weaker side's number."],
  },
  {
    id: "one-arm-pushup",
    name: "One-arm push-up",
    emoji: "💪",
    category: "dynamicStrength",
    blurb: "A strict push-up on one arm, hips square — mostly a full-body tension skill.",
    difficulty: 3,
    timeline: "3–9 months",
    practice: "2–3×/week, low reps, fresh.",
    prereqs: ["20 strict push-ups", "Solid plank and side-plank", "Healthy shoulder & elbow"],
    steps: [
      { name: "Elevated one-arm push-up", criterion: "8 reps each side with the hand on a waist-high surface.", how: "Feet a little wider than usual; brace the obliques hard to stop the hips rotating." },
      { name: "Lower the elevation", criterion: "5 reps each side at knee height.", how: "Drop the surface a step at a time. If the hips twist, go back up a step." },
      { name: "Archer push-up", criterion: "6 reps each side, one arm nearly straight out to the side.", how: "Builds the one-side loading pattern while keeping a safety hand." },
      { name: "Partial one-arm push-up", criterion: "5 half-depth reps each side on the floor.", how: "Work the top half first, then add depth over weeks." },
      { name: "Full one-arm push-up", criterion: "3 reps each side, chest to the floor, hips level.", how: "Feet wide to start, then narrow the stance as it gets easier — narrow feet is the hard version." },
    ],
    mistakes: ["Rotating the hips to reach the floor — that's a different (easier) exercise.", "Elbow flaring wide, which is where the elbow pain comes from.", "Chasing reps before full depth is there."],
    safety: ["Elbow discomfort means regress; the one-arm push-up loads the elbow more than people expect.", "Keep the working shoulder packed — down and back, not shrugged."],
  },
  {
    id: "l-sit",
    name: "L-sit → V-sit",
    emoji: "📐",
    category: "staticStrength",
    blurb: "Legs straight out (then up), supported on the hands — compression plus straight-arm support.",
    difficulty: 2,
    timeline: "1–6 months for the L-sit",
    practice: "Daily is fine: 4–6 short holds, stopping while the legs are still straight.",
    prereqs: ["Support hold on parallettes or dip bars", "Basic hamstring range (seated pike, hands past the toes)"],
    steps: [
      { name: "Support hold", criterion: "45 s on parallettes, shoulders depressed, arms locked.", how: "Push down and away from the bars; the shoulders should be well below the ears." },
      { name: "Tuck L-sit", criterion: "30 s with the knees tucked at hip height.", how: "Push down hard, round the low back slightly, hold the knees up with the hip flexors — not the shoulders shrugging." },
      { name: "One-leg L-sit", criterion: "15 s each side, one leg straight.", how: "Alternate legs. This is where compression strength shows up." },
      { name: "Full L-sit", criterion: "15 s, legs straight and level with the hips, toes pointed.", how: "Add seated compression drills (lifting straight legs off the floor) — that's usually the limiter, not the arms." },
      { name: "V-sit", criterion: "5 s with the legs above hip height.", how: "Compression work, pike stretches and hip-flexor strength. Most people need the hamstring range before the strength." },
    ],
    mistakes: ["Shrugging into the shoulders instead of pushing down.", "Bending the knees while calling it an L-sit — stop the hold when the knees bend.", "Ignoring hamstring range, which caps the position for many people."],
    safety: ["Start on parallettes or blocks so the wrists aren't in full extension.", "Build up gradually if you have any hip-flexor tendon niggles."],
  },
  {
    id: "bridge",
    name: "Full bridge / wheel",
    emoji: "🌉",
    category: "acrobatics",
    blurb: "A strong, evenly-shared backbend — and the foundation every flip-back skill sits on.",
    difficulty: 2,
    timeline: "1–6 months",
    practice: "3–5×/week, short sets — this is mobility with strength, so frequency wins.",
    prereqs: ["Overhead shoulder range (arms to a wall, ribs down)", "Pain-free spinal extension"],
    steps: [
      { name: "Glute bridge & hip extension", criterion: "45 s glute bridge with the ribs down and no low-back cramping.", how: "Learn to extend from the hips before you ask the spine for it." },
      { name: "Elevated bridge", criterion: "20 s pushing up onto a sofa or bench, arms straight.", how: "Elevation lets you get the arms straight while the shoulders catch up." },
      { name: "Floor bridge", criterion: "20 s with straight arms, straight legs and the shoulders stacked over the hands.", how: "Push the chest through the arms. Most 'stiff backs' are actually stiff shoulders." },
      { name: "Rocking bridge", criterion: "10 controlled rocks, shoulders travelling past the hands and back.", how: "This builds a bridge that can absorb force — which is what tumbling needs." },
      { name: "Wall walks", criterion: "Walk the hands down a wall to the floor and back up, 3 times.", how: "The direct path to the back-handspring shape and to standing up out of a bridge." },
    ],
    mistakes: ["Bending the elbows and calling it done — the shoulders, not the low back, are usually the limit.", "Bending the knees and taking the arch entirely from the lumbar spine.", "Forcing it cold; bridges want a genuine warm-up."],
    safety: ["Sharp low-back pinching means the extension is all coming from the lumbar spine — open the shoulders and hips instead.", "Never bridge onto a slippery floor."],
  },
  {
    id: "kip-up",
    name: "Kip-up",
    emoji: "⚡",
    category: "acrobatics",
    blurb: "Snapping from your back to your feet in one movement — cheap to learn, big payoff.",
    difficulty: 2,
    timeline: "2 weeks – 3 months",
    practice: "2–3×/week on mats, 10–20 attempts while fresh.",
    prereqs: ["Ability to roll back onto the shoulders comfortably", "Basic hip-flexor and core strength"],
    steps: [
      { name: "Rocking to shoulders", criterion: "10 smooth rocks back onto the upper back with the hands by the ears.", how: "Hands beside the head, fingers pointing to the shoulders — the same hand position as the final skill." },
      { name: "Hip snap drill", criterion: "10 forceful hip snaps that lift the hips clear of the mat.", how: "From the rocked-back position, whip the hips up and forward. Legs stay together, snap comes from the hips, not the knees." },
      { name: "Kip to knees/squat", criterion: "5 kips landing on the knees or in a deep squat.", how: "Add the hand push. Push hard as the hips reach the top." },
      { name: "Full kip-up", criterion: "3 kip-ups to standing, feet landing under the hips.", how: "The fix for landing short is almost always throwing the legs further overhead first." },
    ],
    mistakes: ["Kicking the legs up instead of snapping the hips forward.", "Hands too far from the shoulders, so there's nothing to push with.", "Not committing — a tentative kip-up lands on the tailbone."],
    safety: ["Mats until it's reliable.", "Tuck the chin; the head never takes the load."],
  },
  {
    id: "cartwheel-roundoff",
    name: "Cartwheel → round-off",
    emoji: "🔄",
    category: "acrobatics",
    blurb: "The entry skill for tumbling — and the power source for every back-handspring pass.",
    difficulty: 2,
    timeline: "2 weeks – 2 months",
    practice: "2–3×/week, plenty of low-fatigue reps on a soft surface.",
    prereqs: ["Comfortable taking weight on the hands", "Basic handstand shape against a wall"],
    steps: [
      { name: "Straight-line cartwheel", criterion: "5 cartwheels along a line, hand-hand-foot-foot, hips passing over the shoulders.", how: "Think of it as a handstand you fall out of sideways. Look at your hands as they land." },
      { name: "Both directions", criterion: "3 clean cartwheels on your non-dominant side.", how: "Awkward and worth it — tumbling asks for both sides eventually." },
      { name: "Round-off (snap-down)", criterion: "3 round-offs landing on two feet together, facing back the way you came.", how: "The round-off is a cartwheel with a quarter turn and a fast snap of the legs together. The snap-down is the whole skill." },
      { name: "Round-off rebound", criterion: "3 round-offs landing into a tall, straight jump backwards.", how: "Land tight and rebound immediately — that rebound is what powers the back handspring." },
    ],
    mistakes: ["Legs landing one at a time in a round-off (that's just a cartwheel).", "Piking the hips so the legs never get overhead.", "Looking at the landing instead of the hands."],
    safety: ["Grass or mats while learning.", "Warm the wrists and shoulders up first."],
  },
  {
    id: "back-handspring",
    name: "Back handspring",
    emoji: "🤾",
    category: "acrobatics",
    blurb: "Jumping backwards onto the hands and snapping to the feet. Coach and mats — not a solo project.",
    difficulty: 4,
    timeline: "3–12 months with coaching",
    practice: "1–2 coached sessions/week plus shape and strength work at home.",
    prereqs: ["Solid floor bridge & wall walks", "Round-off with a rebound", "A coach and proper mats — this one is genuinely not a self-taught skill"],
    steps: [
      { name: "Shapes & wall walks", criterion: "3 wall walks down and back up, plus a 30 s hollow hold.", how: "The handspring is two shapes: a sit-and-lean, then a hollow snap. Drill them separately." },
      { name: "Jump-back to mat", criterion: "10 confident backward jumps onto a raised crash mat, arms driving overhead.", how: "Sit back like sitting into a chair, then jump backwards and up — not just backwards. Arms swing past the ears." },
      { name: "Spotted handspring", criterion: "5 handsprings with a coach's light spot, landing on the feet.", how: "The spot removes the fear so you can learn the shape. Do them until the coach is barely touching you." },
      { name: "Handspring off a raised surface", criterion: "5 clean reps from a raised mat down to a lower one.", how: "Gravity helps you rotate, so you can find the timing with less power." },
      { name: "Standing back handspring", criterion: "3 unspotted on a floor mat, hands landing under the shoulders and a snap to the feet.", how: "Then chain it: round-off → back handspring." },
    ],
    mistakes: ["Throwing the head back first, which pulls the shoulders down and kills the jump.", "Jumping backwards without jumping up — you need height, not just distance.", "Bending the arms on landing, which is how people hit their head."],
    safety: ["Get a coach and use mats. This is the skill where self-teaching most often ends in a wrist, neck or head injury.", "Never attempt it on a hard floor while learning.", "Arms must stay straight and strong on hand contact."],
  },
  {
    id: "backflip",
    name: "Standing backflip (back tuck)",
    emoji: "🔃",
    category: "acrobatics",
    blurb: "A backwards somersault from standing. High reward, high consequence — coached progression only.",
    difficulty: 5,
    timeline: "6–24 months with coaching",
    practice: "1–2 coached sessions/week; the strength and jump work happens on your own days.",
    prereqs: [
      "A confident, controlled back handspring or a coach-led tumbling background",
      "A vertical jump you can repeat cleanly, and the ability to land softly",
      "Access to a coach, a trampoline or foam pit, and crash mats",
    ],
    steps: [
      { name: "Jump & tuck", criterion: "10 standing jumps pulling the knees to the chest, landing balanced on the same spot.", how: "The flip is a maximum vertical jump plus a fast tuck. If the jump goes backwards, so does the flip." },
      { name: "Backdrop / trampoline rotation", criterion: "10 back-tucks on a trampoline landing on the feet, chin tucked.", how: "A trampoline buys you air time to learn the rotation without needing the jump yet." },
      { name: "Back tuck into a pit or crash mat", criterion: "10 flips into a foam pit or onto a raised crash mat, consistently landing on the feet.", how: "Same skill, forgiving landing. Repeat until it's boring." },
      { name: "Spotted standing tuck", criterion: "5 standing back tucks on mats with a light spot.", how: "The coach's spot is for the timing and the fear, not the rotation." },
      { name: "Standing back tuck", criterion: "3 unspotted on a soft floor, landing upright with the chest tall.", how: "Only when a coach says the spotted version is consistent. Progress the surface slowly — mats, then sprung floor, and only then anything firmer." },
    ],
    mistakes: [
      "Throwing the head back to start the rotation — it travels the body backwards instead of up, and it's the main cause of under-rotated landings.",
      "Not committing halfway through: a half-hearted flip is far more dangerous than a full one.",
      "Skipping the pit/trampoline volume and going straight to the ground.",
    ],
    safety: [
      "Do not self-teach this one. Get a coach, and use a trampoline, foam pit or crash mats for the whole learning phase.",
      "Never attempt it on concrete, grass with hidden ground, or into water — landing under-rotated from a standing flip risks the neck and spine.",
      "Warm up thoroughly and stop the moment you're tired: a fatigued flip is an under-rotated flip.",
    ],
  },
  {
    id: "front-flip",
    name: "Standing front flip",
    emoji: "🔁",
    category: "acrobatics",
    blurb: "A forward somersault. Easier to rotate than a backflip, harder to land — you can't see the floor.",
    difficulty: 4,
    timeline: "6–18 months with coaching",
    practice: "1–2 coached sessions/week, plus jump and landing mechanics at home.",
    prereqs: ["Confident forward roll and dive roll", "Strong two-foot jump and soft landings", "Coach, trampoline/pit and mats"],
    steps: [
      { name: "Dive roll", criterion: "10 dive rolls flying over an obstacle and rolling out smoothly.", how: "Teaches you to leave the ground forwards and rotate safely." },
      { name: "Trampoline front tuck", criterion: "10 front tucks on a trampoline landing on the feet.", how: "Jump UP, then tuck hard and fast. The knees come to the chest, not the chest to the knees." },
      { name: "Front tuck into a pit", criterion: "10 flips into foam or onto a raised crash mat, landing feet-first.", how: "Learn to spot the landing — you'll see the floor late, so the timing has to be trained." },
      { name: "Spotted standing front tuck", criterion: "5 on mats with a coach's spot.", how: "Punch the ground, arms drive up then down, tuck tight." },
      { name: "Standing front tuck", criterion: "3 unspotted on a soft floor, landing upright.", how: "Then progress to a run-up version, which is easier once the standing one is solid." },
    ],
    mistakes: ["Diving forward instead of jumping up — the classic under-rotation and face-plant.", "Opening the tuck too early because you can't see the ground.", "Untucking late and landing on the heels."],
    safety: ["Coach, mats, pit — same rules as the backflip.", "The landing, not the rotation, is the risk here: train the landing separately.", "Never on a hard surface while learning."],
  },
];

export const SKILL_BY_ID = (id: string): Skill | undefined => SKILLS.find((s) => s.id === id);

/** How skill practice should sit inside a training week. */
export const SKILL_PRINCIPLES: string[] = [
  "Skill first, fatigue later. Practise at the START of a session, before strength or conditioning — every rep done tired is a rep of a worse movement pattern.",
  "Frequency beats duration. 10–15 focused minutes 5 days a week teaches a skill far faster than 75 minutes once a week.",
  "Stop each attempt while the shape is still clean. On holds, that means ending the set well before you shake — 'quality reps only' is the whole method.",
  "One criterion per step. Meet the test, then move on; don't skip a step because the next one looks more fun — skipped steps are what stall skills at the 80% mark.",
  "Film yourself from the side, every session. You cannot feel your own alignment upside down, and the video will disagree with you.",
  "Straight-arm skills (levers, planche) load tendons far more slowly than they load muscle — add volume gradually and expect elbow niggles if you rush.",
  "Flips need a coach, mats and a pit. That isn't caution for its own sake: it is genuinely the fastest route as well as the safe one.",
];

/* ---- Progress tracking helpers (state itself lives in the UI) ---- */

/** Stable key for a completed step, for storing progress. */
export const stepKey = (skillId: string, index: number) => `${skillId}:${index}`;

export interface SkillProgress {
  /** Steps completed, in order, from the bottom of the ladder. */
  done: number;
  total: number;
  pct: number;
  /** The step to work on right now (null once the skill is finished). */
  next: SkillStep | null;
  nextIndex: number;
}

/**
 * Progress along a ladder is the number of *consecutive* steps completed from
 * the bottom: ticking step 4 while step 2 is unticked doesn't mean you own the
 * skill, so the "next step" is always the lowest one still open.
 */
export function skillProgress(skill: Skill, completed: Set<string>): SkillProgress {
  let done = 0;
  while (done < skill.steps.length && completed.has(stepKey(skill.id, done))) done++;
  return {
    done,
    total: skill.steps.length,
    pct: Math.round((done / skill.steps.length) * 100),
    next: done < skill.steps.length ? skill.steps[done] : null,
    nextIndex: done,
  };
}
