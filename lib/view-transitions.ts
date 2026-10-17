// Shared view-transition-name for a case study's title, used on both the
// home list row and the /work/[slug] heading so the browser morphs one into
// the other. Names must be unique per page and valid CSS idents.
export function caseTitleTransition(slug: string): string {
  return `case-title-${slug}`;
}
