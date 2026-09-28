'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock, Cloud, ExternalLink, KeyRound, Lock, RotateCcw, ShieldCheck, Undo2, Users, XCircle } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useNow } from '@/lib/hooks';
import { useUI } from '@/lib/ui';
import { APPROVED, ENV_LABEL, STATUS_LABEL, approvedFor, pendingRequest, rulesFor } from '@/lib/stage';
import type { LaunchRequest, Project } from '@/lib/types';
import { EnvPill } from '@/components/domain';
import { Button, Card, Chip, Empty, SectionLabel } from '@/components/ui';
import { cn, dateLabel, timeAgo } from '@/lib/utils';

export function statusTone(s: LaunchRequest['status']) {
  return s === 'pending' ? 'warn' : s === 'changes' || s === 'rejected' ? 'bad' : 'ok';
}

export function LaunchTab({ p }: { p: Project }) {
  const ws = useApp((s) => s.workspace);
  const viewAs = useApp((s) => s.viewAs);
  const deploy = useApp((s) => s.deploy);
  const rollback = useApp((s) => s.rollback);
  const openSignoff = useUI((s) => s.openSignoff);
  const now = useNow(5000);
  const { checks } = rulesFor(p, ws, now);
  const pending = pendingRequest(p);
  const latest = p.requests[p.requests.length - 1];
  const isBuilder = viewAs === 'builder';

  if (p.build.status !== 'done') {
    return (
      <div className="p-8">
        <Empty title="Nothing to launch yet" body="Once the app is built and proven, you request sign-off here and deploy to Test and Live." />
      </div>
    );
  }

  const envCard = (env: 'test' | 'live') => {
    const d = p.deployments[env];
    const ok = approvedFor(p, env);
    const running = d.status === 'running';
    const current = running && d.version === p.version;
    return (
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink3">{env === 'test' ? 'Test · pilot' : 'Live'}</span>
          {running && <EnvPill env={env} version={d.version} />}
        </div>
        <div className="text-[16px] font-semibold">
          {running ? `v${d.version} is running` : ok ? `v${p.version} ready to deploy` : env === 'live' ? 'Needs approval for Live' : 'Needs sign-off'}
        </div>
        <div className="text-[12.5px] text-ink2">
          {running
            ? `For ${d.audience ?? 'the pilot group'} · deployed ${timeAgo(d.at ?? now, now)}`
            : env === 'live'
              ? 'Live always needs Farah’s decision. The Launch Pack will include the pilot’s results.'
              : 'The first launch of every app needs Farah’s decision. After that, changes that pass every rule can take the fast lane.'}
        </div>
        {running && (
          <Link href={`/apps/${p.id}?env=${env}`} target="_blank" title={d.url} className="inline-flex min-w-0 items-center gap-1.5 truncate font-mono text-[12px] text-accent hover:underline">
            {d.url} <ExternalLink className="h-3 w-3 shrink-0" />
          </Link>
        )}
        {isBuilder && (
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            {ok && !current && (
              <Button size="sm" variant="primary" onClick={() => deploy(p.id, env)}>
                Deploy v{p.version} to {ENV_LABEL[env]}
              </Button>
            )}
            {!ok && !current && !pending && (
              <Button size="sm" variant={env === 'test' || p.deployments.test.status === 'running' ? 'primary' : 'secondary'} onClick={() => openSignoff(env)}>
                {env === 'live' ? 'Request Live approval' : 'Request sign-off'}
              </Button>
            )}
            {d.history.length > 1 && (
              <Button size="sm" variant="ghost" icon={<Undo2 className="h-3.5 w-3.5" />} onClick={() => rollback(p.id, env)}>
                Roll back to v{d.history[d.history.length - 2].version}
              </Button>
            )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="grid gap-5 p-5">
      {latest && <DecisionBanner p={p} r={latest} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink3">Preview</span>
            <EnvPill env="preview" version={p.version} />
          </div>
          <div className="text-[16px] font-semibold">Every change</div>
          <div className="text-[12.5px] text-ink2">Private link for you and reviewers. Updated with every change, no approval needed.</div>
          <Link href={`/apps/${p.id}?env=preview`} target="_blank" title={p.deployments.preview.url} className="inline-flex min-w-0 items-center gap-1.5 truncate font-mono text-[12px] text-accent hover:underline">
            {p.deployments.preview.url} <ExternalLink className="h-3 w-3 shrink-0" />
          </Link>
        </Card>
        {envCard('test')}
        {envCard('live')}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card pad={false}>
          <div className="border-b border-line px-4 py-3 text-[14px] font-semibold">Launch requests</div>
          {p.requests.length ? (
            <table className="w-full text-left text-[13px]">
              <thead className="text-[12px] text-ink2">
                <tr className="border-b border-line">
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Version</th>
                  <th className="hidden px-4 py-2 font-medium 2xl:table-cell">For</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {[...p.requests].reverse().map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 font-mono text-[12px] text-ink3">{r.n}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      v{r.version} → {ENV_LABEL[r.env]}
                      <div className="text-[12px] text-ink2">
                        by {r.requestedBy} · {timeAgo(r.at, now)}
                      </div>
                    </td>
                    <td className="hidden px-4 py-2.5 text-ink2 2xl:table-cell">{r.audience}</td>
                    <td className="px-4 py-2.5">
                      <Chip tone={statusTone(r.status)}>{STATUS_LABEL[r.status]}</Chip>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link href={`/p/${p.id}/requests/${r.id}`} className="inline-flex items-center gap-1 whitespace-nowrap text-[12.5px] font-medium text-accent hover:underline">
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-6 text-[13px] text-ink2">No requests yet. When every launch rule passes, request sign-off and Farah gets a Launch Pack built from the evidence.</div>
          )}
        </Card>
        <div className="grid gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold">Launch rules for v{p.version}</span>
              <Link href="/settings" className="text-[12.5px] font-medium text-accent hover:underline">
                Set by Farah
              </Link>
            </div>
            <ul className="mt-2.5 grid gap-2">
              {checks.map((c) => (
                <li key={c.id} className="flex items-start gap-2 text-[13px]">
                  {c.pass ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" />}
                  <span className="flex-1">{c.label}</span>
                  <span className={cn('font-mono text-[12px]', c.pass ? 'text-ok' : 'text-bad')}>{c.detail}</span>
                </li>
              ))}
              <li className="flex items-start gap-2 text-[13px]">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink2" />
                <span className="flex-1">Anything going Live needs an approver’s decision</span>
                <span className="font-mono text-[12px] text-ink2">always</span>
              </li>
            </ul>
          </Card>
          <Card>
            <span className="text-[14px] font-semibold">Deploy settings</span>
            <ul className="mt-2.5 grid gap-2.5 text-[13px]">
              <li className="flex gap-2.5">
                <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-ink2" />
                <span>
                  Runs on <b>{ws?.runsOn === 'own' ? 'your cloud (AWS)' : 'Lyzr cloud'}</b>
                  <span className="block text-[12px] text-ink2">or your AWS, Azure, Google Cloud or own servers</span>
                </span>
              </li>
              <li className="flex gap-2.5">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-ink2" />
                <span>
                  Secret keys: <b>4 set</b>
                  <span className="block text-[12px] text-ink2">stored encrypted, never shown in code</span>
                </span>
              </li>
              <li className="flex gap-2.5">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-ink2" />
                <span>
                  Who can open it:{' '}
                  {p.deployments.test.audience || p.deployments.live.audience ? (
                    <>
                      {p.deployments.test.audience && (
                        <span className="block">
                          Test: <b>{p.deployments.test.audience}</b>
                        </span>
                      )}
                      {p.deployments.live.audience && (
                        <span className="block">
                          Live: <b>{p.deployments.live.audience}</b>
                        </span>
                      )}
                    </>
                  ) : (
                    <b>set when Farah approves</b>
                  )}
                </span>
              </li>
              <li className="flex gap-2.5">
                <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-ink2" />
                <span>Every earlier version stays one click away.</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DecisionBanner({ p, r }: { p: Project; r: LaunchRequest }) {
  const viewAs = useApp((s) => s.viewAs);
  const tone =
    r.status === 'pending'
      ? 'border-warn-line bg-warn-soft text-warn'
      : r.status === 'changes' || r.status === 'rejected'
        ? 'border-bad-line bg-bad-soft text-bad'
        : 'border-ok-line bg-ok-soft text-ok';
  const Icon = r.status === 'pending' ? Clock : r.status === 'changes' || r.status === 'rejected' ? XCircle : ShieldCheck;
  const title =
    r.status === 'pending'
      ? `Waiting for Farah · v${r.version} → ${ENV_LABEL[r.env]}`
      : r.status === 'fast_lane'
        ? `v${r.version} took the fast lane to Test`
        : APPROVED.includes(r.status)
          ? `Approved by Farah for ${ENV_LABEL[r.env]}${r.status === 'approved_conditions' ? ', with conditions' : ''}`
          : r.status === 'changes'
            ? 'Farah asked for changes'
            : 'Farah rejected this launch';
  const detail =
    r.status === 'pending'
      ? `Launch Pack sent ${timeAgo(r.at)}. ${r.checks.filter((c) => c.pass).length} of ${r.checks.length} launch rules pass.`
      : r.status === 'fast_lane'
        ? 'Every launch rule passed and data access did not change. Farah sees it in her audit trail.'
        : [r.decision?.conditions.join(' · '), r.decision?.comment ? `“${r.decision.comment}”` : ''].filter(Boolean).join(' — ') ||
          `Decided ${r.decision ? dateLabel(r.decision.at) : ''}.`;
  return (
    <div className={cn('flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3', tone)}>
      <Icon className="h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold">{title}</div>
        <div className="text-[12.5px] opacity-90">{detail}</div>
      </div>
      <Button size="sm" href={`/p/${p.id}/requests/${r.id}`} variant={r.status === 'pending' && viewAs === 'approver' ? 'primary' : 'secondary'}>
        {r.status === 'pending' && viewAs === 'approver' ? 'Open Launch Pack' : 'See the Launch Pack'}
      </Button>
    </div>
  );
}

