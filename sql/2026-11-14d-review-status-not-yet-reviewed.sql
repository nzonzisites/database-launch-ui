-- DESTINATION: sql/2026-11-14d-review-status-not-yet-reviewed.sql
--
-- Adds a true starting stage, "not_yet_reviewed", ahead of
-- reference_check_sent. New pipeline:
-- not_yet_reviewed -> reference_check_sent -> reference_check_responded
-- -> notified -> onboarded.
--
-- Deliberately does NOT touch any existing row's current value -- there's
-- no way to tell from the data alone whether a row sitting at
-- "reference_check_sent" got there because someone actually sent a
-- reference check, or just because that used to be the automatic default
-- for every newly-approved application. Re-labeling those in bulk could
-- silently erase real progress someone already logged. Going forward,
-- new approvals start at "not_yet_reviewed" instead; review any
-- currently-"reference_check_sent" rows by hand if some of them should
-- actually be reset.
--
-- Run each block separately.

-- 1 of 2
alter table public.application
  drop constraint if exists application_review_status_check;

alter table public.application
  add constraint application_review_status_check
  check (review_status in (
    'not_yet_reviewed', 'reference_check_sent', 'reference_check_responded', 'notified', 'onboarded'
  ));

alter table public.application
  alter column review_status set default 'not_yet_reviewed';

-- 2 of 2 (read-only sanity check -- should return 0)
select count(*) from public.application
where review_status not in (
  'not_yet_reviewed', 'reference_check_sent', 'reference_check_responded', 'notified', 'onboarded'
);
