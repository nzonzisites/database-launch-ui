// DESTINATION: app/apply/applicationOptions.ts
// (same app/apply/ folder as page.tsx and ApplicationFormClient.tsx)
//
// Pulled out of ApplicationFormClient.tsx so both the client form and the
// server-rendered "here's what you sent us" summary (page.tsx +
// ApplicationSummary.tsx) can turn a raw enum value like
// "cosmetic_chemistry_formulation_science" back into a human-readable
// label without duplicating the option lists.

export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "cosmetic_chemistry_formulation_science", label: "Cosmetic chemistry / formulation science" },
  { value: "supply_chain_procurement_sourcing", label: "Supply chain, procurement & sourcing" },
  { value: "materials_science", label: "Materials science" },
  { value: "mechanical_manufacturing_engineering", label: "Mechanical / manufacturing engineering" },
  { value: "industrial_design", label: "Industrial design" },
  { value: "applied_quant_qual_research", label: "Applied quant / qual research" },
  { value: "arts_cultural_research", label: "Arts & cultural research" },
  { value: "other", label: "Other" },
];

export const WORK_MODALITY_OPTIONS: { value: string; label: string }[] = [
  { value: "remote_only", label: "Remote" },
  { value: "travel_flexible", label: "Travel required" },
  { value: "both", label: "Either" },
];

// Note: the mockup's reference contact-method dropdown shows "Phone
// number (US)" / "WhatsApp (international)", but the real
// reference_contact_method enum is email/phone -- built against the real
// enum, not the mockup's copy, per how the rest of this schema work has
// gone. WhatsApp availability is still captured separately when phone is
// selected, same as before.
export const REFERENCE_CONTACT_METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone number" },
];

export const SECTOR_OPTIONS: { value: string; label: string }[] = [
  { value: "food_beverage", label: "Food and beverage" },
  { value: "agriculture_botanicals", label: "Agriculture and botanicals" },
  { value: "beauty_personal_care", label: "Beauty and personal care" },
  { value: "household_products", label: "Household products" },
  { value: "packaging", label: "Packaging" },
  { value: "apparel_textiles", label: "Apparel and textiles" },
  { value: "pharmaceuticals", label: "Pharmaceuticals" },
  { value: "industrial_manufacturing", label: "Industrial and manufacturing" },
  { value: "cultural_heritage_institutions", label: "Cultural and heritage institutions" },
  { value: "other", label: "Other" },
];

export const RATE_BAND_OPTIONS: { value: string; label: string }[] = [
  { value: "under_250", label: "Under $250" },
  { value: "250_1000", label: "$250 – $1,000" },
  { value: "1000_5000", label: "$1,000 – $5,000" },
  { value: "5000_15000", label: "$5,000 – $15,000" },
  { value: "15000_plus", label: "$15,000+" },
  { value: "first_paid_engagement", label: "This was my first paid engagement" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const CAPACITY_OPTIONS: { value: string; label: string }[] = [
  { value: "none_currently", label: "None currently" },
  { value: "one", label: "One" },
  { value: "two_to_three", label: "Two to three" },
  { value: "four_or_more", label: "Four or more" },
];

export const PRIOR_PAID_WORK_OPTIONS: { value: string; label: string }[] = [
  { value: "yes_regularly", label: "Yes, regularly" },
  { value: "yes_once_or_twice", label: "Yes, once or twice" },
  { value: "not_yet", label: "Not yet" },
];

/** Looks up the human-readable label for a raw enum value; falls back to
 * the raw value itself (with underscores turned into spaces) if it's not
 * in the option list, so an unexpected/legacy value still renders as
 * something readable instead of disappearing. */
export function optionLabel(options: { value: string; label: string }[], value: string | null | undefined): string {
  if (!value) return "";
  const match = options.find((opt) => opt.value === value);
  if (match) return match.label;
  return value.replace(/_/g, " ");
}
