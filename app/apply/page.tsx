// DESTINATION: app/apply/page.tsx
// (new folder -- create app/apply/ and save this as page.tsx inside it)

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { BROWN } from "@/lib/colors";
import ApplicationFormClient from "./ApplicationFormClient";
import ApplicationSummary, { type ApplicationSummaryData } from "./ApplicationSummary";

const OCHRE = "#C2561A";
const OFFWHITE = "#F0F0F0";

const APPLICATION_SUMMARY_COLUMNS =
  "status, full_name, email, contact_method, contact_value, whatsapp_available, city_country, affiliations, external_links, intended_category, intended_category_other, work_modality, infrastructure_narrative, expertise_narrative, work_samples, work_samples_explanation, reference_name, reference_relationship, reference_contact_method, reference_contact_value, reference_whatsapp_available, reference_may_contact, additional_notes, referral_source";

type ExistingApplicationRow = {
  status: string;
  full_name: string | null;
  email: string | null;
  contact_method: "email" | "phone" | null;
  contact_value: string | null;
  whatsapp_available: boolean | null;
  city_country: string | null;
  affiliations: string[] | null;
  external_links: string[] | null;
  intended_category: string | null;
  intended_category_other: string | null;
  work_modality: string | null;
  infrastructure_narrative: string | null;
  expertise_narrative: string | null;
  work_samples: { url?: string }[] | null;
  work_samples_explanation: string | null;
  reference_name: string | null;
  reference_relationship: string | null;
  reference_contact_method: string | null;
  reference_contact_value: string | null;
  reference_whatsapp_available: boolean | null;
  reference_may_contact: boolean | null;
  additional_notes: string | null;
  referral_source: string | null;
};

/**
 * Signing in is no longer required just to apply -- a magic link is only
 * needed to come BACK and review what was already submitted. So:
 *  - anyone, signed in or not -> gets the real form (no redirect to
 *    /login). Signed-out visitors get a blank form; signed-in ones get
 *    it prefilled from app_user and (best-effort) an existing
 *    prospect_signup row, same as before.
 *  - if they already have a submitted application -- found either via
 *    their signed-in account or, for someone who applied anonymously and
 *    is now revisiting after clicking a magic link, by matching the
 *    verified email on their session -- show the full, read-only recap
 *    (ApplicationSummary) instead of the form.
 *
 * Requires the matching DB migration (applicant_user_id nullable, plus
 * RLS policies letting an anonymous insert and an authenticated
 * email-matched select) -- see the SQL delivered alongside this change.
 */
export default async function ApplyPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed out -- no account to look anything up against. Just render a
  // blank, unprefilled form; there's nothing to gate on anymore.
  if (!user) {
    return (
      <ApplicationFormClient
        prefill={{
          firstName: "",
          lastName: "",
          email: "",
          headshotUrl: "",
          city: "",
          country: "",
          affiliations: [],
          intendedCategory: null,
          prospectSignupId: null,
        }}
      />
    );
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("app_user")
    .select("id, full_name, email, headshot_url")
    .eq("auth_provider_id", user.id)
    .maybeSingle();

  if (appUserError || !appUser) {
    // Shouldn't happen now that the on_auth_user_created trigger creates
    // this row automatically on sign-in -- if it does, something's wrong
    // with the trigger or the grants it depends on.
    return (
      <StatusMessage
        eyebrow="error"
        heading="we couldn't load your account."
        body="Try refreshing the page. If this keeps happening, something's wrong on our end -- reach out and we'll sort it out."
      />
    );
  }

  // Look up an existing application two ways: first by account (the
  // normal case for someone who was signed in when they applied), then,
  // if that comes up empty, by their verified email -- this is what
  // catches someone who applied anonymously (no applicant_user_id set)
  // and is now revisiting after clicking a magic link.
  let existingApplication: ExistingApplicationRow | null = null;

  const { data: byAccount } = await supabase
    .from("application")
    .select(APPLICATION_SUMMARY_COLUMNS)
    .eq("applicant_user_id", appUser.id)
    .maybeSingle();
  existingApplication = byAccount as ExistingApplicationRow | null;

  if (!existingApplication) {
    const { data: byEmail } = await supabase
      .from("application")
      .select(APPLICATION_SUMMARY_COLUMNS)
      .ilike("email", appUser.email)
      .maybeSingle();
    existingApplication = byEmail as ExistingApplicationRow | null;
  }

  if (existingApplication) {
    const firstName = existingApplication.full_name?.trim().split(/\s+/)[0] ?? "";
    const summaryData: ApplicationSummaryData = {
      fullName: existingApplication.full_name ?? "",
      email: existingApplication.email ?? "",
      contactMethod: existingApplication.contact_method ?? "",
      contactValue: existingApplication.contact_value ?? "",
      whatsappAvailable: Boolean(existingApplication.whatsapp_available),
      cityCountry: existingApplication.city_country ?? "",
      affiliations: existingApplication.affiliations ?? [],
      headshotUrl: appUser.headshot_url ?? "",
      intendedCategory: existingApplication.intended_category ?? "",
      intendedCategoryOther: existingApplication.intended_category_other ?? "",
      workModality: existingApplication.work_modality ?? "",
      expertiseNarrative: existingApplication.expertise_narrative ?? "",
      infrastructureNarrative: existingApplication.infrastructure_narrative ?? "",
      externalLinks: existingApplication.external_links ?? [],
      workSamples: (existingApplication.work_samples ?? [])
        .map((sample) => sample?.url ?? "")
        .filter(Boolean),
      workSamplesExplanation: existingApplication.work_samples_explanation ?? "",
      referenceName: existingApplication.reference_name ?? "",
      referenceRelationship: existingApplication.reference_relationship ?? "",
      referenceContactMethod: existingApplication.reference_contact_method ?? "",
      referenceContactValue: existingApplication.reference_contact_value ?? "",
      referenceWhatsappAvailable: Boolean(existingApplication.reference_whatsapp_available),
      referenceMayContact: Boolean(existingApplication.reference_may_contact),
      additionalNotes: existingApplication.additional_notes ?? "",
      referralSource: existingApplication.referral_source ?? "",
    };

    return (
      <ApplicationSummary firstName={firstName} status={existingApplication.status} data={summaryData} />
    );
  }

  // Best-effort prefill from an existing prospect_signup row (the "About
  // You" page), per the earlier decision that Application shouldn't ask
  // cold what About You already collected. Column names here match the
  // project doc's description of prospect_signup's live schema, but that
  // table's exact schema hasn't been re-verified in this pass the way
  // application/listing/app_user were -- if a column name here is wrong,
  // or RLS/grants block this select, it silently no-ops rather than
  // breaking the page. Worth double-checking once you're able to test
  // this.
  let prefillCategory: string | null = null;
  let prospectSignupId: string | null = null;
  let prefillFirstName = "";
  let prefillLastName = "";
  let prefillCity = "";
  let prefillCountry = "";
  let prefillAffiliations: string[] = [];

  try {
    const { data: prospectSignup } = await supabase
      .from("prospect_signup")
      .select("id, category, first_name, last_name, city, country, affiliation")
      .eq("email", appUser.email)
      .maybeSingle();
    if (prospectSignup) {
      prospectSignupId = prospectSignup.id as string;
      prefillCategory = (prospectSignup.category as string) ?? null;
      prefillFirstName = (prospectSignup.first_name as string) ?? "";
      prefillLastName = (prospectSignup.last_name as string) ?? "";
      prefillCity = (prospectSignup.city as string) ?? "";
      prefillCountry = (prospectSignup.country as string) ?? "";
      if (prospectSignup.affiliation) {
        prefillAffiliations = [prospectSignup.affiliation as string];
      }
    }
  } catch {
    // best-effort only -- ignore any failure here
  }

  // Fall back to app_user.full_name only if About You didn't give us a
  // name -- app_user.full_name may just be the sign-in trigger's
  // email-derived placeholder rather than something they actually typed.
  if (!prefillFirstName && !prefillLastName && appUser.full_name) {
    const parts = appUser.full_name.trim().split(/\s+/);
    prefillFirstName = parts[0] ?? "";
    prefillLastName = parts.slice(1).join(" ");
  }

  return (
    <ApplicationFormClient
      prefill={{
        firstName: prefillFirstName,
        lastName: prefillLastName,
        email: appUser.email,
        headshotUrl: appUser.headshot_url ?? "",
        city: prefillCity,
        country: prefillCountry,
        affiliations: prefillAffiliations,
        intendedCategory: prefillCategory,
        prospectSignupId,
      }}
    />
  );
}

function StatusMessage({
  eyebrow,
  heading,
  body,
}: {
  eyebrow: string;
  heading: string;
  body: string;
}) {
  return (
    <div style={{ background: BROWN, minHeight: "100vh" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "72px 48px 80px", textAlign: "right" }}>
        <span style={{ fontSize: 12.5, fontWeight: 500, letterSpacing: "0.02em", color: OCHRE }}>
          {eyebrow}
        </span>
        <h2
          style={{
            margin: "14px 0 14px",
            fontSize: 34,
            fontWeight: 300,
            letterSpacing: "-0.035em",
            lineHeight: 1.12,
            color: OFFWHITE,
            textTransform: "lowercase",
          }}
        >
          {heading}
        </h2>
        <p
          style={{
            fontSize: 16,
            fontWeight: 300,
            lineHeight: 1.55,
            margin: "0 0 0 auto",
            maxWidth: 420,
            color: "rgba(240,240,240,0.75)",
          }}
        >
          {body}
        </p>
      </div>
    </div>
  );
}
