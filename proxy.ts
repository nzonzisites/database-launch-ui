import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Refreshes the Supabase auth session cookie on every request. Required by
 * the @supabase/ssr cookie-based auth pattern: without this, a session can
 * expire silently between requests and server-side reads (e.g. the
 * /admin/review allowlist check) would see a stale signed-out state.
 * See lib/supabase/server.ts for where the resulting session is read.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!supabaseUrl || !supabaseAnonKey) {
    // No Supabase configured (e.g. fresh local checkout without .env yet)
    // -- nothing to refresh, let the request through as-is.
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Touches the session so an expiring token gets refreshed. Not used for
  // route protection here -- /admin/review does its own allowlist check.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
