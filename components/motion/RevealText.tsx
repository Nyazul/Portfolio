"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

type RevealTextProps = {
  text: string;
  as?: "h2" | "h3" | "p";
  className?: string;
  // Seconds between consecutive words.
  stagger?: number;
};

// Word-by-word masked reveal, the scroll-triggered sibling of the Hero name's
// per-character reveal: each word sits in an overflow-hidden mask and slides
// up into it once the line is well inside the viewport (the bottom margin
// keeps it from firing while the section's row-flip flaps still cover it).
// Plays once. Under reduced motion it's just the text.
export function RevealText({
  text,
  as = "h2",
  className,
  stagger = 0.06,
}: RevealTextProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const Tag = motion[as];
  const words = text.split(" ");

  if (prefersReducedMotion) {
    const Plain = as;
    return <Plain className={className}>{text}</Plain>;
  }

  return (
    <Tag
      className={className}
      aria-label={text}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.8, margin: "0px 0px -20% 0px" }}
      transition={{ staggerChildren: stagger }}
    >
      {words.map((word, i) => (
        <span key={`${word}-${i}`} aria-hidden="true">
          <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
            <motion.span
              className="inline-block"
              variants={{
                hidden: { y: "110%" },
                visible: { y: "0%" },
              }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              {word}
            </motion.span>
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </Tag>
  );
}
