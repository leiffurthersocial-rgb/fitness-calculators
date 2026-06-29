import type { Metadata } from "next";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "Vital — Free Science-Based Health & Fitness Calculators",
  description:
    "A suite of clean, science-based health & fitness calculators — strength standards, VDOT running paces, TDEE & macros, a cut/bulk planner, FFMI, muscle-gain potential and more. Free, private, works in your browser.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return <Shell initialId="my-numbers" />;
}
