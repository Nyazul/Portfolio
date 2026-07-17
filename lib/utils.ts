import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Standard cn() helper: lets components compose conditional Tailwind classes
// without fighting class-order specificity issues.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
