"use client";

// Client component for the single-reveal effect: every tile's photo is
// always mounted underneath (so there's no reload flicker each cycle),
// with the same diagonal-stripe placeholder ListingsTabClient.tsx and
// /database use for a missing headshot cross-faded on top of all but
// one tile. A plain setInterval advances which tile is uncovered;
// the caption block below cross-fades in sync via the same
// revealedIndex state.

import { useEffect, useState } from "react";
import { OCHRE, WHITE } from "@/lib/colors";

export type PreviewPerson = {
  slug: string;
  fullName: string;
  headshotUrl: string;
  headshotFocalY: number;
  category: string;
  tagline: string;
};

const REVEAL_INTERVAL_MS = 3000;

export default function DirectoryPreviewGrid({ people }: { people: PreviewPerson[] }) {
  const [revealedIndex, setRevealedIndex] = useState(0);

  useEffect(() => {
    if (people.length <= 1) return;
    const timer = setInterval(() => {
      setRevealedIndex((i) => (i + 1) % people.length);
    }, REVEAL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [people.length]);

  const current = people[revealedIndex];

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        }}
      >
        {people.map((person, i) => {
          const revealed = i === revealedIndex;
          return (
            <div
              key={person.slug}
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                overflow: "hidden",
                backgroundColor: "rgba(31,14,3,0.06)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={person.headshotUrl}
                alt=""
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: `center ${person.headshotFocalY}%`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "rgba(230,222,210,0.06)",
                  backgroundImage:
                    "repeating-linear-gradient(135deg, rgba(230,222,210,0.22) 0 4px, transparent 4px 8px)",
                  opacity: revealed ? 0 : 1,
                  transition: "opacity 0.6s ease",
                }}
              />
            </div>
          );
        })}
      </div>

      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "48px clamp(20px, 6vw, 48px) 64px",
          textAlign: "center",
        }}
      >
        {current && (
          <div key={current.slug} style={{ animation: "fadeInCaption 0.6s ease" }}>
            {current.category && (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  color: OCHRE,
                  textTransform: "lowercase",
                  marginBottom: 10,
                }}
              >
                {current.category}
              </div>
            )}
            <h1
              style={{
                fontSize: "clamp(28px, 5vw, 44px)",
                fontWeight: 300,
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                margin: "0 0 12px",
                color: WHITE,
                textTransform: "lowercase",
              }}
            >
              {current.fullName}
            </h1>
            {current.tagline && (
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 300,
                  lineHeight: 1.5,
                  margin: 0,
                  color: "rgba(240,240,240,0.75)",
                }}
              >
                {current.tagline}
              </p>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInCaption {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
