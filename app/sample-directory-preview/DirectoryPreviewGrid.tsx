"use client";

// Client component for the single-reveal effect. Every person gets a
// small covered tile (solid BROWN, same as the page background, so it
// reads as empty space) except the currently revealed one, which renders
// as a single combined tile: a fixed-width enlarged image on the left and
// the caption on the right, laid out with flexbox inside ONE grid item.
//
// Earlier this was two separate grid items (the image at span 2, the
// caption at span 3) and relied on CSS Grid's dense auto-placement to
// slot the caption in right beside the image. That's fragile -- dense
// packing places each item in document order wherever the next fitting
// gap is, which only lines the two up by coincidence, and broke outright
// once the caption's span no longer matched the exact gap the image
// happened to leave. Combining them into one flex row guarantees they're
// always adjacent and share the same top edge, since they're now DOM
// siblings instead of two independently-placed grid items.
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
const IMAGE_SPAN = 2;
const CAPTION_SPAN = 3;

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
                gridColumn: `span ${IMAGE_SPAN + CAPTION_SPAN}`,
                gridRow: "span 2",
                display: "flex",
                alignItems: "stretch",
                animation: "fadeInTile 0.5s ease",
              }}
            >
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  width: TILE_SIZE * IMAGE_SPAN,
                  flexShrink: 0,
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

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start",
                }}
              >
                {person.category && (
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
                    {person.category}
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
                    marginBottom: person.locations.length > 0 || person.countryOfOrigin ? 2 : 10,
                  }}
                >
                  {person.fullName}
                </div>
                {(person.locations.length > 0 || person.countryOfOrigin) && (
                  <div style={{ marginBottom: 10 }}>
                    {person.locations.map((loc, li) => (
                      <div
                        key={li}
                        style={{
                          fontSize: 12.5,
                          fontWeight: 400,
                          lineHeight: 1.3,
                          color: "rgba(240,240,240,0.55)",
                          textTransform: "lowercase",
                        }}
                      >
                        {loc}
                      </div>
                    ))}
                    {person.countryOfOrigin && (
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 400,
                          lineHeight: 1.3,
                          color: "rgba(240,240,240,0.55)",
                          textTransform: "lowercase",
                        }}
                      >
                        {person.countryOfOrigin}
                      </div>
                    )}
                  </div>
                )}
                {person.tagline && (
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 300,
                      lineHeight: 1.4,
                      color: "rgba(240,240,240,0.7)",
                      display: "-webkit-box",
                      WebkitLineClamp: 7,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {person.tagline}
                  </div>
                )}
              </div>
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

      <style>{`
        @keyframes fadeInTile {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
