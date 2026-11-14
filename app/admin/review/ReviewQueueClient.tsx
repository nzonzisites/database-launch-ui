"use client";

import { useMemo, useState, useTransition } from "react";
import { BROWN, SAND, MOSS, OCHRE, WHITE } from "@/lib/colors";
import type { PlatformAgentRow } from "@/lib/platformAgent";
import type { ApplicationForReview, ApplicationStatus, ReviewStatus } from "@/lib/applicationReview";
import type { ScholarProfileWithSeller } from "@/lib/scholarProfile";
import type { ProspectSignupForReview } from "@/lib/prospectSignupReview";
import { approveApplication, rejectApplication, revokeDecision, updateReviewStatus } from "./actions";
import ListingsTabClient from "./ListingsTabClient";
import ProspectsTabClient from "./ProspectsTabClient";
import SessionControls from "@/app/components/SessionControls";
import {
  FUNCTION_OPTIONS,
  EXPERIENCE_AREA_OPTIONS,
  RATE_TYPE_OPTIONS,
  RATE_RELATIVE_OPTIONS,
  CAPACITY_OPTIONS,
  PRIOR_PAID_WORK_OPTIONS,
  WORK_MODALITY_OPTIONS,
  optionLabel,
  sectorLabels,
} from "@/app/apply/applicationOptions";

const CATEGORY_LABELS: Record<string, string> = {
  cosmetic_chemistry_formulation_science: "Cosmetic Chemistry & Formulation",
  supply_chain_procurement_sourcing: "Supply Chain & Sourcing",
  materials_science: "Materials Science",
  mechanical_manufacturing_engineering: "Mechanical & Manufacturing Eng.",
  industrial_design: "Industrial Design",
  applied_quant_qual_research: "Quant & Qual Research",
  arts_cultural_research: "Arts & Cultural Research",
  other: "Other",
};

const STATUS_STYLE: Record<ApplicationStatus, { label: string; bg: string; fg: string }> = {
  // Drafts DO reach this screen -- fetchApplicationsForReview includes
  // them so an admin can see an incomplete/abandoned application, just
  // without the approve/reject controls (canDecide below excludes draft).
  // bg/fg must read against this page's dark BROWN background -- the
  // original rgba(31,14,3,...)/BROWN pairing here was copied from a
  // light-background pattern and rendered as BROWN text on a
  // near-BROWN pill, invisible against the admin page's own BROWN
  // background.
  draft: { label: "Draft", bg: "rgba(230,222,210,0.16)", fg: SAND },
  applied: { label: "Applied", bg: SAND, fg: BROWN },
  under_review: { label: "Under review", bg: MOSS, fg: BROWN },
  approved: { label: "Approved", bg: "#3C6B3F", fg: WHITE },
  rejected: { label: "Rejected", bg: OCHRE, fg: WHITE },
};

const TABS = ["all", "applications", "prospects", "listings", "reports"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL: Record<Tab, string> = {
  all: "All",
  applications: "Applications",
  prospects: "Prospects",
  listings: "Listings",
  reports: "Reports",
};

const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  reference_check: "Reference check",
  notified: "Notified",
  onboarded: "Onboarded",
};

const REVIEW_STATUS_VALUES: ReviewStatus[] = ["reference_check", "notified", "onboarded"];

// What each clickable stat tile filters the Applications list down to.
// "decided" and "accepted" overlap (accepted is the subset of decided
// that's approved rather than rejected) -- both are useful on their own.
type StatusFilterKey = "open" | "applied" | "under_review" | "decided" | "accepted" | "draft";
type ReviewFilterKey = ReviewStatus;

const monoLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9.5,
  letterSpacing: "0.13em",
  textTransform: "uppercase",
  opacity: 0.55,
};

// Heading above each stats group (Application status / Review status) --
// a notch more visible than monoLabel since it's labeling a whole group,
// not a single tile.
const groupTitleStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: SAND,
  opacity: 0.7,
  marginBottom: 10,
};

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

// Renders every city/country pair on its own line, flagging whichever
// one is primary -- there can be more than one once B) added support
// for multiple residences. Returns null (so the caller can fall back to
// the legacy single city_country string) when there's nothing here,
// which covers rows from before this column existed.
function formatResidences(residences: { city?: string; country?: string; is_primary?: boolean }[] | null): string | null {
  if (!residences || residences.length === 0) return null;
  const lines = residences
    .filter((r) => r.city || r.country)
    .map((r) => {
      const place = [r.city, r.country].filter(Boolean).join(", ");
      return residences.length > 1 && r.is_primary ? `${place} (primary)` : place;
    });
  return lines.length > 0 ? lines.join("\n") : null;
}

export default function ReviewQueueClient({
  agent,
  applications,
  scholarProfiles,
  prospects,
  ownListingGap,
}: {
  agent: PlatformAgentRow;
  applications: ApplicationForReview[];
  scholarProfiles: ScholarProfileWithSeller[];
  prospects: ProspectSignupForReview[];
  ownListingGap: {
    slug: string;
    missingExperienceAreas: boolean;
    missingExperienceLabel: boolean;
  } | null;
}) {
  const availableTabs = TABS.filter((t) => {
    if (t === "all" || t === "applications") return agent.permissions.includes("review_sellers");
    // Reuses review_sellers rather than a dedicated permission -- see
    // lib/prospectSignupReview.ts for why.
    if (t === "prospects") return agent.permissions.includes("review_sellers");
    if (t === "listings") return agent.permissions.includes("review_listings");
    if (t === "reports") return agent.permissions.includes("review_reports");
    return false;
  });

  const [tab, setTab] = useState<Tab>(availableTabs[0] ?? "all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Two independent facets a reviewer can filter the Applications list
  // by at once: Application status (the application.status column --
  // approved/draft/under review/etc) and Review status (the post-decision
  // follow-up process -- reference check/notified/onboarded).
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey | null>(null);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilterKey | null>(null);

  const stats = useMemo(() => {
    const draft = applications.filter((a) => a.status === "draft").length;
    const applied = applications.filter((a) => a.status === "applied").length;
    const underReview = applications.filter((a) => a.status === "under_review").length;
    const approved = applications.filter((a) => a.status === "approved").length;
    const decided = applications.filter(
      (a) => a.status === "approved" || a.status === "rejected"
    ).length;
    return [
      { k: "Open", v: applied + underReview, filter: "open" as const },
      { k: "Applied", v: applied, filter: "applied" as const },
      { k: "Under review", v: underReview, filter: "under_review" as const },
      { k: "Decided", v: decided, filter: "decided" as const },
      { k: "Accepted", v: approved, filter: "accepted" as const },
      { k: "Draft (incomplete)", v: draft, filter: "draft" as const },
    ];
  }, [applications]);

  const reviewStats = useMemo(() => {
    const referenceCheck = applications.filter((a) => a.review_status === "reference_check").length;
    const notified = applications.filter((a) => a.review_status === "notified").length;
    const onboarded = applications.filter((a) => a.review_status === "onboarded").length;
    return [
      { k: "Reference check", v: referenceCheck, filter: "reference_check" as const },
      { k: "Notified", v: notified, filter: "notified" as const },
      { k: "Onboarded", v: onboarded, filter: "onboarded" as const },
    ];
  }, [applications]);

  // Clicking a stat tile filters the Applications list below to match it
  // (click the same one again to clear). Application-status and
  // Review-status filters combine (AND) when both are set. The stats
  // describe applications specifically, so clicking one also jumps to a
  // tab that shows them if the reviewer was on Listings/Prospects/Reports
  // at the time.
  const filteredApplications = useMemo(() => {
    return applications.filter((a) => {
      if (statusFilter) {
        const matchesStatus = (() => {
          switch (statusFilter) {
            case "open":
              return a.status === "applied" || a.status === "under_review";
            case "applied":
              return a.status === "applied";
            case "under_review":
              return a.status === "under_review";
            case "decided":
              return a.status === "approved" || a.status === "rejected";
            case "accepted":
              return a.status === "approved";
            case "draft":
              return a.status === "draft";
            default:
              return true;
          }
        })();
        if (!matchesStatus) return false;
      }
      if (reviewFilter && a.review_status !== reviewFilter) return false;
      return true;
    });
  }, [applications, statusFilter, reviewFilter]);

  function handleStatClick(filter: StatusFilterKey) {
    setStatusFilter((prev) => (prev === filter ? null : filter));
    setTab((prevTab) => (prevTab === "applications" || prevTab === "all" ? prevTab : "applications"));
  }

  function handleReviewStatClick(filter: ReviewFilterKey) {
    setReviewFilter((prev) => (prev === filter ? null : filter));
    setTab((prevTab) => (prevTab === "applications" || prevTab === "all" ? prevTab : "applications"));
  }

  const showApplications = tab === "all" || tab === "applications";

  // Listings tab reminder: every published listing with a blank
  // Experience label shows nothing on that line publicly, even when the
  // applicant answered the Experience checkboxes -- see the 2026-11-13
  // review of all 7 published listings' actual responses, which found
  // this true for 4 of them.
  const missingExperienceLabelListings = useMemo(
    () => scholarProfiles.filter((p) => p.status === "published" && !p.experience_label),
    [scholarProfiles]
  );

  // Shared tile renderer for both stats groups below -- a plain
  // JSX-returning helper (not a component), called from inside each
  // group's .map rather than used as <RenderStatTile />.
  function renderStatTile(
    s: { k: string; v: number },
    isActive: boolean,
    anyActive: boolean,
    onClick: () => void
  ) {
    return (
      <button
        key={s.k}
        onClick={onClick}
        style={{
          background: "transparent",
          border: 0,
          padding: 0,
          cursor: "pointer",
          textAlign: "left",
          color: SAND,
          opacity: !anyActive || isActive ? 1 : 0.4,
        }}
      >
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: isActive ? MOSS : SAND,
          }}
        >
          {s.v}
        </div>
        <div
          style={{
            ...monoLabel,
            marginTop: 3,
            borderBottom: isActive ? `1px solid ${MOSS}` : "1px solid transparent",
            paddingBottom: 2,
          }}
        >
          {s.k}
        </div>
      </button>
    );
  }

  return (
    <div style={{ background: BROWN, minHeight: "100vh", padding: "34px 32px 70px", color: SAND }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <SessionControls textColor="rgba(230,222,210,0.55)" hoverColor={SAND} />
        </div>
        {ownListingGap && (
          <div
            style={{
              background: "rgba(194,86,26,0.14)",
              border: `1px solid ${OCHRE}`,
              borderRadius: 6,
              padding: "12px 16px",
              marginBottom: 20,
              fontSize: 13.5,
              lineHeight: 1.5,
            }}
          >
            Your own listing ({ownListingGap.slug}) is missing{" "}
            {ownListingGap.missingExperienceAreas && ownListingGap.missingExperienceLabel
              ? "its Experience checkboxes and an Experience label"
              : ownListingGap.missingExperienceAreas
                ? "its Experience checkboxes"
                : "an Experience label"}
            . Update it on the Listings tab when you get a chance.
          </div>
        )}
        {missingExperienceLabelListings.length > 0 && (
          <div
            style={{
              background: "rgba(45,77,49,0.16)",
              border: `1px solid ${MOSS}`,
              borderRadius: 6,
              padding: "12px 16px",
              marginBottom: 20,
              fontSize: 13.5,
              lineHeight: 1.5,
            }}
          >
            {missingExperienceLabelListings.length} published listing
            {missingExperienceLabelListings.length === 1 ? "" : "s"} have no Experience label, so
            nothing shows on that line publicly even though the applicant answered the Experience
            checkboxes: {missingExperienceLabelListings.map((p) => p.full_name).join(", ")}. Add one
            on the Listings tab -- a short phrase like "5 years" or "Political strategist &amp; writer"
            is enough.
          </div>
        )}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 26, flexWrap: "wrap", gap: 28 }}>
          <div>
            <span style={monoLabel}>Platform agent · {agent.permissions.join(", ")}</span>
            <h1 style={{ fontSize: 32, fontWeight: 300, letterSpacing: "-0.035em", margin: "10px 0 0", textTransform: "lowercase" }}>
              review queue
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 36, flexWrap: "wrap" }}>
            <div>
              <div style={groupTitleStyle}>Application status</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
                {stats.map((s) =>
                  renderStatTile(s, statusFilter === s.filter, !!statusFilter, () => handleStatClick(s.filter))
                )}
              </div>
            </div>
            <div>
              <div style={groupTitleStyle}>Review status</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
                {reviewStats.map((s) =>
                  renderStatTile(s, reviewFilter === s.filter, !!reviewFilter, () => handleReviewStatClick(s.filter))
                )}
              </div>
            </div>
            {(statusFilter || reviewFilter) && (
              <button
                onClick={() => {
                  setStatusFilter(null);
                  setReviewFilter(null);
                }}
                style={{
                  background: "transparent",
                  border: 0,
                  padding: 0,
                  cursor: "pointer",
                  ...monoLabel,
                  color: OCHRE,
                  alignSelf: "flex-end",
                  marginBottom: 3,
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(230,222,210,0.18)" }}>
          {availableTabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: "transparent",
                border: 0,
                borderBottom: tab === t ? `2px solid ${SAND}` : "2px solid transparent",
                padding: "10px 16px",
                fontSize: 13.5,
                fontWeight: 500,
                color: tab === t ? SAND : "rgba(230,222,210,0.6)",
                cursor: "pointer",
              }}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>

        {tab === "reports" && (
          <p style={{ ...monoLabel, margin: "24px 0 0" }}>
            {TAB_LABEL[tab]} isn&apos;t wired up yet — coming in a follow-up pass.
          </p>
        )}

        {tab === "listings" && <ListingsTabClient profiles={scholarProfiles} />}

        {tab === "prospects" && <ProspectsTabClient prospects={prospects} />}

        {showApplications && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.2fr 0.9fr 1fr 1.1fr 0.9fr",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9.5,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                opacity: 0.5,
                padding: "16px 14px 12px",
              }}
            >
              <span>Applicant</span>
              <span>Sector</span>
              <span>Submitted</span>
              <span>Status</span>
              <span>Review status</span>
              <span style={{ textAlign: "right" }}>Action</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {filteredApplications.length === 0 && (
                <p style={{ ...monoLabel, padding: "16px 14px" }}>
                  {statusFilter ? "No applications match this filter." : "No applications yet."}
                </p>
              )}
              {filteredApplications.map((a) => (
                <ApplicationRow
                  key={a.id}
                  application={a}
                  expanded={expandedId === a.id}
                  onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ApplicationRow({
  application: a,
  expanded,
  onToggle,
}: {
  application: ApplicationForReview;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [approving, setApproving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(a.review_status);
  const [reviewStatusPending, startReviewStatusTransition] = useTransition();
  const statusStyle = STATUS_STYLE[a.status];
  const canDecide = a.status === "applied" || a.status === "under_review";
  const categoryLabel = a.intended_function
    ? a.intended_function === "other"
      ? a.intended_function_other || "Other"
      : optionLabel(FUNCTION_OPTIONS, a.intended_function)
    : a.intended_category
      ? a.intended_category === "other"
        ? a.intended_category_other || "Other"
        : CATEGORY_LABELS[a.intended_category] || a.intended_category
      : "No response";

  function handleReviewStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as ReviewStatus;
    const previous = reviewStatus;
    setReviewStatus(value);
    startReviewStatusTransition(async () => {
      try {
        await updateReviewStatus(a.id, value);
      } catch (err) {
        setReviewStatus(previous);
        setActionError(err instanceof Error ? err.message : "Couldn't update notification status.");
      }
    });
  }

  function handleApprove() {
    setActionError(null);
    startTransition(async () => {
      try {
        await approveApplication(a.id);
        setApproving(false);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Couldn't approve this application.");
      }
    });
  }

  function handleReject() {
    setActionError(null);
    startTransition(async () => {
      try {
        await rejectApplication(a.id, reason);
        setRejecting(false);
        setReason("");
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Couldn't reject this application.");
      }
    });
  }

  function handleRevoke() {
    setActionError(null);
    startTransition(async () => {
      try {
        await revokeDecision(a.id);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Couldn't revoke this decision.");
      }
    });
  }

  return (
    <div style={{ borderTop: "1px solid rgba(230,222,210,0.12)" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1.2fr 0.9fr 1fr 1.1fr 0.9fr",
          gap: 0,
          alignItems: "center",
          padding: "15px 14px",
        }}
      >
        {/* No headshot thumbnail here on purpose -- an application's
            headshot_url is just whatever the applicant pasted in, not
            reviewed or finalized yet. The real, admin-controlled image
            lives on scholar_profile and shows up on the Listings tab
            instead, once there's something legitimate to show. */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {a.full_name || "No name yet"}
          </div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{a.email}</div>
          {a.status === "draft" && a.resume_code && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, opacity: 0.75, marginTop: 3 }}>
              Code {a.resume_code}
            </div>
          )}
        </div>
        <span style={{ fontSize: 13, opacity: 0.85 }}>{categoryLabel}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, opacity: 0.65 }}>
          {formatDate(a.created_at)}
        </span>
        <span
          style={{
            background: statusStyle.bg,
            color: statusStyle.fg,
            fontSize: 11.5,
            fontWeight: 600,
            padding: "4px 9px",
            borderRadius: 999,
            width: "fit-content",
          }}
        >
          {statusStyle.label}
        </span>
        <select
          value={reviewStatus}
          onChange={handleReviewStatusChange}
          disabled={reviewStatusPending}
          style={{
            background: "rgba(230,222,210,0.1)",
            color: SAND,
            border: "1px solid rgba(230,222,210,0.3)",
            borderRadius: 4,
            fontSize: 12,
            padding: "5px 6px",
            width: "fit-content",
            cursor: "pointer",
          }}
        >
          {REVIEW_STATUS_VALUES.map((opt) => (
            <option key={opt} value={opt}>
              {REVIEW_STATUS_LABELS[opt]}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onToggle}
            style={{
              background: MOSS,
              color: BROWN,
              border: 0,
              padding: "8px 13px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {expanded ? "Close" : "Open"}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 14px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Every question the application form can ask is rendered
              unconditionally below, "No response" and all -- this queue
              now includes drafts (see fetchApplicationsForReview), which
              can be genuinely half-filled-in, and a reviewer should see
              at a glance exactly what was and wasn't answered rather
              than have unanswered questions quietly disappear. */}
          {a.status === "draft" && <ResumeCode code={a.resume_code} />}
          <Detail
            label="Contact"
            value={
              a.contact_value
                ? `${a.contact_value}${a.contact_method ? ` via ${a.contact_method}` : ""}${
                    a.contact_method === "phone" && a.whatsapp_available ? " (WhatsApp)" : ""
                  }`
                : null
            }
          />
          <Detail label="Location" value={formatResidences(a.residences) ?? a.city_country} />
          <Detail label="Country of origin" value={a.country_of_origin} />
          <Detail label="Affiliations" value={a.affiliations?.join(", ")} />
          <Detail label="Sector" value={a.intended_function || a.intended_category ? categoryLabel : null} />
          <Detail
            label="Experience"
            value={a.experience_areas?.map((v) => optionLabel(EXPERIENCE_AREA_OPTIONS, v)).join(", ")}
          />
          <Detail
            label="Delivery"
            value={a.work_modality && a.work_modality.length > 0 ? a.work_modality.map((v) => optionLabel(WORK_MODALITY_OPTIONS, v)).join(", ") : null}
          />
          <Detail label="What they do" value={a.expertise_narrative} />
          <Detail label="Failed infrastructure → innovation" value={a.infrastructure_narrative} />
          <Detail label="Bio (submitted)" value={a.full_bio} />
          <DetailLinks label="Headshot" urls={a.headshot_url ? [a.headshot_url] : []} />
          {Array.isArray(a.work_samples) && a.work_samples.length > 0 ? (
            <DetailLinks label="Professional identity" urls={a.work_samples} />
          ) : (
            <Detail label="Professional identity" value={a.work_samples_explanation} />
          )}
          <DetailLinks label="Links" urls={a.external_links ?? []} />
          <Detail
            label="Been paid directly by a company before"
            value={a.prior_paid_work ? optionLabel(PRIOR_PAID_WORK_OPTIONS, a.prior_paid_work) : null}
          />
          <Detail
            label="Industries paid to work in"
            value={
              a.sector && a.sector.length > 0 ? sectorLabels(a.sector, a.sector_other).join(", ") : null
            }
          />
          <Detail label="Deliverables produced" value={a.deliverables} />
          <Detail
            label="Most recent paid engagement"
            value={
              a.rate_type === "amount"
                ? `${a.rate_amount ?? ""} ${a.rate_currency ?? ""}`.trim() || null
                : a.rate_type
                  ? optionLabel(RATE_TYPE_OPTIONS, a.rate_type)
                  : null
            }
          />
          <Detail label="Scope of that payment" value={a.rate_scope} />
          <Detail
            label="Relative to typical for their market"
            value={a.rate_relative_to_market ? optionLabel(RATE_RELATIVE_OPTIONS, a.rate_relative_to_market) : null}
          />
          <Detail label="Capacity per month" value={a.capacity ? optionLabel(CAPACITY_OPTIONS, a.capacity) : null} />
          <Detail label="Reference name" value={a.reference_name} />
          <Detail label="Reference relationship" value={a.reference_relationship} />
          <Detail
            label="Reference contact"
            value={
              a.reference_contact_value
                ? `${a.reference_contact_value}${a.reference_contact_method ? ` via ${a.reference_contact_method}` : ""}${
                    a.reference_contact_method === "phone" && a.reference_whatsapp_available ? " (WhatsApp)" : ""
                  }`
                : null
            }
          />
          <Detail label="Reference cleared to contact" value={a.reference_may_contact ? "Yes" : "No"} />
          <Detail label="Additional notes" value={a.additional_notes} />
          <Detail label="Referral source" value={a.referral_source} />
          {a.reviewed_by && <Detail label="Reviewed by" value={a.reviewer_name || "Unknown reviewer"} />}
          {a.decision_reason && <Detail label="Decision reason" value={a.decision_reason} />}

          {canDecide && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
              {actionError && (
                <p style={{ color: OCHRE, fontSize: 13, margin: 0 }}>{actionError}</p>
              )}
              {!rejecting && !approving ? (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setApproving(true)}
                    disabled={isPending}
                    style={{
                      background: "#3C6B3F",
                      color: WHITE,
                      border: 0,
                      padding: "9px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: isPending ? "default" : "pointer",
                      opacity: isPending ? 0.6 : 1,
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setRejecting(true)}
                    disabled={isPending}
                    style={{
                      background: "transparent",
                      color: OCHRE,
                      border: `1px solid ${OCHRE}`,
                      padding: "9px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: isPending ? "default" : "pointer",
                      opacity: isPending ? 0.6 : 1,
                    }}
                  >
                    Reject
                  </button>
                </div>
              ) : approving ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480 }}>
                  <p style={{ fontSize: 12.5, opacity: 0.65, margin: 0 }}>
                    Once approved, set the public listing descriptor (and anything else buyer-facing)
                    from the Listings tab.
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={handleApprove}
                      disabled={isPending}
                      style={{
                        background: "#3C6B3F",
                        color: WHITE,
                        border: 0,
                        padding: "9px 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: isPending ? "default" : "pointer",
                        opacity: isPending ? 0.6 : 1,
                      }}
                    >
                      Confirm approve
                    </button>
                    <button
                      onClick={() => setApproving(false)}
                      disabled={isPending}
                      style={{
                        background: "transparent",
                        color: "rgba(230,222,210,0.7)",
                        border: "1px solid rgba(230,222,210,0.25)",
                        padding: "9px 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480 }}>
                  <textarea
                    placeholder="Reason for rejecting (visible internally only)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    style={{
                      width: "100%",
                      border: "1px solid rgba(230,222,210,0.35)",
                      background: "transparent",
                      color: SAND,
                      padding: 10,
                      fontSize: 14,
                      fontFamily: "inherit",
                    }}
                  />
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={handleReject}
                      disabled={isPending || !reason.trim()}
                      style={{
                        background: OCHRE,
                        color: WHITE,
                        border: 0,
                        padding: "9px 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: isPending || !reason.trim() ? "default" : "pointer",
                        opacity: isPending || !reason.trim() ? 0.6 : 1,
                      }}
                    >
                      Confirm reject
                    </button>
                    <button
                      onClick={() => {
                        setRejecting(false);
                        setReason("");
                      }}
                      disabled={isPending}
                      style={{
                        background: "transparent",
                        color: "rgba(230,222,210,0.7)",
                        border: "1px solid rgba(230,222,210,0.25)",
                        padding: "9px 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!canDecide && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
              {actionError && (
                <p style={{ color: OCHRE, fontSize: 13, margin: 0 }}>{actionError}</p>
              )}
              <button
                onClick={handleRevoke}
                disabled={isPending}
                style={{
                  background: "transparent",
                  color: "rgba(230,222,210,0.7)",
                  border: "1px solid rgba(230,222,210,0.25)",
                  padding: "9px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isPending ? "default" : "pointer",
                  opacity: isPending ? 0.6 : 1,
                  width: "fit-content",
                }}
              >
                Revoke decision
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** A draft's "continue your application" code, with a copy button, so an
 * admin can send it to an applicant who's lost the email. */
function ResumeCode({ code }: { code: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!code) return <Detail label="Continuation code" value={null} />;
  return (
    <div>
      <div style={{ ...monoLabel, marginBottom: 4 }}>Continuation code</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 600, letterSpacing: "0.1em", color: SAND }}>
          {code}
        </span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          style={{
            background: "transparent",
            border: "1px solid rgba(230,222,210,0.35)",
            color: SAND,
            padding: "5px 11px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div style={{ ...monoLabel, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 300, lineHeight: 1.5, color: SAND, whiteSpace: "pre-line" }}>
        {value || "No response"}
      </div>
    </div>
  );
}

function DetailLinks({ label, urls }: { label: string; urls: string[] }) {
  if (!urls || urls.length === 0) return <Detail label={label} value={null} />;
  return (
    <div>
      <div style={{ ...monoLabel, marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {urls.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 14,
              fontWeight: 300,
              lineHeight: 1.5,
              color: OCHRE,
              wordBreak: "break-all",
            }}
          >
            {url}
          </a>
        ))}
      </div>
    </div>
  );
}
