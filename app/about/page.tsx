// DESTINATION: app/about/page.tsx
// (new folder -- create app/about/ and save this as page.tsx inside it)
//
// About page -- deliberately minimal for now (Modupe: "just add this for
// now and I'll add more later as it develops"). One paragraph in an
// ABOUT_PARAGRAPHS array so adding more later is just adding more
// strings to that array, not restructuring the page.

import Link from "next/link";
import { BROWN, FOREST, SAND } from "@/lib/colors";

const ABOUT_PARAGRAPHS: string[] = [
  "We are internationally oriented children, grandchildren, and great-grandchildren of the African continent. In homage to all that our ancestors have instilled within us, Nzonzis pursue the reclamation of our ancestral inheritance through research, experimentation, collaboration, and practical expertise.",
];

export default function AboutPage() {
  return (
    <div
      style={{
        background: SAND,
        color: BROWN,
        minHeight: "100vh",
        padding: "56px 48px 90px",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <Link
          href="/"
          style={{
            background: "transparent",
            border: 0,
            padding: 0,
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(31,14,3,0.6)",
            marginBottom: 34,
            display: "inline-block",
          }}
        >
          ← back
        </Link>
        <h1
          style={{
            fontSize: 44,
            fontWeight: 300,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            margin: 0,
            color: FOREST,
            textTransform: "lowercase",
          }}
        >
          about nzonzi
        </h1>

        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 24 }}>
          {ABOUT_PARAGRAPHS.map((text, i) => (
            <p key={i} style={{ fontSize: 17, fontWeight: 300, lineHeight: 1.62, margin: 0 }}>
              {text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
