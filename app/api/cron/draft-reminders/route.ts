// DESTINATION: app/api/cron/draft-reminders/route.ts
//
// Hit on a schedule (see vercel.json) to email anyone who started an
// application, went idle for 30+ minutes while still a "draft", and
// hasn't already been reminded. Each draft only ever gets this once --
// the row is "claimed" (reminder_sent_at set) right before the send
// attempt, so a retry or an overlapping run can't double-send, and a
// failed send just means that one applicant goes unreminded rather than
// risking a second email later.
//
// Needs the service-role key (bypasses RLS -- this has to see every
// applicant's draft, not just one signed-in user's own row, the way the
// anon/authenticated policies would restrict it) and a CRON_SECRET so
// only Vercel's own scheduler (or someone who has that secret) can
// trigger it. See .env.example for both, and the SQL delivered alongside
// this change for the updated_at/reminder_sent_at columns this depends on.

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
