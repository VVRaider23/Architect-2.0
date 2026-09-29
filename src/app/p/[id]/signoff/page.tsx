'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/lib/nav';
import { Suspense, useState } from 'react';
import { ArrowRight, Send, X } from 'lucide-react';
import { useApp } from '@/lib/store';
import { AUDIENCES, approvedFor, pendingRequest, rulesFor } from '@/lib/stage';
import type { Project, RuleCheck } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FocusScreen, ProjectRoute, ScreenTitle } from '@/components/frame';
import { ActionButton, Avatar, Button, Tick } from '@/components/ui';

export default function SignoffPage() {
  return (
    <Suspense>
      <ProjectRoute>{(p, now) => <Signoff p={p} now={now} />}</ProjectRoute>
    </Suspense>
  );
}

const PLAIN: Record<string, string> = {
  high_risk: 'Every high-risk answer is right',
  min_match: 'At least 95% of answers match',
  expert: 'Meera checked the answers recently',
  pii: 'Personal data is hidden from the models',
};

function fixLink(p: Project, c: RuleCheck) {
  if (c.id === 'pii') return { href: `/p/${p.id}/agents`, label: 'Turn it on' };
  if (c.id === 'expert') return { href: `/p/${p.id}/prove`, label: 'Ask Meera' };
  return { href: `/p/${p.id}/prove`, label: 'Fix the answers' };
}

/** Arjun asks IT for a launch. One job: send the request, or see where it stands. */
function Signoff({ p, now }: { p: Project; now: number }) {
  const router = useRouter();
  const search = useSearchParams();
  const ws = useApp((s) => s.workspace);
  const requestSignoff = useApp((s) => s.requestSignoff);
  const setViewAs = useApp((s) => s.setViewAs);
  const toast = useApp((s) => s.toast);
  const pending = pendingRequest(p);
  const testOk = approvedFor(p, 'test');
  const liveOk = approvedFor(p, 'live');
  const testOn = p.deployments.test.status === 'running' && p.deployments.test.version === p.version;
  const env: 'test' | 'live' = search.get('env') === 'live' || testOn || testOk ? 'live' : 'test';
  const { checks, pass } = rulesFor(p, ws, now);
  const options = env === 'live' ? [AUDIENCES[2]] : AUDIENCES.slice(0, 2);
  const [aud, setAud] = useState(options[0]);

  if (pending)
    return (
      <FocusScreen p={p} now={now} section="signoff">
        <div className="flex items-center gap-3">
          <Avatar initials="FS" size={40} tone="warn" />
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warn opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-warn" />
          </span>
        </div>
        <ScreenTitle className="mt-5" sub={`Farah from IT has one page for v${pending.version}: what the tests show, what Meera checked, and what data it touches.`}>
          Waiting for Farah
        </ScreenTitle>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            variant="primary"
            size="xl"
            tour="see-as-farah"
            onClick={() => {
              setViewAs('approver');
              router.push(`/p/${p.id}/requests/${pending.id}`);
            }}
          >
            See it as Farah
          </Button>
          <Button size="xl" variant="ghost" href={`/p/${p.id}/requests/${pending.id}`}>
            See what she sees
          </Button>
        </div>
      </FocusScreen>
    );

  if ((env === 'test' && testOk && !testOn) || (env === 'live' && liveOk))
    return (
      <FocusScreen p={p} now={now} section="signoff">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-ok text-on-ok animate-pop-in">
          <Tick on size={24} />
        </span>
        <ScreenTitle className="mt-5" sub={env === 'live' ? 'Everyone at Harborline can use it once you go live.' : 'You can put it in front of the pilot group now.'}>
          Farah signed off
        </ScreenTitle>
        <div className="mt-8">
          <Button variant="primary" size="xl" href={env === 'live' ? `/p/${p.id}/live` : `/p/${p.id}/ship`} iconRight={<ArrowRight className="h-4 w-4" />}>
            {env === 'live' ? 'Go live' : 'Deploy to Test'}
          </Button>
        </div>
      </FocusScreen>
    );

  return (
    <FocusScreen p={p} now={now} section="signoff">
      <ScreenTitle sub="Farah from IT decides who can use it. She gets one page made from your test runs and Meera’s checks, not from anything you type.">
        {env === 'live' ? 'Ask Farah to approve Live' : 'Ask Farah to sign off'}
      </ScreenTitle>

      <ul className="mt-8 flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface" data-tour="rules">
        {checks.map((c) => {
          const fix = fixLink(p, c);
          return (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3.5">
              <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full', c.pass ? 'bg-ok text-on-ok' : 'bg-bad-soft text-bad')}>
                {c.pass ? <Tick on size={14} /> : <X className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              <span className="flex-1 text-[15px]">{PLAIN[c.id] ?? c.label}</span>
              {c.pass ? (
                <span className="text-[14px] text-ink3">{c.detail.replace('/', ' of ').replace(/^\w/, (x) => x.toUpperCase())}</span>
              ) : (
                <Link href={fix.href} className="press text-[14px] font-medium text-accent-ink hover:underline">
                  {fix.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <fieldset className="mt-8">
        <legend className="text-[15px] font-medium">Who should be able to use it?</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {options.map((a) => {
            const on = aud === a;
            const [name, count] = [a.replace(/\s*\(.*\)/, ''), a.match(/\((.*)\)/)?.[1]];
            return (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setAud(a)}
                className={cn('press flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors', on ? 'border-accent bg-accent-soft' : 'border-line2 bg-surface hover:border-ink3/60')}
              >
                <span className={cn('grid h-4 w-4 place-items-center rounded-full border-2', on ? 'border-accent' : 'border-line2')}>
                  <span className={cn('h-1.5 w-1.5 rounded-full bg-accent transition-transform duration-200', on ? 'scale-100' : 'scale-0')} />
                </span>
                <span>
                  <span className="block text-[15px] font-medium">{name}</span>
                  {count && <span className="block text-[13px] text-ink3">{count}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <ActionButton
          size="xl"
          icon={<Send className="h-4 w-4" />}
          label="Send to Farah"
          busyLabel="Sending"
          doneLabel="Sent"
          disabled={!pass}
          tour="send-signoff"
          run={() => pass}
          onDone={() => {
            const r = requestSignoff(p.id, env, aud);
            if (r?.status === 'fast_lane') toast('Every rule passed, so it took the fast lane. You can deploy now.', 'ok');
          }}
        />
        {!pass && <span className="text-[14px] text-ink3">Opens when every line above has a tick.</span>}
      </div>
    </FocusScreen>
  );
}
