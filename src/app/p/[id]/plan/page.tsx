'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { ChevronDown, Hammer } from 'lucide-react';
import { useApp } from '@/lib/store';
import { FRAMEWORKS, frameworkLabel } from '@/lib/seed';
import type { Project } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FocusScreen, ProjectRoute, ScreenTitle } from '@/components/frame';
import { ActionButton, Button, Disclosure, Menu } from '@/components/ui';

export default function PlanPage() {
  return <ProjectRoute>{(p, now) => <Plan p={p} now={now} />}</ProjectRoute>;
}

const AGENTS = [
  ['Triage lead', 'runs the other four'],
  ['Intake reader', 'reads the email'],
  ['Policy checker', 'finds the clause'],
  ['Risk scorer', 'scores the claim'],
  ['Reply drafter', 'writes the reply'],
];
const SCREENS = [
  ['Inbox', 'every claim'],
  ['Claim', 'one claim and its reasons'],
  ['Review', 'for your experts'],
  ['Settings', 'rules and people'],
];

function planSteps(p: Project): string[] {
  if (p.importedFrom) {
    const fw = p.importedFrom.framework ?? frameworkLabel(p.framework);
    return [
      `Keeps your ${fw} agents as they are`,
      'Adds tracing, so you can see why each answer came out',
      'Starts an Answer Key your experts can check',
      'Opens a pull request. Nothing changes until you merge it',
    ];
  }
  const src = p.answers.systems.includes('Outlook') ? 'Outlook' : p.answers.systems.includes('Gmail') ? 'Gmail' : null;
  return [
    src ? `Reads each claim email in ${src}` : 'Reads each claim from your claims system',
    'Checks the claim against your policy PDFs',
    'Scores the risk and sends risky claims to a senior handler',
    p.slackAlerts ? 'Drafts a reply for a person to send, and posts risky claims to Slack' : 'Drafts a reply for a person to send',
  ];
}

/** Screen 7 · The plan. One job: is this the right plan? Nothing is built until you say so. */
function Plan({ p, now }: { p: Project; now: number }) {
  const router = useRouter();
  const approvePlan = useApp((s) => s.approvePlan);
  const setFramework = useApp((s) => s.setFramework);
  const draftPlan = useApp((s) => s.draftPlan);

  const approvedAtStart = useRef(p.planApproved);
  useEffect(() => {
    if (approvedAtStart.current) router.replace(`/p/${p.id}`);
    else if (!p.plan && p.answers.answered) draftPlan(p.id);
    else if (!p.plan) router.replace(`/p/${p.id}/questions`);
  }, [p.plan, p.answers.answered, p.id, router, draftPlan]);

  if (!p.plan) return null;
  const steps = planSteps(p);
  return (
    <FocusScreen p={p} now={now} section="build" back={p.importedFrom ? { href: '/import' } : { href: `/p/${p.id}/questions`, label: 'Back to the questions' }}>
      <ScreenTitle>Here’s the plan</ScreenTitle>
      <ol className="mt-8 flex flex-col gap-3" data-tour="plan-steps">
        {steps.map((s, i) => (
          <li key={s} className="flex items-start gap-3.5 animate-slide-up" style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}>
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line2 bg-surface2 text-[13px] font-semibold tabular text-ink2">{i + 1}</span>
            <span className="pt-0.5 text-[17px] leading-relaxed">{s}</span>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14.5px] text-ink2">
        <span className="inline-flex items-center gap-2">
          Agents written in
          <Menu
            width={250}
            label="Framework"
            items={FRAMEWORKS.map((f) => ({
              id: f.id,
              label: f.label,
              sub: f.note,
              checked: f.id === p.framework,
              onSelect: () => setFramework(p.id, f.id),
            }))}
            trigger={({ open, toggle }) => (
              <button
                type="button"
                onClick={toggle}
                aria-haspopup="menu"
                aria-expanded={open}
                data-tour="plan-framework"
                className="press inline-flex h-8 items-center gap-1.5 rounded-lg border border-line2 bg-surface2 px-2.5 font-medium text-ink hover:border-ink3/60"
              >
                <span key={p.framework} className="animate-fade-in">
                  {frameworkLabel(p.framework)}
                </span>
                <ChevronDown className={cn('h-3.5 w-3.5 text-ink3 transition-transform duration-200', open && 'rotate-180')} />
              </button>
            )}
          />
        </span>
        <span aria-hidden className="text-line2">
          ·
        </span>
        <span>About 140 credits</span>
      </div>

      <Disclosure label="See every agent and screen" className="mt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['5 agents', AGENTS],
            ['4 screens', SCREENS],
          ].map(([title, rows]) => (
            <div key={title as string} className="rounded-xl border border-line bg-surface p-4">
              <div className="text-[13px] font-medium text-ink3">{title as string}</div>
              <ul className="mt-2 flex flex-col gap-1.5">
                {(rows as string[][]).map(([n, d]) => (
                  <li key={n} className="text-[14px]">
                    <span className="font-medium">{n}</span> <span className="text-ink3">{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {p.plan.examples.length > 0 && (
          <div className="mt-4 rounded-xl border border-line bg-surface p-4">
            <div className="text-[13px] font-medium text-ink3">Answers it should give</div>
            <ul className="mt-2 flex flex-col gap-2">
              {p.plan.examples.map((e) => (
                <li key={e.claim} className="text-[14px] leading-relaxed">
                  <span className="text-ink2">{e.claim}:</span> {e.answer}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Disclosure>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <ActionButton
          size="xl"
          icon={<Hammer className="h-4 w-4" />}
          label="Build it"
          busyLabel="Starting"
          doneLabel="Started"
          tour="plan-approve"
          minMs={450}
          holdMs={350}
          run={() => approvePlan(p.id)}
          onDone={() => router.push(`/p/${p.id}/build`)}
        />
        {!p.importedFrom && (
          <Button variant="ghost" size="xl" href={`/p/${p.id}/questions`}>
            Change an answer
          </Button>
        )}
      </div>
    </FocusScreen>
  );
}
