export type SectionTheme = "dark" | "light";

// Two full palettes, not just a background swap - every semantic token
// (text, border, surface, signal, inverse) flips together so a "light"
// section is genuinely legible, not just a bg color with dark-theme text
// sitting on top of it.
export const themeColors: Record<SectionTheme, Record<string, string>> = {
  dark: {
    bg: "#0A0A0A",
    bgElevated: "#121212",
    surface: "#1A1A1A",
    border: "#2A2A2A",
    textPrimary: "#F5F5F5",
    textSecondary: "#A3A3A3",
    textTertiary: "#6B6B6B",
    signal: "#E5E5E5",
    signalDim: "#8A8A8A",
    inverseBg: "#F5F5F5",
    inverseText: "#0A0A0A",
  },
  light: {
    bg: "#F5F5F5",
    bgElevated: "#EDEDED",
    surface: "#E8E8E8",
    border: "#D4D4D4",
    textPrimary: "#0A0A0A",
    textSecondary: "#404040",
    textTertiary: "#737373",
    signal: "#0A0A0A",
    signalDim: "#4D4D4D",
    inverseBg: "#0A0A0A",
    inverseText: "#F5F5F5",
  },
};

// Produces inline CSS custom-property overrides. Every component already
// uses the semantic token classes (bg-bg, text-text-primary, border-border,
// etc.) which Tailwind v4 compiles to `var(--color-*)` - so overriding these
// vars on a wrapping element re-themes everything inside it for free,
// with zero changes needed in About/ArchitectureSection/CaseStudies/etc.
export function themeStyle(theme: SectionTheme): React.CSSProperties {
  const c = themeColors[theme];
  return {
    "--color-bg": c.bg,
    "--color-bg-elevated": c.bgElevated,
    "--color-surface": c.surface,
    "--color-border": c.border,
    "--color-text-primary": c.textPrimary,
    "--color-text-secondary": c.textSecondary,
    "--color-text-tertiary": c.textTertiary,
    "--color-signal": c.signal,
    "--color-signal-dim": c.signalDim,
    "--color-inverse-bg": c.inverseBg,
    "--color-inverse-text": c.inverseText,
  } as React.CSSProperties;
}
