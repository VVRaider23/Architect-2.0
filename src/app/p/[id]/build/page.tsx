'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, FastForward } from 'lucide-react';
import { BUILD_STEPS, STEP_MS, useApp } from '@/lib/store';
import { latestRun } from '@/lib/engine';
import { frameworkLabel } from '@/lib/seed';
import type { Project } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ProjectRoute, ProjectTopBar } from '@/components/frame';
import { Blueprint } from '@/components/blueprint';
import { Button, Tick } from '@/components/ui';

export default function BuildPage() {
  return <ProjectRoute>{(p, now) => <Build p={p} now={now} />}</ProjectRoute>;
}

const TOTAL = STEP_MS * BUILD_STEPS.length;

function stepsFor(p: Project) {
  return p.importedFrom
    ? ['Repo read', 'Agents traced', 'Tools connected', 'Screens drawn', 'Answer Key started', 'First test run']
    : ['Plan approved', 'Agents created', 'Tools connected', 'Screens drawn', 'Code written', 'First test run'];
}

function logFor(p: Project, done: number, result: { passed: number; total: number } | null) {
  const fw = frameworkLabel(p.framework);
  const lines = [
    `$ architect build ${p.repo.split('/')[1] ?? 'app'} --plan v1`,
    `✓ plan approved · agents in ${fw}`,
    '✓ created 5 agents: triage_lead, intake_reader, policy_checker, risk_scorer, reply_drafter',
    '✓ connected tools: gmail.read, gmail.draft, policy_pdfs.search, claims_db.read',
    '✓ drew 4 screens: inbox, claim, review, settings',
    `✓ wrote the code and committed it to ${p.repo}`,
    result ? `✓ ${result.passed} of ${result.total} examples match the Answer Key` : '… running the examples in the Answer Key',
  ];
  return lines.slice(0, Math.min(lines.length, done + 1));
}

/** Screen 8 · Building. One job: show what is happening and how long is left. */
function Build({ p, now }: { p: Project; now: number }) {
  const router = useRouter();
  const skipBuild = useApp((s) => s.skipBuild);
  const [log, setLog] = useState(false);
  const labels = stepsFor(p);
  const building = p.build.status === 'building';
  const doneAll = p.build.status === 'done';

  useEffect(() => {
    if (!p.planApproved) router.replace(`/p/${p.id}`);
  }, [p.planApproved, p.id, router]);

  const elapsed = doneAll ? TOTAL : building && p.build.startedAt ? Math.max(0, now - p.build.startedAt) : 0;
  const per = TOTAL / labels.length;
  const done = doneAll ? labels.length : Math.min(labels.length - 1, Math.floor(elapsed / per));
  const left = Math.max(1, Math.ceil((TOTAL - elapsed) / 1000));
  const run = doneAll ? latestRun(p) : undefined;
  const result = run ? { passed: run.passed, total: run.total } : null;

  return (
    <div className="flex min-h-screen flex-col">
      <ProjectTopBar p={p} section="build" now={now} />
      <main className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="grid-bg relative flex items-center justify-center border-b border-line p-6 lg:border-b-0 lg:border-r lg:p-10">
          {log ? (
            <pre className="code-scroll w-full max-w-[640px] overflow-x-auto rounded-xl border border-code-line bg-code p-5 font-mono text-[12.5px] leading-[1.9] text-code-ink animate-fade-in" aria-live="polite">
              {logFor(p, done, result).map((l) => (
                <div key={l} className={cn('animate-fade-in', l.startsWith('✓') ? '' : 'text-code-dim')}>
                  {l}
                </div>
              ))}
            </pre>
          ) : (
            <Blueprint drawn={done + 1} title={p.name} result={result} className="max-w-[720px]" />
          )}
        </div>
        <aside className="flex flex-col gap-7 p-6 lg:p-8">
          <div className="animate-screen-in">
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">{doneAll ? 'Your app is built' : `Building ${p.name.toLowerCase()}`}</h1>
            <p className="mt-2 text-[15px] text-ink2" aria-live="polite">
              {doneAll ? 'The first test run is in.' : `About ${left} second${left === 1 ? '' : 's'} left`}
            </p>
          </div>
          <ol className="flex flex-col gap-1" aria-label="Build steps">
            {labels.map((l, i) => {
              const state = i < done ? 'done' : i === done && !doneAll ? 'now' : doneAll ? 'done' : 'todo';
              return (
                <li key={l} className={cn('flex h-10 items-center gap-3 rounded-lg px-2 text-[15px] transition-colors duration-300', state === 'now' && 'bg-surface2')}>
                  <span className="grid h-5 w-5 place-items-center">
                    {state === 'done' ? (
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-ok text-on-ok animate-pop-in">
                        <Tick on size={12} />
                      </span>
                    ) : state === 'now' ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-line2" />
                    )}
                  </span>
                  <span className={cn('flex-1', state === 'todo' ? 'text-ink3' : 'text-ink')}>{l}</span>
                  {state === 'done' && <span className="tabular text-[12.5px] text-ink3 animate-fade-in">{(per / 1000).toFixed(1)} s</span>}
                </li>
              );
            })}
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => setLog((l) => !l)} aria-pressed={log}>
              {log ? 'Show the drawing' : 'Show the log'}
            </Button>
            {building && (
              <Button size="sm" variant="ghost" icon={<FastForward className="h-3.5 w-3.5" />} onClick={() => skipBuild(p.id)} tour="build-skip">
                Skip the wait
              </Button>
            )}
          </div>
          {doneAll && (
            <div className="animate-slide-up">
              <Button variant="primary" size="xl" full href={`/p/${p.id}/ready`} iconRight={<ArrowRight className="h-4 w-4" />} tour="build-results">
                See the results
              </Button>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
