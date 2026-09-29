'use client';

import Link from 'next/link';
import { useRouter } from '@/lib/nav';
import { useEffect, useState } from 'react';
import { ArrowRight, Flag, GitPullRequest, Play, UserPlus, Wrench } from 'lucide-react';
import { useApp } from '@/lib/store';
import { latestRun, RISK_LABEL } from '@/lib/engine';
import { approvedFor, arrivedFlags, openTasks, pendingRequest, rulesFor } from '@/lib/stage';
import { missesOf, missReason, words, type Miss } from '@/lib/words';
import type { Project } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FocusScreen, ProjectRoute, ScreenTitle } from '@/components/frame';
import { ActionButton, Avatar, Button, Disclosure, ProgressBar, ScoreRing, Tag } from '@/components/ui';
import { announceChange } from '@/components/project/chat-panel';

export default function ProvePage() {
  return <ProjectRoute>{(p, now) => <Prove p={p} now={now} />}</ProjectRoute>;
}

function MissRow({ m, fixed, delay }: { m: Miss; fixed: boolean; delay: number }) {
  return (
    <li className={cn('flex items-start gap-3.5 rounded-xl border px-4 py-3.5 transition-colors duration-500', fixed ? 'border-ok-line bg-ok-soft/60' : 'border-line bg-surface')} style={{ transitionDelay: `${delay}ms` }}>
      <span className="mt-0.5 w-[54px] shrink-0 font-mono text-[12.5px] text-ink3">{m.item.claim.id}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium">{m.item.claim.title}</div>
        <div className="relative mt-1 text-[14px] leading-relaxed text-ink2">
          <span className={cn('block transition-all duration-300', fixed && 'pointer-events-none absolute inset-0 -translate-y-1 opacity-0 blur-[2px]')} style={{ transitionDelay: `${delay}ms` }}>
            Said “{m.said}”. It should {m.should}.
          </span>
          <span className={cn('block transition-all duration-300', !fixed && 'pointer-events-none absolute inset-0 translate-y-1 opacity-0 blur-[2px]')} style={{ transitionDelay: `${delay + 80}ms` }}>
            <s className="text-ink3 decoration-bad/70">{m.said.charAt(0).toUpperCase() + m.said.slice(1)}</s> <span className="font-medium text-ink">{m.after}</span>
          </span>
        </div>
      </div>
      <span className="swap shrink-0">
        <span data-off={fixed ? '' : undefined} style={{ transitionDelay: `${delay}ms` }}>
          <Tag tone="bad">Wrong</Tag>
        </span>
        <span data-off={fixed ? undefined : ''} style={{ transitionDelay: `${delay + 120}ms` }}>
          <Tag tone="ok">Right</Tag>
        </span>
      </span>
    </li>
  );
}

/** Screen 13 · What's wrong. One job: see which answers are wrong, and fix them. */
function Prove({ p, now }: { p: Project; now: number }) {
  const router = useRouter();
  const ws = useApp((s) => s.workspace);
  const fixFailing = useApp((s) => s.fixFailing);
  const runProof = useApp((s) => s.runProof);
  const setInviteOpen = useApp((s) => s.setInviteOpen);
  const setViewAs = useApp((s) => s.setViewAs);
  const toast = useApp((s) => s.toast);
  const [snap, setSnap] = useState<{ rows: Miss[]; fixed: boolean } | null>(null);

  useEffect(() => {
    if (p.build.status !== 'done') router.replace(`/p/${p.id}`);
  }, [p.build.status, p.id, router]);

  const run = latestRun(p);
  const misses = missesOf(p);
  const rows = snap?.rows ?? misses;
  const tasks = openTasks(p);
  const doneTasks = p.tasks.filter((t) => t.done && t.batch === tasks[0]?.batch).length;
  const flags = arrivedFlags(p, now).filter((f) => f.status === 'open');
  const invited = p.invites.some((i) => i.role === 'reviewer') || p.reviews.length > 0;
  const pending = pendingRequest(p);
  const { pass: rulesPass, checks } = rulesFor(p, ws, now);
  const openPr = [...p.changes].reverse().find((c) => !c.undone && !c.merged);
  const showMisses = rows.length > 0;

  const fix = () => {
    const before = p.changes.length;
    setSnap({ rows: misses, fixed: false });
    const cid = fixFailing(p.id);
    if (!cid) {
      setSnap(null);
      return false;
    }
    return { cid, before };
  };

  const seeAs = (role: 'reviewer' | 'approver') => {
    setViewAs(role);
    router.push(role === 'reviewer' ? `/p/${p.id}/review` : pending ? `/p/${p.id}/requests/${pending.id}` : `/p/${p.id}/requests`);
  };

  if (!run) return null;
  return (
    <FocusScreen p={p} now={now} section="prove" wide>
      {tasks.length > 0 && (
        <div className="mb-8 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 animate-slide-up" data-tour="prove-waiting">
          <Avatar initials="MK" size={30} tone="ok" />
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px]">
              Meera is checking {words(tasks.length + doneTasks, 'answer')}
              <span className="text-ink3"> · {doneTasks} done</span>
            </div>
            <ProgressBar value={(doneTasks / Math.max(1, tasks.length + doneTasks)) * 100} tone="ok" className="mt-2" />
          </div>
          <Button size="sm" onClick={() => seeAs('reviewer')} tour="see-as-meera">
            See it as Meera
          </Button>
        </div>
      )}
      {flags.length > 0 && (
        <Link href={`/p/${p.id}/learn`} className="press mb-8 flex items-center gap-3 rounded-xl border border-warn-line bg-warn-soft px-4 py-3 text-[14.5px] animate-slide-up">
          <Flag className="h-4 w-4 text-warn" />
          <span className="flex-1">People flagged {words(flags.length, 'answer')} from real use.</span>
          <ArrowRight className="h-4 w-4 text-ink3" />
        </Link>
      )}

      {showMisses ? (
        <>
          <ScreenTitle sub={snap?.fixed ? 'Fixed. Every answer now matches, and nothing else broke.' : missReason(rows)}>
            {snap?.fixed ? `${rows.length === 1 ? 'The answer is' : 'All ' + rows.length + ' are'} right now` : `${words(rows.length, 'answer')} ${rows.length === 1 ? 'is' : 'are'} wrong`}
          </ScreenTitle>
          <ul className="mt-7 flex flex-col gap-2" data-tour="miss-list">
            {rows.map((m, i) => (
              <MissRow key={m.item.id} m={m} fixed={!!snap?.fixed} delay={i * 140} />
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {p.version < 3 && !snap?.fixed && (
              <ActionButton
                size="xl"
                icon={<Wrench className="h-4 w-4" />}
                label={rows.length === 1 ? 'Fix it' : `Fix all ${rows.length}`}
                busyLabel="Fixing"
                doneLabel="Fixed"
                tour="fix-all"
                minMs={900}
                holdMs={200}
                run={fix}
                onDone={(r) => {
                  const res = r as { cid: string; before: number };
                  setSnap((s) => (s ? { ...s, fixed: true } : s));
                  announceChange(p, res.before, router);
                  setTimeout(() => setSnap(null), 2600);
                }}
              />
            )}
            {!snap?.fixed && (
              <Button size="xl" variant="secondary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteOpen(p.id)} tour="ask-meera">
                {invited ? 'Ask Meera to check more' : 'Ask Meera to check them'}
              </Button>
            )}
            {p.version < 3 && !snap && <span className="text-[13.5px] text-ink3">About 9 credits</span>}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-6">
            <ScoreRing passed={run.passed} total={run.total} size={112} label="match" />
            <ScreenTitle sub={`${run.total} of ${run.total} examples give the answer your experts expect.`}>All answers match</ScreenTitle>
          </div>
          <div className="mt-9 flex flex-col gap-3">
            {openPr && (
              <Link href={`/p/${p.id}/pr/${openPr.id}`} className="press flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 hover:border-line2" data-tour="open-pr">
                <GitPullRequest className="h-4 w-4 text-[#C9B6FF]" />
                <span className="flex-1 text-[14.5px]">
                  Pull request{openPr.pr ? ` #${openPr.pr}` : ''} is ready to merge: <span className="text-ink2">{openPr.title}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-ink3" />
              </Link>
            )}
            <NextStep p={p} invited={invited} tasks={tasks.length} rulesPass={rulesPass} failing={checks.filter((c) => !c.pass).map((c) => c.label)} onSeeAs={seeAs} />
          </div>
        </>
      )}

      <Disclosure label={`See all ${p.answerKey.length} examples in the Answer Key`} className="mt-12" tour="answer-key">
        <p className="mb-3 text-[14px] leading-relaxed text-ink2">Each example is a real-looking case and the answer an expert expects. Architect runs all of them after every change.</p>
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {p.answerKey.map((it) => {
            const r = run.results.find((x) => x.itemId === it.id);
            return (
              <li key={it.id} className="flex items-center gap-3 px-4 py-2.5 text-[14px]">
                <span className="w-[54px] shrink-0 font-mono text-[12px] text-ink3">{it.claim.id}</span>
                <span className="min-w-0 flex-1 truncate">
                  {it.claim.title} <span className="text-ink3">· {RISK_LABEL[it.expected.risk].toLowerCase()}</span>
                </span>
                {it.author === 'Meera' && <Tag tone="ok">From Meera</Tag>}
                {r && <Tag tone={r.pass ? 'ok' : 'bad'}>{r.pass ? 'Right' : 'Wrong'}</Tag>}
              </li>
            );
          })}
        </ul>
        <div className="mt-3">
          <ActionButton
            size="md"
            variant="secondary"
            icon={<Play className="h-3.5 w-3.5" />}
            label="Run them all again"
            busyLabel="Running"
            doneLabel="Done"
            resetAfter={900}
            run={() => {
              const id = runProof(p.id, 'Run again');
              const r = useApp.getState().projects.find((x) => x.id === p.id)?.runs.find((x) => x.id === id);
              if (r) toast(`Run #${r.n}: ${r.passed} of ${r.total} match.`, r.passed === r.total ? 'ok' : 'neutral');
              return !!id;
            }}
          />
        </div>
      </Disclosure>
    </FocusScreen>
  );
}

/** When everything matches: the one next thing to do. */
function NextStep({
  p,
  invited,
  tasks,
  rulesPass,
  failing,
  onSeeAs,
}: {
  p: Project;
  invited: boolean;
  tasks: number;
  rulesPass: boolean;
  failing: string[];
  onSeeAs: (r: 'reviewer' | 'approver') => void;
}) {
  const setInviteOpen = useApp((s) => s.setInviteOpen);
  const pending = pendingRequest(p);
  const approved = approvedFor(p, 'test') || approvedFor(p, 'live');
  if (tasks) return null;
  if (!invited)
    return (
      <Card title="Only an expert can say an answer is right" body="Invite Meera. She checks the answers in plain words, and every correction becomes a new test.">
        <Button variant="primary" size="lg" icon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteOpen(p.id)} tour="invite-meera">
          Invite Meera
        </Button>
      </Card>
    );
  if (pending)
    return (
      <Card title="Waiting for Farah" body={`Farah from IT is checking the launch of v${pending.version}. You will see her decision here.`}>
        <Button size="lg" onClick={() => onSeeAs('approver')}>
          See it as Farah
        </Button>
      </Card>
    );
  if (approved)
    return (
      <Card title="Farah signed off" body="You can put it in front of people now.">
        <Button variant="primary" size="lg" href={`/p/${p.id}/ship`} iconRight={<ArrowRight className="h-4 w-4" />}>
          Ship it
        </Button>
      </Card>
    );
  return (
    <Card
      title={rulesPass ? 'Ready for sign-off' : 'Almost ready for sign-off'}
      body={rulesPass ? 'Every launch rule passes. Ask Farah from IT to approve a small test launch.' : `Still to go: ${failing.join(', ').toLowerCase()}.`}
    >
      <Button variant="primary" size="lg" href={`/p/${p.id}/signoff`} iconRight={<ArrowRight className="h-4 w-4" />} tour="to-signoff">
        Ask Farah to sign off
      </Button>
    </Card>
  );
}

function Card({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 animate-slide-up">
      <div className="text-[17px] font-semibold">{title}</div>
      <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink2">{body}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}
