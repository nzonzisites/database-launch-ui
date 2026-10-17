"use client";

// Client component only for the click-to-reveal-full-bio interaction on
// the portrait block (the rest of the profile page is a plain server
// component). The design mockup this was built from described a
// "hover for full bio" label, but mouseenter/mouseleave don't reliably
// fire here in practice (the label sits above an absolutely-positioned
// image), so the label now says "click" to match what a visitor
// actually has to do -- tap/click toggles it via onFocus/onBlur on the
// focusable wrapper below.

import { useState } from "react";
import { SAND, WHITE } from "@/lib/colors";

export default function ProfilePortrait({
  fullBio,
  headshotUrl,
  headshotFocalY,
}: {
  fullBio: string;
  headshotUrl: string | null;
  // Vertical crop position as a 0-100 percentage, admin-adjustable on the
  // Listings tab so a headshot that would otherwise get its top or bottom
  // cut off by this panel's fixed 480px height can be repositioned without
  // re-uploading a differently-cropped image.
  headshotFocalY: number;
}) {
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
        // A fixed 1:1 aspect ratio rather than a fixed height -- the old
        // fixed-480px-height/fluid-width box meant the crop shape changed
        // with the viewer's screen width (and, worse, didn't match the
        // fixed-size box used for the crop preview on the admin Listings
        // tab, so the two could crop the same headshot differently).
        // Pinning both to the same square ratio makes the shape
        // deterministic and keeps admin's preview a true match.
        aspectRatio: "1 / 1",
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
            objectPosition: `center ${headshotFocalY}%`,
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
          portrait — click for full bio
        </span>
      )}
      {fullBio && (
        // The scroll container and the vertical-centering flex box can't
        // be the same element: align-items: center on an overflow:auto
        // container clips the top of any content taller than the box
        // (a long bio's opening lines became unreachable, even scrolling
        // all the way up) -- this is why a bio could come in "cut off"
        // instead of just needing a scroll. Splitting them into an
        // outer plain-block scroll container and an inner flex box
        // (min-height: 100% so it still centers a short bio, but grows
        // past 100% and drags the scrollable area with it for a long
        // one) fixes that: the full bio is always reachable by
        // scrolling from the very top, with its 26px padding intact on
        // every side regardless of scroll position.
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(31,14,3,0.88)",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.25s ease",
            overflowY: "auto",
            pointerEvents: hovered ? "auto" : "none",
          }}
        >
          <div
            style={{
              minHeight: "100%",
              boxSizing: "border-box",
              padding: 26,
              display: "flex",
              alignItems: "center",
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
        </div>
      )}
    </div>
  );
}
