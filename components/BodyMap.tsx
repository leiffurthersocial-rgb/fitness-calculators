"use client";

import type { MuscleId } from "@/lib/exercises";
import type { MuscleVerdict } from "@/lib/hub";

/**
 * A schematic front/back body map. Each muscle group is a simple shape,
 * filled by its forecast verdict. Deliberately abstract (Swiss-style blocks),
 * not anatomical illustration.
 */

type Shape =
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { kind: "rect"; x: number; y: number; w: number; h: number; r?: number }
  | { kind: "poly"; points: string };

const mirror = (s: Shape): Shape => {
  if (s.kind === "ellipse") return { ...s, cx: 120 - s.cx };
  if (s.kind === "rect") return { ...s, x: 120 - s.x - s.w };
  return {
    kind: "poly",
    points: s.points
      .split(" ")
      .map((p) => {
        const [x, y] = p.split(",").map(Number);
        return `${120 - x},${y}`;
      })
      .join(" "),
  };
};
const pair = (s: Shape): Shape[] => [s, mirror(s)];

const FRONT: [MuscleId, Shape[]][] = [
  ["traps", pair({ kind: "poly", points: "52,33 44,40 56,40" })],
  ["side-delts", pair({ kind: "ellipse", cx: 27, cy: 52, rx: 5, ry: 10 })],
  ["front-delts", pair({ kind: "ellipse", cx: 36, cy: 49, rx: 7, ry: 9 })],
  ["upper-chest", pair({ kind: "rect", x: 43, y: 42, w: 16, h: 9, r: 2 })],
  ["chest", pair({ kind: "rect", x: 43, y: 52, w: 16, h: 14, r: 3 })],
  ["biceps", pair({ kind: "ellipse", cx: 28, cy: 76, rx: 5.5, ry: 12 })],
  ["forearms", pair({ kind: "ellipse", cx: 24, cy: 106, rx: 5, ry: 14 })],
  ["obliques", pair({ kind: "rect", x: 42, y: 70, w: 7, h: 36, r: 3 })],
  ["abs", [{ kind: "rect", x: 51, y: 69, w: 18, h: 42, r: 3 }]],
  ["adductors", pair({ kind: "poly", points: "58,128 52,134 56,168 59,168" })],
  ["quads", pair({ kind: "rect", x: 40, y: 126, w: 12, h: 58, r: 6 })],
  ["calves", pair({ kind: "ellipse", cx: 47, cy: 212, rx: 5, ry: 16 })],
];

const BACK: [MuscleId, Shape[]][] = [
  ["traps", [{ kind: "poly", points: "60,30 44,42 60,56 76,42" }]],
  ["rear-delts", pair({ kind: "ellipse", cx: 35, cy: 50, rx: 7, ry: 8 })],
  ["side-delts", pair({ kind: "ellipse", cx: 27, cy: 53, rx: 5, ry: 9 })],
  ["upper-back", pair({ kind: "rect", x: 45, y: 57, w: 13, h: 14, r: 2 })],
  ["lats", pair({ kind: "poly", points: "42,60 44,74 52,100 58,100 58,74 44,62" })],
  ["triceps", pair({ kind: "ellipse", cx: 28, cy: 76, rx: 5.5, ry: 12 })],
  ["forearms", pair({ kind: "ellipse", cx: 24, cy: 106, rx: 5, ry: 14 })],
  ["lower-back", [{ kind: "rect", x: 52, y: 100, w: 16, h: 16, r: 3 }]],
  ["glutes", pair({ kind: "ellipse", cx: 50, cy: 128, rx: 10, ry: 11 })],
  ["hamstrings", pair({ kind: "rect", x: 41, y: 142, w: 15, h: 44, r: 6 })],
  ["calves", pair({ kind: "ellipse", cx: 48, cy: 210, rx: 7, ry: 18 })],
];

/** Body outline (head, torso, limbs) drawn behind the muscles. */
function Silhouette() {
  return (
    <g className="fill-[var(--fill)] stroke-[var(--line)]" strokeWidth={1}>
      <circle cx={60} cy={17} r={11} />
      <rect x={55} y={26} width={10} height={8} />
      <path d="M40 36 Q60 30 80 36 L86 60 L80 118 L40 118 L34 60 Z" />
      <path d="M22 44 Q30 38 38 42 L34 92 L28 124 L18 124 L20 90 Z" />
      <path d="M98 44 Q90 38 82 42 L86 92 L92 124 L102 124 L100 90 Z" />
      <path d="M40 118 L59 118 L57 192 L54 238 L42 238 L39 192 Z" />
      <path d="M80 118 L61 118 L63 192 L66 238 L78 238 L81 192 Z" />
    </g>
  );
}

const FILL: Record<MuscleVerdict, string> = {
  "under-trained": "#e1301f",
  lagging: "#f19a90",
  "on-track": "#9aa0a6",
  "growing-fast": "var(--ink)",
  "strong-point": "var(--ink)",
  skipped: "transparent",
};

export const VERDICT_SWATCH = FILL;

function ShapeEl({ s, ...rest }: { s: Shape } & React.SVGProps<SVGElement>) {
  if (s.kind === "ellipse") return <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...(rest as React.SVGProps<SVGEllipseElement>)} />;
  if (s.kind === "rect") return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r ?? 0} {...(rest as React.SVGProps<SVGRectElement>)} />;
  return <polygon points={s.points} {...(rest as React.SVGProps<SVGPolygonElement>)} />;
}

export default function BodyMap({
  verdicts,
  titles,
  selected,
  onSelect,
}: {
  verdicts: Partial<Record<MuscleId, MuscleVerdict>>;
  titles: Partial<Record<MuscleId, string>>;
  selected: MuscleId | null;
  onSelect: (m: MuscleId) => void;
}) {
  const view = (label: string, parts: [MuscleId, Shape[]][]) => (
    <figure className="flex flex-col items-center">
      <svg viewBox="0 0 120 245" className="h-72 w-auto sm:h-80" role="img" aria-label={`${label} view muscle map`}>
        <Silhouette />
        {parts.map(([m, shapes]) => {
          const v = verdicts[m] ?? "on-track";
          const isSel = selected === m;
          return (
            <g
              key={m}
              role="button"
              tabIndex={0}
              aria-label={titles[m] ?? m}
              onClick={() => onSelect(m)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(m)}
              className="cursor-pointer outline-none"
            >
              <title>{titles[m] ?? m}</title>
              {shapes.map((s, i) => (
                <ShapeEl
                  key={i}
                  s={s}
                  fill={FILL[v]}
                  stroke={isSel ? "#e1301f" : v === "skipped" ? "var(--line)" : "var(--panel)"}
                  strokeWidth={isSel ? 2 : 1}
                  strokeDasharray={v === "skipped" ? "2 2" : undefined}
                  className="transition-opacity hover:opacity-75"
                />
              ))}
            </g>
          );
        })}
      </svg>
      <figcaption className="swiss-label mt-1 text-zinc-500">{label}</figcaption>
    </figure>
  );
  return (
    <div className="flex justify-center gap-4 sm:gap-10">
      {view("Front", FRONT)}
      {view("Back", BACK)}
    </div>
  );
}
