// DESTINATION: app/database/page.tsx
//
// "Introducing the database" page, inspired by the Studio Museum in
// Harlem's "Introducing the 2026 Cohort" announcement layout -- rebuilt
// in the Nzonzi brand palette (BROWN for the reference's black
// background, WHITE for its white text), as a one-screen sample/teaser:
// headline, a "coming soon" subtext, three placeholder photo/name/title
// cards. Sized to fit without scrolling rather than the earlier
// scroll-length version -- no LEARN MORE button any more (removed per
// Modupe; its bordered-box style moved to the "meet the founders" link
// on /about instead).
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
        padding: "28px clamp(20px, 6vw, 56px) 36px",
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
          fontSize: "clamp(26px, 4.4vw, 46px)",
          fontWeight: 600,
          letterSpacing: "-0.01em",
          lineHeight: 1.06,
          margin: "0 0 10px",
          textTransform: "uppercase",
          maxWidth: 900,
        }}
      >
        Introducing the Nzonzi Database
      </h1>

      <p
        style={{
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: OCHRE,
          margin: "0 0 32px",
        }}
      >
        Coming soon
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 24,
          maxWidth: 880,
        }}
      >
        {DATABASE_PREVIEW.map((scholar) => (
          <div key={scholar.name}>
            <div
              style={{
                aspectRatio: "4 / 5",
                maxHeight: "38vh",
                backgroundImage:
                  "repeating-linear-gradient(135deg, rgba(240,240,240,0.12) 0 7px, transparent 7px 14px)",
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(240,240,240,0.55)",
                  background: BROWN,
                  padding: "3px 7px",
                  margin: 10,
                }}
              >
                photo placeholder
              </span>
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                marginTop: 12,
              }}
            >
              {scholar.name}
            </div>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: OCHRE,
                marginTop: 3,
              }}
            >
              {scholar.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
