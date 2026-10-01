import type { SupabaseClient } from "@supabase/supabase-js";

export type ApplicationStatus = "applied" | "under_review" | "approved" | "rejected";

export interface ApplicationForReview {
  id: string;
  full_name: string;
  email: string;
  contact_method: "email" | "phone";
  contact_value: string;
  whatsapp_available: boolean | null;
  city_country: string;
  affiliations: string[];
  external_links: string[];
  headshot_url: string | null;
  // Category -- legacy: null on every application from 2026-09-30
  // onward, replaced by Function as the intake question.
  intended_category: string | null;
  intended_category_other: string | null;
  intended_function: string | null;
  intended_function_other: string | null;
  work_modality: "remote_only" | "travel_flexible" | "both";
  infrastructure_narrative: string;
  expertise_narrative: string;
  full_bio: string | null;
  work_samples: string[];
  work_samples_explanation: string | null;
  reference_name: string;
  reference_relationship: string;
  reference_contact_method: "email" | "phone";
  reference_contact_value: string;
  reference_whatsapp_available: boolean | null;
  reference_may_contact: boolean;
  additional_notes: string | null;
  referral_source: string | null;
  prior_paid_work: string | null;
  sector: string[] | null;
  sector_other: string | null;
  deliverables: string | null;
  rate_type: string | null;
  rate_amount: number | null;
  rate_currency: string | null;
  rate_relative_to_market: string | null;
  rate_scope: string | null;
  capacity: string | null;
  status: ApplicationStatus;
  reviewed_by: string | null;
  decision_reason: string | null;
  created_at: string;
}

// Raw shape as it comes back from Supabase: work_samples is stored as
// jsonb [{ url }] (see app/apply/actions.ts).
interface RawApplicationForReview extends Omit<ApplicationForReview, "work_samples"> {
  work_samples: { url?: string }[] | null;
}

const REVIEW_COLUMNS =
  "id, full_name, email, contact_method, contact_value, whatsapp_available, city_country, affiliations, external_links, " +
  "headshot_url, intended_category, intended_category_other, intended_function, intended_function_other, work_modality, infrastructure_narrative, " +
  "expertise_narrative, full_bio, work_samples, work_samples_explanation, reference_name, " +
  "reference_relationship, reference_contact_method, reference_contact_value, " +
  "reference_whatsapp_available, reference_may_contact, additional_notes, referral_source, " +
  "prior_paid_work, sector, sector_other, deliverables, rate_type, rate_amount, rate_currency, rate_relative_to_market, rate_scope, capacity, " +
  "status, reviewed_by, decision_reason, created_at";

/**
 * All seller applications, newest first. The review queue UI splits these
 * into "needs attention" (applied/under_review) vs. decided
 * (approved/rejected) client-side rather than two separate queries --
 * the table is small enough for now (rolling cohort intake, not
 * high-volume) that fetching once and filtering in the tab UI is simpler
 * than adding query params.
 */
export async function fetchApplicationsForReview(
  supabase: SupabaseClient
): Promise<ApplicationForReview[]> {
  const { data, error } = await supabase
    .from("application")
    .select(REVIEW_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as RawApplicationForReview[]).map((row) => {
    const { work_samples, ...rest } = row;
    return {
      ...rest,
      work_samples: (work_samples ?? []).map((sample) => sample?.url ?? "").filter(Boolean),
    };
  });
}
