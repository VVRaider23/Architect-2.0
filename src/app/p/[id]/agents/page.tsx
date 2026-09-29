'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useApp } from '@/lib/store';
import { latestRun } from '@/lib/engine';
import { frameworkLabel } from '@/lib/seed';
import type { AgentId, Project } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ProjectRoute, Workspace } from '@/components/frame';
import { Button, Chip, Tag, Toggle, textareaCls } from '@/components/ui';

export default function AgentsPage() {
  return <ProjectRoute>{(p, now) => <Agents p={p} now={now} />}</ProjectRoute>;
}

type NodeId = AgentId | 'email' | 'human' | 'out';
const NODES: { id: NodeId; label: string; x: number; y: number; io?: boolean }[] = [
  { id: 'triage_lead', label: 'Triage lead', x: 510, y: 80 },
  { id: 'email', label: 'Claim email', x: 70, y: 270, io: true },
  { id: 'intake_reader', label: 'Intake reader', x: 240, y: 270 },
  { id: 'policy_checker', label: 'Policy checker', x: 420, y: 270 },
  { id: 'risk_scorer', label: 'Risk scorer', x: 600, y: 270 },
  { id: 'reply_drafter', label: 'Reply drafter', x: 780, y: 270 },
  { id: 'out', label: 'Draft reply', x: 940, y: 270, io: true },
  { id: 'human', label: 'Senior handler', x: 600, y: 440, io: true },
];
const EDGES: { a: NodeId; b: NodeId; kind: 'flow' | 'manage' | 'handoff' }[] = [
  { a: 'email', b: 'intake_reader', kind: 'flow' },
  { a: 'intake_reader', b: 'policy_checker', kind: 'flow' },
  { a: 'policy_checker', b: 'risk_scorer', kind: 'flow' },
  { a: 'risk_scorer', b: 'reply_drafter', kind: 'flow' },
  { a: 'reply_drafter', b: 'out', kind: 'flow' },
  { a: 'risk_scorer', b: 'human', kind: 'handoff' },
  { a: 'triage_lead', b: 'intake_reader', kind: 'manage' },
  { a: 'triage_lead', b: 'policy_checker', kind: 'manage' },
  { a: 'triage_lead', b: 'risk_scorer', kind: 'manage' },
  { a: 'triage_lead', b: 'reply_drafter', kind: 'manage' },
];
const DOES: Record<AgentId, string> = {
  triage_lead: 'Runs the other four agents in order, and decides when a person is needed.',
  intake_reader: 'Reads the claim email and its attachments.',
  policy_checker: 'Finds the policy clause that applies to the claim.',
  risk_scorer: 'Scores each claim low, medium or high, and says why.',
  reply_drafter: 'Drafts a reply for a person to check and send.',
};
const W = 1000;
const H = 520;
const pos = (id: NodeId) => NODES.find((n) => n.id === id)!;

function missesOf(p: Project) {
  const run = latestRun(p);
  if (!run) return { n: 0, what: '' };
  const items = new Map(p.answerKey.map((i) => [i.id, i]));
  const fails = run.results.filter((r) => !r.pass);
  const kinds = new Set(fails.map((f) => items.get(f.itemId)?.claim.kind));
  const what = kinds.size === 1 ? (kinds.has('theft') ? 'all theft claims' : kinds.has('water_damage') ? 'all water damage claims' : '') : '';
  return { n: fails.length, what };
}

/** Screen 11 · Agents. One job: show how it works inside. Hover to see who talks to whom; click to open. */
function Agents({ p, now }: { p: Project; now: number }) {
  const router = useRouter();
  const updateAgent = useApp((s) => s.updateAgent);
  const toggleGuardrail = useApp((s) => s.toggleGuardrail);
  const toast = useApp((s) => s.toast);
  const [hover, setHover] = useState<NodeId | null>(null);
  const [open, setOpen] = useState<AgentId | null>(null);
  const [draft, setDraft] = useState('');
  const miss = missesOf(p);
  const agent = p.agents.find((a) => a.id === open);

  useEffect(() => {
    if (p.build.status !== 'done') router.replace(`/p/${p.id}`);
  }, [p.build.status, p.id, router]);
  useEffect(() => {
    setDraft(agent?.instructions ?? '');
  }, [agent?.id, agent?.instructions]);

  const linked = (id: NodeId) => !hover || id === hover || EDGES.some((e) => (e.a === hover && e.b === id) || (e.b === hover && e.a === id));
  const edgeOn = (e: (typeof EDGES)[number]) => !hover || e.a === hover || e.b === hover;

  return (
    <Workspace p={p} now={now} tab="agents" right={<Chip tone="outline">{frameworkLabel(p.framework)}</Chip>}>
      <div className="grid-bg absolute inset-0 overflow-auto">
        <p className="px-6 pt-5 text-[14px] text-ink2">
          Five agents, written in {frameworkLabel(p.framework)}.{' '}
          {miss.n > 0 ? (
            <span className="text-ink">
              The Risk scorer is the one getting {miss.n} answer{miss.n === 1 ? '' : 's'} wrong{miss.what ? `, ${miss.what}` : ''}.
            </span>
          ) : (
            'Every answer matches the Answer Key.'
          )}
        </p>
        <div className="relative mx-auto my-6 min-w-[860px] max-w-[1100px] px-6" data-tour="agent-graph">
          <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0 0 L10 5 L0 10 z" fill="rgb(var(--ink3))" />
                </marker>
              </defs>
              {EDGES.map((e) => {
                const a = pos(e.a);
                const b = pos(e.b);
                const on = edgeOn(e);
                const d =
                  e.kind === 'manage'
                    ? `M${a.x} ${a.y + 24} C ${a.x} ${a.y + 110}, ${b.x} ${b.y - 110}, ${b.x} ${b.y - 24}`
                    : e.kind === 'handoff'
                      ? `M${a.x} ${a.y + 24} L ${b.x} ${b.y - 24}`
                      : `M${a.x + 66} ${a.y} L ${b.x - 66} ${b.y}`;
                return (
                  <path
                    key={`${e.a}-${e.b}`}
                    d={d}
                    fill="none"
                    stroke={hover && on ? 'rgb(var(--accent))' : e.kind === 'manage' ? 'rgb(var(--line2))' : 'rgb(var(--ink3) / 0.7)'}
                    strokeWidth={hover && on ? 2 : 1.4}
                    strokeDasharray={e.kind === 'handoff' ? '5 5' : e.kind === 'manage' ? '2 5' : undefined}
                    markerEnd={e.kind !== 'manage' ? 'url(#arrow)' : undefined}
                    style={{ opacity: on ? 1 : 0.2, transition: 'opacity 200ms, stroke 200ms' }}
                  />
                );
              })}
              <text x={612} y={362} fontSize={12} fill="rgb(var(--ink3))">
                risky claims
              </text>
            </svg>
            {NODES.map((n) => {
              const isAgent = !n.io;
              const bad = n.id === 'risk_scorer' && miss.n > 0;
              const style = { left: `${(n.x / W) * 100}%`, top: `${(n.y / H) * 100}%`, opacity: linked(n.id) ? 1 : 0.3 };
              const cls = cn(
                'absolute flex h-12 w-[132px] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 rounded-xl border px-3 text-[13.5px] font-medium transition-[opacity,border-color,background-color,transform] duration-200',
                n.io ? 'border-dashed border-line2 bg-surface/70 text-ink2' : 'border-line2 bg-surface2 text-ink shadow-card',
                isAgent && 'press cursor-pointer hover:border-accent-line hover:bg-sunken',
                open === n.id && 'border-accent bg-accent-soft',
              );
              return isAgent ? (
                <button
                  key={n.id}
                  type="button"
                  style={style}
                  className={cls}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(n.id)}
                  onBlur={() => setHover(null)}
                  onClick={() => setOpen(n.id as AgentId)}
                  data-tour={n.id === 'risk_scorer' ? 'agent-risk' : undefined}
                >
                  {n.label}
                  {bad && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-bad px-1 text-[11px] font-semibold text-on-bad" aria-label={`${miss.n} wrong answers`}>
                      {miss.n}
                    </span>
                  )}
                </button>
              ) : (
                <div key={n.id} style={style} className={cls}>
                  {n.label}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {open && <div className="absolute inset-0 z-10 bg-black/30 animate-fade-in" onClick={() => setOpen(null)} aria-hidden />}
      <aside
        aria-label="Agent details"
        className={cn(
          'absolute inset-y-0 right-0 z-20 flex w-full max-w-[400px] flex-col border-l border-line bg-surface shadow-pop transition-transform duration-300 ease-drawer',
          open ? 'translate-x-0' : 'pointer-events-none translate-x-full',
        )}
      >
        {agent && (
          <>
            <div className="flex items-start gap-3 border-b border-line px-5 py-4">
              <div className="flex-1">
                <h2 className="text-[19px] font-semibold">{agent.name}</h2>
                <p className="mt-1 text-[14px] leading-relaxed text-ink2">{DOES[agent.id]}</p>
              </div>
              <button type="button" onClick={() => setOpen(null)} className="press grid h-8 w-8 place-items-center rounded-lg text-ink3 hover:bg-surface2 hover:text-ink" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="scroll-thin flex-1 overflow-y-auto px-5 py-5">
              {agent.id === 'risk_scorer' && miss.n > 0 && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-bad-line bg-bad-soft px-3.5 py-3 text-[14px]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bad" />
                  <span>
                    {miss.n} wrong answer{miss.n === 1 ? '' : 's'}
                    {miss.what ? `, ${miss.what}` : ''}.{' '}
                    <button type="button" onClick={() => router.push(`/p/${p.id}/prove`)} className="font-medium underline underline-offset-4">
                      See them
                    </button>
                  </span>
                </div>
              )}
              <div className="text-[12.5px] font-medium text-ink3">Uses</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(agent.tools.length ? agent.tools : ['Runs the other agents']).map((t) => (
                  <Chip key={t} tone="outline">
                    {t}
                  </Chip>
                ))}
                <Chip tone="neutral">{agent.model}</Chip>
              </div>
              <div className="mt-6 text-[12.5px] font-medium text-ink3">Instructions</div>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} className={cn(textareaCls, 'mt-2 text-[14px]')} aria-label="Instructions" />
              {draft !== agent.instructions && (
                <div className="mt-2 flex gap-2 animate-slide-up">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      updateAgent(p.id, agent.id, { instructions: draft });
                      toast('Instructions saved. Run the tests to check nothing broke.', 'ok');
                    }}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDraft(agent.instructions)}>
                    Cancel
                  </Button>
                </div>
              )}
              {agent.guardrails.length > 0 && (
                <>
                  <div className="mt-6 text-[12.5px] font-medium text-ink3">Safety rules</div>
                  <ul className="mt-2 flex flex-col gap-2">
                    {agent.guardrails.map((g) => (
                      <li key={g.id} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5">
                        <span className="flex-1 text-[14px]">{g.label}</span>
                        {g.id === 'mask_pii' && !g.on && <Tag tone="warn">Needed to launch</Tag>}
                        <Toggle checked={g.on} onChange={() => toggleGuardrail(p.id, agent.id, g.id)} label={g.label} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </>
        )}
      </aside>
    </Workspace>
  );
}
