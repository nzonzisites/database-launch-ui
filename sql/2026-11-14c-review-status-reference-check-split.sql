-- DESTINATION: sql/2026-11-14c-review-status-reference-check-split.sql
--
-- Splits the single "reference_check" review_status stage (added in
-- sql/2026-11-14b-application-review-status.sql) into two: sent and
-- responded. New pipeline: reference_check_sent -> reference_check_responded
-- -> notified -> onboarded.
--
-- Run each block separately.

-- 1 of 3
alter table public.application
  drop constraint if exists application_review_status_check;

-- 2 of 3
-- Existing "reference_check" rows didn't distinguish sent vs. responded --
-- default them to the earliest sub-stage (sent) rather than guessing
-- responded. No-op if nothing is still on the old single-stage value.
update public.application
set review_status = 'reference_check_sent'
where review_status = 'reference_check';

update public.application
set review_status = 'reference_check_sent'
where review_status is null;

alter table public.application
  alter column review_status set default 'reference_check_sent';

-- 3 of 3
alter table public.application
  add constraint application_review_status_check
  check (review_status in ('reference_check_sent', 'reference_check_responded', 'notified', 'onboarded'));

-- (read-only sanity check -- should return 0)
select count(*) from public.application
where review_status not in ('reference_check_sent', 'reference_check_responded', 'notified', 'onboarded');
