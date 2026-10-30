"use client";

import { useState, useTransition } from "react";
import type { CSSProperties, ReactNode } from "react";
import { BROWN, SAND, MOSS, OCHRE, WHITE } from "@/lib/colors";
import type { ScholarProfileWithSeller } from "@/lib/scholarProfile";
import { FUNCTION_OPTIONS, EXPERIENCE_AREA_OPTIONS, WORK_MODALITY_OPTIONS, SECTOR_OPTIONS } from "@/app/apply/applicationOptions";
import { publishScholarProfile, unpublishScholarProfile, updateScholarProfile } from "./scholarProfileActions";
import { getSupabaseClient } from "@/lib/supabaseClient";
import SectorOtherInputs from "@/app/apply/SectorOtherInputs";

const HEADSHOT_BUCKET = "scholar-headshots";

// The bucket rejects anything over 5MB (file_size_limit in
// sql/2026-09-27g-scholar-headshot-upload.sql), so aim a little under
// it. Headshots never need more than ~2000px on the long side -- the
// listing shows them at most a few hundred px wide.
const HEADSHOT_MAX_BYTES = 4.5 * 1024 * 1024;
const HEADSHOT_MAX_SIDE = 2000;

/**
 * Shrinks a photo in the browser before upload, so a straight-off-the-
 * camera image doesn't bounce off the bucket's size cap. Files already
 * under both limits go through untouched; anything bigger is redrawn at
 * HEADSHOT_MAX_SIDE on its long side and re-encoded as JPEG, stepping
 * the quality (then the size) down until it fits.
 */
async function shrinkHeadshot(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const longSide = Math.max(bitmap.width, bitmap.height);
  if (file.size <= HEADSHOT_MAX_BYTES && longSide <= HEADSHOT_MAX_SIDE) {
    bitmap.close();
    return file;
  }

  let side = Math.min(longSide, HEADSHOT_MAX_SIDE);
  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      const scale = side / longSide;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Couldn't resize that image.");
      // JPEG has no transparency -- fill white so a transparent PNG
      // doesn't come out with a black background.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.88, 0.78, 0.68]) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", quality)
        );
        if (blob && blob.size <= HEADSHOT_MAX_BYTES) {
          const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
          return new File([blob], name, { type: "image/jpeg" });
        }
      }
      side = Math.round(side * 0.75);
    }
  } finally {
    bitmap.close();
  }
  throw new Error("Couldn't shrink that image under 5MB -- try a smaller file.");
}

const thumbStyle: CSSProperties = {
  width: 88,
  height: 88,
  objectFit: "cover",
  display: "block",
  border: "1px solid rgba(230,222,210,0.25)",
};

// Row-header thumbnail, shown collapsed -- unlike the Applications tab
// (which never showed a real headshot, just a decorative placeholder),
// this one is real: headshot_url is the admin-controlled, actually-live
// image, so showing it here at a glance is meaningful in a way it
// wasn't there.
const miniThumbStyle: CSSProperties = {
  width: 32,
  height: 32,
  flex: "none",
  objectFit: "cover",
  border: "1px solid rgba(230,222,210,0.2)",
};

const miniThumbPlaceholderStyle: CSSProperties = {
  width: 32,
  height: 32,
  flex: "none",
  backgroundImage: "repeating-linear-gradient(135deg, rgba(230,222,210,0.22) 0 4px, transparent 4px 8px)",
  border: "1px solid rgba(230,222,210,0.2)",
};

// Mirrors ProfilePortrait on the public page exactly: same 1:1
// aspect-ratio box and object-fit: cover, so a crop set here looks
// identical on the live listing regardless of the admin's own screen
// width. (An earlier version of this used a fixed 340x480 box, which
// crops on a different axis than the live page's box -- for a
// wider-than-tall headshot that meant this preview cropped the sides
// while the real page cropped top/bottom, so the vertical "adjust crop"
// slider visibly did nothing here even though it was working.)
const PREVIEW_WIDTH = 320;

const previewBoxStyle: CSSProperties = {
  position: "relative",
  width: PREVIEW_WIDTH,
  aspectRatio: "1 / 1",
  overflow: "hidden",
  border: "1px solid rgba(230,222,210,0.25)",
  background: "rgba(230,222,210,0.06)",
};

const monoLabel: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9.5,
  letterSpacing: "0.13em",
  textTransform: "uppercase",
  opacity: 0.55,
};

const fieldStyle: CSSProperties = {
  width: "100%",
  border: "1px solid rgba(230,222,210,0.35)",
  background: "transparent",
  color: SAND,
  padding: 10,
  fontSize: 14,
  fontFamily: "inherit",
};

export default function ListingsTabClient({ profiles }: { profiles: ScholarProfileWithSeller[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2.2fr 1.4fr 1fr 1fr",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9.5,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
          opacity: 0.5,
          padding: "16px 14px 12px",
        }}
      >
        <span>Scholar</span>
        <span>Listing descriptor</span>
        <span>Status</span>
        <span style={{ textAlign: "right" }}>Action</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {profiles.length === 0 && (
          <p style={{ ...monoLabel, padding: "16px 14px" }}>
            No listings yet — one is created automatically the first time an application is approved.
          </p>
        )}
        {profiles.map((p) => (
          <ListingRow
            key={p.id}
            profile={p}
            expanded={expandedId === p.id}
            onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
          />
        ))}
      </div>
    </>
  );
}

function ListingRow({
  profile: p,
  expanded,
  onToggle,
}: {
  profile: ScholarProfileWithSeller;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [headshotUrl, setHeadshotUrl] = useState(p.headshot_url ?? "");
  const [headshotFocalY, setHeadshotFocalY] = useState(p.headshot_focal_y ?? 50);
  const [listingDescriptor, setListingDescriptor] = useState(p.intended_category ?? "");
  const [intendedFunction, setIntendedFunction] = useState(p.intended_function ?? "");
  const [intendedFunctionOther, setIntendedFunctionOther] = useState(p.intended_function_other ?? "");
  const [cityCountry, setCityCountry] = useState(p.city_country ?? "");
  const [residences, setResidences] = useState<{ city: string; country: string; is_primary: boolean }[]>(
    p.residences ?? []
  );
  const [countryOfOrigin, setCountryOfOrigin] = useState(p.country_of_origin ?? "");
  const [affiliations, setAffiliations] = useState<string[]>(p.affiliations ?? []);
  const [affiliationDraft, setAffiliationDraft] = useState("");
  const [workModality, setWorkModality] = useState<string[]>(p.work_modality ?? []);
  const [experienceAreas, setExperienceAreas] = useState<string[]>(p.experience_areas ?? []);
  const [tagline, setTagline] = useState(p.tagline);
  const [fullBio, setFullBio] = useState(p.full_bio);
  const [background, setBackground] = useState(p.background);
  const [experienceLabel, setExperienceLabel] = useState(p.experience_label ?? "");
  const [vettedDate, setVettedDate] = useState(p.vetted_date ?? "");
  const [sector, setSector] = useState<string[]>(p.sector ?? []);
  const [sectorOther, setSectorOther] = useState(p.sector_other ?? "");

  function toggleSector(value: string) {
    setSector((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function toggleWorkModality(value: string) {
    setWorkModality((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function toggleExperienceArea(value: string) {
    setExperienceAreas((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function addResidence() {
    setResidences((prev) => [...prev, { city: "", country: "", is_primary: prev.length === 0 }]);
  }

  function updateResidence(index: number, key: "city" | "country", value: string) {
    setResidences((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  }

  function setPrimaryResidence(index: number) {
    setResidences((prev) => prev.map((r, i) => ({ ...r, is_primary: i === index })));
  }

  function removeResidence(index: number) {
    setResidences((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some((r) => r.is_primary)) next[0].is_primary = true;
      return next;
    });
  }

  function addAffiliation() {
    const trimmed = affiliationDraft.trim();
    if (!trimmed) return;
    setAffiliations((prev) => [...prev, trimmed]);
    setAffiliationDraft("");
  }

  function removeAffiliation(index: number) {
    setAffiliations((prev) => prev.filter((_, i) => i !== index));
  }

  const fields = {
    headshot_url: headshotUrl,
    headshot_focal_y: headshotFocalY,
    intended_category: listingDescriptor,
    intended_function: intendedFunction,
    intended_function_other: intendedFunctionOther,
    city_country: cityCountry,
    residences,
    country_of_origin: countryOfOrigin,
    affiliations,
    work_modality: workModality,
    experience_areas: experienceAreas,
    tagline,
    full_bio: fullBio,
    background,
    experience_label: experienceLabel,
    vetted_date: vettedDate,
    sector,
    sector_other: sectorOther,
  };
  const readyToPublish = tagline.trim().length > 0 && fullBio.trim().length > 0;

  /**
   * Uploads a file straight to Supabase Storage from the browser (gated
   * by the review_listings storage policies -- see
   * sql/2026-09-27g-scholar-headshot-upload.sql), then saves the
   * resulting public URL immediately rather than waiting for a separate
   * "Save" click, so an upload can't be silently lost if the admin
   * forgets to save afterward. This only ever touches headshot_url --
   * submitted_headshot_url (the applicant's original) is never written
   * here, so it stays available for comparison after this replaces it.
   */
  function handleHeadshotFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file again later
    if (!picked) return;

    setUploadError(null);
    setUploading(true);
    (async () => {
      try {
        const file = await shrinkHeadshot(picked);
        const supabase = getSupabaseClient();
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${p.id}-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from(HEADSHOT_BUCKET)
          .upload(path, file, { upsert: true, contentType: file.type || undefined });
        if (uploadErr) throw uploadErr;

        const { data } = supabase.storage.from(HEADSHOT_BUCKET).getPublicUrl(path);
        const publicUrl = data.publicUrl;
        setHeadshotUrl(publicUrl);

        await updateScholarProfile(p.id, p.slug, { ...fields, headshot_url: publicUrl });
        setSaved(true);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Couldn't upload that image.");
      } finally {
        setUploading(false);
      }
    })();
  }

  function handleSave() {
    setActionError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateScholarProfile(p.id, p.slug, fields);
        setSaved(true);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Couldn't save this listing.");
      }
    });
  }

  function handlePublish() {
    setActionError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await publishScholarProfile(p.id, p.slug, fields);
        setSaved(true);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Couldn't publish this listing.");
      }
    });
  }

  function handleUnpublish() {
    setActionError(null);
    startTransition(async () => {
      try {
        await unpublishScholarProfile(p.id, p.slug);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Couldn't unpublish this listing.");
      }
    });
  }

  return (
    <div style={{ borderTop: "1px solid rgba(230,222,210,0.12)" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2.2fr 1.4fr 1fr 1fr",
          gap: 0,
          alignItems: "center",
          padding: "15px 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          {headshotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={headshotUrl} alt="" style={miniThumbStyle} />
          ) : (
            <div style={miniThumbPlaceholderStyle} />
          )}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 14.5,
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {p.full_name || "(no name on file)"}
            </div>
            {p.city_country && <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{p.city_country}</div>}
          </div>
        </div>
        <span style={{ fontSize: 13, opacity: 0.85 }}>{p.intended_category || "—"}</span>
        <span
          style={{
            background: p.status === "published" ? "#3C6B3F" : MOSS,
            color: p.status === "published" ? WHITE : BROWN,
            fontSize: 11.5,
            fontWeight: 600,
            padding: "4px 9px",
            borderRadius: 999,
            width: "fit-content",
          }}
        >
          {p.status === "published" ? "Published" : "Draft"}
        </span>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onToggle}
            style={{
              background: MOSS,
              color: BROWN,
              border: 0,
              padding: "8px 13px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {expanded ? "Close" : "Open"}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 14px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
            <a
              href={`/profile/${p.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, color: OCHRE, borderBottom: `1px solid ${OCHRE}` }}
            >
              Preview public page →
            </a>
            {p.reviewed_by && (
              <span style={monoLabel}>Reviewed by: {p.reviewer_name || "Unknown reviewer"}</span>
            )}
          </div>

          <Field label="Headshot">
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 14 }}>
              <div>
                <div style={{ ...monoLabel, marginBottom: 6, fontSize: 9 }}>Submitted by applicant</div>
                {p.submitted_headshot_url ? (
                  <a href={p.submitted_headshot_url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.submitted_headshot_url} alt="" style={thumbStyle} />
                  </a>
                ) : (
                  <div style={{ ...thumbStyle, display: "grid", placeItems: "center", border: "1px dashed rgba(230,222,210,0.25)" }}>
                    <span style={{ ...monoLabel, fontSize: 8.5 }}>none</span>
                  </div>
                )}
              </div>
              <div>
                <div style={{ ...monoLabel, marginBottom: 6, fontSize: 9 }}>Live on listing (crop preview)</div>
                {headshotUrl ? (
                  <div style={previewBoxStyle}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={headshotUrl}
                      alt=""
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: `center ${headshotFocalY}%`,
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ ...previewBoxStyle, display: "grid", placeItems: "center", border: "1px dashed rgba(230,222,210,0.25)" }}>
                    <span style={{ ...monoLabel, fontSize: 8.5 }}>none</span>
                  </div>
                )}
                {headshotUrl && (
                  <div style={{ marginTop: 10, width: PREVIEW_WIDTH }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ ...monoLabel, fontSize: 8.5, whiteSpace: "nowrap" }}>Adjust crop</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={headshotFocalY}
                        onChange={(e) => setHeadshotFocalY(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                    </div>
                    <p style={{ fontSize: 11, opacity: 0.55, margin: "4px 0 0" }}>
                      Drags the visible window up or down when the headshot is taller than this
                      panel. Save (or Publish) to apply it to the live page.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleHeadshotFileChange}
              disabled={uploading}
              style={{ fontSize: 13, color: SAND }}
            />
            {uploading && <p style={{ fontSize: 12.5, color: SAND, opacity: 0.75, margin: "8px 0 0" }}>Uploading…</p>}
            {uploadError && <p style={{ fontSize: 12.5, color: OCHRE, margin: "8px 0 0" }}>{uploadError}</p>}

            <div style={{ marginTop: 12 }}>
              <div style={{ ...monoLabel, marginBottom: 6, fontSize: 9 }}>Or paste a URL directly</div>
              <input
                value={headshotUrl}
                onChange={(e) => setHeadshotUrl(e.target.value)}
                style={fieldStyle}
                placeholder="https://..."
              />
            </div>
          </Field>

          <Field label="Listing descriptor (shown publicly as this scholar's category)">
            <input
              value={listingDescriptor}
              onChange={(e) => setListingDescriptor(e.target.value)}
              style={fieldStyle}
              placeholder="e.g. Cosmetic chemist & formulation scientist"
            />
          </Field>

          <Field label="Function (from application)">
            <select
              value={intendedFunction}
              onChange={(e) => setIntendedFunction(e.target.value)}
              style={{ ...fieldStyle, cursor: "pointer" }}
            >
              <option value="">— not set —</option>
              {FUNCTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ color: "#1F0E03" }}>
                  {opt.label}
                </option>
              ))}
            </select>
            {intendedFunction === "other" && (
              <input
                value={intendedFunctionOther}
                onChange={(e) => setIntendedFunctionOther(e.target.value)}
                style={{ ...fieldStyle, marginTop: 10 }}
                placeholder="Describe the other function"
              />
            )}
          </Field>

          <Field label="Location">
            <input
              value={cityCountry}
              onChange={(e) => setCityCountry(e.target.value)}
              style={fieldStyle}
              placeholder="e.g. Ibadan, Nigeria"
            />
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              {residences.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    value={r.city}
                    onChange={(e) => updateResidence(i, "city", e.target.value)}
                    style={{ ...fieldStyle, width: 160 }}
                    placeholder="City"
                  />
                  <input
                    value={r.country}
                    onChange={(e) => updateResidence(i, "country", e.target.value)}
                    style={{ ...fieldStyle, width: 160 }}
                    placeholder="Country"
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: SAND, cursor: "pointer" }}>
                    <input type="radio" name={`residence-primary-${p.id}`} checked={r.is_primary} onChange={() => setPrimaryResidence(i)} />
                    Primary
                  </label>
                  <button
                    type="button"
                    onClick={() => removeResidence(i)}
                    style={{ background: "transparent", border: 0, padding: 0, fontSize: 12.5, color: OCHRE, cursor: "pointer" }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addResidence}
                style={{ background: "transparent", border: 0, padding: 0, fontSize: 12.5, fontWeight: 600, textDecoration: "underline", color: SAND, cursor: "pointer", alignSelf: "flex-start" }}
              >
                + Add another location
              </button>
            </div>
          </Field>

          <Field label="Country of origin">
            <input
              value={countryOfOrigin}
              onChange={(e) => setCountryOfOrigin(e.target.value)}
              style={fieldStyle}
              placeholder="e.g. Nigeria"
            />
          </Field>

          <Field label="Affiliations">
            <input
              value={affiliationDraft}
              onChange={(e) => setAffiliationDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAffiliation();
                }
              }}
              onBlur={addAffiliation}
              style={fieldStyle}
              placeholder="e.g. University of Ibadan — press Enter to add"
            />
            {affiliations.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                {affiliations.map((a, i) => (
                  <span
                    key={`${a}-${i}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "6px 10px", border: "1px solid rgba(230,222,210,0.3)" }}
                  >
                    {a}
                    <button
                      type="button"
                      onClick={() => removeAffiliation(i)}
                      style={{ background: "transparent", border: 0, padding: 0, color: OCHRE, cursor: "pointer", fontSize: 13 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>

          <Field label="Tagline">
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              style={fieldStyle}
              placeholder="One-line summary shown under their name"
            />
          </Field>

          <Field label="Full bio (shown in the background section)">
            <textarea
              value={fullBio}
              onChange={(e) => setFullBio(e.target.value)}
              rows={5}
              style={fieldStyle}
              placeholder="Separate paragraphs with a blank line"
            />
          </Field>

          <Field label="Background (shown when a visitor clicks their portrait)">
            <textarea
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              rows={5}
              style={fieldStyle}
            />
          </Field>

          <Field label="Industries (shown as badges on the public listing)">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SECTOR_OPTIONS.map((opt) => {
                const active = sector.includes(opt.value);
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => toggleSector(opt.value)}
                    style={{
                      background: active ? MOSS : "transparent",
                      border: `1px solid ${active ? MOSS : "rgba(230,222,210,0.35)"}`,
                      borderRadius: 999,
                      padding: "7px 14px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: active ? BROWN : SAND,
                      cursor: "pointer",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {sector.includes("other") && (
              <SectorOtherInputs
                value={sectorOther}
                onChange={setSectorOther}
                inputStyle={fieldStyle}
                linkColor={SAND}
                placeholder="Describe the other industry"
              />
            )}
          </Field>

          <Field label="Delivery (what type of work they're open to)">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {WORK_MODALITY_OPTIONS.map((opt) => {
                const active = workModality.includes(opt.value);
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => toggleWorkModality(opt.value)}
                    style={{
                      background: active ? MOSS : "transparent",
                      border: `1px solid ${active ? MOSS : "rgba(230,222,210,0.35)"}`,
                      borderRadius: 999,
                      padding: "7px 14px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: active ? BROWN : SAND,
                      cursor: "pointer",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Experience areas (from application)">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {EXPERIENCE_AREA_OPTIONS.map((opt) => {
                const active = experienceAreas.includes(opt.value);
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => toggleExperienceArea(opt.value)}
                    style={{
                      background: active ? MOSS : "transparent",
                      border: `1px solid ${active ? MOSS : "rgba(230,222,210,0.35)"}`,
                      borderRadius: 999,
                      padding: "7px 14px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: active ? BROWN : SAND,
                      cursor: "pointer",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <Field label="Experience label (e.g. '14 years')">
              <input
                value={experienceLabel}
                onChange={(e) => setExperienceLabel(e.target.value)}
                style={{ ...fieldStyle, width: 220 }}
              />
            </Field>
            <Field label="Vetted date">
              <input
                type="date"
                value={vettedDate}
                onChange={(e) => setVettedDate(e.target.value)}
                style={{ ...fieldStyle, width: 200 }}
              />
            </Field>
          </div>

          {actionError && <p style={{ color: OCHRE, fontSize: 13, margin: 0 }}>{actionError}</p>}
          {saved && !actionError && <p style={{ color: MOSS, fontSize: 13, margin: 0 }}>Saved.</p>}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={handleSave}
              disabled={isPending}
              style={{
                background: MOSS,
                color: BROWN,
                border: 0,
                padding: "9px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: isPending ? "default" : "pointer",
                opacity: isPending ? 0.6 : 1,
              }}
            >
              Save
            </button>
            {p.status === "published" ? (
              <button
                onClick={handleUnpublish}
                disabled={isPending}
                style={{
                  background: "transparent",
                  color: OCHRE,
                  border: `1px solid ${OCHRE}`,
                  padding: "9px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isPending ? "default" : "pointer",
                  opacity: isPending ? 0.6 : 1,
                }}
              >
                Unpublish
              </button>
            ) : (
              <button
                onClick={handlePublish}
                disabled={isPending || !readyToPublish}
                title={readyToPublish ? undefined : "Tagline and full bio are required to publish"}
                style={{
                  background: "#3C6B3F",
                  color: WHITE,
                  border: 0,
                  padding: "9px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isPending || !readyToPublish ? "default" : "pointer",
                  opacity: isPending || !readyToPublish ? 0.5 : 1,
                }}
              >
                Publish
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ ...monoLabel, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
