import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolves a batch of platform_agent ids (application.reviewed_by /
 * scholar_profile.reviewed_by) to display names, via the
 * get_reviewer_names SECURITY DEFINER RPC (see
 * sql/2026-10-13a-reviewer-display-names.sql) -- RLS on app_user and
 * platform_agent stays restricted to a user's own row, so a plain join
 * from the client side wouldn't see any agent but the signed-in admin
 * themselves.
 *
 * Best-effort: on any error, returns an empty map rather than throwing,
 * so a reviewer name is "missing" at worst, never a reason the whole
 * review queue fails to load.
 */
export async function resolveReviewerNames(
  supabase: SupabaseClient,
  reviewedByIds: (string | null)[]
): Promise<Map<string, string>> {
  const ids = Array.from(new Set(reviewedByIds.filter((id): id is string => !!id)));
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase.rpc("get_reviewer_names", { agent_ids: ids });
  if (error || !data) return new Map();

  return new Map(
    (data as { agent_id: string; display_name: string | null }[])
      .filter((row) => row.display_name)
      .map((row) => [row.agent_id, row.display_name as string])
  );
}
