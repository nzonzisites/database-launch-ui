-- DESTINATION: sql/2026-11-13a-scholar-profile-pronouns.sql
--
-- Adds a "Preferred pronouns" question to page 1 of /apply (see
-- app/apply/ApplicationFormClient.tsx, question 15 -- optional, no
-- Required marker, same as Country of origin). Copied through to the
-- public scholar_profile row at approval, same pattern as every other
-- page-1 field (sql/2026-10-17b-scholar-profile-page1-fields.sql).
--
-- Run each numbered block separately.

-- 1 of 4
alter table public.application
  add column if not exists pronouns text;

alter table public.scholar_profile
  add column if not exists pronouns text;

-- 2 of 4
-- Re-points the approval trigger to also copy pronouns onto every
-- newly-approved application from here on. Full function body carried
-- over from sql/2026-10-17b-scholar-profile-page1-fields.sql (the latest
-- prior version) with pronouns added to the insert list -- nothing else
-- changed.
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
      pronouns,
      slug,
      headshot_url,
      submitted_headshot_url,
      intended_category,
      intended_category_other,
      intended_function,
      intended_function_other,
      city_country,
      residences,
      country_of_origin,
      affiliations,
      work_modality,
      experience_areas,
      tagline,
      full_bio,
      background,
      sector,
      sector_other
    )
    values (
      new.id,
      new.full_name,
      new.pronouns,
      public.generate_scholar_slug(new.full_name),
      new.headshot_url,
      new.headshot_url,
      new.intended_category,
      new.intended_category_other,
      new.intended_function::text,
      new.intended_function_other,
      new.city_country,
      new.residences,
      new.country_of_origin,
      new.affiliations,
      new.work_modality,
      new.experience_areas::text[],
      coalesce(new.expertise_narrative, ''),
      coalesce(new.full_bio, ''),
      coalesce(new.infrastructure_narrative, ''),
      new.sector,
      new.sector_other
    )
    on conflict (application_id) do nothing;
  end if;
  return new;
end;
$function$;

-- 3 of 4
-- Backfill from each existing scholar_profile's own application, same
-- pattern as 2026-10-17b's backfill -- only touches rows where pronouns
-- is still null, so this can't clobber anything an admin later types in.
update public.scholar_profile sp
set pronouns = a.pronouns
from public.application a
where sp.application_id = a.id
  and sp.pronouns is null;

-- 4 of 4
-- Modupe gave these directly (2026-11-13) for the 7 currently-published
-- listings, since none of their applications were asked this question --
-- there's nothing in `application` for step 3 to have backfilled from.
-- Only sets pronouns where it's still null, so re-running this is safe
-- and it won't overwrite anything typed in since.
update public.scholar_profile
set pronouns = 'he/him'
where slug in ('reginald-saga', 'daniel-kumapayi')
  and pronouns is null;

update public.scholar_profile
set pronouns = 'she/her'
where slug in (
  'ireti-akinrinade', 'uchenna-ezejiofor', 'joan-mukogosi',
  'laura-chipofya', 'adinawa-adjagbodjou'
)
  and pronouns is null;
