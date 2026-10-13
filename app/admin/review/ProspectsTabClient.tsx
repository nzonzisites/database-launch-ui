"use client";

import { useMemo, useState } from "react";
import { BROWN, SAND, MOSS, OCHRE, WHITE } from "@/lib/colors";
import type { ProspectSignupForReview } from "@/lib/prospectSignupReview";

const monoLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9.5,
  letterSpacing: "0.13em",
  textTransform: "uppercase",
  opacity: 0.55,
};

const INTEREST_LABEL: Record<string, string> = {
  buyer: "Buyer",
  seller: "Seller",
  both: "Buyer & seller",
  unspecified: "Unspecified",
};

const INTEREST_STYLE: Record<string, { bg: string; fg: string }> = {
  buyer: { bg: SAND, fg: BROWN },
  seller: { bg: MOSS, fg: BROWN },
  both: { bg: "#3C6B3F", fg: WHITE },
  unspecified: { bg: "rgba(230,222,210,0.18)", fg: SAND },
};

/** "signed_up" -> "Signed up" -- status/category are enums whose full
 * value sets live in a schema repo this codebase doesn't have access to
 * (see lib/prospectSignupReview.ts), so this formats generically rather
 * than guessing at a hardcoded label map. */
function formatEnumValue(value: string | null): string | null {
  if (!value) return null;
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return iso.slice(0, 10);
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div style={{ ...monoLabel, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 300, lineHeight: 1.5, color: SAND }}>
        {value || "No response"}
      </div>
    </div>
  );
}

export default function ProspectsTabClient({ prospects }: { prospects: ProspectSignupForReview[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [interestFilter, setInterestFilter] = useState<string>("all");

  const stats = useMemo(() => {
    const buyer = prospects.filter((p) => p.interest === "buyer").length;
    const seller = prospects.filter((p) => p.interest === "seller").length;
    const both = prospects.filter((p) => p.interest === "both").length;
    const unsubscribed = prospects.filter((p) => p.unsubscribed_at).length;
    return [
      { k: "Total", v: prospects.length },
      { k: "Seller interest", v: seller + both },
      { k: "Buyer interest", v: buyer + both },
      { k: "Unsubscribed", v: unsubscribed },
    ];
  }, [prospects]);

  const filtered = useMemo(
    () => (interestFilter === "all" ? prospects : prospects.filter((p) => p.interest === interestFilter)),
    [prospects, interestFilter]
  );

  return (
    <>
      <div style={{ display: "flex", gap: 28, padding: "16px 14px 8px", flexWrap: "wrap" }}>
        {stats.map((s) => (
          <div key={s.k}>
            <div style={monoLabel}>{s.k}</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 2 }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, padding: "8px 14px 16px", flexWrap: "wrap" }}>
        {["all", "seller", "buyer", "both", "unspecified"].map((key) => (
          <button
            key={key}
            onClick={() => setInterestFilter(key)}
            style={{
              background: interestFilter === key ? MOSS : "transparent",
              color: interestFilter === key ? BROWN : SAND,
              border: `1px solid ${interestFilter === key ? MOSS : "rgba(230,222,210,0.25)"}`,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {key === "all" ? "All" : INTEREST_LABEL[key]}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2.2fr 1.4fr 1.1fr 1fr",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9.5,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
          opacity: 0.5,
          padding: "0 14px 12px",
        }}
      >
        <span>Prospect</span>
        <span>Interest</span>
        <span>Signed up</span>
        <span style={{ textAlign: "right" }}>Action</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {filtered.length === 0 && <p style={{ ...monoLabel, padding: "16px 14px" }}>No prospect signups yet.</p>}
        {filtered.map((p) => {
          const expanded = expandedId === p.id;
          const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
          const interestStyle = INTEREST_STYLE[p.interest] ?? INTEREST_STYLE.unspecified;

          return (
            <div key={p.id} style={{ borderTop: "1px solid rgba(230,222,210,0.12)" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2.2fr 1.4fr 1.1fr 1fr",
                  gap: 0,
                  alignItems: "center",
                  padding: "15px 14px",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14.5,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {name || "No name yet"}
                    {p.unsubscribed_at && (
                      <span style={{ ...monoLabel, marginLeft: 8, color: OCHRE }}>unsubscribed</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{p.email}</div>
                </div>
                <span
                  style={{
                    background: interestStyle.bg,
                    color: interestStyle.fg,
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: "4px 9px",
                    borderRadius: 999,
                    width: "fit-content",
                  }}
                >
                  {INTEREST_LABEL[p.interest] ?? p.interest}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, opacity: 0.65 }}>
                  {formatDate(p.subscribed_at)}
                </span>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setExpandedId(expanded ? null : p.id)}
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
                  <Detail label="Status" value={formatEnumValue(p.status)} />
                  <Detail label="Affiliation" value={p.affiliation} />
                  <Detail
                    label="Location"
                    value={[p.city, p.country].filter(Boolean).join(", ") || null}
                  />
                  {/* Seller-side fields */}
                  <Detail
                    label="Category"
                    value={p.category === "other" ? p.category_other || "Other" : formatEnumValue(p.category)}
                  />
                  <Detail label="What they do" value={p.what_you_do} />
                  <Detail label="Failed infrastructure → innovation" value={p.failed_infrastructure_response} />
                  {/* Buyer-side fields */}
                  <Detail label="Title" value={p.title} />
                  <Detail label="How they'd use the platform" value={p.platform_use} />
                  {/* Meta */}
                  <Detail label="Source" value={p.source} />
                  <Detail label="Signed up" value={formatDate(p.subscribed_at)} />
                  <Detail label="Last updated" value={formatDate(p.updated_at)} />
                  {p.unsubscribed_at && (
                    <Detail label="Unsubscribed" value={formatDate(p.unsubscribed_at)} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
