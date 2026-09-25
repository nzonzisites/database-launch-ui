import type { SupabaseClient } from "@supabase/supabase-js";

export type ApplicationStatus = "applied" | "under_review" | "approved" | "rejected";

export interface ApplicationForReview {
  id: string;
  full_name: string;
  email: string;
  phone_or_whatsapp: string;
  city_country: string;
  affiliations: string[];
  external_links: string[];
  intended_category: string;
  intended_category_other: string | null;
  work_modality: "remote_only" | "travel_flexible" | "both";
  infrastructure_narrative: string;
  expertise_narrative: string;
  work_samples: unknown;
  work_samples_explanation: string | null;
  reference_name: string;
  reference_relationship: string;
  reference_contact_method: "email" | "phone";
  reference_contact_value: string;
  reference_whatsapp_available: boolean | null;
  reference_may_contact: boolean;
  additional_notes: string | null;
  referral_source: string | null;
  status: ApplicationStatus;
  reviewed_by: string | null;
  decision_reason: string | null;
  created_at: string;
}

const REVIEW_COLUMNS =
  "id, full_name, email, phone_or_whatsapp, city_country, affiliations, external_links, " +
  "intended_category, intended_category_other, work_modality, infrastructure_narrative, " +
  "expertise_narrative, work_samples, work_samples_explanation, reference_name, " +
  "reference_relationship, reference_contact_method, reference_contact_value, " +
  "reference_whatsapp_available, reference_may_contact, additional_notes, referral_source, " +
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
  return (data ?? []) as unknown as ApplicationForReview[];
}
