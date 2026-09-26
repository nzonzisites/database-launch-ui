// DESTINATION: app/apply/ApplicationFormClient.tsx
// (same app/apply/ folder as page.tsx)
//
// Rebuilt 2026-09-24 to match the actual Claude Design mockup's "nzonzi
// listing application" screen (design_template.html, #apply-form block)
// instead of the review-queue's boxed-input style used in the first pass.
//
// 2026-09-25: the post-submit "you're all set" branch now renders the
// shared ApplicationSummary (same component page.tsx uses on a second
// visit) built straight from local state, instead of a generic message
// with no name and no data -- see applicationOptions.ts for the option
// lists this used to define locally.

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BROWN } from "@/lib/colors";
import { submitApplication, lookupProspectPrefill, type SubmitApplicationInput } from "./actions";
import { CATEGORY_OPTIONS, WORK_MODALITY_OPTIONS, REFERENCE_CONTACT_METHOD_OPTIONS } from "./applicationOptions";
import ApplicationSummary, { type ApplicationSummaryData } from "./ApplicationSummary";
import { getSupabaseClient } from "@/lib/supabaseClient";

// Design tokens pulled directly from design_template.html -- not all of
// these exist in lib/colors.ts, so they're defined locally here rather
// than risking an import of an export that may not exist.
const CREAM = "#E6DED2";
const FOREST = "#2D4D31";
const OCHRE = "#C2561A";
const OFFWHITE = "#F0F0F0";

interface Prefill {
  firstName: string;
  lastName: string;
  email: string;
  headshotUrl: string;
  city: string;
  country: string;
  affiliations: string[];
  intendedCategory: string | null;
  prospectSignupId: string | null;
}

function Required() {
  return (
    <span style={{ color: OCHRE, marginLeft: 4 }} aria-hidden="true">
      *
    </span>
  );
}

function fieldLabelStyle(onDark: boolean): React.CSSProperties {
  return {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: onDark ? "rgba(240,240,240,0.78)" : "rgba(31,14,3,0.7)",
    marginBottom: 8,
  };
}

function helperTextStyle(onDark: boolean): React.CSSProperties {
  return {
    margin: "0 0 16px",
    fontSize: 13,
    fontWeight: 300,
    lineHeight: 1.55,
    color: onDark ? "rgba(240,240,240,0.6)" : "rgba(31,14,3,0.6)",
  };
}

function underlineInputStyle(onDark: boolean): React.CSSProperties {
  return {
    width: "100%",
    border: 0,
    borderBottom: `1px solid ${onDark ? "rgba(240,240,240,0.35)" : "rgba(31,14,3,0.35)"}`,
    background: "transparent",
    padding: "9px 2px",
    fontSize: 17,
    fontWeight: 300,
    color: onDark ? OFFWHITE : "#1F0E03",
    borderRadius: 0,
  };
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
      {children}
    </div>
  );
}

function MultiValueField({
  label,
  required,
  onDark,
  values,
  onChange,
  placeholder,
  helper,
}: {
  label: string;
  required?: boolean;
  onDark: boolean;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  helper?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...values, trimmed]);
    setDraft("");
  }

  return (
    <div>
      <label style={fieldLabelStyle(onDark)}>
        {label}
        {required && <Required />}
      </label>
      {helper && <p style={helperTextStyle(onDark)}>{helper}</p>}
      <input
        style={underlineInputStyle(onDark)}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
      />
      {values.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {values.map((v, i) => (
            <div
              key={`${v}-${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "8px 0",
                borderBottom: `1px solid ${onDark ? "rgba(240,240,240,0.2)" : "rgba(31,14,3,0.15)"}`,
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: 300,
                  color: onDark ? OFFWHITE : "#1F0E03",
                  wordBreak: "break-all",
                }}
              >
                {v}
              </span>
              <button
                type="button"
                onClick={() => onChange(values.filter((_, idx) => idx !== i))}
                style={{
                  background: "transparent",
                  border: 0,
                  padding: 0,
                  fontSize: 13,
                  fontWeight: 400,
                  color: onDark ? "rgba(240,240,240,0.6)" : "rgba(31,14,3,0.6)",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ApplicationFormClient({ prefill }: { prefill: Prefill }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [reviewLinkSent, setReviewLinkSent] = useState(false);
  const [sendingReviewLink, setSendingReviewLink] = useState(false);

  const [firstName, setFirstName] = useState(prefill.firstName);
  const [lastName, setLastName] = useState(prefill.lastName);
  const [email, setEmail] = useState(prefill.email);
  const [city, setCity] = useState(prefill.city);
  const [country, setCountry] = useState(prefill.country);
  const [affiliations, setAffiliations] = useState<string[]>(prefill.affiliations);
  const [headshotUrl, setHeadshotUrl] = useState(prefill.headshotUrl);

  const [hasPrefill, setHasPrefill] = useState(
    Boolean(prefill.firstName || prefill.lastName || prefill.city || prefill.country) ||
      prefill.affiliations.length > 0 ||
      Boolean(prefill.intendedCategory)
  );
  // Only relevant for a signed-out visitor (prefill.email is blank in
  // that case -- page.tsx already did this lookup server-side for a
  // signed-in one). Tracks whether the email-blur lookup below has
  // already run, so it doesn't keep re-firing or clobber fields once
  // they've been filled in, whether by the lookup or typed by hand.
  const [prefillLookupDone, setPrefillLookupDone] = useState(false);

  const [intendedCategory, setIntendedCategory] = useState(prefill.intendedCategory ?? "");
  const [intendedCategoryOther, setIntendedCategoryOther] = useState("");
  const [workModality, setWorkModality] = useState("");
  const [expertiseNarrative, setExpertiseNarrative] = useState("");
  const [infrastructureNarrative, setInfrastructureNarrative] = useState("");

  const [externalLinks, setExternalLinks] = useState<string[]>([]);
  const [workSamples, setWorkSamples] = useState<string[]>([]);
  const [workSamplesExplanation, setWorkSamplesExplanation] = useState("");

  const [referenceName, setReferenceName] = useState("");
  const [referenceRelationship, setReferenceRelationship] = useState("");
  const [referenceContactMethod, setReferenceContactMethod] = useState("");
  const [referenceContactValue, setReferenceContactValue] = useState("");
  const [referenceWhatsappAvailable, setReferenceWhatsappAvailable] = useState(false);
  const [referenceMayContact, setReferenceMayContact] = useState(false);

  const [contactMethod, setContactMethod] = useState("");
  const [contactValue, setContactValue] = useState("");
  const [whatsappAvailable, setWhatsappAvailable] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [referralSource, setReferralSource] = useState("");

  // Fires when the (signed-out, blank-form) visitor finishes typing their
  // email -- looks up any "About You" answers filed under that email and
  // fills in whatever's still blank, so they don't retype what they
  // already told us. Never overwrites anything already filled in, and
  // only runs once per mount: a signed-in visitor already has
  // prefill.email set from page.tsx, so this is a no-op for them.
  async function handleEmailBlur() {
    if (prefill.email || prefillLookupDone) return;
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) return;

    setPrefillLookupDone(true);
    const match = await lookupProspectPrefill(trimmed);
    if (!match) return;

    let filledSomething = false;
    if (!firstName && match.firstName) {
      setFirstName(match.firstName);
      filledSomething = true;
    }
    if (!lastName && match.lastName) {
      setLastName(match.lastName);
      filledSomething = true;
    }
    if (!city && match.city) {
      setCity(match.city);
      filledSomething = true;
    }
    if (!country && match.country) {
      setCountry(match.country);
      filledSomething = true;
    }
    if (affiliations.length === 0 && match.affiliation) {
      setAffiliations([match.affiliation]);
      filledSomething = true;
    }
    if (!intendedCategory && match.category) {
      setIntendedCategory(match.category);
      filledSomething = true;
    }
    if (filledSomething) setHasPrefill(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // reference_may_contact is a required boolean column, not a
    // required-true consent checkbox -- false is a valid, honest answer,
    // so there's no client-side block on it beyond letting them submit
    // whichever value they chose.

    const input: SubmitApplicationInput = {
      fullName: `${firstName} ${lastName}`.trim(),
      email,
      contactMethod,
      contactValue,
      whatsappAvailable,
      cityCountry: [city, country].filter(Boolean).join(", "),
      affiliations,
      headshotUrl,
      intendedCategory,
      intendedCategoryOther,
      workModality,
      infrastructureNarrative,
      expertiseNarrative,
      externalLinks,
      workSamples,
      workSamplesExplanation,
      referenceName,
      referenceRelationship,
      referenceContactMethod,
      referenceContactValue,
      referenceWhatsappAvailable,
      referenceMayContact,
      additionalNotes,
      referralSource,
      prospectSignupId: prefill.prospectSignupId,
    };

    startTransition(async () => {
      const result = await submitApplication(input);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSubmitted(true);
      router.refresh();
    });
  }

  // Applying no longer requires signing in first -- a magic link is only
  // needed to come back and review what was submitted. This sends that
  // link to whatever email was just used on this form, reusing the same
  // signInWithOtp call /login uses.
  async function handleSendReviewLink() {
    if (!email.trim()) return;
    setSendingReviewLink(true);
    try {
      // Same cookie /login sets before calling signInWithOtp --
      // /auth/callback reads it to know where to send them after the
      // magic link. Without it, the callback route has nothing to fall
      // back on but "/", which is why this was landing back on the
      // homepage instead of /apply.
      document.cookie = `nz_post_login_redirect=${encodeURIComponent("/apply")}; path=/; max-age=600; SameSite=Lax${
        window.location.protocol === "https:" ? "; Secure" : ""
      }`;

      const supabase = getSupabaseClient();
      await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      setReviewLinkSent(true);
    } catch {
      // Best-effort -- their submission already succeeded and is showing
      // on screen either way. They can also just go to /login later and
      // request a link with the same email.
    } finally {
      setSendingReviewLink(false);
    }
  }

  if (submitted) {
    const summaryData: ApplicationSummaryData = {
      fullName: `${firstName} ${lastName}`.trim(),
      email,
      contactMethod,
      contactValue,
      whatsappAvailable,
      cityCountry: [city, country].filter(Boolean).join(", "),
      affiliations,
      headshotUrl,
      intendedCategory,
      intendedCategoryOther,
      workModality,
      expertiseNarrative,
      infrastructureNarrative,
      externalLinks,
      workSamples,
      workSamplesExplanation,
      referenceName,
      referenceRelationship,
      referenceContactMethod,
      referenceContactValue,
      referenceWhatsappAvailable,
      referenceMayContact,
      additionalNotes,
      referralSource,
    };

    return (
      <ApplicationSummary
        firstName={firstName}
        data={summaryData}
        footer={
          <div
            style={{
              marginTop: 30,
              paddingTop: 26,
              borderTop: "1px solid rgba(240,240,240,0.15)",
            }}
          >
            {reviewLinkSent ? (
              <p style={{ fontSize: 13.5, fontWeight: 300, lineHeight: 1.5, margin: 0, color: "rgba(240,240,240,0.65)" }}>
                Check {email} for a one-time link -- click it any time to come back and review this
                application.
              </p>
            ) : (
              <>
                <p style={{ fontSize: 13.5, fontWeight: 300, lineHeight: 1.5, margin: "0 0 12px", color: "rgba(240,240,240,0.6)" }}>
                  Want to come back to this later? We&apos;ll email you a one-time link.
                </p>
                <button
                  type="button"
                  onClick={handleSendReviewLink}
                  disabled={sendingReviewLink}
                  style={{
                    background: "transparent",
                    border: 0,
                    borderBottom: `1px solid ${OFFWHITE}`,
                    padding: "4px 0",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: sendingReviewLink ? "default" : "pointer",
                    color: OFFWHITE,
                    opacity: sendingReviewLink ? 0.6 : 1,
                  }}
                >
                  {sendingReviewLink ? "sending..." : "email me a review link \u2192"}
                </button>
              </>
            )}
          </div>
        }
      />
    );
  }

  return (
    <div style={{ background: BROWN, minHeight: "100vh" }}>
      <form onSubmit={handleSubmit} style={{ maxWidth: 720, margin: "0 auto", padding: "72px 48px 80px" }}>
        {/* No SessionControls here (unlike the submitted/recap view) --
            most visitors reach this form signed out, and even a signed-in
            one shouldn't risk losing an in-progress, unsaved application
            to the 5-minute inactivity auto-sign-out while composing a
            long answer. */}
        <h2
          style={{
            fontSize: 34,
            fontWeight: 300,
            letterSpacing: "-0.035em",
            lineHeight: 1.12,
            margin: 0,
            color: OFFWHITE,
            textTransform: "lowercase",
          }}
        >
          nzonzi listing application
        </h2>
        <p style={{ fontSize: 15.5, fontWeight: 300, lineHeight: 1.5, margin: "14px 0 12px", color: "rgba(240,240,240,0.7)" }}>
          The Nzonzi team will review your listing application and be in touch if you&apos;re
          selected for the next cohort.
        </p>
        {hasPrefill && (
          <p style={{ fontSize: 13.5, fontWeight: 300, lineHeight: 1.5, margin: "0 0 40px", color: "rgba(240,240,240,0.5)" }}>
            We&apos;ve carried over what you told us when you signed up -- feel free to update
            anything below.
          </p>
        )}

        {/* Public-facing info -- cream card, matches the mockup's light section */}
        <div style={{ display: "flex", flexDirection: "column", gap: 30, background: CREAM, padding: 32 }}>
          <div>
            <label style={fieldLabelStyle(false)}>
              Email
              <Required />
            </label>
            <input
              style={underlineInputStyle(false)}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={handleEmailBlur}
              required
            />
            {!prefill.email && (
              <p style={{ ...helperTextStyle(false), margin: "8px 0 0" }}>
                Already told us about yourself? We&apos;ll carry that over automatically.
              </p>
            )}
          </div>

          <TwoCol>
            <div>
              <label style={fieldLabelStyle(false)}>
                First name
                <Required />
              </label>
              <input
                style={underlineInputStyle(false)}
                placeholder="Adaeze"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={fieldLabelStyle(false)}>
                Last name
                <Required />
              </label>
              <input
                style={underlineInputStyle(false)}
                placeholder="Okonkwo"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </TwoCol>

          <TwoCol>
            <div>
              <label style={fieldLabelStyle(false)}>
                City
                <Required />
              </label>
              <input
                style={underlineInputStyle(false)}
                placeholder="Ibadan"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={fieldLabelStyle(false)}>
                Country
                <Required />
              </label>
              <input
                style={underlineInputStyle(false)}
                placeholder="Nigeria"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
              />
            </div>
          </TwoCol>

          <MultiValueField
            label="Affiliations"
            required
            onDark={false}
            values={affiliations}
            onChange={setAffiliations}
            placeholder="e.g. University of Ibadan"
          />

          <div>
            <label style={fieldLabelStyle(false)}>
              Category
              <Required />
            </label>
            <select
              style={{ ...underlineInputStyle(false), cursor: "pointer" }}
              value={intendedCategory}
              onChange={(e) => setIntendedCategory(e.target.value)}
              required
            >
              <option value="" disabled>
                Select a category
              </option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ color: "#1F0E03" }}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {intendedCategory === "other" && (
            <div>
              <label style={fieldLabelStyle(false)}>
                Tell us your category
                <Required />
              </label>
              <input
                style={underlineInputStyle(false)}
                placeholder="e.g. Public health researcher"
                value={intendedCategoryOther}
                onChange={(e) => setIntendedCategoryOther(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label style={fieldLabelStyle(false)}>
              Delivery
              <Required />
            </label>
            <p style={helperTextStyle(false)}>Which of these are you open to?</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {WORK_MODALITY_OPTIONS.map((opt) => {
                const active = workModality === opt.value;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setWorkModality(opt.value)}
                    style={{
                      background: active ? FOREST : "transparent",
                      border: `1px solid ${active ? FOREST : "rgba(31,14,3,0.35)"}`,
                      borderRadius: 999,
                      padding: "9px 18px",
                      fontSize: 14,
                      fontWeight: 500,
                      color: active ? OFFWHITE : "#1F0E03",
                      cursor: "pointer",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={fieldLabelStyle(false)}>
              What do you do, in a sentence?
              <Required />
            </label>
            <textarea
              rows={3}
              maxLength={250}
              style={{ ...underlineInputStyle(false), lineHeight: 1.5, resize: "vertical" }}
              placeholder="Formulation scientist working on high-oil-phase emulsions and shelf stability."
              value={expertiseNarrative}
              onChange={(e) => setExpertiseNarrative(e.target.value)}
              required
            />
            <div style={{ textAlign: "right", fontSize: 11.5, fontWeight: 300, color: "rgba(31,14,3,0.5)", marginTop: 6 }}>
              {expertiseNarrative.length} / 250
            </div>
          </div>

          <div>
            <label style={fieldLabelStyle(false)}>
              How has failed or missing infrastructure guided you towards innovation?
              <Required />
            </label>
            <textarea
              rows={4}
              maxLength={750}
              style={{ ...underlineInputStyle(false), lineHeight: 1.5, resize: "vertical" }}
              placeholder="What didn't work where you are, and what you built or changed because of it."
              value={infrastructureNarrative}
              onChange={(e) => setInfrastructureNarrative(e.target.value)}
              required
            />
            <div style={{ textAlign: "right", fontSize: 11.5, fontWeight: 300, color: "rgba(31,14,3,0.5)", marginTop: 6 }}>
              {infrastructureNarrative.length} / 750
            </div>
          </div>

          <div>
            <label style={fieldLabelStyle(false)}>Headshot</label>
            <p style={helperTextStyle(false)}>
              Please share a professional headshot that can be used for your listing should it
              be approved. Upload to your preferred storage site (Google Drive, Drop Box, etc)
              and share an accessible link.
            </p>
            <input
              style={underlineInputStyle(false)}
              placeholder="https://..."
              value={headshotUrl}
              onChange={(e) => setHeadshotUrl(e.target.value)}
            />
          </div>
        </div>

        {/* Internal-review-only info -- stays on the dark background */}
        <div style={{ display: "flex", flexDirection: "column", gap: 30, marginTop: 30 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(240,240,240,0.5)",
            }}
          >
            For internal application review only
          </div>

          <div>
            <MultiValueField
              label="Professional identity"
              onDark
              values={workSamples}
              onChange={setWorkSamples}
              placeholder="https://..."
              helper="Provide links to publications / media coverage / or portfolio or otherwise to help the Nzonzi team learn more about you and your work"
            />
            <div style={{ marginTop: 18 }}>
              <label style={fieldLabelStyle(true)}>About these samples (optional)</label>
              <textarea
                rows={2}
                style={{ ...underlineInputStyle(true), lineHeight: 1.5, resize: "vertical" }}
                value={workSamplesExplanation}
                onChange={(e) => setWorkSamplesExplanation(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={fieldLabelStyle(true)}>Reference</label>
            <p style={helperTextStyle(true)}>
              One person who has paid for or supervised your work. We only contact them if you&apos;re
              selected, and only with your permission below.
            </p>
            <TwoCol>
              <div>
                <label style={{ ...fieldLabelStyle(true), fontSize: 12.5 }}>
                  Name
                  <Required />
                </label>
                <input
                  style={underlineInputStyle(true)}
                  value={referenceName}
                  onChange={(e) => setReferenceName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ ...fieldLabelStyle(true), fontSize: 12.5 }}>
                  Relationship to you
                  <Required />
                </label>
                <input
                  style={underlineInputStyle(true)}
                  value={referenceRelationship}
                  onChange={(e) => setReferenceRelationship(e.target.value)}
                  required
                />
              </div>
            </TwoCol>

            <div style={{ marginTop: 18 }}>
              <label style={{ ...fieldLabelStyle(true), fontSize: 12.5 }}>
                Contact by
                <Required />
              </label>
              <select
                style={{ ...underlineInputStyle(true), cursor: "pointer" }}
                value={referenceContactMethod}
                onChange={(e) => setReferenceContactMethod(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select one
                </option>
                {REFERENCE_CONTACT_METHOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} style={{ color: "#1F0E03" }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: 18 }}>
              <label style={{ ...fieldLabelStyle(true), fontSize: 12.5 }}>
                {referenceContactMethod === "phone" ? "Number" : "Email"}
                <Required />
              </label>
              <input
                style={underlineInputStyle(true)}
                value={referenceContactValue}
                onChange={(e) => setReferenceContactValue(e.target.value)}
                required
              />
            </div>

            {referenceContactMethod === "phone" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
                <input
                  type="checkbox"
                  id="reference-whatsapp"
                  checked={referenceWhatsappAvailable}
                  onChange={(e) => setReferenceWhatsappAvailable(e.target.checked)}
                />
                <label htmlFor="reference-whatsapp" style={{ fontSize: 13, color: OFFWHITE }}>
                  This number is reachable on WhatsApp
                </label>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 18 }}>
              <input
                type="checkbox"
                id="reference-may-contact"
                checked={referenceMayContact}
                onChange={(e) => setReferenceMayContact(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <label htmlFor="reference-may-contact" style={{ fontSize: 13, color: OFFWHITE }}>
                I&apos;ve told this person we may contact them as part of reviewing my application.
              </label>
            </div>
          </div>

          <div>
            <label style={fieldLabelStyle(true)}>What&apos;s your preferred contact method?</label>
            <p style={helperTextStyle(true)}>Used for admin purposes. We won&apos;t publish it.</p>
            <div>
              <label style={{ ...fieldLabelStyle(true), fontSize: 12.5 }}>
                Contact by
                <Required />
              </label>
              <select
                style={{ ...underlineInputStyle(true), cursor: "pointer" }}
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select one
                </option>
                {REFERENCE_CONTACT_METHOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} style={{ color: "#1F0E03" }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: 18 }}>
              <label style={{ ...fieldLabelStyle(true), fontSize: 12.5 }}>
                {contactMethod === "phone" ? "Number" : "Email"}
                <Required />
              </label>
              <input
                style={underlineInputStyle(true)}
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                required
              />
            </div>

            {contactMethod === "phone" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
                <input
                  type="checkbox"
                  id="applicant-whatsapp"
                  checked={whatsappAvailable}
                  onChange={(e) => setWhatsappAvailable(e.target.checked)}
                />
                <label htmlFor="applicant-whatsapp" style={{ fontSize: 13, color: OFFWHITE }}>
                  This number is reachable on WhatsApp
                </label>
              </div>
            )}
          </div>

          <div>
            <label style={fieldLabelStyle(true)}>Is there anything else you&apos;d like to share with the application review team? (optional)</label>
            <textarea
              rows={2}
              style={{ ...underlineInputStyle(true), lineHeight: 1.5, resize: "vertical" }}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
            />
          </div>

          <div>
            <label style={fieldLabelStyle(true)}>How did you hear about us? (optional)</label>
            <input
              style={underlineInputStyle(true)}
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p
            style={{
              color: "#ffb4a8",
              fontSize: 13,
              marginTop: 30,
              border: "1px solid rgba(255,180,168,0.4)",
              borderRadius: 6,
              padding: "10px 12px",
              background: "rgba(255,180,168,0.08)",
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          style={{
            background: "transparent",
            border: 0,
            borderBottom: `1px solid ${OFFWHITE}`,
            padding: "5px 0",
            marginTop: 40,
            fontSize: 16,
            fontWeight: 600,
            cursor: isPending ? "default" : "pointer",
            color: OFFWHITE,
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? "submitting..." : "submit →"}
        </button>
      </form>
    </div>
  );
}
