'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useApp } from '@/lib/store';
import { useHydrated } from '@/lib/hooks';
import { navProgress, useRouter } from '@/lib/nav';
import type { StepKey } from '@/lib/stage';
import { cn } from '@/lib/utils';
import type { WorkTab } from './frame';
import { AppShell, Logo, LogoMark, PersonSwitch, TopBar, UserMenu } from './shell';
import { ProjectTopBar } from './project-bar';
import { Segmented } from './ui';

/*
 * What you see for the moment between screens.
 *
 * Each placeholder has the same frame as the screen that's coming (same top bar, same columns),
 * with grey shapes where the content will be. The top bar is the real one whenever we can
 * draw it, so only the middle of the page changes. Shapes fade in after a beat, so a fast
 * load shows nothing at all.
 */

/** A grey shape where something is about to appear. */
export function Bone({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden className={cn('bone', className)} style={style} />;
}

/** Tells screen readers the screen is loading, and keeps the line at the top moving while it's up. */
function Busy({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  useEffect(() => navProgress.hold(), []);
  return (
    <div data-skeleton aria-busy="true" className={className}>
      <span role="status" className="sr-only">
        Loading {label}
      </span>
      {children}
    </div>
  );
}

/** Lines of text of different lengths, so a block reads as a paragraph. */
function Lines({ n = 3, className }: { n?: number; className?: string }) {
  return (
    <div className={cn('space-y-2.5', className)}>
      {Array.from({ length: n }, (_, i) => (
        <Bone key={i} className="h-3.5 rounded-md" style={{ width: i === n - 1 ? '58%' : `${92 - ((i * 13) % 20)}%` }} />
      ))}
    </div>
  );
}

function useProjectForSkeleton() {
  const ready = useHydrated();
  const { id } = useParams<{ id?: string }>();
  const p = useApp((s) => (id ? s.projects.find((x) => x.id === id) : undefined));
  return ready ? p : undefined;
}

/** The project's real top bar when we have it; otherwise its outline. */
function ProjectBar({ section }: { section: StepKey }) {
  const p = useProjectForSkeleton();
  const [now] = useState(() => Date.now());
  if (p) return <ProjectTopBar p={p} section={section} now={now} />;
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-bg/85 px-3 backdrop-blur-md sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <LogoMark />
        <span className="text-ink3/60" aria-hidden>
          /
        </span>
        <Bone className="h-3.5 w-36 rounded-md" />
      </div>
      <Bone className="hidden h-[38px] w-[430px] rounded-xl lg:block" />
      <div className="flex flex-1 items-center justify-end gap-2">
        <Bone className="h-8 w-8 rounded-lg" />
        <Bone className="h-8 w-[76px] rounded-lg" />
        <Bone className="h-8 w-8 rounded-full" />
      </div>
    </header>
  );
}

/** Title, a line under it, a few cards and the main button: the shape of most one-job screens. */
function FocusBody({ wide }: { wide?: boolean }) {
  return (
    <div className={cn('w-full', wide ? 'max-w-[720px]' : 'max-w-[560px]')}>
      <Bone className="h-9 w-4/5 rounded-lg" />
      <Bone className="mt-4 h-4 w-3/5 rounded-md" />
      <div className="mt-9 space-y-3">
        <Bone className="h-[88px] rounded-xl" />
        <Bone className="h-[88px] rounded-xl" />
        <Bone className="h-[88px] w-[92%] rounded-xl" />
      </div>
      <Bone className="mt-8 h-11 w-44 rounded-xl" />
    </div>
  );
}

/** Screens with one job: questions, plan, results, answers, sign-off, ship, learn. */
export function FocusSkeleton({ section, wide, label = 'the next screen' }: { section: StepKey; wide?: boolean; label?: string }) {
  return (
    <Busy label={label} className="flex min-h-screen flex-col">
      <ProjectBar section={section} />
      <main className="flex flex-1 justify-center px-4 pb-24 pt-[8vh] sm:px-6">
        <FocusBody wide={wide} />
      </main>
    </Busy>
  );
}

/** The build: the drawing on the left, the steps on the right. */
export function BuildSkeleton() {
  return (
    <Busy label="the build" className="flex min-h-screen flex-col">
      <ProjectBar section="build" />
      <main className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="grid-bg flex items-center justify-center border-b border-line p-6 lg:border-b-0 lg:border-r lg:p-10">
          <Bone className="aspect-[16/10] w-full max-w-[640px] rounded-xl" />
        </div>
        <div className="p-6 lg:p-8">
          <Bone className="h-7 w-3/4 rounded-lg" />
          <Bone className="mt-3 h-4 w-1/2 rounded-md" />
          <div className="mt-8 space-y-1">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="flex h-10 items-center gap-3 px-2">
                <Bone className="h-5 w-5 rounded-full" />
                <Bone className="h-3.5 rounded-md" style={{ width: `${48 + ((i * 17) % 36)}%` }} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </Busy>
  );
}

const TAB_LABEL: Record<WorkTab, string> = { app: 'the app', agents: 'the agents', code: 'the code' };

/** App, Agents and Code: the chat on the left, the thing you're looking at on the right. */
export function WorkspaceSkeleton({ tab }: { tab: WorkTab }) {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  return (
    <Busy label={TAB_LABEL[tab]} className="flex h-screen flex-col overflow-hidden">
      <ProjectBar section="build" />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[340px] shrink-0 flex-col border-r border-line bg-surface lg:flex xl:w-[360px]">
          <div className="flex-1 space-y-5 px-4 py-4">
            <div className="flex gap-2.5">
              <Bone className="h-6 w-6 shrink-0 rounded-full" />
              <Lines n={3} className="flex-1" />
            </div>
            <Bone className="ml-10 h-10 rounded-2xl" />
            <div className="flex gap-2.5">
              <Bone className="h-6 w-6 shrink-0 rounded-full" />
              <Lines n={2} className="flex-1" />
            </div>
          </div>
          <div className="border-t border-line p-3">
            <Bone className="h-11 rounded-xl" />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3">
            <Segmented
              value={tab}
              label="What to look at"
              options={[
                { id: 'app', label: 'App' },
                { id: 'agents', label: 'Agents' },
                { id: 'code', label: 'Code' },
              ]}
              onChange={(t) => router.push(`/p/${id}/${t}`)}
            />
            <div className="flex flex-1 items-center justify-end gap-2">
              <Bone className="h-8 w-[88px] rounded-lg" />
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            {tab === 'app' ? (
              <div className="grid-bg absolute inset-0 p-4 sm:p-6">
                <div className="paper mx-auto flex h-[calc(100%-8px)] min-h-[420px] max-w-[1120px] overflow-hidden rounded-xl border border-line bg-bg">
                  <div className="hidden w-[200px] shrink-0 space-y-3 border-r border-line p-4 md:block">
                    <Bone className="h-5 w-24 rounded-md" />
                    {Array.from({ length: 4 }, (_, i) => (
                      <Bone key={i} className="h-3.5 rounded-md" style={{ width: `${60 + i * 8}%` }} />
                    ))}
                  </div>
                  <div className="flex-1 p-5">
                    <Bone className="h-6 w-48 rounded-md" />
                    <div className="mt-6 space-y-2.5">
                      {Array.from({ length: 6 }, (_, i) => (
                        <Bone key={i} className="h-10 rounded-lg" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : tab === 'agents' ? (
              <div className="grid-bg absolute inset-0 flex items-center justify-center p-6">
                <div className="grid w-full max-w-[720px] grid-cols-3 gap-x-10 gap-y-12">
                  <Bone className="col-start-2 h-20 rounded-xl" />
                  <Bone className="h-20 rounded-xl" />
                  <Bone className="h-20 rounded-xl" />
                  <Bone className="h-20 rounded-xl" />
                  <Bone className="col-start-2 h-20 rounded-xl" />
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex">
                <div className="hidden w-[260px] shrink-0 space-y-2.5 border-r border-line px-4 py-4 md:block">
                  {Array.from({ length: 9 }, (_, i) => (
                    <Bone key={i} className="h-3.5 rounded-md" style={{ width: `${40 + ((i * 23) % 45)}%`, marginLeft: i % 3 ? 14 : 0 }} />
                  ))}
                </div>
                <div className="flex-1 space-y-3 bg-code p-6">
                  {Array.from({ length: 14 }, (_, i) => (
                    <Bone key={i} className="h-3 rounded" style={{ width: `${20 + ((i * 37) % 60)}%`, marginLeft: (i % 4) * 16 }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Busy>
  );
}

/** Meera's and Farah's screens: light, quiet, one column. */
export function PaperSkeleton({ title }: { title: string }) {
  const p = useProjectForSkeleton();
  return (
    <Busy label={title} className="paper min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-bg/90 px-3 backdrop-blur-md sm:px-4">
        <Link href="/home" className="press rounded-lg" aria-label="Home">
          <LogoMark />
        </Link>
        {p ? (
          <span className="min-w-0 truncate text-[14px]">
            <span className="font-medium">{p.name}</span>
            <span className="text-ink3"> · {title}</span>
          </span>
        ) : (
          <Bone className="h-3.5 w-48 rounded-md" />
        )}
        <div className="flex-1" />
        {p ? (
          <>
            <PersonSwitch compact />
            <UserMenu />
          </>
        ) : (
          <>
            <Bone className="h-8 w-[76px] rounded-lg" />
            <Bone className="h-8 w-8 rounded-full" />
          </>
        )}
      </header>
      <main className="flex justify-center px-4 pb-24 pt-[7vh] sm:px-6">
        <div className="w-full max-w-[600px]">
          <Bone className="h-9 w-3/4 rounded-lg" />
          <Bone className="mt-4 h-4 w-1/2 rounded-md" />
          <div className="mt-9 space-y-3">
            <Bone className="h-[112px] rounded-xl" />
            <Bone className="h-[112px] rounded-xl" />
            <Bone className="h-[112px] rounded-xl" />
          </div>
        </div>
      </main>
    </Busy>
  );
}

export type ShellPage = 'home' | 'list' | 'usage' | 'settings';

function ShellBody({ page }: { page: ShellPage }) {
  if (page === 'home')
    return (
      <div className="mx-auto w-full max-w-[680px] px-4 pb-24 pt-[9vh] sm:px-6">
        <Bone className="h-9 w-2/3 rounded-lg" />
        <Bone className="mt-6 h-[132px] rounded-2xl" />
        <div className="mt-4 flex gap-2">
          <Bone className="h-8 w-40 rounded-full" />
          <Bone className="h-8 w-36 rounded-full" />
          <Bone className="h-8 w-32 rounded-full" />
        </div>
        <Bone className="mt-12 h-3.5 w-28 rounded-md" />
        <div className="mt-4 space-y-2.5">
          <Bone className="h-[70px] rounded-xl" />
          <Bone className="h-[70px] rounded-xl" />
        </div>
      </div>
    );
  if (page === 'usage')
    return (
      <div className="mx-auto w-full max-w-[640px] px-4 pb-24 pt-10 sm:px-6">
        <Bone className="h-8 w-1/2 rounded-lg" />
        <Bone className="mt-3 h-4 w-2/3 rounded-md" />
        <Bone className="mt-8 h-[104px] rounded-xl" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Bone className="h-3.5 w-1/3 rounded-md" />
              <Bone className="h-2 rounded-full" style={{ width: `${30 + ((i * 29) % 60)}%` }} />
            </div>
          ))}
        </div>
      </div>
    );
  if (page === 'settings')
    return (
      <div className="mx-auto w-full max-w-[880px] px-4 pb-24 pt-10 sm:px-6">
        <Bone className="h-8 w-1/3 rounded-lg" />
        <Bone className="mt-6 h-9 w-[420px] max-w-full rounded-[10px]" />
        <Bone className="mt-6 h-[280px] rounded-xl" />
      </div>
    );
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-24 pt-10 sm:px-6">
      <Bone className="h-8 w-1/3 rounded-lg" />
      <Bone className="mt-3 h-4 w-1/2 rounded-md" />
      <div className="mt-8 space-y-2.5">
        {Array.from({ length: 4 }, (_, i) => (
          <Bone key={i} className="h-[70px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Home, Projects, Usage, Settings: the real sidebar and top bar when we can, grey shapes in the middle. */
export function ShellSkeleton({ page = 'list' }: { page?: ShellPage }) {
  const ready = useHydrated();
  const signedIn = useApp((s) => s.signedIn);
  if (ready && signedIn)
    return (
      <Busy label="the page">
        <AppShell>
          <ShellBody page={page} />
        </AppShell>
      </Busy>
    );
  return (
    <Busy label="the page" className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-bg/85 px-3 backdrop-blur-md sm:px-4">
        <Logo />
        <div className="flex-1" />
        <Bone className="h-8 w-[150px] rounded-lg" />
        <Bone className="h-8 w-8 rounded-full" />
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-[220px] shrink-0 space-y-2 border-r border-line p-3 md:block">
          {Array.from({ length: 4 }, (_, i) => (
            <Bone key={i} className="h-9 rounded-lg" />
          ))}
        </aside>
        <main className="min-w-0 flex-1">
          <ShellBody page={page} />
        </main>
      </div>
    </Busy>
  );
}

/** Sign in and the one setup question: a title and two big buttons, like the real screens. */
export function GetInSkeleton() {
  return (
    <Busy label="sign in" className="flex min-h-screen flex-col">
      <TopBar className="border-transparent bg-transparent" left={<Logo href="/" />} />
      <main className="flex flex-1 justify-center px-4 pb-20 pt-[12vh]">
        <div className="w-full max-w-[400px]">
          <Bone className="h-9 w-4/5 rounded-lg" />
          <Bone className="mt-3.5 h-4 w-1/2 rounded-md" />
          <div className="mt-8 flex flex-col gap-3">
            <Bone className="h-12 rounded-xl" />
            <Bone className="h-12 rounded-xl" />
          </div>
        </div>
      </main>
    </Busy>
  );
}

const FOCUS_SECTION: Record<string, StepKey> = { prove: 'prove', pr: 'prove', signoff: 'signoff', ship: 'ship', live: 'ship', api: 'ship', learn: 'learn' };
const WIDE = new Set(['prove', 'pr', 'ship', 'learn', 'api']);

/** The right placeholder for an address (by default, the one we're on). Used while the app first opens. */
export function RouteSkeleton({ path: to }: { path?: string | null }) {
  const here = usePathname() ?? '/';
  const path = to ?? here;
  const m = path.match(/^\/p\/[^/]+(?:\/([^/?#]+))?/);
  if (m) {
    const s = m[1] ?? '';
    if (s === 'app' || s === 'agents' || s === 'code') return <WorkspaceSkeleton tab={s} />;
    if (s === 'review') return <PaperSkeleton title="answers to check" />;
    if (s === 'requests') return <PaperSkeleton title="sign-off" />;
    if (s === 'build') return <BuildSkeleton />;
    return <FocusSkeleton section={FOCUS_SECTION[s] ?? 'build'} wide={WIDE.has(s)} />;
  }
  if (path.startsWith('/signin') || path.startsWith('/setup')) return <GetInSkeleton />;
  if (path.startsWith('/home')) return <ShellSkeleton page="home" />;
  if (path.startsWith('/usage')) return <ShellSkeleton page="usage" />;
  if (path.startsWith('/settings')) return <ShellSkeleton page="settings" />;
  return <ShellSkeleton page="list" />;
}
