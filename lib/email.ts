// DESTINATION: lib/email.ts
//
// Sends the "we got your application" confirmation email, right after a
// successful insert in app/apply/actions.ts's submitApplication. Not
// wired into anything else yet -- if other transactional emails show up
// later (e.g. "you were selected"), this is the natural place to add
// them alongside this one, sharing the row/section helpers below.
//
// Requires RESEND_API_KEY (see .env.example). Without it, this no-ops
// and returns { success: false } -- submitApplication treats that as
// best-effort and never fails the submission itself because the email
// didn't go out.

import { Resend } from "resend";
import type { SubmitApplicationInput } from "@/app/apply/actions";
import {
  FUNCTION_OPTIONS,
  EXPERIENCE_AREA_OPTIONS,
  WORK_MODALITY_OPTIONS,
  REFERENCE_CONTACT_METHOD_OPTIONS,
  SECTOR_OPTIONS,
  RATE_TYPE_OPTIONS,
  RATE_RELATIVE_OPTIONS,
  CAPACITY_OPTIONS,
  PRIOR_PAID_WORK_OPTIONS,
  optionLabel,
} from "@/app/apply/applicationOptions";

const OCHRE = "#C2561A";
const BROWN = "#1F0E03";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Needs a domain verified in Resend (Resend dashboard -> Domains) that
// matches whatever's set here -- see the setup notes delivered alongside
// this change for exactly what to add in Resend and as an env var.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Nzonzi <noreply@nzonzi.net>";

export type ApplicationConfirmationData = Omit<SubmitApplicationInput, "prospectSignupId" | "draftId">;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function row(label: string, value?: string | null): string {
  if (!value) return "";
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #ececec;vertical-align:top;width:220px;font-size:13px;color:#6b6b6b;">${escapeHtml(label)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #ececec;font-size:15px;color:${BROWN};white-space:pre-wrap;">${escapeHtml(value)}</td>
    </tr>`;
}

function listRow(label: string, values: string[]): string {
  if (!values || values.length === 0) return "";
  return row(label, values.join("\n"));
}

function section(title: string, rowsHtml: string): string {
  if (!rowsHtml.trim()) return "";
  return `
    <h3 style="margin:32px 0 4px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${OCHRE};">${escapeHtml(title)}</h3>
    <table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>`;
}

/**
 * Renders and sends the confirmation email. Best-effort: never throws --
 * a failure just comes back as { success: false, error }, for the
 * caller to swallow (or log) without blocking the application itself.
 */
export async function sendApplicationConfirmationEmail(
  data: ApplicationConfirmationData
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return { success: false, error: "RESEND_API_KEY is not set -- confirmation email skipped." };
  }

  const firstName = data.fullName.trim().split(/\s+/)[0] || "";
  const functionLabel =
    data.intendedFunction === "other" && data.intendedFunctionOther
      ? data.intendedFunctionOther
      : optionLabel(FUNCTION_OPTIONS, data.intendedFunction);
  const experienceAreasLabel = data.experienceAreas
    .map((value) => optionLabel(EXPERIENCE_AREA_OPTIONS, value))
    .join(", ");

  const contactRows =
    row("Name", data.fullName) +
    row("Email", data.email) +
    row(data.contactMethod === "phone" ? "Number" : "Email", data.contactValue) +
    (data.contactMethod === "phone"
      ? row("Reachable on WhatsApp", data.whatsappAvailable ? "Yes" : "No")
      : "") +
    row("Location", data.cityCountry) +
    listRow("Affiliations", data.affiliations);

  const applicationRows =
    row("Industry", functionLabel) +
    row("Experience", experienceAreasLabel) +
    row("Delivery", optionLabel(WORK_MODALITY_OPTIONS, data.workModality)) +
    row("What you do", data.expertiseNarrative) +
    row("How failed or missing infrastructure guided you", data.infrastructureNarrative) +
    row("Bio", data.fullBio) +
    row("Headshot", data.headshotUrl);

  const portfolioRows =
    listRow("Professional identity", data.workSamples) +
    row("About these samples", data.workSamplesExplanation) +
    listRow("Links", data.externalLinks);

  const sectorLabel =
    data.sector
      .map((value) => (value === "other" && data.sectorOther ? data.sectorOther : optionLabel(SECTOR_OPTIONS, value)))
      .join(", ") || "";
  const rateLabel =
    data.rateType === "amount"
      ? `${data.rateAmount} ${data.rateCurrency === "other" ? data.rateCurrencyOther : data.rateCurrency}`
      : optionLabel(RATE_TYPE_OPTIONS, data.rateType);
  const rateRelativeLabel =
    data.rateType === "amount" ? optionLabel(RATE_RELATIVE_OPTIONS, data.rateRelativeToMarket) : "";

  const paidWorkRows =
    row("Been paid directly by a company before", optionLabel(PRIOR_PAID_WORK_OPTIONS, data.priorPaidWork)) +
    row("Industries paid to work in", sectorLabel) +
    row("Deliverables produced", data.deliverables) +
    row("Most recent paid engagement", rateLabel) +
    row("Scope of that payment", data.rateScope) +
    row("Relative to typical for their market", rateRelativeLabel) +
    row("Capacity per month", optionLabel(CAPACITY_OPTIONS, data.capacity));

  const referenceRows =
    row("Name", data.referenceName) +
    row("Relationship to you", data.referenceRelationship) +
    row(data.referenceContactMethod === "phone" ? "Number" : "Email", data.referenceContactValue) +
    row("Contact method", optionLabel(REFERENCE_CONTACT_METHOD_OPTIONS, data.referenceContactMethod)) +
    (data.referenceContactMethod === "phone"
      ? row("Reachable on WhatsApp", data.referenceWhatsappAvailable ? "Yes" : "No")
      : "") +
    row("They know we may contact them", data.referenceMayContact ? "Yes" : "No");

  const otherRows =
    row("Additional notes", data.additionalNotes) + row("How they heard about us", data.referralSource);

  const html = `
    <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:${BROWN};background:#ffffff;">
      <h1 style="font-size:24px;font-weight:600;line-height:1.25;margin:0 0 16px;">${
        firstName ? `Hi ${escapeHtml(firstName)}, we've got your application.` : "We've got your application."
      }</h1>
      <p style="font-size:15px;line-height:1.6;color:#444;margin:0;">
        Thanks for applying to Nzonzi. Below is a copy of everything you submitted, for your
        records. The Nzonzi team will review it and be in touch if you're selected for the next
        cohort.
      </p>
      ${section("Contact", contactRows)}
      ${section("Application", applicationRows)}
      ${section("Portfolio", portfolioRows)}
      ${section("Paid work", paidWorkRows)}
      ${section("Reference", referenceRows)}
      ${section("Other", otherRows)}
      <p style="font-size:13px;color:#888;margin-top:32px;">
        Questions? Reach out to <a href="mailto:hello@nzonzi.net" style="color:${OCHRE};">hello@nzonzi.net</a>.
      </p>
    </div>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: "Your Nzonzi application — confirmed",
      html,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

const APPLY_PAGE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/apply`
  : "https://nzonzi.net/apply";

export interface DraftReminderData {
  email: string;
  fullName: string | null;
  resumeCode: string;
}

/**
 * Renders and sends the one-time "you left an application unfinished"
 * reminder, fired by the draft-reminder cron (app/api/cron/draft-reminders)
 * once a draft has gone idle for 30+ minutes. Best-effort, same contract
 * as sendApplicationConfirmationEmail: never throws, just returns
 * { success: false, error } so the caller can decide whether to retry.
 */
export async function sendDraftReminderEmail(
  data: DraftReminderData
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return { success: false, error: "RESEND_API_KEY is not set -- draft reminder email skipped." };
  }

  const firstName = data.fullName?.trim().split(/\s+/)[0] || "";

  const html = `
    <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:${BROWN};background:#ffffff;">
      <h1 style="font-size:24px;font-weight:600;line-height:1.25;margin:0 0 16px;">
        ${
          firstName
            ? `${escapeHtml(firstName)}, your Nzonzi application is still waiting.`
            : "Your Nzonzi application is still waiting."
        }
      </h1>
      <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 24px;">
        You started an application but didn't finish it. Pick up right where you left off --
        head back to the application page and enter your code below.
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:16px;background:#f7f3ee;border-radius:8px;text-align:center;">
            <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#6b6b6b;margin-bottom:6px;">Your code</div>
            <div style="font-size:22px;font-weight:700;letter-spacing:0.1em;color:${OCHRE};">${escapeHtml(data.resumeCode)}</div>
          </td>
        </tr>
      </table>
      <p style="text-align:center;margin:0 0 24px;">
        <a href="${APPLY_PAGE_URL}" style="display:inline-block;background:${OCHRE};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:600;">
          Continue your application
        </a>
      </p>
      <p style="font-size:13px;color:#888;margin-top:32px;">
        Questions? Reach out to <a href="mailto:hello@nzonzi.net" style="color:${OCHRE};">hello@nzonzi.net</a>.
      </p>
    </div>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: "Continue your Nzonzi application",
      html,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
