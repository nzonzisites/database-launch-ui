-- DESTINATION: sql/2026-10-01a-application-rate-amount.sql
--
-- Replaces the fixed USD rate bands with a raw amount + currency,
-- plus a new "relative to typical for their market" follow-up.
-- See the chat for the full reasoning: a USD band conflates currency
--/purchasing-power differences with actual differences in what a
-- scholar commands, which is exactly backwards for a question whose
-- whole purpose is figuring out what tier to position someone at for
-- a buyer.
--
-- rate_band / application_rate_band are dropped outright rather than
-- kept for backward compatibility -- they were only added this week
-- (sql/2026-09-30a, if it's been run) and nothing has been pushed to
-- production yet, so there's no live data to preserve. If real
-- applications have already come in with rate_band set, stop and say
-- so before running block 5 -- that data would need to be migrated
-- into rate_amount/rate_currency first, not just dropped.
--
-- Run each numbered block separately.

-- 1 of 5
create type public.application_rate_type as enum (
  'amount',
  'first_paid_engagement',
  'prefer_not_to_say'
);

-- 2 of 5
create type public.application_rate_relative_to_market as enum (
  'below_typical',
  'typical',
  'above_typical',
  'not_sure'
);

-- 3 of 5
alter table public.application
  add column rate_type public.application_rate_type,
  add column rate_amount numeric,
  add column rate_currency text,
  add column rate_relative_to_market public.application_rate_relative_to_market;

-- 4 of 5
alter table public.application
  drop column if exists rate_band;

-- 5 of 5
drop type if exists public.application_rate_band;
