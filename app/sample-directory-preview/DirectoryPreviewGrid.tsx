"use client";

// Numbering-check view for /sample-directory-preview, ahead of wiring the
// single-reveal effect back in. This version shows every person's TEXT
// content at once (no images at all), each tile numbered the same way
// the photo version was -- so the caption layout/order can be checked on
// its own before combining it with the images.
//
// Layout itself is unchanged: exactly 2 columns, edge-to-edge across the
// full page width, AND sized to fit the full page height with no
// scrolling -- tile size is whichever is smaller of (measured container
// width) / COLUMNS and (measured container height) / rows. The page
// (see page.tsx) gives this component a fixed-height flex slot to
// measure against.
//
// Captured reveal order for the next phase (not wired in yet while this
// is still a static check view): cycle 4, 5, 8, 2, 3, 6, 7 -- person 1
// is skipped entirely, never revealed.

import { useEffect, useRef, useState } from "react";
import { BROWN, OCHRE, WHITE } from "@/lib/colors";

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

export default function DirectoryPreviewGrid({ people }: { people: PreviewPerson[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tileSize, setTileSize] = useState<number | null>(null);

  // Measure the container's actual available width AND height (its
  // parent gives it a fixed-height flex slot -- see page.tsx) so tiles
  // are sized to fit both: whichever of width/COLUMNS or height/rows is
  // smaller wins, keeping every tile the same size while guaranteeing
  // the whole wall fits with no scrolling.
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
              backgroundColor: BROWN,
              border: "1px solid rgba(240,240,240,0.15)",
              boxSizing: "border-box",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
            }}
          >
            {/* Number badge -- this person's 1-indexed position in the
                grid, left-to-right, top-to-bottom. Same style as the
                photo version's badge. */}
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

            <div style={{ marginTop: 32 }}>
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
                  fontSize: 26,
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
                  {person.countryOfOrigin && (
                    <div
                      style={{
                        fontSize: 13,
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
                    WebkitLineClamp: 6,
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
