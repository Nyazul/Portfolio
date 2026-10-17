// Marks a draft note. Drafts only exist in dev (see lib/notes.ts), so this
// never renders in production - it's a reminder that the note needs review.
export function DraftBadge() {
  return (
    <span className="border border-dashed border-accent px-2 py-0.5 font-mono text-xs font-normal text-accent">
      Draft · dev only
    </span>
  );
}
