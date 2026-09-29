'use client';

import { useMemo } from 'react';
import { useRouter as useNextRouter } from 'next/navigation';

/**
 * Moving between screens.
 *
 * A tiny store that knows whether a move is in progress, so the thin line at the top of the page
 * can show it. A move starts when a link is clicked or code calls push/replace, and ends when the
 * new address shows. Placeholders "hold" it while they are on screen, so the line keeps going
 * until the real screen is there.
 */
type Listener = () => void;

let startedAt = 0;
let holds = 0;
let safety: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

/** True when `href` goes to a different screen in this app (not just a new ?query or #hash). */
function isMove(href: string) {
  try {
    const url = new URL(href, window.location.href);
    return url.origin === window.location.origin && url.pathname !== window.location.pathname;
  } catch {
    return false;
  }
}

export const navProgress = {
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  busy() {
    return startedAt > 0 || holds > 0;
  },
  /** A move has started. Ignored when it stays on the same screen. */
  start(href?: string) {
    if (typeof window === 'undefined' || startedAt) return;
    if (href !== undefined && !isMove(href)) return;
    startedAt = Date.now();
    clearTimeout(safety);
    // If a move never lands (it was cancelled, or failed), don't leave the line running.
    safety = setTimeout(() => navProgress.end(), 10_000);
    emit();
  },
  /** The new screen's address is showing. */
  end() {
    if (!startedAt) return;
    startedAt = 0;
    clearTimeout(safety);
    emit();
  },
  /** A placeholder is on screen. Returns the function to call when it goes. */
  hold() {
    holds += 1;
    emit();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      holds = Math.max(0, holds - 1);
      emit();
    };
  },
};

/** Next's router, except that every move to another screen also starts the line at the top. */
export function useRouter() {
  const router = useNextRouter();
  return useMemo(
    () => ({
      ...router,
      push: (href: string, options?: Parameters<typeof router.push>[1]) => {
        navProgress.start(href);
        router.push(href, options);
      },
      replace: (href: string, options?: Parameters<typeof router.replace>[1]) => {
        navProgress.start(href);
        router.replace(href, options);
      },
    }),
    [router],
  );
}
