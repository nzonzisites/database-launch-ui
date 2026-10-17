// DESTINATION: app/database/page.tsx
//
// "The Nzonzi Database" page, inspired by the Studio Museum in Harlem's
// "Introducing the 2026 Cohort" announcement layout -- rebuilt in the
// Nzonzi brand palette (BROWN for the reference's black background,
// WHITE for its white text), as a one-screen sample/teaser: headline, a
// "coming soon" subtext, three placeholder photo/name/title cards sized
// to fill the remaining space (no maxWidth cap on the grid, cards grow
// with the viewport) rather than sitting small in a corner. No LEARN
// MORE button (removed; its bordered-box style moved to the "meet the
// founders" link on /about instead).
//
// Everything here is a PLACEHOLDER (per Modupe: "use placeholder text
// and images") -- the three "scholars" aren't real people, and the
// photo boxes reuse ProfilePortrait's diagonal-stripe missing-headshot
// pattern (inverted for the dark background). DATABASE_PREVIEW is the
// one thing to touch once there's real content to show here.

import Link from "next/link";
import { BROWN, OCHRE, WHITE } from "@/lib/colors";

type PreviewScholar = {
  name: string;
  title: string;
};

const DATABASE_PREVIEW: PreviewScholar[] = [
  { name: "Scholar One", title: "Materials Science" },
  { name: "Scholar Two", title: "Industrial Design" },
  { name: "Scholar Three", title: "Applied Quant/Qual Research" },
];

export default function DatabasePage() {
  return (
    <div
      style={{
        background: BROWN,
        color: WHITE,
        minHeight: "100vh",
        padding: "28px clamp(20px, 6vw, 56px) 40px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Link
        href="/"
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "rgba(240,240,240,0.6)",
          marginBottom: 28,
          display: "inline-block",
        }}
      >
        ← back
      </Link>

      <h1
        style={{
          fontSize: "clamp(28px, 4.8vw, 52px)",
          fontWeight: 600,
          letterSpacing: "-0.01em",
          lineHeight: 1.06,
          margin: "0 0 10px",
          textTransform: "uppercase",
        }}
      >
        The Nzonzi Database
      </h1>

      <p
        style={{
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: OCHRE,
          margin: "0 0 14px",
        }}
      >
        Coming soon
      </p>

      {/* Curation criteria, per Modupe's exact wording. */}
      <p
        style={{
          fontSize: "clamp(14px, 1.6vw, 17px)",
          fontWeight: 300,
          lineHeight: 1.5,
          maxWidth: 680,
          color: "rgba(240,240,240,0.85)",
          margin: "0 0 32px",
        }}
      >
        Every profile listed on Nzonzi directory is a trusted contact with
        proven expertise in their field and has demonstrated their
        commitment to engaging with African and Caribbean knowledge
        systems.
      </p>

      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "clamp(24px, 4vw, 56px)",
            width: "100%",
          }}
        >
          {DATABASE_PREVIEW.map((scholar) => (
            <div key={scholar.name}>
              <div
                style={{
                  aspectRatio: "4 / 5",
                  maxHeight: "44vh",
                  backgroundImage:
                    "repeating-linear-gradient(135deg, rgba(240,240,240,0.12) 0 7px, transparent 7px 14px)",
                  display: "flex",
                  alignItems: "flex-end",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "rgba(240,240,240,0.55)",
                    background: BROWN,
                    padding: "4px 8px",
                    margin: 14,
                  }}
                >
                  photo placeholder
                </span>
              </div>
              <div
                style={{
                  fontSize: "clamp(18px, 1.8vw, 24px)",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  marginTop: 18,
                }}
              >
                {scholar.name}
              </div>
              <div
                style={{
                  fontSize: "clamp(13px, 1.1vw, 15px)",
                  fontWeight: 500,
                  color: OCHRE,
                  marginTop: 4,
                }}
              >
                {scholar.title}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
