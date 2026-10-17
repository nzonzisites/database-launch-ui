// DESTINATION: app/database/page.tsx
//
// "Introducing the database" page, inspired by the Studio Museum in
// Harlem's "Introducing the 2026 Cohort" announcement layout (headline +
// intro + a "LEARN MORE" button up top, three photo/name/title cards
// below) -- rebuilt in the Nzonzi brand palette: BROWN stands in for
// the reference's black background, WHITE for its white text.
//
// Everything here is a PLACEHOLDER (per Modupe: "use placeholder text
// and images") -- the three "scholars" aren't real people, the photo
// boxes are the same diagonal-stripe pattern ProfilePortrait already
// uses for a missing headshot (just inverted for a dark background),
// and LEARN MORE isn't wired to anything yet. DATABASE_PREVIEW is the
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
        padding: "clamp(28px, 6vw, 56px) clamp(20px, 6vw, 64px) clamp(56px, 10vw, 96px)",
      }}
    >
      <Link
        href="/"
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "rgba(240,240,240,0.6)",
          marginBottom: 44,
          display: "inline-block",
        }}
      >
        ← back
      </Link>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 24,
          marginBottom: 28,
        }}
      >
        <h1
          style={{
            fontSize: "clamp(32px, 6.4vw, 68px)",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            lineHeight: 1.04,
            margin: 0,
            textTransform: "uppercase",
            maxWidth: 900,
          }}
        >
          Introducing the Nzonzi Database
        </h1>

        {/* Placeholder only -- not wired to a destination yet. */}
        <button
          type="button"
          style={{
            flexShrink: 0,
            background: "transparent",
            border: "1px solid rgba(240,240,240,0.7)",
            color: WHITE,
            fontSize: 12.5,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "14px 26px",
            cursor: "default",
          }}
        >
          Learn more
        </button>
      </div>

      <p
        style={{
          fontSize: "clamp(17px, 2.2vw, 20px)",
          fontWeight: 300,
          lineHeight: 1.6,
          maxWidth: 680,
          margin: "0 0 64px",
          color: "rgba(240,240,240,0.9)",
        }}
      >
        We're thrilled to welcome {DATABASE_PREVIEW[0].name},{" "}
        {DATABASE_PREVIEW[1].name}, and {DATABASE_PREVIEW[2].name} to the
        Nzonzi database -- a growing roster of vetted scholar-practitioners
        ready to work with the organizations that need their expertise.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 32,
        }}
      >
        {DATABASE_PREVIEW.map((scholar) => (
          <div key={scholar.name}>
            <div
              style={{
                aspectRatio: "4 / 5",
                backgroundImage:
                  "repeating-linear-gradient(135deg, rgba(240,240,240,0.12) 0 7px, transparent 7px 14px)",
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(240,240,240,0.55)",
                  background: BROWN,
                  padding: "4px 8px",
                  margin: 12,
                }}
              >
                photo placeholder
              </span>
            </div>
            <div
              style={{
                fontSize: 19,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                marginTop: 16,
              }}
            >
              {scholar.name}
            </div>
            <div
              style={{
                fontSize: 13.5,
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
  );
}
