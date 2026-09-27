-- Splits the admin-facing headshot into two things:
--   scholar_profile.headshot_url            -- the LIVE image shown on the
--                                               public listing, admin-controlled
--   scholar_profile.submitted_headshot_url  -- read-only reference copy of
--                                               whatever the applicant
--                                               originally submitted (URL)
-- Previously both were the same column, so an admin overwriting the
-- headshot for the live listing would also destroy the applicant's
-- original submission -- no way to compare "what they sent" against
-- "what's live" once replaced.
--
-- Also adds a public storage bucket + policies so an admin can upload an
-- actual approved image file for the live listing, rather than only
-- pasting a URL (applicants still submit theirs as a URL on the
-- application form -- that side is unchanged).

alter table public.scholar_profile
  add column submitted_headshot_url text;

-- Existing rows: their current headshot_url (copied from the application
-- at creation time, per 2026-09-27c/d) IS the originally-submitted one.
update public.scholar_profile
set submitted_headshot_url = headshot_url
where submitted_headshot_url is null;

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

-- Public bucket for the live, admin-uploaded headshots. 5MB cap, images
-- only. "public" here means read access is unauthenticated (needed for
-- the public /profile/[id] page) -- write access is still gated by the
-- policies below, not by bucket-level public-ness.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scholar-headshots', 'scholar-headshots', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "review_listings agents can upload scholar headshots"
  on storage.objects
  for insert
  with check (
    bucket_id = 'scholar-headshots'
    and exists (
      select 1
      from platform_agent pa
      join app_user au on au.id = pa.user_id
      where au.auth_provider_id = auth.uid()
        and 'review_listings' = any(pa.permissions)
    )
  );

create policy "review_listings agents can update scholar headshots"
  on storage.objects
  for update
  using (
    bucket_id = 'scholar-headshots'
    and exists (
      select 1
      from platform_agent pa
      join app_user au on au.id = pa.user_id
      where au.auth_provider_id = auth.uid()
        and 'review_listings' = any(pa.permissions)
    )
  );

create policy "review_listings agents can delete scholar headshots"
  on storage.objects
  for delete
  using (
    bucket_id = 'scholar-headshots'
    and exists (
      select 1
      from platform_agent pa
      join app_user au on au.id = pa.user_id
      where au.auth_provider_id = auth.uid()
        and 'review_listings' = any(pa.permissions)
    )
  );

create policy "anyone can view scholar headshots"
  on storage.objects
  for select
  using (bucket_id = 'scholar-headshots');
