'use client';

import Link from 'next/link';
import { Check, Lock, Rocket } from 'lucide-react';
import { useApp } from '@/lib/store';
import { approvedFor, launchPath, STEP_COPY, type StepKey } from '@/lib/stage';
import { screenFor } from '@/lib/routes';
import type { Project } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button, Tooltip } from './ui';
import { LogoMark, PersonSwitch, SearchButton, UserMenu } from './shell';

/** Where each step in the bar takes you. Goes straight to the right screen, never through a redirect. */
export const SECTION_HREF: Record<StepKey, (p: Project) => string> = {
  build: (p) => (p.build.status === 'done' ? `/p/${p.id}/app` : screenFor(p, 'builder')),
  prove: (p) => `/p/${p.id}/prove`,
  signoff: (p) => `/p/${p.id}/signoff`,
  ship: (p) => `/p/${p.id}/ship`,
  learn: (p) => `/p/${p.id}/learn`,
};

/** The five steps of every project. Shows where the project is, and which step you are looking at. */
function Journey({ p, section, now }: { p: Project; section: StepKey; now: number }) {
  const ws = useApp((s) => s.workspace);
  const steps = launchPath(p, ws, now);
  return (
    <nav aria-label="Project steps" data-tour="journey" className="hidden items-center gap-0.5 rounded-xl border border-line bg-surface p-[3px] lg:flex">
      {steps.map((s) => {
        const on = s.key === section;
        const open = s.state !== 'todo' || on;
        const inner = (
          <>
            {s.state === 'done' ? (
              <span className="grid h-4 w-4 place-items-center rounded-full bg-ok/90 text-on-ok">
                <Check className="h-2.5 w-2.5" strokeWidth={3.4} />
              </span>
            ) : s.state === 'current' ? (
              <span className="relative grid h-4 w-4 place-items-center">
                <span className="h-2 w-2 rounded-full bg-accent" />
              </span>
            ) : (
              <Lock className="h-3 w-3 text-ink3/70" />
            )}
            <span>{s.label}</span>
          </>
        );
        const cls = cn(
          'press flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors',
          on ? 'bg-line2 text-ink' : open ? 'text-ink2 hover:bg-surface2 hover:text-ink' : 'cursor-default text-ink3/70',
        );
        if (!open)
          return (
            <Tooltip key={s.key} content={STEP_COPY[s.key].unlocks} side="bottom">
              <span className={cls} tabIndex={0} aria-disabled="true" aria-label={`${s.label}. ${STEP_COPY[s.key].unlocks}`}>
                {inner}
              </span>
            </Tooltip>
          );
        return (
          <Link key={s.key} href={SECTION_HREF[s.key](p)} className={cls} aria-current={on ? 'step' : undefined}>
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}

/** Deploy stays locked, and says why, until Farah signs off. */
function DeployButton({ p }: { p: Project }) {
  const testOk = approvedFor(p, 'test');
  const liveOk = approvedFor(p, 'live');
  const { test, live } = p.deployments;
  const liveCurrent = live.status === 'running' && live.version === p.version;
  const testCurrent = test.status === 'running' && test.version === p.version;
  if (liveCurrent)
    return (
      <Button size="sm" href={`/p/${p.id}/ship`} icon={<span className="h-2 w-2 rounded-full bg-ok animate-ping2" />} tour="deploy">
        Live
      </Button>
    );
  if (liveOk)
    return (
      <Button size="sm" variant="primary" href={`/p/${p.id}/live`} icon={<Rocket className="h-3.5 w-3.5" />} tour="deploy">
        Go live
      </Button>
    );
  if (testOk && !testCurrent)
    return (
      <Button size="sm" variant="primary" href={`/p/${p.id}/ship`} icon={<Rocket className="h-3.5 w-3.5" />} tour="deploy">
        Deploy
      </Button>
    );
  if (testCurrent)
    return (
      <Button size="sm" href={`/p/${p.id}/ship`} icon={<span className="h-2 w-2 rounded-full bg-warn" />} tour="deploy">
        On Test
      </Button>
    );
  return (
    <Tooltip content="Opens after Farah signs off" side="bottom" align="end">
      <span tabIndex={0} aria-label="Deploy. Opens after Farah signs off" data-tour="deploy">
        <Button size="sm" disabled icon={<Lock className="h-3.5 w-3.5" />} className="pointer-events-none">
          Deploy
        </Button>
      </span>
    </Tooltip>
  );
}

export function ProjectTopBar({ p, section, now }: { p: Project; section: StepKey; now: number }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-bg/85 px-3 backdrop-blur-md sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <Link href="/home" className="press rounded-lg" aria-label="Home">
          <LogoMark />
        </Link>
        <span className="text-ink3/60" aria-hidden>
          /
        </span>
        <span className="truncate text-[14px] font-medium">{p.name}</span>
      </div>
      <Journey p={p} section={section} now={now} />
      <div className="flex flex-1 items-center justify-end gap-2">
        <SearchButton compact />
        <DeployButton p={p} />
        <PersonSwitch compact />
        <UserMenu />
      </div>
    </header>
  );
}

export type WorkTab = 'app' | 'agents' | 'code';

/** The App, Agents and Code tabs. Code only shows with developer tools on (or while you're on it). */
export function workTabs(dev: boolean, tab: WorkTab) {
  return [
    { id: 'app' as WorkTab, label: 'App' },
    { id: 'agents' as WorkTab, label: 'Agents', tour: 'tab-agents' },
    ...(dev || tab === 'code' ? [{ id: 'code' as WorkTab, label: 'Code', tour: 'tab-code' }] : []),
  ];
}
