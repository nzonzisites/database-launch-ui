// DESTINATION: app/components/SessionControls.tsx
//
// Drop this into any authenticated page (/apply, /admin/review). Renders
// a small "sign out" link and, independent of whether anyone clicks it,
// auto-signs the user out and bounces them to /login after 5 minutes of
// no mouse/keyboard/scroll/touch activity -- so a shared or public
// computer doesn't stay signed in as whoever last used it.
//
// Timestamp-based rather than one long setTimeout: a backgrounded browser
// tab can throttle timers, so this tracks the last-activity time in a ref
// and polls it periodically instead of trusting a single timer to fire
// exactly on schedule.

"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";

const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
const CHECK_INTERVAL_MS = 15 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"] as const;

export default function SessionControls({
  textColor = "rgba(240,240,240,0.55)",
  hoverColor = "#F0F0F0",
}: {
  textColor?: string;
  hoverColor?: string;
}) {
  const router = useRouter();
  const lastActivityRef = useRef(Date.now());

  async function signOut(reason?: "inactivity") {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push(reason ? `/login?reason=${reason}` : "/login");
    router.refresh();
  }

  useEffect(() => {
    function markActive() {
      lastActivityRef.current = Date.now();
    }

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, markActive, { passive: true }));

    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_LIMIT_MS) {
        clearInterval(interval);
        signOut("inactivity");
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, markActive));
      clearInterval(interval);
    };
    // Intentionally empty -- this effect sets up one persistent listener
    // + poll loop for the component's lifetime, not something that should
    // re-run on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      type="button"
      onClick={() => signOut()}
      style={{
        background: "transparent",
        border: 0,
        padding: 0,
        fontSize: 12.5,
        fontWeight: 500,
        letterSpacing: "0.02em",
        color: textColor,
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = hoverColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = textColor;
      }}
    >
      sign out
    </button>
  );
}
