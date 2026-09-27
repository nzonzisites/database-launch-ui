-- Adds headshot_url directly on application, so it's captured for every
-- submission regardless of whether the applicant has an account.
-- Previously it only synced onto app_user.headshot_url, which requires
-- applicant_user_id to be set -- but signing in isn't required to apply,
-- so most submissions never had that, and the headshot link they
-- submitted was never actually saved anywhere retrievable.

alter table public.application
  add column headshot_url text;
