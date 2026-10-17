import { RevealText } from "@/components/motion/RevealText";

type SectionHeadingProps = {
  index: string;
  label: string;
  headline: string;
  // Optional right-aligned note on the eyebrow row.
  aside?: React.ReactNode;
};

// Mono "0X / Label" eyebrow plus a large statement headline. Every home-page
// section opens with this so the hierarchy is consistent.
export function SectionHeading({ index, label, headline, aside }: SectionHeadingProps) {
  return (
    <div className="mb-12 md:mb-16">
      <div className="flex items-baseline justify-between gap-6">
        <p className="flex items-center gap-2 font-mono text-sm text-text-tertiary">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          {index} / {label}
        </p>
        {aside ? <div className="text-right text-sm text-text-tertiary">{aside}</div> : null}
      </div>
      <RevealText
        text={headline}
        className="mt-5 max-w-3xl text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.02] font-medium tracking-tight text-text-primary"
      />
    </div>
  );
}
