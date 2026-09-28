'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, Cloud, ExternalLink, Globe, KeyRound, Lock, RotateCcw, ShieldCheck, Trash2, Undo2, Users, XCircle, Zap } from 'lucide-react';
import { DEFAULT_ENV_VARS, useApp } from '@/lib/store';
import { useNow } from '@/lib/hooks';
import { useUI } from '@/lib/ui';
import { APPROVED, ENV_LABEL, STATUS_LABEL, approvedFor, pendingRequest, rulesFor, type PathStep } from '@/lib/stage';
import type { LaunchRequest, Project } from '@/lib/types';
import { EnvPill } from '@/components/domain';
import { Button, Card, Chip, Empty, Modal, inputCls } from '@/components/ui';
import { cn, dateLabel, timeAgo } from '@/lib/utils';
import { StepHeader } from './journey';
import { ApiCard } from './api-card';

export function statusTone(s: LaunchRequest['status']) {
  return s === 'pending' ? 'warn' : s === 'changes' || s === 'rejected' ? 'bad' : 'ok';
}

/** Step 3: the launch rules, the request to Farah and her decision. */
export function SignoffTab({ p, state }: { p: Project; state?: PathStep['state'] }) {
  const ws = useApp((s) => s.workspace);
  const viewAs = useApp((s) => s.viewAs);
  const openSignoff = useUI((s) => s.openSignoff);
  const setTab = useUI((s) => s.setTab);
  const now = useNow(5000);
  const { checks, pass } = rulesFor(p, ws, now);
  const pending = pendingRequest(p);
  const latest = p.requests[p.requests.length - 1];
  const isBuilder = viewAs === 'builder';
  const built = p.build.status === 'done';
  const testOk = approvedFor(p, 'test');
  const liveOk = approvedFor(p, 'live');
  const testCurrent = p.deployments.test.status === 'running' && p.deployments.test.version === p.version;
  const liveCurrent = p.deployments.live.status === 'running' && p.deployments.live.version === p.version;
  const deployReady = (!!testOk && !testCurrent) || (!!liveOk && !liveCurrent);
  const nextEnv: 'test' | 'live' = testCurrent ? 'live' : 'test';

  return (
    <div className="grid gap-5 p-5">
      <StepHeader step="signoff" state={state} />
      {!built ? (
        <Empty title="Nothing to sign off yet" body="Once the app is built and its answers are proven, you ask Farah to sign off here." />
      ) : (
        <>
          {latest && <DecisionBanner p={p} r={latest} />}
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <Card tour="rules">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-semibold">Launch rules for v{p.version}</span>
                <Chip tone={pass ? 'ok' : 'bad'}>{pass ? 'All pass' : `${checks.filter((c) => !c.pass).length} to go`}</Chip>
                <Link href="/settings" className="ml-auto text-[12.5px] font-medium text-accent hover:underline">
                  Set by Farah
                </Link>
              </div>
              <p className="mt-1 text-[12.5px] text-ink2">Farah sets these once for the whole company. Every request is checked against them automatically.</p>
              <ul className="mt-3 grid gap-2">
                {checks.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-[13.5px]">
                    {c.pass ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" />}
                    <span className="flex-1">{c.label}</span>
                    <span className={cn('font-mono text-[12px]', c.pass ? 'text-ok' : 'text-bad')}>{c.detail}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2 text-[13.5px]">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink2" />
                  <span className="flex-1">Anything going Live needs an approver’s decision</span>
                  <span className="font-mono text-[12px] text-ink2">always</span>
                </li>
              </ul>
              <div className="mt-3 flex gap-2 rounded-lg bg-surface2 px-3 py-2 text-[12.5px] leading-relaxed text-ink2">
                <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
                <span>
                  <b className="text-ink">Fast lane:</b> after the first approval, a change that passes every rule and touches no new data goes to Test without waiting. Farah still sees it
                  in her audit trail.
                </span>
              </div>
              {isBuilder && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {pending ? (
                    <Button size="sm" href={`/p/${p.id}/requests/${pending.id}`} icon={<ArrowRight className="h-3.5 w-3.5" />}>
                      See what Farah sees
                    </Button>
                  ) : liveCurrent ? (
                    <span className="text-[13px] text-ok">v{p.version} is live.</span>
                  ) : deployReady ? (
                    <Button size="sm" onClick={() => setTab('ship')} icon={<ArrowRight className="h-3.5 w-3.5" />}>
                      Approved. Go to Ship
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" variant="secondary" disabled={!pass} onClick={() => openSignoff(nextEnv)}>
                        {nextEnv === 'live' ? 'Request Live approval' : 'Request sign-off'}
                      </Button>
                      {!pass && <span className="text-[12.5px] text-ink2">Opens when every rule passes.</span>}
                    </>
                  )}
                </div>
              )}
            </Card>

            <Card pad={false}>
              <div className="border-b border-line px-4 py-3">
                <div className="text-[15px] font-semibold">Requests</div>
                <div className="text-[12.5px] text-ink2">Each one sends Farah a Launch Pack: one page of evidence for one version.</div>
              </div>
              {p.requests.length ? (
                <table className="w-full text-left text-[13px]">
                  <thead className="text-[12px] text-ink2">
                    <tr className="border-b border-line">
                      <th className="px-4 py-2 font-medium">Version</th>
                      <th className="px-4 py-2 font-medium">Decision</th>
                      <th className="px-4 py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {[...p.requests].reverse().map((r) => (
                      <tr key={r.id} className="border-b border-line last:border-0">
                        <td className="whitespace-nowrap px-4 py-2.5">
                          v{r.version} → {ENV_LABEL[r.env]}
                          <div className="text-[12px] text-ink2">
                            by {r.requestedBy} · {timeAgo(r.at, now)}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <Chip tone={statusTone(r.status)}>{STATUS_LABEL[r.status]}</Chip>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Link href={`/p/${p.id}/requests/${r.id}`} className="inline-flex items-center gap-1 whitespace-nowrap text-[12.5px] font-medium text-accent hover:underline">
                            Launch Pack <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-4 py-6 text-[13px] text-ink2">No requests yet. When every launch rule passes, request sign-off and Farah gets the Launch Pack.</div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

/** Step 4: where the app runs, who can open it, and deploy or roll back. */
export function ShipTab({ p, state }: { p: Project; state?: PathStep['state'] }) {
  const ws = useApp((s) => s.workspace);
  const viewAs = useApp((s) => s.viewAs);
  const deploy = useApp((s) => s.deploy);
  const rollback = useApp((s) => s.rollback);
  const openSignoff = useUI((s) => s.openSignoff);
  const now = useNow(5000);
  const pending = pendingRequest(p);
  const isBuilder = viewAs === 'builder';

  const envCard = (env: 'test' | 'live') => {
    const d = p.deployments[env];
    const ok = approvedFor(p, env);
    const running = d.status === 'running';
    const current = running && d.version === p.version;
    return (
      <Card className="flex flex-col gap-2.5" key={env}>
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold">{env === 'test' ? 'Test · a small pilot' : 'Live · everyone'}</span>
          {running && <EnvPill env={env} version={d.version} />}
        </div>
        <div className="text-[15.5px] font-semibold tracking-tight">
          {running ? `v${d.version} is running` : ok ? `v${p.version} is approved` : env === 'live' ? 'Needs Farah’s approval' : 'Needs sign-off first'}
        </div>
        <div className="text-[12.5px] leading-relaxed text-ink2">
          {running
            ? `For ${d.audience ?? 'the pilot group'} · deployed ${timeAgo(d.at ?? now, now)}`
            : env === 'live'
              ? 'Live always needs Farah’s decision. Her Launch Pack includes how the pilot went.'
              : 'The first launch of every app needs Farah’s decision. After that, changes can take the fast lane.'}
        </div>
        {running && (
          <Link href={`/apps/${p.id}?env=${env}`} target="_blank" title={d.url} className="inline-flex min-w-0 items-center gap-1.5 truncate font-mono text-[12px] text-accent hover:underline">
            {env === 'live' && p.customDomain ? p.customDomain : d.url} <ExternalLink className="h-3 w-3 shrink-0" />
          </Link>
        )}
        {isBuilder && (
          <div className="mt-auto flex flex-wrap gap-2 pt-1" data-tour={env === 'test' ? 'deploy-test' : undefined}>
            {ok && !current && (
              <Button size="sm" variant="primary" onClick={() => deploy(p.id, env)}>
                Deploy v{p.version} to {ENV_LABEL[env]}
              </Button>
            )}
            {!ok && !current && !pending && p.build.status === 'done' && (
              <Button size="sm" variant="secondary" onClick={() => openSignoff(env)}>
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
      <StepHeader step="ship" state={state} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold">Preview · just your team</span>
            <EnvPill env="preview" version={p.version} />
          </div>
          <div className="text-[15.5px] font-semibold tracking-tight">Updates with every change</div>
          <div className="text-[12.5px] leading-relaxed text-ink2">A private link for you and your reviewers. No approval needed, because nobody outside the team uses it.</div>
          <Link href={`/apps/${p.id}?env=preview`} target="_blank" title={p.deployments.preview.url} className="inline-flex min-w-0 items-center gap-1.5 truncate font-mono text-[12px] text-accent hover:underline">
            {p.deployments.preview.url} <ExternalLink className="h-3 w-3 shrink-0" />
          </Link>
        </Card>
        {envCard('test')}
        {envCard('live')}
      </div>

      {isBuilder && <ApiCard p={p} />}

      <Card>
        <span className="text-[15px] font-semibold">Deploy settings</span>
        <ul className="mt-3 grid gap-3 text-[13px] md:grid-cols-2">
          <li className="flex gap-2.5">
            <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-ink2" />
            <span>
              Runs on <b>{ws?.runsOn === 'own' ? 'your cloud (AWS)' : 'Lyzr cloud'}</b>
              <span className="block text-[12px] text-ink2">or your AWS, Azure, Google Cloud or own servers</span>
            </span>
          </li>
          <CustomDomainRow p={p} canEdit={isBuilder} />
          <EnvVarsRow p={p} canEdit={isBuilder} />
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
  );
}

/** Architect's environment variables: names are listed, values are write-only. */
function EnvVarsRow({ p, canEdit }: { p: Project; canEdit: boolean }) {
  const setEnvVar = useApp((s) => s.setEnvVar);
  const removeEnvVar = useApp((s) => s.removeEnvVar);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const vars = p.envVars ?? DEFAULT_ENV_VARS.map((n) => ({ name: n, at: p.createdAt }));
  const key = name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  return (
    <li className="flex gap-2.5">
      <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-ink2" />
      <span>
        Environment variables: <b>{vars.length} set</b>
        <span className="block text-[12px] text-ink2">API keys and passwords, stored encrypted, never shown in code</span>
        <button onClick={() => setOpen(true)} className="block text-[12.5px] font-medium text-accent hover:underline">
          {canEdit ? 'Manage' : 'See names'}
        </button>
      </span>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Environment variables"
        description="The keys and passwords the app needs at run time. Each value is encrypted when saved and never shown again, not even to you."
        width={560}
        footer={
          <Button variant="primary" onClick={() => setOpen(false)}>
            Done
          </Button>
        }
      >
        <ul className="divide-y divide-line rounded-xl border border-line">
          {vars.map((v) => (
            <li key={v.name} className="flex items-center gap-3 px-3.5 py-2.5 text-[13px]">
              <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]">{v.name}</span>
              <span className="font-mono text-[12px] text-ink3">••••••••</span>
              {canEdit && (
                <button aria-label={`Remove ${v.name}`} onClick={() => removeEnvVar(p.id, v.name)} className="rounded-md p-1 text-ink3 hover:bg-sunken hover:text-ink">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
          {!vars.length && <li className="px-3.5 py-3 text-[13px] text-ink2">None yet.</li>}
        </ul>
        {canEdit && (
          <form
            className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!key || !value) return;
              setEnvVar(p.id, key);
              setName('');
              setValue('');
            }}
          >
            <input className={inputCls} placeholder="NAME" value={name} onChange={(e) => setName(e.target.value)} aria-label="Variable name" />
            <input className={inputCls} type="password" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Variable value" autoComplete="off" />
            <Button type="submit" disabled={!key || !value}>
              Add
            </Button>
          </form>
        )}
        <p className="mt-2.5 text-[12px] text-ink3">In this prototype only the names are kept; values are thrown away.</p>
      </Modal>
    </li>
  );
}

function CustomDomainRow({ p, canEdit }: { p: Project; canEdit: boolean }) {
  const setCustomDomain = useApp((s) => s.setCustomDomain);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(p.customDomain ?? 'claims.harborline.com');
  const valid = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(value.trim());
  return (
    <li className="flex gap-2.5">
      <Globe className="mt-0.5 h-4 w-4 shrink-0 text-ink2" />
      <span className="min-w-0 flex-1">
        Web address: <b className="break-all">{p.customDomain ?? p.deployments.live.url}</b>
        {p.customDomain && <span className="block text-[12px] text-ink2">Add a CNAME record for {p.customDomain} pointing to cname.architect.new</span>}
        {canEdit &&
          (editing ? (
            <span className="mt-1.5 flex gap-1.5">
              <input className="h-8 min-w-0 flex-1 rounded-lg border border-line2 px-2 text-[12.5px]" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Custom domain" />
              <Button
                size="sm"
                variant="primary"
                disabled={!valid}
                onClick={() => {
                  setCustomDomain(p.id, value);
                  setEditing(false);
                }}
              >
                Save
              </Button>
            </span>
          ) : (
            <button onClick={() => setEditing(true)} className="block text-[12.5px] font-medium text-accent hover:underline">
              {p.customDomain ? 'Change custom domain' : 'Add custom domain'}
            </button>
          ))}
      </span>
    </li>
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
