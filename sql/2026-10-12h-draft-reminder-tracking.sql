-- Adds the two columns the new "email me 30 minutes after going idle"
-- draft-reminder cron (app/api/cron/draft-reminders) needs:
--
--   updated_at        -- didn't exist before (only created_at did). Kept
--                         current by a trigger, so "idle for 30 minutes"
--                         means "no write in 30 minutes", not "created
--                         30 minutes ago" -- every autosave/continue
--                         restarts the clock, which is what you want.
--   reminder_sent_at  -- null until the one-time reminder goes out, then
--                         set permanently so a draft is never emailed
--                         twice.
--
-- The backfill below marks every row that is ALREADY a draft right now
-- (including this session's test rows) as already-reminded, so the new
-- job only ever considers drafts from this point forward -- per your
-- call not to sweep up the existing stale ones.

alter table public.application
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists reminder_sent_at timestamptz;

update public.application
set reminder_sent_at = now()
where status = 'draft'
  and reminder_sent_at is null;

create or replace function public.set_application_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

drop trigger if exists application_set_updated_at on public.application;
create trigger application_set_updated_at
  before update on public.application
  for each row
  execute function public.set_application_updated_at();
