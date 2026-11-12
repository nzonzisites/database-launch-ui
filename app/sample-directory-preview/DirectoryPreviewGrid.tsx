"use client";

// Numbering-check view for /sample-directory-preview, ahead of wiring the
// single-reveal effect back in. Every person is an [image | caption]
// pair, side by side -- the image stays its own full square tile, and
// the caption (name, location(s), tagline -- no category badge, no
// bio/country-of-origin) sits next to it, not on top of it. Two of
// these pairs per row, four rows, filling the page exactly. All shown
// at once for now, each still carrying its numbered badge.
//
// Sizing: row height = (measured container height) / ROWS, and each
// pair's image is a square sized to that row height (so the grid's 4
// rows exactly fill the container's height); each pair's total width is
// (measured container width) / COLUMNS (so the grid's 2-per-row pairs
// exactly fill the width), with the caption taking whatever width is
// left over next to the square image. The page (see page.tsx) gives
// this component a fixed-height flex slot to measure against.
//
// Captured reveal order for the next phase (not wired in yet while this
// is still a static check view): cycle 4, 5, 8, 2, 3, 6, 7 -- person 1
// is skipped entirely, never revealed.

import { useEffect, useRef, useState } from "react";
import { WHITE } from "@/lib/colors";

const REVEAL_ORDER_1INDEXED = [4, 5, 8, 2, 3, 6, 7];
void REVEAL_ORDER_1INDEXED; // referenced here only to keep it from going stale; wired in next.

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

// 2 [image|caption] pairs per row, 4 rows -- 8 people filling the page.
const COLUMNS = 2;
const ROWS = 4;

export default function DirectoryPreviewGrid({ people }: { people: PreviewPerson[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setDims({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const unitWidth = dims ? dims.width / COLUMNS : null;
  const rowHeight = dims ? dims.height / ROWS : null;
  // The image stays a true square at the row's height, clamped so it
  // never claims more than its pair's own width (leaving no room for a
  // caption at all) on an unusually narrow/tall viewport.
  const imageSize = unitWidth && rowHeight ? Math.floor(Math.min(rowHeight, unitWidth)) : null;

  return (
    <div ref={containerRef} style={{ height: "100%", overflow: "hidden" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
        }}
      >
        {people.map((person, i) => (
          <div
            key={person.slug}
            style={{
              display: "flex",
              alignItems: "stretch",
              height: rowHeight ?? 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: imageSize ?? 0,
                height: imageSize ?? 0,
                flexShrink: 0,
                position: "relative",
                overflow: "hidden",
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
              {/* Number badge -- this person's 1-indexed position in the
                  grid, left-to-right, top-to-bottom. */}
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  minWidth: 28,
                  height: 28,
                  padding: "0 6px",
                  borderRadius: 14,
                  backgroundColor: "rgba(0,0,0,0.65)",
                  color: WHITE,
                  fontSize: 15,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i + 1}
              </div>
            </div>

            {/* Caption -- next to the image, not on top of it. Name,
                location(s), tagline only. */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                overflow: "hidden",
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
                  marginBottom: person.locations.length > 0 ? 4 : 6,
                }}
              >
                {person.fullName}
              </div>
              {person.locations.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  {person.locations.map((loc, li) => (
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
                </div>
              )}
              {person.tagline && (
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
                  {person.tagline}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
