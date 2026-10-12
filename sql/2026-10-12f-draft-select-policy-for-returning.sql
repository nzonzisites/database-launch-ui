-- DESTINATION: sql/2026-10-12f-draft-select-policy-for-returning.sql
--
-- Root cause of "new row violates row-level security policy for table
-- application" on every draft save (continue, autosave, and the first
-- insert alike).
--
-- This was never actually a WITH CHECK failure on the insert/update
-- itself -- confirmed by testing the exact same row both with and
-- without a RETURNING clause as the anon role: the bare insert always
-- succeeded, and only ever failed once RETURNING was added.
--
-- Postgres raises this identical error message in one more case besides
-- a genuine WITH CHECK failure: when an INSERT/UPDATE has a RETURNING
-- clause and the resulting row isn't visible under any SELECT policy,
-- it can't return it, and reports that as an RLS violation rather than
-- silently omitting the row.
--
-- saveApplicationDraft always chains .select("id, resume_code").single()
-- after its insert/update (needed to hand the id and resume code back
-- to the browser) -- which PostgREST implements as INSERT/UPDATE ...
-- RETURNING. For an anonymous draft (applicant_user_id is null), no
-- existing SELECT policy covers that row: "applicants can read their
-- own application" requires an app_user ownership match with no
-- IS NULL fallback (unlike the draft UPDATE policy added in 2026-10-12a,
-- which does have one). The original submitApplication insert never hit
-- this, because it never chains .select() after inserting.
--
-- Fix: add a SELECT policy for draft rows specifically, mirroring the
-- exact same trust model the draft UPDATE policy already established
-- (anonymous apps can touch their own unowned draft by id) -- this
-- grants no more access than that policy already implies, since anyone
-- who could already blind-update such a row could already overwrite it
-- with whatever they wanted to read back anyway.

create policy "applicants can read their own draft application"
  on public.application
  for select
  using (
    status = 'draft'
    and (
      applicant_user_id is null
      or applicant_user_id in (
        select id from public.app_user where auth_provider_id = auth.uid()
      )
    )
  );
