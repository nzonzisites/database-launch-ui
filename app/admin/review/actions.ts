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
 * Approving used to require typing a public listing descriptor inline
 * here (added 2026-09-30 alongside replacing the application's Category
 * question with Function), immediately overwriting the scholar_profile
 * row create_scholar_profile_on_approval seeds. That duplicated the
 * Listings tab, which already has its own editable "Listing descriptor"
 * field for the same scholar_profile.intended_category column -- so this
 * no longer asks for it at approval time; the fresh scholar_profile row
 * (seeded with intended_category null, since Function-era applications
 * never populate the legacy category field) just sits with no descriptor
 * until an admin sets one on the Listings tab, same as editing it later
 * always worked.
 */
export async function approveApplication(applicationId: string) {
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
