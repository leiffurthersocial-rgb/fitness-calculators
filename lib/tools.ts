import type { ComponentType } from "react";
import RepMax from "@/components/calculators/RepMax";
import TrainingMax from "@/components/calculators/TrainingMax";
import PlateLoading from "@/components/calculators/PlateLoading";
import StrengthStandards from "@/components/calculators/StrengthStandards";
import SportsBuildRater from "@/components/calculators/SportsBuildRater";
import Vo2Max from "@/components/calculators/Vo2Max";
import HeartRateZones from "@/components/calculators/HeartRateZones";
import PaceRace from "@/components/calculators/PaceRace";
import Tdee from "@/components/calculators/Tdee";
import Macros from "@/components/calculators/Macros";
import BodyComp from "@/components/calculators/BodyComp";
import IdealWeight from "@/components/calculators/IdealWeight";
import Ffmi from "@/components/calculators/Ffmi";
import CalorieBurn from "@/components/calculators/CalorieBurn";
import Caffeine from "@/components/calculators/Caffeine";
import Sleep from "@/components/calculators/Sleep";
import Water from "@/components/calculators/Water";

export interface Tool {
  id: string;
  name: string;
  blurb: string;
  Component: ComponentType;
}

export interface ToolGroup {
  group: string;
  emoji: string;
  tools: Tool[];
}

/** The full navigation registry: groups, in display order, with their tools. */
export const TOOL_GROUPS: ToolGroup[] = [
  {
    group: "Sports",
    emoji: "🏅",
    tools: [
      { id: "build-rater", name: "Sports build rater", blurb: "Rate your build for a sport & position", Component: SportsBuildRater },
    ],
  },
  {
    group: "Strength",
    emoji: "🏋️",
    tools: [
      { id: "rep-max", name: "Rep-max", blurb: "1RM / 3RM / 5RM + full table", Component: RepMax },
      { id: "training-max", name: "Training max", blurb: "Working-weight percentages", Component: TrainingMax },
      { id: "plate-loading", name: "Plate loading", blurb: "Plates per side for a target", Component: PlateLoading },
      { id: "standards", name: "Strength standards", blurb: "Rank your lifts by age, weight & sport", Component: StrengthStandards },
    ],
  },
  {
    group: "Cardio",
    emoji: "❤️",
    tools: [
      { id: "vo2max", name: "VO₂ max", blurb: "Cooper, run & resting-HR methods", Component: Vo2Max },
      { id: "hr-zones", name: "Heart-rate zones", blurb: "5 zones, Karvonen / % max", Component: HeartRateZones },
      { id: "pace-race", name: "Pace & race predictor", blurb: "Pace + Riegel predictions", Component: PaceRace },
    ],
  },
  {
    group: "Body & Nutrition",
    emoji: "🍎",
    tools: [
      { id: "tdee", name: "TDEE / BMR", blurb: "Daily energy needs", Component: Tdee },
      { id: "macros", name: "Macros", blurb: "Protein / carbs / fat split", Component: Macros },
      { id: "body-comp", name: "Body composition", blurb: "Navy BF%, BMI, waist ratio", Component: BodyComp },
      { id: "ideal-weight", name: "Ideal weight", blurb: "Healthy range + lean mass", Component: IdealWeight },
      { id: "ffmi", name: "FFMI", blurb: "Fat-free mass index", Component: Ffmi },
      { id: "calorie-burn", name: "Calorie burn", blurb: "Energy used by activity (METs)", Component: CalorieBurn },
    ],
  },
  {
    group: "Recovery",
    emoji: "🌙",
    tools: [
      { id: "caffeine", name: "Caffeine tracker", blurb: "Half-life decay curve", Component: Caffeine },
      { id: "sleep", name: "Sleep cycles", blurb: "Best bed / wake times", Component: Sleep },
      { id: "water", name: "Water intake", blurb: "Daily hydration target", Component: Water },
    ],
  },
];

export const ALL_TOOLS: Tool[] = TOOL_GROUPS.flatMap((g) => g.tools);

export function findTool(id: string): Tool | undefined {
  return ALL_TOOLS.find((t) => t.id === id);
}
