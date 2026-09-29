'use client';

import { Check, X } from 'lucide-react';
import type { AnswerKeyItem, Env, Risk, TraceStep, Verdict } from '@/lib/types';
import { ACTION_SHORT, AGENT_NAME, RISK_LABEL } from '@/lib/engine';
import { cn } from '@/lib/utils';
import { Chip } from './ui';

export function RiskChip({ risk, className }: { risk: Risk; className?: string }) {
  const tone = risk === 'low' ? 'ok' : risk === 'medium' ? 'warn' : risk === 'high' ? 'bad' : 'dark';
  return (
    <Chip tone={tone} className={className}>
      {RISK_LABEL[risk]}
    </Chip>
  );
}

export function MatchMark({ pass, className }: { pass: boolean; className?: string }) {
  return pass ? (
    <span className={cn('inline-flex items-center gap-1 text-[12.5px] font-medium text-ok', className)}>
      <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> match
    </span>
  ) : (
    <span className={cn('inline-flex items-center gap-1 text-[12.5px] font-medium text-bad', className)}>
      <X className="h-3.5 w-3.5" strokeWidth={2.5} /> miss
    </span>
  );
}

export function verdictShort(v: { risk: Risk; action: Verdict['action'] }) {
  const r = v.risk === 'blocked' ? "Can't approve yet" : `${v.risk[0].toUpperCase()}${v.risk.slice(1)} risk`;
  return `${r} · ${ACTION_SHORT[v.action]}`;
}

export function sourceLabel(it: AnswerKeyItem) {
  const base =
    it.source === 'plan'
      ? 'Plan'
      : it.source === 'generated'
        ? 'Generated'
        : it.source === 'live_flag'
          ? `Live flag · ${it.author}`
          : it.source === 'import'
            ? `Imported · ${it.author}`
            : it.author;
  return it.confirmedBy && it.source !== 'expert' && it.source !== 'live_flag' ? `${base} · checked by ${it.confirmedBy}` : base;
}

export function TraceList({ trace, compact }: { trace: TraceStep[]; compact?: boolean }) {
  let t = 0;
  return (
    <ol className="relative flex flex-col">
      {trace.map((s, i) => {
        t += s.ms;
        return (
          <li key={i} className="relative flex gap-3 pb-3 last:pb-0">
            {i < trace.length - 1 && <span className="absolute left-[9px] top-5 h-[calc(100%-12px)] w-px bg-line" aria-hidden />}
            <span
              className={cn(
                'relative z-[1] mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold',
                s.bad ? 'border-bad bg-bad text-on-bad' : 'border-line2 bg-surface text-ink2',
              )}
            >
              {s.bad ? <X className="h-3 w-3" strokeWidth={3} /> : i + 1}
            </span>
            <div className={cn('min-w-0 flex-1', s.bad && 'rounded-lg border border-bad-line bg-bad-soft px-2.5 py-1.5')}>
              <div className={cn('text-[13px] leading-snug', compact && 'text-[12.5px]')}>
                <span className="font-semibold">{AGENT_NAME[s.agent]}</span> <span className={s.bad ? 'text-bad' : 'text-ink2'}>{s.text}</span>
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-ink3">+{(t / 1000).toFixed(1)}s</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function EnvPill({ env, version }: { env: Env; version?: number | null }) {
  const tone = env === 'live' ? 'bg-ok text-on-ok border-ok' : env === 'test' ? 'bg-warn-soft text-warn border-warn-line' : 'bg-accent-soft text-accent-ink border-accent-line';
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[2px] text-[11.5px] font-semibold uppercase tracking-wide', tone)}>
      {env === 'live' && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse2" />}
      {env}
      {version ? <span className="font-mono normal-case opacity-80">v{version}</span> : null}
    </span>
  );
}

/** A tiny bar chart of run results, oldest to newest. */
export function RunSpark({ runs, height = 34 }: { runs: { passed: number; total: number; n: number }[]; height?: number }) {
  const last = runs.slice(-12);
  return (
    <div className="flex items-end gap-[3px]" style={{ height }} aria-label="Run history">
      {last.map((r) => {
        const ratio = r.total ? r.passed / r.total : 0;
        return (
          <div key={r.n} title={`Run #${r.n}: ${r.passed}/${r.total}`} className="flex w-[9px] flex-col justify-end rounded-sm bg-sunken" style={{ height }}>
            <div className={cn('w-full rounded-sm', ratio === 1 ? 'bg-ok' : 'bg-bad')} style={{ height: Math.max(3, ratio * height) }} />
          </div>
        );
      })}
    </div>
  );
}
