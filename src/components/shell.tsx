'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, CloudCheck, CloudOff, Compass, FolderKanban, Gauge, Home, Keyboard, Loader2, LogOut, RotateCcw, Search, Settings, X } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useHydrated } from '@/lib/hooks';
import { PEOPLE } from '@/lib/seed';
import { logOutRequest, useServer } from '@/lib/account';
import { homeFor } from '@/lib/routes';
import type { Project, Role, ToastMsg, Workspace } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, Kbd, Menu, useClickOutside } from './ui';
import { usePalette } from './palette';

export { useClickOutside, homeFor };

export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#15171F" stroke="#2C3041" />
      <path d="M8.5 23 L16 8.5 L23.5 23" fill="none" stroke="#ECEDF3" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M11.8 17.4 H20.2" stroke="#8B93FF" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = '/home', compact }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="press flex shrink-0 items-center gap-2 rounded-lg pr-1 text-[15.5px] font-semibold tracking-tight text-ink" aria-label="Architect home">
      <LogoMark />
      {!compact && <span>Architect</span>}
    </Link>
  );
}

const ROLE_LABEL: Record<Role, string> = { builder: 'Builder', reviewer: 'Expert', approver: 'IT' };
const ROLE_DOES: Record<Role, string> = {
  builder: 'Builds the app and ships it',
  reviewer: 'Checks answers. Never sees code.',
  approver: 'Approves launches. Never sees code.',
};
export const roleLabel = (r: Role) => ROLE_LABEL[r];
export const roleTone = (r: Role) => (r === 'builder' ? 'accent' : r === 'reviewer' ? 'ok' : 'warn') as 'accent' | 'ok' | 'warn';

/** The demo switch: see the same project as Arjun, Meera or Farah without three accounts. */
export function PersonSwitch({ compact }: { compact?: boolean }) {
  const viewAs = useApp((s) => s.viewAs);
  const setViewAs = useApp((s) => s.setViewAs);
  const projects = useApp((s) => s.projects);
  const pathname = usePathname();
  const router = useRouter();
  const me = PEOPLE.find((p) => p.role === viewAs)!;
  const pid = pathname.match(/^\/p\/([^/]+)/)?.[1];
  const p = projects.find((x) => x.id === pid);
  return (
    <div data-tour="person-switch">
      <Menu
        align="end"
        width={300}
        label="See the project as"
        header={<div className="px-2.5 pb-1.5 pt-1.5 text-[12px] text-ink3">Demo switch: see the same work as each person.</div>}
        items={PEOPLE.map((person) => ({
          id: person.id,
          label: `${person.short} · ${ROLE_LABEL[person.role]}`,
          sub: ROLE_DOES[person.role],
          icon: <Avatar initials={person.initials} size={26} tone={roleTone(person.role)} />,
          checked: person.role === viewAs,
          onSelect: () => {
            if (person.role === viewAs) return;
            setViewAs(person.role);
            if (p) router.push(homeFor(person.role, p));
            else if (pathname !== '/home') router.push('/home');
          },
        }))}
        trigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`Viewing as ${me.short}. Switch person`}
            className="press flex h-9 items-center gap-2 rounded-[10px] border border-line bg-surface2 pl-1.5 pr-2 text-[13px] hover:border-line2"
          >
            <Avatar initials={me.initials} size={24} tone={roleTone(viewAs)} />
            {!compact && (
              <span className="hidden sm:inline">
                <span className="text-ink3">View as </span>
                <span className="font-medium text-ink">{me.short}</span>
              </span>
            )}
            <ChevronDown className={cn('h-3.5 w-3.5 text-ink3 transition-transform duration-200', open && 'rotate-180')} />
          </button>
        )}
      />
    </div>
  );
}

/** Old name, kept so older screens keep working. */
export const ViewAsSwitch = PersonSwitch;

export function UserMenu() {
  const email = useApp((s) => s.userEmail);
  const authMode = useApp((s) => s.authMode);
  const resetDemo = useApp((s) => s.resetDemo);
  const signOut = useApp((s) => s.signOut);
  const viewAs = useApp((s) => s.viewAs);
  const router = useRouter();
  const me = PEOPLE.find((p) => p.role === viewAs)!;
  return (
    <Menu
      align="end"
      width={264}
      label="Account"
      header={
        <div className="border-b border-line px-2.5 pb-2.5 pt-1.5">
          <div className="text-[13.5px] font-semibold">{me.name}</div>
          <div className="truncate text-[12.5px] text-ink3">{viewAs === 'builder' ? email || me.email : me.email}</div>
          <div className="mt-1 text-[12px] text-ink3">{authMode === 'demo' ? 'Demo · saved in this browser' : 'Your account · saved to the database'}</div>
        </div>
      }
      items={[
        { id: 'tour', label: 'Take the guided tour', icon: <Compass className="h-4 w-4" />, onSelect: () => router.push('/tour') },
        { id: 'keys', label: 'Search and commands', icon: <Keyboard className="h-4 w-4" />, sub: 'Press ⌘K or Ctrl K anywhere', onSelect: () => usePalette.getState().setOpen(true) },
        {
          id: 'reset',
          label: authMode === 'account' ? 'Start over' : 'Reset the demo',
          icon: <RotateCcw className="h-4 w-4" />,
          onSelect: () => {
            if (authMode === 'account') {
              if (confirm('Start over? This deletes the projects saved in your account.')) {
                useApp.setState({ projects: [], audit: [] });
                router.push('/home');
              }
            } else if (confirm('Reset the demo? This clears the projects and decisions saved in this browser.')) {
              resetDemo();
              router.push('/');
            }
          },
        },
        {
          id: 'out',
          label: 'Sign out',
          icon: <LogOut className="h-4 w-4" />,
          onSelect: async () => {
            if (authMode === 'account') {
              await logOutRequest().catch(() => undefined);
              await useServer.getState().refresh();
              resetDemo();
            } else signOut();
            router.push('/');
          },
        },
      ]}
      trigger={({ open, toggle }) => (
        <button type="button" onClick={toggle} aria-label="Account menu" aria-expanded={open} className="press rounded-full">
          <Avatar initials={me.initials} size={32} tone={roleTone(viewAs)} />
        </button>
      )}
    />
  );
}

/** Shows whether the latest change reached the database (real accounts only). */
export function SaveBadge() {
  const authMode = useApp((s) => s.authMode);
  const save = useServer((s) => s.save);
  if (authMode !== 'account') return null;
  const label = save.status === 'saving' ? 'Saving…' : save.status === 'error' ? 'Not saved yet' : 'Saved';
  return (
    <span
      className={cn('hidden items-center gap-1.5 text-[12.5px] md:flex', save.status === 'error' ? 'text-bad' : 'text-ink3')}
      title={save.status === 'error' ? 'Could not reach the database. It will try again with your next change.' : 'Your work is saved to your account'}
    >
      {save.status === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : save.status === 'error' ? <CloudOff className="h-3.5 w-3.5" /> : <CloudCheck className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export function SearchButton({ compact }: { compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => usePalette.getState().setOpen(true)}
      data-tour="palette"
      className={cn(
        'press flex h-9 items-center gap-2 rounded-[10px] border border-line bg-surface2 text-[13px] text-ink3 hover:border-line2 hover:text-ink',
        compact ? 'w-9 justify-center' : 'px-2.5',
      )}
      aria-label="Search and commands"
    >
      <Search className="h-4 w-4" />
      {!compact && (
        <>
          <span className="hidden md:inline">Search</span>
          <Kbd className="hidden md:inline-flex">⌘K</Kbd>
        </>
      )}
    </button>
  );
}

/** The bar across the top of every screen. */
export function TopBar({ left, center, right, className }: { left: ReactNode; center?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <header className={cn('sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-bg/85 px-3 backdrop-blur-md sm:px-4', className)}>
      <div className="flex min-w-0 items-center gap-2.5">{left}</div>
      <div className="flex min-w-0 flex-1 items-center justify-center">{center}</div>
      <div className="flex shrink-0 items-center gap-2">{right}</div>
    </header>
  );
}

/** Credits used this month, by kind of work. */
export function usageRows(projects: Project[]): { label: string; n: number; what: string }[] {
  const builds = projects.filter((p) => p.build.status === 'done').length;
  const testing = projects.reduce((n, p) => n + p.runs.reduce((m, r) => m + r.credits, 0), 0);
  const changes = projects.reduce((n, p) => n + p.changes.reduce((m, c) => m + c.credits, 0), 0);
  return [
    { label: 'Plans', n: builds * 10 + 60, what: 'The questions and the one-page plan' },
    { label: 'Agents', n: builds * 40 + 240, what: 'Writing and wiring the agents' },
    { label: 'Screens', n: builds * 50 + 300, what: 'The app screens' },
    { label: 'Code and fixes', n: builds * 40 + changes + 180, what: 'Code, fixes and framework switches' },
    { label: 'Test runs', n: testing + 80, what: 'Every run against the Answer Key' },
  ];
}

function CreditsMeter({ ws }: { ws: Workspace }) {
  const total = 2000;
  return (
    <Link href="/usage" className="press block rounded-xl border border-line bg-surface p-3 hover:border-line2">
      <div className="flex items-baseline justify-between text-[12.5px]">
        <span className="text-ink3">Credits left</span>
        <b className="tabular font-semibold text-ink">{ws.credits.toLocaleString('en-US')}</b>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line2">
        <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${Math.min(100, (ws.credits / total) * 100)}%` }} />
      </div>
    </Link>
  );
}

const NAV = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/usage', label: 'Usage', icon: Gauge },
  { href: '/settings', label: 'Settings', icon: Settings },
];

/** Home, Projects, Usage and Settings share this frame: a top bar and a short side menu. */
export function AppShell({ children }: { children: ReactNode }) {
  const ws = useApp((s) => s.workspace);
  const viewAs = useApp((s) => s.viewAs);
  const pathname = usePathname();
  const nav = NAV.filter((n) => viewAs === 'builder' || n.href === '/home' || n.href === '/settings').map((n) =>
    n.href === '/settings' && viewAs === 'approver' ? { ...n, label: 'Launch rules' } : n,
  );
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        left={
          <>
            <Logo />
            {ws && <span className="hidden truncate rounded-lg border border-line bg-surface px-2.5 py-1 text-[13px] text-ink2 md:inline">{ws.name}</span>}
          </>
        }
        right={
          <>
            <SaveBadge />
            <SearchButton />
            <PersonSwitch />
            <UserMenu />
          </>
        }
      />
      <nav aria-label="Main" className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 md:hidden">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={pathname.startsWith(n.href) ? 'page' : undefined}
            className={cn('press rounded-lg px-3 py-1.5 text-[13.5px]', pathname.startsWith(n.href) ? 'bg-surface2 font-medium text-ink' : 'text-ink2')}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-1">
        <aside className="sticky top-14 hidden h-[calc(100vh-56px)] w-[220px] shrink-0 flex-col justify-between border-r border-line p-3 md:flex">
          <nav aria-label="Main" className="flex flex-col gap-0.5">
            {nav.map((n) => {
              const on = pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={on ? 'page' : undefined}
                  className={cn(
                    'press flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] transition-colors',
                    on ? 'bg-surface2 font-medium text-ink' : 'text-ink2 hover:bg-surface hover:text-ink',
                  )}
                >
                  <n.icon className={cn('h-4 w-4', on ? 'text-accent' : 'text-ink3')} />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          {ws && viewAs === 'builder' && <CreditsMeter ws={ws} />}
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

/** Old header, kept so older screens keep working while they move to AppShell. */
export function WorkspaceBar({ right }: { right?: ReactNode }) {
  return (
    <TopBar
      left={<Logo />}
      right={
        <>
          {right}
          <SaveBadge />
          <SearchButton />
          <PersonSwitch />
          <UserMenu />
        </>
      }
    />
  );
}

export function Toaster() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);
  // Keep at most three on screen; each one leaves on its own timer.
  useEffect(() => {
    if (toasts.length > 3) toasts.slice(0, toasts.length - 3).forEach((t) => dismiss(t.id));
  }, [toasts, dismiss]);
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[70] flex w-max max-w-[calc(100vw-24px)] -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
      {toasts.slice(-3).map((t) => (
        <ToastItem key={t.id} t={t} onDone={dismiss} />
      ))}
    </div>
  );
}

function ToastItem({ t, onDone }: { t: ToastMsg; onDone: (id: string) => void }) {
  const ms = t.ms ?? (t.actions?.length ? 7000 : 3600);
  const [paused, setPaused] = useState(false);
  const left = useRef(ms);
  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = window.setTimeout(() => onDone(t.id), left.current);
    return () => {
      window.clearTimeout(timer);
      left.current = Math.max(400, left.current - (Date.now() - started));
    };
  }, [paused, onDone, t.id]);
  return (
    <div
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      className={cn(
        'pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-xl border py-2.5 pl-3.5 pr-2 text-[14px] shadow-pop animate-toast-in',
        t.tone === 'bad' ? 'border-bad-line bg-bad-soft text-ink' : 'border-line2 bg-surface2 text-ink',
      )}
      role="status"
    >
      {t.tone === 'ok' && (
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ok text-on-ok">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
      <span className="pr-1">{t.text}</span>
      {t.actions?.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={() => {
            a.run();
            onDone(t.id);
          }}
          className={cn(
            'press h-8 shrink-0 rounded-lg px-2.5 text-[13.5px] font-medium',
            a.primary ? 'bg-accent text-on-accent hover:brightness-110' : 'text-accent-ink hover:bg-sunken',
          )}
        >
          {a.label}
        </button>
      ))}
      <button type="button" onClick={() => onDone(t.id)} aria-label="Dismiss" className="press grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink3 hover:bg-sunken hover:text-ink">
        <X className="h-3.5 w-3.5" />
      </button>
      {!!t.actions?.length && (
        <span
          aria-hidden
          className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-accent/70"
          style={{ animation: `countdown ${ms}ms linear forwards`, animationPlayState: paused ? 'paused' : 'running' }}
        />
      )}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3 text-[13.5px] text-ink3">
        <LogoMark size={22} />
        <span className="animate-pulse2">Loading…</span>
      </div>
    </div>
  );
}

/** Renders children only after the saved state loads, and sends signed-out visitors to sign in. */
export function RequireAuth({ children, needWorkspace = true }: { children: ReactNode; needWorkspace?: boolean }) {
  const ready = useHydrated();
  const signedIn = useApp((s) => s.signedIn);
  const ws = useApp((s) => s.workspace);
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    if (!signedIn) router.replace('/signin');
    else if (needWorkspace && !ws) router.replace('/setup');
  }, [ready, signedIn, ws, needWorkspace, router]);
  if (!ready || !signedIn || (needWorkspace && !ws)) return <Loading />;
  return <>{children}</>;
}
