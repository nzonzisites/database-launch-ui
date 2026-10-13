// DESTINATION: app/api/cron/draft-reminders/route.ts
//
// Hit once a day (see vercel.json -- 13:00 UTC / 9am ET) to email anyone
// who started an application, is still a "draft", and hasn't already
// been reminded. Each draft only ever gets this once -- the row is
// "claimed" (reminder_sent_at set) right before the send attempt, so a
// retry or an overlapping run can't double-send, and a failed send just
// means that one applicant goes unreminded rather than risking a second
// email later.
//
// STALE_AFTER_MINUTES is still checked (not just reminder_sent_at IS
// NULL) so a draft someone is actively filling out right at the moment
// the daily cron fires doesn't get swept up mid-edit -- in practice,
// with only one run a day, almost everything that qualifies is already
// hours or a day stale by the time this runs.
//
// Vercel Cron on the Hobby plan is capped at once/day (Pro allows
// per-minute); that's the whole reason this runs daily rather than
// every few minutes. Vercel sends CRON_SECRET automatically as
// "Authorization: Bearer <value>" on every scheduled hit, which is how
// the route tells a real cron run apart from a random request to the
// same URL. See .env.example for both required env vars, and the SQL
// delivered alongside this change for the updated_at/reminder_sent_at
// columns this depends on.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { sendDraftReminderEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const STALE_AFTER_MINUTES = 30;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let supabase;
  try {
    supabase = getSupabaseAdminClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Supabase admin client not configured" },
      { status: 500 }
    );
  }

  const cutoff = new Date(Date.now() - STALE_AFTER_MINUTES * 60 * 1000).toISOString();

  const { data: staleDrafts, error } = await supabase
    .from("application")
    .select("id, email, full_name, resume_code")
    .eq("status", "draft")
    .is("reminder_sent_at", null)
    .not("resume_code", "is", null)
    .lte("updated_at", cutoff);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const draft of staleDrafts ?? []) {
    if (!draft.email || !draft.resume_code) continue;

    // Claim before sending, not after: a failed send just skips one
    // applicant, but a failed claim *after* a successful send would mean
    // the next run resends it -- "once, ever" is the stricter promise to
    // keep. The `.is("reminder_sent_at", null)` guard also means two
    // overlapping runs can't both pick up the same row.
    const { data: claimed, error: claimError } = await supabase
      .from("application")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", draft.id)
      .eq("status", "draft")
      .is("reminder_sent_at", null)
      .select("id")
      .maybeSingle();

    if (claimError || !claimed) {
      if (claimError) {
        failed++;
        errors.push(`${draft.id}: failed to claim -- ${claimError.message}`);
      }
      continue;
    }

    const result = await sendDraftReminderEmail({
      email: draft.email as string,
      fullName: draft.full_name as string | null,
      resumeCode: draft.resume_code as string,
    });

    if (!result.success) {
      failed++;
      errors.push(`${draft.id}: claimed but send failed -- ${result.error}`);
      continue;
    }

    sent++;
  }

  return NextResponse.json({
    checked: staleDrafts?.length ?? 0,
    sent,
    failed,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
