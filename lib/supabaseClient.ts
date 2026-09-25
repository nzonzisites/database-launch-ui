import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Lazily-created singleton so a missing env var (e.g. local dev without a
// .env yet) doesn't crash the whole app at import time -- it only throws
// when something actually tries to talk to Supabase.
//
// Uses createBrowserClient (from @supabase/ssr) rather than plain
// createClient: it stores the auth session in cookies instead of
// localStorage, so lib/supabase/server.ts (Server Components, Route
// Handlers, middleware) sees the same signed-in session as the browser.
// Anonymous callers (submitProspectSignup, submitScholarApplication, etc.)
// are unaffected -- this only matters once a user is actually signed in.
let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example)."
    );
  }

  client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}
