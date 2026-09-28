'use client';

import { useEffect, useState } from 'react';
import { useApp } from './store';

/** True once the saved demo state has loaded from the browser. Avoids hydration mismatches. */
export function useHydrated() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const unsub = useApp.persist.onFinishHydration(() => setReady(true));
    if (useApp.persist.hasHydrated()) setReady(true);
    return unsub;
  }, []);
  return ready;
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
