// DESTINATION: app/sample-directory-preview/page.tsx
//
// A hidden (unlinked, reachable only by direct URL) teaser page: a wall
// of real, published scholars' headshots in the same edge-to-edge grid
// style as the reference stock-photo mockup this was built from, but
// instead of showing every face at once, only one tile at a time is
// revealed -- the rest sit behind the same diagonal-stripe placeholder
// pattern /database and ProfilePortrait already use for a missing
// headshot. The reveal cycles automatically; a caption block below the
// grid shows whoever's currently lit up.
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
import DirectoryPreviewGrid, { type PreviewPerson } from "./DirectoryPreviewGrid";

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

export default async function SampleDirectoryPreviewPage() {
  const supabase = await getSupabaseServerClient();
  const profiles = await fetchPublishedProfilesWithHeadshots(supabase);

  const people: PreviewPerson[] = profiles.map((p) => ({
    slug: p.slug,
    fullName: p.full_name,
    headshotUrl: p.headshot_url as string,
    headshotFocalY: p.headshot_focal_y,
    category: categoryLabel(p.intended_category, p.intended_category_other),
    locations: locationLines(p.residences, p.city_country),
    countryOfOrigin: p.country_of_origin,
    tagline: p.tagline,
  }));

  return (
    <div
      style={{
        background: BROWN,
        color: WHITE,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "16px clamp(20px, 6vw, 48px)", flexShrink: 0 }}>
        <Link
          href="/"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(240,240,240,0.6)",
            display: "inline-block",
          }}
        >
          ← back
        </Link>
      </div>

      {people.length === 0 ? (
        <p
          style={{
            padding: "80px clamp(20px, 6vw, 48px)",
            fontSize: 16,
            color: "rgba(240,240,240,0.6)",
          }}
        >
          Nothing published with a headshot yet.
        </p>
      ) : (
        // flex: 1 + minHeight: 0 so this fills whatever vertical space is
        // left under the back-link, and DirectoryPreviewGrid measures
        // that exact space to size its tiles -- the whole wall fits in
        // the viewport with no scrolling, on any screen height.
        <div style={{ flex: 1, minHeight: 0 }}>
          <DirectoryPreviewGrid people={people} />
        </div>
      )}
    </div>
  );
}
