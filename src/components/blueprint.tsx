'use client';

import { cn } from '@/lib/utils';

/*
 * The one orchestrated moment: while Architect builds, a technical drawing of the app draws itself,
 * one layer per build step. Lines use pathLength=1 so each one "writes" from start to end.
 */

type Line = { s: number; d: string; thin?: boolean };
type Label = { s: number; x: number; y: number; t: string; end?: boolean; mid?: boolean };

const LINES: Line[] = [
  { s: 1, d: 'M20 44 H400 M20 38 V50 M400 38 V50', thin: true },
  { s: 1, d: 'M420 368 H620 V424 H420 Z M420 396 H620' },
  { s: 2, d: 'M468 60 H612 V96 H468 Z' },
  { s: 2, d: 'M444 140 H604 V172 H444 Z' },
  { s: 2, d: 'M444 188 H604 V220 H444 Z' },
  { s: 2, d: 'M444 236 H604 V268 H444 Z' },
  { s: 2, d: 'M444 284 H604 V316 H444 Z' },
  { s: 3, d: 'M540 96 V118 H424 V300 H444', thin: true },
  { s: 3, d: 'M424 156 H444 M424 204 H444 M424 252 H444', thin: true },
  { s: 3, d: 'M604 156 H622 M604 204 H622 M604 252 H622 M604 300 H622', thin: true },
  { s: 3, d: 'M622 156 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M622 204 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M622 252 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M622 300 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0' },
  { s: 4, d: 'M20 70 H400 V340 H20 Z' },
  { s: 4, d: 'M20 102 H400', thin: true },
  { s: 4, d: 'M104 102 V340', thin: true },
  { s: 4, d: 'M36 126 H86 M36 148 H78 M36 170 H82', thin: true },
  { s: 4, d: 'M120 132 H384 M120 170 H384 M120 208 H384 M120 246 H384 M120 284 H384 M120 322 H384', thin: true },
  {
    s: 4,
    d: 'M350 145 H372 a6 6 0 0 1 0 12 H350 a6 6 0 0 1 0 -12 Z M350 183 H372 a6 6 0 0 1 0 12 H350 a6 6 0 0 1 0 -12 Z M350 221 H372 a6 6 0 0 1 0 12 H350 a6 6 0 0 1 0 -12 Z M350 259 H372 a6 6 0 0 1 0 12 H350 a6 6 0 0 1 0 -12 Z M350 297 H372 a6 6 0 0 1 0 12 H350 a6 6 0 0 1 0 -12 Z',
  },
  { s: 5, d: 'M20 362 H200 V424 H20 Z' },
  { s: 5, d: 'M34 378 H112 M46 392 H168 M46 406 H144', thin: true },
  { s: 6, d: 'M222 410 H402', thin: true },
];

const LABELS: Label[] = [
  { s: 1, x: 210, y: 32, t: '1280 px', mid: true },
  { s: 1, x: 432, y: 387, t: '' },
  { s: 1, x: 432, y: 415, t: 'Sheet 1, plan v1' },
  { s: 2, x: 540, y: 83, t: 'Triage lead', mid: true },
  { s: 2, x: 524, y: 161, t: 'Intake reader', mid: true },
  { s: 2, x: 524, y: 209, t: 'Policy checker', mid: true },
  { s: 2, x: 524, y: 257, t: 'Risk scorer', mid: true },
  { s: 2, x: 524, y: 305, t: 'Reply drafter', mid: true },
  { s: 4, x: 36, y: 91, t: 'Inbox' },
  { s: 5, x: 190, y: 419, t: 'api.py', end: true },
];

export function Blueprint({ drawn, title, result, className }: { drawn: number; title: string; result: { passed: number; total: number } | null; className?: string }) {
  const ticks = result ? Array.from({ length: result.total }, (_, i) => i < result.passed) : Array.from({ length: 15 }, () => null);
  const gap = 180 / Math.max(1, ticks.length - 1);
  return (
    <svg viewBox="0 0 640 440" role="img" aria-label="A drawing of the app, filling in as it builds" className={cn('h-auto w-full', className)}>
      {LINES.map((l, i) => (
        <path
          key={i}
          d={l.d}
          pathLength={1}
          fill="none"
          stroke={l.thin ? 'rgb(var(--accent) / 0.5)' : 'rgb(var(--accent))'}
          strokeWidth={l.thin ? 1 : 1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 1,
            strokeDashoffset: drawn >= l.s ? 0 : 1,
            transition: `stroke-dashoffset 1100ms var(--ease-out) ${(i % 5) * 90}ms`,
          }}
        />
      ))}
      {LABELS.map((t, i) => (
        <text
          key={i}
          x={t.x}
          y={t.y}
          textAnchor={t.end ? 'end' : t.mid ? 'middle' : 'start'}
          className="font-mono"
          fontSize={11}
          fill="rgb(var(--ink2))"
          style={{ opacity: drawn >= t.s ? 1 : 0, transition: 'opacity 500ms var(--ease-out) 450ms' }}
        >
          {t.t || title}
        </text>
      ))}
      <g style={{ opacity: drawn >= 6 ? 1 : 0, transition: 'opacity 300ms' }}>
        {ticks.map((ok, i) => (
          <line
            key={i}
            x1={222 + i * gap}
            x2={222 + i * gap}
            y1={402}
            y2={418}
            stroke={ok === null ? 'rgb(var(--ink3) / 0.6)' : ok ? 'rgb(var(--ok))' : 'rgb(var(--bad))'}
            strokeWidth={2.4}
            strokeLinecap="round"
            style={{ opacity: drawn >= 6 ? 1 : 0, transition: `opacity 200ms ${i * 70}ms` }}
          />
        ))}
        <text x={222} y={390} className="font-mono" fontSize={11} fill="rgb(var(--ink2))">
          {result ? `${result.passed} of ${result.total} match` : 'Testing…'}
        </text>
      </g>
    </svg>
  );
}
