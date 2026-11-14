-- DESTINATION: sql/2026-11-14a-application-notification-status.sql
--
-- Adds a "notification status" field so admins can track whether an
-- applicant has been told something (most often a decision) -- not yet /
-- sent / responded. Shown as a dropdown per row on the Applications tab
-- of /admin/review (app/admin/review/ReviewQueueClient.tsx). Purely a
-- bookkeeping column -- it doesn't gate or trigger anything else.
--
-- Run each block separately.

-- 1 of 2
alter table public.application
  add column if not exists notification_status text
    not null default 'not_yet'
    check (notification_status in ('not_yet', 'sent', 'responded'));

-- 2 of 2 (read-only sanity check -- confirms the default backfilled
-- every existing row; should return 0)
select count(*) from public.application where notification_status is null;
