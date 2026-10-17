import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveReviewerNames } from "./reviewerNames";

export type ApplicationStatus = "draft" | "applied" | "under_review" | "approved" | "rejected";

// Most of these became nullable at the DB level alongside the autosave
// feature (sql/2026-10-12c-application-autosave.sql dropped NOT NULL on
// full_name, city_country, intended_function, work_modality,
// expertise_narrative, infrastructure_narrative, full_bio -- and every
// other content column already tolerated null via saveApplicationDraft's
// row builder) so a "draft" row can be genuinely half-filled-in. Now that
// this queue shows drafts too (see fetchApplicationsForReview), the type
// has to admit that -- only id/email/status/created_at/reference_may_contact
// are guaranteed non-null (reference_may_contact's client default is
// always a real boolean, never actually unset).
export interface ApplicationForReview {
  id: string;
  full_name: string | null;
  email: string;
  contact_method: "email" | "phone" | null;
  contact_value: string | null;
  whatsapp_available: boolean | null;
  city_country: string | null;
  residences: { city?: string; country?: string; is_primary?: boolean }[] | null;
  country_of_origin: string | null;
  affiliations: string[] | null;
  external_links: string[] | null;
  headshot_url: string | null;
  // Category -- legacy: null on every application from 2026-09-30
  // onward, replaced by Function as the intake question.
  intended_category: string | null;
  intended_category_other: string | null;
  intended_function: string | null;
  intended_function_other: string | null;
  experience_areas: string[] | null;
  // Rebuilt 2026-10-17 as a genuine multi-select (any combination of
  // virtual/local/travel) -- see WORK_MODALITY_OPTIONS in applicationOptions.ts.
  work_modality: string[] | null;
  infrastructure_narrative: string | null;
  expertise_narrative: string | null;
  full_bio: string | null;
  work_samples: string[];
  work_samples_explanation: string | null;
  reference_name: string | null;
  reference_relationship: string | null;
  reference_contact_method: "email" | "phone" | null;
  reference_contact_value: string | null;
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
  reviewer_name: string | null;
  decision_reason: string | null;
  created_at: string;
}

// Raw shape as it comes back from Supabase: work_samples is stored as
// jsonb [{ url }] (see app/apply/actions.ts).
interface RawApplicationForReview extends Omit<ApplicationForReview, "work_samples"> {
  work_samples: { url?: string }[] | null;
}

const REVIEW_COLUMNS =
  "id, full_name, email, contact_method, contact_value, whatsapp_available, city_country, residences, country_of_origin, affiliations, external_links, " +
  "headshot_url, intended_category, intended_category_other, intended_function, intended_function_other, experience_areas, work_modality, infrastructure_narrative, " +
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
  // Drafts ARE included (no status filter) -- an admin should be able to
  // see an incomplete/abandoned application, just without the ability to
  // decide on it (canDecide, in ReviewQueueClient, is still limited to
  // applied/under_review).
  const { data, error } = await supabase
    .from("application")
    .select(REVIEW_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as RawApplicationForReview[];
  const reviewerNames = await resolveReviewerNames(
    supabase,
    rows.map((row) => row.reviewed_by)
  );

  return rows.map((row) => {
    const { work_samples, reviewed_by, ...rest } = row;
    return {
      ...rest,
      reviewed_by,
      reviewer_name: reviewed_by ? reviewerNames.get(reviewed_by) ?? null : null,
      work_samples: (work_samples ?? []).map((sample) => sample?.url ?? "").filter(Boolean),
    };
  });
}
