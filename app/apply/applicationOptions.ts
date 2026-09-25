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
