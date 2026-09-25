import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const REDIRECT_COOKIE = "nz_post_login_redirect";

/**
 * Where the magic-link email points. Supabase appends ?code=... (PKCE) or,
 * for older link formats, ?token_hash=...&type=email. We exchange it for a
 * session server-side (so the cookie lands via lib/supabase/server.ts) and
 * redirect on to wherever the user meant to end up.
 *
 * The destination comes from a cookie (set by login/page.tsx before
 * requesting the link), not a ?next= query param. Supabase's redirect_to
 * allow-list validation was silently stripping query strings off
 * emailRedirectTo and always falling back to the bare Site URL, even with
 * matching wildcard entries configured -- a cookie sidesteps that
 * entirely since emailRedirectTo no longer carries any query string.
 * Falls back to a bare ?next= param if present (e.g. an older email link
 * still in someone's inbox) and then to home.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const cookieStore = await cookies();
  const cookieNext = cookieStore.get(REDIRECT_COOKIE)?.value;
  const next = cookieNext
    ? decodeURIComponent(cookieNext)
    : searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      response.cookies.delete(REDIRECT_COOKIE);
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
