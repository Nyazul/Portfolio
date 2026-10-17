"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { isDev, isFilled } from "@/lib/todo";

// Tiers instead of percentage bars: "90% Java" can't be measured or
// falsified, but "I use this daily" vs "I'm exploring this" is an honest,
// checkable claim a reader can actually use.
const tiers = [
  {
    name: "Daily",
    note: "In production, every week",
    items: ["Java", "Spring Boot", "PostgreSQL", "Apache Kafka", "Spring Modulith", "JPA / Hibernate"],
  },
  {
    name: "Comfortable",
    note: "Shipped with it, would again",
    items: [
      "React",
      "TypeScript",
      "Docker Compose",
      "Redis",
      "AWS S3",
      "Liquibase",
      "Linux & systemd",
      "GitHub Actions",
      "Sentry",
    ],
  },
  {
    name: "Exploring",
    note: "Learning in the open",
    items: ["RAG pipelines", "Agentic systems", "LLM inference"],
  },
];

export function StackTiers() {
  const prefersReducedMotion = usePrefersReducedMotion();
  // Unfilled TODO items show (dashed) in dev only; a tier left with nothing
  // real in it is dropped in production.
  const visibleTiers = tiers
    .map((tier) => ({
      ...tier,
      items: isDev ? tier.items : tier.items.filter(isFilled),
    }))
    .filter((tier) => tier.items.length > 0);

  return (
    <div className="grid gap-px overflow-hidden border border-border bg-border">
      {visibleTiers.map((tier, t) => (
        <div
          key={tier.name}
          className="grid gap-4 bg-bg p-6 md:grid-cols-[180px_1fr] md:gap-8"
        >
          <div>
            <p className="flex items-center gap-2 text-text-primary">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-accent"
                style={{ opacity: 1 - t * 0.3 }}
              />
              {tier.name}
            </p>
            <p className="mt-1 text-xs text-text-tertiary">{tier.note}</p>
          </div>
          <motion.ul
            className="flex flex-wrap gap-2"
            initial={prefersReducedMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, amount: 0.6 }}
            transition={{ staggerChildren: 0.05, delayChildren: t * 0.1 }}
          >
            {tier.items.map((item) => (
              <motion.li
                key={item}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className={
                  isFilled(item)
                    ? "border border-border px-3 py-1.5 font-mono text-xs text-text-secondary transition-colors duration-200 hover:border-accent hover:text-text-primary"
                    : "border border-dashed border-accent px-3 py-1.5 font-mono text-xs text-accent"
                }
              >
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </div>
      ))}
    </div>
  );
}
