-- DESTINATION: sql/2026-10-12b-application-resume-code.sql
--
-- Gives every new draft application a short "continue your application"
-- code, so an anonymous visitor who finishes page 1 and leaves can come
-- back later and pick up where they left off without an account or a
-- magic link -- just the code.
--
-- The code is generated in app code (app/apply/actions.ts), not here;
-- this migration just adds the column to hold it, and a narrowly-scoped
-- SECURITY DEFINER lookup function so an anonymous visitor can resolve
-- their code back to a draft WITHOUT a broad RLS policy that would let
-- anyone list every draft row (RLS can't verify a query actually filtered
-- by resume_code vs. scanning the whole table -- a dedicated function
-- that only ever returns the one row matching the exact code passed in
-- closes that gap). Same pattern as the existing
-- get_prospect_signup_prefill function this repo already uses for the
-- "About You" prefill lookup.
--
-- Run each numbered block separately.

-- 1 of 3
alter table public.application
  add column resume_code text;

create unique index application_resume_code_key
  on public.application (resume_code)
  where resume_code is not null;

-- 2 of 3
create or replace function public.get_application_draft_by_resume_code(p_code text)
returns table (
  id uuid,
  resume_code text,
  full_name text,
  email text,
  city_country text,
  affiliations text[],
  headshot_url text,
  intended_function text,
  intended_function_other text,
  experience_areas text[],
  work_modality text,
  infrastructure_narrative text,
  expertise_narrative text,
  full_bio text,
  prospect_signup_id uuid
)
language sql
security definer
set search_path = public
as $function$
  select
    id,
    resume_code,
    full_name,
    email,
    city_country,
    affiliations,
    headshot_url,
    intended_function::text,
    intended_function_other,
    experience_areas::text[],
    work_modality,
    infrastructure_narrative,
    expertise_narrative,
    full_bio,
    prospect_signup_id
  from public.application
  where resume_code = p_code
    and status = 'draft';
$function$;

-- 3 of 3
grant execute on function public.get_application_draft_by_resume_code(text) to anon, authenticated;
