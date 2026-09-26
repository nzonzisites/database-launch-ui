// DESTINATION: app/apply/ApplicationSummary.tsx
// (same app/apply/ folder as page.tsx and ApplicationFormClient.tsx)
//
// Shared, read-only recap of a submitted application. Used in two places:
//  - page.tsx (server component), when someone who already has a row in
//    `application` visits /apply again -- built from the full DB row.
//  - ApplicationFormClient.tsx (client component), right after a
//    successful submit -- built from the form's own in-memory state, so
//    it matches exactly what was just sent without an extra fetch.
//
// The point of this (per Modupe's request) is that a second visit to the
// link should never just say "applied" with no context -- it should read
// back everything they actually told us, with their name in the heading,
// so it's unmistakably a real confirmation of their own submission and
// not a generic templated status line.

import { BROWN } from "@/lib/colors";
import { CATEGORY_OPTIONS, WORK_MODALITY_OPTIONS, REFERENCE_CONTACT_METHOD_OPTIONS, optionLabel } from "./applicationOptions";
import SessionControls from "@/app/components/SessionControls";

const OCHRE = "#C2561A";
const OFFWHITE = "#F0F0F0";

export interface ApplicationSummaryData {
  fullName: string;
  email: string;
  contactMethod: string;
  contactValue: string;
  whatsappAvailable: boolean;
  cityCountry: string;
  affiliations: string[];
  headshotUrl: string;
  intendedCategory: string;
  intendedCategoryOther: string;
  workModality: string;
  expertiseNarrative: string;
  infrastructureNarrative: string;
  externalLinks: string[];
  workSamples: string[];
  workSamplesExplanation: string;
  referenceName: string;
  referenceRelationship: string;
  referenceContactMethod: string;
  referenceContactValue: string;
  referenceWhatsappAvailable: boolean;
  referenceMayContact: boolean;
  additionalNotes: string;
  referralSource: string;
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        paddingTop: 26,
        marginTop: 26,
        borderTop: "1px solid rgba(240,240,240,0.15)",
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "rgba(240,240,240,0.5)",
      }}
    >
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 500, color: "rgba(240,240,240,0.55)", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 300, lineHeight: 1.5, color: OFFWHITE, whiteSpace: "pre-wrap" }}>
        {value}
      </div>
    </div>
  );
}

function ListRow({ label, values }: { label: string; values: string[] }) {
  if (!values || values.length === 0) return null;
  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 500, color: "rgba(240,240,240,0.55)", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {values.map((v, i) => (
          <div key={`${v}-${i}`} style={{ fontSize: 15, fontWeight: 300, color: OFFWHITE, wordBreak: "break-all" }}>
            {v}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ApplicationSummary({
  firstName,
  status,
  data,
  footer,
}: {
  firstName: string;
  status?: string | null;
  data: ApplicationSummaryData;
  footer?: React.ReactNode;
}) {
  const categoryLabel =
    data.intendedCategory === "other" && data.intendedCategoryOther
      ? data.intendedCategoryOther
      : optionLabel(CATEGORY_OPTIONS, data.intendedCategory);

  return (
    <div style={{ background: BROWN, minHeight: "100vh" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "72px 48px 80px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <SessionControls />
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 500, letterSpacing: "0.02em", color: OCHRE }}>
          submitted
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
          {firstName ? `hi ${firstName}, here's what you sent us.` : "here's what you sent us."}
        </h2>
        <p style={{ fontSize: 16, fontWeight: 300, lineHeight: 1.55, margin: 0, maxWidth: 520, color: "rgba(240,240,240,0.75)" }}>
          This is your submitted application{status ? ` (status: ${status.replace(/_/g, " ")})` : ""}. The
          Nzonzi team will review it and be in touch if you&apos;re selected for the next cohort.
        </p>

        <Section>
          <SectionLabel>Contact</SectionLabel>
          <Row label="Name" value={data.fullName} />
          <Row label="Email" value={data.email} />
          <Row
            label={data.contactMethod === "phone" ? "Number" : "Email"}
            value={data.contactValue}
          />
          {data.contactMethod === "phone" && (
            <Row label="Reachable on WhatsApp" value={data.whatsappAvailable ? "Yes" : "No"} />
          )}
          <Row label="Location" value={data.cityCountry} />
          <ListRow label="Affiliations" values={data.affiliations} />
        </Section>

        <Section>
          <SectionLabel>Application</SectionLabel>
          <Row label="Category" value={categoryLabel} />
          <Row label="Delivery" value={optionLabel(WORK_MODALITY_OPTIONS, data.workModality)} />
          <Row label="What you do" value={data.expertiseNarrative} />
          <Row label="How failed or missing infrastructure guided you" value={data.infrastructureNarrative} />
          {data.headshotUrl && <Row label="Headshot" value={data.headshotUrl} />}
        </Section>

        {(data.workSamples.length > 0 || data.workSamplesExplanation || data.externalLinks.length > 0) && (
          <Section>
            <SectionLabel>Portfolio</SectionLabel>
            <ListRow label="Portfolio links" values={data.workSamples} />
            <Row label="About these samples" value={data.workSamplesExplanation} />
            <ListRow label="Links" values={data.externalLinks} />
          </Section>
        )}

        <Section>
          <SectionLabel>Reference</SectionLabel>
          <Row label="Name" value={data.referenceName} />
          <Row label="Relationship to you" value={data.referenceRelationship} />
          <Row
            label={data.referenceContactMethod === "phone" ? "Number" : "Email"}
            value={data.referenceContactValue}
          />
          <Row
            label="Contact method"
            value={optionLabel(REFERENCE_CONTACT_METHOD_OPTIONS, data.referenceContactMethod)}
          />
          {data.referenceContactMethod === "phone" && (
            <Row label="Reachable on WhatsApp" value={data.referenceWhatsappAvailable ? "Yes" : "No"} />
          )}
          <Row label="They know we may contact them" value={data.referenceMayContact ? "Yes" : "No"} />
        </Section>

        {(data.additionalNotes || data.referralSource) && (
          <Section>
            <SectionLabel>Other</SectionLabel>
            <Row label="Additional notes" value={data.additionalNotes} />
            <Row label="How they heard about us" value={data.referralSource} />
          </Section>
        )}

        <p
          style={{
            fontSize: 13,
            fontWeight: 300,
            lineHeight: 1.55,
            margin: "40px 0 0",
            color: "rgba(240,240,240,0.5)",
          }}
        >
          If you need to update any piece of this application, please reach out to{" "}
          <a href="mailto:hello@nzonzi.net" style={{ color: "rgba(240,240,240,0.75)" }}>
            hello@nzonzi.net
          </a>
          .
        </p>

        {footer}
      </div>
    </div>
  );
}
