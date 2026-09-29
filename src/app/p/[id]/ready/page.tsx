'use client';

import { useRouter } from '@/lib/nav';
import { useEffect } from 'react';
import { latestRun } from '@/lib/engine';
import type { Project } from '@/lib/types';
import { FocusScreen, ProjectRoute } from '@/components/frame';
import { Button, ScoreRing } from '@/components/ui';

export default function ReadyPage() {
  return <ProjectRoute>{(p, now) => <Ready p={p} now={now} />}</ProjectRoute>;
}

function kindsOf(p: Project) {
  const run = latestRun(p);
  if (!run) return '';
  const items = new Map(p.answerKey.map((i) => [i.id, i]));
  const kinds = new Set(run.results.filter((r) => !r.pass).map((r) => items.get(r.itemId)?.claim.kind));
  if (kinds.size === 1 && kinds.has('theft')) return 'theft claims';
  if (kinds.size === 1 && kinds.has('water_damage')) return 'water damage claims';
  return '';
}

/** Screen 9 · Ready. One job: did it work? */
function Ready({ p, now }: { p: Project; now: number }) {
  const router = useRouter();
  const run = latestRun(p);
  useEffect(() => {
    if (p.build.status !== 'done') router.replace(`/p/${p.id}`);
  }, [p.build.status, p.id, router]);
  if (!run) return null;
  const miss = run.total - run.passed;
  const kind = kindsOf(p);
  return (
    <FocusScreen p={p} now={now} section="build">
      <div className="flex flex-col items-center text-center">
        <ScoreRing passed={run.passed} total={run.total} size={148} tour="ready-score" label="match" />
        <h1 className="mt-8 text-[34px] font-semibold tracking-[-0.02em]">Your app is ready</h1>
        <p className="mt-3 max-w-[440px] text-pretty text-[17px] leading-relaxed text-ink2">
          {run.passed} of {run.total} answers match your examples.
          {miss > 0 ? ` The ${miss} that miss${kind ? ` are all ${kind}` : ' need a look'}.` : ' Every answer matches.'}
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          {miss > 0 && (
            <Button variant="primary" size="xl" href={`/p/${p.id}/prove`} tour="ready-misses">
              See the {miss} miss{miss === 1 ? '' : 'es'}
            </Button>
          )}
          <Button size="xl" variant={miss > 0 ? 'secondary' : 'primary'} href={`/p/${p.id}/app`} tour="ready-open">
            Open the app
          </Button>
        </div>
      </div>
    </FocusScreen>
  );
}
