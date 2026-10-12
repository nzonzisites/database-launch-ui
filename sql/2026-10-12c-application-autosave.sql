-- DESTINATION: sql/2026-10-12c-application-autosave.sql
--
-- Supports real autosave on the application form: instead of only
-- saving a draft when "continue" is clicked, the form now autosaves
-- a few seconds after any change, on either page, starting as soon as
-- an email is typed (the one thing a draft row still always needs, so
-- there's an identity to save it under).
--
-- A few seconds after typing, the row can be genuinely incomplete --
-- e.g. industry not chosen yet -- so the remaining page-1-only columns
-- that were still NOT NULL (full_name, city_country, intended_function,
-- work_modality, expertise_narrative, infrastructure_narrative,
-- full_bio) need to come loose too, the same way the page-2-only ones
-- already did in 2026-10-12a. email stays required -- the client never
-- attempts a save before one is typed.
--
-- Run this one block.

alter table public.application
  alter column full_name drop not null,
  alter column city_country drop not null,
  alter column intended_function drop not null,
  alter column work_modality drop not null,
  alter column expertise_narrative drop not null,
  alter column infrastructure_narrative drop not null,
  alter column full_bio drop not null;
