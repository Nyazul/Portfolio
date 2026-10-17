"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

const INTERACTIVE = "a, button, [data-cursor], summary, label";
const TEXT_INPUT = "input, textarea, select, [contenteditable='true']";

// Desktop-only custom cursor: a precise dot plus a lagging ring, both
// mix-blend-difference so they invert correctly over the alternating
// dark/light sections without knowing which one they're on. The ring grows
// over anything interactive; elements with data-cursor="Label" turn it into
// a filled accent disc showing that label. Over text inputs it steps aside
// so the native I-beam is usable.
//
// Off entirely for coarse pointers (touch) and reduced motion - the native
// cursor is only hidden (html.custom-cursor) while this is actually active.
export function Cursor() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [finePointer, setFinePointer] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [overInput, setOverInput] = useState(false);
  const [label, setLabel] = useState("");
  const [pressed, setPressed] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 350, damping: 30, mass: 0.5 });
  const ringY = useSpring(y, { stiffness: 350, damping: 30, mass: 0.5 });

  const enabled = finePointer && !prefersReducedMotion;

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    setFinePointer(mq.matches);
    const listener = (e: MediaQueryListEvent) => setFinePointer(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add("custom-cursor");

    function updateTarget(target: Element | null) {
      const input = target?.closest(TEXT_INPUT);
      setOverInput(!!input);
      const interactive = input ? null : target?.closest(INTERACTIVE);
      setHovering(!!interactive);
      setLabel(interactive?.getAttribute("data-cursor") ?? "");
    }
    function onMove(e: PointerEvent) {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
      updateTarget(e.target instanceof Element ? e.target : null);
    }
    // Scrolling moves content under a stationary pointer without firing
    // pointermove - re-hit-test so the ring doesn't keep a stale label.
    function onScroll() {
      updateTarget(document.elementFromPoint(x.get(), y.get()));
    }
    const onLeave = () => setVisible(false);
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      root.classList.remove("custom-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  const show = visible && !overInput;
  const ringSize = label ? 84 : hovering ? 56 : 32;

  // Dot and ring are each their own fixed layer (no shared wrapper): a
  // positioned wrapper with a z-index is a stacking context, and
  // mix-blend-difference inside it only blends against that wrapper's
  // transparent backdrop - white stays white, invisible on light sections.
  // As direct fixed layers they blend against the actual page.
  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full bg-white mix-blend-difference"
        style={{ x, y, translateX: "-50%", translateY: "-50%", width: 6, height: 6 }}
        animate={{ opacity: show && !label ? 1 : 0, scale: pressed ? 0.5 : 1 }}
        transition={{ duration: 0.15 }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[9999] flex items-center justify-center rounded-full border-[1.5px]"
        style={{
          x: ringX,
          y: ringY,
          translateX: "-50%",
          translateY: "-50%",
          mixBlendMode: label ? "normal" : "difference",
        }}
        animate={{
          width: ringSize,
          height: ringSize,
          opacity: show ? 1 : 0,
          scale: pressed ? 0.85 : 1,
          backgroundColor: label ? "#FF6B2C" : "rgba(255,255,255,0)",
          borderColor: label ? "rgba(255,255,255,0)" : "rgba(255,255,255,1)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
      >
        <AnimatePresence>
          {label && (
            <motion.span
              key={label}
              className="font-mono text-xs font-medium text-[#0A0A0A]"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.15 }}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
