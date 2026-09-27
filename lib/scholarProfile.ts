// DESTINATION: lib/scholarProfile.ts
//
// scholar_profile holds the public listing/profile page content -- name,
// headshot, category/location/delivery, tagline, bio, background -- as a
// denormalized snapshot taken from the application at approval time (see
// the trigger in sql/2026-09-27d-scholar-profile-drop-account-requirement.sql),
// not a live join onto application/app_user. That's deliberate for two
// reasons: application has fields (references, contact info) that must
// never reach the public /profile/[slug] page, and RLS on
// application/app_user only allows review_sellers agents or the row's own
// owner to read them at all -- an anonymous visitor, or even a
// review_listings-only admin, couldn't join through to get a name or
// category otherwise. An admin can correct these copied fields by hand on
// the Listings tab if a seller's details change later.
//
// Keyed off application_id, not a seller/app_user account: applying
// doesn't require signing in, so most applications never get an
// applicant_user_id (same gap that caused the 2026-09-26 headshot_url
// bug) -- application_id is always present, so this works for every
// approved application regardless of whether the applicant ever created
// an account.
//
// Distinct from the `listing` table, which is a priced-service posting
// and stays unused for now (deferred per the decision to not do
// fixed-price services in this phase). One row per application,
// auto-created in 'draft' status when it's approved, then filled in and
// published by an admin on the review page's Listings tab.

import type { SupabaseClient } from "@supabase/supabase-js";

export type ScholarProfileStatus = "draft" | "published";

export interface ScholarProfileRow {
  id: string;
  application_id: string;
  // Readable URL slug (e.g. "ireti-akinrinade"), auto-generated from
  // full_name on approval with a -2/-3/... suffix on collision. This is
  // what /profile/[slug] looks up by -- id stays the primary key for
  // everything internal (FKs, reviewed_by), but was never meant to be a
  // public-facing URL.
  slug: string;
  full_name: string;
  headshot_url: string | null;
  // 0-100 vertical crop position for headshot_url (see ProfilePortrait) --
  // not_null with a default of 50 (centered) at the DB level, so this is
  // never null once a row exists.
  headshot_focal_y: number;
  submitted_headshot_url: string | null;
  intended_category: string | null;
  intended_category_other: string | null;
  city_country: string | null;
  work_modality: string | null;
  tagline: string;
  full_bio: string;
  background: string;
  experience_label: string | null;
  vetted_date: string | null;
  status: ScholarProfileStatus;
  reviewed_by: string | null;
  created_at: string;
}

/** Alias kept for callers written against the shape this used to be
 * joined into -- every field they expect is now directly on the row, so
 * this is just ScholarProfileRow under another name. */
export type ScholarProfileWithSeller = ScholarProfileRow;

const COLUMNS =
  "id, application_id, slug, full_name, headshot_url, headshot_focal_y, submitted_headshot_url, intended_category, intended_category_other, city_country, work_modality, " +
  "tagline, full_bio, background, experience_label, vetted_date, status, reviewed_by, created_at";

/** All scholar_profile rows, for the admin Listings tab. Requires review_listings (enforced by RLS). */
export async function fetchScholarProfilesForReview(
  supabase: SupabaseClient
): Promise<ScholarProfileRow[]> {
  const { data, error } = await supabase
    .from("scholar_profile")
    .select(COLUMNS)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ScholarProfileRow[];
}

/**
 * A single profile by slug -- used by both the admin edit view / "Preview
 * public page" link AND the public /profile/[slug] page itself. No
 * application-level status filter: visibility is left entirely to RLS,
 * which already does exactly the right thing per caller --
 * "anyone can read published scholar profiles" lets a public visitor see
 * a published row, and "review_listings agents can read all scholar
 * profiles" additionally lets a signed-in admin see a draft. An earlier
 * version of this filtered to status = 'published' unconditionally,
 * which meant the admin's own "Preview public page" link 404'd on any
 * draft -- exactly the case a preview link exists for. A public visitor
 * hitting an unpublished listing's URL still gets nothing back (RLS
 * blocks it for them), so /profile/[slug] correctly renders not-found
 * either way -- it just no longer double-enforces what RLS already
 * enforces, and in doing so no longer breaks admin previews.
 *
 * Looked up by slug rather than id: id is a uuid, meant to stay an
 * internal primary key, not something visitors see in the address bar.
 */
export async function fetchScholarProfile(
  supabase: SupabaseClient,
  slug: string
): Promise<ScholarProfileRow | null> {
  const { data, error } = await supabase
    .from("scholar_profile")
    .select(COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as ScholarProfileRow) ?? null;
}
