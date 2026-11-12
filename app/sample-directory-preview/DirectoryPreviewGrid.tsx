"use client";

// Client component for the single-reveal effect. Every person gets a
// small covered tile (solid BROWN, same as the page background, so it
// reads as empty space) except the currently revealed one, which renders
// as an enlarged 2x2 image immediately followed by a caption cell right
// beside it (1 column wide, same 2-row height) -- dense grid packing
// slots both into the gap the enlarged tile leaves behind. A plain
// setInterval jumps to a new random index every few seconds (never the
// same one twice in a row); the caption's content changes in step since
// it's derived from the same revealedIndex state.

import { useEffect, useRef, useState } from "react";
import { BROWN, OCHRE, WHITE } from "@/lib/colors";

export type PreviewPerson = {
  slug: string;
  fullName: string;
  headshotUrl: string;
  headshotFocalY: number;
  category: string;
  tagline: string;
};

const REVEAL_INTERVAL_MS = 3000;
const TILE_SIZE = 140;

function pickNextIndex(length: number, current: number): number {
  if (length <= 1) return 0;
  let next = current;
  while (next === current) {
    next = Math.floor(Math.random() * length);
  }
  return next;
}

export default function DirectoryPreviewGrid({ people }: { people: PreviewPerson[] }) {
  const [revealedIndex, setRevealedIndex] = useState(() =>
    people.length > 0 ? Math.floor(Math.random() * people.length) : 0
  );
  const revealedIndexRef = useRef(revealedIndex);
  revealedIndexRef.current = revealedIndex;

  useEffect(() => {
    if (people.length <= 1) return;
    const timer = setInterval(() => {
      setRevealedIndex(pickNextIndex(people.length, revealedIndexRef.current));
    }, REVEAL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [people.length]);

  const current = people[revealedIndex];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, ${TILE_SIZE}px)`,
        gridAutoRows: `${TILE_SIZE}px`,
        gridAutoFlow: "dense",
      }}
    >
      {people.map((person, i) => {
        if (i === revealedIndex) {
          return (
            <div
              key={person.slug}
              style={{
                gridColumn: "span 2",
                gridRow: "span 2",
                position: "relative",
                overflow: "hidden",
                animation: "fadeInTile 0.5s ease",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={person.headshotUrl}
                alt={person.fullName}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: `center ${person.headshotFocalY}%`,
                }}
              />
            </div>
          );
        }

        return (
          <div
            key={person.slug}
            style={{
              position: "relative",
              overflow: "hidden",
              backgroundColor: BROWN,
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
                opacity: 0,
              }}
            />
          </div>
        );
      })}

      {current && (
        <div
          key={`${current.slug}-caption`}
          style={{
            gridColumn: "span 1",
            gridRow: "span 2",
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            animation: "fadeInTile 0.5s ease",
          }}
        >
          {current.category && (
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 500,
                letterSpacing: "0.02em",
                color: OCHRE,
                textTransform: "lowercase",
                marginBottom: 6,
              }}
            >
              {current.category}
            </div>
          )}
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
              color: WHITE,
              textTransform: "lowercase",
              marginBottom: 6,
            }}
          >
            {current.fullName}
          </div>
          {current.tagline && (
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 300,
                lineHeight: 1.35,
                color: "rgba(240,240,240,0.7)",
                display: "-webkit-box",
                WebkitLineClamp: 5,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {current.tagline}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeInTile {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
