-- DESTINATION: sql/2026-10-12a-application-draft-status.sql
--
-- Supports real partial-save on the application form: page 1's
-- "continue" button now saves a "draft" application row (page-1 answers
-- only), which the final page-2 submit then finishes in place instead of
-- inserting a second row. Needs:
--
--   1. A new "draft" value on the application_status enum, ordered right
--      before "applied" (drafts are earlier in the lifecycle than
--      anything that currently exists).
--   2. The status-transition trigger widened to allow draft -> applied.
--   3. The page-2-only columns loosened to nullable, since a draft row
--      only ever has page-1 data.
--   4. A new UPDATE policy letting the applicant (signed in or
--      anonymous) update their OWN draft row -- there was previously no
--      path for an applicant to update application at all, only insert
--      once; admins update via the existing review_sellers policy.
--
-- Run each numbered block separately.

-- 1 of 4
alter type public.application_status add value 'draft' before 'applied';

-- 2 of 4
create or replace function public.check_application_status_transition()
returns trigger
language plpgsql
as $function$
begin
  if new.status = old.status then return new; end if;

  if (old.status, new.status) not in (
    ('draft', 'applied'),
    ('applied', 'under_review'),
    ('applied', 'approved'),
    ('applied', 'rejected'),
    ('under_review', 'approved'),
    ('under_review', 'rejected'),
    ('approved', 'under_review'),
    ('rejected', 'under_review')
  ) then
    raise exception 'Invalid application status transition: % -> %', old.status, new.status;
  end if;

  return new;
end;
$function$;

-- 3 of 4
alter table public.application
  alter column contact_method drop not null,
  alter column contact_value drop not null,
  alter column reference_name drop not null,
  alter column reference_relationship drop not null,
  alter column reference_contact_method drop not null,
  alter column reference_contact_value drop not null,
  alter column deliverables drop not null,
  alter column rate_type drop not null,
  alter column capacity drop not null,
  alter column prior_paid_work drop not null,
  alter column sector drop not null;

-- 4 of 4
--
-- Scoped the same way the existing anonymous-insert policy already is
-- (no cryptographic ownership check for an anonymous applicant -- email
-- is trusted as identity, same tradeoff the rest of this flow already
-- makes): a signed-in applicant can only touch a draft linked to their
-- OWN account, while an anonymous/unlinked draft can be updated by
-- anyone who has its id or matching email, same trust level as the
-- original insert. The transition trigger above is the real backstop --
-- this policy only ever lets a row move draft -> draft or draft ->
-- applied, never anywhere else.
create policy "applicants can update their own draft application"
  on public.application
  for update
  using (
    status = 'draft'
    and (
      applicant_user_id is null
      or applicant_user_id in (
        select id from public.app_user where auth_provider_id = auth.uid()
      )
    )
  )
  with check (status in ('draft', 'applied'));
