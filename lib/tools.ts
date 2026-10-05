import type { ComponentType } from "react";
import MyNumbers from "@/components/calculators/MyNumbers";
import RepMax from "@/components/calculators/RepMax";
import TrainingMax from "@/components/calculators/TrainingMax";
import PlateLoading from "@/components/calculators/PlateLoading";
import StrengthStandards from "@/components/calculators/StrengthStandards";
import LiftBalance from "@/components/calculators/LiftBalance";
import RpeConverter from "@/components/calculators/RpeConverter";
import StrengthScore from "@/components/calculators/StrengthScore";
import WorkoutPlan from "@/components/calculators/WorkoutPlan";
import SportsBuildRater from "@/components/calculators/SportsBuildRater";
import AthleteScore from "@/components/calculators/AthleteScore";
import AgeGradedRunning from "@/components/calculators/AgeGradedRunning";
import FitnessAge from "@/components/calculators/FitnessAge";
import Vo2Max from "@/components/calculators/Vo2Max";
import HeartRateZones from "@/components/calculators/HeartRateZones";
import PaceRace from "@/components/calculators/PaceRace";
import RunPaces from "@/components/calculators/RunPaces";
import FtpZones from "@/components/calculators/FtpZones";
import SwimZones from "@/components/calculators/SwimZones";
import TreadmillPace from "@/components/calculators/TreadmillPace";
import RaceSplits from "@/components/calculators/RaceSplits";
import Tdee from "@/components/calculators/Tdee";
import Macros from "@/components/calculators/Macros";
import BodyComp from "@/components/calculators/BodyComp";
import IdealWeight from "@/components/calculators/IdealWeight";
import DietPlanner from "@/components/calculators/DietPlanner";
import Ffmi from "@/components/calculators/Ffmi";
import MuscleGain from "@/components/calculators/MuscleGain";
import CalorieBurn from "@/components/calculators/CalorieBurn";
import Caffeine from "@/components/calculators/Caffeine";
import Sleep from "@/components/calculators/Sleep";
import Water from "@/components/calculators/Water";
import SweatRate from "@/components/calculators/SweatRate";
import WeeklyNetStimulus from "@/components/calculators/WeeklyNetStimulus";
import RoutinePlanner from "@/components/calculators/RoutinePlanner";
import StimulatingReps from "@/components/calculators/StimulatingReps";
import ExerciseLibrary from "@/components/calculators/ExerciseLibrary";

export interface Tool {
  id: string;
  name: string;
  blurb: string;
  Component: ComponentType;
}

export interface ToolGroup {
  group: string;
  tools: Tool[];
}

/** The full navigation registry: groups, in display order, with their tools. */
export const TOOL_GROUPS: ToolGroup[] = [
  {
    group: "Hypertrophy",
    tools: [
      { id: "routine-planner", name: "Routine planner", blurb: "Build sessions, save routines and get a hypertrophy rating", Component: RoutinePlanner },
      { id: "net-stimulus", name: "Weekly net stimulus", blurb: "Beardsley's model: weekly growth stimulus minus atrophy", Component: WeeklyNetStimulus },
      { id: "stimulating-reps", name: "Stimulating reps", blurb: "How many reps in your sets actually build muscle", Component: StimulatingReps },
      { id: "exercise-library", name: "Exercise library", blurb: "Which muscles each exercise trains, and how much", Component: ExerciseLibrary },
      { id: "workout-plan", name: "Workout plan generator", blurb: "Weekly plan from your goal, sport & lifts", Component: WorkoutPlan },
      { id: "muscle-gain", name: "Muscle-gain potential", blurb: "How much muscle you can gain & by when", Component: MuscleGain },
      { id: "ffmi", name: "FFMI", blurb: "Fat-free mass index", Component: Ffmi },
    ],
  },
  {
    group: "Overview",
    tools: [
      { id: "my-numbers", name: "My numbers", blurb: "Your key metrics at a glance, from your saved stats", Component: MyNumbers },
      { id: "athlete-score", name: "Athlete score", blurb: "One all-round 0–1000 athleticism score", Component: AthleteScore },
    ],
  },
  {
    group: "Strength",
    tools: [
      { id: "rep-max", name: "Rep-max", blurb: "1RM / 3RM / 5RM + full table", Component: RepMax },
      { id: "rpe", name: "RPE / 1RM converter", blurb: "RPE ↔ %1RM ↔ reps in reserve", Component: RpeConverter },
      { id: "training-max", name: "Training max", blurb: "Working-weight percentages", Component: TrainingMax },
      { id: "plate-loading", name: "Plate loading", blurb: "Plates per side for a target", Component: PlateLoading },
      { id: "standards", name: "Strength standards", blurb: "Rank your lifts by age, weight & sport", Component: StrengthStandards },
      { id: "strength-score", name: "Strength score", blurb: "One overall score & percentile across your lifts", Component: StrengthScore },
      { id: "lift-balance", name: "Lift balance", blurb: "Are your big lifts in proportion?", Component: LiftBalance },
    ],
  },
  {
    group: "Body & Nutrition",
    tools: [
      { id: "tdee", name: "TDEE / BMR", blurb: "Daily energy needs", Component: Tdee },
      { id: "diet-planner", name: "Cut / bulk planner", blurb: "Calories, macros & a timeline to your goal", Component: DietPlanner },
      { id: "macros", name: "Macros", blurb: "Protein / carbs / fat split", Component: Macros },
      { id: "body-comp", name: "Body composition", blurb: "Navy BF%, BMI, waist ratio", Component: BodyComp },
      { id: "ideal-weight", name: "Ideal weight", blurb: "Healthy range + lean mass", Component: IdealWeight },
      { id: "calorie-burn", name: "Calorie burn", blurb: "Energy used by activity (METs)", Component: CalorieBurn },
    ],
  },
  {
    group: "Cardio",
    tools: [
      { id: "vo2max", name: "VO₂ max", blurb: "Cooper, run & resting-HR methods", Component: Vo2Max },
      { id: "hr-zones", name: "Heart-rate zones", blurb: "5 zones, Karvonen / % max", Component: HeartRateZones },
      { id: "pace-race", name: "Pace & race predictor", blurb: "Pace + Riegel predictions", Component: PaceRace },
      { id: "run-paces", name: "Run training paces", blurb: "Zone paces from a race or test (VDOT)", Component: RunPaces },
      { id: "race-splits", name: "Race-day splits", blurb: "Even / negative split sheet for your goal", Component: RaceSplits },
      { id: "treadmill-pace", name: "Treadmill pace", blurb: "Incline → equivalent flat pace (ACSM)", Component: TreadmillPace },
      { id: "ftp-zones", name: "Cycling power zones", blurb: "FTP-based watt zones + W/kg (Coggan)", Component: FtpZones },
      { id: "swim-zones", name: "Swim pace zones", blurb: "Critical Swim Speed + pace zones", Component: SwimZones },
    ],
  },
  {
    group: "Recovery",
    tools: [
      { id: "sleep", name: "Sleep cycles", blurb: "Best bed / wake times", Component: Sleep },
      { id: "caffeine", name: "Caffeine tracker", blurb: "Half-life decay curve", Component: Caffeine },
      { id: "water", name: "Water intake", blurb: "Daily hydration target", Component: Water },
      { id: "sweat-rate", name: "Sweat rate", blurb: "Weigh-in/out → fluid replacement", Component: SweatRate },
    ],
  },
  {
    group: "Sport & Compete",
    tools: [
      { id: "build-rater", name: "Sports build rater", blurb: "Rate your build for a sport & position", Component: SportsBuildRater },
      { id: "age-grade", name: "Age-graded running", blurb: "Compare race times across age & sex", Component: AgeGradedRunning },
      { id: "fitness-age", name: "Biological age", blurb: "How old is your body, really?", Component: FitnessAge },
    ],
  },
];

export const ALL_TOOLS: Tool[] = TOOL_GROUPS.flatMap((g) => g.tools);

export function findTool(id: string): Tool | undefined {
  return ALL_TOOLS.find((t) => t.id === id);
}
