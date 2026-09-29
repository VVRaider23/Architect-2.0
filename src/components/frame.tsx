'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Code2, Eye, MessageSquare, Terminal } from 'lucide-react';
import { BUILD_STEPS, useApp } from '@/lib/store';
import { arrivedFlags, buildStep, type StepKey } from '@/lib/stage';
import { useRouter } from '@/lib/nav';
import { useDevTools } from '@/lib/hooks';
import type { Project } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Menu, Segmented } from './ui';
import { LogoMark, PersonSwitch, RequireAuth, UserMenu } from './shell';
import { ProjectTopBar, workTabs, type WorkTab } from './project-bar';
import { RouteSkeleton } from './skeletons';
import { MissingProject } from './missing';
import { ChatPanel } from './project/chat-panel';
import { InviteModal } from './project/invite';

export { ProjectTopBar, workTabs };
export type { WorkTab };

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
    <RequireAuth fallback={<RouteSkeleton />}>
      <ProjectInner id={id}>{children}</ProjectInner>
    </RequireAuth>
  );
}

/**
 * Every screen of a project, most likely next first. They load quietly in the background,
 * so moving between them feels instant.
 */
const SCREENS = ['app', 'prove', 'ready', 'agents', 'code', 'signoff', 'ship', 'learn', 'review', 'requests', 'live', 'api', 'build', 'plan', 'questions'];

function usePrefetchScreens(p: Project | undefined) {
  const router = useRouter();
  const id = p?.id;
  // The pull request and the sign-off request someone is most likely to open next.
  const lastChange = p?.changes[p.changes.length - 1];
  const extra = [lastChange && `pr/${lastChange.id}`, ...(p?.requests.slice(-2).map((r) => `requests/${r.id}`) ?? [])].filter(Boolean).join(' ');
  useEffect(() => {
    if (!id) return;
    const load = () => [...SCREENS, ...extra.split(' ').filter(Boolean)].forEach((s) => router.prefetch(`/p/${id}/${s}`));
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (n: number) => void };
    if (w.requestIdleCallback) {
      const n = w.requestIdleCallback(load, { timeout: 1200 });
      return () => w.cancelIdleCallback?.(n);
    }
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [id, extra, router]);
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
  usePrefetchScreens(p);

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


/** App, Agents and Code: the chat on the left, the thing you are looking at on the right. */
/** With developer tools off, the code and the API are tucked in here: still one click away. */
function TuckedAway({ p }: { p: Project }) {
  const router = useRouter();
  const setDevTools = useApp((s) => s.setDevTools);
  const toast = useApp((s) => s.toast);
  return (
    <Menu
      label="Developer tools"
      width={280}
      header={<div className="px-2.5 pb-1 pt-1.5 text-[12px] font-medium text-ink3">Developer tools</div>}
      items={[
        { id: 'code', label: 'See the code', sub: 'Every file, ready to download or save to GitHub', icon: <Code2 className="h-4 w-4" />, onSelect: () => router.push(`/p/${p.id}/code`) },
        { id: 'api', label: 'Use it from your code', sub: 'API keys and examples', icon: <Terminal className="h-4 w-4" />, onSelect: () => router.push(`/p/${p.id}/api`) },
        {
          id: 'on',
          label: 'Always show them',
          sub: 'Adds a Code tab here. Change it any time in Settings.',
          icon: <Eye className="h-4 w-4" />,
          onSelect: () => {
            setDevTools(true);
            toast('Developer tools are on: the Code tab, the build log and API keys.', 'ok');
          },
        },
      ]}
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Developer tools"
          title="Developer tools"
          data-tour="dev-tools"
          className={cn(
            'press grid h-8 w-8 place-items-center rounded-lg border text-ink2 transition-colors hover:text-ink',
            open ? 'border-line2 bg-surface2 text-ink' : 'border-line',
          )}
        >
          <Code2 className="h-4 w-4" />
        </button>
      )}
    />
  );
}

export function Workspace({ p, now, tab, right, children }: { p: Project; now: number; tab: WorkTab; right?: ReactNode; children: ReactNode }) {
  const router = useRouter();
  const dev = useDevTools();
  const [chatOpen, setChatOpen] = useState(false);
  // The tab moves the moment it's clicked, even if the next screen takes a moment to load.
  const [shown, setShown] = useState(tab);
  useEffect(() => setShown(tab), [tab]);
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
              value={shown}
              label="What to look at"
              tour="work-tabs"
              options={workTabs(dev, tab)}
              onChange={(t) => {
                setShown(t);
                router.push(`/p/${p.id}/${t}`);
              }}
            />
            {!dev && <TuckedAway p={p} />}
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
