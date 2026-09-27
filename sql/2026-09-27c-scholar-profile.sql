-- New table for the public scholar profile / listing page content --
-- name, headshot, category/location/delivery, tagline, bio, background,
-- the "facts" row -- distinct from the existing `listing` table, which is
-- a priced-service posting (title/description/price/currency, all NOT
-- NULL) and stays unused/deferred per the decision to defer structured
-- priced services for now.
--
-- One row per seller. Created automatically in 'draft' status when an
-- application is approved (see the trigger below), copying the seller's
-- name/headshot/category/location/delivery straight from that
-- application row. This is a deliberate denormalized snapshot, not a
-- live join onto application/app_user: application holds sensitive
-- fields (references, contact info) that must never be exposed to
-- anonymous visitors of the public /profile/[id] page, and RLS on
-- application/app_user only allows review_sellers agents (or the row's
-- own owner) to read them at all -- an anonymous visitor, or even a
-- review_listings-only admin with no review_sellers permission, couldn't
-- join through to get a name or category otherwise. An admin can correct
-- these copied fields by hand on the Listings tab if a seller's details
-- change later; everything else (tagline/bio/background/etc.) is filled
-- in and published by an admin via the review page's Listings tab.

create table public.scholar_profile (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null unique references public.app_user(id),
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

-- Tables created via the SQL editor don't get default grants -- same
-- gotcha hit repeatedly elsewhere in this schema.
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

-- Auto-creates a draft scholar_profile row the moment an application is
-- approved, copying the display fields straight off that application row
-- so there's always something for an admin to open and fill in on the
-- Listings tab without having to remember to create it manually, and
-- without the public page ever needing to read application/app_user
-- directly (see the comment on the table above).
-- security definer: approving an application only requires
-- review_sellers, not review_listings, so the approving admin may not
-- personally satisfy the insert policy above -- this runs as the
-- function owner instead of the invoking user, bypassing that check for
-- this one automatic insert.
-- Only fires when applicant_user_id is set (i.e. the applicant had an
-- account) -- an approved application with no linked account has no
-- seller_id to attach the profile to, and needs a manual follow-up.
create or replace function public.create_scholar_profile_on_approval()
returns trigger
language plpgsql
security definer
as $function$
begin
  if new.status = 'approved' and old.status <> 'approved' and new.applicant_user_id is not null then
    insert into public.scholar_profile (
      seller_id,
      full_name,
      headshot_url,
      intended_category,
      intended_category_other,
      city_country,
      work_modality
    )
    values (
      new.applicant_user_id,
      new.full_name,
      new.headshot_url,
      new.intended_category,
      new.intended_category_other,
      new.city_country,
      new.work_modality
    )
    on conflict (seller_id) do nothing;
  end if;
  return new;
end;
$function$;

create trigger application_approved_creates_scholar_profile
  after update on public.application
  for each row
  execute function public.create_scholar_profile_on_approval();
