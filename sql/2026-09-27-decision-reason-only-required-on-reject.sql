-- decision_reason_required previously demanded a non-null decision_reason
-- for BOTH approved and rejected:
--   CHECK ((status <> ALL (ARRAY['approved','rejected'])) OR decision_reason IS NOT NULL)
-- but the app only ever collects a reason on reject -- approveApplication
-- (app/admin/review/actions.ts) explicitly writes decision_reason: null,
-- and only rejectApplication validates a non-empty reason (both
-- client-side in ReviewQueueClient.tsx and again server-side). Every
-- approve click was failing this check.
--
-- Narrows the constraint to only require a reason on reject.

alter table public.application drop constraint decision_reason_required;

alter table public.application
  add constraint decision_reason_required
  check (status <> 'rejected'::application_status or decision_reason is not null);
