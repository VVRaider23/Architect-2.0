'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { navProgress } from '@/lib/nav';

/** Moves quicker than this feel instant, so they get no line at all. */
const SHOW_AFTER_MS = 90;

type Phase = 'idle' | 'run' | 'done';

/**
 * The thin line across the top of the page while you move to another screen.
 * It appears only if the move takes a moment, creeps forward while waiting, then fills and fades.
 */
export function NavProgress() {
  const busy = useSyncExternalStore(navProgress.subscribe, navProgress.busy, () => false);
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('idle');
  const [width, setWidth] = useState(0);

  // The move has landed once the address changes.
  useEffect(() => {
    navProgress.end();
  }, [pathname]);

  // Any link inside the app starts the line the moment it is clicked.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (!(a instanceof HTMLAnchorElement)) return;
      if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      navProgress.start(a.href);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    if (busy) {
      if (phase === 'run') return;
      // A new move while the last line is still fading: reset first, then start clean.
      if (phase === 'done') return setPhase('idle');
      const t = setTimeout(() => setPhase('run'), SHOW_AFTER_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'run') setPhase('done');
  }, [busy, phase]);

  useEffect(() => {
    if (phase === 'run') {
      setWidth(0.12);
      // Creep towards 90%: quick at first, slower the longer it takes, never quite done.
      const t = setInterval(() => setWidth((w) => w + (0.9 - w) * 0.08), 180);
      return () => clearInterval(t);
    }
    if (phase === 'done') {
      setWidth(1);
      const t = setTimeout(() => setPhase('idle'), 440);
      return () => clearTimeout(t);
    }
    setWidth(0);
  }, [phase]);

  return (
    <div aria-hidden data-nav-progress={phase === 'idle' ? 'off' : 'on'} className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[2px]">
      <div
        className="nav-line"
        style={{
          transform: `scaleX(${width})`,
          opacity: phase === 'run' ? 1 : 0,
          transition:
            phase === 'run'
              ? 'transform 240ms cubic-bezier(0.23, 1, 0.32, 1), opacity 120ms ease'
              : phase === 'done'
                ? 'transform 180ms ease-out, opacity 260ms ease 160ms'
                : 'none',
        }}
      />
    </div>
  );
}
