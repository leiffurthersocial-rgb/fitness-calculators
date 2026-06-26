import type { ComponentType } from "react";
import RepMax from "@/components/calculators/RepMax";
import TrainingMax from "@/components/calculators/TrainingMax";
import PlateLoading from "@/components/calculators/PlateLoading";
import Dots from "@/components/calculators/Dots";
import Vo2Max from "@/components/calculators/Vo2Max";
import HeartRateZones from "@/components/calculators/HeartRateZones";
import PaceRace from "@/components/calculators/PaceRace";
import Tdee from "@/components/calculators/Tdee";
import Macros from "@/components/calculators/Macros";
import BodyComp from "@/components/calculators/BodyComp";
import Caffeine from "@/components/calculators/Caffeine";
import Sleep from "@/components/calculators/Sleep";
import Water from "@/components/calculators/Water";
import Pomodoro from "@/components/calculators/Pomodoro";
import Habits from "@/components/calculators/Habits";

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
    group: "Strength",
    emoji: "🏋️",
    tools: [
      { id: "rep-max", name: "Rep-max", blurb: "1RM / 3RM / 5RM + full table", Component: RepMax },
      { id: "training-max", name: "Training max", blurb: "Working-weight percentages", Component: TrainingMax },
      { id: "plate-loading", name: "Plate loading", blurb: "Plates per side for a target", Component: PlateLoading },
      { id: "dots", name: "Wilks / DOTS", blurb: "Bodyweight-adjusted strength", Component: Dots },
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
  {
    group: "Productivity",
    emoji: "⏱️",
    tools: [
      { id: "pomodoro", name: "Pomodoro timer", blurb: "Focus intervals + tally", Component: Pomodoro },
      { id: "habits", name: "Habit tracker", blurb: "Streaks + calendar heatmap", Component: Habits },
    ],
  },
];

export const ALL_TOOLS: Tool[] = TOOL_GROUPS.flatMap((g) => g.tools);

export function findTool(id: string): Tool | undefined {
  return ALL_TOOLS.find((t) => t.id === id);
}
