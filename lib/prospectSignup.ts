import { getSupabaseClient } from "./supabaseClient";

export type ProspectInterest = "buyer" | "seller" | "both" | "unspecified";

export interface ProspectSignupInput {
  email: string;
  interest: ProspectInterest;
  source?: string;
}

/**
 * Registers (or updates) a row in `prospect_signup` — the wide-net,
 * lightweight capture table for the top-of-page email + role control. This
 * is the ONLY write this app performs against the real Supabase schema; the
 * deeper scholar and client application forms further down the page are
 * intentionally UI-only (see the submit handlers in app/page.tsx for why).
 *
 * Goes through the `upsert_prospect_signup` RPC rather than a plain insert:
 * `email` is unique (case-insensitive) in this table, and someone who
 * registers once as a seller and later comes back as a buyer should end up
 * merged into `interest = 'both'`, not rejected with a duplicate-key error.
 * The RPC (a SECURITY DEFINER function) handles that merge server-side —
 * anon only has INSERT on this table, not UPDATE, by design.
 */
export async function submitProspectSignup({
  email,
  interest,
  source = "landing_page",
}: ProspectSignupInput) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("upsert_prospect_signup", {
    p_email: email,
    p_interest: interest,
    p_source: source,
  });

  if (error) throw error;
}
