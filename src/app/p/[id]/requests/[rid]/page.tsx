'use client';

import { useParams } from 'next/navigation';
import { useRouter } from '@/lib/nav';
import { useEffect, useState } from 'react';
import { ArrowRight, ChevronDown, Printer, X } from 'lucide-react';
import { useApp } from '@/lib/store';
import { latestRun } from '@/lib/engine';
import { CONDITIONS } from '@/lib/stage';
import type { LaunchRequest, Project } from '@/lib/types';
import { cn, dateLabel, timeAgo } from '@/lib/utils';
import { PaperScreen, ProjectRoute } from '@/components/frame';
import { ActionButton, Button, Chip, Disclosure, Empty, Menu, Tick, textareaCls } from '@/components/ui';

export default function RequestPage() {
  return <ProjectRoute>{(p, now) => <Request p={p} now={now} />}</ProjectRoute>;
}

const PICKS = ['Review again in 30 days', 'At most 50 claims a day', 'A person sends every reply'];

function who(audience: string) {
  const n = audience.match(/\((\d+) people\)/)?.[1];
  const team = audience.replace(/\s*\(.*\)/, '');
  return { n, team: team.charAt(0).toLowerCase() + team.slice(1) };
}

function titleFor(r: LaunchRequest) {
  if (r.env === 'live') return 'Can it go live for everyone?';
  return `Can it go to the ${who(r.audience).team.replace(/^the /, '')}?`;
}

/** The launch rules, reworded as plain facts. */
function facts(p: Project, r: LaunchRequest) {
  const run = p.runs.find((x) => x.id === r.runId) ?? latestRun(p);
  const byId = new Map(r.checks.map((c) => [c.id, c]));
  const out: { label: string; value: string; ok: boolean }[] = [];
  if (run) out.push({ label: 'All answers match', value: `${run.passed} of ${run.total}`, ok: run.passed === run.total });
  const high = byId.get('high_risk');
  if (high) out.push({ label: 'Every high-risk answer is right', value: high.detail.replace('/', ' of '), ok: high.pass });
  const expert = byId.get('expert');
  if (expert) out.push({ label: 'Meera checked the answers', value: expert.pass ? expert.detail.charAt(0).toUpperCase() + expert.detail.slice(1) : 'Not yet', ok: expert.pass });
  const pii = byId.get('pii');
  if (pii) out.push({ label: 'No personal data reaches the models', value: pii.pass ? 'Checked' : 'Off', ok: pii.pass });
  const { n } = who(r.audience);
  out.push({ label: r.env === 'live' ? 'Test pilot ran first' : `Only the ${who(r.audience).team.replace(/^the /, '')} can use it`, value: r.env === 'live' ? 'Yes' : n ? `${n} people` : 'Invited only', ok: true });
  return out;
}

/** Screen 17 · Farah signs off. One job: is it safe to put in front of these people? */
function Request({ p, now }: { p: Project; now: number }) {
  const { rid } = useParams<{ rid: string }>();
  const router = useRouter();
  const viewAs = useApp((s) => s.viewAs);
  const decide = useApp((s) => s.decide);
  const setViewAs = useApp((s) => s.setViewAs);
  const [conds, setConds] = useState<string[]>([]);
  const [back, setBack] = useState(false);
  const [comment, setComment] = useState('');
  const r = p.requests.find((x) => x.id === rid);
  if (!r)
    return (
      <PaperScreen p={p} title="sign-off">
        <Empty title="This request isn’t here" body="It may have been made in another browser." action={<Button href="/home">Back to home</Button>} />
      </PaperScreen>
    );

  const list = facts(p, r);
  const decided = r.status !== 'pending';
  const approved = ['approved', 'approved_conditions', 'fast_lane'].includes(r.status);
  const isFarah = viewAs === 'approver';
  const envName = r.env === 'live' ? 'Live' : 'Test';
  const { n } = who(r.audience);

  return (
    <PaperScreen p={p} title="sign-off">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-balance text-[30px] font-semibold leading-tight tracking-[-0.02em] sm:text-[34px]">{titleFor(r)}</h1>
        {decided && (
          <span
            className={cn(
              'mt-1 shrink-0 rounded-lg border-2 px-3 py-1 text-[14px] font-bold uppercase tracking-[0.08em] animate-stamp',
              approved ? 'border-ok text-ok' : 'border-bad text-bad',
            )}
          >
            {r.status === 'fast_lane' ? 'Fast lane' : approved ? 'Approved' : r.status === 'changes' ? 'Sent back' : 'Rejected'}
          </span>
        )}
      </div>
      <p className="mt-3 text-[16px] leading-relaxed text-ink2">
        Arjun asked for a {envName} launch{n ? ` for ${n} people` : r.env === 'live' ? ' for everyone at Harborline' : ''}, {timeAgo(r.at, now)}. Every line below comes from test runs and reviews, not from Arjun.
      </p>

      <ul className="mt-7 flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface" data-tour="farah-checks">
        {list.map((f, i) => (
          <li key={f.label} className="flex items-center gap-3 px-4 py-3.5 animate-fade-in" style={{ animationDelay: `${i * 90}ms`, animationFillMode: 'both' }}>
            <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full', f.ok ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad')}>
              {f.ok ? <DrawTick delay={200 + i * 120} /> : <X className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
            <span className="flex-1 text-[15px]">{f.label}</span>
            <span className={cn('text-[14px]', f.ok ? 'text-ink2' : 'font-medium text-bad')}>{f.value}</span>
          </li>
        ))}
      </ul>

      {decided ? (
        <div className="mt-7 rounded-2xl border border-line bg-surface p-5 animate-slide-up">
          <div className="text-[15px] font-medium">
            {r.decision?.by === 'Launch rules' ? 'Every launch rule passed, so this went through on its own.' : `${r.decision?.by ?? 'Farah'} decided on ${dateLabel(r.decision?.at ?? r.at)}.`}
          </div>
          {!!r.decision?.conditions.length && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {r.decision.conditions.map((c) => (
                <Chip key={c} tone="outline">
                  {c}
                </Chip>
              ))}
            </div>
          )}
          {r.decision?.comment && r.decision.by !== 'Launch rules' && <p className="mt-3 text-[14.5px] text-ink2">“{r.decision.comment}”</p>}
          <p className="mt-3 text-[14px] text-ink3">
            {approved ? (r.env === 'test' ? 'Arjun can deploy to Test now. Live still needs your approval.' : 'Arjun can go live now.') : 'Arjun has your note and will send a new request.'}
          </p>
          {approved && !isFarah && (
            <Button
              variant="primary"
              size="lg"
              className="mt-4"
              href={r.env === 'live' ? `/p/${p.id}/live` : `/p/${p.id}/ship`}
              iconRight={<ArrowRight className="h-4 w-4" />}
            >
              {r.env === 'live' ? 'Go live' : 'Deploy to Test'}
            </Button>
          )}
          {approved && isFarah && (
            <Button
              size="lg"
              className="mt-4"
              onClick={() => {
                setViewAs('builder');
                router.push(r.env === 'live' ? `/p/${p.id}/live` : `/p/${p.id}/ship`);
              }}
            >
              See it as Arjun
            </Button>
          )}
        </div>
      ) : !isFarah ? (
        <div className="mt-7 rounded-2xl border border-line bg-surface p-5">
          <div className="text-[16px] font-semibold">Waiting for Farah</div>
          <p className="mt-1 text-[14.5px] text-ink2">Only Farah can decide. She has this page and was told.</p>
          <Button
            size="lg"
            className="mt-4"
            onClick={() => setViewAs('approver')}
            tour="see-as-farah"
          >
            See it as Farah
          </Button>
        </div>
      ) : (
        <>
          {conds.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {conds.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-full border border-line2 bg-surface py-1 pl-3 pr-1.5 text-[13.5px] animate-pop-in">
                  {c}
                  <button type="button" onClick={() => setConds((x) => x.filter((y) => y !== c))} className="press grid h-5 w-5 place-items-center rounded-full text-ink3 hover:bg-sunken hover:text-ink" aria-label={`Remove ${c}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {back ? (
            <div className="mt-6 animate-slide-up">
              <label htmlFor="why" className="text-[14.5px] font-medium">
                What should Arjun change?
              </label>
              <textarea id="why" autoFocus rows={3} value={comment} onChange={(e) => setComment(e.target.value)} className={cn(textareaCls, 'mt-2')} placeholder="For example: turn personal data masking back on." />
              <div className="mt-3 flex gap-2">
                <ActionButton size="lg" variant="danger" label="Send it back" busyLabel="Sending" doneLabel="Sent back" disabled={!comment.trim()} run={() => true} onDone={() => decide(p.id, r.id, 'changes', [], comment.trim())} />
                <Button size="lg" variant="ghost" onClick={() => setBack(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <ActionButton
                size="xl"
                label={`Approve for ${envName}`}
                busyLabel="Approving"
                doneLabel="Approved"
                tour="farah-approve"
                run={() => true}
                onDone={() => decide(p.id, r.id, conds.length ? 'approved_conditions' : 'approved', conds, '')}
              />
              <Menu
                width={280}
                keepOpen
                label="Conditions"
                items={[...new Set([...PICKS, ...(r.env === 'live' ? CONDITIONS.live : [])])].map((c) => ({
                  id: c,
                  label: c,
                  checked: conds.includes(c),
                  onSelect: () => setConds((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c])),
                }))}
                trigger={({ open, toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    className="press inline-flex h-12 items-center gap-1.5 rounded-xl px-4 text-[15px] font-medium text-ink2 hover:bg-surface2 hover:text-ink"
                  >
                    Add a condition… <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
                  </button>
                )}
              />
              <button type="button" onClick={() => setBack(true)} className="press ml-auto text-[14px] text-ink3 hover:text-bad">
                Send it back
              </button>
            </div>
          )}
        </>
      )}

      <Disclosure label="See the full Launch Pack" className="mt-10">
        <LaunchPack p={p} r={r} />
      </Disclosure>
    </PaperScreen>
  );
}

function DrawTick({ delay }: { delay: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return <Tick on={on} size={14} />;
}

/** The detail behind the decision, for anyone who wants it. */
function LaunchPack({ p, r }: { p: Project; r: LaunchRequest }) {
  const ws = useApp((s) => s.workspace);
  const piiOn = p.agents.some((a) => a.guardrails.some((g) => g.id === 'mask_pii' && g.on));
  const guardrails = p.agents.flatMap((a) => a.guardrails.map((g) => ({ ...g, agent: a.name })));
  const changes = p.changes.filter((c) => !c.undone && c.at <= r.at);
  const section = 'rounded-xl border border-line bg-surface p-4';
  const head = 'text-[13px] font-medium text-ink3';
  return (
    <div className="flex flex-col gap-3 text-[14.5px] leading-relaxed">
      <div className={section}>
        <div className={head}>What it does</div>
        <p className="mt-1.5">
          Reads claim emails and PDFs, checks the policy, scores the risk and drafts a reply for a claims handler to send. It never sends anything itself, and it never promises a payout.
        </p>
      </div>
      <div className={section}>
        <div className={head}>Data it touches</div>
        <ul className="mt-1.5 flex flex-col gap-1">
          <li>Reads: the claims inbox, the claims database (read only), policy PDFs</li>
          <li>Writes: email drafts only{p.slackAlerts ? ', and alerts to Slack' : ''}</li>
          <li className={piiOn ? '' : 'font-medium text-bad'}>{piiOn ? 'Personal data is masked before any model sees it' : 'Personal data masking is off'}</li>
          <li>Runs on {ws?.runsOn === 'own' ? 'Harborline’s own cloud' : 'Lyzr cloud'}, EU region</li>
        </ul>
      </div>
      <div className={section}>
        <div className={head}>Safety rules</div>
        <ul className="mt-1.5 flex flex-col gap-1">
          {guardrails.map((g) => (
            <li key={`${g.agent}-${g.id}`} className={g.on ? '' : 'text-bad'}>
              {g.on ? '✓' : '✗'} {g.label} <span className="text-ink3">· {g.agent}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className={section}>
        <div className={head}>Changes and cost</div>
        <p className="mt-1.5">
          {changes.length ? `${changes.length} change${changes.length === 1 ? '' : 's'} since the build: ${changes.map((c) => c.title.toLowerCase()).join('; ')}.` : 'No changes since the build.'} About 6 credits per 100 claims.
        </p>
      </div>
      <div>
        <Button size="sm" variant="ghost" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => window.print()}>
          Print or save as PDF
        </Button>
      </div>
    </div>
  );
}
