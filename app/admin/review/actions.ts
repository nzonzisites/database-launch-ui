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
