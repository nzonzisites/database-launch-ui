"use client";

// Client component only for the hover-to-reveal-description interaction
// on each impact-area tile (the rest of /about/impact-areas is a plain
// server component). Same pattern as ProfilePortrait: mouseenter/leave
// for pointer users, focus/blur on the focusable wrapper so keyboard and
// tap users can open it too. With no description yet, the tile is a
// plain, non-interactive block.

import { useState } from "react";
import { BROWN, FOREST, WHITE } from "@/lib/colors";

export default function ImpactTile({
  number,
  name,
  color,
  description,
  mark,
}: {
  number: number;
  name: string;
  color: string;
  description?: string;
  mark: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const open = hovered && !!description;

  return (
    <div className="impact-tile" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        tabIndex={description ? 0 : undefined}
        aria-label={description ? `${name}: ${description}` : undefined}
        className="impact-tile-art"
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          background: color,
          padding: "clamp(20px, 4vh, 48px)",
          cursor: description ? "pointer" : "default",
        }}
      >
        {mark}
        {description && (
          <div
            aria-hidden={!open}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(31,14,3,0.92)",
              color: WHITE,
              padding: "clamp(20px, 3vw, 36px)",
              display: "flex",
              alignItems: "flex-end",
              fontSize: "clamp(15px, 1.3vw, 19px)",
              lineHeight: 1.45,
              opacity: open ? 1 : 0,
              transition: "opacity 0.2s ease",
              pointerEvents: "none",
            }}
          >
            {description}
          </div>
        )}
      </div>
      <div
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 13,
          fontWeight: 500,
          color: FOREST,
          margin: "16px 0 6px",
        }}
      >
        {String(number).padStart(2, "0")}
      </div>
      <h2
        style={{
          fontSize: "clamp(20px, 2.2vw, 28px)",
          fontWeight: 600,
          lineHeight: 1.1,
          letterSpacing: "-0.01em",
          margin: 0,
          color: BROWN,
        }}
      >
        {name}
      </h2>
    </div>
  );
}
