-- DESTINATION: sql/2026-11-13b-listing-data-cleanup.sql
--
-- Data-only fixes from Modupe's 2026-11-13 review of the 7 published
-- listings' actual submitted responses. No schema changes here (the
-- pronouns column/backfill is sql/2026-11-13a). Updates both
-- `application` (the original submission) and `scholar_profile` (the
-- public listing, snapshotted from it at approval) so the two stay in
-- sync -- scholar_profile is the one that actually matters for what's
-- shown publicly.
--
-- Run each numbered block separately. Nothing here is destructive in a
-- way that can't be re-run safely (each targets specific slugs/values).

-- 1 of 6
-- "United States" standardized. Only the two known non-standard
-- spellings from the published-listings review -- see block 1b below for
-- a read-only check across everything else (drafts, rejected, etc.)
-- before deciding whether to extend this.
update public.scholar_profile
set city_country = 'New York, United States'
where slug = 'ireti-akinrinade' and city_country = 'New York, USA';

update public.application
set city_country = 'New York, United States'
where id = (select application_id from public.scholar_profile where slug = 'ireti-akinrinade')
  and city_country = 'New York, USA';

update public.scholar_profile
set city_country = 'Washigton, DC, United States'
where slug = 'uchenna-ezejiofor' and city_country = 'Washigton, DC, United Sates of America';

update public.application
set city_country = 'Washigton, DC, United States'
where id = (select application_id from public.scholar_profile where slug = 'uchenna-ezejiofor')
  and city_country = 'Washigton, DC, United Sates of America';

-- 1b of 6 (read-only -- run this to see if "across the board" needs to
-- reach further than the two rows above; nothing here is applied
-- automatically)
select id, full_name, city_country, residences
from public.application
where city_country ~* '\y(usa|u\.s\.a\.|u\.s\.|united sates)\y'
   or exists (
        select 1 from jsonb_array_elements(coalesce(residences, '[]'::jsonb)) r
        where (r->>'country') ~* '\y(usa|u\.s\.a\.|u\.s\.|united sates)\y'
      );

-- 2 of 6
-- Laura's residence -- Pretoria, South Africa (she'd entered the country
-- name as both the city and the country; her only affiliation is the
-- University of Pretoria).
update public.scholar_profile
set city_country = 'Pretoria, South Africa',
    residences = '[{"city": "Pretoria", "country": "South Africa", "is_primary": true}]'::jsonb
where slug = 'laura-chipofya';

update public.application
set city_country = 'Pretoria, South Africa',
    residences = '[{"city": "Pretoria", "country": "South Africa", "is_primary": true}]'::jsonb
where id = (select application_id from public.scholar_profile where slug = 'laura-chipofya');

-- 3 of 6
-- Uchenna -> Uche (first name only; slug is left as-is so existing
-- /profile/uchenna-ezejiofor links keep working).
update public.scholar_profile
set full_name = 'Uche Ezejiofor'
where slug = 'uchenna-ezejiofor';

update public.application
set full_name = 'Uche Ezejiofor'
where id = (select application_id from public.scholar_profile where slug = 'uchenna-ezejiofor');

-- 4 of 6
-- Country of origin: Ireti -> Nigeria & Barbados, Uche -> Nigeria,
-- Joan -> Kenya (replacing "Kenyan-American", which is a nationality
-- label, not a country).
update public.scholar_profile set country_of_origin = 'Nigeria & Barbados' where slug = 'ireti-akinrinade';
update public.application set country_of_origin = 'Nigeria & Barbados'
  where id = (select application_id from public.scholar_profile where slug = 'ireti-akinrinade');

update public.scholar_profile set country_of_origin = 'Nigeria' where slug = 'uchenna-ezejiofor';
update public.application set country_of_origin = 'Nigeria'
  where id = (select application_id from public.scholar_profile where slug = 'uchenna-ezejiofor');

update public.scholar_profile set country_of_origin = 'Kenya' where slug = 'joan-mukogosi';
update public.application set country_of_origin = 'Kenya'
  where id = (select application_id from public.scholar_profile where slug = 'joan-mukogosi');

-- 5 of 6
-- Adinawa's affiliation -- her bio names Carnegie Mellon, but
-- affiliations came in empty.
update public.scholar_profile
set affiliations = array['Carnegie Mellon University']
where slug = 'adinawa-adjagbodjou';

update public.application
set affiliations = array['Carnegie Mellon University']
where id = (select application_id from public.scholar_profile where slug = 'adinawa-adjagbodjou');

-- 6 of 6
-- Retroactive fix for affiliations answered as one comma-separated
-- string instead of separate entries (Uche's case: four schools crammed
-- into a single array element) -- expands any such element into multiple
-- real entries, system-wide, on both tables. The form itself now splits
-- on commas going forward (app/apply/ApplicationFormClient.tsx's
-- MultiValueField, 2026-11-13), so this only matters for rows submitted
-- before that fix. Only touches rows that actually have a comma in one
-- of their affiliation entries -- everyone else's affiliations are left
-- byte-for-byte unchanged.
update public.application a
set affiliations = (
  select array_agg(trim(x))
  from unnest(a.affiliations) as elem,
       unnest(string_to_array(elem, ',')) as x
)
where a.affiliations is not null
  and exists (select 1 from unnest(a.affiliations) e where e like '%,%');

update public.scholar_profile sp
set affiliations = (
  select array_agg(trim(x))
  from unnest(sp.affiliations) as elem,
       unnest(string_to_array(elem, ',')) as x
)
where sp.affiliations is not null
  and exists (select 1 from unnest(sp.affiliations) e where e like '%,%');
