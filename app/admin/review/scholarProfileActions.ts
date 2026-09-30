"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getPlatformAgentRow, hasPermission } from "@/lib/platformAgent";

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
  tagline: string;
  full_bio: string;
  background: string;
  experience_label: string;
  vetted_date: string; // "" clears it (stored as null)
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
      tagline: fields.tagline.trim(),
      full_bio: fields.full_bio.trim(),
      background: fields.background.trim(),
      experience_label: fields.experience_label.trim() || null,
      vetted_date: fields.vetted_date || null,
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
