import { getSupabaseClient } from "./supabaseClient";

export type ProspectInterest = "buyer" | "seller" | "both" | "unspecified";

export interface ProspectSignupInput {
  email: string;
  interest: ProspectInterest;
  source?: string;
}

/**
 * Inserts a row into `prospect_signup` — the wide-net, lightweight capture
 * table for the top-of-page email + role control. This is the ONLY write
 * this app performs against the real Supabase schema; the deeper scholar
 * and client application forms further down the page are intentionally
 * UI-only (see the submit handlers in app/page.tsx for why).
 */
export async function submitProspectSignup({
  email,
  interest,
  source = "landing_page",
}: ProspectSignupInput) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("prospect_signup").insert({
    email,
    interest,
    source,
  });

  if (error) throw error;
}
