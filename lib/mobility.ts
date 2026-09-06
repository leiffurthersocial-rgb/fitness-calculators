/**
 * lib/mobility.ts
 * ---------------
 * A goal-driven mobility session builder: pick what you actually want (front
 * splits, overhead shoulders, a deeper squat…) and how many minutes you have,
 * and it lays out a session that fits — prep, main work, and a down-regulating
 * finish — with a per-exercise clock the guided timer can walk through.
 *
 * What the programming follows (current flexibility literature):
 *   • Dose beats heroics. Roughly 5 minutes per week of stretching per muscle
 *     group captures most of the available range-of-motion gain (Thomas et al.
 *     2018; Nakamura et al. 2021). Frequency matters more than session length,
 *     so short and near-daily beats one weekly marathon.
 *   • Long-term range comes from tissue adaptation, not just "loosening up".
 *     Short-term ROM is mostly stretch *tolerance*; lasting change comes from
 *     long holds and, above all, loading the end range.
 *   • End-range strength makes range usable. PAILs/RAILs-style contract-relax
 *     and loaded work (Jefferson curls, Cossack squats, deficit splits) turn
 *     passive range into range you can actually control — and it is retained
 *     far better than passive stretching alone.
 *   • Warm tissue first. Dynamic work and joint CARs before long holds; the
 *     long passive holds land at the end, when nothing hard follows.
 *   • Don't blunt what comes next. Static holds over ~60 s per muscle can
 *     transiently reduce force and power, so pre-training sessions are built
 *     from dynamic and short-hold work instead.
 *
 * Pure logic, no React. All times in seconds.
 */

export type MobilityGoal =
  | "frontSplits"
  | "middleSplits"
  | "pancake"
  | "squatDepth"
  | "hipFlexors"
  | "hamstrings"
  | "overhead"
  | "thoracic"
  | "backbend"
  | "ankles"
  | "wrists"
  | "spine"
  | "neckDesk"
  | "warmup"
  | "unwind";

export interface GoalDef {
  key: MobilityGoal;
  label: string;
  blurb: string;
  emoji: string;
}

export const MOBILITY_GOALS: GoalDef[] = [
  { key: "frontSplits", label: "Front splits", blurb: "Hamstrings + hip flexors, one leg forward", emoji: "🤸" },
  { key: "middleSplits", label: "Middle splits", blurb: "Straddle — adductors & hip rotation", emoji: "🅰️" },
  { key: "pancake", label: "Pancake fold", blurb: "Seated straddle fold: adductors + hip hinge", emoji: "🥞" },
  { key: "squatDepth", label: "Deep squat", blurb: "Sit in a full squat comfortably", emoji: "⬇️" },
  { key: "hipFlexors", label: "Hip flexors", blurb: "Undo sitting — open the front of the hip", emoji: "🪑" },
  { key: "hamstrings", label: "Hamstrings", blurb: "Toe touch, pike, straight-leg range", emoji: "🦵" },
  { key: "overhead", label: "Overhead shoulders", blurb: "Arms fully overhead — handstands & pressing", emoji: "🙌" },
  { key: "thoracic", label: "Upper back", blurb: "Thoracic extension & rotation", emoji: "🔙" },
  { key: "backbend", label: "Backbend / bridge", blurb: "Full-body extension, shoulders to hips", emoji: "🌉" },
  { key: "ankles", label: "Ankles", blurb: "Dorsiflexion for squats, lunges & running", emoji: "🦶" },
  { key: "wrists", label: "Wrists", blurb: "Handstand & floor-work prep", emoji: "✋" },
  { key: "spine", label: "Spine", blurb: "Segmental control, flexion, extension, rotation", emoji: "🐍" },
  { key: "neckDesk", label: "Neck & desk relief", blurb: "Neck, chest and upper traps after a screen day", emoji: "💻" },
  { key: "warmup", label: "Pre-training warm-up", blurb: "Dynamic only — ready to lift or sprint", emoji: "🔥" },
  { key: "unwind", label: "Wind down", blurb: "Long, calm holds and breathing before bed", emoji: "🌙" },
];

export type Block = "prep" | "main" | "finish";
export type Method = "car" | "dynamic" | "static" | "loaded" | "contractRelax" | "isometric";

export const METHOD_LABEL: Record<Method, string> = {
  car: "Joint circle (CAR)",
  dynamic: "Dynamic",
  static: "Static hold",
  loaded: "Loaded end-range",
  contractRelax: "Contract–relax (PAILs/RAILs)",
  isometric: "End-range isometric",
};

export type Equipment = "none" | "wall" | "block" | "band" | "weight";

export interface MobilityExercise {
  id: string;
  name: string;
  goals: MobilityGoal[];
  block: Block;
  method: Method;
  /** Working time for one side (or the whole set if not per-side). */
  seconds: number;
  perSide?: boolean;
  cue: string;
  equipment: Equipment;
  /** How demanding it is — used to cap hard work in short/beginner sessions. */
  demand: 1 | 2 | 3;
  /** Higher scores get picked first for their goal. */
  priority: number;
}

/**
 * Exercise library. Each entry is tagged with every goal it genuinely serves,
 * so a session for two goals naturally overlaps rather than doubling in length.
 */
export const MOBILITY_LIBRARY: MobilityExercise[] = [
  /* ---- Prep: joint circles & dynamic warm-up ---- */
  { id: "hipCar", name: "Hip CARs", goals: ["frontSplits", "middleSplits", "squatDepth", "hipFlexors", "warmup", "pancake"], block: "prep", method: "car", seconds: 40, perSide: true, cue: "Stand tall, drive the knee up, out, around and back — slowest circle you can control. Keep the rest of you still.", equipment: "none", demand: 1, priority: 9 },
  { id: "shoulderCar", name: "Shoulder CARs", goals: ["overhead", "thoracic", "neckDesk", "warmup", "backbend"], block: "prep", method: "car", seconds: 40, perSide: true, cue: "Biggest, slowest arm circle you own. Fist clenched, ribs down — no arching to cheat height.", equipment: "none", demand: 1, priority: 9 },
  { id: "spineCar", name: "Spinal CARs (cat–cow to circles)", goals: ["spine", "thoracic", "backbend", "warmup", "neckDesk"], block: "prep", method: "car", seconds: 60, cue: "On all fours: flex and extend one segment at a time, then circle the ribcage. Move slowly enough to feel each vertebra.", equipment: "none", demand: 1, priority: 8 },
  { id: "legSwing", name: "Leg swings (front/back + side)", goals: ["frontSplits", "hamstrings", "hipFlexors", "warmup", "middleSplits"], block: "prep", method: "dynamic", seconds: 40, perSide: true, cue: "Hold a wall. Relaxed swings, letting the range grow every rep — never force the end.", equipment: "wall", demand: 1, priority: 7 },
  { id: "worldsGreatest", name: "World's greatest stretch", goals: ["hipFlexors", "thoracic", "squatDepth", "warmup", "spine"], block: "prep", method: "dynamic", seconds: 45, perSide: true, cue: "Deep lunge, elbow to instep, then rotate the top arm to the ceiling and follow it with your eyes.", equipment: "none", demand: 2, priority: 8 },
  { id: "ankleRock", name: "Knee-to-wall ankle rocks", goals: ["ankles", "squatDepth", "warmup"], block: "prep", method: "dynamic", seconds: 40, perSide: true, cue: "Toes a hand's width from the wall, drive the knee over the toes without the heel lifting. Rock in and out.", equipment: "wall", demand: 1, priority: 9 },
  { id: "wristPrep", name: "Wrist prep series", goals: ["wrists", "warmup", "backbend"], block: "prep", method: "dynamic", seconds: 60, cue: "Palms down, rock forward and back; then fingers back; then backs of hands down. Gentle, 10 s each position.", equipment: "none", demand: 1, priority: 9 },
  { id: "catCow", name: "Cat–cow", goals: ["spine", "thoracic", "backbend", "unwind", "warmup"], block: "prep", method: "dynamic", seconds: 45, cue: "Breathe with it: exhale to round, inhale to extend. Let the movement travel from tailbone to skull.", equipment: "none", demand: 1, priority: 6 },
  { id: "squatRock", name: "Deep squat rocks", goals: ["squatDepth", "ankles", "hipFlexors", "warmup"], block: "prep", method: "dynamic", seconds: 45, cue: "Sink into the deepest squat you have and rock side to side and forward, keeping heels down.", equipment: "none", demand: 2, priority: 8 },
  { id: "scapPushup", name: "Scapular push-ups & wall slides", goals: ["overhead", "thoracic", "neckDesk", "warmup"], block: "prep", method: "dynamic", seconds: 45, cue: "Protract and retract with straight arms; then back to a wall, slide arms overhead keeping ribs and wrists on the wall.", equipment: "wall", demand: 1, priority: 7 },
  { id: "hipHinge", name: "Dynamic hamstring sweeps", goals: ["hamstrings", "frontSplits", "warmup"], block: "prep", method: "dynamic", seconds: 40, perSide: true, cue: "Heel forward, hinge at the hip with a long spine and sweep the hands past the shin. Never round to reach further.", equipment: "none", demand: 1, priority: 6 },

  /* ---- Main: the work that actually changes range ---- */
  { id: "coupleStretch", name: "Couch stretch (hip flexor)", goals: ["hipFlexors", "frontSplits", "backbend"], block: "main", method: "static", seconds: 90, perSide: true, cue: "Back foot up a wall or sofa, squeeze the glute of the back leg and tuck the tailbone. The tuck is the stretch — not leaning back.", equipment: "wall", demand: 2, priority: 10 },
  { id: "halfKneelPails", name: "Half-kneeling hip flexor PAILs/RAILs", goals: ["hipFlexors", "frontSplits"], block: "main", method: "contractRelax", seconds: 75, perSide: true, cue: "Find the end range, then push the back knee into the floor at ~40% for 10 s, relax, then actively pull deeper for 10 s. Two cycles.", equipment: "none", demand: 3, priority: 9 },
  { id: "jeffersonCurl", name: "Jefferson curl", goals: ["hamstrings", "spine", "pancake", "frontSplits"], block: "main", method: "loaded", seconds: 75, cue: "Light weight, feet on a block. Roll down one vertebra at a time, hang for a breath, roll up the same way. Load stays light — this is range, not a deadlift.", equipment: "weight", demand: 3, priority: 9 },
  { id: "pikeCompression", name: "Seated pike + active compression", goals: ["hamstrings", "pancake", "frontSplits"], block: "main", method: "isometric", seconds: 60, cue: "Fold as far as you go, then let go with the hands and actively pull yourself down for 5 s ×6. That's the part that sticks.", equipment: "none", demand: 2, priority: 8 },
  { id: "splitHold", name: "Front split hold (blocks under hips)", goals: ["frontSplits"], block: "main", method: "static", seconds: 90, perSide: true, cue: "Hips square to the front. Sink onto blocks so you can actually relax — a shaking split is not a split you own.", equipment: "block", demand: 3, priority: 10 },
  { id: "splitLift", name: "Split-position active lifts", goals: ["frontSplits", "middleSplits"], block: "main", method: "isometric", seconds: 45, perSide: true, cue: "From your deepest split, lift the front leg off the floor 5–10 times. Ugly and tiny is correct — this is what stops range slipping away.", equipment: "none", demand: 3, priority: 8 },
  { id: "straddleWall", name: "Legs-up-the-wall straddle", goals: ["middleSplits", "pancake", "unwind"], block: "main", method: "static", seconds: 120, cue: "Lie on your back, legs up the wall and let gravity open the straddle. Breathe out and let the inner thighs give.", equipment: "wall", demand: 1, priority: 8 },
  { id: "frogStretch", name: "Frog stretch", goals: ["middleSplits", "squatDepth", "pancake"], block: "main", method: "static", seconds: 90, cue: "Knees wide, shins parallel, hips back to the point of a real stretch. Rock gently, then settle and breathe.", equipment: "none", demand: 2, priority: 9 },
  { id: "cossack", name: "Cossack squat", goals: ["middleSplits", "squatDepth", "ankles", "hamstrings"], block: "main", method: "loaded", seconds: 60, perSide: true, cue: "Shift side to side into the deepest position with the heel down; hold the bottom 3 s before switching. Add a light counterweight if it helps you sit deeper.", equipment: "none", demand: 3, priority: 9 },
  { id: "pancakeHold", name: "Pancake fold (elevated, then flat)", goals: ["pancake", "middleSplits", "hamstrings"], block: "main", method: "static", seconds: 90, cue: "Sit on a block, legs wide, hinge from the hips with a long spine. Walk the hands forward only as far as the back stays flat.", equipment: "block", demand: 2, priority: 10 },
  { id: "adductorPails", name: "Straddle PAILs/RAILs", goals: ["middleSplits", "pancake"], block: "main", method: "contractRelax", seconds: 75, cue: "At end range: press the legs into the floor at ~40% for 10 s, relax on the exhale, then actively drag the legs wider for 10 s. Two cycles.", equipment: "none", demand: 3, priority: 8 },
  { id: "deepSquatHold", name: "Deep squat hold (weighted counterbalance)", goals: ["squatDepth", "ankles", "hipFlexors"], block: "main", method: "loaded", seconds: 90, cue: "Hold a light weight at your chest as a counterbalance, sit all the way down, chest tall, heels down. Pry the knees out with the elbows.", equipment: "weight", demand: 2, priority: 10 },
  { id: "heelElevatedSquat", name: "Deficit / heel-elevated squat sit", goals: ["squatDepth", "ankles"], block: "main", method: "static", seconds: 60, cue: "Heels on a small plate or book. Sit as deep as you can and let the ankles and knees travel forward.", equipment: "block", demand: 2, priority: 7 },
  { id: "ankleLoaded", name: "Loaded knee-to-wall ankle stretch", goals: ["ankles", "squatDepth"], block: "main", method: "loaded", seconds: 60, perSide: true, cue: "Knee driving over the toes, heel down, weight through the front foot. Push into the end range for 5 s ×8, gaining a few millimetres each time.", equipment: "wall", demand: 2, priority: 9 },
  { id: "calfRaiseDeficit", name: "Deficit calf raise (slow eccentric)", goals: ["ankles"], block: "main", method: "loaded", seconds: 60, cue: "Toes on a step, lower for 4 s into the deepest stretch you can hold, pause 2 s, drive back up.", equipment: "block", demand: 2, priority: 6 },
  { id: "overheadWall", name: "Wall overhead test hold", goals: ["overhead", "thoracic"], block: "main", method: "isometric", seconds: 60, cue: "Back flat to the wall, ribs down, arms overhead trying to touch the wall with the backs of the hands without the ribs flaring. Hold and breathe.", equipment: "wall", demand: 2, priority: 10 },
  { id: "bandDislocate", name: "Band shoulder dislocates", goals: ["overhead", "thoracic", "backbend"], block: "main", method: "dynamic", seconds: 60, cue: "Wide grip on a band, take the arms from front to back with straight elbows. Narrow the grip a little each set, never to the point of shrugging.", equipment: "band", demand: 2, priority: 9 },
  { id: "germanHang", name: "German hang / skin-the-cat hold", goals: ["overhead", "thoracic", "backbend"], block: "main", method: "static", seconds: 45, cue: "Hang behind you with straight arms, only as far as your shoulders are calm. Build up slowly — this is a strong position, not a yank.", equipment: "wall", demand: 3, priority: 7 },
  { id: "overheadPails", name: "Overhead PAILs/RAILs on a rack", goals: ["overhead"], block: "main", method: "contractRelax", seconds: 75, perSide: true, cue: "Hand fixed overhead at end range. Press down into the bar at ~40% for 10 s, relax, then actively pull yourself deeper for 10 s. Two cycles.", equipment: "wall", demand: 3, priority: 8 },
  { id: "thoracicExt", name: "Thoracic extension over a block/roller", goals: ["thoracic", "backbend", "neckDesk", "overhead"], block: "main", method: "static", seconds: 75, cue: "Block under the mid-back, hands behind the head, ribs knitted down. Extend over the block on the exhale, then move the block up a level.", equipment: "block", demand: 2, priority: 10 },
  { id: "openBook", name: "Open-book rotation", goals: ["thoracic", "spine", "neckDesk", "unwind"], block: "main", method: "dynamic", seconds: 60, perSide: true, cue: "Side-lying, knees stacked on a block, open the top arm and follow it with your eyes. Exhale at the end of each rotation.", equipment: "block", demand: 1, priority: 8 },
  { id: "bridge", name: "Bridge (glute → full)", goals: ["backbend", "thoracic", "hipFlexors"], block: "main", method: "loaded", seconds: 45, cue: "Build up: glute bridge → hands on the floor by the ears → push to a bridge. Push through the shoulders and let the extension come from the upper back, not just the low back.", equipment: "none", demand: 3, priority: 10 },
  { id: "sphinxSeal", name: "Sphinx → seal", goals: ["backbend", "spine", "unwind"], block: "main", method: "static", seconds: 75, cue: "Elbows under shoulders, then slowly straighten the arms as far as it stays comfortable. Glutes relaxed, breath slow.", equipment: "none", demand: 1, priority: 7 },
  { id: "wristLoaded", name: "Loaded wrist rocks (front & back)", goals: ["wrists"], block: "main", method: "loaded", seconds: 60, cue: "On all fours, fingers forward: rock over the hands to the end range and hold 3 s ×8. Repeat with fingers turned back, then backs of hands.", equipment: "none", demand: 2, priority: 10 },
  { id: "fingerRaise", name: "Finger & wrist extensor raises", goals: ["wrists"], block: "main", method: "loaded", seconds: 45, cue: "Palms down on the floor, lift each finger and then the whole palm against the load. Builds the tissue that takes the handstand.", equipment: "none", demand: 2, priority: 7 },
  { id: "segRoll", name: "Segmental roll-down at the wall", goals: ["spine", "hamstrings", "unwind"], block: "main", method: "dynamic", seconds: 60, cue: "Back on the wall, peel down one vertebra at a time and stack back up the same way. Slow enough to feel the segments you skip.", equipment: "wall", demand: 1, priority: 7 },
  { id: "deadBug", name: "Dead bug + ribcage control", goals: ["spine", "backbend", "neckDesk"], block: "main", method: "isometric", seconds: 60, cue: "Low back glued to the floor, ribs down, extend opposite arm and leg on a long exhale. Control is the point.", equipment: "none", demand: 2, priority: 6 },
  { id: "chinTuck", name: "Chin tucks + neck isometrics", goals: ["neckDesk"], block: "main", method: "isometric", seconds: 45, cue: "Tall spine, glide the chin straight back (make a double chin), hold 5 s ×8. Then light 5-second pushes into your own hand in each direction.", equipment: "none", demand: 1, priority: 9 },
  { id: "doorwayPec", name: "Doorway pec stretch (3 heights)", goals: ["neckDesk", "overhead", "thoracic", "backbend"], block: "main", method: "static", seconds: 45, perSide: true, cue: "Forearm on the frame at shoulder height, step through and turn away. Repeat low and high — the fibres run in different directions.", equipment: "wall", demand: 1, priority: 8 },
  { id: "trapStretch", name: "Upper trap & levator stretch", goals: ["neckDesk", "unwind"], block: "main", method: "static", seconds: 45, perSide: true, cue: "Sit on the hand of the side you're stretching, tilt the ear to the other shoulder, then turn the nose down. Breathe, never pull hard.", equipment: "none", demand: 1, priority: 7 },
  { id: "hamstringWall", name: "Supine hamstring stretch at a wall", goals: ["hamstrings", "frontSplits", "unwind"], block: "main", method: "static", seconds: 90, perSide: true, cue: "Lie in a doorway, one leg up the frame, other leg flat. Keep the knee soft-straight and the low back down — hold long, breathe out.", equipment: "wall", demand: 1, priority: 9 },
  { id: "nordic", name: "Nordic curl / sliding leg curl (eccentric)", goals: ["hamstrings"], block: "main", method: "loaded", seconds: 60, cue: "Lower as slowly as you can control, catch and push back. Hamstrings gain range best when they're loaded long.", equipment: "none", demand: 3, priority: 6 },
  { id: "pigeon", name: "Pigeon / 90-90 hip rotation", goals: ["hipFlexors", "squatDepth", "middleSplits", "unwind"], block: "main", method: "static", seconds: 75, perSide: true, cue: "Front shin angled, hips square. Sit tall first, then fold forward only when the hip stops shouting.", equipment: "none", demand: 2, priority: 8 },
  { id: "ninetyNinety", name: "90/90 hip switches + lift-offs", goals: ["hipFlexors", "squatDepth", "middleSplits", "spine"], block: "main", method: "isometric", seconds: 60, cue: "Sit in 90/90, lift the back knee off the floor and hold 5 s; switch sides through the floor without using your hands.", equipment: "none", demand: 3, priority: 7 },

  /* ---- Finish: down-regulate ---- */
  { id: "childPose", name: "Child's pose with side reach", goals: ["unwind", "thoracic", "spine", "neckDesk"], block: "finish", method: "static", seconds: 60, cue: "Knees wide, hips back, walk the hands over to each side. Long, slow exhales.", equipment: "none", demand: 1, priority: 8 },
  { id: "legsUp", name: "Legs up the wall", goals: ["unwind", "hamstrings"], block: "finish", method: "static", seconds: 120, cue: "Hips close to the wall, arms wide, nothing to do. Breathe out twice as long as you breathe in.", equipment: "wall", demand: 1, priority: 9 },
  { id: "supineTwist", name: "Supine spinal twist", goals: ["unwind", "spine", "thoracic"], block: "finish", method: "static", seconds: 60, perSide: true, cue: "Knees over to one side, opposite shoulder staying down. Exhale and let the ribs melt.", equipment: "none", demand: 1, priority: 8 },
  { id: "boxBreath", name: "Box breathing", goals: ["unwind", "neckDesk"], block: "finish", method: "static", seconds: 90, cue: "In 4, hold 4, out 4, hold 4. Nose only. This is what tells the nervous system the session is over.", equipment: "none", demand: 1, priority: 7 },
];

/* ------------------------------------------------------------------ */
/* Session generation                                                  */
/* ------------------------------------------------------------------ */

export type Level = "beginner" | "intermediate" | "advanced";

export const LEVELS: { key: Level; label: string; blurb: string }[] = [
  { key: "beginner", label: "New to this", blurb: "Shorter holds, gentler positions" },
  { key: "intermediate", label: "Some experience", blurb: "Standard holds and loading" },
  { key: "advanced", label: "Experienced", blurb: "Longer holds, PAILs/RAILs and loaded end-range" },
];

export interface SessionItem {
  exercise: MobilityExercise;
  /** Working seconds per side after the level/time adjustment. */
  seconds: number;
  /** Total clock time for the item (both sides where relevant). */
  totalSec: number;
  /** The goal(s) from your selection this item is serving. */
  serves: MobilityGoal[];
}

export interface SessionBlock {
  block: Block;
  label: string;
  purpose: string;
  items: SessionItem[];
  totalSec: number;
}

export interface MobilitySession {
  goals: MobilityGoal[];
  level: Level;
  minutes: number;
  blocks: SessionBlock[];
  totalSec: number;
  /** Goals you selected that this session length couldn't reach. */
  unserved: MobilityGoal[];
  notes: string[];
  /** Per-goal weekly dose check, against the ~5 min/week evidence. */
  weekly: { goal: MobilityGoal; secPerSession: number; sessionsForDose: number }[];
}

/**
 * Transition time budgeted per exercise — getting to the wall, fetching a
 * block, switching sides. It is part of the session budget and appears in the
 * guided timer as its own short "set up" step, so the clock never lies about
 * how long the session takes.
 */
export const TRANSITION_SEC = 12;

/** Hold-length multiplier by level — beginners hold shorter, and load less. */
const LEVEL_TIME: Record<Level, number> = { beginner: 0.75, intermediate: 1, advanced: 1.2 };
/** Highest exercise demand allowed, by level. */
const LEVEL_MAX_DEMAND: Record<Level, number> = { beginner: 2, intermediate: 3, advanced: 3 };

/** Share of the session each block gets (a warm-up-only session skips main). */
const BLOCK_SHARE: Record<Block, number> = { prep: 0.25, main: 0.6, finish: 0.15 };

const BLOCK_META: Record<Block, { label: string; purpose: string }> = {
  prep: { label: "Prep", purpose: "Warm the joints and take them through their own range before you ask for more." },
  main: { label: "Main work", purpose: "The part that changes range: long holds, end-range loading and contract–relax." },
  finish: { label: "Finish", purpose: "Down-regulate — long, calm holds so the range you just found is kept, not braced away." },
};

export interface MobilityInput {
  goals: MobilityGoal[];
  minutes: number;
  level: Level;
  /** Equipment you have. "none" still allows a wall — everyone has a wall. */
  equipment: Equipment[];
}

const round5 = (s: number) => Math.max(15, Math.round(s / 5) * 5);

function itemTime(ex: MobilityExercise, seconds: number): number {
  return seconds * (ex.perSide ? 2 : 1) + TRANSITION_SEC;
}

/**
 * Pick exercises for one block, round-robin across the chosen goals so no
 * single goal eats the whole session, until the block's time budget is spent.
 */
function selectBlock(
  block: Block,
  goals: MobilityGoal[],
  budgetSec: number,
  input: MobilityInput,
  used: Set<string>
): SessionItem[] {
  const maxDemand = LEVEL_MAX_DEMAND[input.level];
  const timeMul = LEVEL_TIME[input.level];
  const hasKit = (e: Equipment) => e === "none" || input.equipment.includes(e);

  // Candidate pool per goal, best-first.
  const pools = new Map<MobilityGoal, MobilityExercise[]>();
  for (const g of goals) {
    pools.set(
      g,
      MOBILITY_LIBRARY.filter(
        (ex) => ex.block === block && ex.goals.includes(g) && ex.demand <= maxDemand && hasKit(ex.equipment)
      ).sort((a, b) => b.priority - a.priority)
    );
  }

  const items: SessionItem[] = [];
  let spent = 0;
  let progress = true;
  // Round-robin: one exercise per goal per pass, so a two-goal session
  // alternates rather than finishing goal one before it starts goal two.
  while (progress && spent < budgetSec) {
    progress = false;
    for (const g of goals) {
      const pool = pools.get(g) ?? [];
      const next = pool.find((ex) => !used.has(ex.id));
      if (!next) continue;
      const seconds = round5(next.seconds * timeMul);
      const cost = itemTime(next, seconds);
      // Always allow the first item of a block, so a very short session still
      // gets a prep move and a finisher rather than an empty block.
      if (spent + cost > budgetSec && items.length > 0) continue;
      used.add(next.id);
      items.push({
        exercise: next,
        seconds,
        totalSec: cost,
        serves: goals.filter((gg) => next.goals.includes(gg)),
      });
      spent += cost;
      progress = true;
      if (spent >= budgetSec) break;
    }
  }
  return items;
}

export function generateSession(input: MobilityInput): MobilitySession {
  const minutes = Math.max(5, Math.min(90, input.minutes));
  const goals = input.goals.length ? input.goals : (["warmup"] as MobilityGoal[]);
  const budget = minutes * 60;

  // A pre-training warm-up has no business ending in 2-minute passive holds,
  // and a wind-down needs no dynamic prep — so the block split shifts.
  const onlyWarmup = goals.length === 1 && goals[0] === "warmup";
  const onlyUnwind = goals.length === 1 && goals[0] === "unwind";
  const share: Record<Block, number> = onlyWarmup
    ? { prep: 0.55, main: 0.45, finish: 0 }
    : onlyUnwind
    ? { prep: 0.15, main: 0.45, finish: 0.4 }
    : { ...BLOCK_SHARE };
  // Very short sessions skip the finisher and put the time into real work.
  if (minutes < 10 && !onlyUnwind) {
    share.main += share.finish;
    share.finish = 0;
  }

  const used = new Set<string>();
  const blocks: SessionBlock[] = [];
  for (const block of ["prep", "main", "finish"] as Block[]) {
    if (share[block] <= 0) continue;
    const items = selectBlock(block, goals, budget * share[block], input, used);
    if (items.length === 0) continue;
    blocks.push({
      block,
      ...BLOCK_META[block],
      items,
      totalSec: items.reduce((s, i) => s + i.totalSec, 0),
    });
  }

  const totalSec = blocks.reduce((s, b) => s + b.totalSec, 0);
  const allItems = blocks.flatMap((b) => b.items);
  const served = new Set(allItems.flatMap((i) => i.serves));
  const unserved = goals.filter((g) => !served.has(g));

  // Weekly dose per goal: ~5 min (300 s) of work per week is the point where
  // most of the available range-of-motion gain has been captured.
  const weekly = goals.map((g) => {
    const secPerSession = allItems
      .filter((i) => i.serves.includes(g))
      .reduce((s, i) => s + i.seconds * (i.exercise.perSide ? 2 : 1), 0);
    return {
      goal: g,
      secPerSession,
      sessionsForDose: secPerSession > 0 ? Math.max(1, Math.ceil(300 / secPerSession)) : 0,
    };
  });

  const notes: string[] = [];
  notes.push(
    "About 5 minutes of work per week per position captures most of the range you can gain — so frequency beats marathon sessions. Short and near-daily wins."
  );
  notes.push(
    "Long-term range comes from loading the end position, not just sitting in it. The loaded and contract–relax entries are the ones that make new range stick."
  );
  if (goals.includes("warmup"))
    notes.push("Before lifting or sprinting, keep static holds under ~60 s per muscle — longer passive holds can temporarily dull force and power output.");
  if (onlyUnwind)
    notes.push("Breathe out longer than you breathe in throughout. The parasympathetic shift is half the point of a wind-down session.");
  if (input.level === "beginner")
    notes.push("Work at a 5–6/10 stretch, never sharp pain. Range comes from repeated exposure your nervous system accepts, not from forcing an end range once.");
  if (unserved.length)
    notes.push(
      `Not enough time for ${unserved.map((g) => MOBILITY_GOALS.find((x) => x.key === g)?.label ?? g).join(", ")} — add minutes, or run those goals on their own day.`
    );
  notes.push("Re-test one honest benchmark (sit-and-reach, knee-to-wall, wall overhead) every 3–4 weeks; day-to-day range swings far more than you'd think.");

  return { goals, level: input.level, minutes, blocks, totalSec, unserved, notes, weekly };
}

/**
 * Flatten a session into timer steps: a short set-up step per exercise, then
 * one working step per side. The steps sum to exactly `session.totalSec`.
 */
export function sessionSteps(session: MobilitySession): {
  key: string;
  label: string;
  seconds: number;
  cue: string;
  detail: string;
  kind: "setup" | "work";
}[] {
  const steps: {
    key: string;
    label: string;
    seconds: number;
    cue: string;
    detail: string;
    kind: "setup" | "work";
  }[] = [];
  for (const block of session.blocks) {
    block.items.forEach((item, i) => {
      const detail = `${block.label} · ${METHOD_LABEL[item.exercise.method]}`;
      steps.push({
        key: `${block.block}-${i}-setup`,
        label: `Set up — ${item.exercise.name}`,
        seconds: TRANSITION_SEC,
        cue: item.exercise.cue,
        detail: `${block.label} · get into position`,
        kind: "setup",
      });
      const sides = item.exercise.perSide ? ["Left", "Right"] : [null];
      for (const side of sides) {
        steps.push({
          key: `${block.block}-${i}-${side ?? "both"}`,
          label: side ? `${item.exercise.name} — ${side}` : item.exercise.name,
          seconds: item.seconds,
          cue: item.exercise.cue,
          detail,
          kind: "work",
        });
      }
    });
  }
  return steps;
}

export const goalLabel = (g: MobilityGoal): string =>
  MOBILITY_GOALS.find((x) => x.key === g)?.label ?? g;
