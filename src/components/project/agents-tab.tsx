'use client';

import { useEffect, useState } from 'react';
import { Code2, Database, FlaskConical, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { AGENT_NAME, agentScores, latestRun } from '@/lib/engine';
import { frameworkLabel } from '@/lib/seed';
import { generateFiles } from '@/lib/codegen';
import type { AgentId, Project } from '@/lib/types';
import { Button, Card, Chip, Empty, SectionLabel, Toggle, textareaCls } from '@/components/ui';
import { cn } from '@/lib/utils';

const NODE_W = 156;
const NODE_H = 66;
const WORKERS: AgentId[] = ['intake_reader', 'policy_checker', 'risk_scorer', 'reply_drafter'];

function nodeLabel(fw: Project['framework'], id: AgentId) {
  switch (fw) {
    case 'langgraph':
      return `LangGraph node · ${id}`;
    case 'crewai':
      return `CrewAI agent · ${id}`;
    case 'openai-agents':
      return `OpenAI agent · ${id}`;
    case 'google-adk':
      return `ADK sub-agent · ${id}`;
    default:
      return `Lyzr agent · ${id}`;
  }
}

export function agentFile(p: Project, id: AgentId): string {
  if (id === 'risk_scorer') return 'claims_agents/risk_rules.py';
  if (id === 'intake_reader') return 'claims_agents/privacy.py';
  const files = Object.keys(generateFiles(p));
  if (p.framework === 'langgraph') return 'claims_agents/nodes.py';
  return files.find((f) => /claims_agents\/(graph|crew|team|agent|tools)\.py$/.test(f)) ?? 'agent.yaml';
}

export function AgentsTab({ p }: { p: Project }) {
  const selected = useUI((s) => s.agent);
  const setAgent = useUI((s) => s.setAgent);
  const viewAs = useApp((s) => s.viewAs);
  const run = latestRun(p);
  const scores = agentScores(p);

  if (p.build.status !== 'done') {
    return (
      <div className="p-8">
        <Empty title="The agents appear once they are built" body="Approve the plan to start the build. You can open any agent here to change its instructions, model and guardrails." />
      </div>
    );
  }

  const xs = WORKERS.map((_, i) => 24 + i * (NODE_W + 40));
  const centers = xs.map((x) => x + NODE_W / 2);
  const width = xs[3] + NODE_W + 24;
  const mx = width / 2 - NODE_W / 2;

  const node = (id: AgentId, x: number, y: number) => {
    const sc = scores[id];
    const ok = sc.pass === sc.total;
    const on = selected === id;
    const agent = p.agents.find((a) => a.id === id)!;
    return (
      <g
        key={id}
        role="button"
        tabIndex={0}
        aria-label={`Open ${AGENT_NAME[id]}`}
        onClick={() => setAgent(id)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setAgent(id)}
        className="cursor-pointer focus:outline-none"
      >
        <rect x={x} y={y} width={NODE_W} height={NODE_H} rx="12" fill={on ? '#E8EDFB' : '#FFFFFF'} stroke={on ? '#2446B5' : ok ? '#CBC7BD' : '#B3261E'} strokeWidth={on ? 2 : 1.3} />
        <text x={x + 14} y={y + 25} fontSize="13.5" fontWeight="600" fill="#1D1C1A" fontFamily="IBM Plex Sans, sans-serif">
          {AGENT_NAME[id]}
        </text>
        <text x={x + 14} y={y + 45} fontSize="11.5" fill="#57544E" fontFamily="IBM Plex Sans, sans-serif">
          {agent.model}
        </text>
        {run && (
          <g>
            <rect x={x + NODE_W - 64} y={y + 34} width="52" height="20" rx="10" fill={ok ? '#E4F2E9' : '#FBE7E4'} />
            <text x={x + NODE_W - 38} y={y + 48} textAnchor="middle" fontSize="11" fontWeight="600" fill={ok ? '#1F7A45' : '#B3261E'} fontFamily="IBM Plex Mono, monospace">
              {sc.pass}/{sc.total}
            </text>
          </g>
        )}
      </g>
    );
  };

  return (
    <div className="grid gap-5 p-5 2xl:grid-cols-[minmax(0,1fr)_480px]">
      <Card className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[15px] font-semibold">Agent map</div>
            <div className="text-[12.5px] text-ink2">
              5 agents · {frameworkLabel(p.framework)} · click an agent to open it
            </div>
          </div>
          {run && (
            <Chip tone={run.passed === run.total ? 'ok' : 'bad'}>
              Latest run #{run.n}: {run.passed}/{run.total}
            </Chip>
          )}
        </div>
        <div className="mt-4 overflow-x-auto">
          <svg viewBox={`0 0 ${width} 250`} className="mx-auto w-full min-w-[640px] max-w-[900px]" role="group" aria-label="Agent map">
            <defs>
              <marker id="agent-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#7C786F" />
              </marker>
            </defs>
            <line x1={width / 2} y1={16 + NODE_H} x2={width / 2} y2={128} stroke="#CBC7BD" strokeWidth="1.5" />
            <line x1={centers[0]} y1={128} x2={centers[3]} y2={128} stroke="#CBC7BD" strokeWidth="1.5" />
            {centers.map((c) => (
              <line key={c} x1={c} y1={128} x2={c} y2={160} stroke="#CBC7BD" strokeWidth="1.5" />
            ))}
            {xs.slice(0, 3).map((x) => (
              <line key={x} x1={x + NODE_W + 4} y1={160 + NODE_H / 2} x2={x + NODE_W + 34} y2={160 + NODE_H / 2} stroke="#7C786F" strokeWidth="1.5" markerEnd="url(#agent-arrow)" />
            ))}
            <text x={width / 2 + 10} y={112} fontSize="11" fill="#7C786F" fontFamily="IBM Plex Sans, sans-serif">
              routes each claim, keeps the record
            </text>
            {node('triage_lead', mx, 16)}
            {WORKERS.map((id, i) => node(id, xs[i], 160))}
          </svg>
        </div>
        <div className="mt-3 grid gap-2 border-t border-line pt-3 text-[12.5px] text-ink2 sm:grid-cols-3">
          <span className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Reads Gmail, writes drafts only
          </span>
          <span className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5" /> Claims database, read only
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Personal data masked before any model
          </span>
        </div>
      </Card>
      <AgentDetail key={selected} p={p} id={selected} readOnly={viewAs !== 'builder'} />
    </div>
  );
}

function AgentDetail({ p, id, readOnly }: { p: Project; id: AgentId; readOnly: boolean }) {
  const agent = p.agents.find((a) => a.id === id)!;
  const updateAgent = useApp((s) => s.updateAgent);
  const toggleGuardrail = useApp((s) => s.toggleGuardrail);
  const applyChange = useApp((s) => s.applyChange);
  const runProof = useApp((s) => s.runProof);
  const toast = useApp((s) => s.toast);
  const openCode = useUI((s) => s.openCode);
  const setTab = useUI((s) => s.setTab);
  const [text, setText] = useState(agent.instructions);
  const scores = agentScores(p)[id];
  useEffect(() => setText(agent.instructions), [agent.instructions]);

  const save = () => {
    const before = agent.instructions;
    updateAgent(p.id, id, { instructions: text });
    if (id === 'risk_scorer' && p.version < 2 && /police report/i.test(text) && !/police report/i.test(before)) {
      applyChange(p.id, 'theft');
      toast('Saved. Architect updated the risk rules and reran the tests. See the receipt in chat.', 'ok');
    } else if (id === 'risk_scorer' && p.version < 3 && /photo/i.test(text) && !/photo/i.test(before)) {
      applyChange(p.id, 'water');
      toast('Saved. Architect updated the risk rules and reran the tests. See the receipt in chat.', 'ok');
    } else toast('Instructions saved.', 'ok');
  };

  return (
    <Card className="flex min-w-0 flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[17px] font-semibold">{agent.name}</h3>
            <Chip tone={scores.pass === scores.total ? 'ok' : 'bad'}>
              {scores.pass}/{scores.total} {scores.pass === scores.total ? '✓' : '✗'}
            </Chip>
          </div>
          <div className="mt-0.5 font-mono text-[11.5px] text-ink3">
            {nodeLabel(p.framework, id)} · v{p.version}
          </div>
        </div>
        <Chip tone="outline">{agent.kind === 'manager' ? 'Manager' : 'Worker'}</Chip>
      </div>
      <p className="text-[13.5px]">
        <span className="font-semibold">Job:</span> <span className="text-ink2">{agent.job}</span>
      </p>
      <div>
        <SectionLabel>Instructions</SectionLabel>
        {readOnly ? (
          <p className="mt-1.5 rounded-lg bg-surface2 px-3 py-2.5 text-[13px] leading-relaxed">{agent.instructions}</p>
        ) : (
          <>
            <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} className={cn(textareaCls, 'mt-1.5 text-[13px]')} aria-label={`${agent.name} instructions`} />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[12px] text-ink3">Saving reruns this agent’s tests.</span>
              <Button size="sm" variant="primary" disabled={text.trim() === agent.instructions.trim()} onClick={save}>
                Save instructions
              </Button>
            </div>
          </>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <SectionLabel>Model</SectionLabel>
          {readOnly ? (
            <div className="mt-1.5 text-[13px]">{agent.model} via Lyzr</div>
          ) : (
            <select
              className="mt-1.5 h-9 w-full rounded-lg border border-line2 bg-surface px-2.5 text-[13px]"
              value={agent.model}
              onChange={(e) => updateAgent(p.id, id, { model: e.target.value })}
              aria-label="Model"
            >
              {['Claude Haiku', 'Claude Sonnet', 'Claude Opus'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <SectionLabel>Tools and data</SectionLabel>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {agent.tools.length ? agent.tools.map((t) => <Chip key={t} tone="outline">{t}</Chip>) : <span className="text-[13px] text-ink3">None</span>}
            {agent.knowledge.map((k) => (
              <Chip key={k} tone="neutral">
                {k} (knowledge)
              </Chip>
            ))}
          </div>
        </div>
      </div>
      <div>
        <SectionLabel>Guardrails</SectionLabel>
        {agent.guardrails.length ? (
          <ul className="mt-1.5 grid gap-1.5">
            {agent.guardrails.map((g) => (
              <li key={g.id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
                <ShieldCheck className={cn('h-4 w-4', g.on ? 'text-ok' : 'text-ink3')} />
                <span className="flex-1 text-[13px]">{g.label}</span>
                <Toggle checked={g.on} onChange={() => toggleGuardrail(p.id, id, g.id)} label={g.label} disabled={readOnly} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-[13px] text-ink3">No agent-specific guardrails. Workspace rules still apply.</p>
        )}
      </div>
      <div>
        <SectionLabel>Versions</SectionLabel>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {Array.from({ length: p.version }, (_, i) => p.version - i).map((v) => (
            <Chip key={v} tone={v === p.version ? 'accent' : 'outline'}>
              v{v}
              {v === p.version ? ' (current)' : ''}
            </Chip>
          ))}
        </div>
      </div>
      {!readOnly && (
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          <Button size="sm" icon={<Code2 className="h-3.5 w-3.5" />} onClick={() => openCode(agentFile(p, id))}>
            Open in code
          </Button>
          <Button
            size="sm"
            icon={<FlaskConical className="h-3.5 w-3.5" />}
            onClick={() => {
              runProof(p.id, `Agent test: ${agent.name}`);
              setTab('proof');
            }}
          >
            Test this agent
          </Button>
        </div>
      )}
    </Card>
  );
}
