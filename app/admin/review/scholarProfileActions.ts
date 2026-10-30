"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getPlatformAgentRow, hasPermission } from "@/lib/platformAgent";
import { normalizeSectorOther } from "@/app/apply/applicationOptions";

/**
 * Same pattern as requireReviewSellersPermission in ./actions.ts, but for
 * the review_listings permission -- editing/publishing a scholar_profile
 * is a separate permission from reviewing applications, so someone with
 * only review_sellers shouldn't be able to touch listing content (this is
 * re-checked server-side regardless of what the UI shows, matching the
 * DB's own RLS policies on scholar_profile).
 */
async function requireReviewListingsPermission() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const agent = await getPlatformAgentRow(supabase, user.id);
  if (!hasPermission(agent, "review_listings")) {
    throw new Error("You don't have permission to edit listings.");
  }

  return { supabase, agentId: agent!.id };
}

export interface ScholarProfileEditableFields {
  headshot_url: string; // "" clears it (stored as null)
  headshot_focal_y: number; // 0-100 vertical crop position, clamped on save
  // The public listing descriptor -- same column the approval gate
  // (app/admin/review/actions.ts's approveApplication) requires a value
  // for before an application can be approved. Editable here afterward
  // so it can keep being refined to match buyer-side language over
  // time, without needing to revoke and re-approve the application.
  intended_category: string;
  // Added 2026-10-17 alongside the fields below -- the Function-era
  // replacement for intended_category above. Kept separate rather than
  // merged, since intended_category stays in use as the free-text
  // "Listing descriptor" buyers actually see.
  intended_function: string;
  intended_function_other: string;
  // Set automatically at approval (create_scholar_profile_on_approval)
  // but had no admin-edit path until now -- an admin correcting a typo
  // or adding a location the applicant left off had no way to do so.
  city_country: string;
  residences: { city: string; country: string; is_primary: boolean }[];
  country_of_origin: string;
  affiliations: string[];
  // Same gap as city_country above -- set at approval, previously
  // read-only on the Listings tab.
  work_modality: string[];
  experience_areas: string[];
  tagline: string;
  full_bio: string;
  background: string;
  experience_label: string;
  vetted_date: string; // "" clears it (stored as null)
  // Industries shown as badges on the public listing -- same shape and
  // "other" convention as application.sector/sector_other (see
  // SECTOR_OPTIONS in app/apply/applicationOptions.ts).
  sector: string[];
  sector_other: string;
}

/**
 * Saves the editable listing-page fields. Does not touch status.
 *
 * Takes `slug` alongside `profileId` purely so it can revalidate the
 * right public route -- /profile/[slug], not /profile/[id] -- without an
 * extra round-trip to look the slug up. The caller already has it (every
 * ScholarProfileRow includes slug), so this just threads it through.
 */
export async function updateScholarProfile(
  profileId: string,
  slug: string,
  fields: ScholarProfileEditableFields
) {
  const { supabase, agentId } = await requireReviewListingsPermission();

  const { error } = await supabase
    .from("scholar_profile")
    .update({
      headshot_url: fields.headshot_url.trim() || null,
      headshot_focal_y: Math.round(Math.min(100, Math.max(0, fields.headshot_focal_y))),
      intended_category: fields.intended_category.trim(),
      intended_function: fields.intended_function || null,
      intended_function_other:
        fields.intended_function === "other" ? fields.intended_function_other.trim() : null,
      city_country: fields.city_country.trim() || null,
      residences:
        fields.residences.length > 0
          ? fields.residences.map((r) => ({
              city: r.city.trim(),
              country: r.country.trim(),
              is_primary: r.is_primary,
            }))
          : null,
      country_of_origin: fields.country_of_origin.trim() || null,
      affiliations: fields.affiliations.length > 0 ? fields.affiliations : null,
      work_modality: fields.work_modality.length > 0 ? fields.work_modality : null,
      experience_areas: fields.experience_areas.length > 0 ? fields.experience_areas : null,
      tagline: fields.tagline.trim(),
      full_bio: fields.full_bio.trim(),
      background: fields.background.trim(),
      experience_label: fields.experience_label.trim() || null,
      vetted_date: fields.vetted_date || null,
      sector: fields.sector.length > 0 ? fields.sector : null,
      sector_other: fields.sector.includes("other") ? normalizeSectorOther(fields.sector_other) : null,
      reviewed_by: agentId,
    })
    .eq("id", profileId);

  if (error) throw error;
  revalidatePath("/admin/review");
  revalidatePath(`/profile/${slug}`);
}

/**
 * Publishing saves the current field values first, then flips status to
 * published, so an admin can't end up with a published page that's
 * missing whatever they just typed but hadn't separately saved yet.
 */
export async function publishScholarProfile(
  profileId: string,
  slug: string,
  fields: ScholarProfileEditableFields
) {
  await updateScholarProfile(profileId, slug, fields);
  const { supabase, agentId } = await requireReviewListingsPermission();

  const { error } = await supabase
    .from("scholar_profile")
    .update({ status: "published", reviewed_by: agentId })
    .eq("id", profileId);

  if (error) throw error;
  revalidatePath("/admin/review");
  revalidatePath(`/profile/${slug}`);
}

export async function unpublishScholarProfile(profileId: string, slug: string) {
  const { supabase, agentId } = await requireReviewListingsPermission();

  const { error } = await supabase
    .from("scholar_profile")
    .update({ status: "draft", reviewed_by: agentId })
    .eq("id", profileId);

  if (error) throw error;
  revalidatePath("/admin/review");
  revalidatePath(`/profile/${slug}`);
}
