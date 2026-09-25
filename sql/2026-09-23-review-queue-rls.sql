-- Review queue RLS policies
-- Hand this to the nzonzi_database_launch repo (or run directly in the
-- Supabase SQL Editor) -- this frontend repo doesn't own the schema.
--
-- Without these, /admin/review will show "not a platform reviewer" for
-- everyone, including real platform_agent rows, because the anon/authed
-- client can't read platform_agent or application at all yet.

-- 1. A signed-in user can read their own platform_agent row (used to
--    decide whether to show them the review queue at all, and which
--    tabs).
create policy "platform agents can read their own row"
  on platform_agent
  for select
  using (user_id = auth.uid());

-- 2. Agents with review_sellers can read and update seller applications.
create policy "review_sellers agents can read applications"
  on application
  for select
  using (
    exists (
      select 1 from platform_agent pa
      where pa.user_id = auth.uid()
        and 'review_sellers' = any(pa.permissions)
    )
  );

create policy "review_sellers agents can decide applications"
  on application
  for update
  using (
    exists (
      select 1 from platform_agent pa
      where pa.user_id = auth.uid()
        and 'review_sellers' = any(pa.permissions)
    )
  );

-- 3. Same pattern for listings (review_listings) and reports
--    (review_reports) -- included now since the queue's Listing edits and
--    Reports tabs will need it, even though that UI isn't wired up yet.
create policy "review_listings agents can read listings"
  on listing
  for select
  using (
    exists (
      select 1 from platform_agent pa
      where pa.user_id = auth.uid()
        and 'review_listings' = any(pa.permissions)
    )
  );

create policy "review_listings agents can decide listings"
  on listing
  for update
  using (
    exists (
      select 1 from platform_agent pa
      where pa.user_id = auth.uid()
        and 'review_listings' = any(pa.permissions)
    )
  );

create policy "review_reports agents can read reports"
  on report
  for select
  using (
    exists (
      select 1 from platform_agent pa
      where pa.user_id = auth.uid()
        and 'review_reports' = any(pa.permissions)
    )
  );

create policy "review_reports agents can decide reports"
  on report
  for update
  using (
    exists (
      select 1 from platform_agent pa
      where pa.user_id = auth.uid()
        and 'review_reports' = any(pa.permissions)
    )
  );
