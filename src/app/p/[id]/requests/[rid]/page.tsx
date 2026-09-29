'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, Check, CheckCircle2, Download, ExternalLink, Lock, ShieldCheck, XCircle } from 'lucide-react';
import { useApp, useProject } from '@/lib/store';
import { useNow } from '@/lib/hooks';
import { graderAgreement } from '@/lib/engine';
import { CONDITIONS, ENV_LABEL, STATUS_LABEL } from '@/lib/stage';
import type { LaunchRequest, Project, RequestStatus } from '@/lib/types';
import { Logo, RequireAuth, UserMenu, ViewAsSwitch } from '@/components/shell';
import { MissingProject } from '@/components/missing';
import { Button, Card, Chip, SectionLabel, textareaCls } from '@/components/ui';
import { statusTone } from '@/components/project/launch-tab';
import { cn, dateLabel, timeAgo } from '@/lib/utils';

export default function LaunchPackPage() {
  return (
    <RequireAuth>
      <LaunchPack />
    </RequireAuth>
  );
}

function LaunchPack() {
  const { id, rid } = useParams<{ id: string; rid: string }>();
  const p = useProject(id);
  const ws = useApp((s) => s.workspace);
  const viewAs = useApp((s) => s.viewAs);
  const router = useRouter();
  const now = useNow(5000);
  if (!p) return <MissingProject />;
  const r = p.requests.find((x) => x.id === rid);
  if (!r) return <MissingProject what="launch request" />;

  const run = p.runs.find((x) => x.id === r.runId);
  const items = new Map(p.answerKey.map((i) => [i.id, i]));
  const high = run ? run.results.filter((x) => items.get(x.itemId)?.highRisk) : [];
  const reviewsBefore = p.reviews.filter((x) => x.at <= r.at);
  const lastReview = reviewsBefore.reduce((m, x) => Math.max(m, x.at), 0);
  const agree = graderAgreement(p);
  const prevApproved = [...p.requests].filter((x) => x.at < r.at && ['approved', 'approved_conditions', 'fast_lane'].includes(x.status)).pop();
  const changes = p.changes.filter((c) => !c.undone && (!prevApproved || c.at > prevApproved.at) && c.at <= r.at);
  const guardrails = p.agents.flatMap((a) => a.guardrails.map((g) => ({ ...g, agent: a.name })));
  const piiOn = guardrails.some((g) => g.id === 'mask_pii' && g.on);
  const proofStrong = !!run && run.passed === run.total && high.every((h) => h.pass);
  const pilot = r.env === 'live' && p.deployments.test.status === 'running' ? p.deployments.test : null;
  const pilotFlags = p.flags.filter((f) => f.env === 'test' && f.at <= now);

  return (
    <div className="paper min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 print:hidden">
        <Logo />
        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-[13.5px] md:flex">
          <Link href="/home" className="text-ink2 hover:text-ink">
            {ws?.name}
          </Link>
          <span className="text-ink3">/</span>
          <Link href={`/p/${p.id}?tab=signoff`} className="truncate font-semibold hover:underline">
            {p.name}
          </Link>
          <Chip tone="warn">Launch request #{r.n}</Chip>
        </nav>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" icon={<Download className="h-3.5 w-3.5" />} onClick={() => window.print()}>
          Download evidence (PDF)
        </Button>
        <ViewAsSwitch />
        <UserMenu />
      </header>

      <main className="mx-auto grid max-w-[1200px] gap-6 px-5 py-7 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[26px] font-semibold tracking-tight">
                Launch Pack · v{r.version} → {ENV_LABEL[r.env]}
              </h1>
              <Chip tone={statusTone(r.status)}>{r.status === 'pending' ? 'Waiting for a decision' : STATUS_LABEL[r.status]}</Chip>
            </div>
            <p className="mt-1 text-[14px] text-ink2">
              {p.name} · for {r.audience} · requested by {r.requestedBy} {timeAgo(r.at, now)} · {r.firstLaunch ? `first launch to ${ENV_LABEL[r.env]}` : 'an update'}
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-surface2 px-2.5 py-1 text-[12.5px] text-ink2 ring-1 ring-line print:hidden">
              <ShieldCheck className="h-3.5 w-3.5 text-ok" /> Everything on this page comes from test runs, Meera’s reviews and the app’s settings. None of it is typed by the builder.
            </p>
          </div>

          <Card>
            <SectionLabel>What it does</SectionLabel>
            <p className="mt-2 text-[14.5px] leading-relaxed">
              Reads claim emails and PDFs, checks the policy, scores the risk and drafts a reply for a claims handler to send. <b>It never sends anything itself</b>, and it never promises a payout.
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <SectionLabel>Proof</SectionLabel>
              <Chip tone={proofStrong ? 'ok' : 'warn'}>{proofStrong ? '✓ strong' : 'needs work'}</Chip>
            </div>
            <ul className="mt-3 grid gap-2 text-[14px]">
              <Line ok={!!run && run.passed === run.total}>
                <b>
                  {run?.passed} of {run?.total}
                </b>{' '}
                examples match the Answer Key (run #{run?.n}, v{run?.version})
              </Line>
              <Line ok={high.length > 0 && high.every((h) => h.pass)}>
                <b>
                  {high.filter((h) => h.pass).length} of {high.length}
                </b>{' '}
                high-risk examples pass
              </Line>
              <Line ok={!!lastReview}>
                {lastReview ? (
                  <>
                    Meera reviewed <b>{reviewsBefore.length} answers</b> ({dateLabel(lastReview)}) and corrected {reviewsBefore.filter((x) => x.verdict === 'wrong').length}; each correction became a test
                  </>
                ) : (
                  'No expert has reviewed answers yet'
                )}
              </Line>
              {agree.pct !== null && (
                <Line ok={agree.pct >= 90}>
                  The automatic check agrees with Meera <b>{agree.pct}%</b> of the time ({agree.n} reviews)
                </Line>
              )}
            </ul>
            <Link href={`/p/${p.id}?tab=proof`} className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline print:hidden">
              See every example and replay it <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>

          {pilot && (
            <Card>
              <SectionLabel>Pilot on Test</SectionLabel>
              <ul className="mt-3 grid gap-2 text-[14px]">
                <Line ok>
                  v{pilot.version} ran on Test for {pilot.audience} since {timeAgo(pilot.at ?? now, now)}
                </Line>
                <Line ok={pilotFlags.every((f) => f.status === 'reviewed')}>
                  {pilotFlags.length} answer{pilotFlags.length === 1 ? ' was' : 's were'} flagged by handlers;{' '}
                  {pilotFlags.filter((f) => f.status === 'reviewed').length} reviewed by Meera and turned into tests
                </Line>
              </ul>
            </Card>
          )}

          <Card>
            <div className="flex items-center justify-between">
              <SectionLabel>Data and access</SectionLabel>
              <Chip tone="warn" icon={<AlertTriangle className="h-3 w-3" />}>
                customer data
              </Chip>
            </div>
            <dl className="mt-3 grid gap-2.5 text-[14px] sm:grid-cols-[110px_minmax(0,1fr)]">
              <dt className="text-ink2">Reads</dt>
              <dd>Claims inbox (Gmail) · claims database, read only · policy PDFs</dd>
              <dt className="text-ink2">Writes</dt>
              <dd>
                Gmail drafts only, never sends
                {p.slackAlerts && (
                  <>
                    {' '}
                    · <b>posts high-risk alerts to Slack</b> <Chip tone="warn" className="ml-1">new</Chip>
                  </>
                )}
              </dd>
              <dt className="text-ink2">Privacy</dt>
              <dd className={piiOn ? '' : 'font-semibold text-bad'}>
                {piiOn ? 'Personal data is masked before any model sees it ✓' : 'Personal data masking is OFF'}
              </dd>
              <dt className="text-ink2">Models</dt>
              <dd>Claude (Haiku and Sonnet) via Lyzr, EU region</dd>
              <dt className="text-ink2">Runs on</dt>
              <dd>{ws?.runsOn === 'own' ? 'Harborline’s own cloud' : 'Lyzr cloud'} · every earlier version one click away</dd>
            </dl>
          </Card>

          <Card>
            <SectionLabel>Guardrails</SectionLabel>
            <ul className="mt-3 grid gap-1.5 text-[14px]">
              {guardrails.map((g) => (
                <li key={`${g.agent}-${g.id}`} className="flex items-center gap-2">
                  {g.on ? <ShieldCheck className="h-4 w-4 text-ok" /> : <XCircle className="h-4 w-4 text-bad" />}
                  <span className={g.on ? '' : 'text-bad'}>{g.label}</span>
                  <span className="text-[12.5px] text-ink3">· {g.agent}</span>
                </li>
              ))}
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-ok" />A handler approves every reply
              </li>
            </ul>
          </Card>

          <Card>
            <SectionLabel>Changes and cost</SectionLabel>
            <div className="mt-3 grid gap-2 text-[14px]">
              <div>
                {prevApproved ? `Since v${prevApproved.version} was approved: ` : 'First launch: '}
                <b>{changes.length ? `${changes.length} change${changes.length > 1 ? 's' : ''}` : 'no changes since the build'}</b>
                {changes.some((c) => c.committed) && ` · pull request #${changes.filter((c) => c.committed).pop()?.pr}`}
              </div>
              {changes.length > 0 && (
                <ul className="grid gap-1.5 rounded-xl bg-surface2 px-3.5 py-2.5 text-[13px]">
                  {changes.map((c) => (
                    <li key={c.id}>
                      #{c.n} {c.title} · <span className="text-ok">fixed {c.fixed}</span> · <span className={c.broke ? 'text-bad' : ''}>broke {c.broke}</span> · {c.before} → {c.after}
                    </li>
                  ))}
                </ul>
              )}
              <div className="text-ink2">
                Estimated running cost: <b className="text-ink">≈ 6 credits per 100 claims</b> · ≈ 60 credits a month at today’s volume
              </div>
            </div>
          </Card>

          <p className="text-[12.5px] leading-relaxed text-ink2">
            Every line above comes from its source: a test run, a trace, a commit or a setting. Nothing here was typed by the builder.
          </p>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <div className="text-[14px] font-semibold">Launch rules</div>
            <ul className="mt-2.5 grid gap-2">
              {r.checks.map((c) => (
                <li key={c.id} className="flex items-start gap-2 text-[13px]">
                  {c.pass ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" />}
                  <span className="flex-1">{c.label}</span>
                  <span className={cn('font-mono text-[12px]', c.pass ? 'text-ok' : 'text-bad')}>{c.detail}</span>
                </li>
              ))}
              <li className="flex items-start gap-2 text-[13px]">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink2" />
                <span className="flex-1">Anything going Live needs an approver’s decision</span>
              </li>
            </ul>
            <div className="mt-2.5 text-[11.5px] text-ink3">Checked when the request was sent. Rules are set by Farah in Settings.</div>
          </Card>
          {r.status === 'pending' ? (
            viewAs === 'approver' ? (
              <DecisionForm p={p} r={r} />
            ) : (
              <Card>
                <div className="text-[14px] font-semibold">Waiting for Farah</div>
                <p className="mt-1 text-[13px] text-ink2">Only an approver can decide. Farah has the Launch Pack and was notified.</p>
                <Button
                  size="sm"
                  className="mt-3"
                  full
                  onClick={() => useApp.getState().setViewAs('approver')}
                >
                  See it as Farah (demo switch)
                </Button>
              </Card>
            )
          ) : (
            <DecisionSummary r={r} onDeploy={() => {
              useApp.getState().setViewAs('builder');
              router.push(`/p/${p.id}?tab=ship`);
            }} viewAs={viewAs} />
          )}
        </aside>
      </main>
    </div>
  );
}

function Line({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" />}
      <span>{children}</span>
    </li>
  );
}


function DecisionForm({ p, r }: { p: Project; r: LaunchRequest }) {
  const decide = useApp((s) => s.decide);
  const conditions = CONDITIONS[r.env];
  const [choice, setChoice] = useState<RequestStatus>(r.env === 'test' && r.firstLaunch ? 'approved_conditions' : 'approved');
  const [conds, setConds] = useState<string[]>(conditions.slice(0, 2));
  const [comment, setComment] = useState(
    r.env === 'live' ? 'The pilot went well. Approved for everyone listed.' : r.firstLaunch ? 'Good evidence. Start with the claims team only.' : 'Approved.',
  );
  const allPass = r.checks.every((c) => c.pass);
  const options: { id: RequestStatus; label: string }[] = [
    { id: 'approved', label: 'Approve' },
    { id: 'approved_conditions', label: 'Approve with conditions' },
    { id: 'changes', label: 'Request changes' },
    { id: 'rejected', label: 'Reject' },
  ];
  return (
    <Card className="print:hidden" tour="decision">
      <div className="text-[14px] font-semibold">Your decision</div>
      {!allPass && <p className="mt-1 text-[12.5px] text-bad">Some launch rules fail. You can still decide, and your reason is recorded.</p>}
      <div className="mt-3 grid gap-2" role="radiogroup" aria-label="Decision">
        {options.map((o) => (
          <label
            key={o.id}
            className={cn('flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-[13.5px]', choice === o.id ? 'border-accent bg-accent-soft' : 'border-line hover:border-line2')}
          >
            <input type="radio" name="decision" className="mt-0.5 h-4 w-4 accent-accent" checked={choice === o.id} onChange={() => setChoice(o.id)} />
            <span className="flex-1">
              <span className="font-medium">{o.label}</span>
              {o.id === 'approved_conditions' && choice === o.id && (
                <span className="mt-2 grid gap-1.5">
                  {conditions.map((c) => (
                    <span key={c} className="flex items-center gap-2 text-[12.5px]">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-accent"
                        checked={conds.includes(c)}
                        onChange={(e) => setConds((xs) => (e.target.checked ? [...xs, c] : xs.filter((x) => x !== c)))}
                      />
                      {c}
                    </span>
                  ))}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
      <label className="mt-3 grid gap-1.5">
        <span className="text-[13px] font-semibold">Comment</span>
        <textarea className={textareaCls} rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
      <Button
        className="mt-3"
        variant={choice === 'rejected' ? 'danger' : 'primary'}
        full
        disabled={choice === 'approved_conditions' && !conds.length}
        onClick={() => decide(p.id, r.id, choice, choice === 'approved_conditions' ? conds : [], comment.trim())}
        icon={<Check className="h-4 w-4" />}
      >
        Record decision
      </Button>
      <p className="mt-2 text-[11.5px] text-ink3">Recorded in the audit trail with the evidence as it was at this moment.</p>
    </Card>
  );
}

function DecisionSummary({ r, onDeploy, viewAs }: { r: LaunchRequest; onDeploy: () => void; viewAs: string }) {
  const ok = ['approved', 'approved_conditions', 'fast_lane'].includes(r.status);
  return (
    <Card className={cn(ok ? 'border-ok-line' : 'border-bad-line')}>
      <div className="flex items-center gap-2">
        {ok ? <ShieldCheck className="h-5 w-5 text-ok" /> : <XCircle className="h-5 w-5 text-bad" />}
        <span className="text-[15px] font-semibold">{STATUS_LABEL[r.status]}</span>
      </div>
      <div className="mt-1 text-[12.5px] text-ink2">
        by {r.decision?.by ?? 'Farah'} · {r.decision ? timeAgo(r.decision.at) : ''}
      </div>
      {r.decision?.conditions.length ? (
        <ul className="mt-2.5 grid gap-1 text-[13px]">
          {r.decision.conditions.map((c) => (
            <li key={c} className="flex items-start gap-1.5">
              <Check className="mt-0.5 h-3.5 w-3.5 text-ok" /> {c}
            </li>
          ))}
        </ul>
      ) : null}
      {r.decision?.comment && <p className="mt-2.5 text-[13px] italic text-ink2">“{r.decision.comment}”</p>}
      {ok && (
        <Button className="mt-3 print:hidden" size="sm" full variant={viewAs === 'builder' ? 'primary' : 'secondary'} icon={<ExternalLink className="h-3.5 w-3.5" />} onClick={onDeploy}>
          {viewAs === 'builder' ? 'Go to Launch and deploy' : 'Back to Arjun to deploy (demo switch)'}
        </Button>
      )}
    </Card>
  );
}
