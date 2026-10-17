// DESTINATION: app/about/template.tsx
//
// Scoped to the /about segment, so this covers /about AND /about/founders
// (a template.tsx applies to its own segment and every nested route under
// it) without touching the home page or anything else on the site. See
// app/apply/template.tsx for the matching one on /apply, and the
// ".page-enter" keyframe in app/globals.css for the actual animation.

export default function AboutTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
