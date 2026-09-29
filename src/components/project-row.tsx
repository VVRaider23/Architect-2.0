'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useApp } from '@/lib/store';
import { latestRun } from '@/lib/engine';
import { nextAction, stageLabel } from '@/lib/stage';
import type { Project } from '@/lib/types';
import { timeAgo } from '@/lib/utils';
import { Tag } from './ui';

function tone(p: Project): 'neutral' | 'accent' | 'ok' | 'warn' | 'bad' {
  if (p.deployments.live.status === 'running') return 'ok';
  if (p.build.status !== 'done') return 'accent';
  const run = latestRun(p);
  if (run && run.passed < run.total) return 'bad';
  return 'warn';
}

/** One project, one line: its name, where it is, and what happens next. */
export function ProjectRow({ p }: { p: Project }) {
  const ws = useApp((s) => s.workspace);
  const now = Date.now();
  const next = nextAction(p, ws, now);
  const last = Math.max(p.createdAt, ...p.runs.map((r) => r.at), ...p.changes.map((c) => c.at), ...p.requests.map((r) => r.at));
  return (
    <Link
      href={`/p/${p.id}`}
      className="press group flex items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3.5 transition-colors hover:border-line2 hover:bg-surface2"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <span className="truncate text-[15px] font-medium">{p.name}</span>
          <Tag tone={tone(p)}>{stageLabel(p, now)}</Tag>
        </div>
        <div className="mt-1 truncate text-[13.5px] text-ink3">
          Next: {next.label.charAt(0).toLowerCase() + next.label.slice(1)} · {timeAgo(last, now)}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink" />
    </Link>
  );
}
