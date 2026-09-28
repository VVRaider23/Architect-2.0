'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Check, FileCode2, GitPullRequest, PanelLeftClose, Play, RotateCcw, Sparkles } from 'lucide-react';
import { useApp } from '@/lib/store';
import { stepsFor } from '@/lib/store';
import { useNow } from '@/lib/hooks';
import { useUI } from '@/lib/ui';
import { buildStep } from '@/lib/stage';
import { frameworkLabel } from '@/lib/seed';
import { creditsForRun } from '@/lib/engine';
import type { ChatMsg, Project } from '@/lib/types';
import { LogoMark } from '@/components/shell';
import { Button, Chip, ProgressBar } from '@/components/ui';
import { cn, clock } from '@/lib/utils';

export function ChatPanel({ p }: { p: Project }) {
  const sendChat = useApp((s) => s.sendChat);
  const chatOpen = useUI((s) => s.chatOpen);
  const setChatOpen = useUI((s) => s.setChatOpen);
  const [text, setText] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const firstScroll = useRef(true);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: firstScroll.current ? 'auto' : 'smooth', block: 'end' });
    firstScroll.current = false;
  }, [p.chat.length, pending]);

  const send = (raw: string) => {
    const t = raw.trim();
    if (!t || pending) return;
    setText('');
    if (t === '/invite') {
      sendChat(p.id, t);
      return;
    }
    setPending(t);
    setTimeout(() => {
      sendChat(p.id, t);
      setPending(null);
    }, 750);
  };

  return (
    <aside
      className={cn(
        'z-30 flex w-[380px] shrink-0 flex-col border-r border-line bg-surface xl:w-[400px]',
        'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:shadow-pop',
        !chatOpen && 'max-lg:hidden',
      )}
      aria-label="Chat with Architect"
    >
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-4">
        <LogoMark size={20} />
        <span className="text-[13.5px] font-semibold">Architect</span>
        <span className="text-[12px] text-ink3">builds, tests and explains</span>
        <div className="flex-1" />
        <button className="rounded-md p-1 text-ink2 hover:bg-sunken lg:hidden" onClick={() => setChatOpen(false)} aria-label="Close chat">
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          {p.chat.map((m) => (
            <Message key={m.id} m={m} p={p} onSend={send} focusInput={() => inputRef.current?.focus()} />
          ))}
          {pending && (
            <>
              <UserBubble text={pending} />
              <div className="flex items-center gap-2 text-[12.5px] text-ink2">
                <LogoMark size={18} />
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink3 animate-pulse2" />
                  <span className="h-1.5 w-1.5 rounded-full bg-ink3 animate-pulse2 [animation-delay:200ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-ink3 animate-pulse2 [animation-delay:400ms]" />
                </span>
                Working on it
              </div>
            </>
          )}
          <div ref={endRef} />
        </div>
      </div>
      <form
        className="shrink-0 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <div className="flex items-end gap-2 rounded-xl border border-line2 bg-surface px-3 py-2 focus-within:border-accent focus-within:shadow-ring">
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(text);
              }
            }}
            placeholder="Message Architect"
            className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent py-0.5 text-[14px] leading-relaxed placeholder:text-ink3 focus:outline-none"
            style={{ height: Math.min(128, 24 + (text.split('\n').length - 1) * 22) }}
            aria-label="Message Architect"
          />
          <button
            type="submit"
            disabled={!text.trim() || !!pending}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white disabled:bg-line2"
            aria-label="Send"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1.5 px-1 text-[11.5px] text-ink3">Enter to send · try “Why is it failing?” or “/invite”</div>
      </form>
    </aside>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-line bg-sunken px-3.5 py-2 text-[13.5px] leading-relaxed">{text}</div>
    </div>
  );
}

function Message({ m, p, onSend, focusInput }: { m: ChatMsg; p: Project; onSend: (t: string) => void; focusInput: () => void }) {
  if (m.from === 'user') return <UserBubble text={m.text} />;
  const hideText = m.card?.type === 'suggest';
  return (
    <div className="flex gap-2.5 animate-fade-in">
      <div className="mt-0.5">
        <LogoMark size={20} />
      </div>
      <div className="min-w-0 flex-1">
        {!hideText && (
          <div className="text-[13.5px] leading-relaxed text-ink">
            {m.text}
            <span className="ml-1.5 align-middle font-mono text-[10.5px] text-ink3">{clock(m.at)}</span>
          </div>
        )}
        {m.card?.type === 'questions' && <QuestionsCard p={p} />}
        {m.card?.type === 'plan' && <PlanCard p={p} focusInput={focusInput} />}
        {m.card?.type === 'build' && <BuildCard p={p} />}
        {m.card?.type === 'receipt' && <ReceiptCard p={p} changeId={m.card.changeId} />}
        {m.card?.type === 'run' && <RunCard p={p} runId={m.card.runId} />}
        {m.card?.type === 'suggest' && (
          <div className="flex flex-wrap gap-1.5">
            {m.card.items.map((it) => (
              <button
                key={it.label}
                onClick={() => onSend(it.prompt)}
                className="inline-flex items-center gap-1.5 rounded-full border border-accent-line bg-accent-soft px-3 py-1 text-[12.5px] font-medium text-accent-ink hover:border-accent"
              >
                <Sparkles className="h-3 w-3" /> {it.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const CardBox = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('mt-2 rounded-xl border border-line bg-surface p-3.5 shadow-card', className)}>{children}</div>
);

const USERS = ['Claims handlers', 'Customers', 'Both'];
const SYSTEMS = ['Gmail', 'Claims database', 'Policy PDFs', 'Slack'];
const RISKY = 'Water damage over $10,000, a policy less than 60 days old, or a theft claim without a police report.';

function QuestionsCard({ p }: { p: Project }) {
  const answerConsultant = useApp((s) => s.answerConsultant);
  const draftPlan = useApp((s) => s.draftPlan);
  const [users, setUsers] = useState<string>(p.answers.users[0] ?? 'Claims handlers');
  const [systems, setSystems] = useState<string[]>(p.answers.systems.length ? p.answers.systems : ['Gmail', 'Claims database', 'Policy PDFs']);
  const [risky, setRisky] = useState(p.answers.risky || RISKY);
  const done = p.answers.answered;

  if (done) {
    return (
      <CardBox className="bg-surface2">
        <div className="grid gap-1.5 text-[12.5px] text-ink2">
          <div>
            <span className="font-semibold text-ink">Users:</span> {p.answers.users.join(', ')}
          </div>
          <div>
            <span className="font-semibold text-ink">Systems:</span> {p.answers.systems.join(', ')}
          </div>
          <div>
            <span className="font-semibold text-ink">Risky:</span> {p.answers.risky}
          </div>
        </div>
      </CardBox>
    );
  }

  const chip = (on: boolean) =>
    cn(
      'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors',
      on ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line2 bg-surface text-ink2 hover:border-ink3',
    );

  return (
    <CardBox>
      <div className="grid gap-4">
        <fieldset>
          <legend className="text-[13px] font-semibold">1. Who will use it?</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {USERS.map((u) => (
              <button key={u} type="button" className={chip(users === u)} onClick={() => setUsers(u)} aria-pressed={users === u}>
                {users === u && <Check className="h-3 w-3" />} {u}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-[13px] font-semibold">2. Which systems should it connect to?</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SYSTEMS.map((s) => {
              const on = systems.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  className={chip(on)}
                  aria-pressed={on}
                  onClick={() => setSystems((xs) => (on ? xs.filter((x) => x !== s) : [...xs, s]))}
                >
                  {on && <Check className="h-3 w-3" />} {s}
                </button>
              );
            })}
          </div>
        </fieldset>
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold">3. What makes a claim risky?</span>
          <textarea
            rows={3}
            value={risky}
            onChange={(e) => setRisky(e.target.value)}
            className="w-full resize-none rounded-lg border border-line2 px-3 py-2 text-[13px] leading-relaxed focus:border-accent focus:outline-none"
          />
        </label>
        <Button
          variant="primary"
          onClick={() => {
            answerConsultant(p.id, { users: users === 'Both' ? ['Claims handlers', 'Customers'] : [users], systems, risky });
            draftPlan(p.id);
          }}
        >
          Draft the plan
        </Button>
      </div>
    </CardBox>
  );
}

function PlanCard({ p, focusInput }: { p: Project; focusInput: () => void }) {
  const approvePlan = useApp((s) => s.approvePlan);
  const credits = useApp((s) => s.workspace?.credits ?? 0);
  const setTab = useUI((s) => s.setTab);
  if (!p.plan) return null;
  return (
    <CardBox>
      <button onClick={() => setTab('plan')} className="text-left text-[13.5px] font-semibold hover:underline">
        {p.plan.title}
      </button>
      <div className="mt-0.5 text-[12.5px] text-ink2">
        {p.plan.screens.length} screens · 5 agents · {p.plan.connections.length} connections · 3 example answers
      </div>
      {p.planApproved ? (
        <div className="mt-2.5 flex items-center gap-1.5 text-[12.5px] font-medium text-ok">
          <Check className="h-3.5 w-3.5" /> Approved · {frameworkLabel(p.framework)}
        </div>
      ) : (
        <>
          <div className="mt-3 rounded-lg bg-surface2 px-3 py-2 text-[12.5px] text-ink2">
            <div className="font-mono text-[10.5px] uppercase tracking-wider text-ink3">Cost before you commit</div>
            Build ≈ <b className="text-ink">140 credits</b> · each proof run ≈ <b className="text-ink">{creditsForRun(15)} credits</b> · you have {credits.toLocaleString('en-US')}.
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="primary" onClick={() => approvePlan(p.id)}>
              Approve and build
            </Button>
            <Button size="sm" onClick={focusInput}>
              Change something
            </Button>
          </div>
        </>
      )}
    </CardBox>
  );
}

function BuildCard({ p }: { p: Project }) {
  const now = useNow(500);
  const step = buildStep(p, now);
  const done = p.build.status === 'done';
  const setTab = useUI((s) => s.setTab);
  const BUILD_STEPS = stepsFor(p);
  return (
    <CardBox>
      {done ? (
        <div className="flex items-center gap-2 text-[13px]">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ok-soft text-ok">
            <Check className="h-3.5 w-3.5" />
          </span>
          <span className="font-semibold">Build finished</span>
          <span className="text-ink2">· {BUILD_STEPS.length} steps · 140 credits</span>
        </div>
      ) : (
        <button className="w-full text-left" onClick={() => setTab('preview')}>
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="font-semibold">
              Step {Math.min(step + 1, BUILD_STEPS.length)} of {BUILD_STEPS.length}
            </span>
            <span className="text-ink2">≈ {Math.round((step / BUILD_STEPS.length) * 140)} of 140 credits</span>
          </div>
          <div className="mt-2">
            <ProgressBar value={(step / BUILD_STEPS.length) * 100} />
          </div>
          <div className="mt-2 text-[12.5px] text-ink2">{BUILD_STEPS[Math.min(step, BUILD_STEPS.length - 1)]}…</div>
        </button>
      )}
    </CardBox>
  );
}

function ReceiptCard({ p, changeId }: { p: Project; changeId: string }) {
  const ch = p.changes.find((c) => c.id === changeId);
  const undoChange = useApp((s) => s.undoChange);
  const openPullRequest = useApp((s) => s.openPullRequest);
  const openCode = useUI((s) => s.openCode);
  if (!ch) return null;
  return (
    <CardBox className={cn(ch.undone && 'opacity-60')}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink3">Change receipt · #{ch.n}</span>
        <span className="font-mono text-[11px] text-ink2">
          v{ch.versionFrom} → v{ch.versionTo}
        </span>
      </div>
      <div className={cn('mt-1 text-[13.5px] font-semibold', ch.undone && 'line-through')}>{ch.title}</div>
      <ul className="mt-2 grid gap-1 rounded-lg bg-surface2 px-2.5 py-2 font-mono text-[11.5px]">
        {ch.files.map((f) => (
          <li key={f.path} className="flex items-center gap-2">
            <FileCode2 className="h-3 w-3 shrink-0 text-ink3" />
            <span className="min-w-0 flex-1 truncate">{f.path}</span>
            <span className="text-ok">+{f.add}</span>
            <span className="text-bad">−{f.del}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[12px]">
        <Chip tone={ch.fixed ? 'ok' : 'neutral'}>Fixed {ch.fixed}</Chip>
        <Chip tone={ch.broke ? 'bad' : 'neutral'}>Broke {ch.broke}</Chip>
        <span className="font-mono text-ink2">
          {ch.before} → {ch.after}
        </span>
        <span className="text-ink3">· {ch.credits} credits</span>
      </div>
      {ch.undone ? (
        <div className="mt-2.5 text-[12.5px] text-ink2">Undone.</div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button size="sm" onClick={() => openCode(ch.diffFile ?? null, ch.id)} icon={<FileCode2 className="h-3.5 w-3.5" />}>
            View the change
          </Button>
          {ch.committed ? (
            <Chip tone="ok" icon={<GitPullRequest className="h-3 w-3" />} className="h-8 !rounded-lg px-3">
              PR #{ch.pr} open
            </Chip>
          ) : (
            <Button size="sm" variant="primary" onClick={() => openPullRequest(p.id, ch.id)} icon={<GitPullRequest className="h-3.5 w-3.5" />}>
              Commit and open PR
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => undoChange(p.id, ch.id)} icon={<RotateCcw className="h-3.5 w-3.5" />}>
            Undo
          </Button>
        </div>
      )}
    </CardBox>
  );
}

function RunCard({ p, runId }: { p: Project; runId: string }) {
  const run = p.runs.find((r) => r.id === runId);
  const setTab = useUI((s) => s.setTab);
  const setFilter = useUI((s) => s.setProofFilter);
  if (!run) return null;
  const all = run.passed === run.total;
  const isLatest = p.runs[p.runs.length - 1]?.id === run.id;
  return (
    <CardBox>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink3">
          Proof run #{run.n} · {run.trigger}
        </span>
        <span className="font-mono text-[11px] text-ink3">v{run.version}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={cn('text-[20px] font-semibold', all ? 'text-ok' : 'text-ink')}>
          {run.passed} / {run.total}
        </span>
        <span className="text-[12.5px] text-ink2">{all ? 'all match the Answer Key' : `match · ${run.total - run.passed} miss${run.total - run.passed > 1 ? 'es' : ''}`}</span>
      </div>
      <div className="mt-2">
        <ProgressBar value={(run.passed / Math.max(1, run.total)) * 100} tone={all ? 'ok' : 'accent'} />
      </div>
      {isLatest && (
        <div className="mt-3 flex gap-1.5">
          <Button
            size="sm"
            onClick={() => {
              setFilter(all ? 'all' : 'failing');
              setTab('proof');
            }}
            icon={<Play className="h-3.5 w-3.5" />}
          >
            {all ? 'Open Proof' : 'See the misses'}
          </Button>
        </div>
      )}
    </CardBox>
  );
}
