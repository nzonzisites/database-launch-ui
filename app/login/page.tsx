"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FOREST, OCHRE, WHITE } from "@/lib/colors";
import { getSupabaseClient } from "@/lib/supabaseClient";

// Ported from the Claude Design mockup's "seller sign-in" screen. The
// mockup also sketched a WhatsApp-code login method alongside email magic
// link. That's a separate integration (WhatsApp Business API / phone OTP
// provider, not something Supabase Auth gives us for free) so it's left
// out of this pass -- email magic link only for now. The visual structure
// below (a method toggle) can be extended later without a rework.

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "rgba(240,240,240,0.78)",
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: 0,
  borderBottom: "1px solid rgba(240,240,240,0.35)",
  background: "transparent",
  padding: "9px 2px",
  fontSize: 17,
  fontWeight: 300,
  color: WHITE,
};

const linkButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: 0,
  borderBottom: `1px solid ${WHITE}`,
  padding: "5px 0",
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
  color: WHITE,
};

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackFailed = searchParams.get("error") === "auth_callback_failed";

  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) throw authError;
      setLinkSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong sending your link. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        background: FOREST,
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "64px 48px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 440 }}>
        {linkSent ? (
          <div>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                letterSpacing: "0.02em",
                color: OCHRE,
              }}
            >
              link sent
            </span>
            <h1
              style={{
                margin: "14px 0 14px",
                fontSize: 32,
                fontWeight: 300,
                letterSpacing: "-0.035em",
                lineHeight: 1.12,
                color: WHITE,
                textTransform: "lowercase",
              }}
            >
              check your inbox.
            </h1>
            <p
              style={{
                fontSize: 16,
                fontWeight: 300,
                lineHeight: 1.55,
                margin: "0 0 26px",
                color: "rgba(240,240,240,0.75)",
              }}
            >
              We&apos;ve sent a one-time sign-in link to {email}. It expires
              in 10 minutes and can only be used once.
            </p>
            <button
              onClick={() => {
                setLinkSent(false);
                setError(null);
              }}
              style={linkButtonStyle}
            >
              use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendLink}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Nzonzi"
              style={{
                width: 56,
                height: 56,
                display: "block",
                marginBottom: 26,
                filter: "brightness(0) invert(1)",
                opacity: 0.9,
              }}
            />
            <h1
              style={{
                fontSize: 34,
                fontWeight: 300,
                letterSpacing: "-0.035em",
                lineHeight: 1.12,
                margin: 0,
                color: WHITE,
                textTransform: "lowercase",
              }}
            >
              sign into your nzonzi listing
            </h1>
            <p
              style={{
                fontSize: 15.5,
                fontWeight: 300,
                lineHeight: 1.5,
                margin: "14px 0 36px",
                color: "rgba(240,240,240,0.7)",
              }}
            >
              No password. We&apos;ll send a one-time link to your email.
            </p>

            {callbackFailed && (
              <p
                style={{
                  fontSize: 13.5,
                  fontWeight: 400,
                  lineHeight: 1.5,
                  margin: "0 0 22px",
                  color: OCHRE,
                }}
              >
                That sign-in link didn&apos;t work — it may have expired.
                Request a new one below.
              </p>
            )}

            <div style={{ marginBottom: 30 }}>
              <label style={labelStyle} htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </div>

            {error && (
              <p
                style={{
                  fontSize: 13.5,
                  fontWeight: 400,
                  lineHeight: 1.5,
                  margin: "0 0 22px",
                  color: OCHRE,
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                ...linkButtonStyle,
                opacity: submitting ? 0.6 : 1,
                cursor: submitting ? "default" : "pointer",
              }}
            >
              {submitting ? "sending…" : "send my link →"}
            </button>

            <p
              style={{
                margin: "34px 0 0",
                fontSize: 12.5,
                fontWeight: 300,
                lineHeight: 1.55,
                color: "rgba(240,240,240,0.6)",
              }}
            >
              Haven&apos;t applied yet?{" "}
              <a
                href="/"
                style={{
                  color: WHITE,
                  fontWeight: 500,
                  borderBottom: "1px solid currentColor",
                }}
              >
                Start a listing application
              </a>
              .
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary in the app router.
  return (
    <Suspense fallback={<div style={{ background: FOREST, minHeight: "100vh" }} />}>
      <LoginForm />
    </Suspense>
  );
}
