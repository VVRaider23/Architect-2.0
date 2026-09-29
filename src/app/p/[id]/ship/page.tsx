'use client';

import { useState } from 'react';
import { ArrowRight, ExternalLink, Lock, Rocket, Terminal } from 'lucide-react';
import { useApp } from '@/lib/store';
import { approvedFor, pendingRequest } from '@/lib/stage';
import type { Env, Project } from '@/lib/types';
import { cn, timeAgo } from '@/lib/utils';
import { FocusScreen, ProjectRoute, ScreenTitle } from '@/components/frame';
import { ActionButton, Button, CopyButton, Disclosure, Tick } from '@/components/ui';

export default function ShipPage() {
  return <ProjectRoute>{(p, now) => <Ship p={p} now={now} />}</ProjectRoute>;
}

const short = (a?: string) => (a ? a.replace(/\s*\((\d+) people\)/, ', $1 people') : '');
/** "Claims team (12 people)" → "the claims team, 12 people". */
const forWhom = (a?: string) => {
  const s = short(a).replace(/^\w/, (x) => x.toLowerCase());
  return s.startsWith('claims team') ? `the ${s}` : s || 'the pilot group';
};

/** Screen 18 · Deploy. One job: who can use it right now? The dot shows where this version is. */
function Ship({ p, now }: { p: Project; now: number }) {
  const deploy = useApp((s) => s.deploy);
  const rollback = useApp((s) => s.rollback);
  const { test, live } = p.deployments;
  const testOk = approvedFor(p, 'test');
  const liveOk = approvedFor(p, 'live');
  const pending = pendingRequest(p);
  const testOn = test.status === 'running' && test.version === p.version;
  const liveOn = live.status === 'running' && live.version === p.version;
  const at = liveOn ? 2 : testOn ? 1 : 0;
  const [dot, setDot] = useState<number | null>(null);
  const pos = dot ?? at;

  const sub = liveOn
    ? `v${p.version} is live for everyone at Harborline.`
    : liveOk
      ? 'Farah approved Live. One step left.'
      : testOn
        ? `v${p.version} is on Test for ${forWhom(test.audience)}. Live needs Farah’s approval.`
        : testOk
          ? `Farah approved a Test launch for ${forWhom(testOk.audience)}.`
          : 'Nothing is approved yet. Farah signs off first.';

  const stops: { env: Env; name: string; who: string; line: string; locked: boolean; url?: string }[] = [
    { env: 'preview', name: 'Preview', who: 'Only you', line: `v${p.version} is here`, locked: false },
    {
      env: 'test',
      name: 'Test',
      who: short(testOk?.audience ?? test.audience) || 'A small pilot group',
      line: testOn ? test.url : testOk ? 'Approved' : 'Needs Farah',
      locked: !testOk && !testOn,
      url: testOn ? test.url : undefined,
    },
    { env: 'live', name: 'Live', who: 'Everyone', line: liveOn ? live.url : liveOk ? 'Approved' : 'Needs Farah', locked: !liveOk && !liveOn, url: liveOn ? live.url : undefined },
  ];

  return (
    <FocusScreen p={p} now={now} section="ship" wide>
      <ScreenTitle sub={sub}>Who can use it?</ScreenTitle>

      <div className="relative mt-12 px-2" data-tour="ship-track">
        <div className="absolute left-[16.66%] right-[16.66%] top-[11px] h-[2px] rounded-full bg-line2" aria-hidden>
          <div className="h-full rounded-full bg-accent transition-[width] duration-[900ms] ease-in-out" style={{ width: `${pos * 50}%` }} />
        </div>
        <span
          aria-hidden
          className="absolute top-[4px] z-10 h-4 w-4 -translate-x-1/2 rounded-full border-[3px] border-bg bg-accent shadow-glow transition-[left] duration-[900ms] ease-in-out"
          style={{ left: `${16.66 + pos * 33.33}%` }}
        />
        <ol className="relative grid grid-cols-3">
          {stops.map((s, i) => {
            const here = i <= at && dot === null ? i === at : false;
            const reached = i <= at;
            return (
              <li key={s.env} className="flex flex-col items-center text-center">
                <span
                  className={cn(
                    'grid h-6 w-6 place-items-center rounded-full border-2 bg-bg transition-colors duration-300',
                    reached ? 'border-accent text-accent' : s.locked ? 'border-line2 text-ink3' : 'border-ink3 text-ink3',
                  )}
                  style={here && i > 0 ? { animation: 'landed 900ms var(--ease-out)' } : undefined}
                >
                  {s.locked ? <Lock className="h-3 w-3" /> : reached && i > 0 ? <Tick on size={12} /> : null}
                </span>
                <b className="mt-3 text-[16px] font-semibold">{s.name}</b>
                <span className="mt-0.5 text-[13.5px] text-ink2">{s.who}</span>
                <span className={cn('mt-1.5 inline-flex max-w-full items-center gap-1 text-[12.5px]', s.url ? 'font-mono text-ink' : 'text-ink3')}>
                  <span className="truncate">{s.line}</span>
                  {s.url && <CopyButton text={`https://${s.url}`} compact className="h-6 w-6 border-transparent bg-transparent" label="Copy the address" />}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
        {testOk && !testOn && !liveOn ? (
          <ActionButton
            size="xl"
            icon={<Rocket className="h-4 w-4" />}
            label={`Deploy v${p.version} to Test`}
            busyLabel="Deploying"
            doneLabel="Deployed to Test"
            minMs={950}
            tour="deploy-test"
            run={() => {
              setDot(1);
              return true;
            }}
            onDone={() => {
              deploy(p.id, 'test');
              setDot(null);
            }}
          />
        ) : liveOk && !liveOn ? (
          <Button variant="primary" size="xl" href={`/p/${p.id}/live`} icon={<Rocket className="h-4 w-4" />} tour="to-live">
            Go live for everyone
          </Button>
        ) : liveOn ? (
          <>
            <Button variant="primary" size="xl" href={`/apps/${p.id}?env=live`} target="_blank" icon={<ExternalLink className="h-4 w-4" />}>
              Open the live app
            </Button>
            <Button size="xl" href={`/p/${p.id}/api`} icon={<Terminal className="h-4 w-4" />}>
              Use it from your code
            </Button>
          </>
        ) : testOn ? (
          pending ? (
            <Button size="xl" disabled>
              Waiting for Farah
            </Button>
          ) : (
            <>
              <Button variant="primary" size="xl" href={`/p/${p.id}/signoff?env=live`} iconRight={<ArrowRight className="h-4 w-4" />} tour="ask-live">
                Ask Farah to approve Live
              </Button>
              <Button size="xl" href={`/apps/${p.id}?env=test`} target="_blank" icon={<ExternalLink className="h-4 w-4" />}>
                Open the Test app
              </Button>
            </>
          )
        ) : (
          <Button variant="primary" size="xl" href={`/p/${p.id}/signoff`} iconRight={<ArrowRight className="h-4 w-4" />}>
            Ask Farah to sign off
          </Button>
        )}
      </div>

      {(test.history.length > 0 || live.history.length > 0) && (
        <Disclosure label="Earlier versions" className="mt-14">
          <div className="flex flex-col gap-2">
            {(['test', 'live'] as const).map((env) => {
              const d = p.deployments[env];
              if (!d.history.length) return null;
              return (
                <div key={env} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-[14.5px]">
                  <span className="w-12 font-medium">{env === 'live' ? 'Live' : 'Test'}</span>
                  <span className="flex-1 text-ink2">
                    v{d.version} since {timeAgo(d.at ?? now, now)} · {d.history.length} deploy{d.history.length === 1 ? '' : 's'}
                  </span>
                  {d.history.length > 1 && (
                    <Button size="sm" variant="danger" onClick={() => rollback(p.id, env)}>
                      Roll back to v{d.history[d.history.length - 2].version}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Disclosure>
      )}
    </FocusScreen>
  );
}
