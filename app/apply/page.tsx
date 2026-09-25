// DESTINATION: app/apply/page.tsx
// (new folder -- create app/apply/ and save this as page.tsx inside it)

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { BROWN } from "@/lib/colors";
import ApplicationFormClient from "./ApplicationFormClient";
import ApplicationSummary, { type ApplicationSummaryData } from "./ApplicationSummary";
import SessionControls from "@/app/components/SessionControls";

const OCHRE = "#C2561A";
const OFFWHITE = "#F0F0F0";

/**
 * Gated server-side, same pattern as /admin/review:
 *  - signed out -> /login?next=/apply
 *  - signed in but already has a submitted application -> a full,
 *    read-only recap of what they submitted (ApplicationSummary), with
 *    their name in the heading, rather than a bare "applied" line --
 *    every visit re-confirms their own data instead of a generic status.
 *  - otherwise -> the real form, prefilled from app_user and (best-effort)
 *    from an existing prospect_signup row so nobody re-answers what they
 *    already told us on About You -- prefilled fields stay editable on
 *    the form itself, they're just not blank by default.
 */
export default async function ApplyPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/apply");
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

  const { data: existingApplication } = await supabase
    .from("application")
    .select(
      "status, full_name, email, phone_or_whatsapp, city_country, affiliations, external_links, intended_category, intended_category_other, work_modality, infrastructure_narrative, expertise_narrative, work_samples, work_samples_explanation, reference_name, reference_relationship, reference_contact_method, reference_contact_value, reference_whatsapp_available, reference_may_contact, additional_notes, referral_source"
    )
    .eq("applicant_user_id", appUser.id)
    .maybeSingle();

  if (existingApplication) {
    const firstName = existingApplication.full_name?.trim().split(/\s+/)[0] ?? "";
    const summaryData: ApplicationSummaryData = {
      fullName: existingApplication.full_name ?? "",
      email: existingApplication.email ?? "",
      phoneOrWhatsapp: existingApplication.phone_or_whatsapp ?? "",
      cityCountry: existingApplication.city_country ?? "",
      affiliations: existingApplication.affiliations ?? [],
      headshotUrl: appUser.headshot_url ?? "",
      intendedCategory: existingApplication.intended_category ?? "",
      intendedCategoryOther: existingApplication.intended_category_other ?? "",
      workModality: existingApplication.work_modality ?? "",
      expertiseNarrative: existingApplication.expertise_narrative ?? "",
      infrastructureNarrative: existingApplication.infrastructure_narrative ?? "",
      externalLinks: existingApplication.external_links ?? [],
      workSamples: (existingApplication.work_samples ?? []).map(
        (sample: { url?: string }) => sample?.url ?? ""
      ).filter(Boolean),
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
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <SessionControls />
        </div>
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
