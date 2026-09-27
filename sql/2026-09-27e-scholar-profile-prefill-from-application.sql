-- Prefills tagline/background from the application's own narrative
-- answers, instead of leaving an admin to retype what the applicant
-- already wrote. Mapping (from app/apply/ApplicationFormClient.tsx):
--   tagline    <- expertise_narrative     ("What do you do, in a sentence?")
--   background <- infrastructure_narrative ("How has failed or missing
--                  infrastructure guided you towards innovation?")
-- full_bio (the hover-reveal bio) has no equivalent source field in the
-- application, so it stays admin-written. An admin can still edit
-- tagline/background afterward on the Listings tab -- this only seeds a
-- starting draft.

create or replace function public.create_scholar_profile_on_approval()
returns trigger
language plpgsql
security definer
as $function$
begin
  if new.status = 'approved' and old.status <> 'approved' then
    insert into public.scholar_profile (
      application_id,
      full_name,
      headshot_url,
      intended_category,
      intended_category_other,
      city_country,
      work_modality,
      tagline,
      background
    )
    values (
      new.id,
      new.full_name,
      new.headshot_url,
      new.intended_category,
      new.intended_category_other,
      new.city_country,
      new.work_modality,
      coalesce(new.expertise_narrative, ''),
      coalesce(new.infrastructure_narrative, '')
    )
    on conflict (application_id) do nothing;
  end if;
  return new;
end;
$function$;

-- Backfill the tagline/background gap on rows created before this fix
-- (your existing test row) -- only touches rows an admin hasn't already
-- started editing, so it won't clobber real work in progress.
update public.scholar_profile sp
set
  tagline = coalesce(a.expertise_narrative, ''),
  background = coalesce(a.infrastructure_narrative, '')
from public.application a
where sp.application_id = a.id
  and sp.tagline = ''
  and sp.background = '';
