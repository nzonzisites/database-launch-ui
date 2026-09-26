"use client";

import { useMemo, useState, useTransition } from "react";
import { BROWN, SAND, MOSS, OCHRE, WHITE } from "@/lib/colors";
import type { PlatformAgentRow } from "@/lib/platformAgent";
import type { ApplicationForReview, ApplicationStatus } from "@/lib/applicationReview";
import { approveApplication, rejectApplication } from "./actions";
import SessionControls from "@/app/components/SessionControls";

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

const MODALITY_LABELS: Record<string, string> = {
  remote_only: "Remote only",
  travel_flexible: "Travel-flexible",
  both: "Remote or travel",
};

const STATUS_STYLE: Record<ApplicationStatus, { label: string; bg: string; fg: string }> = {
  applied: { label: "Applied", bg: SAND, fg: BROWN },
  under_review: { label: "Under review", bg: MOSS, fg: BROWN },
  approved: { label: "Approved", bg: "#3C6B3F", fg: WHITE },
  rejected: { label: "Rejected", bg: OCHRE, fg: WHITE },
};

const TABS = ["all", "applications", "listings", "reports"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL: Record<Tab, string> = {
  all: "All",
  applications: "Applications",
  listings: "Listing edits",
  reports: "Reports",
};

const monoLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9.5,
  letterSpacing: "0.13em",
  textTransform: "uppercase",
  opacity: 0.55,
};

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

export default function ReviewQueueClient({
  agent,
  applications,
}: {
  agent: PlatformAgentRow;
  applications: ApplicationForReview[];
}) {
  const availableTabs = TABS.filter((t) => {
    if (t === "all" || t === "applications") return agent.permissions.includes("review_sellers");
    if (t === "listings") return agent.permissions.includes("review_listings");
    if (t === "reports") return agent.permissions.includes("review_reports");
    return false;
  });

  const [tab, setTab] = useState<Tab>(availableTabs[0] ?? "all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const applied = applications.filter((a) => a.status === "applied").length;
    const underReview = applications.filter((a) => a.status === "under_review").length;
    const decided = applications.filter(
      (a) => a.status === "approved" || a.status === "rejected"
    ).length;
    return [
      { k: "Open", v: applied + underReview },
      { k: "Applied", v: applied },
      { k: "Under review", v: underReview },
      { k: "Decided", v: decided },
    ];
  }, [applications]);

  const showApplications = tab === "all" || tab === "applications";

  return (
    <div style={{ background: BROWN, minHeight: "100vh", padding: "34px 32px 70px", color: SAND }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <SessionControls textColor="rgba(230,222,210,0.55)" hoverColor={SAND} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 26, flexWrap: "wrap", gap: 20 }}>
          <div>
            <span style={monoLabel}>Platform agent · {agent.permissions.join(", ")}</span>
            <h1 style={{ fontSize: 32, fontWeight: 300, letterSpacing: "-0.035em", margin: "10px 0 0", textTransform: "lowercase" }}>
              review queue
            </h1>
          </div>
          <div style={{ display: "flex", gap: 28 }}>
            {stats.map((s) => (
              <div key={s.k}>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>{s.v}</div>
                <div style={{ ...monoLabel, marginTop: 3 }}>{s.k}</div>
              </div>
            ))}
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

        {(tab === "listings" || tab === "reports") && (
          <p style={{ ...monoLabel, margin: "24px 0 0" }}>
            {TAB_LABEL[tab]} isn&apos;t wired up yet — coming in a follow-up pass.
          </p>
        )}

        {showApplications && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2.2fr 1.4fr 1fr 1.1fr 1fr",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9.5,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                opacity: 0.5,
                padding: "16px 14px 12px",
              }}
            >
              <span>Applicant</span>
              <span>Category</span>
              <span>Submitted</span>
              <span>Status</span>
              <span style={{ textAlign: "right" }}>Action</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {applications.length === 0 && (
                <p style={{ ...monoLabel, padding: "16px 14px" }}>No applications yet.</p>
              )}
              {applications.map((a) => (
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
  const [actionError, setActionError] = useState<string | null>(null);
  const statusStyle = STATUS_STYLE[a.status];
  const canDecide = a.status === "applied" || a.status === "under_review";
  const categoryLabel =
    a.intended_category === "other"
      ? a.intended_category_other || "Other"
      : CATEGORY_LABELS[a.intended_category] || a.intended_category;

  function handleApprove() {
    setActionError(null);
    startTransition(async () => {
      try {
        await approveApplication(a.id);
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

  return (
    <div style={{ borderTop: "1px solid rgba(230,222,210,0.12)" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2.2fr 1.4fr 1fr 1.1fr 1fr",
          gap: 0,
          alignItems: "center",
          padding: "15px 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              flex: "none",
              backgroundImage:
                "repeating-linear-gradient(135deg, rgba(230,222,210,0.22) 0 4px, transparent 4px 8px)",
              border: "1px solid rgba(230,222,210,0.2)",
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {a.full_name}
            </div>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{a.email}</div>
          </div>
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
          <Detail
            label="Contact"
            value={`${a.contact_value} via ${a.contact_method}${
              a.contact_method === "phone" && a.whatsapp_available ? " (WhatsApp)" : ""
            }`}
          />
          <Detail label="Location" value={a.city_country} />
          <Detail label="Affiliations" value={a.affiliations?.join(", ") || "—"} />
          <Detail label="Links" value={a.external_links?.join(", ") || "—"} />
          <Detail label="Delivery" value={MODALITY_LABELS[a.work_modality] || a.work_modality} />
          <Detail label="What they do" value={a.expertise_narrative} />
          <Detail label="Failed infrastructure → innovation" value={a.infrastructure_narrative} />
          <Detail
            label="Work samples"
            value={
              Array.isArray(a.work_samples) && a.work_samples.length > 0
                ? JSON.stringify(a.work_samples)
                : a.work_samples_explanation || "—"
            }
          />
          <Detail
            label="Reference"
            value={`${a.reference_name} (${a.reference_relationship}) — ${a.reference_contact_value} via ${a.reference_contact_method}${
              a.reference_may_contact ? "" : " — NOT cleared to contact yet"
            }`}
          />
          {a.additional_notes && <Detail label="Additional notes" value={a.additional_notes} />}
          {a.referral_source && <Detail label="Referral source" value={a.referral_source} />}
          {a.decision_reason && <Detail label="Decision reason" value={a.decision_reason} />}

          {canDecide && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
              {actionError && (
                <p style={{ color: OCHRE, fontSize: 13, margin: 0 }}>{actionError}</p>
              )}
              {!rejecting ? (
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
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ ...monoLabel, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 300, lineHeight: 1.5, color: SAND }}>{value}</div>
    </div>
  );
}
