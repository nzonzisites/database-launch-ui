// DESTINATION: app/about/impact-areas/page.tsx
//
// "Core Impact Areas" page, linked from the bordered-box row at the
// bottom of /about. One intro line, then the three impact areas as
// colored tiles, each with its own geometric mark (picked from the
// "Nzonzi Pillars" design canvas): a woven-stripe grid for Arts and
// Culture, a row of arches for Built Environment, and a pulse line
// through a circle for Health Care and Public Health. The marks are
// inline SVG so they stay crisp at any size and need no image files.
//
// Sized to fit one screen on desktop (the tiles stretch to fill whatever
// height is left under the intro line); on phones the tiles stack and
// the page scrolls. Hovering (or focusing/tapping) a tile reveals its
// description -- see ImpactTile.
//
// IMPACT_AREAS is the one list to touch when the copy changes: fill in
// each `description` and its tile's hover panel turns on.

import Link from "next/link";
import { BROWN, FOREST, MOSS, OCHRE, SAND, WHITE } from "@/lib/colors";
import ImpactTile from "./ImpactTile";

type ImpactArea = {
  name: string;
  color: string;
  description?: string;
  Mark: () => JSX.Element;
};

// 4x4 grid of 60px cells, alternating three horizontal and three
// vertical stripes, with the diagonal cells in BROWN for contrast.
function WeaveMark() {
  const stripes: JSX.Element[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const fill = r === c ? BROWN : WHITE;
      for (const o of [6, 24, 42]) {
        const horizontal = (r + c) % 2 === 0;
        stripes.push(
          <rect
            key={`${r}-${c}-${o}`}
            x={horizontal ? c * 60 : c * 60 + o}
            y={horizontal ? r * 60 + o : r * 60}
            width={horizontal ? 60 : 12}
            height={horizontal ? 12 : 60}
            fill={fill}
          />
        );
      }
    }
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 240 240" width="100%" height="100%">
      {stripes}
    </svg>
  );
}

function ArchesMark() {
  const arches = [
    { x: 0, top: 40 },
    { x: 62, top: 100 },
    { x: 124, top: 20 },
    { x: 186, top: 80 },
  ];
  return (
    <svg aria-hidden="true" viewBox="0 0 240 240" width="100%" height="100%">
      {arches.map(({ x, top }) => (
        <g key={x}>
          <path
            d={`M${x},240 V${top + 26} A26,26 0 0 1 ${x + 52},${top + 26} V240 Z`}
            fill={SAND}
          />
          <path
            d={`M${x + 16},240 V200 A10,10 0 0 1 ${x + 36},200 V240 Z`}
            fill={FOREST}
          />
        </g>
      ))}
    </svg>
  );
}

function PulseMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 240 240" width="100%" height="100%">
      <circle cx="120" cy="120" r="96" fill={WHITE} />
      <path
        d="M0,120 H78 L94,84 L112,168 L130,60 L146,120 H240"
        fill="none"
        stroke={BROWN}
        strokeWidth="10"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

const IMPACT_AREAS: ImpactArea[] = [
  { name: "Arts and Culture", color: OCHRE, Mark: WeaveMark },
  { name: "Built Environment", color: FOREST, Mark: ArchesMark },
  { name: "Health Care and Public Health", color: MOSS, Mark: PulseMark },
];

// Phone-width fallback: inline styles can't hold a media query, so the
// stack-and-scroll overrides live here (hence !important).
const MOBILE_CSS = `
@media (max-width: 700px) {
  .impact-page { height: auto !important; min-height: 100dvh; overflow: visible !important; }
  .impact-grid { grid-template-columns: minmax(0, 1fr) !important; }
  .impact-tile-art { flex: none !important; height: 240px; }
}
`;

export default function ImpactAreasPage() {
  return (
    <div
      className="impact-page"
      style={{
        background: SAND,
        color: BROWN,
        height: "100dvh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: "clamp(24px, 6vh, 72px) clamp(20px, 5vw, 56px) clamp(24px, 5vh, 56px)",
      }}
    >
      <style>{MOBILE_CSS}</style>

      <Link
        href="/about"
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "rgba(31,14,3,0.6)",
          marginBottom: "clamp(16px, 4vh, 40px)",
          alignSelf: "flex-start",
        }}
      >
        ← back
      </Link>

      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: FOREST,
          marginBottom: "clamp(12px, 3vh, 28px)",
        }}
      >
        Core Impact Areas
      </div>

      <p
        style={{
          fontSize: "clamp(20px, 2.6vw, 34px)",
          fontWeight: 300,
          lineHeight: 1.25,
          letterSpacing: "-0.015em",
          margin: "0 0 clamp(24px, 5vh, 56px)",
          maxWidth: 900,
        }}
      >
        Social, environmental, and economic sustainability and resilience
        are the core of what we do, across the following impact areas:
      </p>

      <div
        className="impact-grid"
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 24,
        }}
      >
        {IMPACT_AREAS.map(({ name, color, description, Mark }, i) => (
          <ImpactTile
            key={name}
            number={i + 1}
            name={name}
            color={color}
            description={description}
            mark={<Mark />}
          />
        ))}
      </div>
    </div>
  );
}
