"use client";

// Numbering-check view for /sample-directory-preview, ahead of wiring the
// single-reveal effect back in. Every person's real photo, full tile,
// with their caption overlaid directly on top of it (name, location(s),
// tagline only -- no category badge, no bio/country-of-origin), plus the
// same numbered badge as before. All shown at once for now.
//
// Layout: exactly 2 columns by 4 rows, edge-to-edge across the full page
// width AND height -- tile size is whichever is smaller of (measured
// container width) / COLUMNS and (measured container height) / ROWS, so
// every tile is a true square sized to fill a 2x4 page as large as
// possible. The page (see page.tsx) gives this component a fixed-height
// flex slot to measure against.
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

const COLUMNS = 2;
const ROWS = 4;

export default function DirectoryPreviewGrid({ people }: { people: PreviewPerson[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tileSize, setTileSize] = useState<number | null>(null);

  // Measure the container's actual available width AND height (its
  // parent gives it a fixed-height flex slot -- see page.tsx) so tiles
  // are sized to fit both: whichever of width/COLUMNS or height/ROWS is
  // smaller wins, keeping every tile the same true square while filling
  // a 2x4 page as large as possible, no scrolling.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const byWidth = el.clientWidth / COLUMNS;
      const byHeight = el.clientHeight / ROWS;
      setTileSize(Math.max(0, Math.floor(Math.min(byWidth, byHeight))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const gridWidth = tileSize ? tileSize * COLUMNS : "100%";

  return (
    <div ref={containerRef} style={{ height: "100%", overflow: "hidden" }}>
      <div
        style={{
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

            {/* Caption overlaid directly on the photo -- name, location(s),
                tagline only. A bottom gradient keeps it legible over any
                image without hiding the whole photo. */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "40px 20px 18px",
                background: "linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.45) 55%, rgba(0,0,0,0))",
              }}
            >
              <div
                style={{
                  fontSize: 20,
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
                        fontSize: 12,
                        fontWeight: 400,
                        lineHeight: 1.3,
                        color: "rgba(240,240,240,0.7)",
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
                    fontSize: 13,
                    fontWeight: 300,
                    lineHeight: 1.35,
                    color: "rgba(240,240,240,0.85)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
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
