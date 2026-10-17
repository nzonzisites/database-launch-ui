// DESTINATION: app/about/founders/page.tsx
//
// "About the Nzonzi founders" page, linked from the bottom of /about.
// The point (per Modupe: "TLDR: we're not nepo-babies") is to let a
// visitor land straight on the founders' own vetted listings rather
// than take that on faith -- so this pulls Uche's and Ireti's live
// scholar_profile rows and renders each one as a compact row (portrait
// left, name/category/tagline/link to the right), stacked so both fit
// on one screen without scrolling, each linking out to their full
// listing.
//
// FOUNDER_SLUGS is the only thing to touch if a slug ever changes (an
// admin renaming a listing, a profile being re-approved under a new
// slug, etc.) -- everything else here just reads whatever
// fetchScholarProfile returns for those slugs.

import Link from "next/link";
import type { Metadata } from "next";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { fetchScholarProfile, type ScholarProfileRow } from "@/lib/scholarProfile";
import { CATEGORY_OPTIONS, optionLabel } from "@/app/apply/applicationOptions";
import { BROWN, FOREST, OCHRE, SAND } from "@/lib/colors";
import ProfilePortrait from "@/app/profile/[slug]/ProfilePortrait";

const FOUNDER_SLUGS = ["uchenna-ezejiofor", "ireti-akinrinade"];

export const metadata: Metadata = {
  title: "The Nzonzi founders — Nzonzi",
  description: "Uche and Ireti's own listings on Nzonzi.",
};

function categoryLabel(category: string | null, other: string | null): string {
  if (!category) return "";
  if (category === "other") return other || "Other";
  return optionLabel(CATEGORY_OPTIONS, category);
}

export default async function FoundersPage() {
  const supabase = await getSupabaseServerClient();
  const profiles = (
    await Promise.all(FOUNDER_SLUGS.map((slug) => fetchScholarProfile(supabase, slug)))
  ).filter((p): p is ScholarProfileRow => p !== null);

  return (
    <div style={{ background: SAND, color: BROWN, minHeight: "100vh" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 48px 40px" }}>
        <Link
          href="/about"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(31,14,3,0.6)",
            marginBottom: 20,
            display: "inline-block",
          }}
        >
          ← back
        </Link>

        <h1
          style={{
            fontSize: "clamp(24px, 3.4vw, 32px)",
            fontWeight: 300,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            margin: "0 0 24px",
            color: FOREST,
            textTransform: "lowercase",
          }}
        >
          meet the founders
        </h1>

        {profiles.length === 0 ? (
          <p style={{ fontSize: 15, color: "rgba(31,14,3,0.6)" }}>
            Our listings aren't showing up here right now -- in the
            meantime, you can browse the full roster from the home page.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {profiles.map((profile) => {
              const category = categoryLabel(profile.intended_category, profile.intended_category_other);
              return (
                <div
                  key={profile.id}
                  style={{ display: "flex", flexWrap: "wrap", gap: 28, alignItems: "flex-start" }}
                >
                  <div style={{ width: "clamp(220px, min(36vh, 32vw), 440px)", flexShrink: 0 }}>
                    {/* fullBio deliberately left blank -- ProfilePortrait only
                        renders the click-for-bio label/overlay when it's
                        truthy, and that interaction is staying off this page
                        (per Modupe: incomplete here) without touching the
                        shared component /profile/[slug] still uses it on. */}
                    <ProfilePortrait
                      fullBio=""
                      headshotUrl={profile.headshot_url}
                      headshotFocalY={profile.headshot_focal_y}
                    />
                  </div>

                  <div style={{ flex: "1 1 380px", minWidth: 240 }}>
                    {category && (
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          letterSpacing: "0.02em",
                          color: OCHRE,
                          textTransform: "lowercase",
                        }}
                      >
                        {category}
                      </div>
                    )}
                    <h2
                      style={{
                        fontSize: 22,
                        fontWeight: 300,
                        letterSpacing: "-0.02em",
                        lineHeight: 1.1,
                        margin: "6px 0 8px",
                        textTransform: "lowercase",
                      }}
                    >
                      {profile.full_name}
                    </h2>
                    {profile.tagline && (
                      <p
                        style={{
                          fontSize: 14.5,
                          fontWeight: 300,
                          lineHeight: 1.45,
                          margin: "0 0 12px",
                          color: "rgba(31,14,3,0.8)",
                        }}
                      >
                        {profile.tagline}
                      </p>
                    )}
                    <Link
                      href={`/profile/${profile.slug}`}
                      style={{
                        fontSize: 13.5,
                        fontWeight: 500,
                        color: FOREST,
                        textDecoration: "underline",
                        textUnderlineOffset: 3,
                      }}
                    >
                      See the full listing →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
