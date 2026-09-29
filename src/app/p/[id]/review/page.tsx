'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, HelpCircle, X } from 'lucide-react';
import { useApp } from '@/lib/store';
import { ACTION_LABEL, KIND_LABEL, RISK_LABEL, latestRun, money, triage } from '@/lib/engine';
import type { Action, AnswerKeyItem, Project, ReviewTask, Risk, Verdict } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PaperScreen, ProjectRoute } from '@/components/frame';
import { Button, Kbd, ProgressBar, Tag, Tick } from '@/components/ui';

export default function ReviewPage() {
  return <ProjectRoute>{(p) => <Review p={p} />}</ProjectRoute>;
}

interface Row {
  task: ReviewTask;
  item?: AnswerKeyItem;
  verdict: Verdict;
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
      const verdict = res ? res.verdict : triage(item.claim, p.version).verdict;
      out.push({ task, item, verdict, title: item.claim.title, claim: item.claim, highRisk: item.highRisk });
    } else if (task.kind === 'flag' && task.flagId) {
      const f = p.flags.find((x) => x.id === task.flagId);
      if (!f) continue;
      out.push({ task, verdict: f.verdict, title: f.claim.title, claim: f.claim, flagBy: f.by, flagNote: f.note, highRisk: f.claim.amount >= 9000 });
    }
  }
  return out;
}

const FIXES: { action: Action; risk: Risk; label: string }[] = [
  { action: 'ask_police_report', risk: 'blocked', label: 'Ask for the police report' },
  { action: 'senior_handler', risk: 'high', label: 'Send to a senior handler' },
  { action: 'request_photos', risk: 'medium', label: 'Ask for photos' },
  { action: 'normal_review', risk: 'medium', label: 'Normal review' },
];

function ruleFor(kind: AnswerKeyItem['claim']['kind'], action: Action): string {
  if (kind === 'theft' && action === 'ask_police_report') return 'Theft claims need a police report number before approval.';
  if (kind === 'theft' && action === 'normal_review') return 'Theft claims with a police report go to normal review, with no payout promised.';
  if (kind === 'water_damage' && action === 'request_photos') return 'Water damage over $5,000 needs photos before a decision.';
  if (action === 'senior_handler') return `${KIND_LABEL[kind]} claims like this go to a senior handler.`;
  return '';
}

/** Screen 16 · Meera checks answers. One job: is this answer right? Right, wrong or not sure. */
function Review({ p }: { p: Project }) {
  const submitReview = useApp((s) => s.submitReview);
  const all = rowsFor(p);
  const open = all.filter((r) => !r.task.done);
  const batch = open[0]?.task.batch ?? [...p.tasks].reverse()[0]?.batch;
  const round = all.filter((r) => r.task.batch === batch);
  const doneInRound = round.filter((r) => r.task.done).length;
  const row = open[0];
  const [fixOpen, setFixOpen] = useState(false);
  const [leaving, setLeaving] = useState<null | 'right' | 'wrong' | 'unsure'>(null);
  const [saved, setSaved] = useState(false);
  const [corrected, setCorrected] = useState(0);
  const savedTimer = useRef<number>(undefined);

  useEffect(() => () => window.clearTimeout(savedTimer.current), []);
  useEffect(() => setFixOpen(false), [row?.task.id]);

  const send = (verdict: 'right' | 'wrong' | 'unsure', fix?: (typeof FIXES)[number]) => {
    if (!row || leaving) return;
    setLeaving(verdict);
    setTimeout(() => {
      submitReview(p.id, row.task.id, {
        verdict,
        correctAction: fix?.action,
        correctRisk: fix?.risk,
        correction: fix ? `${RISK_LABEL[fix.risk]}: ${ACTION_LABEL[fix.action].toLowerCase()}.` : undefined,
        rule: fix ? ruleFor(row.claim.kind, fix.action) || undefined : undefined,
      });
      setLeaving(null);
      setFixOpen(false);
      if (fix) {
        setCorrected((n) => n + 1);
        setSaved(true);
        window.clearTimeout(savedTimer.current);
        savedTimer.current = window.setTimeout(() => setSaved(false), 1800);
      }
    }, 260);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || !row) return;
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (fixOpen) {
        const n = Number(k);
        if (n >= 1 && n <= FIXES.length) send('wrong', FIXES[n - 1]);
        else if (k === 'escape') setFixOpen(false);
        return;
      }
      if (k === 'r') send('right');
      else if (k === 'w') setFixOpen(true);
      else if (k === 'n') send('unsure');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!row) {
    const checked = round.length;
    return (
      <PaperScreen p={p} title="answers to check">
        <div className="flex flex-col items-center pt-8 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-ok text-on-ok animate-pop-in">
            <Tick on size={28} />
          </span>
          <h1 className="mt-6 text-[30px] font-semibold tracking-[-0.02em]">{checked ? 'All done. Thank you, Meera.' : 'Nothing to check right now'}</h1>
          <p className="mt-3 max-w-[440px] text-[16px] leading-relaxed text-ink2">
            {checked
              ? `You checked ${checked} answer${checked === 1 ? '' : 's'}.${corrected ? ` Your ${corrected} correction${corrected === 1 ? ' is' : 's are'} now test${corrected === 1 ? '' : 's'}, so the same mistake can’t come back.` : ''} Arjun sees your answers now.`
              : 'When Arjun sends answers for you to check, they show up here as a simple list.'}
          </p>
          <div className="mt-8">
            <Button href="/home">Back to home</Button>
          </div>
        </div>
      </PaperScreen>
    );
  }

  const position = Math.min(round.length, doneInRound + 1);
  return (
    <PaperScreen p={p} title="answers to check">
      <div className="flex items-center gap-3">
        <span className="tabular text-[14px] font-medium">
          {position} of {round.length}
        </span>
        <ProgressBar value={(doneInRound / Math.max(1, round.length)) * 100} tone="ok" className="flex-1" />
        <span className={cn('flex items-center gap-1.5 text-[13px] font-medium text-ok transition-all duration-300', saved ? 'opacity-100' : 'translate-y-1 opacity-0')} aria-live="polite">
          <Check className="h-3.5 w-3.5" strokeWidth={3} /> {saved ? 'Saved as a test' : ''}
        </span>
      </div>

      <div className="relative mt-7" data-tour="review-card">
        {open.length > 2 && <div aria-hidden className="absolute inset-x-6 -bottom-3 h-full rounded-2xl border border-line bg-surface/60" />}
        {open.length > 1 && <div aria-hidden className="absolute inset-x-3 -bottom-1.5 h-full rounded-2xl border border-line bg-surface/80" />}
        <article
          key={row.task.id}
          className={cn(
            'relative rounded-2xl border border-line bg-surface p-6 shadow-card transition-all duration-[260ms] ease-in animate-pop-in',
            leaving === 'right' && 'translate-x-16 rotate-3 opacity-0',
            leaving === 'wrong' && '-translate-x-16 -rotate-3 opacity-0',
            leaving === 'unsure' && 'translate-y-6 opacity-0',
          )}
        >
          <div className="flex items-center gap-2 text-[13px] text-ink3">
            <span className="font-mono">{row.claim.id}</span>
            <span>·</span>
            <span>
              {KIND_LABEL[row.claim.kind]}, {money(row.claim.amount)}
            </span>
            {row.highRisk && (
              <Tag tone="warn" className="ml-auto">
                High risk
              </Tag>
            )}
          </div>
          <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.01em]">{row.title}</h1>
          <blockquote className="mt-3 text-[16px] leading-relaxed text-ink2">“{row.claim.email}”</blockquote>
          {row.flagBy && (
            <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-[14px] text-ink">
              Flagged by {row.flagBy.split(',')[0]}: {row.flagNote}
            </p>
          )}
          <div className="mt-5 rounded-xl bg-surface2 px-4 py-3">
            <div className="text-[12.5px] text-ink3">Architect says</div>
            <div className="mt-0.5 text-[17px] font-semibold">{ACTION_LABEL[row.verdict.action]}</div>
            <div className="text-[13.5px] text-ink3">{RISK_LABEL[row.verdict.risk]}</div>
          </div>
        </article>
      </div>

      {!fixOpen ? (
        <div className="mt-8 grid grid-cols-3 gap-2.5" data-tour="review-buttons">
          <VerdictButton tone="ok" icon={<Check className="h-4 w-4" strokeWidth={2.6} />} label="Right" k="R" onClick={() => send('right')} />
          <VerdictButton tone="bad" icon={<X className="h-4 w-4" strokeWidth={2.6} />} label="Wrong" k="W" onClick={() => setFixOpen(true)} tour="review-wrong" />
          <VerdictButton tone="neutral" icon={<HelpCircle className="h-4 w-4" />} label="Not sure" k="N" onClick={() => send('unsure')} />
        </div>
      ) : (
        <div className="mt-8 animate-slide-up" data-tour="review-fixes">
          <div className="flex items-baseline justify-between">
            <p className="text-[16px] font-medium">What should it have said?</p>
            <button type="button" onClick={() => setFixOpen(false)} className="press text-[13.5px] text-ink3 hover:text-ink">
              Cancel
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {FIXES.map((f, i) => (
              <button
                key={f.action}
                type="button"
                onClick={() => send('wrong', f)}
                className="press flex min-h-[52px] items-center gap-3 rounded-xl border border-line2 bg-surface px-4 text-left text-[15.5px] hover:border-accent-line hover:bg-accent-soft"
              >
                <Kbd>{i + 1}</Kbd>
                <span className="flex-1">{f.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-ink3">Your answer becomes a test, so the app is checked against it after every change.</p>
        </div>
      )}
    </PaperScreen>
  );
}

function VerdictButton({ tone, icon, label, k, onClick, tour }: { tone: 'ok' | 'bad' | 'neutral'; icon: React.ReactNode; label: string; k: string; onClick: () => void; tour?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tour={tour}
      className={cn(
        'press flex h-14 items-center justify-center gap-2 rounded-xl border text-[15.5px] font-medium',
        tone === 'ok' && 'border-ok-line bg-ok-soft text-ok hover:brightness-[0.97]',
        tone === 'bad' && 'border-bad-line bg-bad-soft text-bad hover:brightness-[0.97]',
        tone === 'neutral' && 'border-line2 bg-surface text-ink2 hover:bg-surface2',
      )}
    >
      {icon}
      {label}
      <Kbd className="ml-1 hidden sm:inline-flex">{k}</Kbd>
    </button>
  );
}
