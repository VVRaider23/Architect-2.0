'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useApp } from './store';

const onHydrated = (done: () => void) => useApp.persist.onFinishHydration(done);
const hasHydrated = () => useApp.persist.hasHydrated();
const notOnServer = () => false;

/**
 * True once the saved demo state has loaded from the browser.
 *
 * On the very first page load it starts false, so the page matches what the server sent,
 * then turns true a moment later. After that, every screen you move to gets `true`
 * straight away, so moving between screens never flashes a loading state.
 */
export function useHydrated() {
  return useSyncExternalStore(onHydrated, hasHydrated, notOnServer);
}

/** A clock that re-renders every `ms` milliseconds. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
