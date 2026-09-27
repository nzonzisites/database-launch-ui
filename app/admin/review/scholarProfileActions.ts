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
  tagline: string;
  full_bio: string;
  background: string;
  experience_label: string;
  vetted_date: string; // "" clears it (stored as null)
}

/** Saves the editable listing-page fields. Does not touch status. */
export async function updateScholarProfile(profileId: string, fields: ScholarProfileEditableFields) {
  const { supabase, agentId } = await requireReviewListingsPermission();

  const { error } = await supabase
    .from("scholar_profile")
    .update({
      headshot_url: fields.headshot_url.trim() || null,
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
  revalidatePath(`/profile/${profileId}`);
}

/**
 * Publishing saves the current field values first, then flips status to
 * published, so an admin can't end up with a published page that's
 * missing whatever they just typed but hadn't separately saved yet.
 */
export async function publishScholarProfile(profileId: string, fields: ScholarProfileEditableFields) {
  await updateScholarProfile(profileId, fields);
  const { supabase, agentId } = await requireReviewListingsPermission();

  const { error } = await supabase
    .from("scholar_profile")
    .update({ status: "published", reviewed_by: agentId })
    .eq("id", profileId);

  if (error) throw error;
  revalidatePath("/admin/review");
  revalidatePath(`/profile/${profileId}`);
}

export async function unpublishScholarProfile(profileId: string) {
  const { supabase, agentId } = await requireReviewListingsPermission();

  const { error } = await supabase
    .from("scholar_profile")
    .update({ status: "draft", reviewed_by: agentId })
    .eq("id", profileId);

  if (error) throw error;
  revalidatePath("/admin/review");
  revalidatePath(`/profile/${profileId}`);
}
