'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, ExternalLink, GitMerge, GitPullRequest } from 'lucide-react';
import { useApp } from '@/lib/store';
import { languageOf } from '@/lib/codegen';
import type { ChangeReceipt, Project } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FocusScreen, ProjectRoute, ScreenTitle } from '@/components/frame';
import { DiffBlock } from '@/components/code-view';
import { useGitHub } from '@/components/project/github';
import { ActionButton, Button, Chip, Disclosure, Empty, Spinner, Tick } from '@/components/ui';

export default function PullRequestPage() {
  return <ProjectRoute>{(p, now) => <PullRequest p={p} now={now} />}</ProjectRoute>;
}

const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const say = (n: number, one: string, many = `${one}s`) => `${n < NUM.length ? NUM[n] : n} ${n === 1 ? one : many}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function sizeLine(ch: ChangeReceipt) {
  const lines = ch.files.reduce((n, f) => n + f.add + f.del, 0);
  return `${cap(say(ch.files.length, 'file'))}, ${say(lines, 'line')}.`;
}

/** Screen 14 · Pull request. One job: is the change safe to merge? The checks answer it. */
function PullRequest({ p, now }: { p: Project; now: number }) {
  const { cid } = useParams<{ cid: string }>();
  const mergeChange = useApp((s) => s.mergeChange);
  const gh = useGitHub(p);
  const ch = p.changes.find((c) => c.id === cid);
  const [ticked, setTicked] = useState(0);

  useEffect(() => {
    if (!ch || ch.merged) {
      setTicked(3);
      return;
    }
    const ts = [550, 1150, 1750].map((ms, i) => setTimeout(() => setTicked(i + 1), ms));
    return () => ts.forEach(clearTimeout);
  }, [ch?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ch)
    return (
      <FocusScreen p={p} now={now} section="prove">
        <Empty title="This change isn’t here" body="It may have been made in another browser." action={<Button href={`/p/${p.id}/prove`}>Back to the answers</Button>} />
      </FocusScreen>
    );

  const [pass, total] = ch.after.split('/').map(Number);
  const meeraTests = p.answerKey.filter((i) => i.author === 'Meera').length;
  const checks = [
    { label: 'Answer Key', value: `${pass} of ${total} match`, ok: ch.broke === 0 && pass === total },
    { label: 'Unit tests', value: '12 passed', ok: true },
    meeraTests
      ? { label: 'Meera approved the new tests', value: `${meeraTests} test${meeraTests === 1 ? '' : 's'}`, ok: true }
      : { label: 'Expert check', value: 'Meera has not checked yet', ok: true, soft: true },
  ];
  const allDone = ticked >= checks.length;
  const blocked = checks.some((c) => !c.ok);
  const number = ch.pr ?? 13 + ch.n;

  return (
    <FocusScreen p={p} now={now} section="prove" wide back={{ href: `/p/${p.id}/prove`, label: 'Back to the answers' }}>
      <div className="flex flex-wrap items-center gap-2.5">
        {ch.undone ? (
          <Chip tone="neutral">Undone</Chip>
        ) : ch.merged ? (
          <Chip tone="merge" icon={<GitMerge className="h-3.5 w-3.5" />}>
            Merged
          </Chip>
        ) : (
          <Chip tone="ok" icon={<GitPullRequest className="h-3.5 w-3.5" />}>
            Open
          </Chip>
        )}
        <span className="text-[13.5px] text-ink3">
          Pull request #{number} into <span className="font-mono text-ink2">main</span>
        </span>
      </div>
      <ScreenTitle className="mt-4" sub={`Architect made this change for Arjun. ${sizeLine(ch)}`}>
        {ch.title}
      </ScreenTitle>

      <ul className="mt-8 flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface" data-tour="pr-checks" aria-live="polite">
        {checks.map((c, i) => {
          const done = ticked > i;
          return (
            <li key={c.label} className="flex items-center gap-3 px-4 py-3.5">
              <span className="grid h-6 w-6 place-items-center">
                {done ? (
                  <span className={cn('grid h-6 w-6 place-items-center rounded-full animate-pop-in', !c.ok ? 'bg-bad text-on-bad' : c.soft ? 'bg-line2 text-ink2' : 'bg-ok text-on-ok')}>
                    <Tick on size={14} />
                  </span>
                ) : (
                  <Spinner className="h-4 w-4" />
                )}
              </span>
              <span className="flex-1 text-[15px]">{c.label}</span>
              <span className={cn('text-[14px] transition-opacity duration-300', done ? 'opacity-100' : 'opacity-0', !c.ok ? 'text-bad' : 'text-ink2')}>{c.value}</span>
            </li>
          );
        })}
      </ul>

      {ch.diffFile && ch.beforeText !== undefined && (
        <Disclosure label="See the change" className="mt-6">
          <div className="overflow-hidden rounded-xl border border-code-line">
            <div className="border-b border-code-line bg-code px-4 py-2 font-mono text-[12px] text-code-dim">{ch.diffFile}</div>
            <DiffBlock before={ch.beforeText ?? ''} after={ch.afterText ?? ''} lang={languageOf(ch.diffFile)} className="max-h-[360px] py-2" />
          </div>
        </Disclosure>
      )}

      <div className="mt-9 flex flex-wrap items-center gap-3">
        {ch.undone ? (
          <Button size="xl" href={`/p/${p.id}/prove`}>
            Back to the answers
          </Button>
        ) : ch.merged ? (
          <>
            <Button variant="primary" size="xl" href={`/p/${p.id}/signoff`} iconRight={<ArrowRight className="h-4 w-4" />} tour="pr-next">
              Ask Farah to sign off
            </Button>
            <span className="text-[14px] text-ink3">Merged into main.</span>
          </>
        ) : (
          <>
            <ActionButton
              size="xl"
              icon={<GitMerge className="h-4 w-4" />}
              label="Merge"
              busyLabel="Merging"
              doneLabel="Merged"
              disabled={!allDone || blocked}
              tour="pr-merge"
              run={() => true}
              onDone={() => mergeChange(p.id, ch.id)}
            />
            <span className="text-[14px] text-ink3" aria-live="polite">
              {!allDone ? `Waiting for ${say(checks.length - ticked, 'check')}` : blocked ? 'Fix the broken answers first' : 'All checks passed'}
            </span>
          </>
        )}
        {gh.real &&
          !ch.undone &&
          (ch.prUrl ? (
            <Button variant="ghost" size="xl" href={ch.prUrl} target="_blank" icon={<ExternalLink className="h-4 w-4" />}>
              Open on GitHub
            </Button>
          ) : (
            <Button variant="ghost" size="xl" loading={gh.busy === ch.id} onClick={() => gh.openPR(ch.id)} icon={<GitPullRequest className="h-4 w-4" />}>
              {gh.canPush ? 'Open it on GitHub' : 'Connect GitHub'}
            </Button>
          ))}
      </div>
    </FocusScreen>
  );
}
