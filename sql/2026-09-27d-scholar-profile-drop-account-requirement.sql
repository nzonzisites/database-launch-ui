-- Fix for sql/2026-09-27c-scholar-profile.sql
--
-- scholar_profile was keyed off seller_id (a NOT NULL FK to app_user), and
-- both the backfill and the approval trigger only created a row when
-- application.applicant_user_id was set. But applying doesn't require an
-- account (same gap that caused the headshot_url bug on 2026-09-26): most
-- applications, including the test one used to verify this, have no
-- applicant_user_id at all, so no scholar_profile row could ever be
-- created for them.
--
-- Fix: key scholar_profile off application_id (every application has one)
-- instead of seller_id (most don't). Nothing has been published yet
-- (confirmed empty table), so this drops and recreates rather than
-- migrating data.

drop table if exists public.scholar_profile cascade;

create table public.scholar_profile (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.application(id),
  full_name text not null default '',
  headshot_url text,
  intended_category text,
  intended_category_other text,
  city_country text,
  work_modality text,
  tagline text not null default '',
  full_bio text not null default '',
  background text not null default '',
  experience_label text,
  vetted_date date,
  status text not null default 'draft' check (status in ('draft', 'published')),
  reviewed_by uuid references public.platform_agent(id),
  created_at timestamptz not null default now()
);

alter table public.scholar_profile enable row level security;

grant select, insert, update on public.scholar_profile to authenticated;
grant select on public.scholar_profile to anon;

create policy "anyone can read published scholar profiles"
  on public.scholar_profile
  for select
  using (status = 'published');

create policy "review_listings agents can read all scholar profiles"
  on public.scholar_profile
  for select
  using (
    exists (
      select 1
      from platform_agent pa
      join app_user au on au.id = pa.user_id
      where au.auth_provider_id = auth.uid()
        and 'review_listings' = any(pa.permissions)
    )
  );

create policy "review_listings agents can update scholar profiles"
  on public.scholar_profile
  for update
  using (
    exists (
      select 1
      from platform_agent pa
      join app_user au on au.id = pa.user_id
      where au.auth_provider_id = auth.uid()
        and 'review_listings' = any(pa.permissions)
    )
  );

create policy "review_listings agents can insert scholar profiles"
  on public.scholar_profile
  for insert
  with check (
    exists (
      select 1
      from platform_agent pa
      join app_user au on au.id = pa.user_id
      where au.auth_provider_id = auth.uid()
        and 'review_listings' = any(pa.permissions)
    )
  );

-- Now fires for every approval, regardless of whether the applicant had
-- an account -- application_id is always present, unlike applicant_user_id.
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
      work_modality
    )
    values (
      new.id,
      new.full_name,
      new.headshot_url,
      new.intended_category,
      new.intended_category_other,
      new.city_country,
      new.work_modality
    )
    on conflict (application_id) do nothing;
  end if;
  return new;
end;
$function$;

-- The trigger itself (application_approved_creates_scholar_profile,
-- created in 2026-09-27c) still points at this function by name, so it
-- doesn't need to be recreated -- only the function body changed.

-- One-time backfill for the already-approved test application(s) that
-- predate this fix (mirrors the backfill in the earlier chat message, now
-- correct now that application_id -- not applicant_user_id -- is required).
insert into public.scholar_profile (
  application_id, full_name, headshot_url, intended_category, intended_category_other, city_country, work_modality
)
select
  a.id, a.full_name, a.headshot_url, a.intended_category, a.intended_category_other, a.city_country, a.work_modality
from public.application a
where a.status = 'approved'
on conflict (application_id) do nothing;
