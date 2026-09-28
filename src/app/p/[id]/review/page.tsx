'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, Bell, Check, ChevronDown, ChevronRight, CircleDot, ExternalLink, HelpCircle, Paperclip, X } from 'lucide-react';
import { useApp, useProject } from '@/lib/store';
import { ACTION_LABEL, KIND_LABEL, LATEST_VERSION, RISK_LABEL, latestRun, money, triage } from '@/lib/engine';
import type { Action, AnswerKeyItem, Project, ReviewTask, Risk, Verdict } from '@/lib/types';
import { Logo, RequireAuth, UserMenu, ViewAsSwitch } from '@/components/shell';
import { MissingProject } from '@/components/missing';
import { RiskChip, TraceList } from '@/components/domain';
import { Button, Card, Chip, Kbd, ProgressBar, SectionLabel, inputCls, textareaCls } from '@/components/ui';
import { cn, plural } from '@/lib/utils';

export default function ReviewPage() {
  return (
    <RequireAuth>
      <Review />
    </RequireAuth>
  );
}

const RISKS: Risk[] = ['low', 'medium', 'high', 'blocked'];
const ACTIONS: Action[] = ['fast_track', 'normal_review', 'request_photos', 'senior_handler', 'ask_police_report'];

interface Row {
  task: ReviewTask;
  item?: AnswerKeyItem;
  verdict: Verdict;
  trace: ReturnType<typeof triage>['trace'];
  title: string;
  claim: AnswerKeyItem['claim'];
  flagBy?: string;
  flagNote?: string;
  highRisk: boolean;
}

function rowsFor(p: Project): Row[] {
  const out: Row[] = [];
  for (const task of p.tasks) {
    if (task.kind === 'answer' && task.itemId) {
      const item = p.answerKey.find((i) => i.id === task.itemId);
      if (!item) continue;
      const run = p.runs.find((r) => r.id === task.runId) ?? latestRun(p);
      const res = run?.results.find((r) => r.itemId === item.id);
      const t = res ? { verdict: res.verdict, trace: res.trace } : triage(item.claim, p.version);
      out.push({ task, item, verdict: t.verdict, trace: t.trace, title: item.claim.title, claim: item.claim, highRisk: item.highRisk });
    } else if (task.kind === 'flag' && task.flagId) {
      const f = p.flags.find((x) => x.id === task.flagId);
      if (!f) continue;
      const t = triage(f.claim, p.deployments[f.env].version ?? p.version);
      out.push({ task, verdict: f.verdict, trace: t.trace, title: f.claim.title, claim: f.claim, flagBy: f.by, flagNote: f.note, highRisk: f.claim.amount >= 9000 });
    }
  }
  return out;
}

function Review() {
  const { id } = useParams<{ id: string }>();
  const p = useProject(id);
  const router = useRouter();
  const ws = useApp((s) => s.workspace);
  const viewAs = useApp((s) => s.viewAs);
  const [filter, setFilter] = useState<'all' | 'high'>('all');
  const [picked, setPicked] = useState<string | null>(null);
  const [showEarlier, setShowEarlier] = useState(false);

  const allRows = useMemo(() => (p ? rowsFor(p) : []), [p]);
  if (!p) return <MissingProject />;

  // Show the current round of reviews; earlier rounds are one click away.
  const round = (allRows.find((r) => !r.task.done) ?? allRows[allRows.length - 1])?.task.batch;
  const rows = allRows.filter((r) => r.task.batch === round);
  const earlier = allRows.length - rows.length;
  const listed = showEarlier ? allRows : rows;
  const shown = filter === 'high' ? listed.filter((r) => r.highRisk) : listed;
  const open = rows.filter((r) => !r.task.done);
  const current = rows.find((r) => r.task.id === picked && !r.task.done) ?? open[0];
  const done = rows.length - open.length;
  const reviews = new Map(p.reviews.map((r) => [r.taskId, r]));
  const roundReviews = p.reviews.filter((r) => rows.some((x) => x.task.id === r.taskId));
  const myTests = p.reviews.filter((r) => r.createdItemId);
  const run = latestRun(p);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
        <Logo />
        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-[13.5px] md:flex">
          <Link href="/home" className="text-ink2 hover:text-ink">
            {ws?.name}
          </Link>
          <span className="text-ink3">/</span>
          <Link href={`/p/${p.id}`} className="truncate font-semibold hover:underline">
            {p.name}
          </Link>
          <Chip tone="ok">Reviewing</Chip>
        </nav>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" href={`/apps/${p.id}?env=preview`} target="_blank" icon={<ExternalLink className="h-3.5 w-3.5" />}>
          Try the app
        </Button>
        <ViewAsSwitch onSwitch={(role) => role !== 'reviewer' && router.push(role === 'builder' ? `/p/${p.id}` : '/home')} />
        <UserMenu />
      </header>

      {viewAs !== 'reviewer' && (
        <div className="border-b border-warn-line bg-warn-soft px-5 py-2 text-[13px] text-warn">
          This is Meera’s review queue. You are viewing it as {viewAs === 'builder' ? 'Arjun' : 'Farah'}; reviews are recorded as Meera’s.
        </div>
      )}

      <div className="mx-auto grid w-full max-w-[1400px] flex-1 gap-5 px-5 py-5 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <aside className="flex flex-col gap-3">
          <Card>
            <div className="text-[15px] font-semibold">Your review</div>
            <div className="mt-0.5 text-[12.5px] text-ink2">
              {done} of {rows.length} done{open.length ? ` · about ${plural(Math.max(1, Math.round(open.length * 0.6)), 'minute')} left` : ''}
            </div>
            <div className="mt-2.5">
              <ProgressBar value={rows.length ? (done / rows.length) * 100 : 0} tone="ok" />
            </div>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink2">
              Check each answer like a new colleague’s work. If it’s wrong, say what it should have said: that becomes a test the app must pass.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink2">
              Keys: <Kbd>R</Kbd> right <Kbd>W</Kbd> wrong <Kbd>S</Kbd> not sure
            </div>
          </Card>
          <div className="flex gap-1.5">
            {(
              [
                ['all', `All ${rows.length}`],
                ['high', `High-risk ${rows.filter((r) => r.highRisk).length}`],
              ] as const
            ).map(([f, label]) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn('rounded-full border px-3 py-1 text-[12px] font-medium', filter === f ? 'border-ink bg-ink text-white' : 'border-line2 bg-surface text-ink2')}
              >
                {label}
              </button>
            ))}
          </div>
          <ul className="scroll-thin max-h-[60vh] overflow-y-auto rounded-xl border border-line bg-surface lg:max-h-[calc(100vh-270px)]">
            {shown.map((r) => {
              const rev = reviews.get(r.task.id);
              const isCur = current?.task.id === r.task.id;
              return (
                <li key={r.task.id}>
                  <button
                    onClick={() => !r.task.done && setPicked(r.task.id)}
                    className={cn(
                      'flex w-full items-center gap-2.5 border-b border-line px-3 py-2 text-left text-[12.5px] last:border-0',
                      isCur ? 'bg-accent-soft' : r.task.done ? 'cursor-default' : 'hover:bg-surface2',
                    )}
                  >
                    {rev ? (
                      rev.verdict === 'right' ? (
                        <Check className="h-4 w-4 shrink-0 text-ok" />
                      ) : rev.verdict === 'wrong' ? (
                        <X className="h-4 w-4 shrink-0 text-bad" />
                      ) : (
                        <HelpCircle className="h-4 w-4 shrink-0 text-warn" />
                      )
                    ) : isCur ? (
                      <CircleDot className="h-4 w-4 shrink-0 text-accent" />
                    ) : (
                      <span className="h-4 w-4 shrink-0 rounded-full border border-line2" />
                    )}
                    <span className="font-mono text-[11px] text-ink3">{r.claim.id}</span>
                    <span className={cn('min-w-0 flex-1 truncate', isCur && 'font-semibold')}>{r.title}</span>
                    {r.task.kind === 'flag' && <Bell className="h-3.5 w-3.5 shrink-0 text-bad" />}
                  </button>
                </li>
              );
            })}
            {!shown.length && <li className="px-3 py-4 text-[12.5px] text-ink2">Nothing in this list.</li>}
          </ul>
          {earlier > 0 && (
            <button onClick={() => setShowEarlier((x) => !x)} className="text-left text-[12.5px] font-medium text-accent hover:underline">
              {showEarlier ? 'Hide earlier rounds' : `Show earlier rounds (${earlier} answers)`}
            </button>
          )}
        </aside>

        <section className="min-w-0">
          {current ? (
            <ReviewCard key={current.task.id} p={p} row={current} index={rows.indexOf(current) + 1} total={rows.length} onSkip={() => {
              const next = open.find((r) => r.task.id !== current.task.id);
              setPicked(next?.task.id ?? null);
            }} />
          ) : (
            <Card className="flex flex-col items-center gap-3 px-8 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ok-soft text-ok">
                <Check className="h-6 w-6" />
              </span>
              <h1 className="text-[22px] font-semibold tracking-tight">{rows.length ? 'All done. Thank you!' : 'Nothing to review yet'}</h1>
              <p className="max-w-lg text-[14px] leading-relaxed text-ink2">
                {rows.length
                  ? `In this round you reviewed ${roundReviews.length} answer${roundReviews.length === 1 ? '' : 's'} and corrected ${roundReviews.filter((r) => r.verdict === 'wrong').length}. ${
                      roundReviews.some((r) => r.createdItemId)
                        ? 'Each correction became a new test. Arjun sees them as failing tests to fix, and you’ll see when they pass.'
                        : 'Nothing needed a new test.'
                    }`
                  : 'When Arjun invites you, the answers to check appear here.'}
              </p>
              {run && (
                <div className="text-[13px] text-ink2">
                  Latest test run: <b className={run.passed === run.total ? 'text-ok' : 'text-bad'}>{run.passed} of {run.total}</b> match the Answer Key.
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <Button href="/home">Back to home</Button>
                <Button variant="primary" href={`/p/${p.id}?tab=proof`}>
                  See the Answer Key
                </Button>
              </div>
            </Card>
          )}
        </section>

        <aside className="hidden flex-col gap-3 xl:flex">
          <Card>
            <div className="text-[15px] font-semibold">Answer Key</div>
            <p className="mt-0.5 text-[12.5px] text-ink2">The examples the assistant is tested against. You own them.</p>
            <div className="mt-3 flex gap-5">
              <div>
                <div className="text-[24px] font-semibold">{p.answerKey.length}</div>
                <div className="text-[12px] text-ink2">examples</div>
              </div>
              <div>
                <div className="text-[24px] font-semibold">{p.answerKey.filter((i) => i.highRisk).length}</div>
                <div className="text-[12px] text-ink2">high-risk</div>
              </div>
            </div>
            <Button size="sm" className="mt-3" full href={`/p/${p.id}?tab=proof`}>
              Open the Answer Key
            </Button>
          </Card>
          <Card className="bg-accent-soft/60">
            <SectionLabel>Your impact so far</SectionLabel>
            <p className="mt-1.5 text-[13px] leading-relaxed">
              {myTests.length
                ? `${myTests.length} correction${myTests.length > 1 ? 's' : ''} became ${myTests.length} new test${myTests.length > 1 ? 's' : ''}. Arjun sees them as failing tests to fix, and you’ll see when they pass.`
                : 'When you mark an answer wrong, your correction becomes a test the app must pass before it launches.'}
            </p>
          </Card>
          {p.expertRules.length > 0 && (
            <Card>
              <SectionLabel>Your rules</SectionLabel>
              <ul className="mt-1.5 grid gap-1.5 text-[12.5px]">
                {p.expertRules.map((r) => (
                  <li key={r}>“{r}”</li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function suggestedRule(row: Row, action: Action): string {
  const k = row.claim.kind;
  if (k === 'theft' && action === 'ask_police_report') return 'Theft claims need a police report number before approval.';
  if (k === 'theft' && action === 'normal_review') return 'Theft claims with a police report go to normal review, with no payout promised.';
  if (k === 'water_damage' && action === 'request_photos') return 'Water damage over $5,000 needs photos before a decision.';
  if (action === 'senior_handler') return `${KIND_LABEL[k]} claims like this go to a senior handler.`;
  return '';
}

function ReviewCard({ p, row, index, total, onSkip }: { p: Project; row: Row; index: number; total: number; onSkip: () => void }) {
  const submitReview = useApp((s) => s.submitReview);
  const [mode, setMode] = useState<null | 'wrong'>(null);
  const [showTrace, setShowTrace] = useState(false);
  const suggestion = row.item ? row.item.expected : triage(row.claim, LATEST_VERSION).verdict;
  const [risk, setRisk] = useState<Risk>(suggestion.risk);
  const [action, setAction] = useState<Action>(suggestion.action);
  const [text, setText] = useState(
    row.item ? row.item.expectedText : `${RISK_LABEL[suggestion.risk]}: ${ACTION_LABEL[suggestion.action].toLowerCase()}.`,
  );
  const [rule, setRule] = useState(suggestedRule(row, suggestion.action));
  const [saveRule, setSaveRule] = useState(!!rule);

  const submit = (verdict: 'right' | 'wrong' | 'unsure') => {
    if (verdict === 'wrong') {
      submitReview(p.id, row.task.id, { verdict, correction: text.trim(), correctRisk: risk, correctAction: action, rule: saveRule && rule.trim() ? rule.trim() : undefined });
    } else submitReview(p.id, row.task.id, { verdict });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
      if (mode === 'wrong' && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submit('wrong');
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'r') submit('right');
      else if (k === 'w') setMode('wrong');
      else if (k === 's') submit('unsure');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const c = row.claim;
  return (
    <Card className="flex flex-col gap-5 p-6">
      <div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink3">
          {row.task.kind === 'flag' ? 'Flagged in the live app' : `Answer ${index} of ${total}`}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-[22px] font-semibold tracking-tight">
            <span className="font-mono text-[16px] text-ink3">{c.id}</span> {c.title}
          </h1>
          {row.highRisk && <Chip tone="bad">High-risk</Chip>}
        </div>
        {row.flagBy && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-bad-line bg-bad-soft px-3 py-2 text-[13px] text-bad">
            <Bell className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <b>{row.flagBy}</b> flagged this: “{row.flagNote}”
            </span>
          </div>
        )}
      </div>

      <div>
        <SectionLabel>The claim</SectionLabel>
        <blockquote className="mt-2 rounded-xl border border-line bg-surface2 px-4 py-3 text-[14.5px] leading-relaxed">
          “{c.email}” <span className="text-ink2">— {c.customer}</span>
        </blockquote>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] text-ink2">
          {c.attachments.map((a) => (
            <span key={a} className="inline-flex items-center gap-1 rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[11.5px]">
              <Paperclip className="h-3 w-3" /> {a}
            </span>
          ))}
          <span>
            {KIND_LABEL[c.kind]} · {money(c.amount)} · policy {c.policyId}, {c.policyAgeDays} days old
            {c.kind === 'theft' ? (c.policeReport ? ' · police report given' : ' · no police report') : ''}
          </span>
        </div>
      </div>

      <div>
        <SectionLabel>What the assistant said</SectionLabel>
        <div className="mt-2 rounded-xl border border-line px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <RiskChip risk={row.verdict.risk} />
            <span className="text-[15px] font-semibold">{ACTION_LABEL[row.verdict.action]}</span>
          </div>
          <p className="mt-1.5 text-[13.5px] text-ink2">Why: {row.verdict.reasons[0]}.</p>
          <p className="mt-1.5 text-[13.5px]">
            Draft reply: <span className="text-ink2">“{row.verdict.draft}”</span>
          </p>
          <button onClick={() => setShowTrace((x) => !x)} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent">
            {showTrace ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />} How it got there
          </button>
          {showTrace && (
            <div className="mt-3">
              <TraceList trace={row.trace.map((s) => ({ ...s, bad: false }))} compact />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3" data-tour="review-buttons">
        <button
          onClick={() => submit('right')}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-ok-line bg-ok-soft text-[14.5px] font-semibold text-ok hover:border-ok"
        >
          <Check className="h-4 w-4" /> Right <Kbd>R</Kbd>
        </button>
        <button
          onClick={() => setMode(mode === 'wrong' ? null : 'wrong')}
          aria-pressed={mode === 'wrong'}
          className={cn(
            'flex h-12 items-center justify-center gap-2 rounded-xl border text-[14.5px] font-semibold',
            mode === 'wrong' ? 'border-bad bg-bad text-white' : 'border-bad-line bg-bad-soft text-bad hover:border-bad',
          )}
        >
          <X className="h-4 w-4" /> Wrong <Kbd>W</Kbd>
        </button>
        <button
          onClick={() => submit('unsure')}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line2 bg-surface text-[14.5px] font-semibold text-ink2 hover:border-ink3"
        >
          <HelpCircle className="h-4 w-4" /> Not sure <Kbd>S</Kbd>
        </button>
      </div>

      {mode === 'wrong' && (
        <div className="grid gap-3 rounded-xl border border-bad-line bg-surface p-4 animate-slide-up">
          <div className="text-[14px] font-semibold">What should it have said?</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-[12.5px] font-semibold">
              The right risk
              <select
                className={inputCls}
                value={risk}
                onChange={(e) => setRisk(e.target.value as Risk)}
              >
                {RISKS.map((r) => (
                  <option key={r} value={r}>
                    {RISK_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-[12.5px] font-semibold">
              The right next step
              <select
                className={inputCls}
                value={action}
                onChange={(e) => {
                  const a = e.target.value as Action;
                  setAction(a);
                  const next = suggestedRule(row, a);
                  setRule(next);
                  setSaveRule(!!next);
                }}
              >
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {ACTION_LABEL[a]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-[12.5px] font-semibold">
            In your words
            <textarea className={textareaCls} rows={2} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <label className="flex items-start gap-2 text-[13px]">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-accent" checked={saveRule} onChange={(e) => setSaveRule(e.target.checked)} />
            <span className="flex-1">
              Also save as a rule
              <input
                className={cn(inputCls, 'mt-1.5')}
                value={rule}
                onChange={(e) => {
                  setRule(e.target.value);
                  if (e.target.value.trim()) setSaveRule(true);
                }}
                placeholder="Optional: a rule in your words"
                aria-label="Rule"
              />
            </span>
          </label>
          <p className="text-[12px] text-ink2">Your correction becomes a new test, plus a similar case so the fix can’t just memorise this one.</p>
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => submit('wrong')} icon={<ArrowRight className="h-4 w-4" />}>
              Save and next
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-line pt-3 text-[13px]">
        <Link href="/home" className="text-ink2 hover:text-ink">
          Finish for now
        </Link>
        <button onClick={onSkip} className="text-ink2 hover:text-ink">
          Skip
        </button>
      </div>
    </Card>
  );
}
