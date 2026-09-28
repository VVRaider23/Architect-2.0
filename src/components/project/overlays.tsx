'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Info, MessageCircleQuestion, Plus, Trash2, X, XCircle, Zap } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { useNow } from '@/lib/hooks';
import { ACTION_LABEL, AGENT_NAME, KIND_LABEL, evaluate, latestRun, money } from '@/lib/engine';
import { AUDIENCES, approvedFor, rulesFor } from '@/lib/stage';
import type { Invite, Project, Role } from '@/lib/types';
import { MatchMark, RiskChip, TraceList } from '@/components/domain';
import { Button, Modal, inputCls, textareaCls } from '@/components/ui';
import { cn } from '@/lib/utils';
import { claimFacts } from './proof-tab';

const ROLE_HELP: Record<Role, string> = {
  reviewer: 'Reviews answers and writes the Answer Key. Lands straight in the review queue.',
  approver: 'Approves launches from evidence. Hears from you only when you request sign-off.',
  builder: 'Builds and changes the app. Sees the code.',
};

export function InviteModal({ p }: { p: Project }) {
  const open = useApp((s) => s.inviteOpenFor === p.id);
  const setInviteOpen = useApp((s) => s.setInviteOpen);
  const invite = useApp((s) => s.invite);
  const run = latestRun(p);
  const [rows, setRows] = useState<{ email: string; role: Role }[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    const invited = new Set(p.invites.map((i) => i.email));
    const defaults = [
      { email: 'meera.k@harborline.com', role: 'reviewer' as Role },
      { email: 'farah.s@harborline.com', role: 'approver' as Role },
    ].filter((r) => !invited.has(r.email));
    setRows(defaults.length ? defaults : [{ email: '', role: 'reviewer' }]);
    setMessage(
      `Meera, could you check ${run?.total ?? 15} answers from the claims assistant? It takes about 10 minutes, and your corrections become tests.`,
    );
  }, [open, p.invites, run?.total]);

  const close = () => setInviteOpen(null);
  const valid = rows.filter((r) => /.+@.+\..+/.test(r.email));

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Invite people to ${p.name}`}
      description="They only see what their role needs. Nobody but builders sees the code."
      width={620}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!valid.length} onClick={() => invite(p.id, valid.map((r) => ({ ...r, at: Date.now() })) as Invite[], message)}>
            Send invites
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        {rows.map((r, i) => (
          <div key={i} className="grid gap-1.5 rounded-xl border border-line p-3">
            <div className="flex gap-2">
              <input
                className={inputCls}
                type="email"
                value={r.email}
                placeholder="name@company.com"
                aria-label="Email"
                onChange={(e) => setRows((xs) => xs.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))}
              />
              <select
                className="h-10 rounded-lg border border-line2 bg-surface px-2.5 text-[13.5px]"
                value={r.role}
                aria-label="Role"
                onChange={(e) => setRows((xs) => xs.map((x, j) => (j === i ? { ...x, role: e.target.value as Role } : x)))}
              >
                <option value="reviewer">Reviewer</option>
                <option value="approver">Approver</option>
                <option value="builder">Builder</option>
              </select>
              <button aria-label="Remove" className="rounded-lg px-2 text-ink3 hover:bg-sunken hover:text-ink" onClick={() => setRows((xs) => xs.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[12.5px] text-ink2">{ROLE_HELP[r.role]}</p>
          </div>
        ))}
        <button onClick={() => setRows((xs) => [...xs, { email: '', role: 'reviewer' }])} className="flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline">
          <Plus className="h-3.5 w-3.5" /> Add another
        </button>
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold">Message</span>
          <textarea className={textareaCls} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}


export function SignoffModal({ p }: { p: Project }) {
  const env = useUI((s) => s.signoff);
  const openSignoff = useUI((s) => s.openSignoff);
  const setTab = useUI((s) => s.setTab);
  const ws = useApp((s) => s.workspace);
  const requestSignoff = useApp((s) => s.requestSignoff);
  const now = useNow(5000);
  const [where, setWhere] = useState<'test' | 'live'>('test');
  const [audience, setAudience] = useState(AUDIENCES[0]);

  useEffect(() => {
    if (!env) return;
    setWhere(env);
    setAudience(env === 'live' ? AUDIENCES[1] : AUDIENCES[0]);
  }, [env]);

  const { checks, pass } = rulesFor(p, ws, now);
  const firstLaunch = !p.requests.some((r) => r.env === where && ['approved', 'approved_conditions', 'fast_lane'].includes(r.status));
  const fast = !!ws?.rules.fastLane && where === 'test' && !firstLaunch && pass && !p.accessChanged;
  const testRunning = p.deployments.test.status === 'running';
  const close = () => openSignoff(null);

  return (
    <Modal
      open={!!env}
      onClose={close}
      title={where === 'live' ? 'Request Live approval' : 'Request sign-off'}
      description="Farah gets a Launch Pack built from the evidence: test results, Meera’s reviews, data access, guardrails, changes and cost."
      width={600}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!pass || !!approvedFor(p, where)}
            icon={fast ? <Zap className="h-4 w-4" /> : undefined}
            onClick={() => {
              const r = requestSignoff(p.id, where, audience);
              close();
              if (r) setTab('signoff');
            }}
          >
            {fast ? 'Launch via the fast lane' : 'Send to Farah'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-2">
          {(['test', 'live'] as const).map((e) => (
            <button
              key={e}
              onClick={() => {
                setWhere(e);
                setAudience(e === 'live' ? AUDIENCES[1] : AUDIENCES[0]);
              }}
              aria-pressed={where === e}
              className={cn('rounded-xl border px-3.5 py-2.5 text-left', where === e ? 'border-accent bg-accent-soft shadow-ring' : 'border-line hover:border-line2')}
            >
              <div className="text-[14px] font-semibold">{e === 'test' ? 'Test (pilot)' : 'Live'}</div>
              <div className="text-[12px] text-ink2">{e === 'test' ? 'A small group tries it first' : 'Everyone you choose, for real'}</div>
            </button>
          ))}
        </div>
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold">Who is it for?</span>
          <select className={inputCls} value={audience} onChange={(e) => setAudience(e.target.value)}>
            {AUDIENCES.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <div>
          <div className="text-[13px] font-semibold">Launch rules for v{p.version}</div>
          <ul className="mt-2 grid gap-1.5 rounded-xl border border-line p-3">
            {checks.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-[13px]">
                {c.pass ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" />}
                <span className="flex-1">{c.label}</span>
                <span className={cn('font-mono text-[12px]', c.pass ? 'text-ok' : 'text-bad')}>{c.detail}</span>
              </li>
            ))}
          </ul>
        </div>
        {!pass ? (
          <Note tone="bad">Sign-off opens when every launch rule passes. Fix what is red first; Architect can help in chat.</Note>
        ) : approvedFor(p, where) ? (
          <Note tone="ok">v{p.version} is already approved for {where === 'test' ? 'Test' : 'Live'}. Deploy it from Ship.</Note>
        ) : fast ? (
          <Note tone="ok">
            This can take the <b>fast lane</b>: every rule passes, it isn’t the first launch, and data access hasn’t changed. Farah is told afterwards.
          </Note>
        ) : where === 'live' ? (
          <Note tone="info">
            Live always needs Farah’s decision.{' '}
            {testRunning ? 'The Launch Pack includes the pilot’s results.' : 'Tip: run a pilot on Test first, so the Launch Pack can include its results.'}
          </Note>
        ) : p.accessChanged ? (
          <Note tone="info">Data access changed since the last approval, so this one waits for Farah.</Note>
        ) : (
          <Note tone="info">The first launch of every app needs Farah’s decision. After that, changes that pass every rule can take the fast lane to Test.</Note>
        )}
      </div>
    </Modal>
  );
}

function Note({ tone, children }: { tone: 'ok' | 'bad' | 'info'; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'flex gap-2 rounded-xl border px-3.5 py-2.5 text-[13px] leading-relaxed',
        tone === 'ok' && 'border-ok-line bg-ok-soft text-ok',
        tone === 'bad' && 'border-bad-line bg-bad-soft text-bad',
        tone === 'info' && 'border-line bg-surface2 text-ink2',
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function ReplayDrawer({ p }: { p: Project }) {
  const replay = useUI((s) => s.replay);
  const close = useUI((s) => s.closeReplay);
  const setTab = useUI((s) => s.setTab);
  const setAgent = useUI((s) => s.setAgent);
  const viewAs = useApp((s) => s.viewAs);
  const sendChat = useApp((s) => s.sendChat);
  const setChatOpen = useUI((s) => s.setChatOpen);

  useEffect(() => {
    if (!replay) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [replay, close]);

  if (!replay) return null;
  const item = p.answerKey.find((i) => i.id === replay.itemId);
  if (!item) return null;
  const run = p.runs.find((r) => r.id === replay.runId) ?? latestRun(p);
  const res = run?.results.find((r) => r.itemId === item.id) ?? evaluate(item, p.version);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-[rgba(29,28,26,0.25)] animate-fade-in" onMouseDown={close}>
      <aside
        className="scroll-thin flex h-full w-full max-w-[520px] flex-col overflow-y-auto border-l border-line bg-surface shadow-pop animate-slide-left"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Replay ${item.claim.id}`}
      >
        <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-line bg-surface px-5 py-4">
          <div className="flex-1">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink3">
              Replay · run #{run?.n ?? '—'} · v{run?.version ?? p.version}
            </div>
            <div className="mt-0.5 text-[17px] font-semibold">
              <span className="font-mono text-[14px] text-ink3">{item.claim.id}</span> {item.claim.title}
            </div>
            <div className="text-[12.5px] text-ink2">
              {KIND_LABEL[item.claim.kind]} · {claimFacts(item)} · {item.claim.customer}
            </div>
          </div>
          <MatchMark pass={res.pass} className="mt-1" />
          <button onClick={close} aria-label="Close replay" className="rounded-lg p-1.5 text-ink2 hover:bg-sunken">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-4 px-5 py-4">
          <blockquote className="rounded-lg border border-line bg-surface2 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink2">“{item.claim.email}”</blockquote>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={cn('rounded-xl border p-3', res.pass ? 'border-line' : 'border-bad-line bg-bad-soft/40')}>
              <div className="text-[12px] font-semibold text-ink2">Agent said</div>
              <div className="mt-1.5">
                <RiskChip risk={res.verdict.risk} />
              </div>
              <div className="mt-1.5 text-[13px] font-medium">{ACTION_LABEL[res.verdict.action]}</div>
              <div className="mt-1 text-[12px] text-ink2">Draft: “{res.verdict.draft}”</div>
            </div>
            <div className="rounded-xl border border-ok-line bg-ok-soft/50 p-3">
              <div className="text-[12px] font-semibold text-ink2">Answer Key says</div>
              <div className="mt-1.5">
                <RiskChip risk={item.expected.risk} />
              </div>
              <div className="mt-1.5 text-[13px] font-medium">{ACTION_LABEL[item.expected.action]}</div>
              <div className="mt-1 text-[12px] text-ink2">{item.expectedText}</div>
            </div>
          </div>
          <div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink3">What happened, step by step</div>
            <div className="mt-3">
              <TraceList trace={res.trace} />
            </div>
          </div>
          <div className="text-[12px] text-ink2">
            Example #{item.n} · added by {item.author}
            {item.note ? ` · ${item.note}` : ''}
            {item.confirmedBy ? ` · checked by ${item.confirmedBy}` : ''}
          </div>
          {viewAs === 'builder' && !res.pass && (
            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              <Button
                size="sm"
                variant="primary"
                icon={<MessageCircleQuestion className="h-3.5 w-3.5" />}
                onClick={() => {
                  sendChat(p.id, `Why is the ${AGENT_NAME[res.failedAgent ?? 'risk_scorer']} failing on ${item.claim.id}?`);
                  setChatOpen(true);
                  close();
                }}
              >
                Ask Architect why
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setAgent(res.failedAgent ?? 'risk_scorer');
                  setTab('agents');
                }}
              >
                Open the {AGENT_NAME[res.failedAgent ?? 'risk_scorer']}
              </Button>
            </div>
          )}
          <div className="text-[11.5px] text-ink3">Amount {money(item.claim.amount)} · policy {item.claim.policyId}, {item.claim.policyAgeDays} days old</div>
        </div>
      </aside>
    </div>
  );
}
