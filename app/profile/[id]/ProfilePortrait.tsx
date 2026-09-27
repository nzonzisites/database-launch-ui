"use client";

// Client component only for the hover-reveal-full-bio interaction on the
// portrait block (the rest of the profile page is a plain server
// component). Mirrors the "portrait — hover for full bio" behaviour from
// the design mockup: a placeholder image area that reveals the seller's
// full bio text on hover/focus.

import { useState } from "react";
import { SAND, WHITE } from "@/lib/colors";

export default function ProfilePortrait({ fullBio, headshotUrl }: { fullBio: string; headshotUrl: string | null }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      tabIndex={0}
      style={{
        position: "relative",
        height: 480,
        backgroundImage: headshotUrl
          ? undefined
          : "repeating-linear-gradient(135deg, rgba(45,77,49,0.16) 0 7px, transparent 7px 14px)",
        backgroundColor: headshotUrl ? "rgba(31,14,3,0.06)" : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "grid",
        placeItems: "end start",
        padding: 14,
        cursor: fullBio ? "pointer" : "default",
      }}
    >
      {headshotUrl && (
        // Plain <img>, not next/image -- headshot URLs are arbitrary
        // applicant-supplied links (Google Drive, personal sites, etc.),
        // not assets from a configured image domain.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={headshotUrl}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}
      {fullBio && (
        <span
          style={{
            position: "relative",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9.5,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(31,14,3,0.55)",
            background: SAND,
            padding: "4px 7px",
          }}
        >
          portrait — hover for full bio
        </span>
      )}
      {fullBio && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(31,14,3,0.88)",
            padding: 26,
            display: "flex",
            alignItems: "center",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.25s ease",
            overflowY: "auto",
            pointerEvents: hovered ? "auto" : "none",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              fontWeight: 300,
              lineHeight: 1.55,
              color: WHITE,
              whiteSpace: "pre-wrap",
            }}
          >
            {fullBio}
          </p>
        </div>
      )}
    </div>
  );
}
