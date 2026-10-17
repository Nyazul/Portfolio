// Any string starting with this marker is a fact only Nyazul can supply
// (a real number, a date, what he's currently learning). It renders as a
// visible dashed placeholder in dev and is dropped entirely in production -
// see isFilled() - so an unfilled TODO can never ship as a fake value.
export const TODO = "TODO(nyazul)";

export const isDev = process.env.NODE_ENV === "development";

export function isFilled(value: string | undefined): value is string {
  return !!value && !value.startsWith(TODO);
}
