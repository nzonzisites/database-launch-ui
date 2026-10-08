-- DESTINATION: sql/2026-10-08a-function-options-and-experience-areas.sql
--
-- (1) Updates the Function option set: drops Project Management and
-- Sales & Client Relations (split down to just Sales -- Project
-- Management and Client Relations move to the new question below
-- instead, since they're skills someone has, not a primary function),
-- adds Healthcare & Medicine (general) and Public Health.
--
-- Postgres can't drop/rename individual enum values in place, so this
-- drops and recreates application_function. Safe to do outright (no
-- backward-compat step) because no applications have been submitted
-- yet -- same situation as the 2026-10-01 rate_band change.
--
-- (2) Adds the new optional "experience areas" question (Project
-- management / Client relations, multi-select) as its own enum + array
-- column, same pattern as application.sector.
--
-- Run each numbered block separately.

-- 1 of 5
alter table public.application drop column if exists intended_function;

-- 2 of 5
drop type if exists public.application_function;

-- 3 of 5
create type public.application_function as enum (
  'research_development',
  'research_policy',
  'healthcare_medicine',
  'public_health',
  'product_development',
  'production',
  'supply_chain',
  'marketing_brand',
  'sales',
  'administration',
  'management',
  'other'
);

-- 4 of 5
alter table public.application
  add column intended_function public.application_function;

-- 5 of 5
create type public.application_experience_area as enum (
  'project_management',
  'client_relations'
);

alter table public.application
  add column experience_areas public.application_experience_area[];
