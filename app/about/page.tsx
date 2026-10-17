// DESTINATION: app/about/page.tsx
//
// About page -- single large "wall text" statement (per Modupe's
// reference: a museum-plaque style block of big type, italic opening
// clause, generous whitespace) in the Nzonzi brand palette, laid out
// against the left half of the screen with a small "About Nzonzi"
// kicker at the top and a link to the founders' own listings at the
// bottom.
//
// ABOUT_PARAGRAPHS stays an array so adding more later (per Modupe:
// "I'll add more later as it develops") is just appending another
// { lead?, text } entry -- `lead` is the optional italicized opening
// clause, `text` is the regular-weight continuation in the same <p>.
//
// FOUNDERS_HREF points at /about/founders, which doesn't exist yet --
// still waiting on Uche's and Ireti's live profile slugs and which
// shape Modupe wants for that page before building it.

import Link from "next/link";
import { BROWN, FOREST, OCHRE, SAND } from "@/lib/colors";

type AboutParagraph = {
  lead?: string;
  text: string;
};

const ABOUT_PARAGRAPHS: AboutParagraph[] = [
  {
    lead: "We are internationally oriented children, grandchildren, and great-grandchildren of the African continent.",
    text: "In homage to all that our ancestors have instilled within us, Nzonzis pursue the reclamation of our cultural inheritance through research, experimentation, collaboration, and practical expertise.",
  },
];

const FOUNDERS_HREF = "/about/founders";
const DATABASE_HREF = "/database";

export default function AboutPage() {
  return (
    <div
      style={{
        background: SAND,
        color: BROWN,
        minHeight: "100vh",
        padding: "72px 32px 120px 56px",
      }}
    >
      <div style={{ width: "clamp(300px, 50vw, 760px)", maxWidth: "100%" }}>
        <Link
          href="/"
          style={{
            background: "transparent",
            border: 0,
            padding: 0,
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
          About Nzonzi
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {ABOUT_PARAGRAPHS.map((p, i) => (
            <div key={i}>
              {p.lead && (
                <p
                  style={{
                    fontSize: "clamp(26px, 4vw, 42px)",
                    fontWeight: 300,
                    lineHeight: 1.2,
                    letterSpacing: "-0.015em",
                    margin: "0 0 22px",
                  }}
                >
                  <em style={{ fontStyle: "italic" }}>{p.lead}</em>
                </p>
              )}
              <p
                style={{
                  fontSize: "clamp(26px, 4vw, 42px)",
                  fontWeight: 300,
                  lineHeight: 1.2,
                  letterSpacing: "-0.015em",
                  margin: 0,
                }}
              >
                {p.text}
              </p>
            </div>
          ))}
        </div>

        {/* Bordered-box button style, carried over from the (now removed)
            LEARN MORE button on /database -- same shape, OCHRE instead of
            WHITE since this sits on SAND rather than BROWN. */}
        <div style={{ marginTop: 72, display: "flex", flexWrap: "wrap", gap: 16 }}>
          <Link
            href={FOUNDERS_HREF}
            style={{
              display: "inline-block",
              background: "transparent",
              border: `1px solid ${OCHRE}`,
              color: OCHRE,
              fontSize: 12.5,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "14px 26px",
            }}
          >
            Meet the Nzonzi founders
          </Link>
          <Link
            href={DATABASE_HREF}
            style={{
              display: "inline-block",
              background: "transparent",
              border: `1px solid ${OCHRE}`,
              color: OCHRE,
              fontSize: 12.5,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "14px 26px",
            }}
          >
            Preview the directory
          </Link>
        </div>
      </div>
    </div>
  );
}
