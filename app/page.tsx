import type { Metadata } from "next";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "Fitness Calculators",
  description:
    "Plan a hypertrophy routine, save it and get it rated with Chris Beardsley's Weekly Net Stimulus model — plus stimulating reps, an exercise library, and strength, nutrition and cardio calculators. Free and private.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return <Shell initialId="hub" />;
}
