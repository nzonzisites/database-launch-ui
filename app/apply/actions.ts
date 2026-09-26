// DESTINATION: app/apply/actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { sendApplicationConfirmationEmail } from "@/lib/email";

export interface SubmitApplicationInput {
  fullName: string;
  email: string;
  phoneOrWhatsapp: string;
  cityCountry: string;
  affiliations: string[];
  headshotUrl: string;
  intendedCategory: string;
  intendedCategoryOther: string;
  workModality: string;
  infrastructureNarrative: string;
  expertiseNarrative: string;
  externalLinks: string[];
  workSamples: string[]; // pasted URLs -- stored as jsonb [{ url }]
  workSamplesExplanation: string;
  referenceName: string;
  referenceRelationship: string;
  referenceContactMethod: string;
  referenceContactValue: string;
  referenceWhatsappAvailable: boolean;
  referenceMayContact: boolean;
  additionalNotes: string;
  referralSource: string;
  prospectSignupId: string | null;
}

export type SubmitApplicationResult =
  | { success: true }
  | { success: false; error: string };

export interface ProspectPrefill {
  firstName: string;
  lastName: string;
  city: string;
  country: string;
  affiliation: string;
  category: string | null;
}

/**
 * Looks up a "About You" prospect_signup row by email, for anonymous
 * /apply visitors who already filled that out elsewhere and shouldn't
 * have to retype their name, city, country, affiliation, or category.
 * Signed-in visitors don't need this -- page.tsx already does the
 * equivalent lookup server-side, keyed off their verified account email.
 *
 * Goes through a SECURITY DEFINER RPC (get_prospect_signup_prefill)
 * rather than a direct table select: prospect_signup isn't otherwise
 * readable by anonymous requests, and it shouldn't become broadly
 * readable just to support this -- the RPC only ever returns one
 * narrowly-scoped row for the exact email passed in, nothing you could
 * use to browse the table. Requires that RPC to exist in Supabase (SQL
 * delivered alongside this change) -- until then this just no-ops.
 */
export async function lookupProspectPrefill(email: string): Promise<ProspectPrefill | null> {
  const trimmed = email.trim();
  if (!trimmed || !trimmed.includes("@")) return null;

  const supabase = await getSupabaseServerClient();
  try {
    const { data, error } = await supabase.rpc("get_prospect_signup_prefill", {
      p_email: trimmed,
    });
    if (error || !data || data.length === 0) return null;
    const row = data[0];
    return {
      firstName: (row.first_name as string) ?? "",
      lastName: (row.last_name as string) ?? "",
      city: (row.city as string) ?? "",
      country: (row.country as string) ?? "",
      affiliation: (row.affiliation as string) ?? "",
      category: (row.category as string) ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Inserts a seller application. Signing in is no longer required to
 * apply -- a magic link is only needed later, to come back and review
 * what was submitted. If a session DOES exist (a returning applicant who
 * happens to already be signed in), the application still gets linked to
 * their app_user account the same way it always did; otherwise it's
 * anchored purely by the email typed into the form, and
 * applicant_user_id is left null. Re-checks for a duplicate submission
 * server-side either way -- never trust that the page's own gating is
 * the only thing standing between a request and a duplicate/invalid
 * insert.
 *
 * Requires a matching DB migration: applicant_user_id must be nullable,
 * and the application table needs an INSERT policy that allows the
 * anon role (see the SQL Modupe ran alongside this change).
 */
export async function submitApplication(
  input: SubmitApplicationInput
): Promise<SubmitApplicationResult> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let applicantUserId: string | null = null;

  if (user) {
    const { data: appUser, error: appUserError } = await supabase
      .from("app_user")
      .select("id")
      .eq("auth_provider_id", user.id)
      .maybeSingle();

    if (appUserError || !appUser) {
      return {
        success: false,
        error: "We couldn't find your account. Please try signing in again.",
      };
    }
    applicantUserId = appUser.id as string;
  }

  // Duplicate check -- by account when signed in, otherwise by the email
  // just typed into the form (case-insensitive), since that's the only
  // identity an anonymous submission has.
  const { data: existing } = applicantUserId
    ? await supabase
        .from("application")
        .select("id")
        .eq("applicant_user_id", applicantUserId)
        .maybeSingle()
    : await supabase
        .from("application")
        .select("id")
        .ilike("email", input.email.trim())
        .maybeSingle();

  if (existing) {
    return { success: false, error: "You've already submitted an application." };
  }

  // Server-side validation -- the client form has its own required-field
  // checks, but those are trivially bypassable, so re-check here against
  // what the application table actually requires (NOT NULL columns).
  const required: [string, string][] = [
    ["full name", input.fullName],
    ["email", input.email],
    ["phone or WhatsApp", input.phoneOrWhatsapp],
    ["city and country", input.cityCountry],
    ["category", input.intendedCategory],
    ["work modality", input.workModality],
    ['"what you do"', input.expertiseNarrative],
    ['"failed infrastructure" answer', input.infrastructureNarrative],
    ["reference name", input.referenceName],
    ["reference relationship", input.referenceRelationship],
    ["reference contact method", input.referenceContactMethod],
    ["reference contact value", input.referenceContactValue],
  ];
  for (const [label, value] of required) {
    if (!value || value.trim().length === 0) {
      return { success: false, error: `Missing required field: ${label}.` };
    }
  }
  if (input.affiliations.length === 0) {
    return { success: false, error: "Add at least one affiliation." };
  }
  if (input.intendedCategory === "other" && !input.intendedCategoryOther.trim()) {
    return { success: false, error: 'Describe your category since you selected "other".' };
  }

  // Best-effort: an anonymous submission has no session to look up an
  // "About You" prospect_signup row from client-side, so try the same
  // lookup here, server-side, by the email they just gave us -- keeps
  // that linkage from silently disappearing just because there was no
  // session at submit time.
  let prospectSignupId = input.prospectSignupId;
  if (!prospectSignupId) {
    try {
      const { data: prospectSignup } = await supabase
        .from("prospect_signup")
        .select("id")
        .ilike("email", input.email.trim())
        .maybeSingle();
      if (prospectSignup) prospectSignupId = prospectSignup.id as string;
    } catch {
      // best-effort only -- ignore any failure here
    }
  }

  const { error: insertError } = await supabase.from("application").insert({
    applicant_user_id: applicantUserId,
    prospect_signup_id: prospectSignupId,
    full_name: input.fullName.trim(),
    email: input.email.trim(),
    phone_or_whatsapp: input.phoneOrWhatsapp.trim(),
    city_country: input.cityCountry.trim(),
    affiliations: input.affiliations,
    external_links: input.externalLinks,
    intended_category: input.intendedCategory,
    intended_category_other:
      input.intendedCategory === "other" ? input.intendedCategoryOther.trim() : null,
    work_modality: input.workModality,
    infrastructure_narrative: input.infrastructureNarrative.trim(),
    expertise_narrative: input.expertiseNarrative.trim(),
    work_samples: input.workSamples.filter(Boolean).map((url) => ({ url })),
    work_samples_explanation: input.workSamplesExplanation.trim() || null,
    reference_name: input.referenceName.trim(),
    reference_relationship: input.referenceRelationship.trim(),
    reference_contact_method: input.referenceContactMethod,
    reference_contact_value: input.referenceContactValue.trim(),
    reference_whatsapp_available:
      input.referenceContactMethod === "phone" ? input.referenceWhatsappAvailable : null,
    reference_may_contact: input.referenceMayContact,
    additional_notes: input.additionalNotes.trim() || null,
    referral_source: input.referralSource.trim() || null,
  });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // Best-effort confirmation email -- gives the applicant a copy of
  // everything they just told us. Never blocks or fails the submission
  // itself: a missing RESEND_API_KEY, a Resend outage, or any other
  // send failure just means no email went out, not a broken apply flow.
  try {
    await sendApplicationConfirmationEmail({
      fullName: input.fullName.trim(),
      email: input.email.trim(),
      phoneOrWhatsapp: input.phoneOrWhatsapp.trim(),
      cityCountry: input.cityCountry.trim(),
      affiliations: input.affiliations,
      headshotUrl: input.headshotUrl.trim(),
      intendedCategory: input.intendedCategory,
      intendedCategoryOther:
        input.intendedCategory === "other" ? input.intendedCategoryOther.trim() : "",
      workModality: input.workModality,
      infrastructureNarrative: input.infrastructureNarrative.trim(),
      expertiseNarrative: input.expertiseNarrative.trim(),
      externalLinks: input.externalLinks,
      workSamples: input.workSamples.filter(Boolean),
      workSamplesExplanation: input.workSamplesExplanation.trim(),
      referenceName: input.referenceName.trim(),
      referenceRelationship: input.referenceRelationship.trim(),
      referenceContactMethod: input.referenceContactMethod,
      referenceContactValue: input.referenceContactValue.trim(),
      referenceWhatsappAvailable:
        input.referenceContactMethod === "phone" ? input.referenceWhatsappAvailable : false,
      referenceMayContact: input.referenceMayContact,
      additionalNotes: input.additionalNotes.trim(),
      referralSource: input.referralSource.trim(),
    });
  } catch {
    // best-effort only -- ignore any failure here
  }

  // Keep app_user in sync with what they just told us (name, headshot),
  // since those live at the person level rather than per-application --
  // only relevant if they already had an account at submit time.
  if (applicantUserId) {
    await supabase
      .from("app_user")
      .update({
        full_name: input.fullName.trim(),
        headshot_url: input.headshotUrl.trim() || null,
      })
      .eq("id", applicantUserId);
  }

  revalidatePath("/apply");
  return { success: true };
}
