import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { fetchScholarProfile } from "@/lib/scholarProfile";
import { CATEGORY_OPTIONS, WORK_MODALITY_OPTIONS, optionLabel } from "@/app/apply/applicationOptions";
import { BROWN, OCHRE, FOREST, SAND } from "@/lib/colors";
import ProfilePortrait from "./ProfilePortrait";

function categoryLabel(category: string | null, other: string | null): string {
  if (!category) return "";
  if (category === "other") return other || "Other";
  return optionLabel(CATEGORY_OPTIONS, category);
}

function vettedLabel(vettedDate: string | null): string | null {
  if (!vettedDate) return null;
  const d = new Date(vettedDate + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Splits on blank lines so admin-entered background text renders as
 * separate <p> paragraphs, matching the mockup's two-paragraph layout
 * without requiring a rich-text editor for a single free-text field. */
function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const profile = await fetchScholarProfile(supabase, id);
  if (!profile) return { title: "Nzonzi" };
  return {
    title: `${profile.full_name} — Nzonzi`,
    description: profile.tagline || undefined,
  };
}

export default async function ScholarProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const profile = await fetchScholarProfile(supabase, id);

  if (!profile) notFound();

  const category = categoryLabel(profile.intended_category, profile.intended_category_other);
  const vetted = vettedLabel(profile.vetted_date);

  const facts = [
    profile.city_country ? { k: "Location", v: profile.city_country } : null,
    profile.work_modality ? { k: "Delivery", v: optionLabel(WORK_MODALITY_OPTIONS, profile.work_modality) } : null,
    profile.experience_label ? { k: "Experience", v: profile.experience_label } : null,
    vetted ? { k: "Vetted", v: vetted } : null,
  ].filter((f): f is { k: string; v: string } => f !== null);

  // Neither "message this scholar" nor "report this listing" has a real
  // backend yet -- these are simple mailto: placeholders routed to the
  // team inbox until a proper contact/report flow exists.
  const contactHref = `mailto:hello@nzonzi.net?subject=${encodeURIComponent(
    `Interested in working with ${profile.full_name}`
  )}`;
  const reportHref = `mailto:hello@nzonzi.net?subject=${encodeURIComponent(
    `Reporting listing: ${profile.full_name} (${profile.id})`
  )}`;

  return (
    <div style={{ background: SAND, color: BROWN, minHeight: "100vh" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 32px 72px" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(31,14,3,0.6)", marginBottom: 26 }}>
          <Link href="/" style={{ color: "inherit" }}>
            home
          </Link>{" "}
          <span style={{ opacity: 0.5 }}>/</span> {category || "scholar"}{" "}
          <span style={{ opacity: 0.5 }}>/</span> {profile.full_name.toLowerCase()}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 48,
            alignItems: "start",
          }}
        >
          <div style={{ position: "sticky", top: 24 }}>
            <ProfilePortrait fullBio={profile.full_bio} headshotUrl={profile.headshot_url} />
          </div>

          <div>
            {category && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  color: OCHRE,
                  textTransform: "lowercase",
                }}
              >
                {category}
              </span>
            )}
            <h1
              style={{
                fontSize: 46,
                fontWeight: 300,
                letterSpacing: "-0.04em",
                lineHeight: 1.02,
                margin: "14px 0 12px",
                color: FOREST,
                textTransform: "lowercase",
              }}
            >
              {profile.full_name}
            </h1>
            {profile.tagline && (
              <p
                style={{
                  fontSize: 19,
                  fontWeight: 300,
                  lineHeight: 1.5,
                  margin: "0 0 26px",
                  maxWidth: 560,
                  color: "rgba(31,14,3,0.8)",
                }}
              >
                {profile.tagline}
              </p>
            )}

            {facts.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 40,
                  flexWrap: "wrap",
                  borderTop: "1px solid rgba(31,14,3,0.2)",
                  padding: "16px 0 0",
                  marginBottom: 34,
                }}
              >
                {facts.map((f) => (
                  <div key={f.k}>
                    <div style={{ fontSize: 12, fontWeight: 400, color: "rgba(31,14,3,0.5)", marginBottom: 5, textTransform: "lowercase" }}>
                      {f.k}
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 400, lineHeight: 1.3 }}>{f.v}</div>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: 40,
                alignItems: "start",
              }}
            >
              <div style={{ minWidth: 0 }}>
                {profile.background && (
                  <>
                    <h2
                      style={{
                        fontSize: 12.5,
                        fontWeight: 500,
                        letterSpacing: "0.02em",
                        textTransform: "lowercase",
                        margin: "0 0 12px",
                        color: "rgba(31,14,3,0.55)",
                      }}
                    >
                      background
                    </h2>
                    {paragraphs(profile.background).map((para, i) => (
                      <p
                        key={i}
                        style={{ fontSize: 15.5, fontWeight: 400, lineHeight: 1.62, margin: "0 0 14px" }}
                      >
                        {para}
                      </p>
                    ))}
                  </>
                )}
              </div>

              <div style={{ position: "sticky", top: 24, borderTop: "1px solid rgba(31,14,3,0.35)", paddingTop: 18 }}>
                <a
                  href={contactHref}
                  style={{
                    display: "inline-block",
                    background: "transparent",
                    borderBottom: `1px solid ${BROWN}`,
                    color: BROWN,
                    padding: "4px 0",
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  message this scholar →
                </a>
                <div style={{ marginTop: 18, fontSize: 12.5 }}>
                  <a href={reportHref} style={{ color: "rgba(31,14,3,0.5)", borderBottom: "1px solid currentColor" }}>
                    Report this listing
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
