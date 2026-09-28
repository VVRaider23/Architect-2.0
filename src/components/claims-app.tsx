'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Flag, Inbox, Mail, Paperclip, Plus, ShieldAlert, X } from 'lucide-react';
import { useApp } from '@/lib/store';
import { ACTION_LABEL, KIND_LABEL, money, triage } from '@/lib/engine';
import { LIVE_FLAG_CLAIMS, SEED_CLAIMS } from '@/lib/seed';
import type { Claim, ClaimKind, Env, Project } from '@/lib/types';
import { cn } from '@/lib/utils';
import { EnvPill, RiskChip, TraceList } from './domain';
import { Button, Modal, inputCls, textareaCls } from './ui';

type Section = 'inbox' | 'risk' | 'drafts';

const RECEIVED = ['09:41', '09:37', '09:22', '09:05', '08:58', '08:44', '08:31', '08:12', 'Yesterday', 'Yesterday', 'Yesterday', 'Mon', 'Mon', 'Mon', 'Sun', 'Sun', 'Sat', 'Sat', 'Fri'];

/**
 * "Harborline Claims": the app Architect built for the demo project. It runs whichever agent
 * version is deployed to the environment, so Preview, Test and Live can answer differently.
 */
export function ClaimsApp({
  p,
  env,
  version,
  embedded,
  device = 'desktop',
}: {
  p: Project;
  env: Env;
  version: number;
  embedded?: boolean;
  device?: 'desktop' | 'mobile';
}) {
  const flagAnswer = useApp((s) => s.flagAnswer);
  const toast = useApp((s) => s.toast);
  const [section, setSection] = useState<Section>('inbox');
  const [selected, setSelected] = useState<string | null>(null);
  const [local, setLocal] = useState<Claim[]>([]);
  const [newOpen, setNewOpen] = useState(false);

  const claims = useMemo(() => {
    const base = SEED_CLAIMS.map((s) => s.claim);
    const extra = env === 'preview' ? [] : LIVE_FLAG_CLAIMS.map((f) => f.claim);
    return [...local, ...extra, ...base].map((c, i) => ({ c, ...triage(c, version), received: RECEIVED[i % RECEIVED.length] }));
  }, [local, env, version]);

  const risky = claims.filter((x) => x.verdict.risk === 'high' || x.verdict.risk === 'blocked');
  const shown = section === 'risk' ? risky : claims;
  const current = claims.find((x) => x.c.id === selected);
  const mobile = device === 'mobile';
  // With a claim open beside the list, keep only the columns that fit.
  const compact = mobile || (!!current && !!embedded);

  return (
    <div className={cn('flex min-h-0 flex-col bg-[#F7F8FA] text-[#1B2230]', embedded ? 'h-full' : 'min-h-screen')}>
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[#E3E7EE] bg-white px-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0F3B5F] text-[13px] font-bold text-white">H</span>
        <span className="text-[14px] font-semibold">Harborline Claims</span>
        <EnvPill env={env} version={version} />
        <div className="flex-1" />
        {!mobile && <span className="text-[12px] text-[#5B6576]">Priya S. · Claims handler</span>}
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E7EEF6] text-[11px] font-semibold text-[#0F3B5F]">PS</span>
      </header>
      <div className="flex min-h-0 flex-1">
        {!mobile && (
          <nav className="flex w-[176px] shrink-0 flex-col gap-0.5 border-r border-[#E3E7EE] bg-white p-2 text-[13px]">
            {(
              [
                ['inbox', 'Claims inbox', claims.length, Inbox],
                ['risk', 'Risk review', risky.length, ShieldAlert],
                ['drafts', 'Reply drafts', claims.length, Mail],
              ] as const
            ).map(([id, label, n, Icon]) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2.5 py-2 text-left',
                  section === id ? 'bg-[#E7EEF6] font-semibold text-[#0F3B5F]' : 'text-[#3B4454] hover:bg-[#F1F4F8]',
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{label}</span>
                <span className="text-[11.5px] text-[#7A8494]">{n}</span>
              </button>
            ))}
            <div className="mt-auto rounded-md bg-[#F1F4F8] p-2.5 text-[11.5px] leading-snug text-[#5B6576]">
              The assistant drafts. A handler decides and sends.
            </div>
          </nav>
        )}
        <div className={cn('min-w-0 flex-1 overflow-auto', current && mobile && 'hidden')}>
          <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
            <div className="min-w-0">
              <h2 className="text-[16px] font-semibold">{section === 'risk' ? 'Risk review' : section === 'drafts' ? 'Reply drafts' : 'Claims inbox'}</h2>
              <p className="text-[12px] text-[#5B6576]">{section === 'risk' ? 'High risk or blocked. A person decides.' : 'Newest first. Click a claim to see the assistant’s work.'}</p>
            </div>
            <button
              onClick={() => setNewOpen(true)}
              className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-[#0F3B5F] px-3 text-[12.5px] font-medium text-white hover:bg-[#0B2E4A]"
            >
              <Plus className="h-3.5 w-3.5" /> New claim
            </button>
          </div>
          <div className="px-4 pb-4">
            <div className="overflow-hidden rounded-lg border border-[#E3E7EE] bg-white">
              {section === 'drafts' ? (
                <ul>
                  {shown.map(({ c, verdict }) => (
                    <li key={c.id}>
                      <button onClick={() => setSelected(c.id)} className="block w-full border-b border-[#EEF1F5] px-3.5 py-2.5 text-left last:border-0 hover:bg-[#F7F9FC]">
                        <div className="text-[12.5px] font-semibold">
                          To {c.customer} · re: {c.title}
                        </div>
                        <div className="truncate text-[12.5px] text-[#5B6576]">{verdict.draft}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <table className="w-full text-left text-[12.5px]">
                  <thead className="bg-[#F7F9FC] text-[11.5px] text-[#5B6576]">
                    <tr>
                      <th className="px-3.5 py-2 font-medium">Claim</th>
                      {!compact && <th className="px-3.5 py-2 font-medium">Customer</th>}
                      <th className="px-3.5 py-2 font-medium">Amount</th>
                      <th className="px-3.5 py-2 font-medium">Risk</th>
                      {!compact && <th className="px-3.5 py-2 font-medium">Next step</th>}
                      {!compact && <th className="px-3.5 py-2 font-medium">Received</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map(({ c, verdict, received }) => (
                      <tr
                        key={c.id}
                        onClick={() => setSelected(c.id)}
                        className={cn('cursor-pointer border-t border-[#EEF1F5] hover:bg-[#F7F9FC]', selected === c.id && 'bg-[#EEF3FA]')}
                      >
                        <td className="px-3.5 py-2.5">
                          <div className="font-medium">{c.title}</div>
                          <div className="font-mono text-[11px] text-[#7A8494]">{c.id}</div>
                        </td>
                        {!compact && <td className="px-3.5 py-2.5 text-[#3B4454]">{c.customer}</td>}
                        <td className="px-3.5 py-2.5 font-mono">{money(c.amount)}</td>
                        <td className="px-3.5 py-2.5">
                          <RiskChip risk={verdict.risk} />
                        </td>
                        {!compact && <td className="px-3.5 py-2.5 text-[#3B4454]">{ACTION_LABEL[verdict.action]}</td>}
                        {!compact && <td className="px-3.5 py-2.5 text-[#7A8494]">{received}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
        {current && (
          <ClaimDetail
            key={current.c.id}
            item={current}
            mobile={mobile}
            onClose={() => setSelected(null)}
            onSave={() => toast('Saved as a Gmail draft. A handler reviews and sends it.', 'ok')}
            onFlag={(note) => flagAnswer(p.id, env, current.c, current.verdict, note, 'Priya S., claims handler')}
          />
        )}
      </div>
      <NewClaimModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreate={(c) => {
          setLocal((xs) => [c, ...xs]);
          setSelected(c.id);
          setSection('inbox');
          setNewOpen(false);
        }}
        nextId={`C-${2001 + local.length}`}
      />
    </div>
  );
}

function ClaimDetail({
  item,
  mobile,
  onClose,
  onSave,
  onFlag,
}: {
  item: { c: Claim; verdict: ReturnType<typeof triage>['verdict']; trace: ReturnType<typeof triage>['trace']; received: string };
  mobile: boolean;
  onClose: () => void;
  onSave: () => void;
  onFlag: (note: string) => void;
}) {
  const { c, verdict, trace } = item;
  const [showTrace, setShowTrace] = useState(false);
  const [draft, setDraft] = useState(verdict.draft);
  const [flagging, setFlagging] = useState(false);
  const [note, setNote] = useState('');
  const [flagged, setFlagged] = useState(false);
  return (
    <section className={cn('flex shrink-0 flex-col overflow-y-auto border-l border-[#E3E7EE] bg-white', mobile ? 'w-full' : 'w-[380px]')} aria-label="Claim detail">
      <div className="flex items-start gap-2 border-b border-[#EEF1F5] px-4 py-3">
        <div className="flex-1">
          <div className="font-mono text-[11px] text-[#7A8494]">
            {c.id} · {KIND_LABEL[c.kind]} · policy {c.policyId}
          </div>
          <div className="text-[15px] font-semibold">{c.title}</div>
          <div className="text-[12px] text-[#5B6576]">
            {c.customer} · {money(c.amount)} · received {item.received}
          </div>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-[#5B6576] hover:bg-[#F1F4F8]" aria-label="Close claim">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-4 px-4 py-4">
        <blockquote className="rounded-lg border border-[#E3E7EE] bg-[#F7F9FC] px-3 py-2.5 text-[12.5px] leading-relaxed text-[#3B4454]">
          “{c.email}”
          {c.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.attachments.map((a) => (
                <span key={a} className="inline-flex items-center gap-1 rounded border border-[#E3E7EE] bg-white px-1.5 py-0.5 font-mono text-[11px]">
                  <Paperclip className="h-3 w-3" /> {a}
                </span>
              ))}
            </div>
          )}
        </blockquote>
        <div className="rounded-lg border border-[#E3E7EE] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8494]">Assistant’s assessment</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <RiskChip risk={verdict.risk} />
            <span className="text-[13px] font-medium">{ACTION_LABEL[verdict.action]}</span>
          </div>
          <p className="mt-1.5 text-[12.5px] text-[#3B4454]">Why: {verdict.reasons[0]}.</p>
          <button onClick={() => setShowTrace((x) => !x)} className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#0F3B5F]">
            {showTrace ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />} How it got there
          </button>
          {showTrace && (
            <div className="mt-2">
              <TraceList trace={trace} compact />
            </div>
          )}
        </div>
        <label className="grid gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8494]">Draft reply</span>
          <textarea rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} className={APP_TEXTAREA} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button onClick={onSave} className="h-8 rounded-md bg-[#0F3B5F] px-3 text-[12.5px] font-medium text-white hover:bg-[#0B2E4A]">
            Save to Gmail drafts
          </button>
          {!flagged && (
            <button
              onClick={() => setFlagging((x) => !x)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E3C5C1] px-3 text-[12.5px] font-medium text-[#A4262C] hover:bg-[#FCEFEE]"
            >
              <Flag className="h-3.5 w-3.5" /> Flag this answer
            </button>
          )}
        </div>
        {flagging && !flagged && (
          <div className="grid gap-2 rounded-lg border border-[#E3C5C1] bg-[#FCF6F5] p-3">
            <label className="text-[12.5px] font-semibold" htmlFor={`flag-${c.id}`}>
              What’s wrong with this answer?
            </label>
            <textarea
              id={`flag-${c.id}`}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Nearly $10k of water damage, fast-tracked with no photos."
              className={APP_TEXTAREA}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setFlagging(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={!note.trim()}
                onClick={() => {
                  onFlag(note.trim());
                  setFlagged(true);
                  setFlagging(false);
                }}
              >
                Send flag
              </Button>
            </div>
          </div>
        )}
        {flagged && (
          <div className="flex items-center gap-2 rounded-lg bg-[#FCEFEE] px-3 py-2 text-[12.5px] text-[#A4262C]">
            <AlertTriangle className="h-4 w-4" /> Flagged. The team that built the assistant will review it.
          </div>
        )}
      </div>
    </section>
  );
}

const APP_TEXTAREA =
  'w-full resize-none rounded-md border border-[#D5DBE4] bg-white px-3 py-2 text-[12.5px] leading-relaxed text-[#1B2230] placeholder:text-[#8A93A3] focus:border-[#0F3B5F] focus:outline-none';

const KINDS: ClaimKind[] = ['water_damage', 'theft', 'glass', 'roof', 'fire', 'flood', 'hail', 'liability'];

function NewClaimModal({ open, onClose, onCreate, nextId }: { open: boolean; onClose: () => void; onCreate: (c: Claim) => void; nextId: string }) {
  const [title, setTitle] = useState('Leaking dishwasher');
  const [kind, setKind] = useState<ClaimKind>('water_damage');
  const [amount, setAmount] = useState('7200');
  const [age, setAge] = useState('420');
  const [report, setReport] = useState(false);
  const [email, setEmail] = useState('The dishwasher leaked overnight and the kitchen floor is ruined.');
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New claim"
      description="Type a claim in and see what the assistant does with it."
      width={520}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() =>
              onCreate({
                id: nextId,
                title: title || 'New claim',
                customer: 'K. Singh',
                kind,
                amount: Number(amount) || 0,
                policyId: 'HB-2450',
                policyAgeDays: Number(age) || 365,
                policeReport: kind === 'theft' ? report : undefined,
                attachments: [],
                email: email || title,
              })
            }
          >
            Triage it
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <label className="grid gap-1 text-[13px] font-semibold">
          What happened
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
            <input className={inputCls} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} />
          </label>
          <label className="grid gap-1 text-[13px] font-semibold">
            Policy age (days)
            <input className={inputCls} inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ''))} />
          </label>
        </div>
        {kind === 'theft' && (
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" className="h-4 w-4 accent-[#2446B5]" checked={report} onChange={(e) => setReport(e.target.checked)} />
            The customer gave a police report number
          </label>
        )}
        <label className="grid gap-1 text-[13px] font-semibold">
          The customer’s email
          <textarea className={textareaCls} rows={3} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}
