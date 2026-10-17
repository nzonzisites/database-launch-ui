// DESTINATION: app/apply/actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { sendApplicationConfirmationEmail } from "@/lib/email";

// A place someone lives -- see ResidenceEntry in ApplicationFormClient.tsx.
export interface ResidenceInput {
  city: string;
  country: string;
  isPrimary: boolean;
}

export interface SubmitApplicationInput {
  fullName: string;
  email: string;
  contactMethod: string;
  contactValue: string;
  whatsappAvailable: boolean;
  // Derived (client-side) from whichever entry in `residences` is
  // primary -- kept as its own column because everything downstream of
  // submission (public listing, admin review table, confirmation email)
  // only ever wants one place, not the full list.
  cityCountry: string;
  residences: ResidenceInput[];
  countryOfOrigin: string;
  affiliations: string[];
  headshotUrl: string;
  intendedFunction: string;
  intendedFunctionOther: string;
  experienceAreas: string[];
  // What type of work they're open to (Virtual / Local / Willing to
  // Travel) -- genuinely multi-select since 2026-10-17, so this is an
  // array even though it's still asked as a single "Delivery" question.
  workModality: string[];
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

// Autosave sends the WHOLE form (both pages) on every debounced save, not
// just page 1 -- once a draft exists, wandering off midway through page 2
// should leave those answers saved too, not just whatever page 1 had.
// Same shape as submitApplication's input; the two differ only in what
// they validate and what status they write.
export type SaveDraftInput = SubmitApplicationInput;

export type SaveDraftResult =
  | { success: true; draftId: string; resumeCode: string }
  | { success: false; error: string };

// Avoids 0/O/1/I/L -- easy to misread, especially handwritten or over the
// phone. 8 chars from this 32-char alphabet is ~40 bits, plenty for a
// low-stakes "don't lose your draft" code rather than an auth credential.
const RESUME_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateResumeCode(length = 8): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += RESUME_CODE_ALPHABET[Math.floor(Math.random() * RESUME_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Saves (inserts or updates) a "draft" application row -- fired both from
 * the page-1 "continue" button and from the form's autosave timer (a few
 * seconds after any change, on either page), so an applicant who
 * abandons at any point still leaves Nzonzi a usable partial record
 * instead of nothing at all. submitApplication (below) finds and
 * finishes this same row at final submit, rather than inserting a
 * second one.
 *
 * Deliberately does NOT validate completeness the way submitApplication
 * does -- autosave has to accept a row that's only half-filled-in, often
 * genuinely incomplete (an enum field not chosen yet, a number field not
 * typed yet), so those are coalesced to null below rather than rejected.
 * The one thing still required is an email, since that's what an
 * anonymous draft is identified and matched by; the client doesn't
 * attempt any save, autosave or "continue", before one is typed.
 *
 * A brand-new draft gets a short "continue your application" code
 * (resume_code), handed back to the client to show the applicant --
 * resumeApplicationDraft (below) is how they use it to come back later.
 * An existing draft keeps its original code rather than getting a new
 * one each time this fires again.
 *
 * Requires the matching DB migrations: a "draft" application_status
 * value, the page-1 and page-2 NOT NULL constraints loosened (email
 * stays required), an UPDATE policy letting the applicant (anon or
 * authenticated) update their own draft row, and the resume_code column
 * + lookup function -- see the SQL delivered alongside this change.
 */
export async function saveApplicationDraft(input: SaveDraftInput): Promise<SaveDraftResult> {
  if (!input.email.trim()) {
    return { success: false, error: "Enter an email before saving." };
  }

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

  const row = {
    applicant_user_id: applicantUserId,
    prospect_signup_id: input.prospectSignupId,
    full_name: input.fullName.trim() || null,
    email: input.email.trim(),
    headshot_url: input.headshotUrl.trim() || null,
    contact_method: input.contactMethod || null,
    contact_value: input.contactValue.trim() || null,
    whatsapp_available: input.contactMethod === "phone" ? input.whatsappAvailable : null,
    city_country: input.cityCountry.trim() || null,
    residences: input.residences.length > 0 ? input.residences.map((r) => ({
      city: r.city.trim(),
      country: r.country.trim(),
      is_primary: r.isPrimary,
    })) : null,
    country_of_origin: input.countryOfOrigin.trim() || null,
    affiliations: input.affiliations,
    external_links: input.externalLinks,
    // intended_function is a strict enum column -- an empty string isn't
    // a valid value the way it is for a plain text column, so this has
    // to be null, not "", when nothing's chosen yet.
    intended_function: input.intendedFunction || null,
    intended_function_other:
      input.intendedFunction === "other" ? input.intendedFunctionOther.trim() : null,
    experience_areas: input.experienceAreas.length > 0 ? input.experienceAreas : null,
    work_modality: input.workModality.length > 0 ? input.workModality : null,
    infrastructure_narrative: input.infrastructureNarrative.trim() || null,
    expertise_narrative: input.expertiseNarrative.trim() || null,
    full_bio: input.fullBio.trim() || null,
    work_samples: input.workSamples.filter(Boolean).map((url) => ({ url })),
    work_samples_explanation: input.workSamplesExplanation.trim() || null,
    reference_name: input.referenceName.trim() || null,
    reference_relationship: input.referenceRelationship.trim() || null,
    reference_contact_method: input.referenceContactMethod || null,
    reference_contact_value: input.referenceContactValue.trim() || null,
    reference_whatsapp_available:
      input.referenceContactMethod === "phone" ? input.referenceWhatsappAvailable : null,
    reference_may_contact: input.referenceMayContact,
    additional_notes: input.additionalNotes.trim() || null,
    referral_source: input.referralSource.trim() || null,
    prior_paid_work: input.priorPaidWork || null,
    sector: input.sector.length > 0 ? input.sector : null,
    sector_other: input.sector.includes("other") ? input.sectorOther.trim() : null,
    deliverables: input.deliverables.trim() || null,
    rate_type: input.rateType || null,
    // rate_amount is numeric -- Number("") is 0, not "not answered yet",
    // so this only converts once something's actually been typed.
    rate_amount:
      input.rateType === "amount" && input.rateAmount.trim() ? Number(input.rateAmount) : null,
    rate_currency:
      input.rateType === "amount"
        ? input.rateCurrency === "other"
          ? input.rateCurrencyOther.trim()
          : input.rateCurrency || null
        : null,
    rate_relative_to_market: input.rateType === "amount" ? input.rateRelativeToMarket || null : null,
    rate_scope: input.rateScope.trim() || null,
    capacity: input.capacity || null,
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
    const { data: updated, error } = await supabase
      .from("application")
      .update(row)
      .eq("id", existingDraftId)
      .eq("status", "draft")
      .select("id, resume_code")
      .single();
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      draftId: updated.id as string,
      resumeCode: updated.resume_code as string,
    };
  }

  // New draft -- generate a code, retrying with a fresh one only on an
  // actual collision (unique_violation, Postgres code 23505); anything
  // else is a real error, not worth retrying.
  let lastError: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: inserted, error } = await supabase
      .from("application")
      .insert({ ...row, resume_code: generateResumeCode() })
      .select("id, resume_code")
      .single();
    if (!error) {
      return {
        success: true,
        draftId: inserted.id as string,
        resumeCode: inserted.resume_code as string,
      };
    }
    lastError = error.message;
    if ((error as { code?: string }).code !== "23505") break;
  }
  return { success: false, error: lastError ?? "Could not save your draft. Please try again." };
}

export type ResumeDraftResult =
  | {
      success: true;
      draftId: string;
      resumeCode: string;
      firstName: string;
      lastName: string;
      email: string;
      // city/country: a same-shaped fallback for a draft saved before
      // the `residences` column existed (split from the legacy
      // city_country string, same as before) -- residences is empty in
      // that case and the client falls back to these two instead.
      city: string;
      country: string;
      residences: ResidenceInput[];
      countryOfOrigin: string;
      affiliations: string[];
      headshotUrl: string;
      intendedFunction: string;
      intendedFunctionOther: string;
      experienceAreas: string[];
      workModality: string[];
      infrastructureNarrative: string;
      expertiseNarrative: string;
      fullBio: string;
      prospectSignupId: string | null;
    }
  | { success: false; error: string };

/**
 * Looks up a draft application by its "continue your application" code,
 * and returns everything needed to repopulate page 1 of the form. Goes
 * through the get_application_draft_by_resume_code SECURITY DEFINER RPC
 * (same pattern as lookupProspectPrefill's get_prospect_signup_prefill)
 * rather than a direct select -- the code is the only thing standing
 * between a visitor and this draft, so the lookup has to return at most
 * the one row matching it, never let someone browse drafts generally.
 *
 * full_name and city_country are stored as single combined strings (see
 * the row shape in saveApplicationDraft above) -- split back into the
 * separate first/last name and city/country fields the form actually
 * uses. Imperfect for a multi-word first name or a city with a comma in
 * it, but the applicant lands back on page 1 and can fix either before
 * continuing again.
 */
export async function resumeApplicationDraft(code: string): Promise<ResumeDraftResult> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) {
    return { success: false, error: "Enter your continue code." };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_application_draft_by_resume_code", {
    p_code: trimmed,
  });
  if (error || !data || data.length === 0) {
    return { success: false, error: "We couldn't find a saved application with that code." };
  }

  const row = data[0];
  const nameParts = ((row.full_name as string) ?? "").trim().split(/\s+/).filter(Boolean);
  const cityCountryParts = ((row.city_country as string) ?? "").split(",");
  const rawResidences =
    (row.residences as { city?: string; country?: string; is_primary?: boolean }[] | null) ?? [];

  return {
    success: true,
    draftId: row.id as string,
    resumeCode: row.resume_code as string,
    firstName: nameParts[0] ?? "",
    lastName: nameParts.slice(1).join(" "),
    email: (row.email as string) ?? "",
    city: (cityCountryParts[0] ?? "").trim(),
    country: cityCountryParts.slice(1).join(",").trim(),
    residences: rawResidences.map((r) => ({
      city: r.city ?? "",
      country: r.country ?? "",
      isPrimary: Boolean(r.is_primary),
    })),
    countryOfOrigin: (row.country_of_origin as string) ?? "",
    affiliations: (row.affiliations as string[]) ?? [],
    headshotUrl: (row.headshot_url as string) ?? "",
    intendedFunction: (row.intended_function as string) ?? "",
    intendedFunctionOther: (row.intended_function_other as string) ?? "",
    experienceAreas: (row.experience_areas as string[]) ?? [],
    workModality: (row.work_modality as string[]) ?? [],
    infrastructureNarrative: (row.infrastructure_narrative as string) ?? "",
    expertiseNarrative: (row.expertise_narrative as string) ?? "",
    fullBio: (row.full_bio as string) ?? "",
    prospectSignupId: (row.prospect_signup_id as string) ?? null,
  };
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
    ['"what you do"', input.expertiseNarrative],
    ['"failed infrastructure" answer', input.infrastructureNarrative],
    ["bio", input.fullBio],
    ["reference name", input.referenceName],
    ["reference relationship", input.referenceRelationship],
    ["reference contact method", input.referenceContactMethod],
    ["reference contact value", input.referenceContactValue],
    ["deliverables", input.deliverables],
    ["rate", input.rateType],
    ["prior paid work", input.priorPaidWork],
  ];
  for (const [label, value] of required) {
    if (!value || value.trim().length === 0) {
      return { success: false, error: `Missing required field: ${label}.` };
    }
  }
  if (input.workModality.length === 0) {
    return { success: false, error: "Missing required field: delivery." };
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
    residences: input.residences.length > 0 ? input.residences.map((r) => ({
      city: r.city.trim(),
      country: r.country.trim(),
      is_primary: r.isPrimary,
    })) : null,
    country_of_origin: input.countryOfOrigin.trim() || null,
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
    capacity: input.capacity || null,
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
      residences: input.residences.map((r) => ({
        city: r.city.trim(),
        country: r.country.trim(),
        isPrimary: r.isPrimary,
      })),
      countryOfOrigin: input.countryOfOrigin.trim(),
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
