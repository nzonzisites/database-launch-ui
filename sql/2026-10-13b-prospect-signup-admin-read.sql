-- Lets review_sellers agents read all of prospect_signup for the new
-- admin Prospects tab. Today anon can only INSERT on this table (see
-- lib/prospectSignup.ts) and nothing has ever needed authenticated to
-- read it, so both layers are missing and both are added here:
--
--   1. A base GRANT SELECT to authenticated -- RLS policies only
--      restrict an operation a role is already allowed to attempt; they
--      never grant the underlying privilege themselves (the exact gap
--      that caused the app_user/platform_agent/application grant bugs
--      fixed earlier this session). Without this, every admin would hit
--      "permission denied for table prospect_signup" even with the
--      policy below in place.
--   2. The RLS policy itself, scoped to review_sellers agents (same
--      permission the Applications tab already gates behind, reused here
--      rather than introducing a dedicated one -- see
--      lib/prospectSignupReview.ts for why).

grant select on public.prospect_signup to authenticated;

create policy "review_sellers agents can read prospect signups"
  on prospect_signup
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
