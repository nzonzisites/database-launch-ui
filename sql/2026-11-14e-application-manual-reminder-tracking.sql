-- DESTINATION: sql/2026-11-14e-application-manual-reminder-tracking.sql
--
-- Backs a new "Send reminder" button on the Applications tab of
-- /admin/review (app/admin/review/ReviewQueueClient.tsx), for incomplete
-- (draft) applications. Separate from reminder_sent_at
-- (sql/2026-10-12h-draft-reminder-tracking.sql), which is the automated
-- daily cron's own once-ever tracking -- that guard (reminder_sent_at IS
-- NULL) must keep working exactly as it does today, so this doesn't
-- touch or reuse that column. An admin can click "Send reminder" as many
-- times as they want regardless of what the cron has or hasn't done.
--
-- Run each block separately.

-- 1 of 2
alter table public.application
  add column if not exists manual_reminder_count integer not null default 0;

alter table public.application
  add column if not exists last_manual_reminder_sent_at timestamptz;

-- 2 of 2 (read-only sanity check -- should return 0)
select count(*) from public.application where manual_reminder_count is null;
