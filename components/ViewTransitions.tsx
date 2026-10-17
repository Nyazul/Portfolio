"use client";

import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  startTransition,
  use,
  useCallback,
  useEffect,
  useRef,
  type ComponentProps,
} from "react";

// Route view transitions for the App Router: elements sharing a
// view-transition-name (see lib/view-transitions.ts) morph between pages.
//
// Replaces the next-view-transitions package, which left two failure modes:
// Chrome aborts a transition whose DOM update takes over 4s (a slow network,
// or a dev-mode compile) and the package never handled the rejected
// promises, so that surfaced as an uncaught TimeoutError. Here a route that
// hasn't rendered by UPDATE_DEADLINE_MS just skips the animation and
// finishes navigating like a normal link.
const UPDATE_DEADLINE_MS = 2000;

type NavigateOptions = { replace?: boolean; scroll?: boolean };
type Navigate = (href: string, options?: NavigateOptions) => void;

const NavigateContext = createContext<Navigate | null>(null);

export function ViewTransitions({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // Resolves the in-flight transition's DOM update once the new route has
  // committed, letting the browser capture the new state and animate.
  const pendingRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    pendingRef.current?.();
    pendingRef.current = null;
  }, [pathname]);

  const navigate = useCallback<Navigate>(
    (href, { replace = false, scroll = true } = {}) => {
      const go = () =>
        replace ? router.replace(href, { scroll }) : router.push(href, { scroll });

      const target = new URL(href, window.location.href);
      const canAnimate =
        "startViewTransition" in document &&
        target.origin === window.location.origin &&
        // Same-page hash links never change the pathname, so nothing would
        // ever finish the transition.
        target.pathname !== window.location.pathname &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!canAnimate) {
        go();
        return;
      }

      let finish!: () => void;
      const updated = new Promise<void>((resolve) => {
        finish = resolve;
      });
      // Navigation must happen exactly once, whether it's started by the
      // transition's update callback or by the deadline below (which also
      // covers a browser that never gets to run the callback).
      let navigated = false;
      const navigateOnce = () => {
        if (navigated) return;
        navigated = true;
        startTransition(go);
      };

      const transition = document.startViewTransition(() => {
        pendingRef.current = finish;
        navigateOnce();
        return updated;
      });
      const deadline = window.setTimeout(() => {
        transition.skipTransition();
        navigateOnce();
        finish();
      }, UPDATE_DEADLINE_MS);
      void updated.then(() => window.clearTimeout(deadline));

      // Skipped or aborted transitions reject these. The navigation itself
      // is unaffected, so there's nothing to report.
      transition.ready.catch(() => {});
      transition.finished.catch(() => {});
      transition.updateCallbackDone.catch(() => {});
    },
    [router],
  );

  return <NavigateContext value={navigate}>{children}</NavigateContext>;
}

function isModifiedClick(e: React.MouseEvent<HTMLAnchorElement>) {
  const target = e.currentTarget.getAttribute("target");
  return (
    (target && target !== "_self") ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey ||
    e.button !== 0
  );
}

// Drop-in next/link that navigates through the view transition. Modified
// clicks (new tab, etc.) and non-string hrefs keep next/link's own behaviour.
export function Link(props: ComponentProps<typeof NextLink>) {
  const navigate = use(NavigateContext);
  const { href, replace, scroll, onClick } = props;

  return (
    <NextLink
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || !navigate || typeof href !== "string" || isModifiedClick(e)) {
          return;
        }
        e.preventDefault();
        navigate(href, { replace: !!replace, scroll: scroll ?? true });
      }}
    />
  );
}
