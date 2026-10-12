-- DESTINATION: sql/2026-10-12g-draft-save-remaining-gaps.sql
--
-- Three more gaps found testing the draft-save path end to end as the
-- anon role, each validated directly against a disposable transaction
-- before landing here:
--
--   1. The SELECT policy added in 2026-10-12f only covered status =
--      'draft'. Postgres's RLS also requires the POST-update row to
--      stay visible under the table's SELECT policies as part of
--      validating the update itself (not just when a client chains
--      .select()) -- so submitApplication's draft -> applied transition
--      was being rejected the row stopped matching that policy the
--      moment its status changed. Replaced with a policy that covers
--      an anonymous application's own row regardless of status (mirrors
--      the trust level the insert/update policies already established:
--      anyone holding an anonymous application's id can already
--      blind-update it, so letting them read it back is no new
--      exposure).
--
--   2. anon never had base UPDATE privilege on public.application at
--      the table-privilege level (confirmed via
--      information_schema.role_table_grants -- authenticated had it,
--      anon didn't). RLS policies only restrict an operation that's
--      already permitted; they don't grant it. Nothing before drafts
--      ever needed anon to update this table, so this was never hit
--      until now.
--
--   3. work_samples_explanation_required rejects any row with an empty
--      work_samples and no explanation -- correct for a final
--      submission, but it was firing on every incomplete draft too
--      (empty work samples is the normal state before someone reaches
--      that question). Exempted draft rows, same "only enforce once
--      finalized" pattern 2026-10-12a already used for the NOT NULL
--      columns.

-- 1 of 3
drop policy "applicants can read their own draft application" on public.application;
create policy "applicants can read their own application (anonymous)"
  on public.application
  for select
  using (applicant_user_id is null);

-- 2 of 3
grant update on public.application to anon;

-- 3 of 3
alter table public.application
  drop constraint work_samples_explanation_required,
  add constraint work_samples_explanation_required
    check (status = 'draft' or work_samples <> '[]'::jsonb or work_samples_explanation is not null);
