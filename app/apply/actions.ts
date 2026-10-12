// DESTINATION: app/apply/actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { sendApplicationConfirmationEmail } from "@/lib/email";

export interface SubmitApplicationInput {
  fullName: string;
  email: string;
  contactMethod: string;
  contactValue: string;
  whatsappAvailable: boolean;
  cityCountry: string;
  affiliations: string[];
  headshotUrl: string;
  intendedFunction: string;
  intendedFunctionOther: string;
  experienceAreas: string[];
  workModality: string;
  infrastructureNarrative: string;
  expertiseNarrative: string;
  fullBio: string;
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
  // "Paid work" questions -- added 2026-09-30.
  priorPaidWork: string;
  sector: string[];
  sectorOther: string;
  deliverables: string;
  rateType: string;
  rateAmount: string;
  rateCurrency: string;
  rateCurrencyOther: string;
  rateRelativeToMarket: string;
  rateScope: string;
  capacity: string;
  prospectSignupId: string | null;
  // Set when this submission continues an existing page-1 draft (see
  // saveApplicationDraft below) -- lets submitApplication update that
  // same row instead of inserting a second one.
  draftId: string | null;
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
  expertiseNarrative: string;
  infrastructureNarrative: string;
}

export interface SaveDraftInput {
  // The id returned from a prior saveApplicationDraft call this session,
  // if any -- lets repeat calls (e.g. going back to page 1, editing, and
  // hitting "continue" again) update the same row instead of creating a
  // new draft every time. When null, the lookup below falls back to
  // matching by account/email, same as submitApplication's duplicate
  // check.
  draftId: string | null;
  fullName: string;
  email: string;
  cityCountry: string;
  affiliations: string[];
  headshotUrl: string;
  intendedFunction: string;
  intendedFunctionOther: string;
  experienceAreas: string[];
  workModality: string;
  infrastructureNarrative: string;
  expertiseNarrative: string;
  fullBio: string;
  prospectSignupId: string | null;
}

export type SaveDraftResult =
  | { success: true; draftId: string }
  | { success: false; error: string };

/**
 * Saves (inserts or updates) a "draft" application row holding just the
 * page-1 answers -- fired from the page-1 "continue" button, so an
 * applicant who fills out page 1 and then abandons before finishing page
 * 2 still leaves Nzonzi a usable partial record instead of nothing at
 * all. submitApplication (below) finds and finishes this same row at
 * final submit, rather than inserting a second one.
 *
 * Requires the matching DB migration: a "draft" application_status
 * value, the page-2 NOT NULL constraints loosened, and an UPDATE policy
 * letting the applicant (anon or authenticated) update their own draft
 * row -- see the SQL delivered alongside this change.
 */
export async function saveApplicationDraft(input: SaveDraftInput): Promise<SaveDraftResult> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let applicantUserId: string | null = null;
  if (user) {
    const { data: appUser } = await supabase
      .from("app_user")
      .select("id")
      .eq("auth_provider_id", user.id)
      .maybeSingle();
    if (appUser) applicantUserId = appUser.id as string;
  }

  // Mirrors the page-1 `required` fields -- this only ever fires from the
  // page-1 "continue" button, once native browser validation on those
  // same fields has already passed, so these checks are a server-side
  // backstop rather than the primary gate.
  const required: [string, string][] = [
    ["full name", input.fullName],
    ["email", input.email],
    ["city and country", input.cityCountry],
    ["industry", input.intendedFunction],
    ["delivery", input.workModality],
    ['"what you do"', input.expertiseNarrative],
    ['"failed infrastructure" answer', input.infrastructureNarrative],
    ["bio", input.fullBio],
  ];
  for (const [label, value] of required) {
    if (!value || value.trim().length === 0) {
      return { success: false, error: `Missing required field: ${label}.` };
    }
  }
  if (input.intendedFunction === "other" && !input.intendedFunctionOther.trim()) {
    return { success: false, error: 'Describe your industry since you selected "other".' };
  }

  const row = {
    applicant_user_id: applicantUserId,
    prospect_signup_id: input.prospectSignupId,
    full_name: input.fullName.trim(),
    email: input.email.trim(),
    headshot_url: input.headshotUrl.trim() || null,
    city_country: input.cityCountry.trim(),
    affiliations: input.affiliations,
    intended_function: input.intendedFunction,
    intended_function_other:
      input.intendedFunction === "other" ? input.intendedFunctionOther.trim() : null,
    experience_areas: input.experienceAreas.length > 0 ? input.experienceAreas : null,
    work_modality: input.workModality,
    infrastructure_narrative: input.infrastructureNarrative.trim(),
    expertise_narrative: input.expertiseNarrative.trim(),
    full_bio: input.fullBio.trim(),
    status: "draft" as const,
  };

  // Resume an existing draft by id if the client already has one from
  // earlier this session; otherwise look it up the same way
  // submitApplication's duplicate check does (by account, or by email for
  // an anonymous visitor). Never touches a row that isn't still a draft --
  // an already-submitted application is left alone either way.
  let existingDraftId = input.draftId;
  if (!existingDraftId) {
    const { data: existing } = applicantUserId
      ? await supabase
          .from("application")
          .select("id")
          .eq("applicant_user_id", applicantUserId)
          .eq("status", "draft")
          .maybeSingle()
      : await supabase
          .from("application")
          .select("id")
          .ilike("email", input.email.trim())
          .eq("status", "draft")
          .maybeSingle();
    if (existing) existingDraftId = existing.id as string;
  }

  if (existingDraftId) {
    const { error } = await supabase
      .from("application")
      .update(row)
      .eq("id", existingDraftId)
      .eq("status", "draft");
    if (error) return { success: false, error: error.message };
    return { success: true, draftId: existingDraftId };
  }

  const { data: inserted, error } = await supabase
    .from("application")
    .insert(row)
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, draftId: inserted.id as string };
}

/**
 * Looks up a "About You" prospect_signup row by email, for anonymous
 * /apply visitors who already filled that out elsewhere and shouldn't
 * have to retype their name, city, country, affiliation, or category --
 * or, for anyone who filled out the landing page back when it still
 * asked the two narrative questions (since removed there), their prior
 * "what do you do" / "failed infrastructure" answers either.
 * Signed-in visitors don't need this -- page.tsx already does the
 * equivalent lookup server-side, keyed off their verified account email.
 *
 * Goes through a SECURITY DEFINER RPC (get_prospect_signup_prefill)
 * rather than a direct table select: prospect_signup isn't otherwise
 * readable by anonymous requests, and it shouldn't become broadly
 * readable just to support this -- the RPC only ever returns one
 * narrowly-scoped row for the exact email passed in, nothing you could
 * use to browse the table.
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
      expertiseNarrative: (row.what_you_do as string) ?? "",
      infrastructureNarrative: (row.failed_infrastructure_response as string) ?? "",
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
  // identity an anonymous submission has. A row still in "draft" isn't a
  // duplicate -- it's this same application's own page-1 save, and gets
  // finished below instead of blocking the submission.
  const { data: existing } = applicantUserId
    ? await supabase
        .from("application")
        .select("id, status")
        .eq("applicant_user_id", applicantUserId)
        .maybeSingle()
    : await supabase
        .from("application")
        .select("id, status")
        .ilike("email", input.email.trim())
        .maybeSingle();

  if (existing && existing.status !== "draft") {
    return { success: false, error: "You've already submitted an application." };
  }

  // Prefer the client-supplied draftId (set once saveApplicationDraft
  // first returns one); fall back to whatever the duplicate check above
  // just found, in case the client lost track of it (e.g. a page reload
  // between pages 1 and 2).
  const draftId =
    input.draftId ?? (existing && existing.status === "draft" ? (existing.id as string) : null);

  // Server-side validation -- the client form has its own required-field
  // checks, but those are trivially bypassable, so re-check here against
  // what the application table actually requires (NOT NULL columns).
  const required: [string, string][] = [
    ["full name", input.fullName],
    ["email", input.email],
    ["contact method", input.contactMethod],
    ["contact info", input.contactValue],
    ["city and country", input.cityCountry],
    ["function", input.intendedFunction],
    ["work modality", input.workModality],
    ['"what you do"', input.expertiseNarrative],
    ['"failed infrastructure" answer', input.infrastructureNarrative],
    ["bio", input.fullBio],
    ["reference name", input.referenceName],
    ["reference relationship", input.referenceRelationship],
    ["reference contact method", input.referenceContactMethod],
    ["reference contact value", input.referenceContactValue],
    ["deliverables", input.deliverables],
    ["rate", input.rateType],
    ["capacity", input.capacity],
    ["prior paid work", input.priorPaidWork],
  ];
  for (const [label, value] of required) {
    if (!value || value.trim().length === 0) {
      return { success: false, error: `Missing required field: ${label}.` };
    }
  }
  // Affiliations is optional (2026-09-30 -- previously required); no
  // length check here on purpose.
  if (input.intendedFunction === "other" && !input.intendedFunctionOther.trim()) {
    return { success: false, error: 'Describe your function since you selected "other".' };
  }
  if (input.sector.length === 0) {
    return { success: false, error: "Select at least one industry." };
  }
  if (input.sector.includes("other") && !input.sectorOther.trim()) {
    return { success: false, error: 'Describe the industry since you selected "other".' };
  }
  if (input.rateType === "amount") {
    if (!input.rateAmount.trim() || Number(input.rateAmount) <= 0) {
      return { success: false, error: "Enter a valid amount for the rate question." };
    }
    if (!input.rateCurrency.trim()) {
      return { success: false, error: "Select a currency for the rate you gave." };
    }
    if (input.rateCurrency === "other" && !input.rateCurrencyOther.trim()) {
      return { success: false, error: 'Name the currency since you selected "other".' };
    }
    if (!input.rateRelativeToMarket.trim()) {
      return { success: false, error: "Select whether that payment was typical for your market." };
    }
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

  const row = {
    applicant_user_id: applicantUserId,
    prospect_signup_id: prospectSignupId,
    full_name: input.fullName.trim(),
    email: input.email.trim(),
    headshot_url: input.headshotUrl.trim() || null,
    contact_method: input.contactMethod,
    contact_value: input.contactValue.trim(),
    whatsapp_available: input.contactMethod === "phone" ? input.whatsappAvailable : null,
    city_country: input.cityCountry.trim(),
    affiliations: input.affiliations,
    external_links: input.externalLinks,
    intended_function: input.intendedFunction,
    intended_function_other:
      input.intendedFunction === "other" ? input.intendedFunctionOther.trim() : null,
    experience_areas: input.experienceAreas.length > 0 ? input.experienceAreas : null,
    work_modality: input.workModality,
    infrastructure_narrative: input.infrastructureNarrative.trim(),
    expertise_narrative: input.expertiseNarrative.trim(),
    full_bio: input.fullBio.trim(),
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
    prior_paid_work: input.priorPaidWork,
    sector: input.sector,
    sector_other: input.sector.includes("other") ? input.sectorOther.trim() : null,
    deliverables: input.deliverables.trim(),
    rate_type: input.rateType,
    rate_amount: input.rateType === "amount" ? Number(input.rateAmount) : null,
    rate_currency:
      input.rateType === "amount"
        ? input.rateCurrency === "other"
          ? input.rateCurrencyOther.trim()
          : input.rateCurrency
        : null,
    rate_relative_to_market: input.rateType === "amount" ? input.rateRelativeToMarket : null,
    rate_scope: input.rateScope.trim() || null,
    capacity: input.capacity,
    status: "applied" as const,
  };

  // Finish an existing page-1 draft in place if there is one, so this
  // submission updates that same row (keeping its original created_at)
  // instead of leaving the draft behind and inserting a second row.
  const { error: writeError } = draftId
    ? await supabase.from("application").update(row).eq("id", draftId).eq("status", "draft")
    : await supabase.from("application").insert(row);

  if (writeError) {
    return { success: false, error: writeError.message };
  }

  // Best-effort confirmation email -- gives the applicant a copy of
  // everything they just told us. Never blocks or fails the submission
  // itself: a missing RESEND_API_KEY, a Resend outage, or any other
  // send failure just means no email went out, not a broken apply flow.
  try {
    await sendApplicationConfirmationEmail({
      fullName: input.fullName.trim(),
      email: input.email.trim(),
      contactMethod: input.contactMethod,
      contactValue: input.contactValue.trim(),
      whatsappAvailable: input.contactMethod === "phone" ? input.whatsappAvailable : false,
      cityCountry: input.cityCountry.trim(),
      affiliations: input.affiliations,
      headshotUrl: input.headshotUrl.trim(),
      intendedFunction: input.intendedFunction,
      intendedFunctionOther:
        input.intendedFunction === "other" ? input.intendedFunctionOther.trim() : "",
      experienceAreas: input.experienceAreas,
      workModality: input.workModality,
      infrastructureNarrative: input.infrastructureNarrative.trim(),
      expertiseNarrative: input.expertiseNarrative.trim(),
      fullBio: input.fullBio.trim(),
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
      priorPaidWork: input.priorPaidWork,
      sector: input.sector,
      sectorOther: input.sector.includes("other") ? input.sectorOther.trim() : "",
      deliverables: input.deliverables.trim(),
      rateType: input.rateType,
      rateAmount: input.rateAmount.trim(),
      rateCurrency: input.rateCurrency,
      rateCurrencyOther: input.rateType === "amount" && input.rateCurrency === "other" ? input.rateCurrencyOther.trim() : "",
      rateRelativeToMarket: input.rateType === "amount" ? input.rateRelativeToMarket : "",
      rateScope: input.rateScope.trim(),
      capacity: input.capacity,
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
