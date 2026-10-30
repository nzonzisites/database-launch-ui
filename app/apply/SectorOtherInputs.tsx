"use client";

// The text box(es) shown under the industries question when "Other" is
// selected -- up to SECTOR_OTHER_MAX of them. Shared by the application
// form and the admin Listings tab, which each pass their own input
// style. `value` is the raw stored sector_other string (one industry per
// line, see applicationOptions.ts); this only ever reads and writes it
// through those helpers.

import { joinSectorOther, sectorOtherEntries, SECTOR_OTHER_MAX } from "./applicationOptions";

export default function SectorOtherInputs({
  value,
  onChange,
  inputStyle,
  linkColor,
  placeholder,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  inputStyle: React.CSSProperties;
  linkColor: string;
  placeholder: string;
  required?: boolean;
}) {
  const entries = sectorOtherEntries(value);

  function update(index: number, text: string) {
    const next = [...entries];
    next[index] = text;
    onChange(joinSectorOther(next));
  }

  const linkStyle: React.CSSProperties = {
    background: "transparent",
    border: 0,
    padding: 0,
    fontSize: 13,
    fontWeight: 500,
    color: linkColor,
    textDecoration: "underline",
    textUnderlineOffset: 3,
    cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
      {entries.map((entry, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            style={{ ...inputStyle, flex: 1, minWidth: 0 }}
            placeholder={i === 0 ? placeholder : "Another industry"}
            aria-label={i === 0 ? "Other industry" : "Second other industry"}
            value={entry}
            onChange={(e) => update(i, e.target.value)}
            required={required && i === 0}
          />
          {i > 0 && (
            <button
              type="button"
              onClick={() => onChange(joinSectorOther(entries.filter((_, j) => j !== i)))}
              style={linkStyle}
            >
              Remove
            </button>
          )}
        </div>
      ))}
      {entries.length < SECTOR_OTHER_MAX && (
        <button
          type="button"
          onClick={() => onChange(joinSectorOther([...entries, ""]))}
          style={{ ...linkStyle, alignSelf: "flex-start" }}
        >
          + Add another industry
        </button>
      )}
    </div>
  );
}
