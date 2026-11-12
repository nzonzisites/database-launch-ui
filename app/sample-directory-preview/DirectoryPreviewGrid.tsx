"use client";

// Numbering-check view for /sample-directory-preview, ahead of wiring the
// single-reveal effect back in. Shows every person's real photo at once
// (nothing covered) with a number badge on each tile, so the grid's
// left-to-right, top-to-bottom numbering can be confirmed before a
// reveal order gets built on top of it.
//
// Layout itself is unchanged from the reveal version: exactly 2 columns,
// edge-to-edge across the full page width, AND sized to fit the full
// page height with no scrolling -- tile size is whichever is smaller of
// (measured container width) / COLUMNS and (measured container height) /
// rows, so every tile is a true square that fits both dimensions at
// once. The page (see page.tsx) gives this component a fixed-height flex
// slot to measure against.

import { useEffect, useRef, useState } from "react";
import { WHITE } from "@/lib/colors";

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
          </div>
        ))}
      </div>
    </div>
  );
}
