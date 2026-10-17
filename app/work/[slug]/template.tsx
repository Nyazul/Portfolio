"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

// Re-mounts on every /work/* navigation (that's what a template is for, vs a
// layout), giving each case study a short entrance. Skipped entirely under
// reduced motion.
export default function CaseStudyTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
