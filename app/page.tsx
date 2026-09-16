"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { BROWN, FOREST, OCHRE, SAND, WHITE } from "@/lib/colors";
import { submitProspectSignup } from "@/lib/prospectSignup";
import { submitScholarApplication, submitBuyerApplication } from "@/lib/applications";

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
      ? "tell us about yourself"
      : role === "buyer"
      ? "tell us what you're looking for"
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

            {/* Keyframe for the line's extension alongside "see also" —
                a plain CSS animation, present from the very first paint,
                so it can never drift out of sync with "see also"'s own
                riseIn animation regardless of how slow hydration is. */}
            <style>{`
              @keyframes lineGrow {
                from { transform: scaleY(0); }
                to { transform: scaleY(1); }
              }
            `}</style>

            {/* Segment 1: the line next to the definition text. A plain
                CSS border, auto-sized by the browser, present immediately
                with no animation, stopping exactly at the definition text —
                the 40px gap and everything below it belongs to segment 2,
                so the growth visibly starts from this exact point. */}
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
                knowledge producers, rigorous practitioners, and social
                leaders who foster positive social impact through
                organizations, businesses, institutions, and communities
              </p>
            </div>

            {/* Segment 2: the 40px gap plus the "see also" row, as one grid
                with two rows — an empty 40px row and a content row. The
                line-overlay spans both rows (so it grows to cover the gap
                AND the row together), while the riseIn content only
                occupies the content row. Grid's stretch behavior sizes
                everything correctly without any JS measurement. */}
            <div
              style={{
                display: "grid",
                gridTemplateRows: "40px auto",
              }}
            >
              <div
                style={{
                  gridRow: "1 / 3",
                  gridColumn: 1,
                  width: 1,
                  background: "rgba(31,14,3,0.35)",
                  transformOrigin: "top",
                  animation: "lineGrow 1.8s 2s cubic-bezier(0.33, 0, 0.2, 1) both",
                }}
              />
              <div
                style={{
                  gridRow: "2 / 3",
                  gridColumn: 1,
                  paddingLeft: "clamp(16px, 4vw, 26px)",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  overflow: "hidden",
                  animation: "riseIn 1.8s 2s cubic-bezier(0.33, 0, 0.2, 1) both",
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
                animation: "riseIn 1.8s 3.8s cubic-bezier(0.33, 0, 0.2, 1) both",
              }}
            >
              {!submitted && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 18,
                      marginBottom: 22,
                    }}
                  >
                    <span style={{ flex: "none", fontStyle: "italic", fontSize: 19, fontWeight: 400 }}>
                      Where do you fit in?
                    </span>
                    <span style={{ flex: "1 1 60px", minWidth: 40, height: 1, background: OCHRE }} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {(
                      [
                        { key: "scholar" as const, label: "I'd like to become an Nzonzi", i: 0 },
                        { key: "buyer" as const, label: "I'd like to hire an Nzonzi", i: 1 },
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
                            padding: "14px 24px",
                            fontSize: 15.5,
                            fontWeight: 500,
                            color: on ? SAND : "rgba(31,14,3,0.8)",
                            cursor: "pointer",
                            animation: `riseIn 1.6s ${5.0 + r.i * 0.6}s cubic-bezier(0.33, 0, 0.2, 1) both`,
                          }}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>

                  {role !== null && (
                    <div className="rise-in" style={{ marginTop: 30 }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13.5,
                          fontWeight: 500,
                          color: "rgba(31,14,3,0.6)",
                          marginBottom: 12,
                        }}
                      >
                        {role === "scholar"
                          ? "Apply to list on Nzonzi. Register now for early access."
                          : "Register for early access to the Nzonzi database"}
                      </label>
                      <form
                        onSubmit={handleRegister}
                        style={{
                          display: "flex",
                          maxWidth: 460,
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
              email={email}
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
            email={email}
          />
        </div>
      )}
    </main>
  );
}

function ClientApplicationSection({
  done,
  onSubmit,
  email,
}: {
  done: boolean;
  onSubmit: () => void;
  email: string;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [title, setTitle] = useState("");
  const [platformUse, setPlatformUse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
          onSubmit={async (e) => {
            e.preventDefault();
            if (submitting) return;
            setSubmitting(true);
            setSubmitError(null);
            try {
              await submitBuyerApplication({
                email,
                firstName,
                lastName,
                city,
                country,
                affiliation,
                title,
                platformUse,
              });
              onSubmit();
            } catch (err) {
              setSubmitError(
                "Something went wrong submitting that — please try again in a moment."
              );
              // eslint-disable-next-line no-console
              console.error(err);
            } finally {
              setSubmitting(false);
            }
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
            about you
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
            The curatorial team will consider your responses when selecting
            the next cohort of Nzonzi.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
            <div>
              <label style={fieldLabelStyle}>First name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Maya"
                style={fieldInputStyle}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Last name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ellison"
                style={fieldInputStyle}
              />
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              <div style={{ flex: 1 }}>
                <label style={fieldLabelStyle}>City</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="New York"
                  style={fieldInputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={fieldLabelStyle}>Country</label>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="United States"
                  style={fieldInputStyle}
                />
              </div>
            </div>
            <div>
              <label style={fieldLabelStyle}>Affiliation</label>
              <input
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                placeholder="Northside Labs"
                style={fieldInputStyle}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Head of Product Development"
                style={fieldInputStyle}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>What would you use the platform for?</label>
              <textarea
                rows={4}
                value={platformUse}
                onChange={(e) => setPlatformUse(e.target.value)}
                placeholder="What problem would you like to bring to a scholar or subject matter expert. What does a good outcome look like? Please include any relevant timelines, and specify if this is a one-off or enduring need."
                style={{ ...fieldInputStyle, lineHeight: 1.5, resize: "vertical" }}
              />
            </div>
          </div>
          {submitError && (
            <p style={{ margin: "16px 0 0", fontSize: 13, color: OCHRE }}>
              {submitError}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
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
            {submitting ? "Submitting…" : "submit →"}
          </button>
        </form>
      )}
    </div>
  );
}

function ScholarApplicationSection({
  done,
  onSubmit,
  email,
}: {
  done: boolean;
  onSubmit: () => void;
  email: string;
}) {
  const [scholarCategory, setScholarCategory] = useState(SCHOLAR_CATEGORIES[0]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [categoryOther, setCategoryOther] = useState("");
  const [whatYouDo, setWhatYouDo] = useState("");
  const [failedInfrastructureResponse, setFailedInfrastructureResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
          onSubmit={async (e) => {
            e.preventDefault();
            if (submitting) return;
            setSubmitting(true);
            setSubmitError(null);
            try {
              await submitScholarApplication({
                email,
                firstName,
                lastName,
                city,
                country,
                affiliation,
                category: scholarCategory,
                categoryOther: scholarCategory === "Other" ? categoryOther : null,
                whatYouDo,
                failedInfrastructureResponse,
              });
              onSubmit();
            } catch (err) {
              setSubmitError(
                "Something went wrong submitting that — please try again in a moment."
              );
              // eslint-disable-next-line no-console
              console.error(err);
            } finally {
              setSubmitting(false);
            }
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
            about you
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
            <div>
              <label style={fieldLabelStyle}>First name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={fieldInputStyle}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Last name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={fieldInputStyle}
              />
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              <div style={{ flex: 1 }}>
                <label style={fieldLabelStyle}>City</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ibadan"
                  style={fieldInputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={fieldLabelStyle}>Country</label>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Nigeria"
                  style={fieldInputStyle}
                />
              </div>
            </div>
            <div>
              <label style={fieldLabelStyle}>Affiliation</label>
              <input
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                placeholder="e.g. University of Ibadan or Independent research-practitioner"
                style={fieldInputStyle}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Category</label>
              <select
                value={scholarCategory}
                onChange={(e) => setScholarCategory(e.target.value)}
                style={{ ...fieldInputStyle, cursor: "pointer" }}
              >
                {SCHOLAR_CATEGORIES.map((c) => (
                  <option key={c} value={c} style={{ color: BROWN }}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {scholarCategory === "Other" && (
              <div>
                <input
                  value={categoryOther}
                  onChange={(e) => setCategoryOther(e.target.value)}
                  placeholder="Multi-disciplinarity is more than welcome"
                  style={fieldInputStyle}
                />
              </div>
            )}
            <div>
              <label style={fieldLabelStyle}>What do you do, in a sentence?</label>
              <textarea
                rows={3}
                value={whatYouDo}
                onChange={(e) => setWhatYouDo(e.target.value)}
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
                value={failedInfrastructureResponse}
                onChange={(e) => setFailedInfrastructureResponse(e.target.value)}
                placeholder="What didn't work where you are, and what you built or changed because of it."
                style={{ ...fieldInputStyle, lineHeight: 1.5, resize: "vertical" }}
              />
            </div>
          </div>

          {submitError && (
            <p style={{ margin: "16px 0 0", fontSize: 13, color: OCHRE }}>
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
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
            {submitting ? "Submitting…" : "submit →"}
          </button>
        </form>
      )}
    </div>
  );
}
