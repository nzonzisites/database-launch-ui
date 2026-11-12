"use client";

// Single-reveal view for /sample-directory-preview.
//
// Base layer: pure image columns, directly adjacent to each other (no
// caption column interleaved between them) -- square tiles, ROWS rows,
// filling the page's height (8 people total). Only the
// currently-revealed person's photo shows (opacity); every other tile
// stays covered. Same proven approach as before: the base layer never
// changes shape based on who's revealed, so nothing ever shifts,
// overlaps, or stretches non-square.
//
// Caption: a single overlay, positioned next to wherever the revealed
// image actually is -- to its right if there's more room that way,
// otherwise to its left -- capped at MAX_CAPTION_SPAN (3) image-widths
// wide, and narrower than that near the grid's middle columns where a
// full 3-wide run isn't available on either side without overlapping
// the image itself.
//
// Sizing: tile size is (measured container height) / ROWS only -- the
// image only needs to fit the page's height, not its width, so however
// many tiles fit across the actual width at that size is how many
// columns there are (plain CSS auto-fill), with no attempt to stretch
// or shrink tiles to make a fixed column count span the full width.
// The page (see page.tsx) gives this component a fixed-height flex slot
// to measure against.

import { useEffect, useRef, useState } from "react";
import { BROWN, WHITE } from "@/lib/colors";

const REVEAL_INTERVAL_MS = 3000;

// The decided reveal order, as 1-indexed grid positions (left-to-right,
// top-to-bottom): 4, then 5, then 8, then 2, then 3, then 6, then 7.
// Person 1 is skipped entirely -- never revealed. Repeats from the
// start once it reaches the end.
const REVEAL_ORDER_1INDEXED = [4, 5, 8, 2, 3, 6, 7];

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

// Rows the page's height is divided into -- however many image columns
// fit across the actual width at that row height is however many there
// are (see tileSize/columns below).
const ROWS = 4;
const MAX_CAPTION_SPAN = 3;

export default function DirectoryPreviewGrid({ people }: { people: PreviewPerson[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);
  const [revealedIndex, setRevealedIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setDims({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Cycle through the decided reveal order, wrapping back to the start
  // once it reaches the end. Positions that don't exist for the actual
  // person count are dropped up front rather than wrapped with modulo --
  // modulo-wrapping an out-of-range position could land back on index 0
  // and reveal person 1, which this order is supposed to skip entirely.
  useEffect(() => {
    const validOrder = REVEAL_ORDER_1INDEXED.filter((n) => n <= people.length);
    if (validOrder.length === 0) return;
    let step = 0;
    const applyStep = () => {
      const position1Indexed = validOrder[step % validOrder.length];
      setRevealedIndex(position1Indexed - 1);
      step += 1;
    };
    applyStep();
    const timer = setInterval(applyStep, REVEAL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [people.length]);

  // Height alone drives tile size; width just takes however many whole
  // tiles fit (auto-fill), rather than being stretched/shrunk to make a
  // fixed column count span the full width.
  const tileSize = dims != null ? Math.max(0, Math.floor(dims.height / ROWS)) : null;
  const columns =
    tileSize && tileSize > 0 && dims != null ? Math.max(1, Math.floor(dims.width / tileSize)) : 1;

  const revealed = revealedIndex != null ? people[revealedIndex] : undefined;
  const revealedRow = revealedIndex != null ? Math.floor(revealedIndex / columns) : 0;
  const revealedCol = revealedIndex != null ? revealedIndex % columns : 0;

  // Contiguous room on each side of the revealed column, in tile-widths.
  const roomRight = columns - (revealedCol + 1);
  const roomLeft = revealedCol;
  const useRightSide = roomRight >= roomLeft;
  const captionSpan = Math.min(MAX_CAPTION_SPAN, useRightSide ? roomRight : roomLeft);
  const captionStartCol = useRightSide ? revealedCol + 1 : revealedCol - captionSpan;

  return (
    <div ref={containerRef} style={{ height: "100%", overflow: "hidden" }}>
      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: tileSize ? `repeat(auto-fill, ${tileSize}px)` : undefined,
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

        {/* Caption overlay -- next to wherever the revealed image lies,
            capped at MAX_CAPTION_SPAN image-widths. */}
        {tileSize && revealed && captionSpan > 0 && (
          <div
            key={revealed.slug}
            style={{
              position: "absolute",
              top: revealedRow * tileSize,
              left: captionStartCol * tileSize,
              width: captionSpan * tileSize,
              height: tileSize,
              padding: "16px 20px",
              boxSizing: "border-box",
              backgroundColor: BROWN,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              overflow: "hidden",
              animation: "fadeInCaption 0.5s ease",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                lineHeight: 1.15,
                color: WHITE,
                textTransform: "lowercase",
                marginBottom: revealed.locations.length > 0 || revealed.countryOfOrigin ? 4 : 6,
              }}
            >
              {revealed.fullName}
            </div>
            {(revealed.locations.length > 0 || revealed.countryOfOrigin) && (
              <div style={{ marginBottom: 6 }}>
                {revealed.locations.map((loc, li) => (
                  <div
                    key={li}
                    style={{
                      fontSize: 11.5,
                      fontWeight: 400,
                      lineHeight: 1.3,
                      color: "rgba(240,240,240,0.55)",
                      textTransform: "lowercase",
                    }}
                  >
                    {loc}
                  </div>
                ))}
                {/* Country of origin -- page.tsx already drops this to
                    null when it matches a country the person currently
                    lives in, so this only ever shows up when distinct. */}
                {revealed.countryOfOrigin && (
                  <div
                    style={{
                      fontSize: 11.5,
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
                  fontSize: 12.5,
                  fontWeight: 300,
                  lineHeight: 1.35,
                  color: "rgba(240,240,240,0.7)",
                  display: "-webkit-box",
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {revealed.tagline}
              </div>
            )}
          </div>
        )}

        <style>{`
          @keyframes fadeInCaption {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}
