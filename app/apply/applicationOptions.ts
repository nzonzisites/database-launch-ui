// DESTINATION: app/apply/applicationOptions.ts
// (same app/apply/ folder as page.tsx and ApplicationFormClient.tsx)
//
// Pulled out of ApplicationFormClient.tsx so both the client form and the
// server-rendered "here's what you sent us" summary (page.tsx +
// ApplicationSummary.tsx) can turn a raw enum value like
// "cosmetic_chemistry_formulation_science" back into a human-readable
// label without duplicating the option lists.
//
// CATEGORY_OPTIONS is kept, unchanged, purely for display of applications
// submitted before 2026-09-30 -- new applications no longer ask Category
// at all; FUNCTION_OPTIONS (below) replaced it as the intake question.

export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "cosmetic_chemistry_formulation_science", label: "Cosmetic chemistry / formulation science" },
  { value: "supply_chain_procurement_sourcing", label: "Supply chain, procurement & sourcing" },
  { value: "materials_science", label: "Materials science" },
  { value: "mechanical_manufacturing_engineering", label: "Mechanical / manufacturing engineering" },
  { value: "industrial_design", label: "Industrial design" },
  { value: "applied_quant_qual_research", label: "Applied quant & qual research" },
  { value: "arts_cultural_research", label: "Arts & cultural research" },
  { value: "other", label: "Other" },
];

export const FUNCTION_OPTIONS: { value: string; label: string }[] = [
  { value: "arts_design", label: "Arts & Design" },
  { value: "healthcare_medicine", label: "Healthcare & Medicine" },
  { value: "marketing_brand", label: "Marketing & Brand Building" },
  { value: "policy", label: "Policy" },
  { value: "procurement_sourcing_negotiation", label: "Procurement, Sourcing & Negotiations" },
  { value: "product_development", label: "Product Development" },
  { value: "public_health", label: "Public Health" },
  { value: "research_development", label: "Research & Development" },
  { value: "sales", label: "Sales & Account Management" },
  { value: "other", label: "Other" },
];

// Rebuilt 2026-10-11 against the actual locked-in Function list from
// 2026-09-30 (the 2026-10-08 version had drifted from it -- see that
// commit's discussion). Production, Supply Chain (on its own),
// Administration, and Management/Leadership are gone as standalone
// Functions; Policy no longer implies "paired with Research"; Arts &
// Design was added after real scholar profiles (sculpture, design,
// digital storytelling) had no home in the list. Experience Areas
// below was expanded at the same time to recapture the "direct
// service experience" signal that dropping Consulting/Advisory,
// Teaching/Training, Design/Engineering, and Operations as Functions
// would otherwise lose.
export const EXPERIENCE_AREA_OPTIONS: { value: string; label: string }[] = [
  { value: "project_management", label: "Project management" },
  { value: "client_relations", label: "Client relationship management" },
  { value: "consulting_advising", label: "Consulting and advising" },
  { value: "vendor_supplier_negotiation", label: "Vendor or supplier negotiation" },
  { value: "workshop_delivery", label: "Workshop facilitation" },
  { value: "manufacturing_operations", label: "Manufacturing operations" },
  { value: "product_commercialization", label: "Product commercialization" },
];

// Rebuilt 2026-10-17 as a genuine multi-select (any combination of
// Virtual / Local / Willing to Travel) rather than three mutually
// exclusive options where "both" stood in for "both of the other two" --
// work_modality is now text[] on application/scholar_profile instead of
// a single value. remote_only/travel_flexible/both are gone as values;
// existing rows were translated (remote_only -> {virtual},
// travel_flexible -> {travel}, both -> {virtual,travel}) by the SQL
// migration that changed the column type.
export const WORK_MODALITY_OPTIONS: { value: string; label: string }[] = [
  { value: "virtual", label: "Virtual" },
  { value: "local", label: "Local" },
  { value: "travel", label: "Willing to Travel" },
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

// Replaced fixed USD bands (2026-10-01) -- a dollar band collapsed
// everyone paid in a weaker currency into "under $250" regardless of
// whether that payment was a strong, professional-market rate locally,
// while conflating purchasing-power differences with actual differences
// in expertise. Collecting the raw amount + currency instead keeps a
// real number Nzonzi can normalize to USD at review time (using the
// rate at time of application), rather than losing that signal to
// whatever band the applicant's mental FX conversion happened to land
// in.
export const RATE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "amount", label: "I can give an amount" },
  { value: "first_paid_engagement", label: "This was my first paid engagement" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const CURRENCY_OPTIONS: { value: string; label: string }[] = [
  { value: "USD", label: "USD" },
  { value: "NGN", label: "NGN (Naira)" },
  { value: "GBP", label: "GBP" },
  { value: "EUR", label: "EUR" },
  { value: "GHS", label: "GHS (Cedi)" },
  { value: "KES", label: "KES (Shilling)" },
  { value: "ZAR", label: "ZAR (Rand)" },
  { value: "other", label: "Other" },
];

// The follow-up question discussed alongside the amount/currency
// redesign: a self-assessed relative-to-market data point, distinct
// from (and no substitute for) the actual amount -- it's meant to
// surface scholars who are underpriced locally relative to their peers
// and could command more from a buyer, not to replace the hard number
// above. Only asked when an amount was actually given -- there's
// nothing to size up against "typical" otherwise.
export const RATE_RELATIVE_OPTIONS: { value: string; label: string }[] = [
  { value: "below_typical", label: "Below typical for my market" },
  { value: "typical", label: "About typical for my market" },
  { value: "above_typical", label: "Above typical for my market" },
  { value: "not_sure", label: "Not sure" },
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
