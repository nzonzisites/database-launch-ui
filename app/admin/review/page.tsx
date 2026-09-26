import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getPlatformAgentRow } from "@/lib/platformAgent";
import { fetchApplicationsForReview } from "@/lib/applicationReview";
import { BROWN, WHITE } from "@/lib/colors";
import ReviewQueueClient from "./ReviewQueueClient";
import SessionControls from "@/app/components/SessionControls";

/**
 * Gated server-side: signed out -> /login; signed in but not a
 * platform_agent, or an agent with no review permissions at all -> a
 * plain "not authorized" message (not a redirect loop back to /login,
 * since they *are* signed in -- they just aren't a reviewer).
 *
 * Only the Applications tab (review_sellers) is wired up in this pass.
 * Listing edits (review_listings) and Reports (review_reports) need
 * app_user's schema + FK shape to join seller/reporter names, which
 * wasn't available yet when this was built -- see the TODO below.
 */
export default async function ReviewQueuePage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/review");
  }

  const agent = await getPlatformAgentRow(supabase, user.id);

  if (!agent || agent.permissions.length === 0) {
    return (
      <div
        style={{
          background: BROWN,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: WHITE,
          padding: 48,
          textAlign: "center",
        }}
      >
        <div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <SessionControls />
          </div>
          <p style={{ fontSize: 18, fontWeight: 400, margin: 0 }}>
            Account verified, but you do not have admin permissions.
          </p>
          <p
            style={{
              fontSize: 14,
              fontWeight: 300,
              color: "rgba(240,240,240,0.65)",
              marginTop: 10,
            }}
          >
            {/* NOTE: platform_agent rows aren't self-serve -- an existing
                admin adds one via the database directly for now. */}
            To submit an Nzonzi application or review your application
            responses, visit{" "}
            <a href="/apply" style={{ color: WHITE, borderBottom: "1px solid currentColor" }}>
              nzonzi.net/apply
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  // TODO: once listing edits (review_listings) and reports (review_reports)
  // tabs are wired up, fetch those here too and pass them down alongside
  // applications.
  const applications = agent.permissions.includes("review_sellers")
    ? await fetchApplicationsForReview(supabase)
    : [];

  return <ReviewQueueClient agent={agent} applications={applications} />;
}
