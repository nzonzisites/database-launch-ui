-- Lets the review queue show WHO approved/rejected an application or
-- published/edited a listing, instead of just the raw reviewed_by uuid.
--
-- Doesn't broaden RLS on app_user/platform_agent (those stay restricted
-- to a user's own row) -- instead, a SECURITY DEFINER function looks up
-- just the display name for a given set of platform_agent ids, same
-- pattern already used for get_application_draft_by_resume_code. Any
-- authenticated caller can run it, but all it returns is a reviewer's
-- name/email for an agent id they must already have (from a
-- reviewed_by column they could only see because RLS already let them
-- read that application/scholar_profile row in the first place).

create or replace function public.get_reviewer_names(agent_ids uuid[])
returns table (agent_id uuid, display_name text)
language sql
security definer
set search_path = public
as $$
  select pa.id, coalesce(nullif(au.full_name, ''), au.email)
  from platform_agent pa
  join app_user au on au.id = pa.user_id
  where pa.id = any(agent_ids)
$$;

grant execute on function public.get_reviewer_names(uuid[]) to authenticated;
