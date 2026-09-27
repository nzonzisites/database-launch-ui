-- Supports the new "Revoke decision" action on the review page
-- (revokeDecision in app/admin/review/actions.ts), which sends an
-- approved or rejected application back to "under_review" so it can be
-- decided again. check_application_status_transition() didn't allow any
-- transition out of approved/rejected -- they were treated as terminal.

create or replace function public.check_application_status_transition()
returns trigger
language plpgsql
as $function$
begin
  if new.status = old.status then return new; end if;

  if (old.status, new.status) not in (
    ('applied', 'under_review'),
    ('applied', 'approved'),
    ('applied', 'rejected'),
    ('under_review', 'approved'),
    ('under_review', 'rejected'),
    ('approved', 'under_review'),
    ('rejected', 'under_review')
  ) then
    raise exception 'Invalid application status transition: % -> %', old.status, new.status;
  end if;

  return new;
end;
$function$;
