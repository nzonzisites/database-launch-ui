"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getPlatformAgentRow, hasPermission } from "@/lib/platformAgent";

/**
 * Re-checks the signed-in user's platform_agent permission on the server
 * before writing -- never trust that the client-side UI only showed the
 * button to someone with the right permission. Returns the agent id (used
 * as application.reviewed_by) or throws.
 */
async function requireReviewSellersPermission() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const agent = await getPlatformAgentRow(supabase, user.id);
  if (!hasPermission(agent, "review_sellers")) {
    throw new Error("You don't have permission to review applications.");
  }

  return { supabase, agentId: agent!.id };
}

/**
 * Approving requires a public listing descriptor -- added 2026-09-30
 * alongside replacing the application's Category question with Function.
 * Function is a segmenting/profiling axis, not buyer-facing copy, so it's
 * no longer what shows on the public listing; instead the admin types
 * the descriptor that should show there, same spirit as Reject already
 * requiring a reason (just public-facing instead of internal-only).
 *
 * The status update below fires create_scholar_profile_on_approval,
 * which inserts (or no-ops onto an existing) scholar_profile row seeded
 * from application.intended_category -- always null for a Function-era
 * application. The follow-up update overwrites that field with the
 * descriptor just typed, so the listing never shows a blank category or
 * a raw, non-buyer-facing intake answer.
 */
export async function approveApplication(applicationId: string, listingDescriptor: string) {
  if (!listingDescriptor.trim()) {
    throw new Error("A public listing descriptor is required to approve an application.");
  }

  const { supabase, agentId } = await requireReviewSellersPermission();

  const { error } = await supabase
    .from("application")
    .update({
      status: "approved",
      reviewed_by: agentId,
      decision_reason: null,
    })
    .eq("id", applicationId);

  if (error) throw error;

  const { error: profileError } = await supabase
    .from("scholar_profile")
    .update({ intended_category: listingDescriptor.trim(), intended_category_other: null })
    .eq("application_id", applicationId);

  if (profileError) throw profileError;

  revalidatePath("/admin/review");
}

export async function rejectApplication(applicationId: string, reason: string) {
  if (!reason.trim()) {
    throw new Error("A reason is required to reject an application.");
  }

  const { supabase, agentId } = await requireReviewSellersPermission();

  const { error } = await supabase
    .from("application")
    .update({
      status: "rejected",
      reviewed_by: agentId,
      decision_reason: reason.trim(),
    })
    .eq("id", applicationId);

  if (error) throw error;
  revalidatePath("/admin/review");
}

/**
 * Undoes an approve or reject decision, sending the application back to
 * "under_review" so it can be decided again. Requires the same
 * review_sellers permission as approving/rejecting.
 */
export async function revokeDecision(applicationId: string) {
  const { supabase, agentId } = await requireReviewSellersPermission();

  const { error } = await supabase
    .from("application")
    .update({
      status: "under_review",
      reviewed_by: agentId,
      decision_reason: null,
    })
    .eq("id", applicationId);

  if (error) throw error;
  revalidatePath("/admin/review");
}
