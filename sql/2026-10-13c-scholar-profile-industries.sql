-- Copies the applicant's selected industries (application.sector /
-- sector_other, the "Industries paid to work in" question from the paid-
-- work section) onto scholar_profile, so the public listing page can show
-- them as badges. scholar_profile is a one-time snapshot taken at
-- approval (see create_scholar_profile_on_approval below), not a live
-- join onto application -- same reasoning as every other copied column
-- here (lib/scholarProfile.ts has the full explanation).

alter table public.scholar_profile
  add column if not exists sector text[],
  add column if not exists sector_other text;

-- Re-points the approval trigger to also copy sector/sector_other. This
-- is the full function body from sql/2026-09-27i-scholar-profile-slug.sql
-- (the latest prior version) with those two columns added to the insert
-- list -- nothing else changed.
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
      city_country,
      work_modality,
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
      new.city_country,
      new.work_modality,
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

-- Backfill: the trigger only fires on the draft/pending -> approved
-- transition, so listings that were already approved before this
-- migration need their sector/sector_other filled in by hand, once, by
-- joining back to the application they were snapshotted from.
update public.scholar_profile sp
set sector = a.sector,
    sector_other = a.sector_other
from public.application a
where a.id = sp.application_id
  and sp.sector is null;
