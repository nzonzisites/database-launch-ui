"use client";

// Client component for the single-reveal effect. Rebuilt from scratch
// around a simple 2-column wall of square tiles:
//
// - Base layer: exactly 2 columns, edge-to-edge across the full page
//   width, AND sized to fit the full page height with no scrolling --
//   tile size is whichever is smaller of (measured container width) /
//   COLUMNS and (measured container height) / rows, so every tile is a
//   true square that fits both dimensions at once. The page (see
//   page.tsx) gives this component a fixed-height flex slot to measure
//   against. Every person always gets the same tile, same size, same
//   position -- this never changes based on who's revealed, which is
//   what keeps tiles from ever overlapping, wrapping unexpectedly, or
//   (an earlier bug) getting stretched into a non-square rectangle.
// - Reveal: the currently-revealed person's own tile just turns its
//   opacity up (same square, same spot -- no resizing, so no risk of it
//   going non-square). Every other tile stays covered.
// - Caption: the one piece that doesn't have a natural home in a 2-column
//   grid, so it's a single absolutely-positioned overlay placed over
//   whichever column ISN'T the revealed person's, in that same row --
//   left column revealed -> caption goes in the right column's slot,
//   and vice versa. Same size as the image tile, top-aligned text.
// - Reveal order: not random. Each person has a fixed number (1, 2, 3...)
//   matching their left-to-right, top-to-bottom position in the grid,
//   and the reveal cycles through the fixed sequence 1-3-2-4-6-5,
//   repeating (wrapping back to the start) for as many people as there
//   are.

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
const COLUMNS = 2;

// The fixed reveal sequence, as 1-indexed grid positions (left-to-right,
// top-to-bottom): person 1, then 3, then 2, then 4, then 6, then 5 --
// repeating from the start once it runs out, for as many people as
// there are.
const REVEAL_ORDER_1INDEXED = [1, 3, 2, 4, 6, 5];

export default function DirectoryPreviewGrid({ people }: { people: PreviewPerson[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tileSize, setTileSize] = useState<number | null>(null);
  const [revealedIndex, setRevealedIndex] = useState(0);

  // Measure the container's actual available width AND height (its
  // parent gives it a fixed-height flex slot -- see page.tsx) so tiles
  // are sized to fit both: whichever of width/COLUMNS or height/rows is
  // smaller wins, keeping them square while guaranteeing the whole wall
  // fits with no scrolling.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rows = Math.max(1, Math.ceil(people.length / COLUMNS));
    const measure = () => {
      const byWidth = el.clientWidth / COLUMNS;
      const byHeight = el.clientHeight / rows;
      setTileSize(Math.max(0, Math.floor(Math.min(byWidth, byHeight))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [people.length]);

  useEffect(() => {
    if (people.length === 0) return;
    let step = 0;
    const applyStep = () => {
      const position1Indexed = REVEAL_ORDER_1INDEXED[step % REVEAL_ORDER_1INDEXED.length];
      setRevealedIndex((position1Indexed - 1) % people.length);
      step += 1;
    };
    applyStep();
    if (people.length <= 1) return;
    const timer = setInterval(applyStep, REVEAL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [people.length]);

  const revealed = people[revealedIndex];
  const revealedRow = Math.floor(revealedIndex / COLUMNS);
  const revealedCol = revealedIndex % COLUMNS;
  // The caption takes over whichever column isn't the revealed image's,
  // in that same row.
  const captionCol = revealedCol === 0 ? 1 : 0;

  const gridWidth = tileSize ? tileSize * COLUMNS : "100%";

  return (
    <div ref={containerRef} style={{ height: "100%", overflow: "hidden" }}>
      {/* Base layer -- fixed 2-column grid, every tile the same square
          size and position regardless of who's revealed. Centered
          horizontally for the (common) case where the available height
          is the tighter constraint, leaving the grid narrower than the
          full container width. position: relative here (not on the
          outer measuring container) so the caption overlay below is
          positioned against this centered box, not the full-width
          container it may be narrower than. */}
      <div
        style={{
          position: "relative",
          width: gridWidth,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
        }}
      >
        {people.map((person, i) => (
          <div
            key={person.slug}
            style={{
              width: "100%",
              height: tileSize ?? 0,
              position: "relative",
              overflow: "hidden",
              backgroundColor: BROWN,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={person.headshotUrl}
              alt={i === revealedIndex ? person.fullName : ""}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: `center ${person.headshotFocalY}%`,
                opacity: i === revealedIndex ? 1 : 0,
                transition: "opacity 0.5s ease",
              }}
            />
          </div>
        ))}

        {/* Caption overlay -- the one element without a natural home in
            the 2-column grid. Placed over whichever column isn't the
            revealed image's, at the same row, same size as that tile.
            Sits inside this same centered grid box (not the outer
            container) so its pixel position always lines up correctly. */}
        {tileSize && revealed && (
          <div
            key={revealed.slug}
            style={{
              position: "absolute",
              top: revealedRow * tileSize,
              left: captionCol * tileSize,
              width: tileSize,
              height: tileSize,
              padding: "20px 28px",
              boxSizing: "border-box",
              backgroundColor: BROWN,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              overflow: "hidden",
              animation: "fadeInCaption 0.5s ease",
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
              {revealed.tagline}
            </div>
          )}
        </div>
      )}
      </div>

      <style>{`
        @keyframes fadeInCaption {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
