"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { BROWN, FOREST, OCHRE, SAND, WHITE } from "@/lib/colors";
import { submitProspectSignup } from "@/lib/prospectSignup";

type Role = "scholar" | "buyer" | null;

const SEE_ALSO = [
  "arts and cultural researchers",
  "materials scientists",
  "industrial designers",
  "quantitative and qualitative researchers",
  "mechanical & manufacturing engineers",
  "cosmetic chemists and formulators",
  "supply chain and sourcing experts",
];

// The 7 MVP categories plus "Other" — matches the scholar application's
// category field.
const SCHOLAR_CATEGORIES = [
  "Cosmetic Chemistry/Formulation Science",
  "Supply Chain & Procurement/Sourcing",
  "Materials Science",
  "Mechanical/Manufacturing Engineering",
  "Industrial Design",
  "Applied Quant/Qual Research",
  "Arts & Cultural Research",
  "Other",
];

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "rgba(240,240,240,0.78)",
  marginBottom: 8,
};

const fieldInputStyle: React.CSSProperties = {
  width: "100%",
  border: 0,
  borderBottom: "1px solid rgba(240,240,240,0.35)",
  background: "transparent",
  padding: "9px 2px",
  fontSize: 17,
  fontWeight: 300,
  color: WHITE,
};

export default function LandingPage() {
  const [role, setRole] = useState<Role>(null);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [scholarDone, setScholarDone] = useState(false);
  const [buyerDone, setBuyerDone] = useState(false);

  const tellUsRef = useRef<HTMLDivElement>(null);
  const applyRef = useRef<HTMLDivElement>(null);

  function jump(ref: React.RefObject<HTMLDivElement>) {
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!email || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitProspectSignup({
        email,
        interest: role === "scholar" ? "seller" : role === "buyer" ? "buyer" : "unspecified",
      });
      setSubmitted(true);
      jump(role === "scholar" ? applyRef : tellUsRef);
    } catch (err) {
      setSubmitError(
        "Something went wrong submitting that — please try again in a moment."
      );
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  const continueLabel =
    role === "scholar"
      ? "your scholar application"
      : role === "buyer"
      ? "your client application"
      : "tell us about yourself";

  const showBrownSection = submitted && role !== "scholar";
  const showGreenSection = submitted && role === "scholar";

  return (
    <main style={{ minHeight: "100vh", background: SAND, color: BROWN }}>
      <div
        style={{
          minHeight: "100vh",
          background: SAND,
          color: BROWN,
          display: "flex",
          flexDirection: "column",
          padding: "clamp(24px, 8vw, 40px) clamp(20px, 6vw, 48px) clamp(28px, 8vw, 48px)",
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "grid",
            placeItems: "center",
            padding: "24px 0 56px",
          }}
        >
          <div style={{ width: "100%", maxWidth: 720, minWidth: 0 }}>
            {/* Definition card */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Nzonzi"
                style={{
                  width: "clamp(48px, 12vw, 76px)",
                  height: "clamp(48px, 12vw, 76px)",
                  display: "block",
                  flex: "none",
                }}
              />
              <h1
                style={{
                  fontSize: "clamp(40px, 13vw, 84px)",
                  fontWeight: 300,
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  margin: 0,
                  color: FOREST,
                }}
              >
                nzonzi
              </h1>
            </div>
            <p
              style={{
                fontSize: 19,
                fontWeight: 400,
                margin: "20px 0 0",
                display: "flex",
                gap: 14,
                alignItems: "baseline",
              }}
            >
              <span style={{ color: "rgba(31,14,3,0.7)" }}>[nzoːnzi]</span>
              <span style={{ fontStyle: "italic" }}>noun.</span>
            </p>

            <div
              style={{
                borderLeft: "1px solid rgba(31,14,3,0.35)",
                paddingLeft: "clamp(16px, 4vw, 26px)",
                margin: "34px 0 0",
              }}
            >
              <p
                style={{
                  fontSize: "clamp(17px, 4.2vw, 22px)",
                  fontWeight: 300,
                  lineHeight: 1.55,
                  margin: 0,
                  maxWidth: 620,
                }}
              >
                intellectuals, research-practitioners, and leaders that
                foster positive and generative impact for organizations,
                businesses, institutions, and collectives
              </p>

              <div
                style={{
                  marginTop: 40,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    fontStyle: "italic",
                    fontWeight: 400,
                    flex: "none",
                  }}
                >
                  see also:
                </span>
                <div
                  style={{
                    position: "relative",
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    maskImage:
                      "linear-gradient(90deg, transparent 0, #000 24px, #000 82%, transparent 100%)",
                    WebkitMaskImage:
                      "linear-gradient(90deg, transparent 0, #000 24px, #000 82%, transparent 100%)",
                  }}
                >
                  <div
                    className="seealso-track"
                    style={{ display: "flex", width: "max-content" }}
                  >
                    {SEE_ALSO.concat(SEE_ALSO).map((label, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 16,
                          fontStyle: "italic",
                          fontWeight: 400,
                          whiteSpace: "nowrap",
                          paddingRight: 22,
                          color: OCHRE,
                        }}
                      >
                        {label},
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Role picker + email capture ("2E") */}
            <div
              style={{
                marginTop: 52,
                borderTop: `1px solid ${OCHRE}`,
                padding: "26px 0 0",
              }}
            >
              {!submitted && (
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: "rgba(31,14,3,0.6)",
                      marginBottom: 14,
                    }}
                  >
                    Register for early access to the Nzonzi database
                  </label>
                  <form
                    onSubmit={handleRegister}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 20,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        flex: "1 1 auto",
                        minWidth: 0,
                        gap: 8,
                      }}
                    >
                      {(
                        [
                          { key: "scholar" as const, label: "I'd like to become an Nzonzi" },
                          { key: "buyer" as const, label: "I'd like to hire an Nzonzi" },
                        ]
                      ).map((r) => {
                        const on = role === r.key;
                        return (
                          <button
                            key={r.key}
                            type="button"
                            onClick={() => setRole(r.key)}
                            style={{
                              background: on ? BROWN : "transparent",
                              border: `1px solid ${on ? BROWN : "rgba(31,14,3,0.25)"}`,
                              borderRadius: 999,
                              padding: "12px 20px",
                              fontSize: 14.5,
                              fontWeight: 500,
                              color: on ? SAND : "rgba(31,14,3,0.8)",
                              cursor: "pointer",
                            }}
                          >
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flex: "1 1 260px",
                        minWidth: 0,
                        borderBottom: "1px solid rgba(31,14,3,0.45)",
                      }}
                    >
                      <input
                        placeholder="you@example.com"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          border: 0,
                          background: "transparent",
                          padding: "10px 2px",
                          fontSize: 17,
                          fontWeight: 300,
                          color: email ? OCHRE : BROWN,
                        }}
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        style={{
                          background: "transparent",
                          border: 0,
                          padding: "10px 4px 10px 16px",
                          fontSize: 15,
                          fontWeight: 600,
                          color: BROWN,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {submitting ? "Submitting…" : "Request access →"}
                      </button>
                    </div>
                  </form>
                  {submitError && (
                    <p style={{ margin: "10px 0 0", fontSize: 13, color: OCHRE }}>
                      {submitError}
                    </p>
                  )}
                  <p
                    style={{
                      margin: "18px 0 0",
                      maxWidth: 560,
                      fontSize: 12.5,
                      fontWeight: 300,
                      lineHeight: 1.55,
                      color: "rgba(31,14,3,0.65)",
                    }}
                  >
                    By registering, you agree to receive emails about your
                    application and occasional updates about Nzonzi&apos;s
                    launch. Unsubscribe anytime. See our{" "}
                    <Link
                      href="/privacy"
                      style={{ fontWeight: 500, borderBottom: "1px solid currentColor" }}
                    >
                      Privacy Notice
                    </Link>
                    .
                  </p>
                </div>
              )}

              {submitted && (
                <div style={{ maxWidth: 520 }}>
                  <div
                    style={{
                      borderBottom: "1px solid rgba(31,14,3,0.45)",
                      paddingBottom: 12,
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 17, fontWeight: 300 }}>
                      We&apos;ll be in touch shortly with more information.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => jump(role === "scholar" ? applyRef : tellUsRef)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      marginTop: 30,
                      background: "transparent",
                      border: 0,
                      padding: 0,
                      fontSize: 14,
                      fontWeight: 500,
                      color: "rgba(31,14,3,0.7)",
                      cursor: "pointer",
                    }}
                  >
                    <span className="nudge" style={{ fontSize: 26, lineHeight: 1 }}>
                      ↓
                    </span>
                    <span>{continueLabel}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* "Tell us about yourself" — role fallback (if no role was picked
          above) and the client application form (brown). */}
      {showBrownSection && (
        <div ref={tellUsRef} style={{ background: BROWN, color: WHITE }}>
          {role === null && (
            <div
              style={{
                minHeight: "calc(100vh - 46px)",
                display: "grid",
                placeItems: "center",
                padding: "clamp(40px, 10vw, 64px) clamp(20px, 6vw, 48px)",
              }}
            >
              <div className="rise-in" style={{ width: "100%", maxWidth: 720 }}>
                <h2
                  style={{
                    fontSize: "clamp(30px, 9vw, 52px)",
                    fontWeight: 300,
                    letterSpacing: "-0.04em",
                    lineHeight: 1.02,
                    margin: "0 0 40px",
                    color: WHITE,
                    textTransform: "lowercase",
                  }}
                >
                  tell us about yourself
                </h2>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {(
                    [
                      { key: "scholar" as const, label: "I'd like to become an Nzonzi" },
                      { key: "buyer" as const, label: "I'd like to hire an Nzonzi" },
                    ]
                  ).map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setRole(r.key)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        background: "transparent",
                        border: 0,
                        borderBottom: "1px solid rgba(240,240,240,0.2)",
                        padding: "20px 2px",
                        fontSize: 21,
                        fontWeight: 300,
                        color: WHITE,
                        cursor: "pointer",
                        width: "100%",
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          width: 15,
                          height: 15,
                          flex: "none",
                          border: `1px solid ${"rgba(240,240,240,0.4)"}`,
                          background: "transparent",
                        }}
                      />
                      <span style={{ flex: 1, textAlign: "left" }}>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {role === "buyer" && (
            <ClientApplicationSection
              done={buyerDone}
              onSubmit={() => setBuyerDone(true)}
            />
          )}
        </div>
      )}

      {/* Scholar application (green). */}
      {showGreenSection && (
        <div ref={applyRef} className="rise-in-delayed" style={{ background: FOREST }}>
          <ScholarApplicationSection
            done={scholarDone}
            onSubmit={() => setScholarDone(true)}
          />
        </div>
      )}
    </main>
  );
}

function ClientApplicationSection({
  done,
  onSubmit,
}: {
  done: boolean;
  onSubmit: () => void;
}) {
  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "clamp(48px, 10vw, 72px) clamp(20px, 6vw, 48px) clamp(56px, 10vw, 80px)",
      }}
    >
      {done ? (
        <div className="rise-in" style={{ textAlign: "left" }}>
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              letterSpacing: "0.02em",
              color: OCHRE,
            }}
          >
            submitted
          </span>
          <h3
            style={{
              fontSize: "clamp(26px, 7vw, 34px)",
              fontWeight: 300,
              letterSpacing: "-0.035em",
              lineHeight: 1.12,
              margin: "14px 0 14px",
              color: WHITE,
              textTransform: "lowercase",
            }}
          >
            you&apos;re all set.
          </h3>
          <p
            style={{
              fontSize: 16,
              fontWeight: 300,
              lineHeight: 1.55,
              margin: 0,
              maxWidth: 420,
              color: "rgba(240,240,240,0.75)",
            }}
          >
            Nzonzi Admin will consider your responses and be in touch as soon
            as possible.
          </p>
        </div>
      ) : (
        <form
          className="rise-in-delayed"
          onSubmit={(e) => {
            e.preventDefault();
            // NOTE: intentionally not written to any database. The `application`
            // table's current schema requires many fields this first-pass
            // client form never asks for, and `prospect_signup` has no
            // columns for city/country/title/use-case. Wiring this up is
            // deferred until a migration adds a table shaped for it — for
            // now we only transition to the confirmation state.
            onSubmit();
          }}
        >
          <h3
            style={{
              fontSize: "clamp(26px, 7vw, 34px)",
              fontWeight: 300,
              letterSpacing: "-0.035em",
              lineHeight: 1.12,
              margin: 0,
              color: WHITE,
              textTransform: "lowercase",
            }}
          >
            client application
          </h3>
          <p
            style={{
              fontSize: 15.5,
              fontWeight: 300,
              lineHeight: 1.5,
              margin: "14px 0 40px",
              color: "rgba(240,240,240,0.7)",
            }}
          >
            Nzonzi Admin will consider your responses when curating the next
            cohort of scholars.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
            {[
              { label: "Name", ph: "Maya Ellison" },
              { label: "City", ph: "New York" },
              { label: "Country", ph: "United States" },
              { label: "Affiliation", ph: "Northside Labs" },
              { label: "Title", ph: "Head of Product Development" },
            ].map((f) => (
              <div key={f.label}>
                <label style={fieldLabelStyle}>{f.label}</label>
                <input placeholder={f.ph} style={fieldInputStyle} />
              </div>
            ))}
            <div>
              <label style={fieldLabelStyle}>What would you use the platform for?</label>
              <textarea
                rows={4}
                placeholder="The problem you'd bring to a scholar, and what a good outcome looks like. Please include any timelines if relevant, or whether this is an enduring need."
                style={{ ...fieldInputStyle, lineHeight: 1.5, resize: "vertical" }}
              />
            </div>
          </div>
          <button
            type="submit"
            style={{
              background: "transparent",
              border: 0,
              borderBottom: `1px solid ${WHITE}`,
              padding: "5px 0",
              marginTop: 40,
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              color: WHITE,
            }}
          >
            submit →
          </button>
        </form>
      )}
    </div>
  );
}

function ScholarApplicationSection({
  done,
  onSubmit,
}: {
  done: boolean;
  onSubmit: () => void;
}) {
  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "clamp(48px, 10vw, 72px) clamp(20px, 6vw, 48px) clamp(56px, 10vw, 80px)",
      }}
    >
      {done ? (
        <div className="rise-in" style={{ textAlign: "right" }}>
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              letterSpacing: "0.02em",
              color: OCHRE,
            }}
          >
            submitted
          </span>
          <h2
            style={{
              margin: "14px 0 14px",
              fontSize: "clamp(26px, 7vw, 34px)",
              fontWeight: 300,
              letterSpacing: "-0.035em",
              lineHeight: 1.12,
              color: WHITE,
              textTransform: "lowercase",
            }}
          >
            you&apos;re all set.
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
            Nzonzi Admin will consider your responses and be in touch as soon
            as possible.
          </p>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // NOTE: intentionally not written to any database. This first-pass
            // scholar form is deliberately minimal (per the design handoff),
            // but the real `application` table has many NOT NULL columns
            // (phone/whatsapp, work modality, reference details, etc.) this
            // form doesn't collect, and `prospect_signup` has no columns for
            // city/country/affiliation/category/free-text answers. Wiring
            // this up is deferred pending a DB migration that adds a table
            // shaped for this minimal first pass — for now we only
            // transition to the confirmation state.
            onSubmit();
          }}
        >
          <h2
            style={{
              fontSize: "clamp(26px, 7vw, 34px)",
              fontWeight: 300,
              letterSpacing: "-0.035em",
              lineHeight: 1.12,
              margin: 0,
              color: WHITE,
              textTransform: "lowercase",
            }}
          >
            scholar application
          </h2>
          <p
            style={{
              fontSize: 15.5,
              fontWeight: 300,
              lineHeight: 1.5,
              margin: "14px 0 40px",
              color: "rgba(240,240,240,0.7)",
            }}
          >
            Nzonzi Admin will review this and ask for your bio and references
            if you&apos;re selected for the next cohort of scholars.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
            {[
              { label: "Name", ph: "As it should appear in the directory" },
              { label: "Email", ph: "you@example.com" },
              { label: "City and country", ph: "Ibadan, Nigeria" },
              { label: "Affiliation", ph: "University of Ibadan" },
            ].map((f) => (
              <div key={f.label}>
                <label style={fieldLabelStyle}>{f.label}</label>
                <input placeholder={f.ph} style={fieldInputStyle} />
              </div>
            ))}
            <div>
              <label style={fieldLabelStyle}>Category</label>
              <select style={{ ...fieldInputStyle, cursor: "pointer" }}>
                {SCHOLAR_CATEGORIES.map((c) => (
                  <option key={c} style={{ color: BROWN }}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={fieldLabelStyle}>What do you do, in a sentence?</label>
              <textarea
                rows={3}
                placeholder="Formulation scientist working on high-oil-phase emulsions and shelf stability."
                style={{ ...fieldInputStyle, lineHeight: 1.5, resize: "vertical" }}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>
                How has failed infrastructure guided you towards innovation?
              </label>
              <textarea
                rows={4}
                placeholder="What didn't work where you are, and what you built or changed because of it."
                style={{ ...fieldInputStyle, lineHeight: 1.5, resize: "vertical" }}
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              background: "transparent",
              border: 0,
              borderBottom: `1px solid ${WHITE}`,
              padding: "5px 0",
              marginTop: 40,
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              color: WHITE,
            }}
          >
            submit →
          </button>
        </form>
      )}
    </div>
  );
}
