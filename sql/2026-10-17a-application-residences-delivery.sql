-- DESTINATION: sql/2026-10-17a-application-residences-delivery.sql
--
-- Supports the application-page updates from Modupe's A-J list:
--
--  B) a visitor can now list more than one city/country residence pair
--     and mark one as primary -- city_country stays as the single
--     derived "primary" string every existing consumer (admin table,
--     confirmation email subject line, public profile) already reads,
--     and the new `residences` jsonb column holds the full list.
--  C) a new, separate "country of origin" question (distinct from where
--     they currently live).
--  E) "Delivery" becomes a genuine multi-select -- Virtual / Local /
--     Willing to Travel -- rather than three mutually exclusive values
--     where "both" stood in for "both of the other two". work_modality
--     changes from a single text value to text[] on both application
--     and scholar_profile; existing values are translated in place
--     (remote_only -> {virtual}, travel_flexible -> {travel},
--     both -> {virtual,travel}).
--
-- Run each numbered block separately.

-- 1 of 5
alter table public.application
  add column residences jsonb,
  add column country_of_origin text;

comment on column public.application.residences is
  'Array of {city, country, is_primary} objects -- the full list of places this applicant lives. city_country stays as the derived primary entry for consumers that only show one line.';
comment on column public.application.country_of_origin is
  'Where the applicant (or their family) emigrated from, if applicable. Separate from residences, which is current/recent places lived.';

-- 2 of 5
alter table public.application
  alter column work_modality type text[]
  using (
    case work_modality
      when 'remote_only' then array['virtual']
      when 'travel_flexible' then array['travel']
      when 'both' then array['virtual', 'travel']
      else null
    end
  );

-- 3 of 5
alter table public.scholar_profile
  alter column work_modality type text[]
  using (
    case work_modality
      when 'remote_only' then array['virtual']
      when 'travel_flexible' then array['travel']
      when 'both' then array['virtual', 'travel']
      else null
    end
  );

-- 4 of 5
-- get_application_draft_by_resume_code's return shape is changing
-- (new residences/country_of_origin columns, work_modality text ->
-- text[]) -- Postgres won't let create-or-replace change a function's
-- return signature, so drop and recreate.
drop function if exists public.get_application_draft_by_resume_code(text);

create function public.get_application_draft_by_resume_code(p_code text)
returns table (
  id uuid,
  resume_code text,
  full_name text,
  email text,
  city_country text,
  residences jsonb,
  country_of_origin text,
  affiliations text[],
  headshot_url text,
  intended_function text,
  intended_function_other text,
  experience_areas text[],
  work_modality text[],
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
    residences,
    country_of_origin,
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

-- 5 of 5
grant execute on function public.get_application_draft_by_resume_code(text) to anon, authenticated;
