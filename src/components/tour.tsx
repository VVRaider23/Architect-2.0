'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useRouter } from '@/lib/nav';
import { create } from 'zustand';
import { ArrowRight, Compass, Minus, X } from 'lucide-react';
import { useApp, type ReviewInput } from '@/lib/store';
import { latestRun } from '@/lib/engine';
import { AUDIENCES, CONDITIONS, approvedFor, pendingRequest } from '@/lib/stage';
import { PEOPLE } from '@/lib/seed';
import type { Project, Role } from '@/lib/types';
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
const at = (p: Project, screen: string) => `/p/${p.id}/${screen}`;
const lastChange = (p: Project) => [...p.changes].reverse().find((c) => !c.undone);

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
              ['approver', 'IT: approves who can use it'],
            ] as const
          ).map(([role, does]) => {
            const person = PEOPLE.find((x) => x.role === role)!;
            return (
              <span key={role} className="flex items-center gap-2.5">
                <Avatar initials={person.initials} size={28} tone={TONE[role]} />
                <span className="text-[13.5px] leading-tight">
                  <b className="text-ink">{person.short}</b> <span className="text-ink2">{does}</span>
                </span>
              </span>
            );
          })}
        </span>
        <span className="mt-2.5 block">You play all three. The highlighted switch changes who you are.</span>
      </>
    ),
    as: 'builder',
    path: (p) => at(p, 'questions'),
    target: 'person-switch',
    cta: 'Start',
  },
  {
    id: 'questions',
    chapter: 'Build',
    title: 'Three quick questions',
    body: () => <>Arjun described the app in one sentence. Architect asks three questions, one at a time. Press 1, 2 or 3, or let the tour answer.</>,
    as: 'builder',
    path: (p) => at(p, 'questions'),
    target: 'q-first',
    cta: 'Answer them for me',
    act: (p) => {
      app().answerConsultant(p.id, { users: ['Claims handlers'], systems: ['Gmail', 'Claims database', 'Policy PDFs'], risky: '' });
      app().setFramework(p.id, 'langgraph');
      app().draftPlan(p.id);
    },
    done: (p) => !!p.plan,
  },
  {
    id: 'plan',
    chapter: 'Build',
    title: 'Nothing is built until you say so',
    body: () => <>The plan is four plain steps. Arjun can change the framework or an answer. When it looks right, he presses Build it.</>,
    as: 'builder',
    path: (p) => at(p, 'plan'),
    target: 'plan-approve',
    cta: 'Build it',
    act: (p) => app().approvePlan(p.id),
    done: (p) => p.planApproved,
  },
  {
    id: 'build',
    chapter: 'Build',
    title: 'Watch it build',
    body: () => <>A drawing of the app fills in as Architect writes the agents, the screens and the code, then tests it. About 20 seconds, or skip ahead.</>,
    as: 'builder',
    path: (p) => at(p, 'build'),
    target: 'build-skip',
    cta: 'Skip the wait',
    act: (p) => app().skipBuild(p.id),
    done: (p) => p.build.status === 'done',
  },
  {
    id: 'ready',
    chapter: 'Build',
    title: 'Did it work?',
    body: (p) => {
      const run = latestRun(p);
      return (
        <>
          Architect checked every answer against examples an expert would give.{' '}
          <b className="text-ink">
            {run?.passed} of {run?.total}
          </b>{' '}
          match. The misses are all theft claims.
        </>
      );
    },
    as: 'builder',
    path: (p) => at(p, 'ready'),
    target: 'ready-score',
    cta: 'Next',
  },
  {
    id: 'invite',
    chapter: 'Prove',
    title: 'Only an expert can say it is right',
    body: () => <>Arjun is not a claims expert, so he asks Meera. She checks the answers in plain words and never sees code.</>,
    as: 'builder',
    path: (p) => at(p, 'prove'),
    target: 'ask-meera',
    cta: 'Invite Meera',
    act: (p) => app().invite(p.id, [{ email: 'meera.k@harborline.com', role: 'reviewer', at: Date.now() }], ''),
    done: (p) => p.tasks.length > 0,
  },
  {
    id: 'review',
    chapter: 'Prove',
    title: 'Meera checks the answers',
    body: () => <>Right, wrong or not sure, with the keys R, W and N. When she says wrong, she picks what it should have said, and that becomes a new test.</>,
    as: 'reviewer',
    path: (p) => at(p, 'review'),
    target: 'review-buttons',
    cta: 'Check them for me',
    act: (p) => reviewAll(p.id),
    done: (p) => p.tasks.length > 0 && p.tasks.every((t) => t.done),
  },
  {
    id: 'fix',
    chapter: 'Prove',
    title: 'Fix what is wrong',
    body: () => <>Meera’s corrections show the rule the app missed: theft needs a police report. One button fixes it and runs every test again. There is an Undo if it goes wrong.</>,
    as: 'builder',
    path: (p) => at(p, 'prove'),
    target: 'fix-all',
    cta: 'Fix them',
    act: (p) => {
      app().fixFailing(p.id);
    },
    done: (p) => {
      const run = latestRun(p);
      return !!run && run.passed === run.total && p.changes.length > 0;
    },
  },
  {
    id: 'merge',
    chapter: 'Prove',
    title: 'Every change is a pull request',
    body: () => <>The fix arrives as a pull request with its checks: the Answer Key, the unit tests and Meera’s new tests. Merge it when they pass.</>,
    as: 'builder',
    path: (p) => {
      const ch = lastChange(p);
      return ch ? at(p, `pr/${ch.id}`) : at(p, 'prove');
    },
    target: 'pr-merge',
    cta: 'Merge it',
    act: async (p) => {
      const ch = lastChange(p);
      if (!ch) return;
      await sleep(1900);
      app().mergeChange(p.id, ch.id);
    },
    done: (p) => !!lastChange(p)?.merged,
  },
  {
    id: 'signoff',
    chapter: 'Sign off',
    title: 'Ask IT for a small launch',
    body: () => <>Every launch rule has a tick. Arjun asks Farah to let the claims team, 12 people, use it on Test.</>,
    as: 'builder',
    path: (p) => at(p, 'signoff'),
    target: 'send-signoff',
    cta: 'Send to Farah',
    act: (p) => {
      app().requestSignoff(p.id, 'test', AUDIENCES[0]);
    },
    done: (p) => !!pendingRequest(p) || !!approvedFor(p, 'test'),
  },
  {
    id: 'decide',
    chapter: 'Sign off',
    title: 'Farah decides from one page',
    body: () => <>Every line comes from test runs and Meera’s checks, not from Arjun. She can add conditions, then approve.</>,
    as: 'approver',
    path: (p) => {
      const r = pendingRequest(p) ?? [...p.requests].reverse()[0];
      return r ? at(p, `requests/${r.id}`) : at(p, 'requests');
    },
    target: 'farah-approve',
    cta: 'Approve it',
    act: (p) => {
      const r = pendingRequest(p);
      if (r) app().decide(p.id, r.id, 'approved_conditions', [CONDITIONS.test[1]], '');
    },
    done: (p) => !!approvedFor(p, 'test'),
  },
  {
    id: 'ship',
    chapter: 'Ship',
    title: 'Deploy to the pilot group',
    body: () => <>Farah approved Test for the claims team. Live stays locked until she approves that too.</>,
    as: 'builder',
    path: (p) => at(p, 'ship'),
    target: 'deploy-test',
    cta: 'Deploy to Test',
    act: (p) => {
      app().deploy(p.id, 'test');
    },
    done: (p) => p.deployments.test.status === 'running' && p.deployments.test.version === p.version,
  },
  {
    id: 'learn',
    chapter: 'Learn',
    title: 'People flag what looks wrong',
    body: () => <>Claims handlers flagged two water damage answers during the pilot. Each flag goes to Meera, and her answer becomes a test.</>,
    as: 'builder',
    path: (p) => at(p, 'learn'),
    target: 'flags-send',
    enter: (p) => app().arriveFlagsNow(p.id),
    cta: 'Send them to Meera',
    act: (p) => {
      const now = Date.now();
      for (const f of p.flags.filter((x) => x.at <= now && x.status === 'open')) app().sendFlagToReview(p.id, f.id);
    },
    done: (p) => p.flags.length > 0 && p.flags.every((f) => f.status !== 'open'),
  },
  {
    id: 'done',
    chapter: 'Done',
    title: 'That is the whole loop',
    body: () => (
      <>
        Build, prove, sign off, ship, learn. From here Meera checks the flags, Arjun fixes water damage the same way, and Farah approves Live. Going live is press and hold, so it
        never happens by accident.
      </>
    ),
    as: 'builder',
    path: (p) => at(p, 'learn'),
    cta: 'Finish the tour',
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
      let next = r && r.width > 0 && r.height > 0 ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
      // Hide the ring while something else (a drawer or a window) covers the element.
      if (el && next) {
        const px = Math.min(window.innerWidth - 1, Math.max(0, next.x + Math.min(next.w / 2, 40)));
        const py = Math.min(window.innerHeight - 1, Math.max(0, next.y + Math.min(next.h / 2, 20)));
        const top = document.elementFromPoint(px, py);
        if (top && !el.contains(top) && !top.closest('[data-tour-card]')) next = null;
      }
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
    if (window.location.pathname !== path) router.push(path);
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
  const hidden = pathname === '/' || pathname === '/setup' || pathname === '/signin';
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
        data-tour-card
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
              step.target && <span className="text-[12.5px] text-ink3">or do it yourself on the page</span>
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
