'use client';

import { Fragment } from 'react';
import { Check, Hourglass } from 'lucide-react';
import { PEOPLE } from '@/lib/seed';
import { BUILD_TABS, BUILD_TAB_HINT, STEP_COPY, STEP_KEYS, STEP_OF, TAB_LABEL, type PathStep, type StepKey } from '@/lib/stage';
import type { Role, Tab } from '@/lib/types';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';

const ROLE_TONE: Record<Role, 'accent' | 'ok' | 'warn'> = { builder: 'accent', reviewer: 'ok', approver: 'warn' };

function StepDot({ state, n }: { state: PathStep['state']; n: number }) {
  if (state === 'done')
    return (
      <span aria-hidden className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-ok text-white">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full font-mono text-[11.5px] font-semibold',
        state === 'current' ? 'bg-accent text-white shadow-ring' : 'border border-line2 bg-surface text-ink3',
      )}
    >
      {n}
    </span>
  );
}

/**
 * The only navigation on the project screen: the five steps of the journey.
 * Each step shows where the project is (done, now, not yet) and opens its screen.
 */
export function JourneyBar({
  steps,
  tab,
  allowed,
  onGo,
  hint,
  failing,
}: {
  steps: PathStep[];
  tab: Tab;
  allowed: Tab[];
  onGo: (step: StepKey) => void;
  hint?: string;
  failing?: boolean;
}) {
  const selected = STEP_OF[tab];
  return (
    <div className="flex h-[54px] shrink-0 items-stretch border-b border-line bg-surface px-2 sm:px-3" data-tour="journey">
      <nav aria-label="Steps" role="tablist" className="scroll-thin flex min-w-0 items-stretch overflow-x-auto">
        {steps.map((s, i) => {
          const on = selected === s.key;
          const reachable = allowed.some((t) => STEP_OF[t] === s.key);
          const subTone =
            s.key === 'prove' && failing && s.state !== 'todo'
              ? 'text-bad'
              : s.state === 'done'
                ? 'text-ok'
                : s.state === 'current'
                  ? 'text-accent-ink'
                  : 'text-ink3';
          return (
            <Fragment key={s.key}>
              <button
                role="tab"
                aria-selected={on}
                disabled={!reachable}
                onClick={() => onGo(s.key)}
                title={s.state === 'todo' ? `Not yet. ${STEP_COPY[s.key].unlocks}` : STEP_COPY[s.key].question}
                className={cn(
                  'relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-2.5 text-[13.5px] transition-colors',
                  on ? 'font-semibold text-ink' : s.state === 'todo' ? 'text-ink3 hover:text-ink2' : 'text-ink2 hover:text-ink',
                  !reachable && 'cursor-not-allowed opacity-50',
                )}
              >
                <StepDot state={s.state} n={i + 1} />
                <span>{s.label}</span>
                {s.sub && <span className={cn('hidden text-[12px] font-normal md:inline', subTone)}>{s.sub}</span>}
                {on && <span className="absolute inset-x-2 bottom-0 h-[2.5px] rounded-t-full bg-accent" aria-hidden />}
              </button>
              {i < steps.length - 1 && (
                <span className="flex shrink-0 items-center px-0.5" aria-hidden>
                  <span className={cn('h-px w-4 lg:w-6', s.state === 'done' ? 'bg-ok-line' : 'bg-line2')} />
                </span>
              )}
            </Fragment>
          );
        })}
      </nav>
      {hint && (
        <div className="ml-auto hidden min-w-0 max-w-[520px] items-center gap-2.5 pl-5 xl:flex">
          <span className="shrink-0 rounded-md bg-accent-soft px-1.5 py-[2px] font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-accent-ink">Next</span>
          <span className="truncate text-[12.5px] text-ink2" title={hint}>
            {hint}
          </span>
        </div>
      )}
    </div>
  );
}

/** The screens inside Build: Plan → Agents → App → Code, with a plain-words line for the open one. */
export function BuildSubnav({ tab, allowed, onTab }: { tab: Tab; allowed: Tab[]; onTab: (t: Tab) => void }) {
  const tabs = BUILD_TABS.filter((t) => allowed.includes(t));
  return (
    <div className="flex h-10 shrink-0 items-stretch gap-1 border-b border-line bg-surface2 px-3" role="tablist" aria-label="Build screens">
      {tabs.map((t) => {
        const on = tab === t;
        return (
          <button
            key={t}
            role="tab"
            aria-selected={on}
            onClick={() => onTab(t)}
            className={cn('my-1.5 rounded-md px-3 text-[13px]', on ? 'bg-surface font-semibold text-ink shadow-card ring-1 ring-line' : 'text-ink2 hover:text-ink')}
          >
            {TAB_LABEL[t]}
          </button>
        );
      })}
      <span className="ml-auto hidden min-w-0 items-center truncate pl-4 text-[12.5px] text-ink2 lg:flex">{BUILD_TAB_HINT[tab]}</span>
    </div>
  );
}

/** Top of every step screen: the question it answers, what happens, and who does it. */
export function StepHeader({ step, state, children }: { step: StepKey; state?: PathStep['state']; children?: React.ReactNode }) {
  const c = STEP_COPY[step];
  const n = STEP_KEYS.indexOf(step) + 1;
  return (
    <div className="flex flex-wrap items-start gap-x-8 gap-y-3 rounded-xl border border-line bg-surface px-5 py-4">
      <div className="min-w-0 flex-1 basis-[420px]">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink3">
          Step {n} of 5 · {c.title}
        </div>
        <h2 className="mt-1 text-[18px] font-semibold tracking-tight">{c.question}</h2>
        <p className="mt-1 max-w-[760px] text-[13.5px] leading-relaxed text-ink2">{c.body}</p>
        {state === 'todo' && (
          <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface2 px-2.5 py-1 text-[12.5px] text-ink2">
            <Hourglass className="h-3.5 w-3.5 text-ink3" /> Not yet. {c.unlocks}
          </p>
        )}
        {children}
      </div>
      <ul className="grid shrink-0 gap-2" aria-label="Who is involved">
        {c.who.map((w) => {
          const person = PEOPLE.find((x) => x.role === w.role)!;
          return (
            <li key={w.role} className="flex items-center gap-2.5">
              <Avatar initials={person.initials} size={28} tone={ROLE_TONE[w.role]} />
              <span className="text-[12.5px] leading-tight">
                <span className="block font-semibold">{person.short}</span>
                <span className="block text-ink2">{w.does}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
