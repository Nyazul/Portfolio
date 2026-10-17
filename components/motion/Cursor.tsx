"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

const INTERACTIVE = "a, button, [data-cursor], summary, label";
const TEXT_INPUT = "input, textarea, select, [contenteditable='true']";

const ORANGE = "#FF6B2C";
const BLACK = "#0A0A0A";

// True when the nearest painted background under `el` is the accent orange
// (either theme's accent, or a hover mid-transition into it). Walks up to
// the first ancestor with a mostly-opaque background color.
function isOverOrange(el: Element | null): boolean {
  for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
    const m = getComputedStyle(node).backgroundColor.match(/[\d.]+/g);
    if (!m) continue;
    const [r, g, b, a = 1] = m.map(Number);
    if (a < 0.5) continue;
    return r > 180 && g > 40 && g < 150 && b < 90 && r - g > 80;
  }
  return false;
}

// Desktop-only custom cursor: a precise orange dot plus a lagging orange
// ring that read on both the dark and light sections. Over an orange
// background both switch to black so they don't vanish into it. The ring
// grows over anything interactive; elements with data-cursor="Label" turn
// it into a filled disc showing that label. Over text inputs it steps
// aside so the native I-beam is usable.
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
  const [onOrange, setOnOrange] = useState(false);

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

    // Background lookups only when the element under the pointer changes,
    // not on every pixel of movement.
    let lastTarget: Element | null = null;
    function updateTarget(target: Element | null) {
      if (target === lastTarget) return;
      lastTarget = target;
      setOnOrange(isOverOrange(target));
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
      lastTarget = null;
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
  const ink = onOrange ? BLACK : ORANGE;
  // The labelled disc is a fill, so it inverts the other way round: orange
  // disc with black text normally, black disc with orange text on orange.
  const discText = onOrange ? ORANGE : BLACK;

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full"
        style={{ x, y, translateX: "-50%", translateY: "-50%", width: 6, height: 6 }}
        animate={{
          opacity: show && !label ? 1 : 0,
          scale: pressed ? 0.5 : 1,
          backgroundColor: ink,
        }}
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
        }}
        animate={{
          width: ringSize,
          height: ringSize,
          opacity: show ? 1 : 0,
          scale: pressed ? 0.85 : 1,
          backgroundColor: label ? ink : "rgba(0,0,0,0)",
          borderColor: label ? "rgba(0,0,0,0)" : ink,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
      >
        <AnimatePresence>
          {label && (
            <motion.span
              key={label}
              className="font-mono text-xs font-medium"
              style={{ color: discText }}
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
