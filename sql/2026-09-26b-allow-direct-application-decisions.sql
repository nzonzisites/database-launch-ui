-- The review page lets an admin approve/reject an application straight
-- from "applied" -- canDecide in ReviewQueueClient.tsx is
-- `status === "applied" || status === "under_review"`, and there's no UI
-- action anywhere that moves a row to "under_review" first. But
-- check_application_status_transition() only allowed:
--   applied -> under_review
--   under_review -> approved
--   under_review -> rejected
-- which made every "applied" row unapprovable/unrejectable and threw
-- "Invalid application status transition: applied -> approved" on the
-- first real Approve click.
--
-- Widens it to also allow the two direct edges the app actually uses,
-- without loosening anything else (approved/rejected are still terminal
-- -- no transition out of them is allowed either way).

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
    ('under_review', 'rejected')
  ) then
    raise exception 'Invalid application status transition: % -> %', old.status, new.status;
  end if;

  return new;
end;
$function$;
