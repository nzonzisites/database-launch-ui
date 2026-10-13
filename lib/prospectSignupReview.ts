// DESTINATION: lib/prospectSignupReview.ts
//
// Admin read of prospect_signup for the review portal's Prospects tab --
// distinct from lib/prospectSignup.ts (the public-facing write side:
// submitProspectSignup et al.). Schema confirmed directly against
// information_schema.columns on 2026-10-13 rather than inferred from the
// write-side RPCs' params, since a wrong column name here would only
// surface as a runtime select error.
//
// interest/status/category are Postgres enums (USER-DEFINED in
// information_schema) whose full value sets aren't available from this
// codebase (defined in the separate nzonzi_database_launch schema repo) --
// interest is typed from ProspectInterest in lib/prospectSignup.ts, which
// IS confirmed; status and category are left as plain strings and
// formatted generically (underscores -> spaces, capitalized) rather than
// guessed at with a hardcoded label map.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProspectInterest } from "./prospectSignup";

export interface ProspectSignupForReview {
  id: string;
  email: string;
  affiliation: string | null;
  interest: ProspectInterest;
  subscribed_at: string;
  unsubscribed_at: string | null;
  source: string | null;
  status: string;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  country: string | null;
  category: string | null;
  category_other: string | null;
  what_you_do: string | null;
  failed_infrastructure_response: string | null;
  title: string | null;
  platform_use: string | null;
  updated_at: string | null;
}

const COLUMNS =
  "id, email, affiliation, interest, subscribed_at, unsubscribed_at, source, status, " +
  "first_name, last_name, city, country, category, category_other, what_you_do, " +
  "failed_infrastructure_response, title, platform_use, updated_at";

/**
 * All prospect_signup rows, newest first. Requires review_sellers --
 * reusing that permission rather than introducing a new one, since the
 * prospect list is the same top-of-funnel audience (both buy- and
 * sell-side) the Applications tab already gates behind it, and this
 * account is presently the only reviewer. Revisit with a dedicated
 * permission if/when that stops being true. See
 * sql/2026-10-13b-prospect-signup-admin-read.sql for the RLS policy this
 * depends on.
 */
export async function fetchProspectSignupsForReview(
  supabase: SupabaseClient
): Promise<ProspectSignupForReview[]> {
  const { data, error } = await supabase
    .from("prospect_signup")
    .select(COLUMNS)
    .order("subscribed_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ProspectSignupForReview[];
}
