import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ALL_TOOLS, findTool } from "@/lib/tools";
import { getToolContent } from "@/lib/toolContent";
import Shell from "@/components/Shell";

type Params = Promise<{ tool: string }>;

export function generateStaticParams() {
  return ALL_TOOLS.map((t) => ({ tool: t.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { tool } = await params;
  const t = findTool(tool);
  if (!t) return {};
  const description = getToolContent(tool).description ?? t.blurb;
  // The tab always reads "Fitness Calculators"; shares still name the tool.
  const title = "Fitness Calculators";
  const shareTitle = `${t.name} — Fitness Calculators`;
  const url = `/t/${tool}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: shareTitle, description, url, type: "website" },
    twitter: { card: "summary_large_image", title: shareTitle, description },
  };
}

export default async function ToolPage({ params }: { params: Params }) {
  const { tool } = await params;
  if (!findTool(tool)) notFound();
  return <Shell initialId={tool} />;
}
