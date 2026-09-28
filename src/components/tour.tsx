'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { create } from 'zustand';
import { ArrowRight, Compass, Minus, X } from 'lucide-react';
import { useApp, type ReviewInput } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { latestRun } from '@/lib/engine';
import { AUDIENCES, CONDITIONS, approvedFor, openTasks, pendingRequest } from '@/lib/stage';
import { PEOPLE } from '@/lib/seed';
import type { Project, Role, Tab } from '@/lib/types';
import { Avatar, Button } from '@/components/ui';
import { cn } from '@/lib/utils';

/* ---------- State ---------- */

interface TourState {
  pid: string | null;
  i: number;
  minimized: boolean;
  busy: boolean;
  start: (pid: string) => void;
  go: (i: number) => void;
  stop: () => void;
  setMinimized: (b: boolean) => void;
  setBusy: (b: boolean) => void;
}

export const useTour = create<TourState>()((set) => ({
  pid: null,
  i: 0,
  minimized: false,
  busy: false,
  start: (pid) => set({ pid, i: 0, minimized: false, busy: false }),
  go: (i) => set({ i, busy: false }),
  stop: () => set({ pid: null, i: 0, busy: false, minimized: false }),
  setMinimized: (minimized) => set({ minimized }),
  setBusy: (busy) => set({ busy }),
}));

/* ---------- The script ---------- */

const app = () => useApp.getState();
const find = (pid: string) => app().projects.find((p) => p.id === pid);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const home = (p: Project) => `/p/${p.id}`;

const TONE: Record<Role, 'accent' | 'ok' | 'warn'> = { builder: 'accent', reviewer: 'ok', approver: 'warn' };
const WHO: Record<Role, string> = {
  builder: 'Arjun, the builder',
  reviewer: 'Meera, the claims expert',
  approver: 'Farah, from IT',
};

type Chapter = 'Welcome' | 'Build' | 'Prove' | 'Sign off' | 'Ship' | 'Learn' | 'Done';

interface Step {
  id: string;
  chapter: Chapter;
  title: string;
  body: (p: Project) => ReactNode;
  as: Role;
  path: (p: Project) => string;
  tab?: Tab;
  /** The element to highlight: its data-tour name. */
  target?: string;
  cta: string;
  act?: (p: Project) => void | Promise<void>;
  /** When true, the step is complete and the tour moves on by itself. */
  done?: (p: Project) => boolean;
  enter?: (p: Project) => void;
}

/** Meera's review, done for the visitor: wrong answers get the expected answer, the rest are confirmed. */
async function reviewAll(pid: string) {
  const start = find(pid);
  if (!start) return;
  for (const t of start.tasks.filter((x) => !x.done)) {
    await sleep(140);
    const p = find(pid);
    if (!p) return;
    const item = p.answerKey.find((i) => i.id === t.itemId);
    const run = p.runs.find((r) => r.id === t.runId) ?? latestRun(p);
    const res = run?.results.find((r) => r.itemId === t.itemId);
    let input: ReviewInput = { verdict: 'right' };
    if (item && res && !res.pass) {
      const rule =
        item.claim.kind === 'theft' && item.expected.action === 'ask_police_report'
          ? 'Theft claims need a police report number before approval.'
          : item.claim.kind === 'theft' && item.expected.action === 'normal_review'
            ? 'Theft claims with a police report go to normal review, with no payout promised.'
            : undefined;
      input = { verdict: 'wrong', correction: item.expectedText, correctRisk: item.expected.risk, correctAction: item.expected.action, rule };
    }
    app().submitReview(pid, t.id, input);
  }
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    chapter: 'Welcome',
    title: 'Three people, one app',
    body: () => (
      <>
        <span className="block">Harborline Insurance wants an assistant that sorts incoming claims. Three people get it live:</span>
        <span className="mt-2.5 grid gap-2">
          {(
            [
              ['builder', 'builds the app with Architect'],
              ['reviewer', 'claims expert: checks the answers'],
              ['approver', 'IT: approves what goes live'],
            ] as const
          ).map(([role, does]) => {
            const person = PEOPLE.find((x) => x.role === role)!;
            return (
              <span key={role} className="flex items-center gap-2.5">
                <Avatar initials={person.initials} size={28} tone={TONE[role]} />
                <span className="text-[13px] leading-tight">
                  <b className="text-ink">{person.short}</b> <span className="text-ink2">{does}</span>
                </span>
              </span>
            );
          })}
        </span>
        <span className="mt-2.5 block">You will play all three. The highlighted menu switches between them.</span>
      </>
    ),
    as: 'builder',
    path: home,
    tab: 'plan',
    target: 'person-switch',
    cta: 'Start',
  },
  {
    id: 'plan',
    chapter: 'Build',
    title: 'Describe it, get a plan',
    body: () => (
      <>
        Arjun described the app in one sentence (it is in the chat on the left). Architect asked three quick questions. Now it drafts a one-page plan, like a product
        manager would.
      </>
    ),
    as: 'builder',
    path: home,
    tab: 'plan',
    target: 'next-action',
    cta: 'Draft the plan',
    act: (p) => app().draftPlan(p.id),
    done: (p) => !!p.plan,
  },
  {
    id: 'approve',
    chapter: 'Build',
    title: 'Nothing is built until you approve',
    body: () => <>The plan lists the screens, the AI agents, what each agent may touch, and three example answers. Arjun reads it and approves.</>,
    as: 'builder',
    path: home,
    tab: 'plan',
    target: 'next-action',
    cta: 'Approve and build',
    act: (p) => app().approvePlan(p.id),
    done: (p) => p.planApproved,
  },
  {
    id: 'build',
    chapter: 'Build',
    title: 'Architect builds it',
    body: () => <>It writes the agents, the app screens and the code, then tests the app straight away. This takes about 20 seconds, or you can skip ahead.</>,
    as: 'builder',
    path: home,
    tab: 'preview',
    target: 'next-action',
    cta: 'Skip to the finished app',
    act: (p) => app().skipBuild(p.id),
    done: (p) => p.build.status === 'done',
  },
  {
    id: 'app',
    chapter: 'Build',
    title: 'The app, in test mode',
    body: (p) => {
      const run = latestRun(p);
      const miss = run ? run.total - run.passed : 0;
      return (
        <>
          Test mode runs example claims through the app and compares each answer with the answer an expert expects.{' '}
          <b className="text-ink">
            {run?.passed} of {run?.total}
          </b>{' '}
          match. The {miss} misses are all theft claims.
        </>
      );
    },
    as: 'builder',
    path: home,
    tab: 'preview',
    target: 'test-bar',
    cta: 'Next',
  },
  {
    id: 'prove',
    chapter: 'Prove',
    title: 'Who decides what is right?',
    body: () => (
      <>
        The expected answers live in the <b className="text-ink">Answer Key</b>. Arjun is an engineer, not a claims expert, so he invites Meera, the claims lead, to check them.
        She never sees code.
      </>
    ),
    as: 'builder',
    path: home,
    tab: 'proof',
    target: 'next-action',
    cta: 'Invite Meera',
    act: (p) =>
      app().invite(
        p.id,
        [
          { email: 'meera.k@harborline.com', role: 'reviewer', at: Date.now() },
          { email: 'farah.s@harborline.com', role: 'approver', at: Date.now() },
        ],
        'Meera, could you check these answers? Your corrections become tests.',
      ),
    done: (p) => p.tasks.length > 0,
  },
  {
    id: 'review',
    chapter: 'Prove',
    title: 'Now you are Meera',
    body: () => (
      <>
        Meera sees each answer in plain words and marks it <b className="text-ok">right</b> or <b className="text-bad">wrong</b>. When it is wrong, she writes the right
        answer, and it becomes a new test the app must pass.
      </>
    ),
    as: 'reviewer',
    path: (p) => `/p/${p.id}/review`,
    target: 'review-buttons',
    cta: 'Review them all for me',
    act: (p) => reviewAll(p.id),
    done: (p) => p.reviews.length > 0 && openTasks(p).length === 0,
  },
  {
    id: 'fix',
    chapter: 'Prove',
    title: 'Back to Arjun: fix it',
    body: (p) => {
      const run = latestRun(p);
      const miss = run ? run.total - run.passed : 0;
      return (
        <>
          Meera’s corrections pinned down the problem: theft claims need a police report number. {miss} examples fail. Arjun asks Architect to fix them, and gets a
          receipt: what changed, what got fixed, what broke.
        </>
      );
    },
    as: 'builder',
    path: home,
    tab: 'proof',
    target: 'next-action',
    cta: 'Fix the failing examples',
    act: (p) => app().sendChat(p.id, 'Fix the misses: theft claims need a police report number before approval.'),
    done: (p) => p.version >= 2,
  },
  {
    id: 'signoff',
    chapter: 'Sign off',
    title: 'Ask IT to sign off',
    body: () => (
      <>
        Every launch rule passes now. Arjun sends a <b className="text-ink">Launch Pack</b> to Farah, who looks after IT and security: one page of evidence, put together
        automatically.
      </>
    ),
    as: 'builder',
    path: home,
    tab: 'signoff',
    target: 'next-action',
    cta: 'Send it to Farah',
    act: (p) => void app().requestSignoff(p.id, 'test', AUDIENCES[0]),
    done: (p) => !!pendingRequest(p) || !!approvedFor(p, 'test'),
  },
  {
    id: 'decide',
    chapter: 'Sign off',
    title: 'Now you are Farah',
    body: () => (
      <>
        She sees the test results, Meera’s review, what data the app can touch and what it costs, on one page. She approves a pilot for the claims team, with
        conditions.
      </>
    ),
    as: 'approver',
    path: (p) => {
      const r = pendingRequest(p) ?? p.requests[p.requests.length - 1];
      return r ? `/p/${p.id}/requests/${r.id}` : home(p);
    },
    target: 'decision',
    cta: 'Approve the pilot',
    act: (p) => {
      const r = pendingRequest(p);
      if (r) app().decide(p.id, r.id, 'approved_conditions', CONDITIONS.test.slice(0, 2), 'Good evidence. Start with the claims team only.');
    },
    done: (p) => !!approvedFor(p, 'test'),
  },
  {
    id: 'ship',
    chapter: 'Ship',
    title: 'Deploy to a pilot group',
    body: (p) => (
      <>
        Back to Arjun. He deploys v{p.version} to <b className="text-ink">Test</b>, where the claims team uses it for real. Going Live works the same way, with one more
        approval from Farah.
      </>
    ),
    as: 'builder',
    path: home,
    tab: 'ship',
    target: 'deploy-test',
    cta: 'Deploy to Test',
    act: (p) => void app().deploy(p.id, 'test'),
    done: (p) => p.deployments.test.status === 'running',
  },
  {
    id: 'learn',
    chapter: 'Learn',
    title: 'People flag wrong answers',
    body: () => (
      <>
        Pilot users can flag an answer they think is wrong. Flags land here. Meera checks each one, and her correction becomes a new test, so the same mistake cannot
        come back.
      </>
    ),
    as: 'builder',
    path: home,
    tab: 'live',
    target: 'flags',
    cta: 'Next',
    enter: (p) => app().arriveFlagsNow(p.id),
  },
  {
    id: 'done',
    chapter: 'Done',
    title: 'That is the whole loop',
    body: () => (
      <>
        <b className="text-ink">Build → Prove → Sign off → Ship → Learn.</b> Every change is tested against your experts’ examples, and nothing reaches real people
        without the right sign-off. The steps bar at the top always shows where a project is.
      </>
    ),
    as: 'builder',
    path: home,
    tab: 'live',
    target: 'journey',
    cta: 'Build my own app',
  },
];

export const TOUR_LENGTH = STEPS.length;

/* ---------- UI ---------- */

type Rect = { x: number; y: number; w: number; h: number };

/** Where the highlighted element is on screen, kept up to date as the page moves. */
function useTargetRect(target?: string, active = true): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);
  useEffect(() => {
    if (!target || !active) {
      setRect(null);
      return;
    }
    let last = '';
    const tick = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
      const r = el?.getBoundingClientRect();
      const next = r && r.width > 0 && r.height > 0 ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
      const key = next ? `${Math.round(next.x)},${Math.round(next.y)},${Math.round(next.w)},${Math.round(next.h)}` : '';
      if (key !== last) {
        last = key;
        setRect(next);
      }
    };
    tick();
    const t = setInterval(tick, 120);
    // Bring it into view once, if it is off screen.
    const s = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
      const r = el?.getBoundingClientRect();
      if (el && r && (r.top < 0 || r.bottom > window.innerHeight)) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 450);
    return () => {
      clearInterval(t);
      clearTimeout(s);
    };
  }, [target, active]);
  return rect;
}

/** A ring around the element the visitor should look at, kept inside the window. */
function Ring({ rect }: { rect: Rect }) {
  const pad = 5;
  const left = Math.max(3, rect.x - pad);
  const top = Math.max(3, rect.y - pad);
  const right = Math.min(window.innerWidth - 3, rect.x + rect.w + pad);
  const bottom = Math.min(window.innerHeight - 3, rect.y + rect.h + pad);
  if (right - left < 8 || bottom - top < 8) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[65] rounded-xl border-2 border-accent animate-tour"
      style={{ left, top, width: right - left, height: bottom - top }}
    />
  );
}

/** The card sits bottom-right unless that would cover the highlighted element. */
function cardSide(rect: Rect | null): 'right' | 'left' {
  if (!rect || typeof window === 'undefined') return 'right';
  const card = { x: window.innerWidth - 400, y: window.innerHeight - 340, w: 400, h: 340 };
  const overlaps = rect.x < card.x + card.w && rect.x + rect.w > card.x && rect.y < card.y + card.h && rect.y + rect.h > card.y;
  const wide = rect.w > window.innerWidth * 0.6;
  return overlaps && !wide ? 'left' : 'right';
}

/** The narrator: one card that explains each step and can do it for the visitor. */
export function TourCard() {
  const { pid, i, minimized, busy, go, stop, setMinimized, setBusy } = useTour();
  const p = useApp((s) => (pid ? s.projects.find((x) => x.id === pid) : undefined));
  const router = useRouter();
  const pathname = usePathname();
  const step = STEPS[i];
  const entered = useRef<string | null>(null);
  const advancing = useRef(false);
  const rect = useTargetRect(step?.target, !!pid && !minimized);

  // Enter a step: become the right person, open the right screen.
  useEffect(() => {
    if (!pid || !step) return;
    const proj = find(pid);
    if (!proj) return;
    // The /tour page opens the project itself; wait until it has.
    if (window.location.pathname === '/tour') return;
    const key = `${pid}:${i}`;
    if (entered.current === key) return;
    entered.current = key;
    advancing.current = false;
    if (app().viewAs !== step.as) app().setViewAs(step.as);
    step.enter?.(proj);
    const path = step.path(proj);
    if (window.location.pathname !== path) router.push(step.tab ? `${path}?tab=${step.tab}` : path);
    else if (step.tab) useUI.getState().setTab(step.tab);
  }, [pid, i, step, router, pathname]);

  // Move on by itself once the step is complete, whoever clicked.
  useEffect(() => {
    if (!p || !step?.done || advancing.current) return;
    if (step.done(p)) {
      advancing.current = true;
      const t = setTimeout(() => go(i + 1), 900);
      return () => clearTimeout(t);
    }
  }, [p, step, i, go]);

  // The project was deleted or the visitor signed out: end quietly.
  useEffect(() => {
    if (pid && !p && app().projects.length === 0) stop();
  }, [pid, p, stop]);

  if (!pid || !p || !step) return null;
  const hidden = pathname === '/' || pathname === '/setup';
  if (hidden) return null;

  const last = i === STEPS.length - 1;
  const person = PEOPLE.find((x) => x.role === step.as)!;

  const finish = () => {
    try {
      window.localStorage.setItem('arch_tour_promo', 'hidden');
    } catch {
      /* private mode: nothing to remember */
    }
    stop();
  };

  const primary = async () => {
    if (last) {
      finish();
      router.push('/home');
      return;
    }
    if (step.act) {
      setBusy(true);
      try {
        await step.act(p);
      } finally {
        // If the action did not complete the step (for example a rule failed), let the visitor try again.
        setTimeout(() => useTour.getState().setBusy(false), 1500);
      }
      const fresh = find(p.id);
      if (!step.done && fresh) go(i + 1);
    } else go(i + 1);
  };

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-5 right-5 z-[70] flex items-center gap-2 rounded-full border border-accent-line bg-surface py-2 pl-3 pr-4 text-[13px] font-medium shadow-pop hover:border-accent"
      >
        <Compass className="h-4 w-4 text-accent" /> Guided tour · {i + 1} of {STEPS.length}
        <span className="text-accent">Resume</span>
      </button>
    );
  }

  return (
    <>
      {rect && <Ring rect={rect} />}
      <section
        role="dialog"
        aria-label="Guided tour"
        className={cn(
          'fixed bottom-4 z-[70] w-[380px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-line bg-surface shadow-pop animate-slide-up',
          cardSide(rect) === 'left' ? 'left-4' : 'right-4',
        )}
      >
        <div className="flex items-center gap-2 border-b border-line bg-surface2 px-4 py-2">
          <Compass className="h-4 w-4 text-accent" />
          <span className="text-[12.5px] font-semibold">Guided tour</span>
          <span className="font-mono text-[11px] text-ink3">
            {i + 1} of {STEPS.length}
          </span>
          <div className="ml-auto flex items-center">
            <button onClick={() => setMinimized(true)} aria-label="Minimize the tour" className="rounded-md p-1 text-ink3 hover:bg-sunken hover:text-ink">
              <Minus className="h-4 w-4" />
            </button>
            <button onClick={stop} aria-label="End the tour" className="rounded-md p-1 text-ink3 hover:bg-sunken hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="px-4 pb-4 pt-3" key={step.id}>
          <div className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-accent">{step.chapter}</div>
          <h2 className="mt-0.5 text-[16.5px] font-semibold tracking-tight">{step.title}</h2>
          <div className="mt-1.5 text-[13.5px] leading-relaxed text-ink2">{step.body(p)}</div>
          {step.id !== 'welcome' && !last && (
            <div className="mt-3 flex items-center gap-2 text-[12px] text-ink2">
              <Avatar initials={person.initials} size={22} tone={TONE[step.as]} />
              You are {WHO[step.as]}
            </div>
          )}
          <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Button variant="primary" onClick={primary} loading={busy} icon={last ? undefined : <ArrowRight className="h-4 w-4" />}>
              {step.cta}
            </Button>
            {last ? (
              <Button variant="ghost" onClick={finish}>
                Keep exploring
              </Button>
            ) : (
              step.act &&
              step.target && <span className="text-[12px] text-ink3">or click the highlighted {step.target === 'review-buttons' ? 'buttons' : 'button'} yourself</span>
            )}
          </div>
        </div>
        <ol className="flex gap-1 px-4 pb-3" aria-hidden>
          {STEPS.map((s, n) => (
            <li key={s.id} className={cn('h-1 flex-1 rounded-full', n < i ? 'bg-accent' : n === i ? 'bg-accent/50' : 'bg-line')} />
          ))}
        </ol>
      </section>
    </>
  );
}
