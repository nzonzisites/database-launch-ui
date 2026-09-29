import { getSupabaseClient } from "./supabaseClient";

export interface ScholarApplicationInput {
  email: string;
  firstName: string;
  lastName: string;
  city: string;
  country: string;
  affiliation: string;
  category: string;
  categoryOther?: string | null;
  // Optional: the landing page ("About You") no longer asks these two
  // narrative questions -- they moved to /apply, per the 2026-09-21 field
  // split decision. Left optional (rather than dropped) so this function
  // still works for any other caller that has real narrative text to
  // attach. Omitted here means the RPC leaves whatever was already on
  // the row alone (see submit_scholar_application's coalesce), so a
  // returning submitter's earlier answer is never blanked out.
  whatYouDo?: string;
  failedInfrastructureResponse?: string;
}

/**
 * Submits the scholar "about you" application by updating the caller's
 * existing `prospect_signup` row (matched by email, same convention as
 * `submitProspectSignup`). Goes through the `submit_scholar_application`
 * RPC — anon only has INSERT on `prospect_signup`, not UPDATE, so a plain
 * client-side update call would be rejected. The RPC is SECURITY DEFINER
 * and falls back to inserting a fresh row if no matching signup exists,
 * so an application is never silently dropped even if someone reaches
 * this form without having signed up first.
 *
 * whatYouDo/failedInfrastructureResponse are no longer collected by the
 * landing page itself (see /apply for where those questions live now),
 * so callers typically omit them -- the RPC's coalesce logic means that
 * leaves any existing answer on the row untouched rather than clearing
 * it.
 */
export async function submitScholarApplication({
  email,
  firstName,
  lastName,
  city,
  country,
  affiliation,
  category,
  categoryOther,
  whatYouDo,
  failedInfrastructureResponse,
}: ScholarApplicationInput) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("submit_scholar_application", {
    p_email: email,
    p_first_name: firstName,
    p_last_name: lastName,
    p_city: city,
    p_country: country,
    p_affiliation: affiliation,
    p_category: category,
    p_category_other: categoryOther ?? null,
    p_what_you_do: whatYouDo ?? null,
    p_failed_infrastructure_response: failedInfrastructureResponse ?? null,
  });

  if (error) throw error;
}

export interface BuyerApplicationInput {
  email: string;
  firstName: string;
  lastName: string;
  city: string;
  country: string;
  affiliation: string;
  title: string;
  platformUse: string;
}

/**
 * Submits the buyer "about you" application. Same pattern as
 * submitScholarApplication above, via the `submit_buyer_application` RPC.
 */
export async function submitBuyerApplication({
  email,
  firstName,
  lastName,
  city,
  country,
  affiliation,
  title,
  platformUse,
}: BuyerApplicationInput) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("submit_buyer_application", {
    p_email: email,
    p_first_name: firstName,
    p_last_name: lastName,
    p_city: city,
    p_country: country,
    p_affiliation: affiliation,
    p_title: title,
    p_platform_use: platformUse,
  });

  if (error) throw error;
}
