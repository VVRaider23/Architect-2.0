'use client';

import Link from 'next/link';
import { useRouter } from '@/lib/nav';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Crosshair, ExternalLink, Monitor, Smartphone, X } from 'lucide-react';
import { latestRun } from '@/lib/engine';
import type { Project } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ProjectRoute, Workspace } from '@/components/frame';
import { ClaimsApp } from '@/components/claims-app';
import { usePoint } from '@/components/project/chat-panel';
import { Button, Segmented, Tag } from '@/components/ui';

export default function AppPage() {
  return <ProjectRoute>{(p, now) => <AppScreen p={p} now={now} />}</ProjectRoute>;
}

type Box = { label: string; left: number; top: number; width: number; height: number };

/** Screen 10 · Your app. One job: does it look right? Point at any part of it and ask for a change. */
function AppScreen({ p, now }: { p: Project; now: number }) {
  const router = useRouter();
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [box, setBox] = useState<Box | null>(null);
  const pointOn = usePoint((s) => s.on);
  const setOn = usePoint((s) => s.setOn);
  const setTarget = usePoint((s) => s.setTarget);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (p.build.status !== 'done') router.replace(`/p/${p.id}`);
  }, [p.build.status, p.id, router]);

  useEffect(() => {
    if (!pointOn) setBox(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOn(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pointOn, setOn]);

  useEffect(() => () => usePoint.getState().setOn(false), []);
  useEffect(() => {
    if (window.innerWidth < 768) setDevice('mobile');
  }, []);

  const measure = (el: HTMLElement | null): Box | null => {
    const root = frame.current;
    const hit = el?.closest<HTMLElement>('[data-sel]');
    if (!root || !hit || !root.contains(hit)) return null;
    const a = root.getBoundingClientRect();
    const b = hit.getBoundingClientRect();
    return { label: hit.dataset.sel!, left: b.left - a.left, top: b.top - a.top, width: b.width, height: b.height };
  };

  const run = latestRun(p);
  const items = new Map(p.answerKey.map((i) => [i.id, i]));
  const warnings = run ? run.results.filter((r) => !r.pass) : [];

  return (
    <Workspace
      p={p}
      now={now}
      tab="app"
      right={
        <>
          <Segmented
            size="sm"
            className="hidden md:inline-flex"
            label="Screen size"
            value={device}
            onChange={setDevice}
            options={[
              { id: 'desktop', label: <Monitor className="h-3.5 w-3.5" aria-label="Desktop" /> },
              { id: 'mobile', label: <Smartphone className="h-3.5 w-3.5" aria-label="Phone" /> },
            ]}
          />
          <Button
            size="sm"
            variant={pointOn ? 'primary' : 'secondary'}
            icon={<Crosshair className="h-3.5 w-3.5" />}
            onClick={() => setOn(!pointOn)}
            aria-pressed={pointOn}
            aria-label="Select a part of the app"
            tour="select"
          >
            <span className="hidden sm:inline">{pointOn ? 'Click any part' : 'Select'}</span>
          </Button>
          <Button size="sm" variant="ghost" href={`/apps/${p.id}?env=preview`} target="_blank" icon={<ExternalLink className="h-3.5 w-3.5" />} aria-label="Open in a new tab">
            <span className="hidden xl:inline">Open</span>
          </Button>
        </>
      }
    >
      <div className="grid-bg absolute inset-0 overflow-auto p-4 pb-20 sm:p-6 sm:pb-20">
        {pointOn && (
          <div className="mx-auto mb-3 w-fit rounded-full border border-accent-line bg-accent-soft px-3 py-1 text-[13px] text-accent-ink animate-slide-up">
            Click a part of the app, then say what should change. Press Esc to stop.
          </div>
        )}
        <div
          ref={frame}
          data-tour="app-frame"
          className={cn(
            'paper relative mx-auto h-[calc(100%-8px)] min-h-[540px] overflow-hidden rounded-xl border border-line shadow-pop transition-[max-width] duration-300 ease-out',
            device === 'mobile' ? 'max-w-[390px]' : 'max-w-[1120px]',
            pointOn && 'cursor-crosshair [&_*]:!cursor-crosshair',
          )}
          onMouseMoveCapture={(e) => pointOn && setBox(measure(e.target as HTMLElement))}
          onMouseLeave={() => setBox(null)}
          onClickCapture={(e) => {
            if (!pointOn) return;
            e.preventDefault();
            e.stopPropagation();
            const b = measure(e.target as HTMLElement);
            if (b) setTarget(b.label);
          }}
        >
          <ClaimsApp p={p} env="preview" version={p.version} embedded device={device} />
          {pointOn && box && (
            <div
              aria-hidden
              className="pointer-events-none absolute rounded-md border-2 border-accent bg-accent/10 transition-all duration-100 ease-out"
              style={{ left: box.left - 2, top: box.top - 2, width: box.width + 4, height: box.height + 4 }}
            >
              <span className="absolute -top-[22px] left-0 whitespace-nowrap rounded-md bg-accent px-1.5 py-0.5 text-[11.5px] font-medium text-on-accent">{box.label}</span>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setConsoleOpen((o) => !o)}
        aria-expanded={consoleOpen}
        aria-controls="console"
        data-tour="console"
        className={cn(
          'press absolute bottom-4 left-1/2 z-10 flex h-9 -translate-x-1/2 items-center gap-2 rounded-full border border-line2 bg-surface2 px-3.5 text-[13px] text-ink2 shadow-pop transition-opacity duration-200 hover:text-ink',
          consoleOpen && 'pointer-events-none opacity-0',
        )}
      >
        <span className={cn('h-2 w-2 rounded-full', warnings.length ? 'bg-warn' : 'bg-ok')} />
        Console, {warnings.length ? `${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : 'all clear'}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', !consoleOpen && 'rotate-180')} />
      </button>
      <div
        id="console"
        role="region"
        aria-label="Console"
        className={cn(
          'absolute inset-x-0 bottom-0 z-20 border-t border-code-line bg-code transition-transform duration-300 ease-drawer',
          consoleOpen ? 'translate-y-0' : 'pointer-events-none translate-y-full',
        )}
      >
        <div className="flex h-10 items-center gap-2 border-b border-code-line px-4">
          <span className="text-[13px] font-medium text-code-ink">Console</span>
          {warnings.length > 0 && <Tag tone="warn">{warnings.length} warnings</Tag>}
          <div className="flex-1" />
          <button type="button" onClick={() => setConsoleOpen(false)} className="press grid h-7 w-7 place-items-center rounded-md text-code-dim hover:text-code-ink" aria-label="Close the console">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="code-scroll max-h-[180px] overflow-y-auto px-4 py-3 font-mono text-[12.5px] leading-[1.9] text-code-ink">
          <div>
            <span className="text-code-dim">info</span>  POST /api/v1/claims/triage  200 in 38 ms
          </div>
          {warnings.map((w) => {
            const it = items.get(w.itemId);
            return (
              <Link key={w.itemId} href={`/p/${p.id}/prove`} className="block rounded hover:bg-white/5">
                <span className="text-warn">warn</span>  {it?.claim.id} differs from the Answer Key: expected {it?.expected.action}
              </Link>
            );
          })}
          {!warnings.length && run && (
            <div>
              <span className="text-ok">ok</span>  all {run.total} examples match the Answer Key
            </div>
          )}
        </div>
      </div>
    </Workspace>
  );
}
