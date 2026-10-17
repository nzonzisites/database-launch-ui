// DESTINATION: app/about/page.tsx
//
// About page -- styled as a single large "wall text" statement (per
// Modupe's reference: a museum-plaque style block of big type, italic
// opening clause, generous whitespace) in the Nzonzi brand palette.
//
// ABOUT_PARAGRAPHS stays an array so adding more later (per Modupe:
// "I'll add more later as it develops") is just appending another
// { lead?, text } entry -- `lead` is the optional italicized opening
// clause, `text` is the regular-weight continuation in the same <p>.

import Link from "next/link";
import { BROWN, SAND } from "@/lib/colors";

type AboutParagraph = {
  lead?: string;
  text: string;
};

const ABOUT_PARAGRAPHS: AboutParagraph[] = [
  {
    lead: "We are internationally oriented children, grandchildren, and great-grandchildren of the African continent.",
    text: "In homage to all that our ancestors have instilled within us, Nzonzis pursue the reclamation of our ancestral inheritance through research, experimentation, collaboration, and practical expertise.",
  },
];

export default function AboutPage() {
  return (
    <div
      style={{
        background: SAND,
        color: BROWN,
        minHeight: "100vh",
        padding: "72px 48px 120px",
      }}
    >
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <Link
          href="/"
          style={{
            background: "transparent",
            border: 0,
            padding: 0,
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(31,14,3,0.6)",
            marginBottom: 64,
            display: "inline-block",
          }}
        >
          ← back
        </Link>

        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {ABOUT_PARAGRAPHS.map((p, i) => (
            <p
              key={i}
              style={{
                fontSize: "clamp(28px, 4.4vw, 46px)",
                fontWeight: 300,
                lineHeight: 1.2,
                letterSpacing: "-0.015em",
                margin: 0,
              }}
            >
              {p.lead ? <em style={{ fontStyle: "italic" }}>{p.lead}</em> : null}
              {p.lead ? " " : null}
              {p.text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
