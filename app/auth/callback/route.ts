import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Where the magic-link email points. Supabase appends ?code=... (PKCE) or,
 * for older link formats, ?token_hash=...&type=email. We exchange it for a
 * session server-side (so the cookie lands via lib/supabase/server.ts) and
 * redirect on to wherever the user meant to end up -- defaults to home
 * since /apply and /admin/review don't exist yet.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
