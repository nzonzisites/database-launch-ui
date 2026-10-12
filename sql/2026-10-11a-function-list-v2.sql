-- DESTINATION: sql/2026-10-11a-function-list-v2.sql
--
-- Rebuilds application_function against the actual 2026-09-30 locked-in
-- Function list (the 2026-10-08 version had drifted from it), then
-- consolidates further and adds Arts & Design after real scholar
-- profiles (sculpture, design, digital storytelling) turned out to have
-- no home in the list.
--
-- New application_function (10 values): research_development, policy,
-- healthcare_medicine, public_health, product_development, arts_design,
-- procurement_sourcing_negotiation, marketing_brand, sales, other.
-- Production, standalone Supply Chain, Administration, and
-- Management/Leadership are gone as Functions. "policy" replaces
-- "research_policy" (no longer framed as paired with research).
-- "sales" keeps its value, only its label changes (-> "Sales & Account
-- Management").
--
-- Also expands application_experience_area from 2 values to 7, to
-- recapture "direct service experience" signal for Functions that got
-- dropped (Consulting/Advisory, Teaching/Training, Design/Engineering,
-- Operations): project_management, client_relations,
-- consulting_advising, vendor_supplier_negotiation, workshop_delivery,
-- manufacturing_operations, product_commercialization.
-- "client_relations" keeps its value, only its label changes (->
-- "Client relationship management"). "workshop_delivery" keeps its
-- value, only its label changes (-> "Workshop facilitation").
--
-- Postgres can't add/drop/rename individual enum values in place, so
-- both types are dropped and recreated. Safe to do outright (no
-- backward-compat step) as long as application.intended_function and
-- application.experience_areas have no real submitted rows yet --
-- confirm before running.
--
-- Run each numbered block separately.

-- 1 of 8
alter table public.application drop column if exists intended_function;

-- 2 of 8
drop type if exists public.application_function;

-- 3 of 8
create type public.application_function as enum (
  'research_development',
  'policy',
  'healthcare_medicine',
  'public_health',
  'product_development',
  'arts_design',
  'procurement_sourcing_negotiation',
  'marketing_brand',
  'sales',
  'other'
);

-- 4 of 8
alter table public.application
  add column intended_function public.application_function;

-- 5 of 8
alter table public.application drop column if exists experience_areas;

-- 6 of 8
drop type if exists public.application_experience_area;

-- 7 of 8
create type public.application_experience_area as enum (
  'project_management',
  'client_relations',
  'consulting_advising',
  'vendor_supplier_negotiation',
  'workshop_delivery',
  'manufacturing_operations',
  'product_commercialization'
);

-- 8 of 8
alter table public.application
  add column experience_areas public.application_experience_area[];
