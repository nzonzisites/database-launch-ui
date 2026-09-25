import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Permission strings on platform_agent.permissions (Postgres enum
 * platform_agent_permission). Kept as a plain union rather than importing
 * generated DB types since this project doesn't generate any yet.
 */
export type PlatformAgentPermission =
  | "review_sellers"
  | "review_reports"
  | "issue_refunds"
  | "manage_evidence_review"
  | "review_listings";

export interface PlatformAgentRow {
  id: string;
  permissions: PlatformAgentPermission[];
}

/**
 * Looks up the signed-in user's platform_agent row (if any). Returns null
 * if the user isn't a platform agent at all.
 *
 * IMPORTANT: platform_agent.user_id references app_user.id, NOT
 * auth.users.id directly. auth.getUser() only gives us the auth.users id,
 * so this first resolves that to the matching app_user row via
 * app_user.auth_provider_id, then looks up platform_agent from there.
 * (Discovered 2026-09-23 -- this used to query platform_agent by the raw
 * auth uid, which could never match.)
 *
 * Relies on RLS allowing a user to read their own app_user row and their
 * own platform_agent row, AND on the authenticated role having a base
 * GRANT SELECT on both tables (RLS alone isn't enough -- see
 * sql/2026-09-23b-fix-platform-agent-rls.sql and the grant statements run
 * alongside it).
 */
export async function getPlatformAgentRow(
  supabase: SupabaseClient,
  authUserId: string
): Promise<PlatformAgentRow | null> {
  const { data: appUser, error: appUserError } = await supabase
    .from("app_user")
    .select("id")
    .eq("auth_provider_id", authUserId)
    .maybeSingle();

  if (appUserError || !appUser) return null;

  const { data, error } = await supabase
    .from("platform_agent")
    .select("id, permissions")
    .eq("user_id", appUser.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as PlatformAgentRow;
}

export function hasPermission(
  agent: PlatformAgentRow | null,
  permission: PlatformAgentPermission
): boolean {
  return !!agent?.permissions?.includes(permission);
}
