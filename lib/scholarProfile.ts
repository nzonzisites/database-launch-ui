// DESTINATION: lib/scholarProfile.ts
//
// scholar_profile holds the public listing/profile page content -- name,
// headshot, category/location/delivery, tagline, bio, background -- as a
// denormalized snapshot taken from the application at approval time (see
// the trigger in sql/2026-09-27c-scholar-profile.sql), not a live join
// onto application/app_user. That's deliberate: application has fields
// (references, contact info) that must never reach the public
// /profile/[id] page, and RLS on application/app_user only allows
// review_sellers agents or the row's own owner to read them at all -- an
// anonymous visitor, or even a review_listings-only admin, couldn't join
// through to get a name or category otherwise. An admin can correct
// these copied fields by hand on the Listings tab if a seller's details
// change later.
//
// Distinct from the `listing` table, which is a priced-service posting
// and stays unused for now (deferred per the decision to not do
// fixed-price services in this phase). One row per seller, auto-created
// in 'draft' status when an application is approved, then filled in and
// published by an admin on the review page's Listings tab.

import type { SupabaseClient } from "@supabase/supabase-js";

export type ScholarProfileStatus = "draft" | "published";

export interface ScholarProfileRow {
  id: string;
  seller_id: string;
  full_name: string;
  headshot_url: string | null;
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
  "id, seller_id, full_name, headshot_url, intended_category, intended_category_other, city_country, work_modality, " +
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

/** A single profile by id, for the admin edit view / preview link. No status filter -- admins can open drafts. */
export async function fetchScholarProfileForAdmin(
  supabase: SupabaseClient,
  id: string
): Promise<ScholarProfileRow | null> {
  const { data, error } = await supabase
    .from("scholar_profile")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as ScholarProfileRow) ?? null;
}

/**
 * A single PUBLISHED profile by id, for the public /profile/[id] page.
 * Returns null for a draft or missing id -- the public page treats that
 * as not-found rather than distinguishing "doesn't exist" from "not
 * published yet" (RLS already only allows reading published rows for a
 * non-admin caller, so this filter mostly documents that, but a
 * signed-in admin's client can see drafts too -- the explicit filter
 * keeps the public page's own behavior correct regardless of who's
 * viewing it).
 */
export async function fetchPublishedScholarProfile(
  supabase: SupabaseClient,
  id: string
): Promise<ScholarProfileRow | null> {
  const { data, error } = await supabase
    .from("scholar_profile")
    .select(COLUMNS)
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as ScholarProfileRow) ?? null;
}
