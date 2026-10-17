// DESTINATION: app/template.tsx
//
// template.tsx (unlike layout.tsx) remounts on every navigation, which
// is what makes this fire on every route change -- including between
// sibling pages that share the same layout (home -> about -> apply,
// etc.) -- without touching any individual page. The actual animation
// lives in the ".page-enter" keyframe in globals.css; this file just
// applies that class to a fresh wrapper each time a page mounts.

export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
