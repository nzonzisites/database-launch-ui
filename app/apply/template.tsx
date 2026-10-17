// DESTINATION: app/apply/template.tsx
//
// Scoped to the /apply segment only -- see app/about/template.tsx (which
// covers /about + /about/founders) for the twin, and the ".page-enter"
// keyframe in app/globals.css for the actual animation. Deliberately not
// at the app root: Modupe asked for this on about / founders / apply
// only, not the home page.

export default function ApplyTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
