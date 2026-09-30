-- DESTINATION: sql/2026-09-30b-application-function.sql
--
-- Replaces "Category" with "Function" as the application's taxonomy
-- question, per the decision that Category was measuring the wrong
-- axis (expertise domain, too narrow / overlapping with Sector) and
-- that a functional-role question is more useful as segmenting data.
--
-- Category itself is NOT dropped or backfilled -- every application
-- submitted before this migration keeps its intended_category /
-- intended_category_other values, and the app still displays them
-- for those rows. New applications (app/apply/ApplicationFormClient.tsx)
-- no longer collect Category at all, only Function, so intended_category
-- must stop being NOT NULL or every future insert would fail.
--
-- Run each numbered block separately.

-- 1 of 3
create type public.application_function as enum (
  'research_development',
  'research_policy',
  'product_development',
  'production',
  'supply_chain',
  'marketing_brand',
  'sales_client_relations',
  'administration',
  'management',
  'program_management',
  'other'
);

-- 2 of 3
alter table public.application
  add column intended_function public.application_function,
  add column intended_function_other text;

-- 3 of 3
alter table public.application
  alter column intended_category drop not null;
