"use client";

// Client component for the single-reveal effect.
//
// Two layers, deliberately kept separate:
//
// 1. The base layer: every person at a fixed 1x1 cell, in plain
//    row-major order. This NEVER changes shape based on who's currently
//    revealed -- it's laid out once and just sits there as the covered
//    wall of faces.
// 2. The reveal overlay: a single absolutely-positioned block (image on
//    top, caption stacked below it) layered on top, moved from cell to
//    cell as revealedIndex changes. Its position is computed in real
//    pixels from a measured column count, not from CSS Grid
//    spans/placement.
//
// Keeping these separate means every reveal tick only moves the overlay
// -- it never changes the base grid's layout, so nobody's tile shifts,
// overlaps, or wraps onto an unexpected row when the overlay moves.
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
const OVERLAY_COL_SPAN = 2;
const IMAGE_ROW_SPAN = 2;
const CAPTION_ROW_SPAN = 3;
const OVERLAY_ROW_SPAN = IMAGE_ROW_SPAN + CAPTION_ROW_SPAN;

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<number | null>(null);

  // Measure how many TILE_SIZE columns actually fit, so the overlay can
  // be placed in real pixels against the base grid's actual geometry
  // instead of guessing at a CSS Grid placement.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setColumns(Math.max(1, Math.floor(el.clientWidth / TILE_SIZE)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  let overlayStyle: React.CSSProperties | null = null;
  if (columns && revealed) {
    const totalRows = Math.ceil(people.length / columns);
    const span = Math.min(OVERLAY_COL_SPAN, columns);
    const row = Math.floor(revealedIndex / columns);
    const col = revealedIndex % columns;
    const clampedCol = Math.min(col, Math.max(0, columns - span));
    const clampedRow = Math.min(row, Math.max(0, totalRows - OVERLAY_ROW_SPAN));
    overlayStyle = {
      position: "absolute",
      top: clampedRow * TILE_SIZE,
      left: clampedCol * TILE_SIZE,
      width: span * TILE_SIZE,
      height: OVERLAY_ROW_SPAN * TILE_SIZE,
    };
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Base layer -- fixed placement for every person, never touched
          by which one is currently revealed. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, ${TILE_SIZE}px)`,
          gridAutoRows: `${TILE_SIZE}px`,
        }}
      >
        {people.map((person) => (
          <div
            key={person.slug}
            style={{ position: "relative", overflow: "hidden", backgroundColor: BROWN }}
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

      {/* Reveal overlay -- layered on top, moved per tick; never changes
          the base grid above. Image on top, caption stacked below it. */}
      {overlayStyle && revealed && (
        <div
          key={revealed.slug}
          style={{
            ...overlayStyle,
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            animation: "fadeInTile 0.5s ease",
          }}
        >
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              height: TILE_SIZE * IMAGE_ROW_SPAN,
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
              minHeight: 0,
              padding: "16px 20px",
              backgroundColor: BROWN,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
            }}
          >
            {revealed.category && (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  color: OCHRE,
                  textTransform: "lowercase",
                  marginBottom: 8,
                }}
              >
                {revealed.category}
              </div>
            )}
            <div
              style={{
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                lineHeight: 1.15,
                color: WHITE,
                textTransform: "lowercase",
                marginBottom: revealed.locations.length > 0 || revealed.countryOfOrigin ? 2 : 8,
              }}
            >
              {revealed.fullName}
            </div>
            {(revealed.locations.length > 0 || revealed.countryOfOrigin) && (
              <div style={{ marginBottom: 8 }}>
                {revealed.locations.map((loc, li) => (
                  <div
                    key={li}
                    style={{
                      fontSize: 12,
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
                      fontSize: 12,
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
                  fontSize: 13,
                  fontWeight: 300,
                  lineHeight: 1.4,
                  color: "rgba(240,240,240,0.7)",
                  display: "-webkit-box",
                  WebkitLineClamp: 9,
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
