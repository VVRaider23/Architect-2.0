'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, CloudCheck, CloudOff, Compass, Loader2, LogOut, RotateCcw } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useHydrated } from '@/lib/hooks';
import { PEOPLE } from '@/lib/seed';
import { logOutRequest, useServer } from '@/lib/account';
import type { Role } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar } from './ui';

export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#1D1C1A" />
      <path d="M8 23 L16 8 L24 23" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M11.5 17.5 H20.5" stroke="#8FA6F0" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = '/home' }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-lg pr-1 text-[15.5px] font-semibold tracking-tight text-ink">
      <LogoMark />
      <span>Architect</span>
      <span className="rounded-md border border-line bg-sunken px-1.5 py-[1px] font-mono text-[10.5px] font-medium text-ink2">2.0</span>
    </Link>
  );
}

const ROLE_LABEL: Record<Role, string> = { builder: 'Builder', reviewer: 'Reviewer', approver: 'Approver' };
const ROLE_SEES: Record<Role, string> = {
  builder: 'Builds, owns the code, ships',
  reviewer: 'Reviews answers. No code.',
  approver: 'Approves launches. No code.',
};
export const roleLabel = (r: Role) => ROLE_LABEL[r];

export function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOut: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOut();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onOut]);
}

export function ViewAsSwitch({ onSwitch }: { onSwitch?: (role: Role) => void }) {
  const viewAs = useApp((s) => s.viewAs);
  const setViewAs = useApp((s) => s.setViewAs);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const me = PEOPLE.find((p) => p.role === viewAs)!;
  return (
    <div ref={ref} className="relative" data-tour="person-switch">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Demo switch: see the project as Arjun, Meera or Farah"
        className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface2 pl-1.5 pr-2.5 text-[12.5px] text-ink hover:border-line2"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar initials={me.initials} size={24} tone={viewAs === 'builder' ? 'accent' : viewAs === 'reviewer' ? 'ok' : 'warn'} />
        <span className="text-ink2">View as</span>
        <span className="font-semibold">
          {me.short} · {ROLE_LABEL[viewAs]}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-ink2" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-40 w-[300px] rounded-xl border border-line bg-surface p-1.5 shadow-pop animate-slide-up">
          <div className="px-2.5 pb-1.5 pt-1 text-[11.5px] text-ink2">
            Demo switch: see the same project as each person, without three accounts.
          </div>
          {PEOPLE.map((p) => (
            <button
              key={p.id}
              role="menuitemradio"
              aria-checked={p.role === viewAs}
              onClick={() => {
                setViewAs(p.role);
                setOpen(false);
                onSwitch?.(p.role);
              }}
              className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-sunken', p.role === viewAs && 'bg-accent-soft')}
            >
              <Avatar initials={p.initials} size={30} tone={p.role === 'builder' ? 'accent' : p.role === 'reviewer' ? 'ok' : 'warn'} />
              <span className="flex-1">
                <span className="block text-[13px] font-semibold">
                  {p.name} · {ROLE_LABEL[p.role]}
                </span>
                <span className="block text-[12px] text-ink2">
                  {p.title} · {ROLE_SEES[p.role]}
                </span>
              </span>
              {p.role === viewAs && <Check className="h-4 w-4 text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const email = useApp((s) => s.userEmail);
  const authMode = useApp((s) => s.authMode);
  const resetDemo = useApp((s) => s.resetDemo);
  const signOut = useApp((s) => s.signOut);
  const router = useRouter();
  const viewAs = useApp((s) => s.viewAs);
  const me = PEOPLE.find((p) => p.role === viewAs)!;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Account menu" className="rounded-full">
        <Avatar initials={me.initials} size={34} />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-[260px] rounded-xl border border-line bg-surface p-1.5 shadow-pop animate-slide-up">
          <div className="px-3 py-2">
            <div className="text-[13px] font-semibold">{me.name}</div>
            <div className="text-[12px] text-ink2">{viewAs === 'builder' ? email || me.email : `${me.email} · demo view`}</div>
            <div className="mt-1 text-[11.5px] text-ink3">{authMode === 'demo' ? 'Demo sign-in · saved in this browser' : 'Your account · saved to the database'}</div>
          </div>
          <Link href="/tour" onClick={() => setOpen(false)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-sunken">
            <Compass className="h-4 w-4 text-ink2" /> Take the guided tour
          </Link>
          <button
            onClick={() => {
              if (authMode === 'account') {
                if (confirm('Start over? This deletes the projects saved in your account.')) {
                  useApp.setState({ projects: [], audit: [] });
                  router.push('/home');
                }
              } else if (confirm('Reset the demo? This clears projects and decisions saved in this browser.')) {
                resetDemo();
                router.push('/');
              }
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-sunken"
          >
            <RotateCcw className="h-4 w-4 text-ink2" /> {authMode === 'account' ? 'Start over' : 'Reset demo data'}
          </button>
          <button
            onClick={async () => {
              if (authMode === 'account') {
                await logOutRequest().catch(() => undefined);
                await useServer.getState().refresh();
                resetDemo();
              } else signOut();
              router.push('/');
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-sunken"
          >
            <LogOut className="h-4 w-4 text-ink2" /> Sign out
          </button>
        </div>
      )}
    </div>
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
      className={cn('hidden items-center gap-1.5 text-[12px] md:flex', save.status === 'error' ? 'text-bad' : 'text-ink2')}
      title={save.status === 'error' ? 'Could not reach the database. It will try again with your next change.' : 'Your work is saved to your account'}
    >
      {save.status === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : save.status === 'error' ? <CloudOff className="h-3.5 w-3.5" /> : <CloudCheck className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export function WorkspaceBar({ right }: { right?: ReactNode }) {
  const ws = useApp((s) => s.workspace);
  const pathname = usePathname();
  const viewAs = useApp((s) => s.viewAs);
  const items = [
    { href: '/home', label: 'Home' },
    { href: '/settings', label: viewAs === 'approver' ? 'Launch rules' : 'Settings' },
  ];
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-5 border-b border-line bg-surface px-5">
      <Logo />
      <div className="hidden h-8 items-center rounded-lg border border-line bg-surface2 px-2.5 text-[13px] font-medium md:flex">{ws?.name ?? 'Workspace'}</div>
      <nav aria-label="Workspace" className="flex h-14 items-stretch">
        {items.map((i) => {
          const active = pathname === i.href || (i.href !== '/home' && pathname.startsWith(i.href));
          return (
            <Link
              key={i.href}
              href={i.href}
              className={cn(
                'flex items-center border-b-2 px-3.5 text-[14px]',
                active ? 'border-accent font-semibold text-ink' : 'border-transparent text-ink2 hover:text-ink',
              )}
            >
              {i.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      {right}
      <SaveBadge />
      {ws && viewAs === 'builder' && <div className="hidden text-[12.5px] text-ink2 lg:block">Credits · {ws.credits.toLocaleString('en-US')}</div>}
      <ViewAsSwitch />
      <UserMenu />
    </header>
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
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex w-max max-w-[calc(100vw-32px)] -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
      {toasts.slice(-3).map((t) => (
        <ToastItem key={t.id} id={t.id} text={t.text} tone={t.tone} onDone={dismiss} />
      ))}
    </div>
  );
}

function ToastItem({ id, text, tone, onDone }: { id: string; text: string; tone: 'neutral' | 'ok' | 'bad'; onDone: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDone(id), 3600);
    return () => clearTimeout(t);
  }, [id, onDone]);
  return (
    <div
      className={cn(
        'pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13.5px] shadow-pop animate-slide-up',
        tone === 'ok' ? 'border-ok-line bg-surface text-ink' : tone === 'bad' ? 'border-bad-line bg-bad-soft text-bad' : 'border-line bg-ink text-white',
      )}
    >
      {tone === 'ok' && <Check className="h-4 w-4 shrink-0 text-ok" />}
      {text}
    </div>
  );
}

/** Renders children only after the saved state loads, and sends signed-out visitors to sign-in. */
export function RequireAuth({ children, needWorkspace = true }: { children: ReactNode; needWorkspace?: boolean }) {
  const ready = useHydrated();
  const signedIn = useApp((s) => s.signedIn);
  const ws = useApp((s) => s.workspace);
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    if (!signedIn) router.replace('/');
    else if (needWorkspace && !ws) router.replace('/setup');
  }, [ready, signedIn, ws, needWorkspace, router]);
  if (!ready || !signedIn || (needWorkspace && !ws)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-[13px] text-ink2">
          <LogoMark size={22} /> Loading…
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
