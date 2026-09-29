'use client';

import { useMemo, useState } from 'react';
import { FileUp, Play, Plus } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { ACTION_LABEL, KIND_LABEL, RISK_LABEL, creditsForRun, graderAgreement, latestRun, money } from '@/lib/engine';
import type { PathStep } from '@/lib/stage';
import type { Action, AnswerKeyItem, ClaimKind, Project, Risk } from '@/lib/types';
import { MatchMark, RunSpark, sourceLabel } from '@/components/domain';
import { Button, Card, Chip, Empty, Modal, SectionLabel, inputCls, textareaCls } from '@/components/ui';
import { cn, timeAgo } from '@/lib/utils';
import { AGENT_NAME, agentScores } from '@/lib/engine';
import { StepHeader } from './journey';

/** Which change fixed an example, if any: the run right after its last failure was triggered by "Change #n". */
function fixedBy(p: Project, itemId: string): number | null {
  let lastFail = -1;
  p.runs.forEach((r, i) => {
    const res = r.results.find((x) => x.itemId === itemId);
    if (res && !res.pass) lastFail = i;
  });
  if (lastFail < 0) return null;
  const next = p.runs.slice(lastFail + 1).find((r) => r.results.find((x) => x.itemId === itemId)?.pass);
  const m = next?.trigger.match(/^Change #(\d+)/);
  return m ? Number(m[1]) : null;
}

export function claimFacts(it: AnswerKeyItem) {
  const c = it.claim;
  const bits = [money(c.amount)];
  if (c.kind === 'theft') bits.push(c.policeReport ? 'police report given' : 'no police report');
  if (c.policyAgeDays < 60) bits.push(`policy ${c.policyAgeDays} days old`);
  return bits.join(' · ');
}

export function ProofTab({ p, state }: { p: Project; state?: PathStep['state'] }) {
  const runProof = useApp((s) => s.runProof);
  const viewAs = useApp((s) => s.viewAs);
  const filter = useUI((s) => s.proofFilter);
  const setFilter = useUI((s) => s.setProofFilter);
  const openReplay = useUI((s) => s.openReplay);
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const run = latestRun(p);

  const rows = useMemo(() => {
    const res = new Map(run?.results.map((r) => [r.itemId, r]) ?? []);
    return p.answerKey.map((it) => ({ it, res: res.get(it.id) }));
  }, [p.answerKey, run]);

  if (!run) {
    return (
      <div className="grid gap-5 p-5">
        <StepHeader step="prove" state={state} />
        <Empty
          title="No test runs yet"
          body="When the build finishes, Architect runs every example in the Answer Key through the agents and shows which answers match."
        />
      </div>
    );
  }

  const failing = rows.filter((r) => r.res && !r.res.pass);
  const high = rows.filter((r) => r.it.highRisk);
  const highPass = high.filter((r) => r.res?.pass).length;
  const expert = rows.filter((r) => ['expert', 'live_flag'].includes(r.it.source) || r.it.author === 'Meera');
  const shown = filter === 'failing' ? failing : filter === 'high' ? high : filter === 'expert' ? expert : rows;
  const agree = graderAgreement(p);
  const lastReview = p.reviews.reduce((m, r) => Math.max(m, r.at), 0);
  const scores = agentScores(p);
  const weakest = (['intake_reader', 'policy_checker', 'risk_scorer', 'reply_drafter'] as const).filter((a) => scores[a].pass < scores[a].total);
  const kinds = [...new Set(failing.map((r) => KIND_LABEL[r.it.claim.kind].toLowerCase()))];
  const canEdit = viewAs !== 'approver';
  const allPass = run.passed === run.total;
  const pct = Math.round((run.passed / run.total) * 100);

  return (
    <div className="grid gap-5 p-5">
      <StepHeader step="prove" state={state} />

      <Card className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="text-[12.5px] text-ink2">
            Latest test run #{run.n} · {timeAgo(run.at)}
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5">
            <span className={cn('text-[30px] font-semibold tracking-tight', allPass ? 'text-ok' : 'text-ink')}>
              {run.passed} of {run.total}
            </span>
            <span className="text-[14px] text-ink2">answers match what the expert expects</span>
          </div>
          <div className="mt-2 h-2 max-w-[520px] overflow-hidden rounded-full bg-bad-soft">
            <div className={cn('h-full rounded-full', allPass ? 'bg-ok' : 'bg-accent')} style={{ width: `${pct}%` }} />
          </div>
          <p className={cn('mt-2.5 text-[13.5px]', allPass ? 'text-ok' : 'text-ink')}>
            {allPass ? (
              'Every example gets the right answer.'
            ) : (
              <>
                <b className="text-bad">
                  {failing.length} wrong answer{failing.length === 1 ? '' : 's'}
                </b>
                {kinds.length ? `, all ${kinds.length === 1 ? kinds[0] : kinds.join(' and ')} claims` : ''}
                {weakest.length ? `. The problem is in the ${weakest.map((a) => AGENT_NAME[a]).join(' and ')}.` : '.'}{' '}
                {failing.length > 0 && (
                  <button onClick={() => setFilter('failing')} className="font-medium text-accent hover:underline">
                    Show them
                  </button>
                )}
              </>
            )}
          </p>
        </div>
        <dl className="grid content-start gap-2.5 text-[12.5px] md:min-w-[250px] md:border-l md:border-line md:pl-5">
          <div>
            <dt className="text-ink2">High-risk examples</dt>
            <dd className={cn('font-semibold', highPass === high.length ? 'text-ok' : 'text-bad')}>
              {highPass} of {high.length} right
            </dd>
          </div>
          <div>
            <dt className="text-ink2">Checked by an expert</dt>
            <dd className="font-semibold">{lastReview ? `Meera, ${timeAgo(lastReview)}` : 'Not yet'}</dd>
          </div>
          {agree.pct !== null && (
            <div>
              <dt className="text-ink2">Auto-check agrees with Meera</dt>
              <dd className="font-semibold">
                {agree.pct}% <span className="font-normal text-ink2">of {agree.n} answers</span>
              </dd>
            </div>
          )}
          {p.runs.length > 1 && (
            <div>
              <dt className="text-ink2">Every run so far</dt>
              <dd className="mt-1">
                <RunSpark runs={p.runs} height={26} />
              </dd>
            </div>
          )}
        </dl>
      </Card>

      <Card pad={false} tour="answer-key">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">Answer Key</div>
            <div className="text-[12.5px] text-ink2">
              {p.answerKey.length} example claims with the answer the expert expects. Owned by Meera. Click a row to replay what the agents did.
            </div>
          </div>
          {canEdit && (
            <>
              <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>
                Add example
              </Button>
              <Button size="sm" icon={<FileUp className="h-3.5 w-3.5" />} onClick={() => setCsvOpen(true)}>
                Import CSV
              </Button>
            </>
          )}
          {viewAs === 'builder' && (
            <Button size="sm" variant="primary" icon={<Play className="h-3.5 w-3.5" />} onClick={() => runProof(p.id, 'Run from Proof')}>
              Run all tests · ≈ {creditsForRun(p.answerKey.length)} credits
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 border-b border-line bg-surface2 px-4 py-2">
          {(
            [
              ['all', `All ${rows.length}`],
              ['failing', `Failing ${failing.length}`],
              ['high', `High-risk ${high.length}`],
              ['expert', `From experts ${expert.length}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={cn(
                'rounded-full border px-3 py-1 text-[12px] font-medium',
                filter === id ? 'border-ink bg-ink text-bg' : 'border-line2 bg-surface text-ink2 hover:border-ink3',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[13px]">
            <thead className="text-[12px] text-ink2">
              <tr className="border-b border-line">
                <th className="w-10 px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Example</th>
                <th className="px-4 py-2 font-medium">Right answer</th>
                <th className="px-4 py-2 font-medium">Risk</th>
                <th className="px-4 py-2 font-medium">Added by</th>
                <th className="px-4 py-2 font-medium">Latest</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ it, res }) => {
                const fixed = res?.pass ? fixedBy(p, it.id) : null;
                return (
                  <tr key={it.id} onClick={() => openReplay(it.id, run.id)} className={cn('cursor-pointer border-b border-line last:border-0 hover:bg-surface2', res && !res.pass && 'bg-bad-soft/30')}>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-ink3">{it.n}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{it.claim.title}</div>
                      <div className="text-[12px] text-ink2">
                        <span className="font-mono">{it.claim.id}</span> · {KIND_LABEL[it.claim.kind]} · {claimFacts(it)}
                      </div>
                    </td>
                    <td className="max-w-[320px] px-4 py-2.5 text-ink2">{it.expectedText}</td>
                    <td className="px-4 py-2.5">{it.highRisk ? <Chip tone="bad">High</Chip> : <span className="text-[12.5px] text-ink3">Normal</span>}</td>
                    <td className="px-4 py-2.5 text-[12.5px] text-ink2">{sourceLabel(it)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {res ? <MatchMark pass={res.pass} /> : <span className="text-[12px] text-ink3">not run yet</span>}
                      {fixed && <span className="ml-1.5 text-[11.5px] text-ok">fixed by #{fixed}</span>}
                    </td>
                  </tr>
                );
              })}
              {!shown.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[13px] text-ink2">
                    Nothing here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {p.expertRules.length > 0 && (
        <Card>
          <SectionLabel>Rules from experts</SectionLabel>
          <ul className="mt-2 grid gap-1.5 text-[13.5px]">
            {p.expertRules.map((r) => (
              <li key={r}>“{r}” <span className="text-[12px] text-ink2">· Meera</span></li>
            ))}
          </ul>
        </Card>
      )}

      <AddExampleModal p={p} open={addOpen} onClose={() => setAddOpen(false)} />
      <CsvModal p={p} open={csvOpen} onClose={() => setCsvOpen(false)} />
    </div>
  );
}

const KINDS: ClaimKind[] = ['water_damage', 'theft', 'glass', 'roof', 'fire', 'flood', 'hail', 'liability'];
const RISKS: Risk[] = ['low', 'medium', 'high', 'blocked'];
const ACTIONS: Action[] = ['fast_track', 'normal_review', 'request_photos', 'senior_handler', 'ask_police_report'];

function AddExampleModal({ p, open, onClose }: { p: Project; open: boolean; onClose: () => void }) {
  const addExample = useApp((s) => s.addExample);
  const [title, setTitle] = useState('Stolen e-bike, report given');
  const [kind, setKind] = useState<ClaimKind>('theft');
  const [amount, setAmount] = useState('2600');
  const [age, setAge] = useState('500');
  const [report, setReport] = useState(true);
  const [risk, setRisk] = useState<Risk>('medium');
  const [action, setAction] = useState<Action>('normal_review');
  const [highRisk, setHighRisk] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add an example"
      description="Add the cases you worry about. Every test run checks them from now on."
      width={600}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!title.trim()}
            onClick={() => {
              addExample(p.id, {
                title: title.trim(),
                kind,
                amount: Number(amount) || 0,
                policyAgeDays: Number(age) || 365,
                policeReport: report,
                email: title.trim(),
                risk,
                action,
                highRisk,
              });
              onClose();
            }}
          >
            Add to Answer Key
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <label className="grid gap-1 text-[13px] font-semibold">
          The claim
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="grid gap-1 text-[13px] font-semibold">
            Type
            <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as ClaimKind)}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[13px] font-semibold">
            Amount ($)
            <input className={inputCls} value={amount} inputMode="numeric" onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} />
          </label>
          <label className="grid gap-1 text-[13px] font-semibold">
            Policy age (days)
            <input className={inputCls} value={age} inputMode="numeric" onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ''))} />
          </label>
        </div>
        {kind === 'theft' && (
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" className="h-4 w-4 accent-accent" checked={report} onChange={(e) => setReport(e.target.checked)} /> Police report number given
          </label>
        )}
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface2 p-3">
          <label className="grid gap-1 text-[13px] font-semibold">
            The right risk
            <select className={inputCls} value={risk} onChange={(e) => setRisk(e.target.value as Risk)}>
              {RISKS.map((r) => (
                <option key={r} value={r}>
                  {RISK_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[13px] font-semibold">
            The right next step
            <select className={inputCls} value={action} onChange={(e) => setAction(e.target.value as Action)}>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {ACTION_LABEL[a]}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 flex items-center gap-2 text-[13px]">
            <input type="checkbox" className="h-4 w-4 accent-accent" checked={highRisk} onChange={(e) => setHighRisk(e.target.checked)} /> High-risk example (must
            always pass before launch)
          </label>
        </div>
      </div>
    </Modal>
  );
}

const SAMPLE_CSV = `title,kind,amount,policy_age_days,police_report,risk,action,high_risk
Stolen tablet from car,theft,900,700,no,blocked,ask_police_report,yes
Hail dents on bonnet,hail,2400,380,,low,fast_track,no
Kitchen fire damage,fire,7800,1100,,medium,request_photos,no`;

function CsvModal({ p, open, onClose }: { p: Project; open: boolean; onClose: () => void }) {
  const importCsv = useApp((s) => s.importCsv);
  const toast = useApp((s) => s.toast);
  const [text, setText] = useState(SAMPLE_CSV);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import examples from a spreadsheet"
      description="Paste CSV rows or pick a file. Columns: title, kind, amount, policy_age_days, police_report, risk, action, high_risk."
      width={680}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              const n = importCsv(p.id, text);
              toast(n ? `Imported ${n} example${n > 1 ? 's' : ''}. Run the tests to check them.` : 'No valid rows found. Check the column values.', n ? 'ok' : 'bad');
              if (n) onClose();
            }}
          >
            Import
          </Button>
        </>
      }
    >
      <textarea className={cn(textareaCls, 'font-mono text-[12px]')} rows={7} value={text} onChange={(e) => setText(e.target.value)} aria-label="CSV rows" />
      <label className="mt-3 flex items-center gap-2 text-[13px] text-ink2">
        Or pick a .csv file:
        <input
          type="file"
          accept=".csv,text/csv"
          className="text-[12.5px]"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setText(await f.text());
          }}
        />
      </label>
    </Modal>
  );
}
