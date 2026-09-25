import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Server-side Supabase client for use in Server Components, Route Handlers,
 * and middleware — reads/writes the auth session via cookies so it stays in
 * sync with the browser client in lib/supabaseClient.ts. Create a fresh one
 * per request (cookies() is request-scoped); don't cache this like the
 * browser singleton.
 */
export async function getSupabaseServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example)."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component render, which can't set cookies.
          // Safe to ignore as long as middleware.ts is refreshing sessions.
        }
      },
    },
  });
}
