-- DESTINATION: sql/2026-11-14b-application-review-status.sql
--
-- Renames/redefines the "notification status" column from
-- sql/2026-11-14a-application-notification-status.sql into a proper
-- "review status" field with the real stages Modupe actually wants:
-- reference check -> notified -> onboarded (replacing the placeholder
-- not_yet/sent/responded guess). Safe to run whether or not 2026-11-14a
-- was ever applied -- every block below checks for what's actually
-- there before acting.
--
-- Run each block separately.

-- 1 of 5
-- Get a `review_status` column onto `application` one way or another:
-- rename the old notification_status column if it's there, otherwise
-- just add review_status fresh.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'application' and column_name = 'notification_status'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'application' and column_name = 'review_status'
  ) then
    alter table public.application rename column notification_status to review_status;
  end if;
end $$;

alter table public.application
  add column if not exists review_status text;

-- 2 of 5
-- Drop whatever check constraint the old column had (its name survives
-- a column rename unchanged) -- harmless no-op if 2026-11-14a was never run.
alter table public.application
  drop constraint if exists application_notification_status_check;

-- 3 of 5
-- Carry over any rows that already have an old-scheme value to the
-- closest real stage. No-op if nothing is in the old scheme.
update public.application
set review_status = case review_status
  when 'not_yet' then 'reference_check'
  when 'sent' then 'notified'
  when 'responded' then 'onboarded'
  else review_status
end
where review_status in ('not_yet', 'sent', 'responded');

-- 4 of 5
-- Backfill anything still null (rows from before either migration ran),
-- then lock in the default and NOT NULL.
update public.application
set review_status = 'reference_check'
where review_status is null;

alter table public.application
  alter column review_status set default 'reference_check',
  alter column review_status set not null;

-- 5 of 5
alter table public.application
  add constraint application_review_status_check
  check (review_status in ('reference_check', 'notified', 'onboarded'));

-- (read-only sanity check -- should return 0)
select count(*) from public.application
where review_status is null or review_status not in ('reference_check', 'notified', 'onboarded');
