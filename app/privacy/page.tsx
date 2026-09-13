import Link from "next/link";
import { BROWN, FOREST, SAND } from "@/lib/colors";

const PRIVACY_USES = [
  "Confirm your registration and follow up if your application is incomplete",
  "Send occasional updates about Nzonzi's launch, if you've opted in",
  "Understand user demographics and preferences to improve our offerings",
];

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.02em",
  margin: "0 0 12px",
  color: BROWN,
};

const bodyTextStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 300,
  lineHeight: 1.62,
  margin: 0,
};

export default function PrivacyPage() {
  return (
    <div
      style={{
        background: SAND,
        color: BROWN,
        minHeight: "100vh",
        padding: "56px 48px 90px",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <Link
          href="/"
          style={{
            background: "transparent",
            border: 0,
            padding: 0,
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(31,14,3,0.6)",
            marginBottom: 34,
            display: "inline-block",
          }}
        >
          ← back
        </Link>
        <h1
          style={{
            fontSize: 44,
            fontWeight: 300,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            margin: 0,
            color: FOREST,
            textTransform: "lowercase",
          }}
        >
          nzonzi privacy notice
        </h1>
        <p
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: "rgba(31,14,3,0.6)",
            margin: "14px 0 0",
          }}
        >
          Last updated: September 12, 2026
        </p>
        <p style={{ fontSize: 17, fontWeight: 300, lineHeight: 1.6, margin: "26px 0 0" }}>
          This notice explains what happens when you register your interest in
          Nzonzi.
        </p>

        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 34 }}>
          <div>
            <h2 style={sectionHeaderStyle}>What we collect</h2>
            <p style={bodyTextStyle}>
              When you register, we collect your email address, whether
              you&apos;re registering as a buyer or an expert (seller), and
              any additional details you provide during registration, such as
              your name and affiliation.
            </p>
          </div>
          <div>
            <h2 style={sectionHeaderStyle}>Why we collect it</h2>
            <p style={{ ...bodyTextStyle, margin: "0 0 12px" }}>
              We use this information to:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PRIVACY_USES.map((text) => (
                <div
                  key={text}
                  style={{ display: "flex", gap: 12, fontSize: 16, fontWeight: 300, lineHeight: 1.6 }}
                >
                  <span style={{ color: "rgba(31,14,3,0.45)" }}>—</span>
                  <span style={{ flex: 1 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 style={sectionHeaderStyle}>Who we share it with</h2>
            <p style={bodyTextStyle}>
              We use third-party platforms to store and send communications,
              including MailerLite and potentially other email or data
              processing tools as Nzonzi grows. These providers process your
              data on our behalf and under their own security and privacy
              commitments. We don&apos;t sell your data or share it with
              unrelated third parties.
            </p>
          </div>
          <div>
            <h2 style={sectionHeaderStyle}>How long we keep it</h2>
            <p style={bodyTextStyle}>
              We retain your information for as long as you remain registered
              with us, or until you ask us to delete it.
            </p>
          </div>
          <div>
            <h2 style={sectionHeaderStyle}>Your choices</h2>
            <p style={bodyTextStyle}>
              You can unsubscribe from any email at any time using the link in
              that email. To request a copy of your data, ask a question, or
              request deletion, contact us at{" "}
              <a
                href="mailto:hello@nzonzi.net"
                style={{ borderBottom: "1px solid currentColor" }}
              >
                hello@nzonzi.net
              </a>
              .
            </p>
          </div>
          <div>
            <h2 style={sectionHeaderStyle}>Changes to this notice</h2>
            <p style={bodyTextStyle}>
              If this notice changes in a meaningful way, we&apos;ll update the
              date above and, where appropriate, let registered users know.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
