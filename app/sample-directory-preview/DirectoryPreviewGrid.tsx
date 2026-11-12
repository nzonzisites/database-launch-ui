"use client";

// Client component for the single-reveal effect. Every person gets a
// small covered tile (solid BROWN, same as the page background, so it
// reads as empty space) except the currently revealed one, which renders
// as an enlarged 2x2 image immediately followed by a caption cell right
// beside it (1 column wide, same 2-row height) -- dense grid packing
// slots both into the gap the enlarged tile leaves behind. A shuffled
// queue of every index is consumed one at a time (a "shuffle bag") so
// every person is shown exactly once before any repeats; once the queue
// empties it's reshuffled for the next pass, nudging the new shuffle's
// first pick away from whoever was just shown so the boundary between
// passes never repeats back-to-back. The caption's content changes in
// step since it's derived from the same revealedIndex state.

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

function shuffle(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// A freshly shuffled queue of every index, with the new shuffle's first
// pick swapped away from avoidFirst (the index just shown) so a pass
// boundary never shows the same person twice in a row.
function nextShuffle(length: number, avoidFirst: number): number[] {
  const arr = shuffle(length);
  if (length > 1 && arr[0] === avoidFirst) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr;
}

export default function DirectoryPreviewGrid({ people }: { people: PreviewPerson[] }) {
  const queueRef = useRef<number[]>([]);
  const [revealedIndex, setRevealedIndex] = useState(() => {
    if (people.length === 0) return 0;
    const order = shuffle(people.length);
    queueRef.current = order.slice(1);
    return order[0];
  });

  useEffect(() => {
    if (people.length <= 1) return;
    const timer = setInterval(() => {
      setRevealedIndex((current) => {
        if (queueRef.current.length === 0) {
          queueRef.current = nextShuffle(people.length, current);
        }
        return queueRef.current.shift()!;
      });
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
            gridColumn: "span 2",
            gridRow: "span 2",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            animation: "fadeInTile 0.5s ease",
          }}
        >
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
          <div
            style={{
              fontSize: 24,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
              color: WHITE,
              textTransform: "lowercase",
              marginBottom: 10,
            }}
          >
            {current.fullName}
          </div>
          {current.tagline && (
            <div
              style={{
                fontSize: 15,
                fontWeight: 300,
                lineHeight: 1.4,
                color: "rgba(240,240,240,0.7)",
                display: "-webkit-box",
                WebkitLineClamp: 6,
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
