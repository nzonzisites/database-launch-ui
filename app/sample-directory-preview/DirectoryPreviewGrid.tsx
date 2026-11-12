"use client";

// Client component for the single-reveal effect.
//
// Layout: a single vertical column of covered face tiles running down
// the left side of the page, with a caption panel to the right of
// whichever tile is currently revealed. Two layers, kept deliberately
// separate:
//
// 1. The base layer: every person stacked in one fixed-width column, in
//    plain order top to bottom. This NEVER changes shape based on who's
//    currently revealed.
// 2. The reveal overlay: a single absolutely-positioned block (the
//    enlarged image, same column width, with the caption beside it to
//    the right) layered on top, moved up/down the column as
//    revealedIndex changes.
//
// Because there's only ever one column, positioning the overlay doesn't
// need to measure anything -- its vertical offset is just
// revealedIndex * TILE_SIZE, clamped so the enlarged (2-tile-tall) image
// never runs past the bottom of the column.
//
// A shuffled queue of every index is consumed one at a time (a "shuffle
// bag") so every person is shown exactly once before any repeats; once
// the queue empties it's reshuffled for the next pass, nudging the new
// shuffle's first pick away from whoever was just shown so the boundary
// between passes never repeats back-to-back.
//
// The queue is seeded inside useEffect, not inside useState's lazy
// initializer: writing to queueRef from the initializer was a render-phase
// side effect, and Next's dev-mode Strict Mode double-invokes render-phase
// functions, which could leave the queue one shuffle out of sync with the
// index actually committed as state -- surfacing as an early repeat.

import { useEffect, useRef, useState } from "react";
import { BROWN, OCHRE, WHITE } from "@/lib/colors";

export type PreviewPerson = {
  slug: string;
  fullName: string;
  headshotUrl: string;
  headshotFocalY: number;
  category: string;
  // Each residence ("City, Country") as its own entry, primary first --
  // rendered one per line rather than joined into a single string.
  locations: string[];
  countryOfOrigin: string | null;
  tagline: string;
};

const REVEAL_INTERVAL_MS = 3000;
const TILE_SIZE = 140;
const IMAGE_ROW_SPAN = 2;

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
  const [revealedIndex, setRevealedIndex] = useState(0);

  useEffect(() => {
    if (people.length === 0) return;

    // All the randomness lives here, in an effect, instead of in render --
    // see the note above the component for why that matters.
    const order = shuffle(people.length);
    queueRef.current = order.slice(1);
    setRevealedIndex(order[0]);

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

  const revealed = people[revealedIndex];
  const clampedRow = Math.min(revealedIndex, Math.max(0, people.length - IMAGE_ROW_SPAN));

  return (
    <div style={{ position: "relative" }}>
      {/* Base layer -- a single column of covered tiles, fixed placement
          for every person, never touched by which one is revealed. */}
      <div style={{ width: TILE_SIZE, display: "flex", flexDirection: "column" }}>
        {people.map((person) => (
          <div
            key={person.slug}
            style={{
              width: TILE_SIZE,
              height: TILE_SIZE,
              flexShrink: 0,
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
        ))}
      </div>

      {/* Reveal overlay -- layered on top, moved up/down the column per
          tick; never changes the base column above. Image on the left
          (same width as the column), caption to its right. */}
      {revealed && (
        <div
          key={revealed.slug}
          style={{
            position: "absolute",
            top: clampedRow * TILE_SIZE,
            left: 0,
            width: "100%",
            height: TILE_SIZE * IMAGE_ROW_SPAN,
            display: "flex",
            alignItems: "stretch",
            animation: "fadeInTile 0.5s ease",
          }}
        >
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              width: TILE_SIZE,
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={revealed.headshotUrl}
              alt={revealed.fullName}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: `center ${revealed.headshotFocalY}%`,
              }}
            />
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: "20px 28px",
              backgroundColor: BROWN,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
            }}
          >
            {revealed.category && (
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
                {revealed.category}
              </div>
            )}
            <div
              style={{
                fontSize: 26,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                lineHeight: 1.15,
                color: WHITE,
                textTransform: "lowercase",
                marginBottom: revealed.locations.length > 0 || revealed.countryOfOrigin ? 2 : 10,
              }}
            >
              {revealed.fullName}
            </div>
            {(revealed.locations.length > 0 || revealed.countryOfOrigin) && (
              <div style={{ marginBottom: 10 }}>
                {revealed.locations.map((loc, li) => (
                  <div
                    key={li}
                    style={{
                      fontSize: 13,
                      fontWeight: 400,
                      lineHeight: 1.3,
                      color: "rgba(240,240,240,0.55)",
                      textTransform: "lowercase",
                    }}
                  >
                    {loc}
                  </div>
                ))}
                {revealed.countryOfOrigin && (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 400,
                      lineHeight: 1.3,
                      color: "rgba(240,240,240,0.55)",
                      textTransform: "lowercase",
                    }}
                  >
                    {revealed.countryOfOrigin}
                  </div>
                )}
              </div>
            )}
            {revealed.tagline && (
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 300,
                  lineHeight: 1.4,
                  color: "rgba(240,240,240,0.7)",
                  display: "-webkit-box",
                  WebkitLineClamp: 8,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {revealed.tagline}
              </div>
            )}
          </div>
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
