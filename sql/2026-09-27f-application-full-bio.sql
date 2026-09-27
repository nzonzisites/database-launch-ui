-- Adds a "bio" question to the application form itself, so applicants
-- write their own public-profile bio instead of an admin having to draft
-- it from scratch on the Listings tab. Nullable, same pattern as
-- headshot_url when it was added after the table already had rows --
-- existing applications won't have one, new submissions will (enforced
-- client + server-side in app/apply, same as the other narrative fields,
-- not a NOT NULL constraint here since that would break existing rows).

alter table public.application
  add column full_bio text;

-- Now also prefills scholar_profile.full_bio on approval, closing the
-- gap flagged in 2026-09-27e (no source field existed for it at the
-- time). tagline/background prefilling is unchanged from 2026-09-27e.
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
      full_bio,
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
      coalesce(new.full_bio, ''),
      coalesce(new.infrastructure_narrative, '')
    )
    on conflict (application_id) do nothing;
  end if;
  return new;
end;
$function$;

-- Backfill full_bio the same way 2026-09-27e backfilled tagline/background
-- -- only touches rows an admin hasn't already started editing.
update public.scholar_profile sp
set full_bio = coalesce(a.full_bio, '')
from public.application a
where sp.application_id = a.id
  and sp.full_bio = ''
  and a.full_bio is not null;
