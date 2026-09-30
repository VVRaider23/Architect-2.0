'use client';

import { useRouter } from '@/lib/nav';
import { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { latestRun } from '@/lib/engine';
import type { Project, ProofRun } from '@/lib/types';
import { claimFacts, examplesFrom, missesOf, missReason, PLAIN, type Miss } from '@/lib/words';
import { cn } from '@/lib/utils';
import { FocusScreen, ProjectRoute } from '@/components/frame';
import { Button, Disclosure, ScoreRing, Tooltip } from '@/components/ui';

export default function ReadyPage() {
  return <ProjectRoute>{(p, now) => <Ready p={p} now={now} />}</ProjectRoute>;
}

function kindsOf(ms: Miss[]) {
  const kinds = new Set(ms.map((m) => m.item.claim.kind));
  if (kinds.size === 1 && kinds.has('theft')) return 'theft claims';
  if (kinds.size === 1 && kinds.has('water_damage')) return 'water damage claims';
  return '';
}

/**
 * Every example as one small square, in Answer Key order: green for a right answer, red for a
 * wrong one. Point at a square to see which claim it is. Makes "15 examples" something you can see.
 */
function Tally({ p, run, kind }: { p: Project; run: ProofRun; kind: string }) {
  const results = new Map(run.results.map((r) => [r.itemId, r]));
  const miss = run.total - run.passed;
  return (
    <div className="mt-6 flex flex-col items-center" data-tour="ready-tally">
      <ul className="flex flex-wrap justify-center gap-1 sm:gap-1.5" aria-label={`${run.passed} right, ${miss} wrong`}>
        {p.answerKey.map((it, i) => {
          const ok = results.get(it.id)?.pass ?? false;
          return (
            <li key={it.id} aria-label={`${it.claim.title}: ${ok ? 'right' : 'wrong'}`}>
              <Tooltip content={`${it.claim.id} · ${it.claim.title} · ${ok ? 'right' : 'wrong'}`}>
                <span
                  className={cn(
                    'grid h-[18px] w-[18px] place-items-center rounded-[5px] animate-pop-in sm:h-[22px] sm:w-[22px]',
                    ok ? 'bg-ok/85 text-on-ok' : 'bg-bad/90 text-on-bad',
                  )}
                  style={{ animationDelay: `${350 + i * 45}ms` }}
                >
                  {ok ? <Check className="h-3 w-3" strokeWidth={3.2} /> : <X className="h-3 w-3" strokeWidth={3.2} />}
                </span>
              </Tooltip>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[13.5px] text-ink2">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-ok/85" aria-hidden />
          {run.passed} right
        </span>
        {miss > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-bad/90" aria-hidden />
            {miss} wrong{kind ? `, all ${kind}` : ''}
          </span>
        )}
      </div>
    </div>
  );
}

/** One miss, side by side: what the app said, and the right answer from the Answer Key. */
function Example({ m, reason }: { m: Miss; reason: string }) {
  const said = PLAIN[m.result.verdict.action];
  const right = PLAIN[m.item.expected.action];
  return (
    <div className="mt-10 rounded-2xl border border-line bg-surface p-5 text-left animate-slide-up" data-tour="ready-example">
      <div className="text-[12.5px] font-medium text-ink3">One of the misses</div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
        <span className="font-mono text-[12.5px] text-ink3">{m.item.claim.id}</span>
        <span className="text-[16px] font-medium text-ink">{m.item.claim.title}</span>
        <span className="text-[14px] text-ink2">· {claimFacts(m.item.claim)}</span>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <div className="rounded-xl border border-bad-line bg-bad-soft px-4 py-3">
          <div className="flex items-center gap-1.5 text-[12.5px] text-ink3">
            <X className="h-3.5 w-3.5 text-bad" strokeWidth={2.6} aria-hidden />
            The app said
          </div>
          <div className="mt-1 text-[15px] font-medium text-ink">{said.title}</div>
          <div className="text-[13.5px] text-ink2">{said.gloss}</div>
        </div>
        <div className="rounded-xl border border-ok-line bg-ok-soft px-4 py-3">
          <div className="flex items-center gap-1.5 text-[12.5px] text-ink3">
            <Check className="h-3.5 w-3.5 text-ok" strokeWidth={2.6} aria-hidden />
            The right answer
          </div>
          <div className="mt-1 text-[15px] font-medium text-ink">{right.title}</div>
          <div className="text-[13.5px] text-ink2">{right.gloss}</div>
        </div>
      </div>
      {reason && <p className="mt-3.5 text-[14px] leading-relaxed text-ink2">{reason}</p>}
    </div>
  );
}

/** Screen 9 · Ready. One job: did it work? It says what was tested, what went wrong, and what to do next. */
function Ready({ p, now }: { p: Project; now: number }) {
  const router = useRouter();
  const run = latestRun(p);
  useEffect(() => {
    if (p.build.status !== 'done') router.replace(`/p/${p.id}`);
  }, [p.build.status, p.id, router]);
  if (!run) return null;
  const misses = missesOf(p);
  const miss = run.total - run.passed;
  const kind = kindsOf(misses);
  const from = examplesFrom(p);
  return (
    <FocusScreen p={p} now={now} section="build">
      <div className="flex flex-col items-center text-center">
        <ScoreRing passed={run.passed} total={run.total} size={108} tour="ready-score" label="match" />
        <h1 className="mt-5 text-[34px] font-semibold tracking-[-0.02em]">Your app is ready</h1>
        <p className="mt-3 max-w-[540px] text-pretty text-[17px] leading-relaxed text-ink2">
          Architect tested it on {run.total} example claims, each with the right answer already written down. {run.passed} match.
          {miss > 0 ? ` The ${miss} that miss${kind ? ` are all ${kind}` : ' need a look'}.` : ' Every answer is right.'}
        </p>
      </div>

      <Tally p={p} run={run} kind={kind} />

      {/* The next step stays in view on small laptops; the example below explains what a miss is. */}
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        {miss > 0 && (
          <Button variant="primary" size="xl" href={`/p/${p.id}/prove`} tour="ready-misses">
            See the {miss} miss{miss === 1 ? '' : 'es'}
          </Button>
        )}
        <Button size="xl" variant={miss > 0 ? 'secondary' : 'primary'} href={`/p/${p.id}/app`} tour="ready-open">
          Open the app
        </Button>
      </div>

      {misses[0] && <Example m={misses[0]} reason={missReason(misses)} />}

      <Disclosure label={`Where do these ${run.total} examples come from?`} className="mt-8">
        <div className="space-y-2 text-[14.5px] leading-relaxed text-ink2">
          {from && <p>{from}</p>}
          <p>Together they’re called the Answer Key. Meera, your claims expert, can add her own, and every correction she makes becomes a new example. All of them run again after every change, so a fix can’t quietly break something else.</p>
        </div>
      </Disclosure>
    </FocusScreen>
  );
}
