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
// IMPACT_AREAS is the one list to touch when the copy changes.

import Link from "next/link";
import { BROWN, FOREST, MOSS, OCHRE, SAND, WHITE } from "@/lib/colors";

type ImpactArea = {
  name: string;
  color: string;
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

export default function ImpactAreasPage() {
  return (
    <div
      style={{
        background: SAND,
        color: BROWN,
        minHeight: "100vh",
        padding: "72px clamp(20px, 5vw, 56px) 120px",
      }}
    >
      <Link
        href="/about"
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "rgba(31,14,3,0.6)",
          marginBottom: 40,
          display: "inline-block",
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
          marginBottom: 28,
        }}
      >
        Core Impact Areas
      </div>

      <p
        style={{
          fontSize: "clamp(22px, 3vw, 34px)",
          fontWeight: 300,
          lineHeight: 1.25,
          letterSpacing: "-0.015em",
          margin: "0 0 56px",
          maxWidth: 900,
        }}
      >
        Social, environmental, and economic sustainability and resilience
        are the core of what we do, across the following impact areas:
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 24,
        }}
      >
        {IMPACT_AREAS.map(({ name, color, Mark }, i) => (
          <div key={name}>
            <div
              style={{
                background: color,
                aspectRatio: "1 / 1",
                padding: "18%",
              }}
            >
              <Mark />
            </div>
            <div
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 13,
                fontWeight: 500,
                color: FOREST,
                margin: "18px 0 6px",
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <h2
              style={{
                fontSize: "clamp(22px, 2.4vw, 30px)",
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
                margin: 0,
              }}
            >
              {name}
            </h2>
          </div>
        ))}
      </div>
    </div>
  );
}
