import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Service-role Supabase client -- bypasses RLS entirely. Server-only:
 * never import this from a Client Component, and never from code that
 * could ship to the browser. Used by the draft-reminder cron route
 * (app/api/cron/draft-reminders), which has to see every applicant's
 * stale draft across all users, not just whatever the anon/authenticated
 * RLS policies would let one signed-in applicant see of their own row.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (Supabase dashboard -> Project
 * Settings -> API -> "service_role" key -- NOT the anon key) in addition
 * to the existing NEXT_PUBLIC_SUPABASE_URL. See .env.example.
 */
export function getSupabaseAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase admin client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY (see .env.example)."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
