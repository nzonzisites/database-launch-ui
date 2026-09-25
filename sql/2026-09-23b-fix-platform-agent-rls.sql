-- Fix for 2026-09-23-review-queue-rls.sql
--
-- Every policy in that file compared platform_agent.user_id (or a join
-- through it) directly to auth.uid(). That's wrong: platform_agent.user_id
-- references app_user.id, a separate uuid from auth.users.id. The real
-- link back to the signed-in Supabase Auth user is
-- app_user.auth_provider_id = auth.uid(). Because of this, the original
-- policies could never match, even for a correctly-set-up platform_agent
-- row -- which is why the review queue showed "not a platform reviewer"
-- for an account that did have one.
--
-- This file drops and recreates every policy from the original file with
-- the join fixed, and adds a self-read policy on app_user (needed so a
-- signed-in user can look up their own app_user.id at all).

-- 0. Let a signed-in user read their own app_user row.
create policy "users can read their own app_user row"
  on app_user
  for select
  using (auth_provider_id = auth.uid());

-- 1. A signed-in user can read their own platform_agent row.
drop policy if exists "platform agents can read their own row" on platform_agent;
create policy "platform agents can read their own row"
  on platform_agent
  for select
  using (
    user_id in (select id from app_user where auth_provider_id = auth.uid())
  );

-- 2. Agents with review_sellers can read and update seller applications.
drop policy if exists "review_sellers agents can read applications" on application;
create policy "review_sellers agents can read applications"
  on application
  for select
  using (
    exists (
      select 1
      from platform_agent pa
      join app_user au on au.id = pa.user_id
      where au.auth_provider_id = auth.uid()
        and 'review_sellers' = any(pa.permissions)
    )
  );

drop policy if exists "review_sellers agents can decide applications" on application;
create policy "review_sellers agents can decide applications"
  on application
  for update
  using (
    exists (
      select 1
      from platform_agent pa
      join app_user au on au.id = pa.user_id
      where au.auth_provider_id = auth.uid()
        and 'review_sellers' = any(pa.permissions)
    )
  );

-- 3. Same pattern for listings (review_listings) and reports
--    (review_reports).
drop policy if exists "review_listings agents can read listings" on listing;
create policy "review_listings agents can read listings"
  on listing
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

drop policy if exists "review_listings agents can decide listings" on listing;
create policy "review_listings agents can decide listings"
  on listing
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

drop policy if exists "review_reports agents can read reports" on report;
create policy "review_reports agents can read reports"
  on report
  for select
  using (
    exists (
      select 1
      from platform_agent pa
      join app_user au on au.id = pa.user_id
      where au.auth_provider_id = auth.uid()
        and 'review_reports' = any(pa.permissions)
    )
  );

drop policy if exists "review_reports agents can decide reports" on report;
create policy "review_reports agents can decide reports"
  on report
  for update
  using (
    exists (
      select 1
      from platform_agent pa
      join app_user au on au.id = pa.user_id
      where au.auth_provider_id = auth.uid()
        and 'review_reports' = any(pa.permissions)
    )
  );
