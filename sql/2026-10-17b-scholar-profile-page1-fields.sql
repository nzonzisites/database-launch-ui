-- DESTINATION: sql/2026-10-17b-scholar-profile-page1-fields.sql
--
-- Closes the gap between application and scholar_profile. Confirmed by
-- reading create_scholar_profile_on_approval (sql/2026-10-13c-scholar-
-- profile-industries.sql, the latest prior version): it only ever
-- copied full_name, slug, headshots, intended_category (the legacy,
-- pre-Function field -- left null on every Function-era application,
-- per the comment in app/admin/review/actions.ts's approveApplication),
-- city_country, work_modality, tagline/background (from the narrative
-- fields), and sector/sector_other. Everything else an applicant enters
-- on page 1 of /apply -- residences (primary/secondary location),
-- country_of_origin, affiliations, experience_areas, and the Function
-- itself -- was being collected into `application` (confirmed in
-- app/apply/actions.ts's submit/draft-save payloads) but never made it
-- onto the public-facing scholar_profile row, and had no admin-edit
-- field either.
--
-- This adds: residences (jsonb, same { city, country, is_primary } shape
-- as application.residences), country_of_origin, affiliations,
-- experience_areas, and intended_function/intended_function_other.
-- intended_function is added ALONGSIDE intended_category, not instead
-- of it -- intended_category stays the "Listing descriptor" field
-- admins already edit on the Listings tab (app/admin/review/actions.ts
-- deliberately leaves it for an admin to set by hand after approval),
-- so nothing already relying on it breaks.
--
-- No new grants needed: these are new columns on a table the app's
-- existing roles (via RLS) already read/write in full.
--
-- Run each numbered block separately.

-- 1 of 3
alter table public.scholar_profile
  add column if not exists residences jsonb,
  add column if not exists country_of_origin text,
  add column if not exists affiliations text[],
  add column if not exists experience_areas text[],
  add column if not exists intended_function text,
  add column if not exists intended_function_other text;

-- 2 of 3
-- Re-points the approval trigger to also copy the fields above onto
-- every newly-approved application from here on. Full function body
-- carried over from sql/2026-10-13c-scholar-profile-industries.sql
-- (the latest prior version) with the new columns added to the insert
-- list -- nothing else changed. experience_areas and intended_function
-- are explicitly cast to text/text[] since they're enum-backed on
-- application (application_experience_area[], application_function)
-- but plain text on scholar_profile -- same decoupling-from-the-enum
-- choice already made for work_modality and sector on this table.
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

-- 3 of 3
-- Backfill: the trigger only fires on the draft/pending -> approved
-- transition, so every scholar_profile row that already exists (every
-- founder listing, every already-approved applicant) needs these new
-- columns filled in by hand, once, from the application it was
-- snapshotted from -- same pattern as the sector/sector_other backfill
-- in 2026-10-13c. Only touches rows where the new column is still
-- null, so this can't clobber anything an admin has already typed into
-- one of these fields.
update public.scholar_profile sp
set
  intended_function = coalesce(sp.intended_function, a.intended_function::text),
  intended_function_other = coalesce(sp.intended_function_other, a.intended_function_other),
  residences = coalesce(sp.residences, a.residences),
  country_of_origin = coalesce(sp.country_of_origin, a.country_of_origin),
  affiliations = coalesce(sp.affiliations, a.affiliations),
  experience_areas = coalesce(sp.experience_areas, a.experience_areas::text[])
from public.application a
where sp.application_id = a.id;
