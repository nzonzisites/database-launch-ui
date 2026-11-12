// DESTINATION: app/database/page.tsx
//
// "The Nzonzi Database" page, inspired by the Studio Museum in Harlem's
// "Introducing the 2026 Cohort" announcement layout -- rebuilt in the
// Nzonzi brand palette (BROWN for the reference's black background,
// WHITE for its white text), as a one-screen sample/teaser: headline, a
// "coming soon" subtext, and the same single-reveal wall of real,
// published scholars' headshots proven out on /sample-directory-preview
// (same DirectoryPreviewGrid component, same data derivation) -- this is
// the "preview the directory" destination linked from /about, so the
// hidden preview page's effect lives here now instead of three static
// cards.
//
// Pulls every published scholar_profile row with a real headshot_url --
// see fetchPublishedProfilesWithHeadshots in lib/scholarProfile.ts. No
// admin/review_listings gate: this is exactly the same RLS-allowed
// "anyone can read published profiles" visibility a direct /profile/
// [slug] visit already has, just aggregated.

import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { fetchPublishedProfilesWithHeadshots } from "@/lib/scholarProfile";
import { CATEGORY_OPTIONS, optionLabel } from "@/app/apply/applicationOptions";
import { BROWN, WHITE } from "@/lib/colors";
import DirectoryPreviewGrid, {
  type PreviewPerson,
} from "@/app/sample-directory-preview/DirectoryPreviewGrid";

function categoryLabel(category: string | null, other: string | null): string {
  if (!category) return "";
  if (category === "other") return other || "Other";
  return optionLabel(CATEGORY_OPTIONS, category);
}

/** Same residences-first, city_country-fallback source as the
 * /profile/[slug] page's allLocationsLabel, but returns each residence
 * as its own array entry (one per line in the grid) rather than a single
 * joined string -- copied rather than shared since each page already
 * keeps its own small label helpers (categoryLabel above is the same
 * pattern). */
function locationLines(
  residences: { city: string; country: string; is_primary: boolean }[] | null,
  cityCountry: string | null
): string[] {
  if (!residences || residences.length === 0) return cityCountry ? [cityCountry] : [];
  const ordered = [...residences].sort((a, b) =>
    a.is_primary === b.is_primary ? 0 : a.is_primary ? -1 : 1
  );
  const labels = ordered
    .map((r) => [r.city, r.country].filter(Boolean).join(", "))
    .filter(Boolean);
  return labels.length > 0 ? labels : cityCountry ? [cityCountry] : [];
}

/** Just the country names a person currently lives in, for filtering
 * country_of_origin against -- same residences-first, city_country
 * fallback source as locationLines above. city_country is free text
 * ("City, Country" in practice), so take the part after the last comma
 * as its country when there's no structured residences to read from. */
function currentCountries(
  residences: { city: string; country: string; is_primary: boolean }[] | null,
  cityCountry: string | null
): string[] {
  if (residences && residences.length > 0) {
    return residences.map((r) => r.country).filter(Boolean);
  }
  if (!cityCountry) return [];
  const parts = cityCountry.split(",").map((p) => p.trim());
  return [parts[parts.length - 1]].filter(Boolean);
}

/** country_of_origin, but only when it's not already one of the
 * countries the person currently lives in -- otherwise it's a
 * redundant line in the caption. */
function distinctCountryOfOrigin(
  countryOfOrigin: string | null,
  residences: { city: string; country: string; is_primary: boolean }[] | null,
  cityCountry: string | null
): string | null {
  if (!countryOfOrigin) return null;
  const lived = currentCountries(residences, cityCountry).map((c) => c.toLowerCase());
  return lived.includes(countryOfOrigin.toLowerCase()) ? null : countryOfOrigin;
}

export default async function DatabasePage() {
  const supabase = await getSupabaseServerClient();
  const profiles = await fetchPublishedProfilesWithHeadshots(supabase);

  const people: PreviewPerson[] = profiles.map((p) => ({
    slug: p.slug,
    fullName: p.full_name,
    headshotUrl: p.headshot_url as string,
    headshotFocalY: p.headshot_focal_y,
    category: categoryLabel(p.intended_category, p.intended_category_other),
    locations: locationLines(p.residences, p.city_country),
    countryOfOrigin: distinctCountryOfOrigin(p.country_of_origin, p.residences, p.city_country),
    tagline: p.tagline,
  }));

  return (
    <div
      style={{
        background: BROWN,
        color: WHITE,
        height: "100vh",
        padding: "28px clamp(20px, 6vw, 56px) 0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Link
        href="/"
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "rgba(240,240,240,0.6)",
          marginBottom: 28,
          display: "inline-block",
          flexShrink: 0,
        }}
      >
        ← back
      </Link>

      <div style={{ flexShrink: 0 }}>
        <p
          style={{
            fontSize: "clamp(16px, 2vw, 22px)",
            fontStyle: "italic",
            fontWeight: 300,
            letterSpacing: "-0.01em",
            textTransform: "lowercase",
            color: "rgba(240,240,240,0.85)",
            margin: "0 0 20px",
          }}
        >
          nzonzi database coming january 2027
        </p>
      </div>

      {people.length === 0 ? (
        <p
          style={{
            padding: "40px 0",
            fontSize: 16,
            color: "rgba(240,240,240,0.6)",
          }}
        >
          Nothing published with a headshot yet.
        </p>
      ) : (
        // flex: 1 + minHeight: 0 so this fills whatever vertical space is
        // left under the text above, and DirectoryPreviewGrid measures
        // that exact space to size its tiles -- the whole wall fits in
        // the viewport with no scrolling, on any screen height. A little
        // top padding here (rather than on the text above) sets the wall
        // down a bit from the description, without touching its own
        // sizing math.
        <div style={{ flex: 1, minHeight: 0, paddingTop: "clamp(16px, 3vh, 32px)" }}>
          <DirectoryPreviewGrid people={people} />
        </div>
      )}
    </div>
  );
}
