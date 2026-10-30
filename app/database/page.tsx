// DESTINATION: app/database/page.tsx
//
// "The Nzonzi Database" page, inspired by the Studio Museum in Harlem's
// "Introducing the 2026 Cohort" announcement layout -- rebuilt in the
// Nzonzi brand palette (BROWN for the reference's black background,
// WHITE for its white text), as a one-screen sample/teaser: headline, a
// "coming soon" subtext, three placeholder photo/name/title cards sized
// to fill the remaining space (no maxWidth cap on the grid, cards grow
// with the viewport) rather than sitting small in a corner. No LEARN
// MORE button (removed; its bordered-box style moved to the "meet the
// founders" link on /about instead).
//
// The three cards are real scholars' live listings (same approach as
// /about/founders): each slug in DATABASE_PREVIEW is looked up in
// scholar_profile, and its card shows the headshot, name and category
// and links to the full /profile/[slug] page. RLS only returns
// published listings to the public, so a listing that's still a draft
// (or a slug that doesn't match) falls back to the diagonal-stripe
// missing-headshot pattern with just the name, unlinked, until it's
// published. DATABASE_PREVIEW is the one thing to touch to change who's
// featured.

import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { fetchScholarProfile, type ScholarProfileRow } from "@/lib/scholarProfile";
import { CATEGORY_OPTIONS, optionLabel } from "@/app/apply/applicationOptions";
import { BROWN, OCHRE, WHITE } from "@/lib/colors";

type PreviewScholar = {
  slug: string;
  // Shown on the fallback card while the listing isn't published.
  name: string;
};

const DATABASE_PREVIEW: PreviewScholar[] = [
  { slug: "daniel-kumapayi", name: "Daniel Kumapayi" },
  { slug: "chinasa-t-okolo", name: "Chinasa T. Okolo" },
  { slug: "reginald-saga", name: "Reginald Saga" },
];

function categoryLabel(category: string | null, other: string | null): string {
  if (!category) return "";
  if (category === "other") return other || "Other";
  return optionLabel(CATEGORY_OPTIONS, category);
}

export default async function DatabasePage() {
  const supabase = await getSupabaseServerClient();
  const profiles: (ScholarProfileRow | null)[] = await Promise.all(
    DATABASE_PREVIEW.map((scholar) => fetchScholarProfile(supabase, scholar.slug).catch(() => null))
  );

  return (
    <div
      style={{
        background: BROWN,
        color: WHITE,
        minHeight: "100vh",
        padding: "28px clamp(20px, 6vw, 56px) 40px",
        display: "flex",
        flexDirection: "column",
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
        }}
      >
        ← back
      </Link>

      <h1
        style={{
          fontSize: "clamp(28px, 4.8vw, 52px)",
          fontWeight: 600,
          letterSpacing: "-0.01em",
          lineHeight: 1.06,
          margin: "0 0 10px",
          textTransform: "uppercase",
        }}
      >
        The Nzonzi Database
      </h1>

      <p
        style={{
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: OCHRE,
          margin: "0 0 14px",
        }}
      >
        Coming soon
      </p>

      {/* Curation criteria, per Modupe's exact wording. */}
      <p
        style={{
          fontSize: "clamp(14px, 1.6vw, 17px)",
          fontWeight: 300,
          lineHeight: 1.5,
          maxWidth: 680,
          color: "rgba(240,240,240,0.85)",
          margin: "0 0 32px",
        }}
      >
        Every profile listed on Nzonzi directory is a trusted contact with
        proven expertise in their field and has demonstrated their
        commitment to engaging with African and Caribbean knowledge
        systems.
      </p>

      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "clamp(24px, 4vw, 56px)",
            width: "100%",
          }}
        >
          {DATABASE_PREVIEW.map((scholar, i) => {
            const profile = profiles[i];
            const card = (
              <>
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "4 / 5",
                    maxHeight: "44vh",
                    overflow: "hidden",
                    backgroundImage: profile?.headshot_url
                      ? undefined
                      : "repeating-linear-gradient(135deg, rgba(240,240,240,0.12) 0 7px, transparent 7px 14px)",
                  }}
                >
                  {profile?.headshot_url && (
                    // Plain <img>, not next/image -- headshot URLs can be
                    // arbitrary applicant-supplied links (see ProfilePortrait).
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.headshot_url}
                      alt=""
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: `center ${profile.headshot_focal_y}%`,
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    fontSize: "clamp(18px, 1.8vw, 24px)",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    marginTop: 18,
                  }}
                >
                  {profile?.full_name ?? scholar.name}
                </div>
                {profile && (
                  <div
                    style={{
                      fontSize: "clamp(13px, 1.1vw, 15px)",
                      fontWeight: 500,
                      color: OCHRE,
                      marginTop: 4,
                    }}
                  >
                    {categoryLabel(profile.intended_category, profile.intended_category_other)}
                  </div>
                )}
              </>
            );
            return profile ? (
              <Link key={scholar.slug} href={`/profile/${profile.slug}`} style={{ color: WHITE, display: "block" }}>
                {card}
              </Link>
            ) : (
              <div key={scholar.slug}>{card}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
