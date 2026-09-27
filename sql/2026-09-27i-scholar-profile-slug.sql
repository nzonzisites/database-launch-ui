-- Replaces scholar_profile.id (a uuid) as the public /profile URL with a
-- readable slug like "ireti-akinrinade". id stays the primary key
-- everywhere else (application_id FK target for nothing, reviewed_by,
-- etc. are unaffected) -- this only adds a separate column used for the
-- route param. Nothing has been shared publicly yet, so this is a clean
-- swap rather than a dual-lookup/redirect situation.

alter table public.scholar_profile
  add column if not exists slug text;

-- Turns "Ireti Akinrinade" into "ireti-akinrinade": anything that isn't a
-- letter or digit becomes a hyphen, runs of hyphens collapse to one, and
-- leading/trailing hyphens are trimmed. Appends -2, -3, etc. on
-- collision. p_exclude_id lets a future manual re-slug (an admin editing
-- the slug by hand) check for collisions against every OTHER row without
-- permanently colliding with itself.
create or replace function public.generate_scholar_slug(p_full_name text, p_exclude_id uuid default null)
returns text
language plpgsql
as $function$
declare
  base_slug text;
  candidate text;
  suffix int := 1;
begin
  base_slug := lower(regexp_replace(coalesce(p_full_name, ''), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then
    base_slug := 'scholar';
  end if;

  candidate := base_slug;
  while exists (
    select 1 from public.scholar_profile
    where slug = candidate
      and (p_exclude_id is null or id <> p_exclude_id)
  ) loop
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix;
  end loop;

  return candidate;
end;
$function$;

-- Now also assigns a slug on approval, alongside everything
-- 2026-09-27g already prefills.
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
      background
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
      coalesce(new.infrastructure_narrative, '')
    )
    on conflict (application_id) do nothing;
  end if;
  return new;
end;
$function$;

-- Backfill slugs for existing rows (your test row(s)), one at a time so
-- each later row sees the earlier ones already claimed and dedupes
-- correctly -- a single set-based UPDATE can't do that.
do $$
declare
  r record;
begin
  for r in select id, full_name from public.scholar_profile where slug is null order by created_at loop
    update public.scholar_profile
    set slug = public.generate_scholar_slug(r.full_name, r.id)
    where id = r.id;
  end loop;
end;
$$;

alter table public.scholar_profile
  alter column slug set not null;

alter table public.scholar_profile
  add constraint scholar_profile_slug_key unique (slug);
