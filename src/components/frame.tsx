'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Check, Lock, MessageSquare, Rocket } from 'lucide-react';
import { BUILD_STEPS, useApp } from '@/lib/store';
import { approvedFor, arrivedFlags, buildStep, launchPath, STEP_COPY, type StepKey } from '@/lib/stage';
import type { Project } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button, Segmented, Tooltip } from './ui';
import { LogoMark, PersonSwitch, RequireAuth, SearchButton, UserMenu } from './shell';
import { MissingProject } from './missing';
import { ChatPanel } from './project/chat-panel';
import { InviteModal } from './project/invite';

/** A clock that only ticks while something on screen is waiting for time to pass. */
export function useTicker(active: boolean, ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [active, ms]);
  return now;
}

/**
 * Every project screen goes through here: it checks sign-in, finds the project, finishes the
 * build when its time is up, and announces flags from real use as they arrive.
 */
export function ProjectRoute({ children }: { children: (p: Project, now: number) => ReactNode }) {
  const { id } = useParams<{ id: string }>();
  return (
    <RequireAuth>
      <ProjectInner id={id}>{children}</ProjectInner>
    </RequireAuth>
  );
}

function ProjectInner({ id, children }: { id: string; children: (p: Project, now: number) => ReactNode }) {
  const p = useApp((s) => s.projects.find((x) => x.id === id));
  const completeBuild = useApp((s) => s.completeBuild);
  const toast = useApp((s) => s.toast);
  const viewAs = useApp((s) => s.viewAs);
  const router = useRouter();
  const waiting = !!p && (p.build.status === 'building' || p.flags.some((f) => f.at > Date.now() - 1500));
  const now = useTicker(waiting);
  const mounted = useRef(Date.now());
  const told = useRef(new Set<string>());

  useEffect(() => {
    if (p?.build.status === 'building' && buildStep(p, now) >= BUILD_STEPS.length) completeBuild(p.id);
  }, [p, now, completeBuild]);

  useEffect(() => {
    if (!p || viewAs !== 'builder') return;
    for (const f of arrivedFlags(p, now)) {
      if (told.current.has(f.id)) continue;
      told.current.add(f.id);
      if (f.at < mounted.current - 1000 || f.status !== 'open') continue;
      toast(`${f.by.split(',')[0]} flagged an answer on ${f.env === 'live' ? 'Live' : 'Test'}`, 'neutral', {
        actions: [{ label: 'See it', primary: true, run: () => router.push(`/p/${p.id}/learn`) }],
        ms: 6000,
      });
    }
  }, [p, now, viewAs, toast, router]);

  if (!p) return <MissingProject />;
  return (
    <>
      {children(p, now)}
      <InviteModal p={p} />
    </>
  );
}

const SECTION_HREF: Record<StepKey, (p: Project) => string> = {
  build: (p) => (p.build.status === 'done' ? `/p/${p.id}/app` : `/p/${p.id}`),
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

export function BackLink({ href, label = 'Back' }: { href: string; label?: string }) {
  return (
    <Link href={href} className="press inline-flex items-center gap-1.5 rounded-md text-[13.5px] text-ink3 hover:text-ink">
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}

/** One job per screen: a narrow column in the middle, nothing else competing for attention. */
export function FocusScreen({
  p,
  now,
  section,
  children,
  back,
  wide,
}: {
  p: Project;
  now: number;
  section: StepKey;
  children: ReactNode;
  back?: { href: string; label?: string };
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <ProjectTopBar p={p} section={section} now={now} />
      <main className="flex flex-1 justify-center px-4 pb-24 pt-[8vh] sm:px-6">
        <div className={cn('w-full animate-screen-in', wide ? 'max-w-[720px]' : 'max-w-[560px]')}>
          {back && (
            <div className="mb-6">
              <BackLink href={back.href} label={back.label} />
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}

export type WorkTab = 'app' | 'agents' | 'code';

/** App, Agents and Code: the chat on the left, the thing you are looking at on the right. */
export function Workspace({ p, now, tab, right, children }: { p: Project; now: number; tab: WorkTab; right?: ReactNode; children: ReactNode }) {
  const router = useRouter();
  const [chatOpen, setChatOpen] = useState(false);
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ProjectTopBar p={p} section="build" now={now} />
      <div className="flex min-h-0 flex-1">
        <ChatPanel p={p} open={chatOpen} onClose={() => setChatOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3">
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="press grid h-8 w-8 place-items-center rounded-lg border border-line text-ink2 hover:text-ink lg:hidden"
              aria-label="Open the chat"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            <Segmented
              value={tab}
              label="What to look at"
              tour="work-tabs"
              options={[
                { id: 'app', label: 'App' },
                { id: 'agents', label: 'Agents', tour: 'tab-agents' },
                { id: 'code', label: 'Code', tour: 'tab-code' },
              ]}
              onChange={(t) => router.push(`/p/${p.id}/${t}`)}
            />
            <div className="flex flex-1 items-center justify-end gap-2">{right}</div>
          </div>
          <div className="relative min-h-0 flex-1 animate-fade-in">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Meera and Farah never see code, so their screens are light, quiet and plain. */
export function PaperScreen({ p, title, children }: { p: Project; title: string; children: ReactNode }) {
  return (
    <div className="paper min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-bg/90 px-3 backdrop-blur-md sm:px-4">
        <Link href="/home" className="press rounded-lg" aria-label="Home">
          <LogoMark />
        </Link>
        <span className="min-w-0 truncate text-[14px]">
          <span className="font-medium">{p.name}</span>
          <span className="text-ink3"> · {title}</span>
        </span>
        <div className="flex-1" />
        <PersonSwitch compact />
        <UserMenu />
      </header>
      <main className="flex justify-center px-4 pb-24 pt-[7vh] sm:px-6">
        <div className="w-full max-w-[600px] animate-screen-in">{children}</div>
      </main>
    </div>
  );
}

/** Big, calm screen titles. */
export function ScreenTitle({ children, sub, className }: { children: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h1 className="text-balance text-[30px] font-semibold leading-[1.12] tracking-[-0.02em] sm:text-[34px]">{children}</h1>
      {sub && <p className="mt-2.5 text-pretty text-[16px] leading-relaxed text-ink2">{sub}</p>}
    </div>
  );
}
